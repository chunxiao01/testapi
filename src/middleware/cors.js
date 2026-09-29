// src/middleware/cors.js
/**
 * CORS 配置：白名单 + 允许凭证 + 预检缓存
 */
const config = require('../config');

// 允许的前端源（生产环境写死具体域名）
const ALLOW_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'https://your-domain.com',
];

/**
 * 自定义 CORS 中间件（不依赖 cors 包，逻辑一目了然）
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  // 1. 命中白名单才回 Access-Control-Allow-Origin
  if (origin && ALLOW_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // 允许带 cookie
  } else if (!origin) {
    // 非浏览器请求（curl、Postman、服务端调用）没有 Origin 头，直接放行
  }

  // 2. 允许的方法和头
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Token,X-Requested-With'
  );

  // 3. 允许前端读取的响应头（否则前端拿不到 Content-Disposition 等）
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition,Content-Length,X-Total-Count'
  );

  // 4. 预检请求缓存 10 分钟，减少 OPTIONS 次数
  res.setHeader('Access-Control-Max-Age', '600');

  // 5. 预检请求直接返回 204
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

module.exports = corsMiddleware;