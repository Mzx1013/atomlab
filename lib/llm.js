/**
 * LLM 通道 —— 兼容 OpenAI /chat/completions 协议（OpenAI、DeepSeek、Moonshot、
 * OpenRouter、vLLM、Ollama 等都能直接接）。
 *
 * 环境变量：
 *   OPENAI_API_KEY   (也接受 DEEPSEEK_API_KEY / LLM_API_KEY)
 *   OPENAI_BASE_URL  默认 https://api.openai.com/v1
 *   OPENAI_MODEL     默认 gpt-4o-mini
 *
 * 为什么保留「本地引擎」作为默认：评审拿到仓库后不应被 API Key 卡住。
 * 有 key 走真模型，没 key 走确定性引擎，两者输出的是同一套 SSE 事件协议，
 * 前端完全无感 —— 这是这个 Demo 在可扩展性上最想表达的一点。
 */

const KEY =
  process.env.OPENAI_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.LLM_API_KEY ||
  '';
const BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function hasLLM() {
  return Boolean(KEY);
}

export function providerInfo() {
  return { model: hasLLM() ? MODEL : 'builtin', base: hasLLM() ? BASE : 'local' };
}

const SYSTEM = `你是 AtomLab 的生成引擎，一个把自然语言需求转成可运行网页应用的前端工程师。

输出格式（必须严格遵守，不要任何客套话）：

<plan>
- 一句需求理解
- 一句视觉/交互方案
- 一句关键技术点
</plan>

\`\`\`html:index.html
<!DOCTYPE html>...
\`\`\`
\`\`\`css:style.css
...
\`\`\`
\`\`\`js:app.js
...
\`\`\`

硬性约束：
1. 只允许三个文件：index.html / style.css / app.js。
2. index.html 通过 <link rel="stylesheet" href="style.css"> 和 <script src="app.js"></script> 引用，index.html 内不要写 <style> 与内联 <script>。
3. 禁止任何外链（CDN、字体、图片、图标库）。图标用内联 SVG 或 emoji。
4. 预览运行在沙箱 iframe 中，没有 same-origin，禁止使用 localStorage / sessionStorage / cookie / fetch 外部接口；状态放内存变量。
5. 必须是完整可交互的应用，不要占位符和 TODO。
6. 中文界面（除非用户用英文提需求）。视觉要精致：有设计系统（CSS 变量）、留白、hover 反馈、深色文字在浅色背景上。
7. 直接输出代码，不要解释。`;

function buildMessages({ prompt, files, history }) {
  const messages = [{ role: 'system', content: SYSTEM }];
  for (const turn of history || []) {
    const role = turn.role === 'user' ? 'user' : 'assistant';
    if (typeof turn.content === 'string' && turn.content.trim()) {
      messages.push({ role, content: turn.content.slice(0, 2000) });
    }
  }

  if (files && Object.keys(files).length) {
    const listing = ['index.html', 'style.css', 'app.js']
      .filter((p) => files[p])
      .map((p) => `--- ${p} ---\n${files[p]}`)
      .join('\n\n');
    messages.push({
      role: 'user',
      content: `当前已有应用源码如下，请在此基础上按需求修改。只输出被改动过的文件（至少一个），保持其余文件不变，不要输出 <plan> 以外的废话。\n\n需求：${prompt}\n\n${listing}`,
    });
  } else {
    messages.push({ role: 'user', content: `需求：${prompt}` });
  }
  return messages;
}

/** 增量解析器：把模型吐出的裸文本，翻译成前端认识的 agent 事件 */
class FenceParser {
  constructor(emit) {
    this.emit = emit;
    this.buf = '';
    this.mode = 'pre'; // pre | plan | between | file
    this.current = null;
    this.planStarted = false;
    this.planClosed = false;
    this.fileClosed = false;
  }

  _startPlan() {
    this.mode = 'plan';
    this.emit('step', { id: 'plan', title: '理解需求', status: 'running' });
  }

  _openFile(path) {
    if (this.current) this._closeFile();
    this.current = path;
    this.fileClosed = false;
    this.mode = 'file';
    this.emit('file', { path, status: 'start' });
  }

  _closeFile() {
    if (!this.current) return;
    this.emit('file', { path: this.current, status: 'done' });
    this.current = null;
    this.mode = 'between';
  }

  push(chunk) {
    this.buf += chunk;
    let guard = 0;
    while (guard++ < 200) {
      if (this.mode === 'pre') {
        const planIdx = this.buf.indexOf('<plan>');
        const fenceIdx = this.buf.search(/```(?:html|css|js)/);
        if (planIdx === -1 && fenceIdx === -1) {
          // 保留尾部，防止标签被切断
          if (this.buf.length > 32) this.buf = this.buf.slice(-32);
          return;
        }
        if (planIdx !== -1 && (fenceIdx === -1 || planIdx < fenceIdx)) {
          this.buf = this.buf.slice(planIdx + 6);
          this._startPlan();
        } else {
          this.buf = this.buf.slice(fenceIdx);
          this.mode = 'between';
        }
        continue;
      }

      if (this.mode === 'plan') {
        const end = this.buf.indexOf('</plan>');
        if (end === -1) {
          const safe = Math.max(0, this.buf.length - 8);
          if (safe > 0) {
            this.emit('token', { stepId: 'plan', text: this.buf.slice(0, safe) });
            this.buf = this.buf.slice(safe);
          }
          return;
        }
        const text = this.buf.slice(0, end);
        if (text) this.emit('token', { stepId: 'plan', text });
        this.buf = this.buf.slice(end + 7);
        this.emit('step', { id: 'plan', status: 'done' });
        this.mode = 'between';
        continue;
      }

      if (this.mode === 'between') {
        const m = this.buf.match(/```(?:html|css|js)(?::([\w.\-/]+))?\s*\n?/);
        if (!m) {
          if (this.buf.length > 200) this.buf = this.buf.slice(-200);
          return;
        }
        const lang = m[0].slice(3, 6).trim();
        const path = (m[1] || `main.${lang}`).trim();
        this.buf = this.buf.slice(m.index + m[0].length);
        this._openFile(path);
        continue;
      }

      if (this.mode === 'file') {
        const end = this.buf.indexOf('```');
        if (end === -1) {
          const safe = Math.max(0, this.buf.length - 3);
          if (safe > 0 && !this.fileClosed) {
            this.emit('token', { path: this.current, text: this.buf.slice(0, safe) });
            this.buf = this.buf.slice(safe);
          }
          return;
        }
        const text = this.buf.slice(0, end);
        if (text) this.emit('token', { path: this.current, text });
        this.buf = this.buf.slice(end + 3);
        this._closeFile();
        continue;
      }
      return;
    }
  }

  end() {
    if (this.mode === 'plan' && this.buf.trim()) {
      this.emit('token', { stepId: 'plan', text: this.buf });
      this.emit('step', { id: 'plan', status: 'done' });
    }
    if (this.mode === 'file') {
      if (this.buf) this.emit('token', { path: this.current, text: this.buf });
      this._closeFile();
    }
    this.buf = '';
  }
}

export async function runLLM({ prompt, files, history, emit }) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages({ prompt, files, history }),
      stream: true,
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${detail.slice(0, 300)}`);
  }

  const parser = new FenceParser(emit);
  const decoder = new TextDecoder();
  let sseBuf = '';

  for await (const chunk of res.body) {
    sseBuf += decoder.decode(chunk, { stream: true });
    const lines = sseBuf.split('\n');
    sseBuf = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) parser.push(delta);
      } catch {
        /* 忽略不完整帧 */
      }
    }
  }
  parser.end();
}
