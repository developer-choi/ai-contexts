#!/usr/bin/env node
// 사용법: blind-ab.md (같은 폴더)
// 두 버전의 산출물을 문항마다 A/B로 섞은 블라인드 비교 페이지를 만들고, 판정을 버전 이름으로 되돌린다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DOC = path.join(import.meta.dirname, 'blind-ab.md');
const GRADE = { GOOD: 'GOOD', BAD: 'BAD' };
const PREFER = { A: 'A', B: 'B', TIE: 'TIE' };
const WINNER = { TIE: 'TIE', NEITHER: 'NEITHER', UNPICKED: 'UNPICKED' };
const FORMAT = { HTML: 'HTML', TEXT: 'TEXT' };

function fail(message) {
  process.stderr.write(`${message}\n사용법: ${DOC}\n`);
  process.exit(1);
}

function readJson(source) {
  let raw;
  try {
    raw = source === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(source, 'utf8');
  } catch (error) {
    fail(`읽지 못했다: ${source} (${error.message})`);
  }
  // 사용자가 붙여넣은 결과에는 JSON 앞뒤로 다른 글이 섞일 수 있어 첫 { 부터 마지막 } 까지만 읽는다
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) fail(`JSON이 없다: ${source}`);
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    fail(`JSON이 아니다: ${source} (${error.message})`);
  }
}

function validatePairs(pairs) {
  if (!pairs || typeof pairs !== 'object') fail('입력이 객체가 아니다');
  const { labels, items } = pairs;
  if (!Array.isArray(labels) || labels.length !== 2 || labels.some((label) => typeof label !== 'string' || !label)) {
    fail('labels는 비교할 두 버전의 이름 배열이어야 한다 (예: ["claude","gemini"])');
  }
  if (labels[0] === labels[1]) fail('labels 두 이름이 같다');
  if (labels.some((label) => Object.values(WINNER).includes(label))) fail(`labels에 ${Object.values(WINNER).join('·')}은 쓸 수 없다`);
  if (!Array.isArray(items) || items.length === 0) fail('items가 비었다');
  const ids = new Set();
  items.forEach((item, index) => {
    if (!item || typeof item.id !== 'string' || !item.id) fail(`items[${index}].id가 없다`);
    if (ids.has(item.id)) fail(`items의 id가 겹친다: ${item.id}`);
    ids.add(item.id);
    labels.forEach((label) => {
      if (typeof item.versions?.[label] !== 'string') fail(`items[${index}].versions.${label}이 없다`);
    });
  });
  if (pairs.format && !Object.values(FORMAT).includes(pairs.format)) fail(`format은 ${Object.values(FORMAT).join('이나 ')}다: ${pairs.format}`);
}

// A에 첫 버전이 오는 문항 수를 반(홀수면 무작위로 하나 더)으로 고정한 뒤 섞는다. 동전 던지기로 정하면 한쪽으로 몰릴 수 있다.
function balancedAssignment(count) {
  const half = Math.floor(count / 2) + (count % 2 && crypto.randomInt(2) ? 1 : 0);
  const firstOnA = Array.from({ length: count }, (_, index) => index < half);
  for (let index = count - 1; index > 0; index--) {
    const swapIndex = crypto.randomInt(index + 1);
    [firstOnA[index], firstOnA[swapIndex]] = [firstOnA[swapIndex], firstOnA[index]];
  }
  return firstOnA;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
// <script type="application/json"> 안에 넣을 때 </script>로 끊기지 않게 한다
const embedJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function buildHtml(title, format, shownItems) {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--muted:#666;--line:#ddd;--card:#f7f7f7;--accent:#2457c5}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#e8e8e8;--muted:#999;--line:#333;--card:#1f1f1f;--accent:#7aa2ff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto;padding:16px}
section{border:1px solid var(--line);border-radius:8px;padding:12px;margin:16px 0}
.ctx{color:var(--muted);margin-bottom:8px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:700px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border-radius:6px;padding:10px;min-width:0;overflow-wrap:anywhere}
.col pre{white-space:pre-wrap;margin:0;font:inherit}
.row{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.row strong{min-width:2em}
.prefer[hidden]{display:none}
.note{width:100%;box-sizing:border-box;margin-top:8px;padding:4px 6px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:4px;font:inherit}
button{padding:8px 16px;background:var(--accent);color:#fff;border:0;border-radius:6px;font:inherit;cursor:pointer}
textarea{width:100%;box-sizing:border-box;min-height:120px;margin-top:8px;background:var(--card);color:var(--fg);border:1px solid var(--line)}
#status{margin-left:8px;color:var(--muted)}
</style></head><body><main>
<h1>${escapeHtml(title)}</h1>
<p class="ctx">문항마다 A와 B가 각각 좋은지 나쁜지 선택한다. 둘 다 좋으면 어느 쪽이 더 좋은지 묻는 줄이 나타난다. 다 선택한 뒤 맨 아래 [결과 복사]를 누르고 대화창에 붙여넣는다.</p>
<div id="items"></div>
<p><button id="copy" type="button">결과 복사</button><span id="status"></span></p>
<textarea id="out" readonly hidden></textarea>
</main>
<script type="application/json" id="data">${embedJson({ title, format, items: shownItems })}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('data').textContent);
  var grades = [{ value: '${GRADE.GOOD}', text: '좋음' }, { value: '${GRADE.BAD}', text: '나쁨' }];
  var prefers = [{ value: '${PREFER.TIE}', text: '둘이 비슷함' }, { value: '${PREFER.A}', text: 'A가 더 좋음' }, { value: '${PREFER.B}', text: 'B가 더 좋음' }];
  function radios(name, options, onChange) {
    return options.map(function (option) {
      var label = document.createElement('label'); var radio = document.createElement('input');
      radio.type = 'radio'; radio.name = name; radio.value = option.value;
      if (onChange) radio.addEventListener('change', onChange);
      label.appendChild(radio); label.appendChild(document.createTextNode(' ' + option.text));
      return label;
    });
  }
  function checkedValue(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }
  var root = document.getElementById('items');
  function render(content) {
    var holder = document.createElement('div');
    if (data.format === '${FORMAT.TEXT}') { var pre = document.createElement('pre'); pre.textContent = content; holder.appendChild(pre); }
    else holder.innerHTML = content;
    return holder;
  }
  data.items.forEach(function (item, index) {
    var section = document.createElement('section');
    var heading = document.createElement('h2'); heading.textContent = (index + 1) + '. ' + item.id; section.appendChild(heading);
    if (item.context) { var context = render(item.context); context.className = 'ctx'; section.appendChild(context); }
    var cols = document.createElement('div'); cols.className = 'cols';
    ['A', 'B'].forEach(function (side) {
      var col = document.createElement('div'); col.className = 'col';
      var sideHeading = document.createElement('h3'); sideHeading.textContent = side; col.appendChild(sideHeading);
      col.appendChild(render(item[side])); cols.appendChild(col);
    });
    section.appendChild(cols);
    // 둘 다 좋음일 때만 어느 쪽이 더 좋은지 묻는다. 줄을 숨기면 그 선택도 지워 숨은 값이 결과에 섞이지 않게 한다
    var preferRow = document.createElement('div'); preferRow.className = 'row prefer'; preferRow.hidden = true;
    radios('p' + index, prefers).forEach(function (label) { preferRow.appendChild(label); });
    function syncPrefer() {
      var bothGood = checkedValue('gA' + index) === '${GRADE.GOOD}' && checkedValue('gB' + index) === '${GRADE.GOOD}';
      preferRow.hidden = !bothGood;
      if (!bothGood) preferRow.querySelectorAll('input').forEach(function (radio) { radio.checked = false; });
    }
    ['A', 'B'].forEach(function (side) {
      var row = document.createElement('div'); row.className = 'row';
      var name = document.createElement('strong'); name.textContent = side; row.appendChild(name);
      radios('g' + side + index, grades, syncPrefer).forEach(function (label) { row.appendChild(label); });
      section.appendChild(row);
    });
    section.appendChild(preferRow);
    var note = document.createElement('input'); note.type = 'text'; note.className = 'note'; note.id = 'n' + index; note.placeholder = '코멘트 (선택)';
    section.appendChild(note);
    root.appendChild(section);
  });
  document.getElementById('copy').addEventListener('click', function () {
    var picks = data.items.map(function (item, index) {
      return {
        id: item.id,
        grade: { A: checkedValue('gA' + index), B: checkedValue('gB' + index) },
        prefer: checkedValue('p' + index),
        note: document.getElementById('n' + index).value
      };
    });
    var missing = picks.filter(function (pick) {
      if (!pick.grade.A || !pick.grade.B) return true;
      return pick.grade.A === '${GRADE.GOOD}' && pick.grade.B === '${GRADE.GOOD}' && !pick.prefer;
    }).length;
    var text = JSON.stringify({ title: data.title, picks: picks });
    var out = document.getElementById('out'); out.hidden = false; out.value = text; out.select();
    var status = document.getElementById('status');
    var tail = missing ? ' (선택하지 않은 문항 ' + missing + '개)' : '';
    var settled = false;
    var done = function (copied) {
      if (settled) return;
      settled = true;
      status.textContent = (copied ? '복사됨. 대화창에 붙여넣는다.' : '자동 복사가 막혔다. 아래 칸을 복사해 붙여넣는다.') + tail;
    };
    var fallback = function () { var copied = false; out.select(); try { copied = document.execCommand('copy'); } catch (error) {} done(copied); };
    // 클립보드 API가 권한 대기로 응답하지 않을 때가 있어, 먼저 아래 칸 안내를 띄우고 1.5초 안에 끝나지 않으면 대체 복사로 넘어간다
    status.textContent = '복사하는 중. 안 되면 아래 칸을 복사해 붙여넣는다.' + tail;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      setTimeout(function () { if (!settled) fallback(); }, 1500);
    } else fallback();
  });
})();
</script></body></html>
`;
}

function build(argv) {
  let input = null;
  let outDir = null;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--out') outDir = argv[++index];
    else if (argv[index].startsWith('--')) fail(`모르는 옵션: ${argv[index]}`);
    else if (!input) input = argv[index];
    else fail(`인자가 너무 많다: ${argv[index]}`);
  }
  if (!input || !outDir) fail('build에는 <쌍 JSON>과 --out <폴더>가 필요하다');
  const pairs = readJson(input);
  validatePairs(pairs);
  const title = pairs.title || '블라인드 비교';
  const [firstLabel, secondLabel] = pairs.labels;
  const firstOnA = balancedAssignment(pairs.items.length);
  const key = { title, labels: pairs.labels, items: [] };
  const shownItems = pairs.items.map((item, index) => {
    const labelOnA = firstOnA[index] ? firstLabel : secondLabel;
    const labelOnB = firstOnA[index] ? secondLabel : firstLabel;
    key.items.push({ id: item.id, A: labelOnA, B: labelOnB });
    return { id: item.id, context: item.context || '', A: item.versions[labelOnA], B: item.versions[labelOnB] };
  });
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.resolve(outDir, 'blind.html');
  const keyPath = path.resolve(outDir, 'blind-key.json');
  fs.writeFileSync(htmlPath, buildHtml(title, pairs.format || FORMAT.HTML, shownItems), 'utf8');
  fs.writeFileSync(keyPath, `${JSON.stringify(key, null, 1)}\n`, 'utf8');
  process.stdout.write(`${htmlPath}\n${keyPath}\n`);
}

function decode(argv) {
  if (argv.length !== 2) fail('decode에는 <키 JSON>과 <결과 JSON|->가 필요하다');
  const key = readJson(argv[0]);
  const answer = readJson(argv[1]);
  if (!Array.isArray(key.items) || !Array.isArray(key.labels)) fail(`키 파일 꼴이 아니다: ${argv[0]}`);
  if (!Array.isArray(answer.picks)) fail('결과에 picks가 없다');
  const unknown = answer.picks.filter((pick) => !key.items.some((keyItem) => keyItem.id === pick.id)).map((pick) => pick.id);
  if (unknown.length) fail(`키에 없는 문항이 결과에 있다: ${unknown.join(', ')}. 다른 회차의 키인지 본다`);
  const pickById = new Map(answer.picks.map((pick) => [pick.id, pick]));
  const countByLabel = () => Object.fromEntries(key.labels.map((label) => [label, 0]));
  const tally = {
    versions: countByLabel(),
    [WINNER.TIE]: 0,
    [WINNER.NEITHER]: 0,
    [WINNER.UNPICKED]: 0,
    good: countByLabel(),
  };
  // 하나만 좋음이면 그쪽이 이긴다. 둘 다 좋음이면 더 좋은 쪽 선택을, 둘 다 나쁨이면 NEITHER를 쓴다
  const winnerOf = (keyItem, pick) => {
    const gradeA = pick?.grade?.A;
    const gradeB = pick?.grade?.B;
    if (!gradeA || !gradeB) return WINNER.UNPICKED;
    if (gradeA === GRADE.GOOD && gradeB === GRADE.GOOD) {
      if (pick.prefer === PREFER.A) return keyItem.A;
      if (pick.prefer === PREFER.B) return keyItem.B;
      if (pick.prefer === PREFER.TIE) return WINNER.TIE;
      return WINNER.UNPICKED;
    }
    if (gradeA === GRADE.GOOD) return keyItem.A;
    if (gradeB === GRADE.GOOD) return keyItem.B;
    return WINNER.NEITHER;
  };
  const rows = key.items.map((keyItem) => {
    const pick = pickById.get(keyItem.id);
    const winner = winnerOf(keyItem, pick);
    if (winner in tally.versions) tally.versions[winner]++;
    else tally[winner]++;
    const good = ['A', 'B'].filter((side) => pick?.grade?.[side] === GRADE.GOOD).map((side) => keyItem[side]);
    good.forEach((label) => { tally.good[label]++; });
    return { id: keyItem.id, winner, good, note: pick?.note || '' };
  });
  process.stdout.write(`${JSON.stringify({ rows, tally }, null, 1)}\n`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'build') build(rest);
else if (command === 'decode') decode(rest);
else fail(`서브커맨드는 build나 decode다: ${command ?? '(없음)'}`);
