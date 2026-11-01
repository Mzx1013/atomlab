/** 把每个 archetype 的产物写到 .preview/ 下，便于人工/截图验收 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../lib/templates.js';

const CASES = [
  ['todo', '做一个任务清单应用'],
  ['calculator', '做一个计算器'],
  ['timer', '做一个番茄钟'],
  ['dashboard', '做一个数据看板'],
  ['form', '做一个预约表单'],
  ['landing', '做一个产品落地页'],
  ['notes', '做一个记事本'],
  ['generic', '帮我做一个作品集页面'],
];

const root = new URL('../.preview/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

await mkdir(root, { recursive: true });
for (const [kind, prompt] of CASES) {
  const app = build(kind, prompt);
  const dir = join(root, kind);
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(app.files)) {
    await writeFile(join(dir, name), content, 'utf8');
  }
  console.log(`✓ ${kind.padEnd(11)} → .preview/${kind}/`);
}
