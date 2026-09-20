// 배포 전 fail-fast 게이트를 겹쳐 돌린다.
//
// sync 진입점들이 부르는 verify:* 는 전부 읽기 전용이고 서로 독립이다. 하나씩 돌리면 합계가
// 그대로 대기 시간이 되는데, 이 검사들이 sync 소요의 대부분을 차지한다.
//
// 배포를 막는 성질은 직렬일 때와 같다 — 하나라도 실패하면 배포를 시작하기 전에 끊는다.
// 다만 첫 실패에서 멈추지 않으므로 실패한 검사를 한 번에 모두 보여준다.
import childProcess from 'node:child_process';
import path from 'node:path';

// 겹쳐 돌리므로 stdio는 물려주지 않는다 — 여러 출력이 섞이면 어느 검사가 무엇을 말하는지 못 읽는다.
// 받아 두었다가 목록 순서대로 찍어 직렬로 돌 때와 같은 화면을 낸다.
function runVerify({ file, args = [] }) {
  return new Promise((resolve) => {
    const child = childProcess.spawn(process.execPath, [file, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    // 두 스트림 다 비운다 — 파이프로 열어 놓고 안 읽으면 버퍼가 차는 순간 자식이 멈춘다.
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (error) => resolve({ file, code: 1, stdout, stderr: `${stderr}${error.message}\n` }));
    // exit이 아니라 close다 — exit은 파이프가 비워지기 전에 온다.
    child.on('close', (code) => resolve({ file, code, stdout, stderr }));
  });
}

// duringSpawn: 검증이 도는 동안 끼워 넣을 동기 작업(예: ensureHooksReady). 동기 호출은 이벤트
// 루프를 막지만 이미 떠 있는 자식 프로세스는 그동안에도 OS에서 계속 돈다.
async function runVerifications(steps, duringSpawn) {
  const running = steps.map(runVerify);
  if (duringSpawn) duringSpawn();

  const results = await Promise.all(running);

  for (const { stdout, stderr } of results) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) {
    for (const { file, code } of failed) {
      console.error(`배포 전 검증 실패: ${shortName(file)} (exit ${code})`);
    }
    process.exit(1);
  }
}

// 실패 줄에는 파일명만으로 충분하되 verify/ 같은 상위 한 칸은 남긴다 — 이름이 같은 검사가
// 디렉토리만 달리 있을 때 어느 쪽인지 갈린다.
function shortName(file) {
  return path.join(path.basename(path.dirname(file)), path.basename(file)).replaceAll(path.sep, '/');
}

export { runVerifications };
