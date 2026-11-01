/**
 * 冒烟测试：走一遍所有生成分支 + 增量修改分支，并校验产物
 * 用法：node test/smoke.mjs
 * 需要服务已启动（默认 http://localhost:4173）
 */
import { inspect } from '../lib/engine.js';

const BASE = process.env.BASE || 'http://localhost:4173';

const CASES = [
  ['todo', '做一个任务清单应用，可以添加、勾选完成、按状态筛选'],
  ['calculator', '做一个计算器，支持加减乘除和括号，能用键盘输入'],
  ['timer', '做一个番茄钟计时器，25 分钟专注，环形进度，结束有提示音'],
  ['dashboard', '做一个数据看板，包含 KPI 卡片、访问趋势折线图和渠道分布柱状图，能切换 7/30/90 天'],
  ['form', '做一个预约表单，包含姓名、邮箱、日期、人数，要有校验和提交成功页'],
  ['landing', '做一个 SaaS 产品落地页，包含 Hero、三个特性、三档定价'],
  ['notes', '做一个记事本，左边列表右边编辑，可以搜索'],
  ['generic', '帮我做一个作品集页面'],
];

async function generate(prompt, files = null) {
  const res = await fetch(`${BASE}/api/agent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, files }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  const out = { files: {}, checks: [], steps: [], notice: null, summary: null };
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const cut = buf.lastIndexOf('\n\n');
    if (cut === -1) continue;
    const ready = buf.slice(0, cut + 2);
    buf = buf.slice(cut + 2);

    for (const block of ready.split('\n\n')) {
      if (!block.trim()) continue;
      let name = 'message';
      const data = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trim());
      }
      if (!data.length) continue;
      let payload;
      try {
        payload = JSON.parse(data.join('\n'));
      } catch {
        continue;
      }
      if (name === 'token' && payload.path) {
        out.files[payload.path] = (out.files[payload.path] || '') + payload.text;
      } else if (name === 'check') {
        out.checks.push(payload);
      } else if (name === 'step') {
        out.steps.push(payload);
      } else if (name === 'notice') {
        out.notice = payload;
      } else if (name === 'summary') {
        out.summary = payload;
      }
    }
  }
  return out;
}

let failed = 0;
const line = (s) => console.log(s);

line('\n═══ 全量生成分支 ═══');
for (const [name, prompt] of CASES) {
  const t0 = Date.now();
  const out = await generate(prompt);
  const checks = inspect(out.files);
  const bad = checks.filter((c) => !c.pass);
  const sizes = ['index.html', 'style.css', 'app.js']
    .map((p) => `${p}:${(out.files[p] || '').length}`)
    .join(' ');
  const ms = Date.now() - t0;

  // 额外断言：三件套齐全、路径引用正确、无外链
  const hasAll = ['index.html', 'style.css', 'app.js'].every((p) => (out.files[p] || '').length > 200);
  const ok = hasAll && bad.length === 0;

  if (!ok) failed++;
  line(`${ok ? '✓' : '✗'} ${name.padEnd(11)} ${String(ms).padStart(5)}ms  ${sizes}`);
  if (!ok) {
    if (!hasAll) line('    缺少文件');
    for (const b of bad) line(`    自检失败: ${b.label}`);
  }
}

line('\n═══ 增量修改分支 ═══');
const base = await generate(CASES[0][1]);

const edits = [
  ['换主题色', '把主题色改成紫色'],
  ['深色模式', '换成深色主题'],
  ['改标题', '标题改成「我的每日清单」'],
  ['圆角', '圆角再大一点'],
  ['越界需求', '加上拖拽排序和子任务层级'],
];

for (const [label, prompt] of edits) {
  const before = base.files;
  const out = await generate(prompt, before);
  const merged = { ...before, ...out.files };
  const checks = inspect(merged);
  const bad = checks.filter((c) => !c.pass);
  const changed = Object.keys(out.files).filter((p) => out.files[p] !== before[p]);
  const handled = out.notice ? 'notice' : changed.join(',') || 'none';
  const ok = out.notice ? true : bad.length === 0 && changed.length > 0;
  if (!ok) failed++;
  line(`${ok ? '✓' : '✗'} ${label.padEnd(8)} → ${handled}`);

  if (label === '深色模式' && merged['style.css']) {
    const dark = /dark override/.test(merged['style.css']) && /--bg:#0b0d12/.test(merged['style.css']);
    line(`    深色变量注入: ${dark ? '✓' : '✗'}`);
    if (!dark) failed++;
  }
  if (label === '换主题色' && merged['style.css']) {
    const purple = /--accent:#a855f7/.test(merged['style.css']);
    line(`    主色替换: ${purple ? '✓' : '✗'}`);
    if (!purple) failed++;
  }
  if (label === '改标题' && merged['index.html']) {
    const titled = /我的每日清单/.test(merged['index.html']);
    line(`    标题替换: ${titled ? '✓' : '✗'}`);
    if (!titled) failed++;
  }
}

line(`\n${failed === 0 ? '全部通过 ✓' : `失败 ${failed} 项 ✗`}\n`);
process.exit(failed === 0 ? 0 : 1);
