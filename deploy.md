# 木基材料 AI 助手部署文档

## 项目简介
木基材料综合问答助手，基于 Express + 阿里云百炼 API 构建。

## 目录结构
```
/var/www/wood-materials-ai/
├── server.js          # 主入口文件
├── package.json       # 项目配置
├── ecosystem.config.cjs # PM2 配置
├── .env               # 环境变量
├── .env.example       # 环境变量模板
├── index-ai.html      # 前端页面
├── fig/               # 图片资源
├── ppt网页图/          # 图片资源
├── logs/              # 日志目录
└── node_modules/      # 依赖包
```

## 部署步骤

### 1. 系统准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装依赖
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
```

### 2. 代码部署
```bash
# 创建目录
sudo mkdir -p /var/www/wood-materials-ai
sudo chown -R $USER:$USER /var/www/wood-materials-ai

# 复制代码
# 使用 scp 或 git 克隆

# 安装依赖
cd /var/www/wood-materials-ai
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入实际的 API Key
```

### 3. 服务启动
```bash
# 启动服务
npm run prod

# 保存进程
npm run prod:status
pm2 save

# 设置开机自启
pm2 startup systemd
sudo systemctl enable pm2-$USER
```

### 4. Nginx 配置
```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/wood-materials-ai
# 粘贴 Nginx 配置

# 启用配置
sudo ln -s /etc/nginx/sites-available/wood-materials-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. HTTPS 配置
```bash
# 生成证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 运维命令

### 服务管理
- **启动**：`npm run prod`
- **停止**：`npm run prod:stop`
- **重启**：`npm run prod:restart`
- **查看状态**：`npm run prod:status`
- **查看日志**：`npm run prod:logs`

### Nginx 管理
- **测试配置**：`sudo nginx -t`
- **重载**：`sudo systemctl reload nginx`
- **重启**：`sudo systemctl restart nginx`
- **查看状态**：`sudo systemctl status nginx`

### 日志管理
- **应用日志**：`logs/app.log`
- **错误日志**：`logs/error.log`
- **Nginx 日志**：`/var/log/nginx/`

## 更新部署
1. 停止服务：`npm run prod:stop`
2. 复制新代码
3. 安装依赖：`npm install`
4. 启动服务：`npm run prod`
5. 验证健康检查：`curl http://127.0.0.1:3000/health`

## 回滚操作
1. 停止服务：`npm run prod:stop`
2. 恢复旧代码
3. 启动服务：`npm run prod`

## 故障排查
- **502 错误**：检查 PM2 服务是否运行，端口是否正确
- **404 错误**：检查文件路径是否正确，Nginx 配置是否正确
- **SSL 失败**：检查证书是否过期，域名解析是否正确
- **环境变量未生效**：检查 .env 文件是否正确配置，PM2 是否重启
