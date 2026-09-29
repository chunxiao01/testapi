/**
 * ============================================================
 * Token 工具 + Express 鉴权中间件
 *   generateToken  : 生成 token
 *   verifyToken    : 校验 token
 *   extractToken   : 从请求中提取 token
 *   authRequired   : 必须带 token，否则 401
 *   authOptional   : 带就解析，不带也放行（查询类接口常用）
 * ============================================================
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 生成 token
 * @param {object} payload  要写入 token 的数据（如 id、username、role）
 * @param {string} expiresIn 有效期，默认取配置里的值
 */
function generateToken(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

/**
 * 校验 token，成功返回 payload，失败抛异常
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/**
 * 从请求中提取 token，支持 3 种方式（按优先级）：
 *   1. Header: Authorization: Bearer xxx
 *   2. Header: x-token: xxx
 *   3. Query : ?token=xxx    （浏览器直接下载文件、WebSocket 握手时常用）
 */
function extractToken(req) {
  // 方式 1：Authorization: Bearer xxx
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  // 方式 2：x-token 自定义头
  if (req.headers['x-token']) return req.headers['x-token'];

  // 方式 3：URL 上的 query
  if (req.query && req.query.token) return req.query.token;

  return null;
}

/**
 * 必须登录：不带 token 直接 401
 * 用法：router.post('/xxx', authRequired, (req, res) => { req.user.xxx })
 */
function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ code: 401, msg: '缺少 token，请先登录获取' });
  }
  try {
    req.user = verifyToken(token);   // 挂到 req 上，后续路由直接用
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      code: 401,
      msg: expired ? 'token 已过期，请重新登录' : 'token 无效',
    });
  }
}

/**
 * 可选登录：有 token 就解析，没有也放行
 * 用法：router.get('/xxx', authOptional, (req, res) => { req.user?.id })
 */
function authOptional(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      /* 忽略错误，按未登录处理 */
    }
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  authRequired,
  authOptional,
};