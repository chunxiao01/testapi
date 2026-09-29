#!/usr/bin/env bash
# ============================================================
# REST 接口测试脚本
# 用法：bash test/api-test.sh
# ============================================================
set -e

BASE="http://localhost:3000"

echo "==================== 1. 公开接口 ===================="
curl -s $BASE/api/public/info | jq . 2>/dev/null || curl -s $BASE/api/public/info
echo

echo "==================== 2. 商品列表（免 token）===================="
curl -s $BASE/api/products | jq . 2>/dev/null || curl -s $BASE/api/products
echo

echo "==================== 3. 登录获取 token ===================="
LOGIN_RES=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}')
echo "$LOGIN_RES"

# 从返回里提取 token（不依赖 jq）
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "TOKEN = $TOKEN"
echo

echo "==================== 4. 查看当前用户 ===================="
curl -s $BASE/api/auth/profile -H "Authorization: Bearer $TOKEN"
echo

echo "==================== 5. 新增商品（需 token）===================="
curl -s -X POST $BASE/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"iPad Air","price":4799,"stock":80}'
echo

echo "==================== 6. 不带 token 写操作（应 401）===================="
curl -s -X POST $BASE/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":1}'
echo

echo "==================== 7. 文件上传（需 token）===================="
echo "hello demo-server" > /tmp/demo-upload.txt
curl -s -X POST $BASE/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/demo-upload.txt"
echo

echo "==================== 8. 文件列表 ===================="
curl -s $BASE/api/files/list
echo

echo "==================== 9. Excel 导出 ===================="
curl -s -o /tmp/employees.xlsx $BASE/api/excel/export
ls -lh /tmp/employees.xlsx
echo

echo "==================== 10. HTTPS 接口（-k 忽略自签名）===================="
curl -sk https://localhost:3443/api/public/info
echo

echo "全部测试完成"