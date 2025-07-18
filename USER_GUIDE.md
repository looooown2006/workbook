# 刷题学习工具 - 用户使用指南

## 🎯 快速开始

### 第一次使用
1. **启动应用**
   - Windows: 双击 `start.bat`
   - Mac/Linux: 运行 `./start.sh`
   - 或手动运行: `npm run dev`

2. **访问应用**
   - 浏览器自动打开 http://localhost:5173
   - 如未自动打开，请手动访问该地址

3. **创建第一个题库**
   - 点击左侧"新建题库"按钮
   - 输入题库名称和描述
   - 点击"确定"创建

## 📚 核心功能

### 1. 题库管理
- **创建题库**: 点击"新建题库"按钮
- **选择题库**: 点击题库名称进行选择
- **编辑题库**: 点击题库右侧的编辑按钮
- **删除题库**: 点击题库右侧的删除按钮

### 2. 智能导入题目
#### 使用文本导入
1. 选择题库后，点击"导入题目"
2. 在文本框中输入题目内容，格式如下：
```
1. 这是题目内容？
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案：B
解析：这里是解析内容
```

3. 点击"AI智能解析"
4. 系统自动识别题目并分配章节
5. 确认章节分配，点击"下一步"
6. 查看导入摘要，点击"确认导入"

#### 使用文件识别
1. 点击"文件识别"标签
2. 上传图片或PDF文件（支持JPG、PNG、WebP、PDF）
3. 系统自动进行OCR识别
4. 后续步骤与文本导入相同

### 3. 学习模式

#### 背题模式
- 适合深度学习，显示完整题目和解析
- 可以仔细阅读每道题的详细解释
- 支持标记掌握状态

#### 快刷模式
- 适合快速复习，点击选项后立即显示答案
- 1秒后自动跳转下一题
- 提高刷题效率

#### 刷题模式
- 传统的练习模式
- 手动控制进度
- 适合正式练习

#### 测试模式
- 模拟考试环境
- 限时答题
- 完成后显示成绩和错题分析

### 4. 错题本功能
- 自动收集答错的题目
- 支持错题分类和标签
- 提供错题复习模式
- 智能推荐相似题目

### 5. 统计分析
- 学习进度跟踪
- 答题准确率统计
- 知识点掌握情况
- 学习时间分析

### 6. 学习计划
- 制定个性化学习计划
- 设置学习目标和时间
- 跟踪计划执行情况
- 智能调整学习节奏

## ⚙️ 设置配置

### AI 服务配置
1. 点击右上角"设置"按钮
2. 选择AI服务提供商：
   - **OpenAI**: 需要API密钥，支持GPT-3.5/GPT-4
   - **硅基流动**: 需要API密钥，支持多种开源模型
   - **其他**: 任何兼容OpenAI API的服务

3. 输入API密钥和服务地址
4. 选择合适的模型
5. 点击"测试连接"验证配置

### 数据管理
- **数据导出**: 在设置中可以导出所有数据
- **数据导入**: 支持导入之前导出的数据
- **数据清除**: 可以清除所有本地数据

## 💡 使用技巧

### 题目导入技巧
1. **批量导入**: 一次可以导入多道题目
2. **格式灵活**: 支持多种文本格式，AI会自动识别
3. **章节智能**: 系统会根据题目内容自动分配章节
4. **手动调整**: 可以手动调整章节分配

### 学习效率提升
1. **制定计划**: 使用学习计划功能制定每日目标
2. **错题重点**: 重点复习错题本中的题目
3. **模式切换**: 根据学习阶段选择合适的模式
4. **统计分析**: 定期查看学习统计，调整学习策略

### 数据安全
1. **定期备份**: 建议定期导出数据进行备份
2. **浏览器数据**: 数据存储在浏览器本地，清除浏览器数据会丢失
3. **多设备同步**: 可以通过导出/导入在多设备间同步数据

## 🔧 故障排除

### 常见问题

#### 应用无法启动
- 检查Node.js版本（需要18.0.0+）
- 运行 `npm install` 重新安装依赖
- 检查端口5173是否被占用

#### AI功能不可用
- 检查网络连接
- 验证API密钥是否正确
- 确认API服务商地址是否正确
- 检查API额度是否充足

#### 题目导入失败
- 检查题目格式是否正确
- 确认AI服务配置是否正常
- 尝试分批导入，避免一次导入过多

#### 数据丢失
- 检查浏览器是否清除了本地数据
- 尝试从备份文件恢复数据
- 确认是否在同一浏览器和设备上使用

### 性能优化
- 定期清理不需要的题库和题目
- 避免同时打开过多标签页
- 使用现代浏览器以获得最佳性能

## 📱 移动端使用

### PWA 安装
1. 在手机浏览器中访问应用
2. 点击浏览器菜单中的"添加到主屏幕"
3. 应用将像原生应用一样安装到手机

### 移动端优化
- 界面自动适配手机屏幕
- 支持触摸操作
- 优化了移动端的交互体验

## 🎓 学习建议

### 制定学习计划
1. **评估基础**: 先做一套测试题了解自己的水平
2. **设定目标**: 制定明确的学习目标和时间表
3. **分阶段学习**: 将学习内容分解为小的阶段
4. **定期复习**: 利用错题本功能定期复习

### 高效刷题策略
1. **先学后练**: 先学习理论知识，再进行练习
2. **错题重点**: 重点关注和复习错题
3. **模拟考试**: 定期进行模拟考试检验学习效果
4. **总结归纳**: 定期总结知识点和解题技巧

---

## 🆘 获取帮助

如果遇到问题或需要帮助：
1. 查看本用户指南
2. 检查 `REQUIREMENTS.md` 了解环境要求
3. 查看 `PROJECT_SUMMARY.md` 了解项目详情
4. 查看浏览器控制台的错误信息

**祝您学习愉快，考试顺利！** 🎉
