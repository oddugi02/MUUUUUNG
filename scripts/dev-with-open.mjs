/**
 * 비어 있는 포트(3000 우선)로 next dev를 뜨고, 준비되면 브라우저를 연다.
 * 3000이 이미 쓰이면 3001, 3002 … 로 자동 선택한다.
 */
import { spawn } from "node:child_process";
import getPort, { portNumbers } from "get-port";
import open from "open";

const port = await getPort({ port: portNumbers(3000, 3100) });
const url = `http://127.0.0.1:${port}`;

const child = spawn("npx", ["next", "dev", "-p", String(port)], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
  env: { ...process.env },
});

function waitForHttpReady(href, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() >= deadline) {
        reject(new Error(`서버가 ${timeoutMs / 1000}s 안에 응답하지 않았습니다: ${href}`));
        return;
      }
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 1500);
        const res = await fetch(href, { signal: ac.signal });
        clearTimeout(t);
        if (res.ok || res.status === 404 || res.status === 304) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      setTimeout(tick, 280);
    };
    tick();
  });
}

let opened = false;
async function tryOpenBrowser() {
  if (opened) return;
  try {
    await waitForHttpReady(url);
    opened = true;
    await open(url);
    console.log(`\n  미리보기: ${url}  (포트 ${port})\n`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
  }
}

void tryOpenBrowser();

function forwardSignal(sig) {
  try {
    child.kill(sig);
  } catch {
    /* ignore */
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
