/**
 * ============================================================
 * 入口文件
 *  - 分别启动 HTTP / HTTPS / WS / WSS 四个服务
 *  - 端口与开关都来自 config.js（可用 .env 覆盖）
 * ============================================================
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const config = require('./config');
const app = require('./app');
const { attachWebSocket } = require('./ws');

/**
 * 读取自签名证书（crt + key）
 * 证书缺失时给出明确的错误提示和生成命令
 */
function readCert() {
  try {
    return {
      key: fs.readFileSync(config.ssl.key),
      cert: fs.readFileSync(config.ssl.cert),
    };
  } catch (err) {
    console.error('\n[证书读取失败]', err.message);
    console.error('\n请先生成自签名证书，二选一：\n');
    console.error('  方式 A（推荐）：bash certs/gen-cert.sh');
    console.error('  方式 B（手动）：\n');
    console.error('    mkdir -p certs && cd certs');
    console.error('    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \\');
    console.error('      -keyout server.key -out server.crt \\');
    console.error('      -subj "/C=CN/ST=Hunan/L=Changsha/O=Demo/CN=localhost" \\');
    console.error('      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"\n');
    process.exit(1);
  }
}

// 只要 https 或 wss 开启，就需要证书
const credentials = config.https.enable || config.wss.enable ? readCert() : null;

/* ============================================================
 *  1. HTTP 服务（REST + 挂载 ws，让 3000 端口也能用 ws://）
 * ============================================================ */
if (config.http.enable) {
  const server = http.createServer(app);
  attachWebSocket(server, 'WS-HTTP');
  server.listen(config.http.port, () => {
    console.log(`[HTTP ] http://localhost:${config.http.port}`);
  });
}

/* ============================================================
 *  2. HTTPS 服务（REST + 挂载 wss）
 * ============================================================ */
if (config.https.enable) {
  const server = https.createServer(credentials, app);
  attachWebSocket(server, 'WSS-HTTPS');
  server.listen(config.https.port, () => {
    console.log(`[HTTPS] https://localhost:${config.https.port}  (自签名证书，浏览器点“继续访问”)`);
  });
}

/* ============================================================
 *  3. 独立 WS 端口
 * ============================================================ */
if (config.ws.enable) {
  const server = http.createServer((req, res) => {
    // 这个端口只跑 WebSocket，普通 HTTP 请求给个提示
    res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('该端口仅提供 WebSocket 服务，请使用 ws:// 连接 /ws/message、/ws/status、/ws/count');
  });

  attachWebSocket(server, 'WS');
  server.listen(config.ws.port, () => {
    console.log(`[WS   ] ws://localhost:${config.ws.port}/ws/message | /ws/status | /ws/count`);
  });
}

/* ============================================================
 *  4. 独立 WSS 端口
 * ============================================================ */
if (config.wss.enable) {
  const server = https.createServer(credentials, (req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('该端口仅提供 WebSocket Secure 服务，请使用 wss:// 连接 /ws/message、/ws/status、/ws/count');
  });

  attachWebSocket(server, 'WSS');
  server.listen(config.wss.port, () => {
    console.log(`[WSS  ] wss://localhost:${config.wss.port}/ws/message | /ws/status | /ws/count`);
  });
}

/* ============================================================
 *  优雅退出
 * ============================================================ */
process.on('SIGINT', () => {
  console.log('\n服务已停止');
  process.exit(0);
});

// 未捕获异常：记录日志，不直接退出（真实项目可以配合 pm2 重启）
process.on('uncaughtException', (err) => {
  console.error('[未捕获异常]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[未处理的 Promise rejection]', reason);
});