/**
 * ============================================================
 * ws 地址：/ws/message
 * 场景：最新消息推送
 *  - 连接成功后立即推一条“最新消息”
 *  - 之后按固定间隔持续推送
 *  - 客户端可发参数：切换主题、改间隔、要一条、心跳
 *
 * 连接示例：ws://localhost:3001/ws/message?topic=tech
 * ============================================================
 */
const { WebSocket } = require('ws');
const { randomUUID } = require('crypto');

const TOPICS = ['tech', 'sports', 'finance', 'weather'];
const TITLES = [
  'Node.js 24 正式发布',
  '某厂商发布新一代自研芯片',
  'A 股今日小幅收涨',
  '今日多云转晴，最高气温 26℃',
  'Express 5 稳定版正式上线',
  'WebSocket 心跳保活的最佳实践',
  '前端构建工具再迎新版本',
];
const LEVELS = ['normal', 'important', 'urgent'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 生成一条假消息 */
function buildMessage(topic) {
  return {
    type: 'latest_message',
    id: randomUUID(),
    topic: topic === 'all' ? pick(TOPICS) : topic,
    title: pick(TITLES),
    level: pick(LEVELS),
    time: new Date().toISOString(),
  };
}

module.exports = function registerMessage(ws, req, tag) {
  // 从连接 URL 上取参数：?topic=tech
  const url = new URL(req.url, 'http://localhost');
  let topic = url.searchParams.get('topic') || 'all';
  let interval = 3000;   // 默认 3 秒推一次
  let timer = null;

  /** 给当前客户端推一条 */
  const pushOne = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(buildMessage(topic)));
    }
  };

  /** 重设定时器 */
  const startTimer = (ms) => {
    interval = Math.max(500, Number(ms) || 3000);  // 最小 500ms，防止刷爆
    if (timer) clearInterval(timer);
    timer = setInterval(pushOne, interval);
  };

  /* 1. 连接成功：先发欢迎语，再立即推一条最新消息 */
  ws.send(JSON.stringify({
    type: 'welcome',
    msg: `已连接 ${tag} /ws/message`,
    topic,
    interval,
  }));
  pushOne();

  /* 2. 定时推送 */
  startTimer(interval);

  /* 3. 接收客户端参数 */
  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return ws.send(JSON.stringify({ type: 'error', msg: '消息必须是合法 JSON' }));
    }

    switch (data.action) {
      // 切换订阅主题：{"action":"subscribe","topic":"sports"}
      case 'subscribe':
        topic = data.topic || 'all';
        ws.send(JSON.stringify({ type: 'subscribed', topic }));
        break;

      // 修改推送频率：{"action":"interval","interval":1000}
      case 'interval':
        startTimer(data.interval);
        ws.send(JSON.stringify({ type: 'interval_changed', interval }));
        break;

      // 立刻要一条：{"action":"once"}
      case 'once':
        pushOne();
        break;

      // 心跳检测：{"action":"ping"}
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
        break;

      // 其它消息原样回显，方便调试
      default:
        ws.send(JSON.stringify({ type: 'echo', received: data, time: Date.now() }));
    }
  });

  // 关闭时清理定时器，避免内存泄漏
  ws.on('close', () => {
    if (timer) clearInterval(timer);
  });
};