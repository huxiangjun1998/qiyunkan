# 奇云爱看 - 视频播放平台

一个现代化的视频播放平台，具有AI助手功能。

## 功能特点

- 流畅的视频播放体验
- AI智能助手陪伴
- 用户账户系统
- 移动端适配
- 实时对话功能

## 部署说明

### 环境要求

- Node.js >= 14.0.0
- 现代浏览器支持
- 支持 HTTPS

### 安装步骤

1. 克隆代码库：
```bash
git clone [repository-url]
cd [project-directory]
```

2. 安装依赖：
```bash
npm install -g uglify-js clean-css-cli
```

3. 运行部署脚本：
```bash
chmod +x deploy.sh
./deploy.sh
```

4. 配置服务器：
- 将 dist 目录下的文件上传到服务器
- 配置 HTTPS 证书
- 设置正确的 CORS 策略

### 配置说明

1. API 配置
- 在 app.js 中设置正确的 API 密钥
- 配置 CDN 域名

2. 域名设置
- 配置域名解析
- 启用 HTTPS

## 安全注意事项

- 确保 API 密钥安全
- 启用 HTTPS
- 配置适当的 CORS 策略
- 定期更新依赖

## 维护说明

- 定期检查日志
- 监控服务器状态
- 更新安全补丁
- 备份用户数据

## 技术支持

如有问题，请联系技术支持。 