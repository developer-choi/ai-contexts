#!/usr/bin/env python3
"""Windows-compatible trigger eval for skill descriptions.

Runs `claude -p` for each query with an override description, detects whether
the skill was triggered by scanning the full stream-json output for the unique
command name. Uses ThreadPoolExecutor (works on Windows unlike select-based pipes).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def find_project_root() -> Path:
    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / ".claude").is_dir():
            return parent
    return current


def parse_skill_md(skill_path: Path) -> tuple[str, str, str]:
    text = (skill_path / "SKILL.md").read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
    if not m:
        raise ValueError("No frontmatter")
    fm, body = m.group(1), m.group(2)
    name_m = re.search(r"^name:\s*(.+)$", fm, re.MULTILINE)
    desc_m = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
    name = name_m.group(1).strip() if name_m else skill_path.name
    description = desc_m.group(1).strip() if desc_m else ""
    return name, description, body


def run_query(
    query: str,
    skill_name: str,
    description: str,
    project_root: Path,
    model: str,
    timeout: int,
) -> dict:
    """Returns {triggered: bool, error: str|None, stdout_len: int}.

    Detection: whether Claude invoked the Skill tool with skill=<skill_name>.
    The description passed in is not re-injected here — the caller is expected
    to have already arranged the deployed skill to reflect the description
    being tested (e.g., by swapping the SKILL.md contents).
    """
    try:
        env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
        env["PYTHONUTF8"] = "1"

        result = subprocess.run(
            [
                "claude",
                "-p", query,
                "--output-format", "stream-json",
                "--verbose",
                "--include-partial-messages",
                "--model", model,
            ],
            cwd=str(project_root),
            env=env,
            capture_output=True,
            timeout=timeout,
            text=False,
        )

        stdout = result.stdout.decode("utf-8", errors="replace")

        dump_dir = os.environ.get("BENCH_DUMP_DIR")
        if dump_dir:
            Path(dump_dir).mkdir(parents=True, exist_ok=True)
            dump_name = f"{skill_name}_{hash(query) & 0xffffff:06x}_{uuid.uuid4().hex[:6]}.jsonl"
            Path(dump_dir, dump_name).write_text(stdout, encoding="utf-8")

        pending_skill = False
        accumulated_json = ""
        skill_target_re = re.compile(r'"skill"\s*:\s*"([^"]+)"')

        for line in stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            if event.get("type") != "stream_event":
                continue
            se = event.get("event", {})
            se_type = se.get("type", "")

            if se_type == "content_block_start":
                cb = se.get("content_block", {})
                if cb.get("type") == "tool_use":
                    tool_name = cb.get("name", "")
                    if tool_name == "Skill":
                        pending_skill = True
                        accumulated_json = ""
                    else:
                        return {"triggered": False, "error": None, "stdout_len": len(stdout)}
            elif se_type == "content_block_delta" and pending_skill:
                delta = se.get("delta", {})
                if delta.get("type") == "input_json_delta":
                    accumulated_json += delta.get("partial_json", "")
                    m = skill_target_re.search(accumulated_json)
                    if m:
                        if m.group(1) == skill_name:
                            return {"triggered": True, "error": None, "stdout_len": len(stdout)}
                        else:
                            return {"triggered": False, "error": None, "stdout_len": len(stdout)}
            elif se_type == "content_block_stop":
                pending_skill = False
                accumulated_json = ""

        return {"triggered": False, "error": None, "stdout_len": len(stdout)}

    except subprocess.TimeoutExpired:
        return {"triggered": False, "error": "timeout", "stdout_len": 0}
    except Exception as e:
        return {"triggered": False, "error": str(e), "stdout_len": 0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eval-set", required=True)
    ap.add_argument("--skill-path", required=True)
    ap.add_argument("--description", default=None)
    ap.add_argument("--num-workers", type=int, default=5)
    ap.add_argument("--timeout", type=int, default=60)
    ap.add_argument("--runs-per-query", type=int, default=3)
    ap.add_argument("--trigger-threshold", type=float, default=0.5)
    ap.add_argument("--model", default="claude-sonnet-4-6")
    ap.add_argument("--out", required=True)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    eval_set = json.loads(Path(args.eval_set).read_text(encoding="utf-8"))
    skill_path = Path(args.skill_path)
    name, original_desc, _ = parse_skill_md(skill_path)
    description = args.description or original_desc
    project_root = find_project_root()

    if args.verbose:
        print(f"Skill: {name}", file=sys.stderr)
        print(f"Description: {description[:200]}...", file=sys.stderr)
        print(f"Queries: {len(eval_set)}, runs: {args.runs_per_query}, workers: {args.num_workers}", file=sys.stderr)

    jobs = []
    for i, item in enumerate(eval_set):
        for r in range(args.runs_per_query):
            jobs.append((i, r, item["query"], item["should_trigger"]))

    results = {}
    with ThreadPoolExecutor(max_workers=args.num_workers) as ex:
        futures = {
            ex.submit(run_query, q, name, description, project_root, args.model, args.timeout): (qi, ri, q, st)
            for qi, ri, q, st in jobs
        }
        done_count = 0
        for fut in as_completed(futures):
            qi, ri, q, st = futures[fut]
            result = fut.result()
            results.setdefault(qi, {"query": q, "should_trigger": st, "runs": []})
            results[qi]["runs"].append(result)
            done_count += 1
            if args.verbose:
                mark = "T" if result["triggered"] else "_"
                err = f" ERR:{result['error']}" if result["error"] else ""
                print(f"  [{done_count}/{len(jobs)}] q{qi} r{ri} {mark}{err}", file=sys.stderr)

    per_query = []
    passed_count = 0
    for qi in sorted(results.keys()):
        item = results[qi]
        triggers = sum(1 for r in item["runs"] if r["triggered"])
        runs = len(item["runs"])
        rate = triggers / runs if runs else 0
        if item["should_trigger"]:
            passed = rate >= args.trigger_threshold
        else:
            passed = rate < args.trigger_threshold
        if passed:
            passed_count += 1
        per_query.append({
            "query": item["query"],
            "should_trigger": item["should_trigger"],
            "triggers": triggers,
            "runs": runs,
            "rate": rate,
            "pass": passed,
            "errors": [r["error"] for r in item["runs"] if r["error"]],
        })

    summary = {
        "passed": passed_count,
        "total": len(per_query),
        "pass_rate": passed_count / len(per_query) if per_query else 0,
        "should_trigger_triggered_rate": (
            sum(r["rate"] for r in per_query if r["should_trigger"]) / max(1, sum(1 for r in per_query if r["should_trigger"]))
        ),
        "should_not_trigger_triggered_rate": (
            sum(r["rate"] for r in per_query if not r["should_trigger"]) / max(1, sum(1 for r in per_query if not r["should_trigger"]))
        ),
    }

    output = {"description": description, "summary": summary, "results": per_query}
    Path(args.out).write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.verbose:
        print(f"\nResults: {summary['passed']}/{summary['total']} passed", file=sys.stderr)
        print(f"  should_trigger avg rate: {summary['should_trigger_triggered_rate']:.2f}", file=sys.stderr)
        print(f"  should_not_trigger avg rate: {summary['should_not_trigger_triggered_rate']:.2f}", file=sys.stderr)
        for r in per_query:
            status = "PASS" if r["pass"] else "FAIL"
            print(f"  [{status}] rate={r['triggers']}/{r['runs']} expected={r['should_trigger']}: {r['query'][:60]}", file=sys.stderr)


if __name__ == "__main__":
    main()
