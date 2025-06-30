# 刷题应用 - 部署指南

## 🚀 快速部署

### 方式一：静态部署（推荐）

#### Vercel 部署
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 生产部署
vercel --prod
```

#### Netlify 部署
```bash
# 1. 构建项目
npm run build

# 2. 上传 dist 文件夹到 Netlify
# 或使用 Netlify CLI
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### GitHub Pages 部署
```bash
# 1. 安装 gh-pages
npm install --save-dev gh-pages

# 2. 在 package.json 中添加部署脚本
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# 3. 部署
npm run deploy
```

### 方式二：服务器部署

#### Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/quiz-app/dist;
    index index.html;

    # 支持 SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### Apache 配置
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/quiz-app/dist
    
    # 支持 SPA 路由
    <Directory "/path/to/quiz-app/dist">
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## 🔧 环境配置

### 生产环境变量
创建 `.env.production` 文件：
```env
# API 配置
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_TITLE=刷题学习工具
VITE_APP_VERSION=1.0.0

# AI 服务配置（可选，用户可在应用内配置）
VITE_DEFAULT_AI_PROVIDER=openai
VITE_DEFAULT_AI_MODEL=gpt-3.5-turbo
```

### PWA 配置
应用已内置 PWA 支持，用户可以：
1. 在浏览器中访问应用
2. 点击地址栏的"安装"按钮
3. 将应用添加到桌面，像原生应用一样使用

## 📱 移动端优化

### 响应式设计
- ✅ 已适配手机、平板、桌面端
- ✅ 支持横屏和竖屏模式
- ✅ 触摸友好的交互设计

### 性能优化
```bash
# 分析构建产物
npm run build
npx vite-bundle-analyzer dist

# 优化建议已内置：
# - 代码分割
# - 懒加载
# - 资源压缩
# - 缓存策略
```

## 🔐 安全配置

### HTTPS 配置
```bash
# 使用 Let's Encrypt 免费证书
sudo certbot --nginx -d your-domain.com
```

### 安全头配置
```nginx
# 添加到 Nginx 配置
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 🎯 AI 服务配置

### 支持的 AI 服务商
1. **OpenAI**
   - API 地址：`https://api.openai.com/v1`
   - 推荐模型：`gpt-3.5-turbo`, `gpt-4`

2. **硅基流动**
   - API 地址：`https://api.siliconflow.cn/v1`
   - 支持多种开源模型

3. **其他兼容服务**
   - 任何支持 OpenAI API 格式的服务

### 用户配置指南
用户需要在应用设置中配置：
1. 选择 AI 服务提供商
2. 输入 API 密钥
3. 选择合适的模型
4. 测试连接

## 📊 监控和分析

### 性能监控
```javascript
// 可选：添加性能监控
// 在 src/main.tsx 中添加
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('页面加载时间:', perfData.loadEventEnd - perfData.fetchStart);
  });
}
```

### 错误监控
```javascript
// 可选：添加错误监控
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  // 可以发送到错误监控服务
});
```

## 🔄 更新和维护

### 自动更新检查
```bash
# 检查依赖更新
npm outdated

# 更新依赖
npm update

# 安全检查
npm audit
npm audit fix
```

### 备份策略
```bash
# 定期备份用户数据（IndexedDB）
# 用户可以在应用设置中导出数据
# 建议提醒用户定期备份
```

## 🐛 故障排除

### 常见问题

1. **白屏问题**
   ```bash
   # 检查控制台错误
   # 确认路由配置正确
   # 检查静态资源路径
   ```

2. **AI 功能不可用**
   ```bash
   # 检查 API 密钥配置
   # 确认网络连接
   # 验证 CORS 设置
   ```

3. **数据丢失**
   ```bash
   # IndexedDB 数据在浏览器本地存储
   # 清除浏览器数据会导致数据丢失
   # 建议用户定期导出备份
   ```

### 日志收集
```javascript
// 开发环境启用详细日志
if (import.meta.env.DEV) {
  console.log('开发模式：详细日志已启用');
}
```

## 📈 扩展建议

### 功能扩展
1. **用户系统** - 添加用户注册和登录
2. **云端同步** - 支持数据云端备份
3. **社区功能** - 题目分享和讨论
4. **统计分析** - 更详细的学习数据分析

### 技术升级
1. **服务端渲染** - 考虑使用 Next.js 或 Nuxt.js
2. **微前端** - 模块化架构，支持独立部署
3. **原生应用** - 使用 Tauri 或 Electron 构建桌面应用
4. **移动应用** - 使用 Capacitor 构建移动应用

---

## 🎉 部署检查清单

- [ ] 环境要求满足（Node.js 18+）
- [ ] 依赖安装完成（`npm install`）
- [ ] 构建成功（`npm run build`）
- [ ] 预览测试通过（`npm run preview`）
- [ ] 域名和 SSL 证书配置
- [ ] 服务器配置（Nginx/Apache）
- [ ] 安全头设置
- [ ] 性能优化配置
- [ ] 监控和日志配置
- [ ] 备份策略制定

**部署完成后，您的刷题应用就可以正式投入使用了！** 🚀
