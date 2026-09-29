/**
 * ============================================================
 * 全局配置
 *  - 端口、开关、JWT、证书路径、目录，全部集中在这里
 *  - 支持 .env 覆盖（复制 .env.example 为 .env 即可）
 * ============================================================
 */
require('dotenv').config();
const path = require('path');

// 项目根目录（src 的上一级）
const ROOT = path.join(__dirname, '..');

module.exports = {
  // ---------- 1. HTTP ----------
  http: {
    enable: process.env.HTTP_ENABLE !== 'false',     // 默认开启
    port: Number(process.env.HTTP_PORT || 3000),
  },

  // ---------- 2. HTTPS ----------
  https: {
    enable: process.env.HTTPS_ENABLE !== 'false',
    port: Number(process.env.HTTPS_PORT || 3443),
  },

  // ---------- 3. 独立 WS ----------
  ws: {
    enable: process.env.WS_ENABLE !== 'false',
    port: Number(process.env.WS_PORT || 3001),
  },

  // ---------- 4. 独立 WSS ----------
  wss: {
    enable: process.env.WSS_ENABLE !== 'false',
    port: Number(process.env.WSS_PORT || 3444),
  },

  // ---------- 5. 自签名证书路径 ----------
  ssl: {
    key: process.env.SSL_KEY || path.join(ROOT, 'certs/server.key'),
    cert: process.env.SSL_CERT || path.join(ROOT, 'certs/server.crt'),
  },

  // ---------- 6. JWT ----------
  jwt: {
    secret: process.env.JWT_SECRET || 'please-change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },

  // ---------- 7. 目录 ----------
  dirs: {
    root: ROOT,
    upload: path.join(ROOT, 'uploads'),   // 上传文件
    export: path.join(ROOT, 'exports'),   // 导出文件
    log: path.join(ROOT, 'logs'),         // 日志目录
  },
};