# UI Redesign: Top Nav + Blue Theme + Entry Page Layout

## Summary

Three coordinated UI changes to the AgentTrade Next.js app:
1. Add a persistent top navigation bar with four tabs and a login placeholder
2. Replace the green/emerald theme with blue (green = "down" in A-share convention)
3. Redesign the analysis entry page (`/analyze`) from centered single-column to left-right layout

## Theme Change: Emerald → Blue

**Rationale:** In Chinese A-share markets, green represents price decline. Blue is a neutral, professional color suitable for a financial analysis platform.

**Scope:**
- `app/globals.css` — ambient glow gradients, keyframes, `.glow-hover`, `.text-glow` all switch from emerald/teal rgba to blue rgba
- All component `.tsx` files — replace `emerald-*` Tailwind classes with `blue-*`
- Status indicators — running state dot changes from `bg-emerald-400` to `bg-blue-400`
- Search dropdown highlights, link colors, button backgrounds follow suit

**Color mapping (Tailwind blue scale):**
- Primary action / accent: `blue-500` / `blue-600`
- Glow / emphasis: `blue-400`
- Muted / subdued: `blue-500/10`, `blue-500/20`

## Top Navigation (`components/layout/TopNav.tsx`)

### Placement
Mounted in `app/layout.tsx` `<body>`, above `{children}`, visible on every page including landing.

### Structure
```
┌─────────────────────────────────────────────────────┐
│  AgentTrade   个股分析  行业拆解  策略回溯  许愿池    [登录] │
└─────────────────────────────────────────────────────┘
```

- **Brand:** "AgentTrade" text on the far left (links to `/`)
- **Tabs:** 4 navigation items with active-route highlighting (Next.js `usePathname`)
- **Login:** Far right button, placeholder for future auth
- **Mobile:** Tabs collapse to horizontal scroll or hamburger (TBD based on width)

### Tabs

| Tab | Route | Content |
|-----|-------|---------|
| 个股分析 | `/analyze` | Current analysis entry + workflow selector |
| 行业拆解 | `/industry` | Placeholder blank page |
| 策略回溯 | `/backtest` | Placeholder blank page |
| 许愿池 | `/wishpool` | Placeholder blank page |

### New placeholder pages

- `app/industry/page.tsx` — centered "行业拆解 — 即将上线" card
- `app/backtest/page.tsx` — centered "策略回溯 — 即将上线" card
- `app/wishpool/page.tsx` — centered "许愿池 — 即将上线" card

## Analysis Entry Page Layout Redesign (`app/analyze/page.tsx`)

### Before (current)
Single centered column (max-w-lg), stacked vertically:
- Title
- Stock search input
- Workflow selector
- Start button
- Recent analyses (bottom)

### After (new)
Two-panel layout:

**Desktop (md+):**
```
┌────────────────────┬──────────────────────────┐
│  历史记录 (40%)     │  股票代码输入 (60%)        │
│                    │                          │
│  RecentAnalyses    │  StockSearchInput        │
│  (scrollable list) │  WorkflowSelector        │
│                    │  [开始分析] button         │
│                    │  Error message           │
└────────────────────┴──────────────────────────┘
```

**Mobile (< md):**
```
┌────────────────────┐
│  股票代码输入        │
│  ...               │
│  [开始分析]          │
├────────────────────┤
│  历史记录           │
│  RecentAnalyses    │
│  (scrollable list) │
└────────────────────┘
```

- Left panel: `RecentAnalyses` with independent scroll (`overflow-y-auto`, max-height constrained to viewport)
- Right panel: Input form (search + workflow selector + button)
- Gap between panels: standard spacing with subtle border divider on desktop
- Page title "AgentTrade" removed (brand is in nav now); the page is just the functional UI

## Implementation Order

1. Theme color swap — replace all emerald classes across all files
2. TopNav component + wiring into layout + placeholder pages
3. `/analyze` page layout restructure
4. Visual verification (run the app, check all pages)

## Files Affected

| File | Change |
|------|--------|
| `app/layout.tsx` | Import and render `<TopNav />` above `{children}` |
| `app/globals.css` | Replace emerald/teal rgba with blue rgba in all glow rules |
| `app/page.tsx` | Replace emerald classes with blue |
| `app/analyze/page.tsx` | Full restructure to left-right layout |
| `components/layout/TopNav.tsx` | **New** — navigation bar component |
| `components/landing/RecentAnalyses.tsx` | Adjust for left-panel usage (remove navigation link, adjust height) |
| `components/landing/StockSearchInput.tsx` | emerald → blue |
| `components/landing/WorkflowSelector.tsx` | emerald → blue |
| `components/analysis/*.tsx` | emerald → blue (AnalysisHeader, StepProgress, LiveDebatePanel, AgentBubble, ConclusionCard, DataPanel) |
| `components/chat/*.tsx` | emerald → blue (ChatInput, ChatPanel, MessageBubble, StructuredAnalysis, SystemMessage) |
| `app/industry/page.tsx` | **New** — placeholder |
| `app/backtest/page.tsx` | **New** — placeholder |
| `app/wishpool/page.tsx` | **New** — placeholder |
| `app/history/page.tsx` | emerald → blue |
| `app/session/[id]/page.tsx` | emerald → blue (if any) |
| `app/analyze/[id]/page.tsx` | emerald → blue (if any) |
