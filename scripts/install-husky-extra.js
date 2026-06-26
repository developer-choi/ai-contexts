#!/usr/bin/env node
// husky가 관리하지 않는 추가 git hook의 shim을 .husky/_ 에 설치한다(멱등).
// husky v9의 고정 hook 목록에 reference-transaction이 없어 prepare가 shim을 안 만든다.
// package.json "prepare": "husky && node scripts/install-husky-extra.js" 로 매 prepare(=npm ci 포함)마다
// 설치되며, husky prepare는 _ 디렉토리를 통째로 지우지 않으므로(자기 shim만 덮어씀) 이 shim은 보존된다.
//
// shim은 .husky/_ 에 살고 그 디렉토리는 gitignore다(워크트리마다 생성). 실제 hook 본체는
// 추적되는 .husky/reference-transaction 이고, _/h 디스패처가 sh -e로 그걸 실행한다.
const fs = require("fs");
const path = require("path");

const EXTRA_HOOKS = ["reference-transaction"];
const SHIM = '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n';

const shimDir = path.resolve(__dirname, "..", ".husky", "_");
if (!fs.existsSync(shimDir)) {
  // husky 미설치(HUSKY=0·.git 부재 등) — prepare의 husky 단계가 _를 안 만든 상태. 조용히 종료.
  process.exit(0);
}

for (const hook of EXTRA_HOOKS) {
  fs.writeFileSync(path.join(shimDir, hook), SHIM, { mode: 0o755 });
}
