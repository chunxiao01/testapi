// src/ws/index.js
const { WebSocketServer } = require('ws');
const { verifyToken } = require('../middleware/auth');

// ------------------- 允许的 Origin 白名单 -------------------
const ALLOW_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://your-domain.com',
]);

// 允许无 Origin 的连接（curl、Node 客户端、Postman 测试用）
// 生产环境若担心被脚本刷，改成 false
const ALLOW_NO_ORIGIN = true;

// 需要 token 的路径
const AUTH_PATHS = new Set([]);
// 把 /ws/count 也列入需要 token 的路径
// const AUTH_PATHS = new Set(['/ws/count', '/ws/status']);


// const token = localStorage.getItem('token');
// const ws = new WebSocket(`wss://your-domain.com/ws/count?token=${encodeURIComponent(token)}`);

const messageHandler = require('./message');
const statusHandler = require('./status');
const countHandler = require('./count');

const HANDLERS = {
  '/ws/message': messageHandler,
  '/ws/status': statusHandler,
  '/ws/count': countHandler,
};

function attachWebSocket(server, tag = 'WS') {
  const entries = Object.entries(HANDLERS).map(([path, handler]) => {
    const wss = new WebSocketServer({ noServer: true });
    wss.on('connection', (ws, req) => {
      console.log(`[${tag}] 连接建立 ${path} 来自 ${req.socket.remoteAddress}`);
      ws.on('close', () => console.log(`[${tag}] 连接断开 ${path}`));
      ws.on('error', (err) => console.error(`[${tag}] 连接错误 ${path}:`, err.message));
      handler(ws, req, tag);
    });
    return { path, wss };
  });

  server.on('upgrade', (req, socket, head) => {
    // ---------- 1. 解析 URL ----------
    let pathname, searchParams;
    try {
      const url = new URL(req.url, 'http://localhost');
      pathname = url.pathname;
      searchParams = url.searchParams;
    } catch {
      socket.destroy();
      return;
    }

    // ---------- 2. 校验 Origin（防 CSWSH）----------
    const origin = req.headers.origin;
    if (origin) {
      // 浏览器发的请求一定有 Origin
      if (!ALLOW_ORIGINS.has(origin)) {
        console.warn(`[${tag}] 拒绝非法 Origin: ${origin}`);
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
    } else {
      // 非浏览器请求（curl / Postman / 服务端）
      if (!ALLOW_NO_ORIGIN) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    // ---------- 3. 路径匹配 ----------
    const matched = entries.find((e) => e.path === pathname);
    if (!matched) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    // ---------- 4. 路径需要 token 时校验 ----------
    if (AUTH_PATHS.has(pathname)) {
      try {
        verifyToken(searchParams.get('token'));
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    // ---------- 5. 升级为 WebSocket ----------
    matched.wss.handleUpgrade(req, socket, head, (ws) => {
      matched.wss.emit('connection', ws, req);
    });
  });

  return entries.map((e) => e.path);
}

module.exports = { attachWebSocket };