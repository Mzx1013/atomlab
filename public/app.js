/**
 * AtomLab 前端控制器
 *  - 通过 SSE 消费 Agent 的流式事件（plan / file / token / check / done）
 *  - 边流边渲染：把三个文件「微打包」成单文件注入 sandbox iframe
 *  - 版本快照、代码高亮、导出
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORE_KEY = 'atomlab.session.v1';

const state = {
  files: {},
  versions: [],
  history: [],
  activeFile: 'index.html',
  deviceWidth: '100%',
  running: false,
  chars: 0,
  startedAt: 0,
  provider: 'local',
};

/* ---------------------------------------------------------------- *
 * 微打包：把 index.html + style.css + app.js 合成一份可注入的文档
 * ---------------------------------------------------------------- */
function bundle(files) {
  let html = files['index.html'] || '';
  const css = files['style.css'] || '';
  const js = files['app.js'] || '';
  if (!html) return '';

  let injected = false;
  html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, () => {
    injected = true;
    return `<style>\n${css}\n</style>`;
  });
  if (!injected && css) {
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`)
      : html + `\n<style>\n${css}\n</style>`;
  }

  let scripted = false;
  html = html.replace(/<script[^>]*src=["']app\.js["'][^>]*>\s*<\/script>/i, () => {
    scripted = true;
    return `<script>\n${js}\n</script>`;
  });
  if (!scripted && js) {
    html = html.replace(/<\/body>/i, `<script>\n${js}\n</script>\n</body>`);
  }
  return html;
}

/* ---------------------------------------------------------------- *
 * 预览渲染
 * ---------------------------------------------------------------- */
const preview = $('#preview');
const emptyStage = $('#emptyStage');
let renderTimer = null;
let lastRender = 0;

function renderPreview({ force = false } = {}) {
  const html = bundle(state.files);
  if (!html) {
    preview.classList.remove('is-visible');
    emptyStage.classList.remove('is-hidden');
    return;
  }
  // 流式期间节流 + 等 <head> 成型，避免白屏闪烁
  const ready = /<\/head>/i.test(html) || force;
  if (!ready) return;

  const now = performance.now();
  if (!force && now - lastRender < 220) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderPreview(), 220);
    return;
  }
  lastRender = now;
  preview.srcdoc = html;
  preview.classList.add('is-visible');
  emptyStage.classList.add('is-hidden');
}

function applyDevice(width) {
  state.deviceWidth = width;
  preview.style.width = width;
  $$('#devices button').forEach((b) => b.classList.toggle('is-active', b.dataset.width === width));
}

/* ---------------------------------------------------------------- *
 * 代码高亮（先转义再单遍替换，避免二次污染）
 * ---------------------------------------------------------------- */
const escHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const RULES = {
  html: /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([a-zA-Z][\w:-]*)|("[^"]*")/g,
  css: /(\/\*[\s\S]*?\*\/)|(#[0-9a-fA-F]{3,8}\b)|(--[\w-]+)|([a-zA-Z-]+)(?=\s*:)/g,
  js: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('[^'\n]*'|"[^"\n]*")|\b(function|var|let|const|return|if|else|for|while|new|typeof|this|true|false|null|undefined|document|window|addEventListener|querySelector|forEach|function)\b|\b(\d+(?:\.\d+)?)\b/g,
};

function highlight(code, lang) {
  const s = escHtml(code);
  const rule = RULES[lang];
  if (!rule) return s;
  return s.replace(rule, (m, a, b, c, d, e) => {
    if (lang === 'html') {
      if (a) return `<span class="t-com">${a}</span>`;
      if (b) return `<span class="t-punc">${b}</span><span class="t-tag">${c}</span>`;
      if (d) return `<span class="t-str">${d}</span>`;
      return m;
    }
    if (lang === 'css') {
      if (a) return `<span class="t-com">${a}</span>`;
      if (b) return `<span class="t-hex">${b}</span>`;
      if (c) return `<span class="t-key">${c}</span>`;
      if (d) return `<span class="t-prop">${d}</span>`;
      return m;
    }
    if (a) return `<span class="t-com">${a}</span>`;
    if (b) return `<span class="t-str">${b}</span>`;
    if (c) return `<span class="t-key">${c}</span>`;
    if (d) return `<span class="t-num">${d}</span>`;
    return m;
  });
}

function langOf(path) {
  return path.endsWith('.css') ? 'css' : path.endsWith('.js') ? 'js' : 'html';
}

function renderCode() {
  const tabs = $('#fileTabs');
  const paths = ['index.html', 'style.css', 'app.js'].filter((p) => state.files[p]);
  tabs.innerHTML = paths
    .map(
      (p) =>
        `<button class="file-tab${p === state.activeFile ? ' is-active' : ''}" data-file="${p}" type="button">${p}</button>`
    )
    .join('');
  const code = state.files[state.activeFile] || '';
  const el = $('#code');
  el.innerHTML = highlight(code, langOf(state.activeFile));
  $('#btnCopy').disabled = !code;
}

/* ---------------------------------------------------------------- *
 * 版本
 * ---------------------------------------------------------------- */
function pushVersion(label) {
  const snapshot = { ...state.files };
  state.versions.push({
    id: state.versions.length + 1,
    label: label || '初始版本',
    files: snapshot,
    at: Date.now(),
    chars: Object.values(snapshot).join('').length,
  });
  renderHistory();
  persist();
}

function renderHistory() {
  const list = $('#history');
  $('#versionCount').textContent = String(state.versions.length);
  if (!state.versions.length) {
    list.innerHTML = '<li class="history-empty">还没有版本。生成第一次后会记录在这里。</li>';
    return;
  }
  list.innerHTML = state.versions
    .slice()
    .reverse()
    .map((v, i) => {
      const isCurrent = i === 0;
      const t = new Date(v.at);
      const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
      return `<li class="ver${isCurrent ? ' is-current' : ''}" data-id="${v.id}">
        <span class="ver-idx">v${v.id}</span>
        <div class="ver-body">
          <div class="ver-label">${escapeText(v.label)}</div>
          <div class="ver-meta">${time} · ${v.chars} 字符</div>
        </div>
        ${isCurrent ? '' : '<button class="ver-btn" data-restore="' + v.id + '" type="button">回滚</button>'}
      </li>`;
    })
    .join('');
}

const escapeText = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------------------------------------------------------- *
 * 对话渲染
 * ---------------------------------------------------------------- */
const thread = $('#thread');

function scrollToBottom(force = false) {
  const near = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 160;
  if (force || near) thread.scrollTop = thread.scrollHeight;
}

function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'msg-user';
  el.textContent = text;
  thread.appendChild(el);
  scrollToBottom(true);
}

function createTurn() {
  const el = document.createElement('div');
  el.className = 'turn';
  el.innerHTML = `
    <div class="turn-head">
      <span class="turn-avatar">A</span>
      <span class="turn-title">AtomLab Agent</span>
      <span class="turn-status" data-role="status">工作中…</span>
    </div>
    <div class="plan" data-role="plan"></div>
    <div class="steps" data-role="steps"></div>
    <div class="checks" data-role="checks"></div>
    <div data-role="extras"></div>
  `;
  thread.appendChild(el);
  scrollToBottom(true);
  return {
    el,
    plan: $('[data-role="plan"]', el),
    steps: $('[data-role="steps"]', el),
    checks: $('[data-role="checks"]', el),
    extras: $('[data-role="extras"]', el),
    status: $('[data-role="status"]', el),
    stepRows: new Map(),
    fileRows: new Map(),
    planText: '',
    summary: '',
  };
}

function setStep(turn, { id, title, status, meta }) {
  let row = turn.stepRows.get(id);
  if (!row) {
    row = document.createElement('div');
    row.className = 'step is-running';
    row.innerHTML = `<span class="step-icon"></span><span class="step-name">${escapeText(title || '')}</span><span class="step-meta"></span>`;
    turn.steps.appendChild(row);
    turn.stepRows.set(id, row);
  }
  if (title) row.querySelector('.step-name').textContent = title;
  if (status === 'done') {
    row.classList.remove('is-running');
    row.classList.add('is-done');
    row.querySelector('.step-icon').innerHTML = '';
    row.querySelector('.step-meta').textContent = meta && meta.total ? `${meta.passed}/${meta.total} 通过` : '';
  }
  scrollToBottom();
}

function appendPlan(turn, text) {
  turn.planText += text;
  turn.plan.innerHTML = escapeText(turn.planText) + '<span class="caret"></span>';
  scrollToBottom();
}

function finishPlan(turn) {
  turn.plan.innerHTML = escapeText(turn.planText);
}

function startFile(turn, path) {
  let row = turn.fileRows.get(path);
  if (!row) {
    row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `<span class="fname">${escapeText(path)}</span><span class="fbar"><i></i></span><span class="fsize">0</span>`;
    turn.steps.appendChild(row);
    turn.fileRows.set(path, row);
  }
  row._bytes = 0;
  scrollToBottom();
}

function appendFile(turn, path, text) {
  startFile(turn, path);
  const row = turn.fileRows.get(path);
  row._bytes += text.length;
  row.querySelector('.fsize').textContent = String(row._bytes);
  const total = state.files[path] ? state.files[path].length + 2400 : row._bytes + 2400;
  row.querySelector('.fbar i').style.width = Math.min(96, (row._bytes / total) * 100) + '%';
  scrollToBottom();
}

function endFile(turn, path) {
  const row = turn.fileRows.get(path);
  if (!row) return;
  row.classList.add('is-done');
  row.querySelector('.fbar i').style.width = '100%';
  const size = (state.files[path] || '').length;
  row.querySelector('.fsize').textContent = size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}K`;
}

function addCheck(turn, { label, pass }) {
  const row = document.createElement('div');
  row.className = 'check' + (pass ? '' : ' bad');
  row.innerHTML = `<span class="cdot"></span><span>${escapeText(label)}</span>${pass ? '' : '<span style="margin-left:6px;opacity:.7">未通过</span>'}`;
  turn.checks.appendChild(row);
  scrollToBottom();
}

function addNotice(turn, { title, body }) {
  const el = document.createElement('div');
  el.className = 'notice';
  el.innerHTML = `<strong>${escapeText(title || '提示')}</strong>${escapeText(body || '')}`;
  turn.extras.appendChild(el);
  scrollToBottom();
}

/* ---------------------------------------------------------------- *
 * SSE 消费
 * ---------------------------------------------------------------- */
function parseSSEChunk(raw) {
  const events = [];
  for (const block of raw.split('\n\n')) {
    if (!block.trim()) continue;
    let name = 'message';
    const dataLines = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) continue;
    try {
      events.push({ name, data: JSON.parse(dataLines.join('\n')) });
    } catch {
      /* 忽略心跳/坏帧 */
    }
  }
  return events;
}

async function runAgent(prompt) {
  const turn = createTurn();
  const startedAt = performance.now();
  state.startedAt = startedAt;
  state.chars = 0;

  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      files: Object.keys(state.files).length ? state.files : null,
      history: state.history,
    }),
  });

  if (!res.ok || !res.body) throw new Error(`请求失败：HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let sawError = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const idx = buf.lastIndexOf('\n\n');
    if (idx === -1) continue;
    const ready = buf.slice(0, idx + 2);
    buf = buf.slice(idx + 2);

    for (const { name, data } of parseSSEChunk(ready)) {
      if (name === 'step') {
        setStep(turn, data);
        if (data.id === 'plan' && data.status === 'done') finishPlan(turn);
      } else if (name === 'token') {
        if (data.stepId === 'plan') {
          appendPlan(turn, data.text);
        } else if (data.path) {
          state.files[data.path] = (state.files[data.path] || '') + data.text;
          appendFile(turn, data.path, data.text);
          state.chars = Object.values(state.files).join('').length;
          updateStatus();
          renderPreview();
        }
      } else if (name === 'file') {
        if (data.status === 'start') startFile(turn, data.path);
        else endFile(turn, data.path);
      } else if (name === 'check') {
        addCheck(turn, data);
      } else if (name === 'notice') {
        addNotice(turn, data);
      } else if (name === 'summary') {
        turn.summary = data.text || '';
      } else if (name === 'error') {
        sawError = data.message;
      }
    }
  }

  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
  const fileCount = Object.keys(state.files).length;

  if (sawError) {
    turn.el.classList.add('is-error');
    turn.status.textContent = '失败';
    addNotice(turn, { title: '生成中断', body: sawError });
  } else {
    turn.status.textContent = `${elapsed}s`;
    if (fileCount) pushVersion(turn.summary || `生成：${prompt.slice(0, 24)}`);
    const foot = document.createElement('div');
    foot.className = 'turn-foot';
    foot.innerHTML =
      `<span>${elapsed}s</span><span class="dot-sep"></span>` +
      `<span>${fileCount} 个文件</span><span class="dot-sep"></span>` +
      `<span>${Object.values(state.files).join('').length} 字符</span><span class="dot-sep"></span>` +
      `<span>${state.provider === 'llm' ? 'LLM' : '本地引擎'}</span>`;
    turn.extras.appendChild(foot);
  }

  renderPreview({ force: true });
  renderCode();
  updateStatus();
  scrollToBottom();
  return { sawError };
}

/* ---------------------------------------------------------------- *
 * 状态栏
 * ---------------------------------------------------------------- */
function updateStatus() {
  const chars = Object.values(state.files).join('').length;
  $('#statChars').textContent = `${chars.toLocaleString('zh-CN')} 字符`;
  if (state.running && state.startedAt) {
    const s = (performance.now() - state.startedAt) / 1000;
    $('#statTime').textContent = `${s.toFixed(1)}s`;
  }
}

function setBusy(busy, text) {
  state.running = busy;
  $('#send').disabled = busy;
  $('#prompt').disabled = busy;
  $('#statusText').textContent = text || (busy ? '生成中…' : '就绪');
  $('#statusText').classList.toggle('is-busy', Boolean(busy));
}

/* ---------------------------------------------------------------- *
 * 提交
 * ---------------------------------------------------------------- */
async function submit(promptText) {
  const text = (promptText ?? $('#prompt').value).trim();
  if (!text || state.running) return;

  $('#welcome')?.remove();
  addUserMessage(text);
  $('#prompt').value = '';
  autoGrow($('#prompt'));
  setBusy(true, '生成中…');

  const timer = setInterval(updateStatus, 100);
  try {
    const { sawError } = await runAgent(text);
    state.history.push({ role: 'user', content: text });
    if (!sawError) {
      state.history.push({ role: 'assistant', content: Object.values(state.files).join('\n').slice(0, 1500) });
    }
    persist();
  } catch (err) {
    const el = document.createElement('div');
    el.className = 'turn is-error';
    el.innerHTML = `<div class="turn-head"><span class="turn-avatar">A</span><span class="turn-title">连接失败</span></div>
      <div class="notice"><strong>无法连接生成服务</strong>${escapeText(String(err.message || err))}</div>`;
    thread.appendChild(el);
    scrollToBottom(true);
  } finally {
    clearInterval(timer);
    setBusy(false);
    $('#btnExport').disabled = Object.keys(state.files).length === 0;
    $('#prompt').focus();
  }
}

/* ---------------------------------------------------------------- *
 * 交互绑定
 * ---------------------------------------------------------------- */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 132) + 'px';
}

$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  submit();
});

$('#prompt').addEventListener('input', (e) => autoGrow(e.target));
$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
  }
});

$('#chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.sug');
  if (!btn) return;
  submit(btn.dataset.prompt);
});

$('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  $$('.tab').forEach((t) => t.classList.toggle('is-active', t === tab));
  $$('.pane').forEach((p) => p.classList.toggle('is-active', p.dataset.pane === tab.dataset.pane));
  if (tab.dataset.pane === 'code') renderCode();
});

$('#devices').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) applyDevice(btn.dataset.width);
});

$('#fileTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.file-tab');
  if (!tab) return;
  state.activeFile = tab.dataset.file;
  renderCode();
});

$('#btnCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.files[state.activeFile] || '');
    const btn = $('#btnCopy');
    btn.textContent = '已复制';
    setTimeout(() => (btn.textContent = '复制'), 1200);
  } catch {
    /* 忽略剪贴板权限问题 */
  }
});

$('#btnReload').addEventListener('click', () => renderPreview({ force: true }));

$('#btnOpen').addEventListener('click', () => {
  const html = bundle(state.files);
  if (!html) return;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
});

$('#btnExport').addEventListener('click', () => {
  const html = bundle(state.files);
  if (!html) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'atomlab-app.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

$('#btnNew').addEventListener('click', () => {
  if (Object.keys(state.files).length && !confirm('清空当前项目？版本记录也会一并清除。')) return;
  state.files = {};
  state.versions = [];
  state.history = [];
  state.activeFile = 'index.html';
  localStorage.removeItem(STORE_KEY);
  thread.innerHTML = '';
  location.reload();
});

$('#history').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-restore]');
  if (!btn) return;
  const v = state.versions.find((x) => x.id === Number(btn.dataset.restore));
  if (!v) return;
  state.files = { ...v.files };
  renderPreview({ force: true });
  renderCode();
  renderHistory();
  persist();
  $('#statusText').textContent = `已回滚到 v${v.id}`;
});

/* ---------------------------------------------------------------- *
 * 持久化
 * ---------------------------------------------------------------- */
function persist() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        files: state.files,
        versions: state.versions.map((v) => ({ ...v, files: v.files })),
        history: state.history.slice(-8),
      })
    );
  } catch {
    /* 超配额就算了 */
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.files && Object.keys(data.files).length) {
      state.files = data.files;
      state.versions = data.versions || [];
      state.history = data.history || [];
      $('#welcome')?.remove();
      renderPreview({ force: true });
      renderCode();
      renderHistory();
      const el = document.createElement('div');
      el.className = 'turn';
      el.innerHTML =
        '<div class="turn-head"><span class="turn-avatar">A</span><span class="turn-title">已恢复上次的会话</span></div>' +
        '<div class="plan">- 上次生成的应用已还原，可直接继续对话修改\n- 想重来就点右上角「新建」</div>';
      thread.appendChild(el);
      $('#btnExport').disabled = false;
      $('#statusText').textContent = '已恢复';
      updateStatus();
    }
  } catch {
    /* 忽略损坏数据 */
  }
}

/* ---------------------------------------------------------------- *
 * 启动
 * ---------------------------------------------------------------- */
async function boot() {
  applyDevice('100%');
  try {
    const res = await fetch('/api/health');
    const info = await res.json();
    state.provider = info.provider;
    const pill = $('#provider');
    pill.classList.toggle('is-local', info.provider === 'local');
    $('#providerText').textContent =
      info.provider === 'llm' ? `LLM · ${info.model}` : '本地引擎 · builtin';
    pill.title = info.provider === 'llm'
      ? `已连接 ${info.model} @ ${info.base}`
      : '未配置 OPENAI_API_KEY，使用内置引擎（功能完整，可离线运行）';
  } catch {
    $('#providerText').textContent = '服务未连接';
  }
  restore();
  renderCode();
  $('#prompt').focus();
}

boot();
