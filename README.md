# demo-server

Node.js + Express 5 后端示例：HTTP / HTTPS / WS / WSS 四协议、Token 鉴权、
文件上传下载、Excel 导入导出、多路 WebSocket 推送。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 生成自签名证书（一键脚本）
bash certs/gen-cert.sh

# 3. 复制环境变量
cp .env.example .env

# 4. 启动（开发模式，nodemon 热重载）
npm run dev



# 进入项目根目录
mkdir -p certs && cd certs

# ------------------------------------------------------------
# 方式 A：一行命令（OpenSSL 1.1.1+ 支持 -addext）
# ------------------------------------------------------------
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout server.key -out server.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Demo/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

# ------------------------------------------------------------
# 方式 B：用配置文件（兼容 OpenSSL 1.0.x）
# ------------------------------------------------------------
# 先创建 openssl.cnf（内容见上文 2.1）
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout server.key -out server.crt -config openssl.cnf

# ------------------------------------------------------------
# 附加操作
# ------------------------------------------------------------

# 1) crt 转 PEM
openssl x509 -in server.crt -out server.pem -outform PEM

# 2) 生成 PKCS#12（.pfx），Windows/IIS 用
openssl pkcs12 -export -out server.pfx \
  -inkey server.key -in server.crt -passout pass:123456

# 3) 从 pfx 里再导出 crt 和 key（反向操作）
openssl pkcs12 -in server.pfx -nocerts -nodes -out from_pfx.key -passin pass:123456
openssl pkcs12 -in server.pfx -clcerts -nokeys -out from_pfx.crt -passin pass:123456

# 4) 查看证书内容（排查 SAN、有效期等问题）
openssl x509 -in server.crt -noout -text

# 5) 只看关键信息
openssl x509 -in server.crt -noout -subject -issuer -dates -ext subjectAltName

# 6) 校验 key 和 crt 是否匹配（两个 md5 应完全一致）
openssl x509 -noout -modulus -in server.crt | openssl md5
openssl rsa  -noout -modulus -in server.key | openssl md5

# 7) 校验证书与私钥能否配对成功
openssl rsa -in server.key -check

# 8) 用 openssl 自己起一个 https 服务快速测试证书（可选）
# openssl s_server -accept 8443 -cert server.crt -key server.key -www


---

## 七、启动 & 测试一条龙

```bash
# 1. 安装依赖
npm install

# 2. 生成证书（一键）
bash certs/gen-cert.sh
# 或手动执行：
#   mkdir -p certs && cd certs
#   openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
#     -keyout server.key -out server.crt \
#     -subj "/C=CN/ST=Beijing/L=Beijing/O=Demo/CN=localhost" \
#     -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# 3. 复制环境变量
cp .env.example .env

# 4. 启动（nodemon）
npm run dev