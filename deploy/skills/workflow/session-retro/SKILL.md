---
name: session-retro
description: workflow를 타고 진행한 세션이 과제 전체 종료 후 자기 자신을 회고한다 — 자기 세션 로그에서 타임라인을 뽑고(단계 1), 시간소비·위임·병렬 3관점으로 돌아본다(단계 2). 호출형 — 호출 컨텍스트가 안내·호출한다. 독립 호출은 단계 1(뽑기)만.
---

# 세션 자기 회고

## 목적

workflow(과제)를 타고 진행한 세션들을, 과제 전체가 끝난 뒤 각 세션이 **자기 자신**을 회고해 "어디서 시간이 샜나 / 위임이 이득이었나 / 병렬 가능했나"를 뽑아 다음 작업에 반영한다.

- **범위**: workflow를 타고 진행한 세션 전체(실무·개인·채용). 출력 경로는 workflow가 이미 쓰는 `plan/retrospective/`.
- **시점·단위**: 과제(workflow) 전체가 끝난 뒤. 각 세션 종료 직후가 아니라 사후에 돌아본다. 순회 개수는 고정 없이 사용자가 감당 가능한 만큼(1개씩~여러 세션 동시).
- **자기 회고**: 대상 세션에 다시 들어가 **그 세션이 자기 자신**을 회고한다(당사자라 진단 정확). 자기 방어 편향이 크므로 뽑은 원본 타임라인을 증거로 삼는다.

## 구조 — 단일 스킬, 두 단계

한 세션이 자기 안에서 [단계 1 뽑기] → [단계 2 돌아보기] 순서로 진행한다. 단계 1(뽑기)은 채용 '제출용 정제' 때 **단독 호출**도 가능하다(회고 없이 대화내역만).

---

## 단계 1 — 뽑기 (자기 세션 타임라인 추출)

목적: 자기 세션 로그(jsonl)에서 사용자·AI 발화를 날짜+시각과 함께 추출·정제해 회고 증거를 만든다. 이 원본 기록이 자기 회고의 **증거**다 — compact로 흐려진 기억을 되살리고, 자기 실수를 감싸려 해도 반박한다.

### 절차

1. **대상 세션 jsonl 확정** — 자기 회고이므로 대상은 보통 **자기 자신**의 로그.
   - 로그 위치: `~/.claude/projects/<프로젝트슬러그>/<세션id>.jsonl`
   - 슬러그 = cwd 경로 구분자를 `-`로 치환 (예: `C--Users-forwo-WebstormProjects-recruitment-mycle`). 프로젝트 찾기 = 디렉토리명 부분일치.
   - 각 `.jsonl`의 첫/끝 `timestamp`(시작·종료·소요시간)와 첫 사용자 텍스트로 대상 세션을 특정 → 사용자와 확정. (자기 세션 식별이 모호하면 후보를 표로 제시해 확인받는다.)
   - **용도 확인**: 회고용(내부)인지 제출용(채용과제가 세션 내역 제출을 요구하는 경우)인지 사용자에게 확인 — 제출용이면 「제출용 정제」 발동.
2. **추출** — 아래 스크립트 템플릿을 세션에 맞게 수정해 실행.
3. **AI 장문 요약 치환** — 산출 md에서 150자 초과 AI 블록을 서브에이전트로 `[요약]` 1~3줄 치환 (아래 프롬프트 요지).
4. **시간대별 헤딩 삽입** — 타임라인을 활동 구간으로 나눠 각 구간을 `## {시각범위} — 요약` 헤딩으로 만들어 대화내역을 끊는다 (아래 「시간대별 헤딩 양식」). 후처리 스크립트로 삽입하고 블록 총수 보존을 검증한다.
5. **출력**: 대상 프로젝트 `plan/retrospective/[세션이름].md`
6. **(제출용만) 사용자 발화 정제** — 「제출용 정제」 적용.

### 시간대별 헤딩 양식

문서를 두 층으로 구성한다:

1. **상단 조망** — 메타 인용·합계 아래에 `# 시간대별 요약본` 섹션을 두고, 각 구간을 `- **{n/dd HH:MM ~ HH:MM (소요분)}** — 한 일 요약` 리스트로 나열한다(전체를 한눈에 조망).
2. **하단 대화** — 이어서 대화내역을 각 구간 `## {n/dd HH:MM ~ HH:MM (소요분)} — 한 일 요약` 헤딩으로 끊고, 그 아래 해당 시각의 원문 대화 블록을 둔다(헤딩이 곧 그 구간 대화의 앵커).

조망 목록(`#`)과 구간별 대화(`##`)가 **둘 다** 있어야 한다.

존재 이유: 순서대로 읽을 땐 안 보이지만 구간으로 모아 보면 "헐 이걸 이 시간만큼 써서 했다고?"가 드러난다 — 회고의 핵심 재료.

- 헤딩 형식: `## n/dd HH:MM ~ HH:MM (소요분) — 한 일 요약` (날짜가 바뀌면 끝쪽에도 날짜 표기)
- 구간은 활동 단위로 LLM이 나눈다 (단계 진입 / 실행 / 리뷰 / 재작업 / 사고 대응 / 세션 재개 등)
- **판단(의사결정) 단위로 묶기** — 표면 주제가 여럿이어도(코드 붙여넣기·문서 읽기·라이브러리 조사 등) 그것들이 **하나의 판단을 위한 탐색**이었으면 그 판단 구간으로 **합친다**. 목적은 "그 판단에 실제로 몇 분 썼나"를 end-to-end로 드러내는 것 — 표면 활동으로 쪼개면 판단 비용이 '코드리뷰'·'문서읽기'로 흩어져 안 보인다. 단계 2 ①시간소비 점검에서 "판단이 오래 걸린 구간"을 특히 이 기준으로 찾는다. (실증 PR_7_PLAN: 붙여넣기 try/catch 반려·step5.md·MP ApiClient 조사가 모두 "에러처리를 어떤 구조로 공통화할까" 한 판단의 탐색 → 24분 탐색 + 11분 확정을 한 arc로 묶어 판단 35분을 가시화.)
- 요약엔 핵심 결정·커밋 해시·등록한 task를 보존 (회고 추적용)
- 마지막에 **합계 라인**: 총 소요 + 눈에 띄는 집계 1개 (예: "첫 커밋까지 98분, 교정 루프 83분 — 교정이 최초 작업과 맞먹음")
- 섹션 상단 캐비앳 명시: "구간 경계는 발화 시각 기준 — 끝은 다음 발화 시각으로 근사(사용자 부재 시간 포함 가능)"

#### 헤딩 삽입은 후처리 스크립트로

AI 요약(절차 3)까지 끝난 평면 타임라인에, 구간 시작시각+헤딩 배열(`SEGS`)로 각 구간 첫 블록(`**{시각} · `) 앞에 `## ` 헤딩을 삽입한다. **역순으로 삽입**(뒤 구간부터 — 인덱스 밀림 방지)하고, 삽입 후 **블록 총수·`##` 개수·MISS 0을 반드시 검증**한다. (합계는 마지막 라인이 아니라 상단 메타 인용 블록 바로 아래 `> **합계**:` 한 줄로 둔다.)

- 스크립트 삽입 로직 버그로 블록이 **의도치 않게 누락**될 수 있으니, 재구성 전후 블록 총수를 `blocks`(타임스탬프 헤더 수)·`miss`로 찍어 확인한다.
- [CRITICAL] 단 **사용자가 의도적으로 일부 구간을 잘라낸 것과 스크립트 유실을 구분**한다. 사용자 삭제면 존중하고 되살리지 않는다. (사용자가 뺀 메타 구간을 "유실 사고"로 오인해 재추출로 되살린 오판 사례 있음 — 회고본은 사용자가 남기려는 실작업 구간만 유지한다.)

### 정제 규칙

- 화자 라벨: **사용자 / AI / 시스템**
- 명령은 접두사 없이 백틱만: `/workflow BG 채용` (`<command-name>` 태그에서 name+args 추출)
- **백그라운드 task 완료 알림은 래핑 형태가 2가지다 — 둘 다 잡아야 한다**: (a) `[SYSTEM NOTIFICATION - NOT USER INPUT]`로 시작하는 래핑된 형태, (b) `queue-operation`(enqueue)으로 들어와 래핑 없이 곧장 `<task-notification>`으로 시작하는 raw 형태. (a)만 잡고 (b)를 빠뜨리면 `<task-notification>` XML 블록이 "사용자" 화자로 원문 그대로 새어나간다. 둘 다 `<summary>` 태그 내용만 뽑아 `[백그라운드 task 완료 알림 — {summary}. 결과 본문 생략]`으로 통일 치환.
- 사용자의 긴 붙여넣기·압축 요약("This session is being continued...")은 [한 줄 요약]으로 대체 (압축 요약은 화자 `시스템`)
- **AI 발화 150자 초과 → `[요약]` 1~3줄** — 핵심 주장·결정·제안·질문을 담기("설명했다" 금지). 이하는 전문 유지.
- 사용자 연속 수정 재전송(5분 내 prefix 관계) → 최종본만 남기고 `(입력 수정 ×N)` 표기
- AI가 한 턴에서 툴 호출 사이로 쪼갠 발화 → 한 블록으로 합침(시각은 첫 발화 기준)
- 사용자 발화는 내용 요약·삭제·재해석 금지 (승인성 입력 "ㅇㅋ"도 유지 — 승인 횟수도 KPI) — **회고용 한정. 제출용은 「제출용 정제」가 우선**
- 멀티데이 세션이라 **날짜 필수** (`7/14 10:03` 형식)

### 제출용 정제 (채용과제 제출 모드 — opt-in)

채용과제 중 AI 세션 대화 내역 제출을 요구하는 곳이 간혹 있다. 제출용 추출에서는 위 "사용자 발화 원문 유지" 원칙에 예외를 두고 사용자 발화를 정제한다 (회고용에는 적용하지 않음):

- **욕설·비속어·과격한 표현은 전부 삭제 또는 중립 표현으로 순화**한다. 발화 전체가 욕설이면 그 발화를 삭제.
- **반말·명령조 등 무례하게 읽힐 수 있는 어투는 순화**한다 (존댓말 전환 또는 중립화).
- 정제는 **어투만** 다룬다 — 요구·결정·질문 등 내용은 삭제·왜곡하지 않는다. 어투를 걷어내면 내용이 사라지는 발화만 통삭제 허용.
- AI·시스템 블록은 손대지 않는다 (AI 요약 치환은 절차 3에서 이미 완료).
- 정제 후 **사용자에게 정제 결과 검토를 받는다** — 외부 제출물이므로 사용자 최종 확인 필수.

### 스크립트 템플릿

세션마다 수정할 곳: `SESSION_JSONL`(대상 세션=자기 자신), `OUT`(출력 경로), 긴 붙여넣기 요약 분기(세션별 내용 확인 후 작성).

```js
import fs from 'node:fs';

const SESSION_JSONL = String.raw`C:\Users\forwo\.claude\projects\<프로젝트슬러그>\<세션id>.jsonl`; // ★수정
const OUT = String.raw`<프로젝트경로>\plan\retrospective\<세션이름>.md`; // ★수정
const lines = fs.readFileSync(SESSION_JSONL, 'utf8').split('\n').filter(Boolean);

const raw = [];
for (const line of lines) {
  let e; try { e = JSON.parse(line); } catch { continue; }
  if (!e.message || e.isMeta) continue;
  if (e.type === 'user') {
    const c = e.message.content;
    let text = typeof c === 'string' ? c
      : Array.isArray(c) ? c.filter(b => b.type === 'text').map(b => b.text).join('\n') : '';
    text = text.trim();
    if (!text) continue; // tool_result-only
    if (text.startsWith('<system-reminder>') || text.startsWith('<local-command-stdout>')) continue;
    raw.push({ ts: new Date(e.timestamp), who: 'user', text });
  } else if (e.type === 'assistant') {
    const text = (e.message.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (text) raw.push({ ts: new Date(e.timestamp), who: 'AI', text });
  }
}

const items = raw.map(({ ts, who, text }) => {
  if (who === 'AI') return { ts, who, text };
  if (text.includes('<command-name>')) {
    const name = (text.match(/<command-name>([^<]*)<\/command-name>/) || [])[1]?.trim() ?? '';
    const args = (text.match(/<command-args>([^<]*)<\/command-args>/) || [])[1]?.trim() ?? '';
    return { ts, who: '사용자', text: `\`${name.startsWith('/') ? name : '/' + name}${args ? ' ' + args : ''}\`` };
  }
  if (text.startsWith('This session is being continued'))
    return { ts, who: '시스템', text: `[컨텍스트 압축 요약 — \`/compact\` 자동 생성. 원문 약 ${(text.length/1000).toFixed(1)}k자 생략]` };
  if (text.length > 2000) // ★세션별로 내용 보고 [한 줄 요약] 직접 작성 권장
    return { ts, who: '사용자', text: `[긴 붙여넣기 생략(약 ${(text.length/1000).toFixed(1)}k자) — 첫 줄: ${text.split('\n')[0].slice(0, 80)}]` };
  return { ts, who: '사용자', text };
});

const merged = [];
for (const cur of items) {
  const prev = merged[merged.length - 1];
  if (prev && prev.who === '사용자' && cur.who === '사용자' && cur.ts - prev.ts <= 5 * 60 * 1000 &&
    (cur.text.startsWith(prev.text) || prev.text.startsWith(cur.text))) {
    if (cur.text.length >= prev.text.length) { cur.edits = (prev.edits ?? 1) + 1; merged[merged.length - 1] = cur; }
    else prev.edits = (prev.edits ?? 1) + 1;
    continue;
  }
  if (prev && prev.who === 'AI' && cur.who === 'AI') { prev.text += '\n\n' + cur.text; continue; }
  merged.push(cur);
}

const pad = n => String(n).padStart(2, '0');
let md = `# <세션이름> 세션 — 대화 타임라인 (${merged.length}건)\n\n`; // ★헤더 안내문 보강
for (const { ts, who, text, edits } of merged) {
  const stamp = `${ts.getMonth() + 1}/${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`;
  md += `**${stamp} · ${who}**${edits ? ` (입력 수정 ×${edits})` : ''}\n\n${text}\n\n---\n\n`;
}
fs.writeFileSync(OUT, md);
console.log('entries:', merged.length);
```

### AI 장문 요약 서브에이전트 프롬프트 요지

> 파일 `<OUT>`에서 `· AI**` 블록 중 본문 150자 초과만 골라 `[요약]` 1~3줄로 대체. 요약엔 핵심 주장·결정·제안·질문("설명했다" 금지). 사용자·시스템 블록, 150자 이하 AI 블록, 헤더·구분자·블록 수·순서는 한 글자도 변경 금지. 상단 인용 블록에 "AI 발화 중 150자 초과분은 [요약]으로 대체." 한 줄 추가. 치환 개수·최종 크기 보고.

---

## 단계 2 — 돌아보기 (3관점 자기 회고)

### 진행 순서

1. **재료 준비**: 단계 1에서 뽑은 **자기 세션** 타임라인(`plan/retrospective/[세션이름].md`). 이미 있으면 재사용. 이 원본 기록이 자기 회고의 증거다.
2. **3관점 점검** — 타임라인을 놓고 사용자+AI가 **함께** 본다. 항목은 하나씩 제시하고 사용자 반응 대기:
   - **① 시간 소비 시점 포인트** — 타임스탬프 간격·재작업 루프로 어느 구간에서 시간이 갔는지. AI는 왕복 횟수 기준으로 낭비 루프를 짚고, 벽시계 기준 공백은 사용자 활동(다른 세션 작업 등)인지 확인.
   - **② 위임 체크 → 리뷰비용** — 위임한 작업의 리뷰(검증)비용이 직접 실행 비용보다 컸는지. 판별식: **검증 비용 > 실행 비용이면 직접** (실증: git init 같은 간단 CLI는 위임 시 신뢰 검증 왕복이 실행 3초보다 비쌈 / 취향 강한 문서 그루핑·양식은 매번 교정 발생 → 직접. 반대로 근거 수집·코드 문답·대량 초안은 위임 이득).
   - **③ 병렬 가능 포인트** — 진행 순서를 보며 "이 대화가 꼭 앞 대화 뒤여야 했나?" 앞당길 방법 탐색 (실증: 툴링 결정은 과제요구사항만으로 가능한데 PR 분할 논의에 묻혀 늦어짐).
3. **인사이트 회수**: 나온 인사이트를 성격별로 회수 — 절차 개선은 backlog(workflow/) ideation, AI 행동 교정은 rules-as-code 게이트 후 규칙화, 위임 방식 변경은 사용자 메모. **회수 없이 대화로만 끝내지 않는다.**
4. AI 실수 규칙화가 나오면 `/pre-exit` Step 1 흐름(분류→문안→before/after→승인)을 따른다.

### 주의

- [CRITICAL] AI는 자기 실수를 방어하지 말 것 — **자기 회고라 범인이 자기를 심판하는 구조**여서 감싸기 편향이 남 회고보다 크다. 타임라인이 증거이니 기록으로 반박당할 각오로 진단하고, 진단은 발화점(어느 턴에서 루프가 시작됐나) 기준으로.
- 사용자 발화 원문을 재해석하지 말 것. 인용은 타임라인에서 그대로.
- 회고 산출물(느낀점 등)은 사용자가 `plan/retrospective/result.md` 류에 직접 적을 수 있음 — AI가 임의 편집하지 않는다.
