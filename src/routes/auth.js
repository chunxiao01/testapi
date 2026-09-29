/**
 * ============================================================
 * 认证相关接口
 *   POST /api/auth/login     登录换 token（免校验）
 *   GET  /api/auth/profile   查当前用户（需 token）
 *   POST /api/auth/refresh   刷新 token（需 token）
 * ============================================================
 */
const express = require('express');
const { generateToken, authRequired } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// 模拟用户表：真实项目请查数据库，密码必须加密存储（bcrypt）
const USERS = [
  { id: 1, username: 'admin', password: '123456', role: 'admin', nickname: '管理员' },
  { id: 2, username: 'guest', password: '123456', role: 'guest', nickname: '访客' },
];

/** 登录：换取 token */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  // 模拟校验
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ code: 401, msg: '用户名或密码错误' });
  }

  // 生成 token：只写入必要信息，不要把密码写进去
  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
  });

  res.json({
    code: 0,
    msg: '登录成功',
    data: {
      token,
      tokenType: 'Bearer',
      expiresIn: config.jwt.expiresIn,
    },
  });
});

/** 查看当前登录信息 */
router.get('/profile', authRequired, (req, res) => {
  const user = USERS.find((u) => u.id === req.user.id);
  res.json({
    code: 0,
    data: { ...req.user, nickname: user ? user.nickname : '' },
  });
});

/** 用旧 token 换一个新 token */
router.post('/refresh', authRequired, (req, res) => {
  const { id, username, role } = req.user;
  const token = generateToken({ id, username, role });
  res.json({ code: 0, data: { token } });
});

module.exports = router;