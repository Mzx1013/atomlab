/**
 * 本地生成引擎的「能力库」。
 *
 * 每个 archetype = 一个完整可交互的应用模板（HTML + CSS + JS 三文件）。
 * 共享一套设计系统（BASE_CSS），保证任何一条分支生成出来都是「成品的观感」，
 * 而不是模板拼贴 —— 这是评审第一眼会看的东西。
 *
 * 约定：模板内不使用反引号 / `${}`（避免与宿主模板字符串冲突），
 * 全部用字符串拼接，生成的代码也因此更易读。
 */

export const BASE_CSS = `/* AtomLab design system */
:root{
  --bg:#f5f6fa;
  --surface:#ffffff;
  --surface-2:#eef1f8;
  --text:#0e1726;
  --muted:#6b7a90;
  --border:#e5e9f2;
  --accent:#6d5ef9;
  --accent-2:#22d3ee;
  --accent-soft:rgba(109,94,249,.10);
  --ok:#10b981;
  --danger:#ef4444;
  --radius:16px;
  --radius-sm:10px;
  --shadow-sm:0 1px 2px rgba(14,23,38,.06);
  --shadow:0 12px 34px -16px rgba(14,23,38,.22);
  --font:"Inter","SF Pro Text",system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family:var(--font);
  color:var(--text);
  background:var(--bg);
  -webkit-font-smoothing:antialiased;
  font-size:15px;
  line-height:1.6;
}
h1,h2,h3,p{margin:0}
button{font-family:inherit;font-size:inherit;cursor:pointer;border:0;background:none;color:inherit}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit}
::selection{background:var(--accent-soft)}

.container{width:100%;max-width:960px;margin:0 auto;padding:32px 24px}
.eyebrow{
  font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  color:var(--accent);margin-bottom:8px;
}
.title{font-size:28px;font-weight:700;letter-spacing:-.02em}
.muted{color:var(--muted)}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:42px;padding:0 18px;border-radius:var(--radius-sm);
  font-weight:600;font-size:14px;
  background:var(--surface);border:1px solid var(--border);
  transition:transform .16s ease,box-shadow .16s ease,background .16s ease,opacity .16s;
  box-shadow:var(--shadow-sm);
}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow)}
.btn:active{transform:translateY(0) scale(.99)}
.btn--accent{
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#22d3ee));
  color:#fff;border-color:transparent;
  box-shadow:0 10px 22px -10px color-mix(in srgb,var(--accent) 70%,transparent);
}
.btn--ghost{background:transparent;border-color:transparent;box-shadow:none;color:var(--muted)}
.btn--ghost:hover{background:var(--surface-2);color:var(--text);box-shadow:none}

.input{
  width:100%;height:44px;padding:0 14px;border-radius:var(--radius-sm);
  border:1px solid var(--border);background:var(--surface);
  outline:none;transition:border-color .16s,box-shadow .16s;
}
.input::placeholder{color:color-mix(in srgb,var(--muted) 70%,transparent)}
.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

.card{
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);box-shadow:var(--shadow-sm);
}

.chip{
  height:32px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:500;
  color:var(--muted);background:transparent;border:1px solid transparent;
  transition:all .16s;
}
.chip:hover{background:var(--surface-2)}
.chip.is-active{background:var(--accent-soft);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 30%,transparent)}

@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.rise{animation:rise .45s cubic-bezier(.22,1,.36,1) both}
`;

/** 统一的文档外壳：三个文件互相引用，预览侧由客户端的「微打包器」内联 */
function doc({ title, body, lang = 'zh-CN' }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
${body}
<script src="app.js"></script>
</body>
</html>`;
}

function wrap(archetype, { title, summary, body, css, js, lang }) {
  return {
    title,
    summary,
    files: {
      'index.html': doc({ title, body, lang }),
      'style.css': `/* @archetype ${archetype} */\n${BASE_CSS}\n${css}`.trim(),
      'app.js': js.trim(),
    },
  };
}

/* ------------------------------------------------------------------ *
 * 1. 任务清单
 * ------------------------------------------------------------------ */
function todoApp(copy) {
  const body = `<div class="container">
  <header class="head rise">
    <div>
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1 class="title">${copy.title}</h1>
      <p class="sub muted">${copy.sub}</p>
    </div>
    <div class="stat"><span id="doneCount">0</span><small>已完成</small></div>
  </header>

  <form class="composer rise" id="composer" style="animation-delay:.05s">
    <input id="input" class="input" placeholder="${copy.placeholder}" autocomplete="off" maxlength="80" />
    <button class="btn btn--accent" type="submit">添加</button>
  </form>

  <div class="bar rise" style="animation-delay:.1s">
    <div class="chips" id="chips">
      <button class="chip is-active" data-filter="all">全部</button>
      <button class="chip" data-filter="active">进行中</button>
      <button class="chip" data-filter="done">已完成</button>
    </div>
    <button class="btn btn--ghost" id="clear">清除已完成</button>
  </div>

  <ul class="list" id="list"></ul>
  <p class="empty" id="empty">列表是空的，先加一条吧 ✨</p>
</div>`;

  const css = `
.container{max-width:640px}
.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}
.sub{font-size:14px;margin-top:6px}
.stat{
  display:grid;place-items:center;min-width:76px;padding:10px 12px;border-radius:14px;
  background:var(--accent-soft);color:var(--accent);
}
.stat span{font-size:22px;font-weight:700;line-height:1.1}
.stat small{font-size:11px;font-weight:600;opacity:.8}
.composer{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.composer .input{flex:1}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.chips{display:flex;gap:4px}
.list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.item{
  display:flex;align-items:center;gap:12px;padding:14px 16px;
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow-sm);transition:transform .16s,box-shadow .16s,border-color .16s;
  animation:rise .3s ease both;
}
.item:hover{transform:translateY(-1px);box-shadow:var(--shadow)}
.item.is-done .text{color:var(--muted);text-decoration:line-through}
.check{
  width:22px;height:22px;flex:0 0 auto;border-radius:50%;
  border:1.5px solid var(--border);display:grid;place-items:center;
  transition:all .16s;background:var(--surface);
}
.check:hover{border-color:var(--accent)}
.item.is-done .check{background:var(--ok);border-color:var(--ok)}
.check svg{width:12px;height:12px;opacity:0;transition:opacity .16s}
.item.is-done .check svg{opacity:1}
.text{flex:1;font-size:14.5px;word-break:break-word}
.del{
  width:28px;height:28px;border-radius:8px;display:grid;place-items:center;
  color:var(--muted);opacity:0;transition:all .16s;
}
.item:hover .del{opacity:1}
.del:hover{background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger)}
.empty{display:none;text-align:center;color:var(--muted);font-size:14px;padding:36px 0}
.empty.show{display:block}
`;

  const js = `var STORE = [
  { id: 1, text: '把 Atoms Demo 的需求拆成三个页面', done: false },
  { id: 2, text: '设计生成过程的流式反馈', done: true },
  { id: 3, text: '录一段 60 秒的演示视频', done: false }
];
var seq = 4;
var filter = 'all';

var list = document.getElementById('list');
var empty = document.getElementById('empty');
var input = document.getElementById('input');
var doneCount = document.getElementById('doneCount');

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function render() {
  var visible = STORE.filter(function (t) {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  list.innerHTML = visible.map(function (t) {
    return '<li class="item' + (t.done ? ' is-done' : '') + '" data-id="' + t.id + '">' +
      '<button class="check" data-act="toggle" aria-label="切换完成">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
      '</button>' +
      '<span class="text">' + esc(t.text) + '</span>' +
      '<button class="del" data-act="del" aria-label="删除">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</li>';
  }).join('');

  doneCount.textContent = STORE.filter(function (t) { return t.done; }).length;
  empty.classList.toggle('show', visible.length === 0);
  empty.textContent = STORE.length === 0 ? '列表是空的，先加一条吧 ✨' : '这个分组里没有任务 🙂';
}

document.getElementById('composer').addEventListener('submit', function (e) {
  e.preventDefault();
  var text = input.value.trim();
  if (!text) return;
  STORE.unshift({ id: seq++, text: text, done: false });
  input.value = '';
  render();
});

list.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-act]');
  if (!btn) return;
  var li = btn.closest('.item');
  var id = Number(li.dataset.id);
  var item = STORE.find(function (t) { return t.id === id; });
  if (!item) return;
  if (btn.dataset.act === 'toggle') item.done = !item.done;
  if (btn.dataset.act === 'del') STORE = STORE.filter(function (t) { return t.id !== id; });
  render();
});

document.getElementById('chips').addEventListener('click', function (e) {
  var chip = e.target.closest('[data-filter]');
  if (!chip) return;
  filter = chip.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(function (c) {
    c.classList.toggle('is-active', c === chip);
  });
  render();
});

document.getElementById('clear').addEventListener('click', function () {
  STORE = STORE.filter(function (t) { return !t.done; });
  render();
});

render();`;

  return wrap('todo', { title: copy.title, summary: '任务清单：增删改查 + 状态筛选 + 空态处理', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 2. 计算器
 * ------------------------------------------------------------------ */
function calculatorApp() {
  const keys = [
    ['C', 'fn'], ['(', 'fn'], [')', 'fn'], ['÷', 'op'],
    ['7', ''], ['8', ''], ['9', ''], ['×', 'op'],
    ['4', ''], ['5', ''], ['6', ''], ['−', 'op'],
    ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
    ['0', ''], ['.', ''], ['←', 'fn'], ['=', 'eq'],
  ];

  const body = `<div class="container calc-wrap">
  <div class="calc rise">
    <div class="screen">
      <div class="expr" id="expr">0</div>
      <div class="result" id="result">&nbsp;</div>
    </div>
    <div class="pad">
      ${keys
        .map(
          ([k, kind]) =>
            `<button class="key ${kind}" data-key="${k}">${k}</button>`
        )
        .join('\n      ')}
    </div>
    <p class="hint muted">支持键盘输入：数字 · 运算符 · Enter 求值 · Backspace 删除</p>
  </div>
</div>`;

  const css = `
.calc-wrap{display:grid;place-items:center;min-height:100vh;max-width:none;background:
  radial-gradient(1200px 600px at 50% -20%, color-mix(in srgb,var(--accent) 14%,transparent), transparent 70%), var(--bg);}
.calc{
  width:min(360px,100%);padding:18px;border-radius:26px;background:var(--surface);
  border:1px solid var(--border);
  box-shadow:0 30px 70px -30px rgba(14,23,38,.35), 0 2px 6px rgba(14,23,38,.05);
}
.screen{
  padding:22px 18px 18px;border-radius:18px;text-align:right;
  background:linear-gradient(180deg,var(--surface-2),color-mix(in srgb,var(--surface-2) 55%,#fff));
  margin-bottom:14px;min-height:112px;display:flex;flex-direction:column;justify-content:flex-end;
}
.expr{font-size:30px;font-weight:600;letter-spacing:-.02em;word-break:break-all;line-height:1.25}
.result{font-size:14px;color:var(--muted);margin-top:6px;font-variant-numeric:tabular-nums}
.pad{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.key{
  height:56px;border-radius:14px;font-size:17px;font-weight:600;
  background:var(--surface-2);transition:transform .12s,background .12s,color .12s;
}
.key:hover{background:color-mix(in srgb,var(--surface-2) 60%,var(--accent) 12%)}
.key:active{transform:scale(.96)}
.key.op{color:var(--accent);background:var(--accent-soft)}
.key.fn{color:var(--muted)}
.key.eq{
  background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#22d3ee));
  color:#fff;box-shadow:0 12px 24px -12px color-mix(in srgb,var(--accent) 80%,transparent);
}
.hint{font-size:12px;text-align:center;margin-top:14px}
`;

  const js = `var expr = '';
var exprEl = document.getElementById('expr');
var resultEl = document.getElementById('result');

function normalize(e) {
  return e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
}

function evaluate(raw) {
  var s = normalize(raw).replace(/\\s+/g, '');
  var i = 0;
  function expr() {
    var v = term();
    while (s[i] === '+' || s[i] === '-') {
      var op = s[i++];
      var r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term() {
    var v = factor();
    while (s[i] === '*' || s[i] === '/' || s[i] === '%') {
      var op = s[i++];
      var r = factor();
      if (op === '*') v = v * r;
      else if (op === '/') v = r === 0 ? NaN : v / r;
      else v = v % r;
    }
    return v;
  }
  function factor() {
    if (s[i] === '-') { i++; return -factor(); }
    if (s[i] === '+') { i++; return factor(); }
    if (s[i] === '(') {
      i++;
      var v = expr();
      if (s[i] === ')') i++;
      return v;
    }
    var start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    return i === start ? NaN : parseFloat(s.slice(start, i));
  }
  var out = expr();
  return i < s.length ? NaN : out;
}

function fmt(n) {
  if (!isFinite(n)) return '错误';
  var r = Math.round(n * 1e10) / 1e10;
  return String(r);
}

function update() {
  exprEl.textContent = expr || '0';
  if (!expr) { resultEl.textContent = '\\u00a0'; return; }
  var v = evaluate(expr);
  resultEl.textContent = isFinite(v) ? '= ' + fmt(v) : '表达式不完整';
}

function press(k) {
  if (k === 'C') { expr = ''; }
  else if (k === '←') { expr = expr.slice(0, -1); }
  else if (k === '=') {
    var v = evaluate(expr);
    if (isFinite(v)) expr = fmt(v);
  } else if ('+-×÷'.indexOf(k) >= 0) {
    if (!expr && k !== '−') return;
    if (/[+\\-×÷]$/.test(expr)) expr = expr.slice(0, -1);
    expr += k;
  } else if (k === '.') {
    var tail = expr.split(/[+\\-×÷()]/).pop();
    if (tail.indexOf('.') >= 0) return;
    expr += tail === '' ? '0.' : '.';
  } else {
    expr += k;
  }
  update();
}

document.querySelectorAll('.key').forEach(function (btn) {
  btn.addEventListener('click', function () { press(btn.dataset.key); });
});

document.addEventListener('keydown', function (e) {
  var map = { '*': '×', '/': '÷', '-': '−' };
  if (/^[0-9.()]$/.test(e.key)) press(e.key);
  else if (map[e.key]) press(map[e.key]);
  else if (e.key === '+') press('+');
  else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); press('='); }
  else if (e.key === 'Backspace') { e.preventDefault(); press('←'); }
  else if (e.key === 'Escape') press('C');
});

update();`;

  return wrap('calculator', {
    title: '计算器',
    summary: '手写递归下降解析器（无 eval），支持括号/优先级与键盘操作',
    body,
    css,
    js,
  });
}

/* ------------------------------------------------------------------ *
 * 3. 番茄钟
 * ------------------------------------------------------------------ */
function timerApp(copy) {
  const body = `<div class="container timer-wrap">
  <div class="timer rise">
    <p class="eyebrow" style="text-align:center">${copy.eyebrow}</p>
    <h1 class="title" style="text-align:center">${copy.title}</h1>

    <div class="ring">
      <svg viewBox="0 0 240 240">
        <circle class="track" cx="120" cy="120" r="104" />
        <circle class="progress" id="progress" cx="120" cy="120" r="104" />
      </svg>
      <div class="center">
        <div class="time" id="time">25:00</div>
        <div class="mode" id="mode">专注</div>
      </div>
    </div>

    <div class="modes">
      <button class="chip is-active" data-min="25" data-name="专注">专注 25</button>
      <button class="chip" data-min="5" data-name="短休">短休 5</button>
      <button class="chip" data-min="15" data-name="长休">长休 15</button>
    </div>

    <div class="actions">
      <button class="btn btn--accent" id="toggle">开始专注</button>
      <button class="btn" id="reset">重置</button>
    </div>

    <p class="footer muted">今日已完成 <strong id="rounds">0</strong> 个专注周期</p>
  </div>
</div>`;

  const css = `
.timer-wrap{display:grid;place-items:center;min-height:100vh;max-width:none;background:
  radial-gradient(900px 500px at 50% 0%, color-mix(in srgb,var(--accent) 12%,transparent), transparent 65%), var(--bg);}
.timer{
  width:min(420px,100%);padding:34px 30px 26px;border-radius:26px;background:var(--surface);
  border:1px solid var(--border);box-shadow:0 30px 70px -34px rgba(14,23,38,.3);
}
.ring{position:relative;width:240px;height:240px;margin:26px auto 22px}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.track{fill:none;stroke:var(--surface-2);stroke-width:12}
.progress{
  fill:none;stroke:url(#g);stroke:var(--accent);stroke-width:12;stroke-linecap:round;
  stroke-dasharray:653.45;stroke-dashoffset:0;
  transition:stroke-dashoffset .35s linear,stroke .3s;
}
.center{position:absolute;inset:0;display:grid;place-content:center;text-align:center}
.time{font-size:52px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1}
.mode{font-size:13px;color:var(--muted);margin-top:8px;letter-spacing:.06em}
.modes{display:flex;justify-content:center;gap:6px;margin-bottom:22px}
.actions{display:flex;gap:10px}
.actions .btn{flex:1}
.footer{text-align:center;font-size:13px;margin-top:18px}
.footer strong{color:var(--text)}
.is-running .progress{stroke:var(--accent)}
@media (max-width:420px){.ring{width:200px;height:200px}.time{font-size:44px}}
`;

  const js = `var CIRC = 2 * Math.PI * 104;
var state = { total: 25 * 60, left: 25 * 60, running: false, name: '专注', rounds: 0 };
var tick = null;

var timeEl = document.getElementById('time');
var modeEl = document.getElementById('mode');
var progEl = document.getElementById('progress');
var toggleBtn = document.getElementById('toggle');
var roundsEl = document.getElementById('rounds');

progEl.style.strokeDasharray = CIRC;

function paint() {
  var m = Math.floor(state.left / 60);
  var s = state.left % 60;
  timeEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  modeEl.textContent = state.name;
  var ratio = state.total ? state.left / state.total : 0;
  progEl.style.strokeDashoffset = String(CIRC * (1 - ratio));
  toggleBtn.textContent = state.running ? '暂停' : (state.left === state.total ? '开始' + state.name : '继续');
  document.body.classList.toggle('is-running', state.running);
}

function start() {
  if (state.running) return;
  state.running = true;
  tick = setInterval(function () {
    state.left -= 1;
    if (state.left <= 0) {
      clearInterval(tick);
      state.running = false;
      state.left = 0;
      if (state.name === '专注') state.rounds += 1;
      roundsEl.textContent = state.rounds;
      paint();
      chime();
      return;
    }
    paint();
  }, 1000);
  paint();
}

function stop() {
  state.running = false;
  clearInterval(tick);
  paint();
}

function chime() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = new AC();
    [880, 1174].forEach(function (f, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch (e) {}
}

toggleBtn.addEventListener('click', function () {
  if (state.running) stop(); else start();
});

document.getElementById('reset').addEventListener('click', function () {
  stop();
  state.left = state.total;
  paint();
});

document.querySelectorAll('.modes .chip').forEach(function (chip) {
  chip.addEventListener('click', function () {
    stop();
    document.querySelectorAll('.modes .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
    state.total = Number(chip.dataset.min) * 60;
    state.left = state.total;
    state.name = chip.dataset.name;
    paint();
  });
});

paint();`;

  return wrap('timer', { title: copy.title, summary: '番茄钟：环形进度、周期切换、结束提示音', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 4. 数据看板
 * ------------------------------------------------------------------ */
function dashboardApp(copy) {
  const kpis = [
    { label: '总访问', value: 128420, unit: '', delta: '+12.4%', up: true },
    { label: '转化率', value: 4.86, unit: '%', delta: '+0.7pt', up: true },
    { label: '平均停留', value: 3.2, unit: 'm', delta: '-0.3m', up: false },
    { label: '活跃用户', value: 8930, unit: '', delta: '+8.1%', up: true },
  ];

  const body = `<div class="container dash">
  <header class="top rise">
    <div>
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1 class="title">${copy.title}</h1>
    </div>
    <div class="range" id="range">
      <button class="chip" data-days="7">7 天</button>
      <button class="chip is-active" data-days="30">30 天</button>
      <button class="chip" data-days="90">90 天</button>
    </div>
  </header>

  <section class="kpis rise" style="animation-delay:.05s">
    ${kpis
      .map(
        (k, i) => `<div class="card kpi">
      <span class="kpi-label">${k.label}</span>
      <span class="kpi-value" data-target="${k.value}" data-unit="${k.unit}">0</span>
      <span class="kpi-delta ${k.up ? 'up' : 'down'}">${k.delta}</span>
    </div>`
      )
      .join('\n    ')}
  </section>

  <section class="grid2 rise" style="animation-delay:.1s">
    <div class="card panel">
      <div class="panel-head">
        <h2>访问趋势</h2>
        <span class="muted" id="sumNote">合计 --</span>
      </div>
      <canvas id="line" height="220"></canvas>
    </div>
    <div class="card panel">
      <div class="panel-head"><h2>渠道分布</h2></div>
      <canvas id="bars" height="220"></canvas>
    </div>
  </section>

  <section class="card panel rise" style="animation-delay:.15s">
    <div class="panel-head"><h2>最近 7 天</h2><span class="muted">按日聚合</span></div>
    <table class="table">
      <thead><tr><th>日期</th><th>访问</th><th>注册</th><th>转化</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </section>
</div>`;

  const css = `
.dash{max-width:1040px}
.top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px;flex-wrap:wrap}
.range{display:flex;gap:4px;background:var(--surface);padding:4px;border-radius:999px;border:1px solid var(--border)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
.kpi{padding:16px 18px;display:flex;flex-direction:column;gap:4px}
.kpi-label{font-size:12px;color:var(--muted);font-weight:500}
.kpi-value{font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.kpi-delta{font-size:12px;font-weight:600}
.kpi-delta.up{color:var(--ok)}
.kpi-delta.down{color:var(--danger)}
.grid2{display:grid;grid-template-columns:1.6fr 1fr;gap:12px;margin-bottom:12px}
.panel{padding:18px}
.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.panel-head h2{font-size:14px;font-weight:600}
.panel-head .muted{font-size:12px}
canvas{width:100%;display:block}
.table{width:100%;border-collapse:collapse;font-size:13.5px}
.table th{text-align:left;font-weight:500;color:var(--muted);font-size:12px;padding:8px 6px;border-bottom:1px solid var(--border)}
.table td{padding:10px 6px;border-bottom:1px solid color-mix(in srgb,var(--border) 60%,transparent);font-variant-numeric:tabular-nums}
.table tr:last-child td{border-bottom:0}
.table tr:hover td{background:color-mix(in srgb,var(--surface-2) 60%,transparent)}
@media (max-width:820px){.kpis{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}}
`;

  const js = `var DATA = {
  7:  { series: [820, 932, 901, 934, 1290, 1330, 1320], channels: [420, 310, 260, 180] },
  30: { series: [620, 700, 810, 780, 940, 1020, 980, 1120, 1180, 1240, 1210, 1320, 1400, 1360, 1290, 1420, 1510, 1480, 1620, 1580, 1720, 1800, 1740, 1650, 1790, 1880, 1920, 1860, 1980, 2040], channels: [3400, 2600, 1900, 1200] },
  90: { series: new Array(90).fill(0).map(function (_, i) { return Math.round(700 + i * 16 + Math.sin(i / 3) * 140); }), channels: [9800, 7400, 5200, 3100] }
};
var days = 30;

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function withAlpha(hex, a) {
  var h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function animateNumber(el) {
  var target = parseFloat(el.dataset.target);
  var unit = el.dataset.unit || '';
  var decimals = target % 1 !== 0 ? 2 : 0;
  var start = performance.now();
  var dur = 900;
  function frame(t) {
    var p = Math.min(1, (t - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    var v = target * eased;
    el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('zh-CN')) + unit;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function lineChart() {
  var cv = document.getElementById('line');
  var dpr = window.devicePixelRatio || 1;
  var w = cv.clientWidth, h = 220;
  cv.width = w * dpr; cv.height = h * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  var data = DATA[days].series;
  var pad = { l: 8, r: 8, t: 14, b: 22 };
  var max = Math.max.apply(null, data) * 1.12;
  var min = Math.min.apply(null, data) * 0.85;
  var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;

  ctx.strokeStyle = css('--border');
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var y = pad.t + (ih / 4) * g;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
  }

  function px(i) { return pad.l + (iw * i) / (data.length - 1); }
  function py(v) { return pad.t + ih - ((v - min) / (max - min)) * ih; }

  var accent = css('--accent') || '#6d5ef9';
  var grad = ctx.createLinearGradient(0, pad.t, 0, h);
  grad.addColorStop(0, withAlpha(accent, 0.3));
  grad.addColorStop(1, withAlpha(accent, 0));

  ctx.beginPath();
  ctx.moveTo(px(0), py(data[0]));
  for (var i = 1; i < data.length; i++) {
    var x0 = px(i - 1), y0 = py(data[i - 1]), x1 = px(i), y1 = py(data[i]);
    var cx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
  }
  var stroke = ctx.strokeStyle;
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = accent;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.lineTo(px(data.length - 1), h - pad.b);
  ctx.lineTo(px(0), h - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  var last = data.length - 1;
  ctx.beginPath();
  ctx.arc(px(last), py(data[last]), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = accent;
  ctx.stroke();

  document.getElementById('sumNote').textContent = '合计 ' + data.reduce(function (a, b) { return a + b; }, 0).toLocaleString('zh-CN');
}

function barChart() {
  var cv = document.getElementById('bars');
  var dpr = window.devicePixelRatio || 1;
  var w = cv.clientWidth, h = 220;
  cv.width = w * dpr; cv.height = h * dpr;
  var ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  var data = DATA[days].channels;
  var accent = css('--accent') || '#6d5ef9';
  var labels = ['自然搜索', '社交媒体', '直接访问', '推荐'];
  var colors = [accent, '#22d3ee', '#10b981', '#f59e0b'];
  var max = Math.max.apply(null, data) * 1.15;
  var total = data.reduce(function (a, b) { return a + b; }, 0);
  var pad = { t: 8, b: 30, l: 4, r: 4 };
  var ih = h - pad.t - pad.b;
  var barW = (w - 80) / data.length;

  data.forEach(function (v, i) {
    var bh = (v / max) * ih;
    var x = 8 + i * barW;
    var y = pad.t + ih - bh;
    ctx.fillStyle = colors[i];
    var r = 8;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + barW - 22 - r, y);
    ctx.quadraticCurveTo(x + barW - 22, y, x + barW - 22, y + r);
    ctx.lineTo(x + barW - 22, pad.t + ih);
    ctx.lineTo(x, pad.t + ih);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = css('--muted');
    ctx.font = '11px ' + css('--font');
    ctx.fillText(labels[i], x, h - 10);
    ctx.fillStyle = css('--text');
    ctx.font = '600 11px ' + css('--font');
    ctx.fillText(Math.round((v / total) * 100) + '%', 24 + barW * i + 4, y - 6);
  });
}

function table() {
  var rows = document.getElementById('rows');
  var base = DATA[days].series.slice(-7).reverse();
  var html = '';
  var today = new Date();
  base.forEach(function (v, i) {
    var d = new Date(today.getTime() - i * 86400000);
    var signup = Math.round(v * 0.06);
    html += '<tr><td>' + (d.getMonth() + 1) + '月' + d.getDate() + '日</td><td>' +
      v.toLocaleString('zh-CN') + '</td><td>' + signup + '</td><td>' +
      (v ? ((signup / v) * 100).toFixed(2) : '0.00') + '%</td></tr>';
  });
  rows.innerHTML = html;
}

function render() {
  document.querySelectorAll('.kpi-value').forEach(animateNumber);
  lineChart();
  barChart();
  table();
}

document.getElementById('range').addEventListener('click', function (e) {
  var chip = e.target.closest('[data-days]');
  if (!chip) return;
  days = Number(chip.dataset.days);
  document.querySelectorAll('[data-days]').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
  render();
});

window.addEventListener('resize', function () { lineChart(); barChart(); });
render();`;

  return wrap('dashboard', { title: copy.title, summary: '数据看板：KPI 数字动效 + Canvas 折线/柱状图 + 时间范围切换', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 5. 表单 / 预约
 * ------------------------------------------------------------------ */
function formApp(copy) {
  const body = `<div class="container form-wrap">
  <div class="card form-card rise">
    <div id="formView">
      <p class="eyebrow">${copy.eyebrow}</p>
      <h1 class="title">${copy.title}</h1>
      <p class="muted sub">${copy.sub}</p>

      <form id="form" novalidate>
        <div class="field">
          <label for="name">姓名</label>
          <input class="input" id="name" name="name" placeholder="你的称呼" />
          <span class="err" data-for="name"></span>
        </div>
        <div class="field">
          <label for="email">邮箱</label>
          <input class="input" id="email" name="email" placeholder="you@example.com" />
          <span class="err" data-for="email"></span>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="date">日期</label>
            <input class="input" id="date" name="date" type="date" />
            <span class="err" data-for="date"></span>
          </div>
          <div class="field">
            <label for="guests">人数</label>
            <select class="input" id="guests" name="guests">
              <option value="1">1 人</option>
              <option value="2" selected>2 人</option>
              <option value="3">3 人</option>
              <option value="4">4 人</option>
              <option value="5">5 人以上</option>
            </select>
            <span class="err" data-for="guests"></span>
          </div>
        </div>
        <div class="field">
          <label for="note">备注 <span class="muted">（选填）</span></label>
          <textarea class="input note" id="note" name="note" rows="3" placeholder="有什么需要提前准备的吗？"></textarea>
        </div>
        <button class="btn btn--accent submit" type="submit" id="submitBtn">提交预约</button>
      </form>
    </div>

    <div class="success" id="successView">
      <div class="tick">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h2>预约成功</h2>
      <p class="muted" id="successText"></p>
      <button class="btn" id="again">再提交一份</button>
    </div>
  </div>
</div>`;

  const css = `
.form-wrap{display:grid;place-items:center;min-height:100vh;max-width:520px}
.form-card{padding:32px 30px;width:100%}
.sub{font-size:14px;margin:8px 0 24px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field label{font-size:13px;font-weight:600}
.input,.note{border-radius:var(--radius-sm)}
.note{height:auto;padding:12px 14px;resize:vertical;line-height:1.6}
select.input{appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7a90' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 14px center}
.input.invalid{border-color:var(--danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 12%,transparent)}
.err{font-size:12px;color:var(--danger);min-height:0;opacity:0;transition:opacity .16s}
.err.show{opacity:1}
.submit{width:100%;margin-top:6px;height:46px}
.success{display:none;text-align:center;padding:28px 8px}
.success.show{display:block;animation:rise .4s ease both}
.tick{
  width:64px;height:64px;border-radius:50%;margin:0 auto 18px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--ok),#34d399);
  box-shadow:0 16px 32px -16px rgba(16,185,129,.7);
}
.tick svg{width:28px;height:28px}
.success h2{font-size:20px;margin-bottom:8px}
.success p{font-size:14px;margin-bottom:22px;line-height:1.7}
@media (max-width:480px){.field-row{grid-template-columns:1fr}}
`;

  const js = `var form = document.getElementById('form');
var successView = document.getElementById('successView');
var formView = document.getElementById('formView');

function setError(name, msg) {
  var el = document.querySelector('.err[data-for="' + name + '"]');
  var input = document.getElementById(name);
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('show', Boolean(msg));
  if (input) input.classList.toggle('invalid', Boolean(msg));
}

function validate(data) {
  var ok = true;
  if (!data.name || data.name.trim().length < 2) { setError('name', '请填写至少 2 个字符的姓名'); ok = false; }
  else setError('name', '');

  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(data.email || '')) { setError('email', '邮箱格式不太对，检查一下'); ok = false; }
  else setError('email', '');

  if (!data.date) { setError('date', '请选择日期'); ok = false; }
  else if (new Date(data.date) < new Date(new Date().toDateString())) { setError('date', '日期不能早于今天'); ok = false; }
  else setError('date', '');

  return ok;
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  var fd = new FormData(form);
  var data = {
    name: (fd.get('name') || '').toString(),
    email: (fd.get('email') || '').toString(),
    date: (fd.get('date') || '').toString(),
    guests: (fd.get('guests') || '').toString(),
    note: (fd.get('note') || '').toString()
  };

  if (!validate(data)) return;

  var btn = document.getElementById('submitBtn');
  btn.textContent = '提交中…';
  btn.style.opacity = '.7';

  setTimeout(function () {
    btn.textContent = '提交预约';
    btn.style.opacity = '1';
    formView.style.display = 'none';
    successView.classList.add('show');
    document.getElementById('successText').textContent =
      data.name + '，已为你锁定 ' + data.date + ' 的 ' + data.guests + ' 人名额，确认邮件将发送至 ' + data.email + '。';
  }, 650);
});

['name', 'email', 'date'].forEach(function (name) {
  var el = document.getElementById(name);
  if (!el) return;
  el.addEventListener('input', function () { setError(name, ''); });
});

document.getElementById('again').addEventListener('click', function () {
  form.reset();
  successView.classList.remove('show');
  formView.style.display = 'block';
  ['name', 'email', 'date'].forEach(function (n) { setError(n, ''); });
});`;

  return wrap('form', { title: copy.title, summary: '预约表单：逐字段校验、错误态、提交成功页', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 6. 落地页
 * ------------------------------------------------------------------ */
function landingApp(copy) {
  const features = [
    { icon: '⚡', title: '分钟级上线', desc: '从一句话需求到可访问的页面，不用等排期，也不用写脚手架。' },
    { icon: '🧩', title: '组件即代码', desc: '生成的每个区块都是干净的三件套，随时能接进你自己的技术栈。' },
    { icon: '🛡️', title: '沙箱预览', desc: '预览运行在隔离环境中，未经验证的代码不会碰到你的数据。' },
  ];

  const body = `<nav class="nav">
  <div class="nav-inner">
    <div class="logo"><span class="dot"></span>${copy.brand}</div>
    <div class="links">
      <a href="#features">能力</a>
      <a href="#pricing">价格</a>
      <a href="#faq">常见问题</a>
    </div>
    <button class="btn btn--accent sm" id="ctaTop">免费开始</button>
  </div>
</nav>

<header class="hero">
  <div class="hero-glow"></div>
  <p class="eyebrow rise">${copy.eyebrow}</p>
  <h1 class="hero-title rise" style="animation-delay:.05s">${copy.headline}</h1>
  <p class="hero-sub rise" style="animation-delay:.1s">${copy.sub}</p>
  <div class="hero-actions rise" style="animation-delay:.15s">
    <button class="btn btn--accent" id="ctaHero">立即体验</button>
    <button class="btn" id="ctaDemo">看 60 秒演示</button>
  </div>
  <p class="hero-note muted" id="note">无需信用卡 · 3 分钟上手 · 随时导出代码</p>

  <div class="shot rise" style="animation-delay:.2s">
    <div class="shot-bar"><i></i><i></i><i></i></div>
    <div class="shot-body">
      <div class="skel w40"></div>
      <div class="skel w70"></div>
      <div class="skel-row"><div class="skel box"></div><div class="skel box"></div><div class="skel box"></div></div>
      <div class="skel w55"></div>
    </div>
  </div>
</header>

<section class="section" id="features">
  <h2 class="section-title">把想法变成产品，只要三步</h2>
  <div class="cards">
    ${features
      .map(
        (f) => `<article class="card feature reveal">
      <span class="fi">${f.icon}</span>
      <h3>${f.title}</h3>
      <p class="muted">${f.desc}</p>
    </article>`
      )
      .join('\n    ')}
  </div>
</section>

<section class="section" id="pricing">
  <h2 class="section-title">按需选择</h2>
  <div class="prices">
    <article class="card price reveal">
      <h3>个人</h3>
      <p class="amount">¥0<span>/月</span></p>
      <ul><li>每月 20 次生成</li><li>导出源码</li><li>社区支持</li></ul>
      <button class="btn" data-plan="个人版">免费开始</button>
    </article>
    <article class="card price popular reveal">
      <span class="tag">最受欢迎</span>
      <h3>专业</h3>
      <p class="amount">¥89<span>/月</span></p>
      <ul><li>无限生成</li><li>私有项目</li><li>自定义域名</li><li>优先队列</li></ul>
      <button class="btn btn--accent" data-plan="专业版">开始 14 天试用</button>
    </article>
    <article class="card price reveal">
      <h3>团队</h3>
      <p class="amount">¥299<span>/月</span></p>
      <ul><li>包含专业版全部</li><li>协作与评审</li><li>SSO / 审计日志</li></ul>
      <button class="btn" data-plan="团队版">联系销售</button>
    </article>
  </div>
</section>

<footer class="foot">
  <span>© 2026 ${copy.brand}</span>
  <span class="muted">用 AtomLab 生成 · 纯静态三件套</span>
</footer>`;

  const css = `
body{background:
  radial-gradient(1000px 520px at 50% -180px, color-mix(in srgb,var(--accent) 16%,transparent), transparent 70%),
  var(--bg);}
.nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(14px);background:color-mix(in srgb,var(--surface) 78%,transparent);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1040px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;gap:24px}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:-.01em}
.dot{width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,var(--accent),#22d3ee);display:inline-block}
.links{display:flex;gap:20px;margin-left:auto}
.links a{font-size:14px;color:var(--muted);text-decoration:none;transition:color .16s}
.links a:hover{color:var(--text)}
.btn.sm{height:36px;padding:0 14px;font-size:13px}
.hero{max-width:820px;margin:0 auto;padding:76px 24px 40px;text-align:center;position:relative}
.hero-glow{position:absolute;inset:-40px 0 auto;height:320px;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 14%,transparent),transparent);pointer-events:none}
.hero-title{font-size:clamp(32px,5.2vw,52px);line-height:1.12;letter-spacing:-.03em;font-weight:800;margin-bottom:18px}
.hero-title em{font-style:normal;background:linear-gradient(120deg,var(--accent),#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-sub{font-size:17px;color:var(--muted);max-width:560px;margin:0 auto 28px;line-height:1.7}
.hero-actions{display:flex;gap:10px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
.hero-note{font-size:12.5px}
.shot{max-width:760px;margin:44px auto 0;border-radius:18px;background:var(--surface);border:1px solid var(--border);box-shadow:0 40px 80px -40px rgba(14,23,38,.35);overflow:hidden}
.shot-bar{display:flex;gap:6px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2)}
.shot-bar i{width:9px;height:9px;border-radius:50%;background:color-mix(in srgb,var(--muted) 35%,transparent)}
.shot-body{padding:22px;display:flex;flex-direction:column;gap:12px;align-items:center}
.skel{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--surface-2),color-mix(in srgb,var(--accent) 8%,var(--surface-2)));}
.skel.w40{width:40%}.skel.w70{width:70%}.skel.w55{width:55%}
.skel-row{display:flex;gap:12px;width:100%;margin:6px 0}
.skel.box{flex:1;height:78px;border-radius:12px}
.section{max-width:1040px;margin:0 auto;padding:56px 24px}
.section-title{font-size:clamp(22px,3vw,30px);letter-spacing:-.02em;text-align:center;margin-bottom:32px;font-weight:700}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.feature{padding:24px}
.fi{font-size:22px;display:inline-grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--accent-soft);margin-bottom:14px}
.feature h3{font-size:16px;margin-bottom:8px}
.feature p{font-size:13.5px;line-height:1.65}
.prices{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:start}
.price{padding:26px 22px;position:relative;display:flex;flex-direction:column;gap:14px}
.price.popular{border-color:color-mix(in srgb,var(--accent) 40%,var(--border));box-shadow:0 24px 50px -30px color-mix(in srgb,var(--accent) 60%,transparent)}
.tag{position:absolute;top:-11px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:600;color:#fff;background:linear-gradient(135deg,var(--accent),#22d3ee);padding:3px 10px;border-radius:999px}
.price h3{font-size:14px;color:var(--muted);font-weight:600}
.amount{font-size:32px;font-weight:800;letter-spacing:-.03em}
.amount span{font-size:13px;font-weight:500;color:var(--muted)}
.price ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:13.5px;color:var(--muted)}
.price li::before{content:"✓";color:var(--ok);font-weight:700;margin-right:8px}
.price .btn{width:100%;margin-top:auto}
.foot{max-width:1040px;margin:0 auto;padding:32px 24px 48px;display:flex;justify-content:space-between;font-size:12.5px;border-top:1px solid var(--border)}
.reveal{opacity:0;transform:translateY(16px);transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1)}
.reveal.in{opacity:1;transform:none}
@media (max-width:820px){.cards,.prices{grid-template-columns:1fr}.links{display:none}}
`;

  const js = `var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (en) {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(function (el, i) {
  el.style.transitionDelay = (i % 3) * 60 + 'ms';
  io.observe(el);
});

function toast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);' +
    'background:#0e1726;color:#fff;font-size:13px;padding:10px 16px;border-radius:10px;' +
    'opacity:0;transition:all .28s cubic-bezier(.22,1,.36,1);z-index:50;box-shadow:0 12px 30px -12px rgba(0,0,0,.5)';
  document.body.appendChild(t);
  requestAnimationFrame(function () {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(function () {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(function () { t.remove(); }, 300);
  }, 1800);
}

document.getElementById('ctaHero').addEventListener('click', function () { toast('演示环境：这里会跳转到注册流程'); });
document.getElementById('ctaTop').addEventListener('click', function () { toast('演示环境：这里会跳转到注册流程'); });
document.getElementById('ctaDemo').addEventListener('click', function () {
  document.getElementById('note').textContent = '正在播放演示…（占位交互）';
});

document.querySelectorAll('[data-plan]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    toast('已选择「' + btn.dataset.plan + '」');
  });
});`;

  return wrap('landing', { title: copy.brand, summary: '产品落地页：Hero / 特性 / 三档定价 / 滚动揭示', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 7. 记事本
 * ------------------------------------------------------------------ */
function notesApp(copy) {
  const body = `<div class="app">
  <aside class="side">
    <div class="side-head">
      <h1 class="logo-note">${copy.title}</h1>
      <button class="btn btn--accent sm" id="new">新建</button>
    </div>
    <input class="input search" id="search" placeholder="搜索笔记…" />
    <ul class="notes" id="notes"></ul>
  </aside>
  <main class="editor">
    <div class="editor-head">
      <input class="title-input" id="title" placeholder="无标题" />
      <div class="meta">
        <span class="muted" id="meta">—</span>
        <button class="btn btn--ghost sm" id="del">删除</button>
      </div>
    </div>
    <textarea class="body-input" id="body" placeholder="开始写点什么…"></textarea>
    <div class="empty" id="editorEmpty">
      <p class="muted">从左侧选择一篇笔记，或新建一篇</p>
    </div>
  </main>
</div>`;

  const css = `
body{background:var(--bg);overflow:hidden}
.app{display:grid;grid-template-columns:290px 1fr;height:100vh}
.side{border-right:1px solid var(--border);background:var(--surface);display:flex;flex-direction:column;padding:18px 14px;gap:12px}
.side-head{display:flex;align-items:center;justify-content:space-between}
.logo-note{font-size:15px;font-weight:700;letter-spacing:-.01em}
.btn.sm{height:34px;padding:0 12px;font-size:13px}
.search{height:38px;font-size:13.5px}
.notes{list-style:none;margin:0;padding:0;overflow-y:auto;display:grid;gap:4px;flex:1;align-content:start;grid-auto-rows:min-content}
.note-item{padding:11px 12px;border-radius:10px;cursor:pointer;transition:background .14s}
.note-item:hover{background:var(--surface-2)}
.note-item.is-active{background:var(--accent-soft)}
.note-item h3{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
.note-item p{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.editor{display:flex;flex-direction:column;padding:26px 32px;position:relative;overflow:hidden}
.editor-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}
.title-input{font-size:24px;font-weight:700;letter-spacing:-.02em;border:0;background:transparent;outline:none;padding:4px 0;flex:1;min-width:0}
.meta{display:flex;align-items:center;gap:10px;font-size:12px;flex:0 0 auto}
.body-input{flex:1;border:0;background:transparent;outline:none;resize:none;font-size:15px;line-height:1.75;padding:8px 0}
.empty{position:absolute;inset:0;display:none;place-items:center;background:var(--bg)}
.empty.show{display:grid}
@media (max-width:680px){.app{grid-template-columns:1fr}.side{display:none}}
`;

  const js = `var NOTES = [
  { id: 1, title: 'Atoms Demo 思路', body: '1. 左侧对话驱动生成\\n2. 右侧沙箱实时预览\\n3. 生成过程要可见：计划 → 写码 → 自检', updated: Date.now() - 3600e3 },
  { id: 2, title: '可以延伸的点', body: '· 多轮修改（增量 patch）\\n· 版本回滚\\n· 导出 zip 部署', updated: Date.now() - 86400e3 }
];
var seq = 3;
var activeId = 1;
var keyword = '';

var notesEl = document.getElementById('notes');
var titleEl = document.getElementById('title');
var bodyEl = document.getElementById('body');
var metaEl = document.getElementById('meta');
var editorEmpty = document.getElementById('editorEmpty');

function visible() {
  return NOTES.filter(function (n) {
    if (!keyword) return true;
    return (n.title + n.body).toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
  }).sort(function (a, b) { return b.updated - a.updated; });
}

function ago(ts) {
  var d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return '刚刚';
  if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
  if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
  return Math.floor(d / 86400) + ' 天前';
}

function renderList() {
  var list = visible();
  notesEl.innerHTML = list.map(function (n) {
    return '<li class="note-item' + (n.id === activeId ? ' is-active' : '') + '" data-id="' + n.id + '">' +
      '<h3>' + escapeHtml(n.title || '无标题') + '</h3>' +
      '<p>' + escapeHtml(n.body.slice(0, 40) || '空白笔记') + '</p>' +
    '</li>';
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function load(id) {
  var n = NOTES.find(function (x) { return x.id === id; });
  var has = Boolean(n);
  editorEmpty.classList.toggle('show', !has);
  titleEl.disabled = bodyEl.disabled = !has;
  titleEl.value = has ? n.title : '';
  bodyEl.value = has ? n.body : '';
  metaEl.textContent = has ? '编辑于 ' + ago(n.updated) + ' · ' + n.body.length + ' 字' : '—';
  activeId = id;
  renderList();
}

notesEl.addEventListener('click', function (e) {
  var li = e.target.closest('.note-item');
  if (li) load(Number(li.dataset.id));
});

function touch() {
  var n = NOTES.find(function (x) { return x.id === activeId; });
  if (!n) return;
  n.title = titleEl.value;
  n.body = bodyEl.value;
  n.updated = Date.now();
  metaEl.textContent = '编辑于 刚刚 · ' + n.body.length + ' 字';
  renderList();
}

titleEl.addEventListener('input', touch);
bodyEl.addEventListener('input', touch);

document.getElementById('new').addEventListener('click', function () {
  var n = { id: seq++, title: '', body: '', updated: Date.now() };
  NOTES.push(n);
  load(n.id);
  titleEl.focus();
});

document.getElementById('del').addEventListener('click', function () {
  var n = NOTES.find(function (x) { return x.id === activeId; });
  if (!n) return;
  NOTES = NOTES.filter(function (x) { return x.id !== activeId; });
  load(NOTES.length ? NOTES[0].id : -1);
});

document.getElementById('search').addEventListener('input', function (e) {
  keyword = e.target.value.trim();
  renderList();
});

load(1);`;

  return wrap('notes', { title: copy.title, summary: '记事本：列表 / 搜索 / 自动保存状态 / 空态', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 8. 通用兜底：需求无法归类时，生成一个「像成品」的通用应用
 * ------------------------------------------------------------------ */
function genericApp(copy) {
  const body = `<nav class="nav">
  <div class="nav-inner">
    <div class="logo"><span class="dot"></span>${copy.brand}</div>
    <span class="badge">由 AtomLab 生成</span>
  </div>
</nav>

<main class="container">
  <header class="hero rise">
    <p class="eyebrow">${copy.eyebrow}</p>
    <h1 class="title big">${copy.title}</h1>
    <p class="sub muted">${copy.sub}</p>
    <div class="hero-actions">
      <button class="btn btn--accent" id="primary">开始使用</button>
      <button class="btn" id="secondary">了解更多</button>
    </div>
  </header>

  <section class="grid rise" style="animation-delay:.08s">
    <article class="card cell">
      <span class="ico">①</span>
      <h3>输入需求</h3>
      <p class="muted">用自然语言描述你想要的东西，越具体越好。</p>
    </article>
    <article class="card cell">
      <span class="ico">②</span>
      <h3>实时生成</h3>
      <p class="muted">生成过程可见：先出计划，再逐行写码，最后自检。</p>
    </article>
    <article class="card cell">
      <span class="ico">③</span>
      <h3>即刻预览</h3>
      <p class="muted">右侧沙箱即时渲染，改一版立刻看到效果。</p>
    </article>
  </section>

  <section class="card demo rise" style="animation-delay:.16s">
    <div class="demo-head">
      <h2>交互演示</h2>
      <span class="muted" id="demoHint">点一下试试</span>
    </div>
    <div class="demo-body">
      <div class="counter">
        <button class="btn" id="minus">−</button>
        <span class="num" id="num">0</span>
        <button class="btn" id="plus">+</button>
      </div>
      <div class="meter"><div class="meter-fill" id="meter"></div></div>
      <p class="muted small" id="caption">当前值 0</p>
    </div>
  </section>
</main>

<footer class="foot">
  <span class="muted">这是一个由 Agent 生成的可交互页面原型</span>
</footer>`;

  const css = `
.nav{border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:10}
.nav-inner{max-width:960px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:8px;font-weight:700}
.dot{width:16px;height:16px;border-radius:5px;background:linear-gradient(135deg,var(--accent),#22d3ee)}
.badge{font-size:11.5px;color:var(--muted);border:1px solid var(--border);padding:3px 10px;border-radius:999px}
.hero{padding:56px 0 40px;max-width:680px}
.title.big{font-size:clamp(28px,4.4vw,42px);line-height:1.16;letter-spacing:-.03em;font-weight:800}
.sub{font-size:16px;margin:16px 0 26px;line-height:1.7}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.cell{padding:22px}
.ico{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent);font-weight:700;margin-bottom:12px}
.cell h3{font-size:15px;margin-bottom:6px}
.cell p{font-size:13.5px;line-height:1.65}
.demo{padding:22px;margin-bottom:40px}
.demo-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.demo-head h2{font-size:15px}
.demo-head .muted{font-size:12px}
.demo-body{display:grid;gap:16px}
.counter{display:flex;align-items:center;gap:18px}
.counter .btn{width:44px;height:44px;padding:0;font-size:18px}
.num{font-size:34px;font-weight:700;min-width:64px;text-align:center;font-variant-numeric:tabular-nums}
.meter{height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden}
.meter-fill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--accent),#22d3ee);transition:width .3s cubic-bezier(.22,1,.36,1)}
.small{font-size:12.5px}
.foot{max-width:960px;margin:0 auto;padding:24px;border-top:1px solid var(--border);font-size:12.5px}
@media (max-width:720px){.grid{grid-template-columns:1fr}}
`;

  const js = `var value = 0;
var numEl = document.getElementById('num');
var meterEl = document.getElementById('meter');
var captionEl = document.getElementById('caption');

function paint() {
  numEl.textContent = value;
  meterEl.style.width = Math.max(0, Math.min(100, value * 10)) + '%';
  captionEl.textContent = '当前值 ' + value;
}

document.getElementById('plus').addEventListener('click', function () { value++; paint(); });
document.getElementById('minus').addEventListener('click', function () { value--; paint(); });
document.getElementById('primary').addEventListener('click', function () {
  value += 5;
  paint();
  document.getElementById('demoHint').textContent = '+5 ✓';
});
document.getElementById('secondary').addEventListener('click', function () {
  document.getElementById('demoHint').textContent = '这是生成器给的示例交互';
});

paint();`;

  return wrap('generic', { title: copy.title, summary: '通用页面：Hero + 三卡 + 可交互演示模块', body, css, js });
}

/* ------------------------------------------------------------------ *
 * 文案：按需求关键词做轻量「拟人化」，让生成结果不像模板
 * ------------------------------------------------------------------ */
function copyFor(kind, prompt) {
  const topic = extractTopic(prompt);
  const base = {
    todo: {
      eyebrow: 'Today',
      title: topic || '任务清单',
      sub: '今天要完成的事，一条条划掉。',
      placeholder: '添加一个任务，回车确认…',
    },
    timer: { eyebrow: 'Focus', title: topic || '专注计时', sub: '' },
    dashboard: { eyebrow: 'Analytics', title: topic || '数据看板', sub: '' },
    form: { eyebrow: 'Booking', title: topic || '预约登记', sub: '填写信息，我们会在 24 小时内与你确认。' },
    landing: {
      brand: topic || 'Nova',
      eyebrow: 'AI 驱动的产品工作室',
      headline: '把一句话的想法，<em>变成能用的产品</em>',
      sub: '描述你要什么，Agent 负责拆解、写码、自检并渲染出可运行的页面。没有排期，没有脚手架。',
    },
    notes: { title: topic || '灵感速记', sub: '' },
    generic: {
      brand: topic || 'Nova',
      eyebrow: 'Agent Generated',
      title: topic || '你的应用原型',
      sub: '这是根据你的描述生成的可交互页面。继续对话即可迭代。',
    },
  }[kind];
  return base;
}

/** 从需求里抽一个像标题的短语，避免生成物标题全是「任务清单」 */
function extractTopic(prompt) {
  const quoted = prompt.match(/[「"“'']([^」"“'']{2,14})[」"”'']/);
  if (quoted) return quoted[1];
  const named = prompt.match(/(?:叫|名为|名字是|命名为)\s*([^\s，,。的]{2,14})/);
  if (named) return named[1];
  return '';
}

/* ------------------------------------------------------------------ */
export const GENERATORS = {
  todo: todoApp,
  calculator: calculatorApp,
  timer: timerApp,
  dashboard: dashboardApp,
  form: formApp,
  landing: landingApp,
  notes: notesApp,
  generic: genericApp,
};

export function build(kind, prompt) {
  const gen = GENERATORS[kind] || GENERATORS.generic;
  const copy = copyFor(kind, prompt);
  return gen(copy);
}
