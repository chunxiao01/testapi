/**
 * 命令行 WebSocket 测试脚本
 * 用法：node test/ws-test.js
 * 可自行修改 URL 测试不同协议 / 端口 / 路径
 */
const WebSocket = require('ws');

// 三种协议的示例 URL，按需切换：
//   ws://localhost:3001/ws/message   （独立 WS 端口）
//   wss://localhost:3444/ws/status   （独立 WSS 端口，需要 rejectUnauthorized）
//   ws://localhost:3000/ws/count     （HTTP 端口上挂的 ws）
const WS_URL = 'ws://localhost:3001/ws/message?topic=tech';

const ws = new WebSocket(WS_URL, { rejectUnauthorized: false });

ws.on('open', () => {
  console.log('已连接:', WS_URL);

  // 3 秒后切换订阅主题
  setTimeout(() => ws.send(JSON.stringify({ action: 'subscribe', topic: 'sports' })), 3000);
  // 6 秒后改推送间隔为 1 秒
  setTimeout(() => ws.send(JSON.stringify({ action: 'interval', interval: 1000 })), 6000);
  // 10 秒后主动要一条
  setTimeout(() => ws.send(JSON.stringify({ action: 'once' })), 10000);
  // 12 秒后关闭
  setTimeout(() => ws.close(), 12000);
});

ws.on('message', (data) => console.log('收到:', data.toString()));
ws.on('close', () => console.log('连接已关闭'));
ws.on('error', (err) => console.error('连接出错:', err.message));