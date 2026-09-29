/**
 * ============================================================
 * multer 文件上传中间件
 *  - 磁盘存储到 uploads 目录
 *  - 单文件最大 20MB
 *  - 限制 MIME 类型
 *  - 修复中文文件名乱码
 * ============================================================
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 确保 uploads / exports 目录存在（首次启动时自动创建）
[config.dirs.upload, config.dirs.export, config.dirs.log].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * multer 默认按 latin1 解析文件名，中文名会乱码，这里尝试修复
 * 已经含中文的视为正常，不处理
 */
function fixFileName(name) {
  if (!name) return name;
  if (/[\u4e00-\u9fa5]/.test(name)) return name;
  try {
    const fixed = Buffer.from(name, 'latin1').toString('utf8');
    return fixed.includes('\uFFFD') ? name : fixed;
  } catch {
    return name;
  }
}

// 磁盘存储：文件名 = 时间戳-随机串.扩展名，避免重名覆盖
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.dirs.upload),
  filename: (req, file, cb) => {
    const ext = path.extname(fixFileName(file.originalname)).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

// 允许的 MIME 类型（按需增删）
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel',                                            // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',   // .xlsx
  'application/zip',
];

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`不支持的文件类型: ${file.mimetype}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },   // 单文件最大 20MB
});

module.exports = { upload, fixFileName };