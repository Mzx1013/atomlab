/**
 * 截图辅助：生成「关掉动画」的静态副本，再用无头 Chrome 截图
 * 用法：node test/shot.mjs  → 输出到 .shots/*.png
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from '../lib/templates.js';

const exec = promisify(execFile);
const ROOT = process.cwd();
const KINDS = (process.argv[2] || 'todo,calculator,timer,dashboard,form,landing,notes,generic').split(',');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const NO_ANIM = `<style>
*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}
.rise{opacity:1!important;transform:none!important}
.reveal{opacity:1!important;transform:none!important}
</style>`;

await mkdir(join(ROOT, '.shots/src'), { recursive: true });

for (const kind of KINDS) {
  const app = build(kind, '测试');
  const dir = join(ROOT, '.shots/src', kind);
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(app.files)) {
    const body = name === 'index.html' ? content.replace('</head>', `${NO_ANIM}\n</head>`) : content;
    await writeFile(join(dir, name), body, 'utf8');
  }
  const out = join(ROOT, '.shots', `${kind}.png`);
  await exec(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--virtual-time-budget=1800',
    '--window-size=1280,900',
    `--screenshot=${out}`,
    `file:///${join(dir, 'index.html').replace(/\\/g, '/')}`,
  ], { timeout: 60000 }).catch((e) => console.log('shot failed', kind, e.message.split('\n')[0]));
  console.log(`✓ ${kind}`);
}
