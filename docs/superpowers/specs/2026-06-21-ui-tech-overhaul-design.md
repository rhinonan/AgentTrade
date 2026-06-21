# UI 科技感升级 — 设计文档

> 日期: 2026-06-21
> 状态: 已确认
> 方向: Futuristic Finance — 深海军蓝 + 青蓝玻璃 + 环境光效

## 概述

对 AgentTrade Web 前端进行全面视觉升级，将当前基于 GitHub Dark 配色的功能性界面改造为具有科技感和未来感的金融分析平台。采用深海军蓝底色、青蓝辉光、玻璃拟态面板等设计元素，营造 Bloomberg Terminal 混合 Sci-Fi 的视觉氛围。

## 设计范围

- **全部组件**: AppHeader, InputPanel, StockInput, SectorInput, WorkflowSelect, ModelSelect, StepProgress, LiveLog, FlowView, SentimentChart, FindingList, ConclusionCard, ReportView
- **全局样式**: 根背景、排版、动画、滚动条

## 色彩系统

### 底色层
| Token | 值 | 用途 |
|-------|-----|------|
| `bg-root` | `#060b14` | 页面根背景，最深色 |
| `bg-surface` | `#0d1525` | 面板/卡片纯色背景 |
| `bg-surface-glass` | `rgba(13, 21, 37, 0.65)` | 玻璃面板背景 |
| `border-default` | `#1a2a45` | 默认边框（蓝底调） |
| `border-glass` | `rgba(0, 212, 255, 0.15)` | 玻璃面板边框（青蓝半透明） |

### 强调色
| Token | 值 | 用途 |
|-------|-----|------|
| `accent-cyan` | `#00d4ff` | 主强调色：聚焦、激活、Agent名、辉光 |
| `accent-teal` | `#00e5a0` | 正向：看多、成功、完成 |
| `accent-rose` | `#ff4466` | 负向：看空、错误 |
| `accent-amber` | `#f0b90b` | 警告/中性 |

### 文字色
| Token | 值 | 用途 |
|-------|-----|------|
| `text-primary` | `#e8ecf2` | 主要内容 |
| `text-secondary` | `#8899b4` | 标签、次级信息 |
| `text-muted` | `#4a5568` | 占位符、禁用态 |

## 视觉效果规范

### 玻璃面板 (Glassmorphism)
所有卡片、面板、输入区域使用：
```
background: rgba(13, 21, 37, 0.65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(0, 212, 255, 0.15);
border-radius: 8px;
```

### 辉光系统
| 级别 | CSS | 应用场景 |
|------|-----|---------|
| subtle | `box-shadow: 0 0 8px rgba(0,212,255,0.12)` | 卡片默认态 |
| focus | `box-shadow: 0 0 12px rgba(0,212,255,0.25)` | 输入框聚焦 |
| active | `box-shadow: 0 0 20px rgba(0,212,255,0.35)` | 运行中脉冲动画 |
| strong | `box-shadow: 0 0 15px rgba(0,212,255,0.4)` | 主按钮 |

### 渐变
- 面板顶部光晕: `linear-gradient(180deg, rgba(0,212,255,0.06) 0%, transparent 40%)`
- 主按钮: `linear-gradient(135deg, #00d4ff, #0088aa)`
- 看多进度条: `linear-gradient(90deg, #00e5a0, #00d4ff)`
- 看空进度条: `linear-gradient(90deg, #ff4466, #ff7799)`
- 标题文字渐变: `linear-gradient(90deg, #00d4ff, #00e5a0)`

### 动画
- 脉冲辉光: `@keyframes glow-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }`
- 扫描线: 终端日志区域的半透明横向扫描线
- 淡入: 组件挂载时 `opacity + translateY` 过渡
- 进度条: `transition: width 0.6s ease-out`

## 组件设计

### 1. 全局布局 (App.vue)
- 根背景 `#060b14`
- 全局字体 `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- `letter-spacing: 0.02em` 标题
- 自定义滚动条: 细条、深色底、青蓝拖动条

### 2. AppHeader
- 玻璃面板背景 + 底部青蓝辉光边框
- 标题 "AgentTrade" 使用青蓝→青绿渐变文字 (`background-clip: text`)
- ALPHA 徽章: 青蓝边框、半透明青蓝背景、脉冲动画
- 副标题使用 `text-secondary` 色

### 3. InputPanel + 表单组件
- 每个输入组: 标签 `text-secondary`，`letter-spacing: 0.03em`
- 输入框/下拉框: 深底色 `#060b14`、玻璃边框、聚焦时青蓝辉光
- 输入框顶部微弱高光线
- 下拉框自定义展开面板: 玻璃背景
- 主按钮: 青蓝渐变、hover 增强辉光 + 微缩放、disabled 降灰
- 运行中: 按钮文字改为 CSS 旋转环 + "分析中..."
- 新分析按钮: 玻璃面板风格、hover 变亮

### 4. StepProgress
- 改为横向时间线，步骤间用细线连接 (`#1a2a45`)
- 每个步骤: 玻璃胶囊，顶部状态指示圆点
- 运行中: 青蓝辉光脉冲 + 边框动画
- 完成: 青绿圆点
- 错误: 玫红圆点 + 抖动动画
- 待处理: 灰色圆点

### 5. LiveLog
- 深色终端风格容器
- 半透明扫描线叠加层 (CSS animation)
- 日志行: 时间戳灰色、Agent名青蓝、内容按 sentiment 着色
- 头部运行指示器: 青蓝脉冲圆点
- 自动滚动保持平滑

### 6. SentimentChart
- 横向条: 渐变填充（看多青绿、看空玫红、中性灰蓝）
- 数字使用等宽字体，增强数据感
- 标签改为药丸形小徽章

### 7. FindingList
- 每张卡片: 玻璃面板 + 左侧 sentiment 色发光条 (3px)
- Agent 名青蓝色、置信度改为迷你进度环
- 论据列表使用 `▸` 箭头替代默认圆点

### 8. ConclusionCard
- 玻璃面板 + 顶部青蓝辉光条
- 正文 `text-primary`，舒适行高
- 顶部微弱渐变背景

## 技术实现

### 方式
使用 Tailwind CSS v4 自定义主题 + CSS 变量。主要改动：
- `App.vue` 全局 `<style>` 块定义 CSS 变量、动画 keyframes、滚动条样式
- 各组件模板中的 class 替换为新的颜色/效果 class
- 利用 Tailwind v4 的任意值语法 (`bg-[color]`, `shadow-[...]`)

### 不变更
- 组件结构、逻辑、props/emits
- Pinia store
- WebSocket 连接
- 路由（无路由）
- 布局骨架（侧边栏+主内容区）

## 参考文件
- 视觉参考: `docs/superpowers/visual-reference.md`
