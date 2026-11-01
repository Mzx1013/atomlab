/**
 * 持久化验收：生成 → 刷新页面 → 断言应用与版本仍在
 * 用法：node test/persist.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rm, mkdir } from 'node:fs/promises';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9499;
const PROFILE = new URL('../.shots/.profile-persist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

await mkdir('.shots', { recursive: true });
await rm(PROFILE, { recursive: true, force: true });

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });

for (let i = 0; i < 80; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {}
  await sleep(250);
}
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let seq = 0;
const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
};
const send = (m, p = {}) => new Promise((res, rej) => {
  const id = ++seq; pend.set(id, { resolve: res, reject: rej });
  ws.send(JSON.stringify({ id, method: m, params: p }));
});
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable');
await send('Runtime.enable');

const checks = [];
const check = (label, ok) => { checks.push({ label, ok }); console.log(`${ok ? '✓' : '✗'} ${label}`); };

await send('Page.navigate', { url: 'http://localhost:4173/' });
await sleep(1500);

// 1. 生成一个应用
await ev(`
  (function(){
    var ta = document.getElementById('prompt');
    ta.value = '做一个任务清单应用';
    ta.dispatchEvent(new Event('input'));
    document.getElementById('composer').requestSubmit();
    return 1;
  })()
`);
for (let i = 0; i < 120; i++) {
  await sleep(250);
  if (!(await ev(`document.getElementById('send').disabled`))) break;
}
await sleep(600);
const before = await ev(`({
  files: document.querySelectorAll('.file-tab').length,
  chars: document.getElementById('statChars').textContent,
  versions: document.getElementById('versionCount').textContent
})`);
check('生成后有三个文件', before.files === 3);
check('版本数 ≥ 1', Number(before.versions) >= 1);

// 2. 刷新
await send('Page.navigate', { url: 'http://localhost:4173/' });
await sleep(1800);
const after = await ev(`({
  files: document.querySelectorAll('.file-tab').length,
  chars: document.getElementById('statChars').textContent,
  versions: document.getElementById('versionCount').textContent,
  preview: (document.getElementById('preview').srcdoc || '').length,
  restored: document.body.innerText.indexOf('已恢复') >= 0
})`);
check('刷新后文件仍在', after.files === 3);
check('刷新后预览仍渲染', after.preview > 1000);
check('刷新后版本仍在', after.versions === before.versions);
check('刷新后显示「已恢复」提示', after.restored);

console.log(`\n字符数：${before.chars} → ${after.chars}`);

ws.close();
chrome.kill();
await rm(PROFILE, { recursive: true, force: true }).catch(() => {});

const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} 项未通过 ✗` : '\n持久化验收通过 ✓');
process.exit(failed ? 1 : 0);
