/**
 * 本地生成引擎（无 API Key 时的默认通道）
 *
 * 它不是 mock：会根据需求真的生成一套可运行的三件套，并对产物做真实校验
 * （HTML 结构、外链、沙箱禁用 API、JS 语法、CSS 括号配平）。
 * 多轮修改走「增量补丁」路径，只重写被改动的文件 —— 与 LLM 通道的协议完全一致。
 */
import { build, BASE_CSS } from './templates.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEYWORDS = [
  ['calculator', ['计算器', '算数', '加减乘除', 'calculator', '计算']],
  ['timer', ['番茄', '计时', '倒计时', '专注钟', 'pomodoro', 'timer', '定时器']],
  ['dashboard', ['看板', '仪表盘', '数据大屏', '报表', 'dashboard', '图表', '数据分析', 'kpi']],
  ['form', ['表单', '预约', '报名', '登记', '问卷', 'form', '填写', '登录页', '注册页']],
  ['notes', ['笔记', '记事', '备忘录', 'note', '写作', '草稿']],
  ['todo', ['待办', '任务清单', 'todo', '清单', '打卡', '习惯']],
  ['landing', ['落地页', '官网', '首页', '产品页', 'landing', '介绍页', '宣传', '定价']],
];

const COLOR_MAP = {
  红: ['#ef4444', '239,68,68'],
  red: ['#ef4444', '239,68,68'],
  橙: ['#f97316', '249,115,22'],
  orange: ['#f97316', '249,115,22'],
  黄: ['#eab308', '234,179,8'],
  amber: ['#eab308', '234,179,8'],
  绿: ['#10b981', '16,185,129'],
  green: ['#10b981', '16,185,129'],
  青: ['#06b6d4', '6,182,212'],
  cyan: ['#06b6d4', '6,182,212'],
  蓝: ['#3b82f6', '59,130,246'],
  blue: ['#3b82f6', '59,130,246'],
  紫: ['#a855f7', '168,85,247'],
  purple: ['#a855f7', '168,85,247'],
  粉: ['#ec4899', '236,72,153'],
  pink: ['#ec4899', '236,72,153'],
  黑: ['#111827', '17,24,39'],
  black: ['#111827', '17,24,39'],
  灰: ['#64748b', '100,116,139'],
  gray: ['#64748b', '100,116,139'],
};

const COLOR_LABEL = {
  '#ef4444': '红色', '#f97316': '橙色', '#eab308': '黄色', '#10b981': '绿色',
  '#06b6d4': '青色', '#3b82f6': '蓝色', '#a855f7': '紫色', '#ec4899': '粉色',
  '#111827': '黑色', '#64748b': '灰色',
};

export function classify(prompt) {
  const p = prompt.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [kind, words] of KEYWORDS) {
    const score = words.reduce((acc, w) => acc + (p.includes(w) ? w.length : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = kind;
    }
  }
  return best || 'generic';
}

export function archetypeOf(files) {
  const css = files?.['style.css'] || '';
  const m = css.match(/@archetype\s+([a-z]+)/);
  return m ? m[1] : null;
}

/* ---------------------------- 流式工具 ---------------------------- */

async function streamText(emit, stepId, text, { size = 3, delay = 12 } = {}) {
  for (let i = 0; i < text.length; i += size) {
    emit('token', { stepId, text: text.slice(i, i + size) });
    await sleep(delay);
  }
}

async function streamFile(emit, path, content, { size = 56, delay = 7 } = {}) {
  emit('file', { path, status: 'start' });
  for (let i = 0; i < content.length; i += size) {
    emit('token', { path, text: content.slice(i, i + size) });
    await sleep(delay);
  }
  emit('file', { path, status: 'done' });
  await sleep(90);
}

/* ---------------------------- 真实自检 ---------------------------- */

export function inspect(files) {
  const html = files['index.html'] || '';
  const css = files['style.css'] || '';
  const js = files['app.js'] || '';
  const checks = [];

  const structural =
    /<html[\s>]/i.test(html) && /<body[\s>]/i.test(html) && /style\.css/.test(html) && /app\.js/.test(html);
  checks.push({ label: 'HTML 结构与资源引用', pass: structural });

  const external = /(src|href)\s*=\s*["']https?:\/\//i.test(html + css);
  checks.push({ label: '无外部依赖（离线可跑）', pass: !external });

  const unsafe = /localStorage|sessionStorage|document\.cookie/.test(js);
  checks.push({ label: '沙箱安全（无持久化 API）', pass: !unsafe });

  let syntaxOk = true;
  try {
    // 只编译不执行：能通过说明语法合法
    // eslint-disable-next-line no-new-func
    new Function(js);
  } catch {
    syntaxOk = false;
  }
  checks.push({ label: 'JavaScript 语法', pass: syntaxOk && js.trim().length > 0 });

  const balanced = (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length;
  checks.push({ label: 'CSS 规则配平', pass: balanced && css.includes(BASE_CSS.slice(0, 40)) });

  return checks;
}

/* ---------------------------- 增量修改 ---------------------------- */

function hexToRgbTuple(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}

function applyTheme(css, hex) {
  const tuple = hexToRgbTuple(hex);
  return css
    .replace(/--accent:\s*#[0-9a-f]{3,8};/i, `--accent:${hex};`)
    .replace(/--accent-soft:\s*rgba\([^)]*\);/i, `--accent-soft:rgba(${tuple},.12);`);
}

const DARK_VARS = `:root{
  --bg:#0b0d12;
  --surface:#141821;
  --surface-2:#1b2230;
  --text:#e9eef8;
  --muted:#93a1b5;
  --border:#252d3c;
  --shadow-sm:0 1px 2px rgba(0,0,0,.5);
  --shadow:0 16px 44px -20px rgba(0,0,0,.75);
  --accent-soft:rgba(109,94,249,.20);
}`;

function diffPatch(files, prompt) {
  const next = { ...files };
  const css = files['style.css'] || '';
  const html = files['index.html'] || '';
  const applied = [];

  // 1) 配色
  const colorHit = Object.keys(COLOR_MAP).find((k) => prompt.includes(k));
  if (colorHit && !/深色|暗色|dark/i.test(prompt)) {
    const [hex] = COLOR_MAP[colorHit];
    next['style.css'] = applyTheme(css, hex);
    applied.push(`主题色 → ${COLOR_LABEL[hex] || hex}`);
  }

  // 2) 深色模式
  if (/深色|暗色|夜间|黑色背景|dark/i.test(prompt)) {
    const base = (next['style.css'] || css).replace(/\n\/\* dark override \*\/[\s\S]*$/, '');
    next['style.css'] = `${base}\n\n/* dark override */\n${DARK_VARS}\n`;
    applied.push('切换为深色主题');
  }

  // 3) 圆角
  if (/圆角|圆润|更圆|rounded/.test(prompt)) {
    const src = next['style.css'] || css;
    const bigger = /更圆|大圆角/.test(prompt);
    next['style.css'] = src
      .replace(/--radius:\s*[\d.]+px;/, `--radius:${bigger ? 24 : 20}px;`)
      .replace(/--radius-sm:\s*[\d.]+px;/, `--radius-sm:${bigger ? 16 : 14}px;`);
    applied.push(bigger ? '圆角加大' : '圆角微调');
  }

  // 4) 字号 / 紧凑度
  if (/字大|字号大|更大/.test(prompt)) {
    next['style.css'] = (next['style.css'] || css).replace(/font-size:15px;/, 'font-size:16.5px;');
    applied.push('正文字号 +1.5px');
  }
  if (/紧凑|小一点|密集/.test(prompt)) {
    next['style.css'] = (next['style.css'] || css).replace(/line-height:1\.6;/, 'line-height:1.45;');
    applied.push('行高收紧');
  }

  // 5) 标题改名
  const rename = prompt.match(/(?:标题改成|标题改为|改名叫|名字改成|标题是)\s*[「"“']?([^」"”'，,。]{1,20})/);
  if (rename) {
    const name = rename[1].trim();
    next['index.html'] = html
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${name}</title>`)
      .replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, `$1${name}$2`);
    applied.push(`标题 → 「${name}」`);
  }

  return { files: next, applied };
}

/* ---------------------------- 主流程 ---------------------------- */

export async function runLocal({ prompt, files, history, emit }) {
  const isEdit = Boolean(files && files['index.html']);
  const kind = isEdit ? archetypeOf(files) || classify(prompt) : classify(prompt);

  emit('step', { id: 'plan', title: '理解需求', status: 'running' });
  await sleep(220);

  /* ---------- 增量修改分支 ---------- */
  if (isEdit) {
    const { files: patched, applied } = diffPatch(files, prompt);

    if (applied.length === 0) {
      const plan = [
        `- 目标：在现有「${kindLabel(kind)}」应用上做修改`,
        `- 判断：这条需求涉及结构级改动，本地引擎只覆盖样式/主题类补丁`,
        `- 建议：配置 OPENAI_API_KEY 后，同样的描述会交给真实模型处理`,
      ].join('\n');
      await streamText(emit, 'plan', plan);
      emit('step', { id: 'plan', status: 'done' });
      emit('notice', {
        title: '本地引擎的能力边界',
        body: '这次的需求需要重写结构，本地引擎不会硬做。但它没有假装完成 —— 你也可以试试「换成紫色」「改成深色」「标题改成 XX」这类修改。',
      });
      return;
    }

    const plan = [
      `- 识别为增量修改：保持「${kindLabel(kind)}」的结构，只动样式层`,
      `- 变更：${applied.join('、')}`,
      `- 策略：基于当前版本做补丁，未命中的文件不重写`,
    ].join('\n');
    await streamText(emit, 'plan', plan);
    emit('step', { id: 'plan', status: 'done' });
    await sleep(180);

    emit('step', { id: 'patch', title: '应用补丁', status: 'running' });
    await sleep(160);
    for (const path of ['index.html', 'style.css', 'app.js']) {
      const before = files[path];
      const after = patched[path];
      if (after !== undefined && after !== before) {
        await streamFile(emit, path, after, { size: 90, delay: 5 });
      }
    }
    emit('step', { id: 'patch', status: 'done' });
    await emitChecks(emit, patched);
    return;
  }

  /* ---------- 全新生成分支 ---------- */
  const artifact = build(kind, prompt);
  const plan = [
    `- 需求：${describe(kind, prompt)}`,
    `- 方案：${planFor(kind)}`,
    `- 技术：原生 HTML/CSS/JS 三件套，状态放内存，零外部依赖`,
  ].join('\n');
  await streamText(emit, 'plan', plan);
  emit('step', { id: 'plan', status: 'done' });
  await sleep(200);

  for (const path of ['index.html', 'style.css', 'app.js']) {
    const content = artifact.files[path];
    if (content) await streamFile(emit, path, content);
  }

  await emitChecks(emit, artifact.files);
  emit('summary', { text: artifact.summary, title: artifact.title });
}

async function emitChecks(emit, files) {
  emit('step', { id: 'verify', title: '自检', status: 'running' });
  await sleep(150);
  const checks = inspect(files);
  for (const c of checks) {
    emit('check', c);
    await sleep(110);
  }
  emit('step', { id: 'verify', status: 'done', meta: { passed: checks.filter((c) => c.pass).length, total: checks.length } });
}

function kindLabel(kind) {
  return {
    todo: '任务清单', calculator: '计算器', timer: '番茄钟', dashboard: '数据看板',
    form: '预约表单', landing: '产品落地页', notes: '记事本', generic: '通用页面',
  }[kind] || '应用';
}

function describe(kind, prompt) {
  const short = prompt.replace(/\s+/g, ' ').slice(0, 40);
  return `「${kindLabel(kind)}」—— ${short}`;
}

function planFor(kind) {
  return {
    todo: '单栏卡片式布局，主操作固定在顶部，列表项 hover 出现删除入口，三档筛选 + 空态',
    calculator: '深色渐变的悬浮机身，四列键盘，实时表达式求值，键盘可直接输入',
    timer: '环形进度为主视觉，三档时长切换，结束时用 WebAudio 播放提示音',
    dashboard: 'KPI 数字滚动 + Canvas 折线/柱状图 + 明细表，顶部切换 7/30/90 天',
    form: '聚焦式单列表单，逐字段校验与错误提示，提交后切成功页',
    landing: 'Hero + 特性三卡 + 三档定价，滚动进入视口时依次浮现',
    notes: '左侧列表 + 右侧编辑器，搜索过滤，编辑即改标题摘要',
    generic: 'Hero + 三张能力卡 + 一个可交互演示模块，整体走卡片化',
  }[kind];
}
