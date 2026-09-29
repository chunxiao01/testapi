/**
 * ============================================================
 * 商品 RESTful 接口（演示“查询免 token、写操作要 token”）
 *   GET    /api/products       列表      —— 免 token
 *   GET    /api/products/:id   详情      —— 免 token
 *   POST   /api/products       新增      —— 需 token
 *   PUT    /api/products/:id   整体更新  —— 需 token
 *   PATCH  /api/products/:id   局部更新  —— 需 token
 *   DELETE /api/products/:id   删除      —— 需 token
 * ============================================================
 */
const express = require('express');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// 内存数据：真实项目请换成数据库（MySQL / MongoDB）
let products = [
  { id: 1, name: 'iPhone 15',     price: 5999,  stock: 100, createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 2, name: '小米 14',        price: 3999,  stock: 200, createdAt: '2024-01-02T00:00:00.000Z' },
  { id: 3, name: 'MacBook Pro',   price: 15999, stock: 50,  createdAt: '2024-01-03T00:00:00.000Z' },
];
let nextId = 4;

/* ============================================================
 *  读操作：不需要 token
 * ============================================================ */

/** 列表，支持 keyword 搜索 + 分页 */
router.get('/', (req, res) => {
  const { keyword = '', page = 1, pageSize = 10 } = req.query;

  // 关键词过滤
  let list = products;
  if (keyword) list = list.filter((p) => p.name.includes(keyword));

  // 分页
  const size = Math.max(1, Number(pageSize) || 10);
  const current = Math.max(1, Number(page) || 1);
  const start = (current - 1) * size;

  res.json({
    code: 0,
    data: {
      total: list.length,
      page: current,
      pageSize: size,
      list: list.slice(start, start + size),
    },
  });
});

/** 详情 */
router.get('/:id', (req, res) => {
  const item = products.find((p) => p.id === Number(req.params.id));
  if (!item) return res.status(404).json({ code: 404, msg: '商品不存在' });
  res.json({ code: 0, data: item });
});

/* ============================================================
 *  写操作：需要 token（authRequired）
 * ============================================================ */

/** 新增 */
router.post('/', authRequired, (req, res) => {
  const { name, price, stock = 0 } = req.body || {};

  if (!name || price == null) {
    return res.status(400).json({ code: 400, msg: 'name 和 price 为必填项' });
  }

  const item = {
    id: nextId++,
    name,
    price: Number(price),
    stock: Number(stock),
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,     // 从 token 里拿到当前用户
  };

  products.push(item);
  res.status(201).json({ code: 0, msg: '创建成功', data: item });
});

/** 整体更新（PUT） */
router.put('/:id', authRequired, (req, res) => {
  const idx = products.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ code: 404, msg: '商品不存在' });

  const { name, price, stock } = req.body || {};

  products[idx] = {
    ...products[idx],
    name:  name  !== undefined ? name  : products[idx].name,
    price: price !== undefined ? Number(price) : products[idx].price,
    stock: stock !== undefined ? Number(stock) : products[idx].stock,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username,
  };

  res.json({ code: 0, msg: '更新成功', data: products[idx] });
});

/** 局部更新（PATCH）：只更新传过来的字段 */
router.patch('/:id', authRequired, (req, res) => {
  const idx = products.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ code: 404, msg: '商品不存在' });

  Object.entries(req.body || {}).forEach(([key, value]) => {
    if (['name', 'price', 'stock'].includes(key)) {
      products[idx][key] = key === 'name' ? value : Number(value);
    }
  });
  products[idx].updatedAt = new Date().toISOString();

  res.json({ code: 0, msg: '局部更新成功', data: products[idx] });
});

/** 删除 */
router.delete('/:id', authRequired, (req, res) => {
  const idx = products.findIndex((p) => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ code: 404, msg: '商品不存在' });

  const [removed] = products.splice(idx, 1);
  res.json({ code: 0, msg: '删除成功', data: removed });
});

module.exports = router;