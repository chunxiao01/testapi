/**
 * ============================================================
 * Express 应用
 *  - 只负责“组装”：中间件 + 路由挂载
 *  - 这个 app 同时被 http 和 https 两个 server 复用
 * ============================================================
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const config = require('./config');

// 启动前确保必要的目录存在
[config.dirs.upload, config.dirs.export, config.dirs.log].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();

/* ============================================================
 *  基础中间件
 * ============================================================ */

// 跨域（生产环境建议限制 origin）
// app.use(cors());
// app.use(require('./middleware/cors'));

const ALLOW_ORIGINS = [
  'http://localhost:5173',
  'https://your-domain.com',
];

app.use(cors({
  origin(origin, cb) {
    // 无 Origin（curl/Postman/服务端）直接放行
    if (!origin) return cb(null, true);
    // 命中白名单放行
    if (ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    // 其它拒绝（不会报错，只是浏览器拿不到响应头）
    cb(null, false);
  },
  credentials: true,     // 允许带 cookie / Authorization
  maxAge: 600,           // 预检缓存秒数
}));

// 解析 JSON 请求体，限 2MB（上传文件走 multipart，不受这里限制）
app.use(express.json({ limit: '2mb' }));

// 解析表单请求体
app.use(express.urlencoded({ extended: true }));

// 静态资源：上传文件、导出文件可以直接通过 URL 访问
app.use('/static/uploads', express.static(config.dirs.upload));
app.use('/static/exports', express.static(config.dirs.export));

// 简易请求日志
app.use((req, res, next) => {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

/* ============================================================
 *  路由挂载
 * ============================================================ */
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/product'));
app.use('/api/files',    require('./routes/file'));
app.use('/api/excel',    require('./routes/excel'));

/* ============================================================
 *  公开接口（免 token）
 * ============================================================ */
app.get('/', (req, res) => {
  res.json({
    code: 0,
    msg: 'server is running',
    time: new Date().toISOString(),
  });
});

app.get('/api/public/info', (req, res) => {
  res.json({
    code: 0,
    data: {
      name: 'demo-server',
      version: '1.0.0',
      protocols: ['http', 'https', 'ws', 'wss'],
    },
  });
});

/* ============================================================
 *  404 兜底
 *  Express 5 不再支持 app.use('*', ...)，直接用无路径中间件
 * ============================================================ */
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    msg: `接口不存在: ${req.method} ${req.originalUrl}`,
  });
});

/* ============================================================
 *  统一错误处理（必须 4 个参数，Express 才识别为错误中间件）
 * ============================================================ */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);

  // multer 常见错误，转成友好提示
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ code: 413, msg: '文件太大，单文件不能超过 20MB' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ code: 400, msg: '文件字段名不正确' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    code: status,
    msg: err.message || '服务器内部错误',
  });
});

module.exports = app;