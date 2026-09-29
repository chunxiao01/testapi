/**
 * ============================================================
 * 文件相关接口
 *   POST   /api/files/upload            单文件上传（需 token）
 *   POST   /api/files/upload-multiple   多文件上传（需 token）
 *   GET    /api/files/list              文件列表（免 token）
 *   GET    /api/files/download/:name    文件下载（可选 token）
 *   DELETE /api/files/:name             删除文件（需 token）
 * ============================================================
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { upload, fixFileName } = require('../middleware/upload');
const { authRequired, authOptional } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

/**
 * 单文件上传
 * form-data 字段名：file
 * 例：curl -X POST ... -H "Authorization: Bearer xxx" -F "file=@a.png"
 */
router.post('/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, msg: '未收到文件，字段名应为 file' });
  }

  res.json({
    code: 0,
    msg: '上传成功',
    data: {
      originalName: fixFileName(req.file.originalname),   // 原始文件名（修复中文）
      filename: req.file.filename,                        // 服务器上的实际文件名
      size: req.file.size,                                // 字节数
      mimetype: req.file.mimetype,                        // MIME 类型
      url: `/static/uploads/${req.file.filename}`,        // 直接访问地址
      downloadUrl: `/api/files/download/${req.file.filename}`,  // 走下载接口
    },
  });
});

/**
 * 多文件上传
 * form-data 字段名：files（最多 10 个）
 */
router.post('/upload-multiple', authRequired, upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ code: 400, msg: '未收到文件，字段名应为 files' });
  }

  res.json({
    code: 0,
    msg: `成功上传 ${req.files.length} 个文件`,
    data: req.files.map((f) => ({
      originalName: fixFileName(f.originalname),
      filename: f.filename,
      size: f.size,
      url: `/static/uploads/${f.filename}`,
    })),
  });
});

/** 文件列表（免 token 的查询示例） */
router.get('/list', (req, res) => {
  const files = fs.readdirSync(config.dirs.upload).map((name) => {
    const stat = fs.statSync(path.join(config.dirs.upload, name));
    return { filename: name, size: stat.size, uploadedAt: stat.mtime };
  });
  res.json({ code: 0, data: files });
});

/**
 * 文件下载
 * 使用 authOptional：不带 token 也能下（演示“某些查询不需要校验”）
 * 若要强制登录，把 authOptional 换成 authRequired 即可
 */
router.get('/download/:filename', authOptional, (req, res) => {
  const filename = path.basename(req.params.filename);       // 防目录穿越
  const filePath = path.join(config.dirs.upload, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ code: 404, msg: '文件不存在' });
  }

  // res.download 会自动加 Content-Disposition，触发浏览器下载
  res.download(filePath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ code: 500, msg: '下载失败' });
    }
  });
});

/** 删除文件（需 token） */
router.delete('/:filename', authRequired, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(config.dirs.upload, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ code: 404, msg: '文件不存在' });
  }
  fs.unlinkSync(filePath);
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;