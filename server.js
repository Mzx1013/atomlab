/**
 * AtomLab — 零依赖 HTTP 服务
 * 职责：
 *   1. 托管 public/ 静态资源
 *   2. POST /api/agent  — SSE 流式返回 Agent 的每一步（计划 / 文件增量 / 自检 / 完成）
 *   3. GET  /api/health — 告诉前端当前用的是 LLM 还是内置本地引擎
 *
 * 设计取舍：不引任何 npm 包。笔试场景下交付物「clone 完 node server.js 就能跑」
 * 比多一层依赖树更重要，也让评审能在离线环境直接验收。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { runLocal } from './lib/engine.js';
import { hasLLM, runLLM, providerInfo } from './lib/llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function serveStatic(res, urlPath) {
  // 防目录穿越：normalize 后必须仍在 PUBLIC_DIR 内
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const filePath = join(PUBLIC_DIR, rel || 'index.html');
  if (!filePath.startsWith(PUBLIC_DIR + sep) && filePath !== PUBLIC_DIR) {
    return sendJSON(res, 403, { error: 'forbidden' });
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(data);
  } catch {
    // SPA 兜底
    try {
      const html = await readFile(join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(html);
    } catch {
      sendJSON(res, 404, { error: 'not found' });
    }
  }
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/api/health') {
    return sendJSON(res, 200, {
      ok: true,
      provider: hasLLM() ? 'llm' : 'local',
      ...providerInfo(),
      node: process.version,
      uptime: Math.round(process.uptime()),
    });
  }

  if (path === '/api/agent' && req.method === 'POST') {
    let payload;
    try {
      payload = await readBody(req);
    } catch (err) {
      return sendJSON(res, 400, { error: String(err.message || err) });
    }

    // ---- SSE 通道 ----
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write(': connected\n\n');

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const emit = (event, data) => {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const startedAt = Date.now();
    try {
      const ctx = {
        prompt: String(payload.prompt || '').slice(0, 4000),
        files: payload.files && typeof payload.files === 'object' ? payload.files : null,
        history: Array.isArray(payload.history) ? payload.history.slice(-6) : [],
        emit,
      };
      if (hasLLM()) await runLLM(ctx);
      else await runLocal(ctx);
      emit('done', { elapsed: Date.now() - startedAt, provider: hasLLM() ? 'llm' : 'local' });
    } catch (err) {
      emit('error', { message: String(err?.message || err) });
      emit('done', { elapsed: Date.now() - startedAt, provider: hasLLM() ? 'llm' : 'local' });
    }
    res.end();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(res, path);
  }
  sendJSON(res, 405, { error: 'method not allowed' });
});

server.listen(PORT, () => {
  const info = providerInfo();
  console.log(`\n  AtomLab 已启动  →  http://localhost:${PORT}`);
  console.log(`  生成引擎: ${hasLLM() ? `LLM (${info.model})` : '本地内置引擎 (设置 OPENAI_API_KEY 可切换为真实 LLM)'}`);
  console.log(`  零依赖运行，无需 npm install\n`);
});
