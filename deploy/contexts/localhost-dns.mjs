#!/usr/bin/env node
// `*.localhost`를 루프백으로 푸는 패치를 실은 채 next dev를 띄운다 — 크롬 확인을 에이전트마다 다른
// 호스트로 나눠 돌릴 때 쓴다.
//
// 크롬은 `<이름>.localhost`를 루프백으로 풀지만 Windows의 Node는 못 푼다(`dns.lookup` → ENOTFOUND).
// 서버 컴포넌트가 요청 호스트로 자기 API를 되부르는 앱은 그 호스트에서 로그인한 화면이 오류로 뜬다.
// 앱 코드·설정·hosts 파일을 건드리지 않고 서버 프로세스의 `dns.lookup`만 바꾼다.
//
// 사용(스킬 문서에서는 `{{contexts}}/localhost-dns.mjs`로 적는다). 앱 폴더(package.json이 있는 곳)에서:
//   node <이 파일> dev -p <포트>      뒤 인자는 그대로 `next`에 넘긴다
//
// 패치는 `node --require <이 파일>`로 실어야 한다. `--import`나 `NODE_OPTIONS`로 실으면 next dev가
// 컴파일·새로고침을 끝없이 되풀이한다(next 16.4·Node 24에서 실측). 직접 실행하면 이 꼴로 다시 띄운다.
// `--require`로 ESM을 싣는 것은 Node 22.12부터 된다.
import { spawn } from 'node:child_process';
import dns from 'node:dns';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import util from 'node:util';

const SELF = fileURLToPath(import.meta.url);

patchLookup();

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  launchNext(process.argv.slice(2));
}

function patchLookup() {
  const originalLookup = dns.lookup;

  function lookup(hostname, options, callback) {
    if (!isLocalhostSubdomain(hostname)) return originalLookup.apply(this, arguments);
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    const { address, family } = loopback(options);
    if (options?.all) process.nextTick(callback, null, [{ address, family }]);
    else process.nextTick(callback, null, address, family);
  }

  // `util.promisify(dns.lookup)`가 원본처럼 `{ address, family }`를 돌려주게 한다.
  lookup[util.promisify.custom] = (hostname, options = {}) =>
    isLocalhostSubdomain(hostname)
      ? Promise.resolve(options?.all ? [loopback(options)] : loopback(options))
      : dns.promises.lookup(hostname, options);

  dns.lookup = lookup;
}

function isLocalhostSubdomain(hostname) {
  return typeof hostname === 'string' && hostname.toLowerCase().replace(/\.$/, '').endsWith('.localhost');
}

function loopback(options) {
  const family = typeof options === 'number' ? options : options?.family;
  return family === 6 ? { address: '::1', family: 6 } : { address: '127.0.0.1', family: 4 };
}

// 모노레포는 next가 루트 node_modules에 끌어올려져 있으므로 경로를 박지 않고 앱 폴더에서 푼다.
function launchNext(args) {
  let nextBin;
  try {
    nextBin = createRequire(path.join(process.cwd(), 'package.json')).resolve('next/dist/bin/next');
  } catch {
    console.error(`next를 찾지 못했습니다 — 앱 폴더(package.json이 있는 곳)에서 실행하세요: ${process.cwd()}`);
    process.exit(1);
  }
  const child = spawn(process.execPath, ['--require', SELF, nextBin, ...args], { stdio: 'inherit' });
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
