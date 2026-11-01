/**
 * UI 实拍：用 CDP 驱动真实 Chrome，走一遍「提问 → 生成 → 看代码」的完整流程并截图
 * 用法：node test/ui-shot.mjs   （需要服务已启动 + 本机 Chrome）
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_TARGET = process.env.URL || 'http://localhost:4173/';
const PORT = 9333;
const OUT = join(process.cwd(), '.shots');
const PROFILE = join(process.cwd(), '.shots/.chrome-profile');

await mkdir(OUT, { recursive: true });
await rm(PROFILE, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return r.json();
    } catch {}
    await sleep(250);
  }
  throw new Error('DevTools 未就绪');
}

const info = await waitForDevtools();
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
};

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const f = join(OUT, `${name}.png`);
  await writeFile(f, Buffer.from(data, 'base64'));
  console.log(`  📸 ${name}.png`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

console.log('→ 打开首页');
await send('Page.navigate', { url: URL_TARGET });
await sleep(1600);
await shot('ui-1-welcome');

console.log('→ 触发生成：数据看板');
await evaluate(`
  (function () {
    const ta = document.getElementById('prompt');
    ta.value = '做一个数据看板，包含 KPI 卡片、访问趋势折线图和渠道分布柱状图，能切换 7/30/90 天';
    ta.dispatchEvent(new Event('input'));
    document.getElementById('composer').requestSubmit();
    return true;
  })()
`);

// 等生成结束（发送按钮重新可用）
for (let i = 0; i < 120; i++) {
  await sleep(250);
  const busy = await evaluate(`document.getElementById('send').disabled`);
  const status = await evaluate(`document.getElementById('statusText').textContent`);
  if (!busy && status === '就绪') break;
}
await sleep(700);
await shot('ui-2-generated');

console.log('→ 切到代码视图');
await evaluate(`document.querySelector('[data-pane="code"]').click(), true`);
await sleep(500);
await shot('ui-3-code');

console.log('→ 回预览，切手机视口');
await evaluate(`document.querySelector('[data-pane="preview"]').click(), true`);
await evaluate(`document.querySelector('[data-width="390px"]').click(), true`);
await sleep(700);
await shot('ui-4-mobile');

console.log('→ 发一轮修改：换成深紫色主题');
await evaluate(`document.querySelector('[data-width="100%"]').click(), true`);
await evaluate(`
  (function () {
    const ta = document.getElementById('prompt');
    ta.value = '把主题色改成紫色，整体再圆润一点';
    ta.dispatchEvent(new Event('input'));
    document.getElementById('composer').requestSubmit();
    return true;
  })()
`);
for (let i = 0; i < 120; i++) {
  await sleep(250);
  const busy = await evaluate(`document.getElementById('send').disabled`);
  const status = await evaluate(`document.getElementById('statusText').textContent`);
  if (!busy && status === '就绪') break;
}
await sleep(700);
await shot('ui-5-edited');

console.log('→ 版本面板');
await evaluate(`document.querySelector('[data-pane="history"]').click(), true`);
await sleep(400);
await shot('ui-6-versions');

ws.close();
chrome.kill();
console.log('\n完成，截图在 .shots/');
process.exit(0);
