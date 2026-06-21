# AgentTrade UI 视觉参考

> 最后更新: 2026-06-21
> 方向: Futuristic Finance — 深海军蓝 + 青蓝玻璃 + 环境光效

## 色彩系统

### 底色层
| Token | Hex | 用途 |
|-------|-----|------|
| `bg-root` | `#060b14` | 页面根背景 |
| `bg-surface` | `#0d1525` | 面板/卡片背景 |
| `bg-surface-glass` | `rgba(13, 21, 37, 0.65)` | 玻璃面板（带 blur） |
| `border-default` | `#1a2a45` | 默认边框 |
| `border-glass` | `rgba(0, 212, 255, 0.15)` | 玻璃面板边框 |

### 强调色
| Token | Hex | 用途 |
|-------|-----|------|
| `accent-cyan` | `#00d4ff` | 主强调色（聚焦、激活、链接） |
| `accent-teal` | `#00e5a0` | 正向/看多/成功 |
| `accent-rose` | `#ff4466` | 负向/看空/错误 |
| `accent-amber` | `#f0b90b` | 警告/中性 |

### 文字色
| Token | Hex | 用途 |
|-------|-----|------|
| `text-primary` | `#e8ecf2` | 主文本 |
| `text-secondary` | `#8899b4` | 次级文本／标签 |
| `text-muted` | `#4a5568` | 占位／禁用 |

## 视觉效果

### 玻璃面板 (Glassmorphism)
```
background: rgba(13, 21, 37, 0.65);
backdrop-filter: blur(12px);
border: 1px solid rgba(0, 212, 255, 0.15);
border-radius: 8px;
```

### 辉光层级
| 级别 | Box Shadow | 场景 |
|------|-----------|------|
| `glow-subtle` | `0 0 8px rgba(0, 212, 255, 0.12)` | 卡片默认 |
| `glow-focus` | `0 0 12px rgba(0, 212, 255, 0.25)` | 输入框聚焦 |
| `glow-active` | `0 0 20px rgba(0, 212, 255, 0.35)` | 运行中脉冲 |
| `glow-strong` | `0 0 15px rgba(0, 212, 255, 0.4)` | 主按钮 |

### 渐变
- **面板顶部**: `linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, transparent 40%)`
- **按钮**: `linear-gradient(135deg, #00d4ff, #00a8cc)`
- **看多条**: `linear-gradient(90deg, #00e5a0, #00d4ff)`
- **看空条**: `linear-gradient(90deg, #ff4466, #ff6680)`

## 排版
- 字体: 系统字体栈 (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- 标题 `letter-spacing: 0.02em`
- 数据/代码: `"JetBrains Mono", "Fira Code", monospace`

## 参考风格
- 方向: Bloomberg Terminal + Sci-Fi ambient
- 关键特征: 玻璃面板、青蓝辉光、脉冲动画、深海军蓝底色
- 避免: 灰色边框、纯平坦矩形、emoji 图标（用 SVG/CSS 替代）
