#!/usr/bin/env node
// 대상 레포가 public인지 private인지 낸다. AC(public)에 남의 레포 내용을 올려도 되는지 가를 때 쓴다.
//
// 판단 없이 명령 둘과 분기 하나라 손으로 돌리지 않는다. 손으로 틀리면 private 레포 고유의 사실이 반려 줄에 실려
// public인 AC에 올라가는데 아무 데서도 드러나지 않는다. 원격이 없거나 조회가 안 되면 private으로 낸다 — 모를 때 public으로
// 읽는 쪽이 위험하다.
//
// 사용: node visibility.mjs <레포 안 아무 경로 | owner/name>   → stdout에 public 또는 private 한 단어
//   로컬 클론이 없는 레포(남의 PR에 다는 코멘트 등)는 owner/name으로 넘긴다.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function visibility(target) {
  const isSlug = !fs.existsSync(target) && /^[\w.-]+\/[\w.-]+$/.test(target);
  const url = isSlug ? target : run("git", ["-C", target, "remote", "get-url", "origin"]);
  const vis = url ? run("gh", ["repo", "view", url, "--json", "visibility", "-q", ".visibility"]) : null;
  return vis?.toLowerCase() === "public" ? "public" : "private";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const target = process.argv[2];
  if (!target) {
    console.error("사용: node visibility.mjs <레포 안 아무 경로 | owner/name>");
    process.exit(1);
  }
  console.log(visibility(target));
}
