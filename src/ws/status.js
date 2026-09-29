/**
 * ============================================================
 * ws 地址：/ws/status
 * 场景：服务状态变化推送（CPU / 内存 / 数据库 / 缓存）
 * 特点：所有客户端共享同一份状态；只有状态“真的变了”才推送
 * ============================================================
 */
const { WebSocket } = require('ws');

// 所有已连接的客户端
const clients = new Set();

// 全局共享状态
const state = {
  server: 'online',
  db: 'connected',
  cache: 'connected',
  cpu: 20,
  memory: 40,
  updatedAt: new Date().toISOString(),
};

let timer = null;

const DB_STATES = ['connected', 'disconnected', 'reconnecting'];
const CACHE_STATES = ['connected', 'disconnected'];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** 随机生成一个新状态 */
function nextState() {
  return {
    ...state,
    cpu: clamp(state.cpu + rand(-15, 15), 1, 99),
    memory: clamp(state.memory + rand(-10, 10), 1, 99),
    db: Math.random() < 0.15 ? DB_STATES[rand(0, 2)] : state.db,
    cache: Math.random() < 0.1 ? CACHE_STATES[rand(0, 1)] : state.cache,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 判断是否算“发生了变化”
 * 数值波动小于阈值就不推，避免刷屏
 */
function hasChanged(a, b) {
  return (
    a.db !== b.db ||
    a.cache !== b.cache ||
    Math.abs(a.cpu - b.cpu) >= 5 ||
    Math.abs(a.memory - b.memory) >= 5
  );
}

/** 广播给所有客户端 */
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
    const next = nextState();
    if (!hasChanged(state, next)) return;   // 没变化就不推
    Object.assign(state, next);
    broadcast({ type: 'status_changed', data: { ...state } });
  }, 2000);
}

module.exports = function registerStatus(ws, req, tag) {
  clients.add(ws);
  startTicker();

  // 连接后先推一份当前快照，避免客户端空白
  ws.send(JSON.stringify({ type: 'status_snapshot', data: { ...state } }));

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (data.action === 'get') {
      // 客户端主动拉一次：{"action":"get"}
      ws.send(JSON.stringify({ type: 'status_snapshot', data: { ...state } }));
    } else if (data.action === 'set_db') {
      // 演示：客户端模拟数据库状态切换：{"action":"set_db","value":"disconnected"}
      state.db = data.value || state.db;
      state.updatedAt = new Date().toISOString();
      broadcast({ type: 'status_changed', data: { ...state } });
    }
  });

  ws.on('close', () => clients.delete(ws));
};