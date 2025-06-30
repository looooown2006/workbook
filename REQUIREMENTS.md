# 刷题应用 - 环境要求和依赖安装指南

## 系统要求

### 基础环境
- **Node.js**: >= 18.0.0 (推荐 18.17.0 或更高版本)
- **npm**: >= 9.0.0 (通常随 Node.js 一起安装)
- **操作系统**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)

### 浏览器支持
- **Chrome**: >= 90
- **Firefox**: >= 88
- **Safari**: >= 14
- **Edge**: >= 90

## 安装步骤

### 1. 安装 Node.js
```bash
# 方式1: 从官网下载安装包
# https://nodejs.org/

# 方式2: 使用包管理器 (推荐)
# Windows (使用 Chocolatey)
choco install nodejs

# macOS (使用 Homebrew)
brew install node

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 验证安装
```bash
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 9.x.x 或更高
```

### 3. 克隆项目并安装依赖
```bash
# 克隆项目
git clone <repository-url>
cd quiz-app

# 安装项目依赖
npm install
```

## 核心依赖说明

### 前端框架和构建工具
- **React**: ^18.2.0 - 前端UI框架
- **TypeScript**: ^5.2.2 - 类型安全的JavaScript
- **Vite**: ^5.4.10 - 现代化构建工具
- **Ant Design**: ^5.21.6 - UI组件库

### 状态管理和数据存储
- **Zustand**: ^5.0.1 - 轻量级状态管理
- **IndexedDB**: 浏览器本地数据库 (无需安装)

### AI和解析功能
- **OpenAI API**: 需要API密钥
- **Tesseract.js**: ^5.1.1 - OCR文字识别
- **PDF.js**: ^4.8.69 - PDF文件解析

### 图表和可视化
- **Recharts**: ^2.12.7 - 数据可视化图表
- **Ant Design Charts**: ^2.2.1 - 高级图表组件

### 工具库
- **Lodash**: ^4.17.21 - 实用工具函数
- **Day.js**: ^1.11.13 - 日期处理
- **React Router**: ^6.28.0 - 路由管理

## 开发环境配置

### 1. 开发服务器
```bash
# 启动开发服务器
npm run dev

# 访问地址: http://localhost:5173
```

### 2. 构建生产版本
```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 3. 类型检查
```bash
# 运行TypeScript类型检查
npm run type-check
```

## AI服务配置

### 支持的AI服务商
1. **OpenAI** (推荐)
   - 需要API密钥
   - 支持GPT-3.5/GPT-4模型

2. **硅基流动**
   - 需要API密钥
   - 支持多种开源模型

3. **其他兼容OpenAI API的服务**
   - 任何支持OpenAI API格式的服务

### 配置方法
1. 在应用设置中配置AI服务
2. 输入API密钥和服务地址
3. 选择合适的模型

## 可选功能依赖

### PWA支持
- **Workbox**: 自动配置 - 离线缓存和PWA功能
- **Web App Manifest**: 自动生成 - 应用安装支持

### 桌面应用 (可选)
如需构建桌面应用，需要额外安装:
```bash
# Electron相关依赖 (仅在需要桌面版时安装)
npm install --save-dev electron
npm install --save-dev electron-builder
```

## 故障排除

### 常见问题

1. **Node.js版本过低**
   ```bash
   # 升级Node.js到最新LTS版本
   npm install -g n
   n lts
   ```

2. **依赖安装失败**
   ```bash
   # 清除缓存重新安装
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **构建失败**
   ```bash
   # 检查TypeScript错误
   npm run type-check
   
   # 清除构建缓存
   rm -rf dist
   npm run build
   ```

4. **端口占用**
   ```bash
   # 使用不同端口启动
   npm run dev -- --port 3000
   ```

### 性能优化建议

1. **内存要求**: 建议至少4GB RAM
2. **存储空间**: 项目需要约500MB磁盘空间
3. **网络**: 首次安装需要下载约200MB依赖

## 部署要求

### 静态部署
- 任何支持静态文件的服务器
- 推荐: Vercel, Netlify, GitHub Pages

### 服务器要求
- 无需后端服务器
- 纯前端应用，支持静态部署
- 需要HTTPS支持AI API调用

## 更新维护

### 依赖更新
```bash
# 检查过时的依赖
npm outdated

# 更新依赖
npm update

# 更新到最新版本 (谨慎使用)
npx npm-check-updates -u
npm install
```

### 安全检查
```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix
```

---

## 技术支持

如遇到安装或配置问题，请检查:
1. Node.js和npm版本是否符合要求
2. 网络连接是否正常
3. 防火墙是否阻止了npm下载
4. 是否有足够的磁盘空间

更多技术细节请参考项目文档或提交Issue。
