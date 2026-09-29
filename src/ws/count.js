/**
 * ============================================================
 * ws 地址：/ws/count
 * 场景：数量变化推送（在线人数 / 订单数 / 库存数……）
 *  - 连接后先给当前值
 *  - 之后每隔 1.5 秒随机增减并广播给所有人
 *  - 客户端也能主动上报增减
 * ============================================================
 */
const { WebSocket } = require('ws');

const clients = new Set();

let count = 1000;   // 当前数量
let timer = null;

/** 广播 */
function broadcast(payload) {
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}

/** 全局定时器，模块内只启动一次 */
function startTicker() {
  if (timer) return;
  timer = setInterval(() => {
    const delta = Math.floor(Math.random() * 21) - 10;   // -10 ~ +10
    if (delta === 0) return;                              // 没变化就跳过
    count += delta;
    broadcast({
      type: 'count_changed',
      data: { count, delta, time: new Date().toISOString() },
    });
  }, 1500);
}

module.exports = function registerCount(ws, req, tag) {
  clients.add(ws);
  startTicker();

  // 连接后先给当前值
  ws.send(JSON.stringify({ type: 'count_snapshot', data: { count } }));

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (data.action) {
      // 主动拉取当前值
      case 'get':
        ws.send(JSON.stringify({ type: 'count_snapshot', data: { count } }));
        break;

      // 客户端上报增减：{"action":"add","delta":5}
      case 'add': {
        const delta = Number(data.delta) || 0;
        count += delta;
        broadcast({
          type: 'count_changed',
          data: {
            count,
            delta,
            from: req.socket.remoteAddress,
            time: new Date().toISOString(),
          },
        });
        break;
      }

      // 重置：{"action":"reset","value":0}
      case 'reset':
        if (data.value != null) {
          count = Number(data.value);
          broadcast({
            type: 'count_changed',
            data: { count, delta: 0, time: new Date().toISOString() },
          });
        }
        break;

      default:
        break;
    }
  });

  ws.on('close', () => clients.delete(ws));
};