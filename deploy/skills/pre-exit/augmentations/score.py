#!/usr/bin/env python3
"""
write 산출물 채점 하네스 (객관 + 반객관 자동 계측).

pre-exit write-refine 보강이 호출하는 강화회고 채점 도구. 주관(만족/불만족·추가교정)은
사람 전속이라 여기서 안 잰다. 점수로 합치지 않는다 — 층(객관·반객관)을 따로 출력한다.

금지어·패턴 SSOT: ../../../contexts/writing-guide/tone.md (배포본에 임베드한 사본 —
tone.md의 한자어·추상압축어·외래어음차·자기과장어·극적수식어·메타안내 목록이 바뀌면
아래 BANNED 사전을 함께 동기화한다).

사용:
  python score.py <산출물.md> [--props 명제리스트.txt] [--tokens N] [--turns N]

명제리스트(--props): 한 줄에 핵심 명제 하나. 본문에 substring으로 들어있는지만 본다.
토큰·턴(--tokens/--turns): 세션에서 얻는 값. 주면 객관 표에 기록만 한다(자동 산출 불가).

반객관 매칭은 한국어 단어 경계가 없어 false positive가 날 수 있다(예: '유사' in '유사성').
그래서 위반마다 해당 줄을 함께 출력해 사람이 눈으로 확인할 수 있게 한다.
"""
import argparse
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# 금지어 (exact-string) — SSOT: writing-guide/tone.md (임베드 사본)
BANNED = {
    "7a 한자어": ["유사", "파편화", "구조화", "이원화", "직렬화", "명세"],
    "8 추상압축어": ["다각도", "다층", "심층", "세 방향"],
    "9 외래어음차": ["디프리케이트", "인터페이스"],
    "15a 자기과장어": ["발견했습니다", "확인했습니다", "폭발"],
    "22 극적수식어": ["순간", "마주한", "여정", "탐구"],
    "18a 메타안내": ["이 문서를 읽는 독자에게", "이 문서의 목적"],
}

# 5a 내부 작업이력 정규식
INTERNAL = {
    "PR번호": re.compile(r"PR\s*#?\d+"),
    "커밋해시": re.compile(r"\b[0-9a-f]{7,40}\b"),
    "브랜치명": re.compile(r"\b(feature|fix|chore|refactor)/\S+"),
}

DASHES = {"—": "em-dash(U+2014)", "–": "en-dash(U+2013)"}

# 1a 습니다체 휴리스틱: 평서문 종결이 반말이면 잡음. 명사형(이력서)·정중체는 통과.
BANMAL_END = re.compile(r"(?:[가-힣])(?:는다|ㄴ다|했다|이다|된다|온다|간다|왔다|갔다|보다|같다)\.?$")
POLITE_END = re.compile(r"(?:습니다|입니다|됩니다|ㅂ니다|세요|어요|아요|에요|예요)\.?$")


def split_frontmatter(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            nl = text.find("\n", end + 1)
            return text[nl + 1:] if nl != -1 else ""
    return text


def strip_code_and_quotes(lines):
    """코드펜스 안·인용블록(>) 줄은 dash/금지어 검사에서 뺀 본문만 돌려준다."""
    out = []
    in_fence = False
    for i, ln in enumerate(lines):
        s = ln.strip()
        if s.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if s.startswith(">"):
            continue
        out.append((i + 1, ln))
    return out


def count_sentences(body):
    # 종결부호 기준 대략. 코드펜스 제거 후.
    text = re.sub(r"```.*?```", "", body, flags=re.S)
    return len(re.findall(r"[.!?。]|다\s|요\s|니다", text))


def objective(body):
    chars = len(re.sub(r"\s", "", body))
    sents = count_sentences(body)
    words = len(body.split())
    return chars, sents, words


def find_banned(lines):
    hits = []
    for cat, words in BANNED.items():
        for w in words:
            for lineno, ln in lines:
                if w in ln:
                    hits.append((cat, w, lineno, ln.strip()))
    return hits


def find_internal(lines):
    hits = []
    for cat, rx in INTERNAL.items():
        for lineno, ln in lines:
            for m in rx.finditer(ln):
                hits.append((cat, m.group(), lineno, ln.strip()))
    return hits


def find_dashes(lines):
    hits = []
    for ch, label in DASHES.items():
        for lineno, ln in lines:
            c = ln.count(ch)
            if c:
                hits.append((label, ch, lineno, ln.strip()))
    return hits


def check_politeness(lines, allow_noun_form):
    """1a — 휴리스틱. 반말 종결로 보이는 본문 줄을 후보로 잡는다."""
    flags = []
    for lineno, ln in lines:
        s = ln.strip().rstrip(".")
        if not s or s.startswith("#") or s.startswith("|") or s.startswith("-") or s.startswith("*"):
            continue
        if BANMAL_END.search(s) and not POLITE_END.search(s):
            flags.append((lineno, ln.strip()))
    return flags


def check_empty_sections(text):
    """C1 — 헤딩별 본문이 placeholder만 있거나 1문장 미만이면 빈 섹션."""
    lines = text.splitlines()
    heads = [(i, ln) for i, ln in enumerate(lines) if re.match(r"^#{1,6}\s", ln)]
    empties = []
    for idx, (i, head) in enumerate(heads):
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        body = "\n".join(lines[i + 1:end]).strip()
        body_wo_ph = re.sub(r"\[.*?\]", "", body)
        if re.search(r"\[.*?\]", body):
            empties.append((head.strip(), "placeholder 잔존"))
        elif len(re.sub(r"\s", "", body_wo_ph)) < 10:
            empties.append((head.strip(), "내용 1문장 미만"))
    return empties, len(heads)


def check_props(body, props_path):
    with open(props_path, encoding="utf-8") as f:
        props = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    missing = [p for p in props if p not in body]
    return props, missing


def section(title):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--props")
    ap.add_argument("--tokens", type=int)
    ap.add_argument("--turns", type=int)
    ap.add_argument("--resume", action="store_true", help="이력서: 명사형 종결 허용")
    args = ap.parse_args()

    with open(args.file, encoding="utf-8") as f:
        raw = f.read()
    body = split_frontmatter(raw)
    lines = strip_code_and_quotes(body.splitlines())

    section("객관 (자동 계측)")
    chars, sents, words = objective(body)
    print(f"  최종 분량: {chars}자(공백 제외) / 약 {sents}문장 / {words}어절")
    print(f"  누적 토큰: {args.tokens if args.tokens is not None else '미입력 (세션에서 기록)'}")
    print(f"  턴 수    : {args.turns if args.turns is not None else '미입력 (세션에서 기록)'}")

    section("반객관 (기계 매칭 — 위반 개수, 적을수록 좋음)")
    banned = find_banned(lines)
    internal = find_internal(lines)
    dashes = find_dashes(lines)
    polite = check_politeness(lines, args.resume)
    empties, nheads = check_empty_sections(body)

    def dump(name, hits, fmt):
        print(f"\n[{name}] {len(hits)}건")
        for h in hits:
            print("   " + fmt(h))

    dump("금지어", banned, lambda h: f"{h[0]} · '{h[1]}' (L{h[2]}): {h[3][:70]}")
    dump("내부 작업이력(5a)", internal, lambda h: f"{h[0]} · '{h[1]}' (L{h[2]}): {h[3][:70]}")
    dump("em/en dash(10a)", dashes, lambda h: f"{h[1]} (L{h[2]}): {h[3][:70]}")
    print(f"\n[습니다체(1a) 휴리스틱] {len(polite)}건 (눈으로 확인 — false positive 가능"
          + (", 이력서 명사형 허용)" if args.resume else ")"))
    for lineno, ln in polite:
        print(f"   L{lineno}: {ln[:70]}")

    section("완전성 (반객관)")
    print(f"[C1 빈 섹션] 확정 헤딩 {nheads}개 중 {len(empties)}개 빈 섹션")
    for head, why in empties:
        print(f"   {head}  ← {why}")
    if args.props:
        props, missing = check_props(body, args.props)
        print(f"\n[C2 핵심명제] {len(props)}개 중 {len(missing)}개 누락")
        for m in missing:
            print(f"   누락: {m}")
    else:
        print("\n[C2 핵심명제] --props 미지정 (G2 명제 리스트 필요)")

    section("주관 (사람 전속 — 여기서 안 잼)")
    print("  만족/불만족 · 추가교정 횟수 → 눈가림 채점")

    total = len(banned) + len(internal) + len(dashes) + len(empties)
    print(f"\n>> 기계 적발 합계(참고용, 점수 아님): {total}건 + 습니다체 후보 {len(polite)}건")


if __name__ == "__main__":
    main()
