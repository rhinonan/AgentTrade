
### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore` (already exists, verify)
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/agents/package.json`
- Create: `packages/agents/tsconfig.json`
- Create: `packages/data-client/package.json`
- Create: `packages/data-client/tsconfig.json`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

**Interfaces:**
- Consumes: nothing
- Produces: pnpm workspaces monorepo with 4 packages, all building cleanly

- [ ] **Step 1: Write root package.json**

```json
{
  "name": "agenttrade",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "analyze": "pnpm --filter @agenttrade/cli exec agenttrade"
  }
}
```

- [ ] **Step 2: Write pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Write tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 4: Write packages/core/package.json**

```json
{
  "name": "@agenttrade/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "langchain": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 5: Write packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 6: Write packages/agents/package.json**

```json
{
  "name": "@agenttrade/agents",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@agenttrade/core": "workspace:*",
    "@agenttrade/data-client": "workspace:*",
    "@langchain/core": "^0.3.0",
    "langchain": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 7: Write packages/agents/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 8: Write packages/data-client/package.json**

```json
{
  "name": "@agenttrade/data-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 9: Write packages/data-client/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 10: Write packages/cli/package.json**

```json
{
  "name": "@agenttrade/cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "bin": { "agenttrade": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@agenttrade/core": "workspace:*",
    "@agenttrade/agents": "workspace:*",
    "@agenttrade/data-client": "workspace:*",
    "commander": "^12.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 11: Write packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 12: Create placeholder src/index.ts in each package**

`packages/core/src/index.ts`:
```typescript
export const VERSION = "0.1.0";
```

`packages/agents/src/index.ts`:
```typescript
export const VERSION = "0.1.0";
```

`packages/data-client/src/index.ts`:
```typescript
export const VERSION = "0.1.0";
```

`packages/cli/src/index.ts`:
```typescript
console.log("AgentTrade CLI v0.1.0");
```

- [ ] **Step 13: Install dependencies and verify build**

```bash
cd D:\c2 && pnpm install && pnpm build
```
Expected: all 4 packages compile without errors.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "scaffold: pnpm monorepo with core/agents/data-client/cli packages"
```

---

### Task 2: Python Data Microservice — Project Setup & Health Endpoint

**Files:**
- Create: `d2-data/requirements.txt`
- Create: `d2-data/main.py`
- Create: `d2-data/services/__init__.py`
- Create: `d2-data/services/akshare_adapter.py`
- Create: `d2-data/services/indicator_calc.py`
- Create: `d2-data/routers/__init__.py`
- Create: `d2-data/tests/__init__.py`
- Create: `d2-data/tests/test_health.py`

**Interfaces:**
- Consumes: nothing
- Produces: FastAPI app running on `:9500` with `/health` endpoint

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
akshare>=1.14.0
pandas>=2.2.0
numpy>=1.26.0
httpx>=0.27.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
```

- [ ] **Step 2: Write services/akshare_adapter.py**

```python
"""akshare data adapter — single entry point for all akshare calls."""

import akshare as ak
import pandas as pd
from typing import Optional


def get_kline(symbol: str, period: str = "daily", count: int = 120,
              adjust: str = "qfq") -> list[dict]:
    """Get A-share K-line data. symbol format: '600519' (sh), '000001' (sz)."""
    # Determine market prefix for akshare
    code = _normalize_symbol(symbol)
    try:
        df = ak.stock_zh_a_hist(
            symbol=code, period="daily",
            start_date="", end_date="",
            adjust=adjust
        )
    except Exception:
        # Fallback: try without market prefix
        df = ak.stock_zh_a_hist(
            symbol=symbol, period="daily",
            start_date="", end_date="",
            adjust=adjust
        )
    if df is None or df.empty:
        return []
    bars = df.tail(count).to_dict(orient="records")
    return _format_kline_bars(bars, adjust)


def _normalize_symbol(symbol: str) -> str:
    """Convert symbol to akshare format if needed."""
    symbol = symbol.strip()
    if len(symbol) == 6:
        if symbol.startswith(("6", "9")):
            return symbol  # Shanghai
        elif symbol.startswith(("0", "3", "2")):
            return symbol  # Shenzhen/Beijing
        elif symbol.startswith(("4", "8")):
            return symbol  # Beijing
    return symbol


def _format_kline_bars(bars: list[dict], adjust: str) -> list[dict]:
    """Format raw akshare output to standardized bar format."""
    result = []
    for row in bars:
        result.append({
            "date": str(row.get("日期", "")),
            "open": float(row.get("开盘", 0)),
            "high": float(row.get("最高", 0)),
            "low": float(row.get("最低", 0)),
            "close": float(row.get("收盘", 0)),
            "volume": float(row.get("成交量", 0)),
            "amount": float(row.get("成交额", 0)) if "成交额" in row else None,
        })
    return result


def get_stock_info(symbol: str) -> dict | None:
    """Get basic stock information."""
    try:
        df = ak.stock_individual_info_em(symbol=symbol)
        if df is None or df.empty:
            return None
        info = {}
        for _, row in df.iterrows():
            info[row["item"]] = row["value"]
        return {
            "symbol": symbol,
            "name": info.get("股票简称", ""),
            "industry": info.get("行业", ""),
            "marketCap": _parse_float(info.get("总市值", "0")),
            "totalShares": _parse_float(info.get("总股本", "0")),
        }
    except Exception:
        return None


def _parse_float(value: str) -> float:
    """Parse numeric strings with unit suffixes like '1.2万亿'."""
    import re
    value = str(value).replace(",", "").strip()
    if "万亿" in value:
        return float(re.sub(r"[万亿]", "", value)) * 1e12
    elif "亿" in value:
        return float(re.sub(r"[亿]", "", value)) * 1e8
    elif "万" in value:
        return float(re.sub(r"[万]", "", value)) * 1e4
    try:
        return float(value)
    except ValueError:
        return 0.0
```

- [ ] **Step 3: Write services/indicator_calc.py**

```python
"""Technical indicator calculation using pandas/numpy."""

import pandas as pd
import numpy as np
from typing import Optional


def calc_macd(closes: list[float], fast: int = 12, slow: int = 26,
              signal: int = 9) -> list[dict]:
    """Calculate MACD indicators. Returns list of {date_index, dif, dea, histogram}."""
    if len(closes) < slow + signal:
        return []
    closes_series = pd.Series(closes)
    ema_fast = closes_series.ewm(span=fast, adjust=False).mean()
    ema_slow = closes_series.ewm(span=slow, adjust=False).mean()
    dif = ema_fast - ema_slow
    dea = dif.ewm(span=signal, adjust=False).mean()
    histogram = 2 * (dif - dea)
    result = []
    for i in range(len(closes)):
        result.append({
            "index": i,
            "dif": round(float(dif.iloc[i]), 4) if not pd.isna(dif.iloc[i]) else None,
            "dea": round(float(dea.iloc[i]), 4) if not pd.isna(dea.iloc[i]) else None,
            "histogram": round(float(histogram.iloc[i]), 4) if not pd.isna(histogram.iloc[i]) else None,
        })
    return result


def calc_rsi(closes: list[float], period: int = 14) -> list[Optional[float]]:
    """Calculate RSI values. Returns list of RSI values (None for first `period` entries)."""
    if len(closes) < period + 1:
        return [None] * len(closes)
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.zeros(len(closes))
    avg_loss = np.zeros(len(closes))
    avg_gain[period] = np.mean(gains[:period])
    avg_loss[period] = np.mean(losses[:period])
    for i in range(period + 1, len(closes)):
        avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
        avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period
    rsi = np.zeros(len(closes))
    for i in range(period, len(closes)):
        if avg_loss[i] == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain[i] / avg_loss[i]
            rsi[i] = 100.0 - (100.0 / (1.0 + rs))
    return [round(float(rsi[i]), 2) if i >= period and rsi[i] > 0 else None
            for i in range(len(closes))]


def calc_ma(closes: list[float], periods: list[int] = [5, 10, 20, 60]) -> dict[str, list[Optional[float]]]:
    """Calculate Moving Averages. Returns {f"ma{p}": [values]}."""
    result = {}
    for p in periods:
        ma_series = pd.Series(closes).rolling(window=p).mean()
        result[f"ma{p}"] = [round(float(v), 2) if not pd.isna(v) else None
                            for v in ma_series.tolist()]
    return result


def calc_bollinger(closes: list[float], period: int = 20,
                   std_dev: int = 2) -> dict[str, list[Optional[float]]]:
    """Calculate Bollinger Bands."""
    ma = pd.Series(closes).rolling(window=period).mean()
    std = pd.Series(closes).rolling(window=period).std()
    upper = ma + std_dev * std
    lower = ma - std_dev * std
    return {
        "middle": [round(float(v), 2) if not pd.isna(v) else None for v in ma.tolist()],
        "upper": [round(float(v), 2) if not pd.isna(v) else None for v in upper.tolist()],
        "lower": [round(float(v), 2) if not pd.isna(v) else None for v in lower.tolist()],
    }
```

- [ ] **Step 4: Write routers/__init__.py** — empty file

- [ ] **Step 5: Write main.py with /health endpoint**

```python
"""AgentTrade Data Service — FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AgentTrade Data Service",
    version="0.1.0",
    description="Market data microservice for the AgentTrade analysis framework",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agenttrade-data", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9500, reload=True)
```

- [ ] **Step 6: Write tests/test_health.py**

```python
"""Tests for health endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.mark.asyncio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "agenttrade-data"
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd D:\c2\d2-data && python -m pytest tests/test_health.py -v
```
Expected: 1 test PASS

- [ ] **Step 8: Commit**

```bash
git add d2-data/
git commit -m "feat: Python data service with health endpoint and akshare adapter"

---

### Task 3: Python Data Service — Kline, Financial, Reference, Sector Routers

**Files:**
- Create: `d2-data/routers/kline.py`
- Create: `d2-data/routers/financial.py`
- Create: `d2-data/routers/reference.py`
- Create: `d2-data/routers/sector.py`
- Modify: `d2-data/main.py` (register routers)
- Create: `d2-data/tests/test_routers.py`

**Interfaces:**
- Consumes: `services/akshare_adapter.py` (get_kline, get_stock_info), `services/indicator_calc.py` (calc_macd, calc_rsi, calc_ma, calc_bollinger)
- Produces: 8 REST endpoints (see MVP API table in spec)

- [ ] **Step 1: Write routers/kline.py**

```python
"""K-line and technical indicator endpoints."""

from fastapi import APIRouter, Query, HTTPException
from services.akshare_adapter import get_kline as fetch_kline
from services.indicator_calc import calc_macd, calc_rsi, calc_ma, calc_bollinger

router = APIRouter(prefix="/kline", tags=["kline"])


@router.get("/{symbol}")
async def kline(
    symbol: str,
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    count: int = Query(120, ge=1, le=500),
    adjust: str = Query("qfq", regex="^(none|qfq|hfq)$"),
):
    """Get A-share K-line data."""
    bars = fetch_kline(symbol, period=period, count=count, adjust=adjust)
    return {
        "symbol": symbol,
        "period": period,
        "adjust": adjust,
        "count": len(bars),
        "bars": bars,
    }


@router.get("/{symbol}/indicators")
async def indicators(
    symbol: str,
    names: str = Query("MACD,RSI", description="Comma-separated indicator names: MACD,RSI,MA,BOLL"),
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    count: int = Query(120, ge=1, le=500),
):
    """Get technical indicators for a stock."""
    bars = fetch_kline(symbol, period=period, count=count, adjust="qfq")
    if not bars:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    closes = [b["close"] for b in bars]
    result = {"symbol": symbol, "indicators": {}}
    requested = [n.strip().upper() for n in names.split(",")]
    for name in requested:
        if name == "MACD":
            result["indicators"]["macd"] = calc_macd(closes)
        elif name == "RSI":
            result["indicators"]["rsi"] = calc_rsi(closes)
        elif name == "MA":
            result["indicators"]["ma"] = calc_ma(closes)
        elif name == "BOLL":
            result["indicators"]["boll"] = calc_bollinger(closes)
    return result
```

- [ ] **Step 2: Write routers/financial.py**

```python
"""Financial report endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/financial", tags=["financial"])


@router.get("/{symbol}/summary")
async def financial_summary(symbol: str):
    """Get key financial metrics for a stock."""
    # MVP: return stub data structure. Real akshare financial data
    # requires complex parsing; this endpoint exists to define the contract.
    return {
        "symbol": symbol,
        "reportDate": None,
        "revenueGrowth": None,
        "netProfitGrowth": None,
        "grossMargin": None,
        "roe": None,
        "debtRatio": None,
        "_note": "Financial data requires akshare financial report parsing — deferred to Phase 2",
    }


@router.get("/{symbol}/valuation")
async def valuation(symbol: str):
    """Get valuation metrics (PE/PB/PS/ROE)."""
    from services.akshare_adapter import get_stock_info
    info = get_stock_info(symbol)
    if info is None:
        return {
            "symbol": symbol,
            "pe": None, "pb": None, "ps": None,
            "peg": None, "dividendYield": None,
            "marketCap": None,
        }
    return {
        "symbol": symbol,
        "pe": None,  # akshare individual_info_em doesn't provide PE
        "pb": None,
        "ps": None,
        "peg": None,
        "dividendYield": None,
        "marketCap": info.get("marketCap"),
    }
```

- [ ] **Step 3: Write routers/reference.py**

```python
"""Stock reference information endpoints."""

from fastapi import APIRouter, Query, HTTPException
from services.akshare_adapter import get_stock_info

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/{symbol}")
async def reference(symbol: str):
    """Get basic stock information."""
    info = get_stock_info(symbol)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    return info


@router.get("/search")
async def search(keyword: str = Query(..., min_length=1)):
    """Search stocks by keyword."""
    # MVP: akshare search is unreliable across versions; provide stable stub
    return {
        "keyword": keyword,
        "results": [],
        "_note": "Search uses akshare stock_info_a_code_name() — available but version-dependent",
    }
```

- [ ] **Step 4: Write routers/sector.py**

```python
"""Sector/board endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/sector", tags=["sector"])


# MVP: static sector definitions for common A-share sectors
_SECTORS = {
    "CPO": {
        "name": "光电共封装",
        "constituents": [
            {"symbol": "300394", "name": "天孚通信"},
            {"symbol": "300308", "name": "中际旭创"},
            {"symbol": "300502", "name": "新易盛"},
            {"symbol": "300570", "name": "太辰光"},
            {"symbol": "688498", "name": "源杰科技"},
        ],
    },
    "白酒": {
        "name": "白酒",
        "constituents": [
            {"symbol": "600519", "name": "贵州茅台"},
            {"symbol": "000858", "name": "五粮液"},
            {"symbol": "000568", "name": "泸州老窖"},
            {"symbol": "002304", "name": "洋河股份"},
            {"symbol": "000799", "name": "酒鬼酒"},
        ],
    },
    "半导体": {
        "name": "半导体",
        "constituents": [
            {"symbol": "688981", "name": "中芯国际"},
            {"symbol": "002371", "name": "北方华创"},
            {"symbol": "603986", "name": "兆易创新"},
            {"symbol": "688012", "name": "中微公司"},
        ],
    },
}


@router.get("/list")
async def sector_list():
    """List all available sectors."""
    return {
        "sectors": [
            {"code": code, "name": info["name"],
             "constituentCount": len(info["constituents"])}
            for code, info in _SECTORS.items()
        ]
    }


@router.get("/{name}/constituents")
async def sector_constituents(name: str):
    """Get constituents of a sector by name or code."""
    # Try exact match first, then case-insensitive
    sector = _SECTORS.get(name) or _SECTORS.get(name.upper())
    if not sector:
        # Try fuzzy match by Chinese name
        for code, info in _SECTORS.items():
            if info["name"] == name:
                sector = info
                break
    if not sector:
        raise HTTPException(status_code=404, detail=f"Sector '{name}' not found")
    return {"code": name, "name": sector["name"], "constituents": sector["constituents"]}


@router.get("/{name}/flow")
async def sector_flow(name: str):
    """Get capital flow for a sector (Phase 2)."""
    return {"code": name, "flow": None, "_note": "Capital flow data — Phase 2"}
```

- [ ] **Step 5: Modify main.py — register routers**

Add after the CORS middleware block and before `if __name__`:

```python
from routers import kline, financial, reference, sector

app.include_router(kline.router)
app.include_router(financial.router)
app.include_router(reference.router)
app.include_router(sector.router)
```

- [ ] **Step 6: Write tests/test_routers.py**

```python
"""Tests for data service routers."""

import pytest
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.mark.asyncio
async def test_kline_endpoint_returns_bars():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/kline/600519?count=5")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "600519"
    assert data["period"] == "daily"
    assert "bars" in data


@pytest.mark.asyncio
async def test_kline_indicators_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/kline/600519/indicators?names=MACD,RSI&count=60")
    assert response.status_code == 200
    data = response.json()
    assert "indicators" in data
    assert "macd" in data["indicators"]
    assert "rsi" in data["indicators"]


@pytest.mark.asyncio
async def test_financial_summary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/financial/600519/summary")
    assert response.status_code == 200
    assert response.json()["symbol"] == "600519"


@pytest.mark.asyncio
async def test_reference_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/reference/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_sector_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sector/list")
    assert response.status_code == 200
    assert len(response.json()["sectors"]) >= 2


@pytest.mark.asyncio
async def test_sector_constituents():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sector/CPO/constituents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["constituents"]) > 0
    assert data["constituents"][0]["symbol"] == "300394"


@pytest.mark.asyncio
async def test_sector_constituents_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sector/NONEXISTENT/constituents")
    assert response.status_code == 404
```

- [ ] **Step 7: Run tests**

```bash
cd D:\c2\d2-data && python -m pytest tests/ -v
```
Expected: 8 tests PASS (1 health + 7 router)

- [ ] **Step 8: Commit**

```bash
git add d2-data/
git commit -m "feat: Python data service routers — kline, financial, reference, sector"

---

### Task 4: @agenttrade/data-client — TypeScript Client & Types

**Files:**
- Create: `packages/data-client/src/types.ts`
- Modify: `packages/data-client/src/index.ts` (replace placeholder)
- Create: `packages/data-client/src/client.ts`
- Create: `packages/data-client/src/modules/kline.ts`
- Create: `packages/data-client/src/modules/financial.ts`
- Create: `packages/data-client/src/modules/reference.ts`
- Create: `packages/data-client/src/modules/sector.ts`
- Create: `packages/data-client/src/modules/market.ts`
- Create: `packages/data-client/src/__tests__/client.test.ts`

**Interfaces:**
- Consumes: Python data service API contract (localhost:9500)
- Produces: `DataClient` class with `.kline`, `.financial`, `.reference`, `.sector`, `.market` modules

- [ ] **Step 1: Write types.ts**

```typescript
// === Response types for the AgentTrade data service ===

export interface KlineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

export interface KlineResponse {
  symbol: string;
  period: "daily" | "weekly" | "monthly";
  adjust: "none" | "qfq" | "hfq";
  count: number;
  bars: KlineBar[];
}

export interface MACDItem {
  index: number;
  dif: number | null;
  dea: number | null;
  histogram: number | null;
}

export interface BollingerItem {
  middle: number | null;
  upper: number | null;
  lower: number | null;
}

export interface IndicatorsResponse {
  symbol: string;
  indicators: {
    macd?: MACDItem[];
    rsi?: (number | null)[];
    ma?: Record<string, (number | null)[]>;
    boll?: BollingerItem[];
  };
}

export interface FinancialSummary {
  symbol: string;
  reportDate: string | null;
  revenueGrowth: number | null;
  netProfitGrowth: number | null;
  grossMargin: number | null;
  roe: number | null;
  debtRatio: number | null;
}

export interface Valuation {
  symbol: string;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  peg: number | null;
  dividendYield: number | null;
  marketCap: number | null;
}

export interface StockInfo {
  symbol: string;
  name: string;
  industry: string;
  marketCap: number;
}

export interface SectorInfo {
  code: string;
  name: string;
  constituentCount: number;
}

export interface SectorConstituent {
  symbol: string;
  name: string;
  weight?: number;
}

export interface SectorConstituentsResponse {
  code: string;
  name: string;
  constituents: SectorConstituent[];
}

export interface SectorListResponse {
  sectors: SectorInfo[];
}

export interface SearchResult {
  symbol: string;
  name: string;
  industry?: string;
  marketCap?: number;
}

export interface SearchResponse {
  keyword: string;
  results: SearchResult[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface KlineParams {
  symbol: string;
  period?: "daily" | "weekly" | "monthly";
  count?: number;
  adjust?: "none" | "qfq" | "hfq";
}

export interface IndicatorsParams {
  symbol: string;
  names?: string[];
  period?: string;
  count?: number;
}
```

- [ ] **Step 2: Write client.ts**

```typescript
import { KlineModule } from "./modules/kline.js";
import { FinancialModule } from "./modules/financial.js";
import { ReferenceModule } from "./modules/reference.js";
import { SectorModule } from "./modules/sector.js";
import { MarketModule } from "./modules/market.js";
import type { HealthResponse } from "./types.js";

export interface DataClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class DataClient {
  readonly kline: KlineModule;
  readonly financial: FinancialModule;
  readonly reference: ReferenceModule;
  readonly sector: SectorModule;
  readonly market: MarketModule;

  private baseUrl: string;
  private timeout: number;

  constructor(options: DataClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "http://localhost:9500";
    this.timeout = options.timeout ?? 30_000;
    const fetchFn = this.fetch.bind(this);
    this.kline = new KlineModule(fetchFn);
    this.financial = new FinancialModule(fetchFn);
    this.reference = new ReferenceModule(fetchFn);
    this.sector = new SectorModule(fetchFn);
    this.market = new MarketModule(fetchFn);
  }

  async health(): Promise<HealthResponse> {
    const res = await this.fetch("/health");
    return res.json();
  }

  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...init?.headers },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Data service error ${res.status}: ${body}`);
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }
}
```

- [ ] **Step 3: Write modules/kline.ts**

```typescript
import type { KlineResponse, IndicatorsResponse, KlineParams, IndicatorsParams } from "../types.js";

export type FetchFn = (path: string, init?: RequestInit) => Promise<Response>;

export class KlineModule {
  constructor(private fetch: FetchFn) {}

  async get(params: KlineParams): Promise<KlineResponse> {
    const { symbol, period = "daily", count = 120, adjust = "qfq" } = params;
    const qs = `period=${period}&count=${count}&adjust=${adjust}`;
    const res = await this.fetch(`/kline/${encodeURIComponent(symbol)}?${qs}`);
    return res.json();
  }

  async indicators(params: IndicatorsParams): Promise<IndicatorsResponse> {
    const { symbol, names = ["MACD", "RSI"], period = "daily", count = 120 } = params;
    const nameStr = names.join(",");
    const qs = `names=${nameStr}&period=${period}&count=${count}`;
    const res = await this.fetch(`/kline/${encodeURIComponent(symbol)}/indicators?${qs}`);
    return res.json();
  }
}
```

- [ ] **Step 4: Write modules/financial.ts**

```typescript
import type { FinancialSummary, Valuation } from "../types.js";
import type { FetchFn } from "./kline.js";

export class FinancialModule {
  constructor(private fetch: FetchFn) {}

  async summary(symbol: string): Promise<FinancialSummary> {
    const res = await this.fetch(`/financial/${encodeURIComponent(symbol)}/summary`);
    return res.json();
  }

  async valuation(symbol: string): Promise<Valuation> {
    const res = await this.fetch(`/financial/${encodeURIComponent(symbol)}/valuation`);
    return res.json();
  }
}
```

- [ ] **Step 5: Write modules/reference.ts**

```typescript
import type { StockInfo, SearchResponse } from "../types.js";
import type { FetchFn } from "./kline.js";

export class ReferenceModule {
  constructor(private fetch: FetchFn) {}

  async get(symbol: string): Promise<StockInfo> {
    const res = await this.fetch(`/reference/${encodeURIComponent(symbol)}`);
    return res.json();
  }

  async search(keyword: string): Promise<SearchResponse> {
    const res = await this.fetch(`/reference/search?keyword=${encodeURIComponent(keyword)}`);
    return res.json();
  }
}
```

- [ ] **Step 6: Write modules/sector.ts**

```typescript
import type { SectorListResponse, SectorConstituentsResponse } from "../types.js";
import type { FetchFn } from "./kline.js";

export class SectorModule {
  constructor(private fetch: FetchFn) {}

  async list(): Promise<SectorListResponse> {
    const res = await this.fetch("/sector/list");
    return res.json();
  }

  async constituents(name: string): Promise<SectorConstituentsResponse> {
    const res = await this.fetch(`/sector/${encodeURIComponent(name)}/constituents`);
    return res.json();
  }
}
```

- [ ] **Step 7: Write modules/market.ts** (stub for Phase 2)

```typescript
import type { FetchFn } from "./kline.js";

export class MarketModule {
  constructor(private fetch: FetchFn) {}

  async snapshot(_symbol: string): Promise<Record<string, unknown>> {
    return { _note: "Market snapshot — Phase 2" };
  }
}
```

- [ ] **Step 8: Replace index.ts**

```typescript
export { DataClient } from "./client.js";
export type { DataClientOptions } from "./client.js";
export * from "./types.js";
```

- [ ] **Step 9: Write __tests__/client.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataClient } from "../client.js";

function createMockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("DataClient", () => {
  let client: DataClient;

  beforeEach(() => {
    client = new DataClient({ baseUrl: "http://test:9500" });
  });

  it("health returns status", async () => {
    (client as any).fetch = createMockFetch({ status: "ok", service: "agenttrade-data", version: "0.1.0" });
    const result = await client.health();
    expect(result.status).toBe("ok");
  });

  it("kline.get returns bars", async () => {
    const mockData = { symbol: "600519", period: "daily", bars: [{ date: "2026-01-01", open: 1800, close: 1820 }] };
    (client as any).fetch = createMockFetch(mockData);
    const result = await client.kline.get({ symbol: "600519", count: 1 });
    expect(result.symbol).toBe("600519");
    expect(result.bars).toHaveLength(1);
  });

  it("sector.list returns sectors", async () => {
    const mockData = { sectors: [{ code: "CPO", name: "光电共封装", constituentCount: 5 }] };
    (client as any).fetch = createMockFetch(mockData);
    const result = await client.sector.list();
    expect(result.sectors[0].code).toBe("CPO");
  });

  it("sector.constituents returns constituents", async () => {
    const mockData = { code: "CPO", name: "光电共封装", constituents: [{ symbol: "300394", name: "天孚通信" }] };
    (client as any).fetch = createMockFetch(mockData);
    const result = await client.sector.constituents("CPO");
    expect(result.constituents[0].symbol).toBe("300394");
  });

  it("handles 404 errors", async () => {
    (client as any).fetch = createMockFetch({ detail: "Not found" }, 404);
    await expect(client.reference.get("999999")).rejects.toThrow("Data service error 404");
  });
});
```

- [ ] **Step 10: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/data-client test
```
Expected: 5 tests PASS

- [ ] **Step 11: Build and verify package**

```bash
cd D:\c2 && pnpm --filter @agenttrade/data-client build
```
Expected: clean build, dist/ populated

- [ ] **Step 12: Commit**

```bash
git add packages/data-client/
git commit -m "feat: @agenttrade/data-client — TypeScript client for Python data service"

---

### Task 5: @agenttrade/core — Base Types & Interfaces

**Files:**
- Create: `packages/core/src/agent/types.ts`
- Create: `packages/core/src/workflow/types.ts`
- Create: `packages/core/src/types.ts` (AnalysisTarget, common types)
- Modify: `packages/core/src/index.ts` (re-export all types)
- Create: `packages/core/src/__tests__/types.test.ts`

**Interfaces:**
- Consumes: nothing (pure types, no runtime deps)
- Produces: `BaseAgent`, `AgentPersona`, `Analysis`, `Capability`, `AnalysisTarget`, `TargetType`, `WorkflowDAG`, `WorkflowStep`, `PrimitiveType`, `ExecutionContext`, `Finding`

- [ ] **Step 1: Write src/types.ts — AnalysisTarget**

```typescript
export type TargetType = "stock" | "sector" | "index";

export interface AnalysisTarget {
  type: TargetType;
  code: string;
  name?: string;
  market?: "sh" | "sz" | "bj";
}
```

- [ ] **Step 2: Write src/agent/types.ts**

```typescript
import type { StructuredTool } from "@langchain/core/tools";

export type Capability = string;

export interface AgentPersona {
  stance: "bullish" | "bearish" | "neutral";
  style?: "aggressive" | "balanced" | "conservative";
  description?: string;
}

export interface Analysis {
  conclusion: string;
  confidence: number;   // 0-1
  sentiment: "bullish" | "bearish" | "neutral";
  reasoning: string[];
  rawOutput?: string;
}

export interface BaseAgent {
  id: string;
  name: string;
  capabilities: Capability[];
  personality: AgentPersona;
  tools: StructuredTool[];

  analyze(context: import("../workflow/types.js").ExecutionContext): Promise<Analysis>;

  canCritique?: boolean;
  canDebate?: boolean;
}
```

- [ ] **Step 3: Write src/workflow/types.ts**

```typescript
import type { AnalysisTarget } from "../types.js";
import type { Analysis } from "../agent/types.js";

export type PrimitiveType =
  | "analyze"
  | "panel"
  | "critique"
  | "debate"
  | "vote"
  | "synthesize"
  | "parallel"
  | "sequential";

export interface AgentMatch {
  id?: string;
  capability?: string;
  not?: string[];
}

export interface AgentCount {
  min?: number;
  max?: number;
}

export interface WorkflowStep {
  id: string;
  type: PrimitiveType;
  prompt?: string;
  agent?: AgentMatch | AgentMatch[];
  match?: AgentMatch;
  count?: AgentCount | "all";
  targetStep?: string;
  reviewer?: string;
  maxRounds?: number;
  children?: WorkflowStep[];
  next?: string[];
}

export interface WorkflowDAG {
  name: string;
  version: string;
  description?: string;
  steps: WorkflowStep[];
}

export interface Finding {
  step: string;
  agent: string;
  analysis: Analysis;
  timestamp: number;
}

export interface DebateRound {
  round: number;
  entries: {
    agent: string;
    argument: string;
    target?: string;
  }[];
}

export interface ExecutionContext {
  target: AnalysisTarget;
  task: string;
  findings: Finding[];
  debateRounds: DebateRound[];
  workflowName: string;
  startedAt: number;
}
```

- [ ] **Step 4: Replace src/index.ts**

```typescript
export type { TargetType, AnalysisTarget } from "./types.js";
export type {
  BaseAgent,
  Capability,
  AgentPersona,
  Analysis,
} from "./agent/types.js";
export type {
  PrimitiveType,
  AgentMatch,
  AgentCount,
  WorkflowStep,
  WorkflowDAG,
  Finding,
  DebateRound,
  ExecutionContext,
} from "./workflow/types.js";
```

- [ ] **Step 5: Write __tests__/types.test.ts (smoke test)**

```typescript
import { describe, it, expect } from "vitest";

describe("core types (compile-time check)", () => {
  it("TargetType is a string union", () => {
    const t: import("../types.js").TargetType = "stock";
    expect(t).toBe("stock");
  });

  it("Analysis requires conclusion, confidence, sentiment, reasoning", () => {
    const a: import("../agent/types.js").Analysis = {
      conclusion: "看多",
      confidence: 0.75,
      sentiment: "bullish",
      reasoning: ["理由1", "理由2"],
    };
    expect(a.confidence).toBeGreaterThan(0.5);
  });

  it("ExecutionContext is structured", () => {
    const ctx: import("../workflow/types.js").ExecutionContext = {
      target: { type: "stock", code: "600519" },
      task: "分析走势",
      findings: [],
      debateRounds: [],
      workflowName: "test",
      startedAt: Date.now(),
    };
    expect(ctx.target.code).toBe("600519");
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat: core types — BaseAgent, Analysis, WorkflowDAG, ExecutionContext"

---

### Task 6: @agenttrade/core — Agent Registry, Loader & HumanAgent

**Files:**
- Create: `packages/core/src/agent/registry.ts`
- Create: `packages/core/src/agent/loader.ts`
- Create: `packages/core/src/agent/human-agent.ts`
- Modify: `packages/core/src/index.ts` (add exports)
- Create: `packages/core/src/__tests__/registry.test.ts`
- Create: `packages/core/src/__tests__/loader.test.ts`
- Create: `packages/core/src/__tests__/human-agent.test.ts`

**Interfaces:**
- Consumes: `BaseAgent`, `Capability`, `AgentPersona`, `Analysis`, `AgentMatch`, `AgentCount` (Task 5)
- Produces: `AgentRegistry` class, `loadAgents()` function, `HumanAgent` class

- [ ] **Step 1: Write src/agent/registry.ts**

```typescript
import type { BaseAgent, Analysis } from "./types.js";
import type { AgentMatch, AgentCount, ExecutionContext } from "../workflow/types.js";

export class AgentRegistry {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent "${agent.id}" is already registered`);
    }
    this.agents.set(agent.id, agent);
  }

  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  list(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  match(match: AgentMatch, count?: AgentCount | "all"): BaseAgent[] {
    let candidates = this.list();

    if (match.id) {
      const agent = this.agents.get(match.id);
      return agent ? [agent] : [];
    }

    if (match.capability) {
      candidates = candidates.filter(a =>
        a.capabilities.some(c =>
          c.toLowerCase().includes(match.capability!.toLowerCase())
        )
      );
    }

    if (match.not) {
      candidates = candidates.filter(a =>
        !match.not!.some(exclude =>
          a.capabilities.some(c => c.toLowerCase() === exclude.toLowerCase()) ||
          a.id === exclude
        )
      );
    }

    if (count === "all") return candidates;

    const min = count?.min ?? 1;
    const max = count?.max ?? candidates.length;
    const n = Math.max(min, Math.min(max, candidates.length));
    // Stable selection: prefer agents with confidence/skill, fallback to first N
    return candidates.slice(0, n);
  }

  clear(): void {
    this.agents.clear();
  }

  get size(): number {
    return this.agents.size;
  }
}
```

- [ ] **Step 2: Write src/agent/loader.ts**

```typescript
import type { BaseAgent } from "./types.js";
import { AgentRegistry } from "./registry.js";

/**
 * Auto-discover and register agents from a list of constructors.
 * In Phase 1, agents are explicitly imported and passed.
 * Phase 2+ could add filesystem scanning for plugin directories.
 */
export function loadAgents(
  registry: AgentRegistry,
  agentFactories: (new () => BaseAgent)[]
): void {
  for (const Factory of agentFactories) {
    const agent = new Factory();
    registry.register(agent);
  }
}

/**
 * Register multiple pre-instantiated agents (useful for same-class variants).
 */
export function registerInstances(
  registry: AgentRegistry,
  agents: BaseAgent[]
): void {
  for (const agent of agents) {
    registry.register(agent);
  }
}
```

- [ ] **Step 3: Write src/agent/human-agent.ts**

```typescript
import type { BaseAgent, AgentPersona, Analysis } from "./types.js";
import type { ExecutionContext } from "../workflow/types.js";
import type { StructuredTool } from "@langchain/core/tools";

export interface HumanInputRequest {
  prompt: string;
  inputFields: string[];
  timeout: number | null;
  contextSummary: string;
}

export type HumanInputHandler = (request: HumanInputRequest) => Promise<Record<string, string>>;

let _handler: HumanInputHandler | null = null;

export function setHumanInputHandler(handler: HumanInputHandler): void {
  _handler = handler;
}

export class HumanAgent implements BaseAgent {
  id = "retail-investor";
  name = "散户（用户）";
  capabilities = ["retail", "human", "sentiment"];
  personality: AgentPersona = {
    stance: "neutral",
    style: "balanced",
    description: "个人投资者，基于综合信息做独立判断",
  };
  tools: StructuredTool[] = [];

  canCritique = true;
  canDebate = true;

  async analyze(context: ExecutionContext): Promise<Analysis> {
    if (!_handler) {
      throw new Error(
        "HumanInputHandler not set. Call setHumanInputHandler() before using HumanAgent."
      );
    }

    const previousFindings = context.findings
      .map(f => `[${f.agent}]: ${f.analysis.conclusion} (${f.analysis.sentiment}, confidence: ${f.analysis.confidence})`)
      .join("\n");

    const request: HumanInputRequest = {
      prompt: `请基于以下分析，对 ${context.target.name ?? context.target.code} 给出你的判断`,
      inputFields: ["观点", "置信度 (0-1)", "理由"],
      timeout: null,
      contextSummary: previousFindings || "(尚无其他Agent的分析结论)",
    };

    const input = await _handler(request);

    const confidence = parseFloat(input["置信度 (0-1)"] ?? "0.5");
    const conclusion = input["观点"] ?? "无法判断";
    const reason = input["理由"] ?? "无";

    let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
    if (conclusion.includes("看多") || conclusion.includes("买入") || conclusion.includes("看好")) {
      sentiment = "bullish";
    } else if (conclusion.includes("看空") || conclusion.includes("卖出") || conclusion.includes("看淡")) {
      sentiment = "bearish";
    }

    return {
      conclusion,
      confidence: Math.max(0, Math.min(1, confidence)),
      sentiment,
      reasoning: [reason],
    };
  }
}
```

- [ ] **Step 4: Update src/index.ts**

Add these exports after the existing type exports:

```typescript
export { AgentRegistry } from "./agent/registry.js";
export { loadAgents, registerInstances } from "./agent/loader.js";
export { HumanAgent, setHumanInputHandler } from "./agent/human-agent.js";
export type { HumanInputRequest, HumanInputHandler } from "./agent/human-agent.js";
```

- [ ] **Step 5: Write __tests__/registry.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistry } from "../agent/registry.js";
import type { BaseAgent } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeMockAgent(overrides: Partial<BaseAgent> = {}): BaseAgent {
  return {
    id: "test-agent",
    name: "Test Agent",
    capabilities: ["test"],
    personality: { stance: "neutral" },
    tools: [],
    analyze: async (_ctx: ExecutionContext) => ({
      conclusion: "ok",
      confidence: 0.5,
      sentiment: "neutral",
      reasoning: ["reason"],
    }),
    ...overrides,
  };
}

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  beforeEach(() => { registry = new AgentRegistry(); });

  it("registers and retrieves an agent", () => {
    const agent = makeMockAgent({ id: "a1" });
    registry.register(agent);
    expect(registry.get("a1")).toBe(agent);
  });

  it("throws on duplicate id", () => {
    registry.register(makeMockAgent({ id: "a1" }));
    expect(() => registry.register(makeMockAgent({ id: "a1" }))).toThrow("already registered");
  });

  it("match by id returns exact agent", () => {
    registry.register(makeMockAgent({ id: "target" }));
    const result = registry.match({ id: "target" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("target");
  });

  it("match by capability filters correctly", () => {
    registry.register(makeMockAgent({ id: "a", capabilities: ["technical", "bullish"] }));
    registry.register(makeMockAgent({ id: "b", capabilities: ["fundamental"] }));
    registry.register(makeMockAgent({ id: "c", capabilities: ["technical"] }));
    const result = registry.match({ capability: "technical" });
    expect(result).toHaveLength(2);
  });

  it("match with not filters out excluded", () => {
    registry.register(makeMockAgent({ id: "a", capabilities: ["analyst"] }));
    registry.register(makeMockAgent({ id: "judge", capabilities: ["analyst", "judge"] }));
    const result = registry.match({ capability: "analyst", not: ["judge"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("match with count limits result size", () => {
    for (let i = 0; i < 5; i++) {
      registry.register(makeMockAgent({ id: `a${i}`, capabilities: ["analyst"] }));
    }
    expect(registry.match({ capability: "analyst" }, { min: 1, max: 3 })).toHaveLength(3);
    expect(registry.match({ capability: "analyst" }, "all")).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Write __tests__/human-agent.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { HumanAgent, setHumanInputHandler } from "../agent/human-agent.js";
import type { ExecutionContext } from "../workflow/types.js";

const baseCtx: ExecutionContext = {
  target: { type: "stock", code: "600519", name: "贵州茅台" },
  task: "判断走势",
  findings: [
    {
      step: "bull",
      agent: "牛方Agent",
      analysis: { conclusion: "看多", confidence: 0.8, sentiment: "bullish", reasoning: ["趋势向好"] },
      timestamp: Date.now(),
    },
  ],
  debateRounds: [],
  workflowName: "test",
  startedAt: Date.now(),
};

describe("HumanAgent", () => {
  beforeEach(() => {
    setHumanInputHandler(async (req) => ({
      "观点": "看多，跟牛方一致",
      "置信度 (0-1)": "0.7",
      "理由": "牛方分析有道理，加上自己感觉",
    }));
  });

  it("returns Analysis from human input", async () => {
    const agent = new HumanAgent();
    const result = await agent.analyze(baseCtx);
    expect(result.sentiment).toBe("bullish");
    expect(result.confidence).toBe(0.7);
    expect(result.reasoning).toHaveLength(1);
  });

  it("throws if handler not set", async () => {
    setHumanInputHandler(null as any); // reset
    const agent = new HumanAgent();
    await expect(agent.analyze(baseCtx)).rejects.toThrow("HumanInputHandler not set");
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 10 tests PASS (3 from Task 5 + 7 new)

- [ ] **Step 8: Commit**

```bash
git add packages/core/
git commit -m "feat: AgentRegistry, loader, HumanAgent with pause/resume pattern"

---

### Task 7: @agenttrade/core — Workflow Context Factory

**Files:**
- Create: `packages/core/src/workflow/context.ts`
- Modify: `packages/core/src/index.ts` (add export)
- Create: `packages/core/src/__tests__/context.test.ts`

**Interfaces:**
- Consumes: `ExecutionContext`, `Finding`, `AnalysisTarget` (Task 5)
- Produces: `createContext()`, `addFinding()`, `addDebateRound()`

- [ ] **Step 1: Write src/workflow/context.ts**

```typescript
import type { AnalysisTarget } from "../types.js";
import type { ExecutionContext, Finding, DebateRound } from "./types.js";
import type { Analysis } from "../agent/types.js";

export function createContext(
  target: AnalysisTarget,
  task: string,
  workflowName = "unknown",
): ExecutionContext {
  return {
    target,
    task,
    findings: [],
    debateRounds: [],
    workflowName,
    startedAt: Date.now(),
  };
}

export function addFinding(
  ctx: ExecutionContext,
  step: string,
  agent: string,
  analysis: Analysis,
): ExecutionContext {
  const finding: Finding = { step, agent, analysis, timestamp: Date.now() };
  return { ...ctx, findings: [...ctx.findings, finding] };
}

export function addDebateRound(
  ctx: ExecutionContext,
  round: DebateRound,
): ExecutionContext {
  return { ...ctx, debateRounds: [...ctx.debateRounds, round] };
}

export function getAgentFindings(
  ctx: ExecutionContext,
  agentId: string,
): Finding[] {
  return ctx.findings.filter(f => f.agent === agentId);
}

export function getStepFindings(
  ctx: ExecutionContext,
  stepId: string,
): Finding[] {
  return ctx.findings.filter(f => f.step === stepId);
}

export function getLatestFinding(
  ctx: ExecutionContext,
): Finding | undefined {
  return ctx.findings.at(-1);
}
```

- [ ] **Step 2: Add export to src/index.ts**

```typescript
export {
  createContext,
  addFinding,
  addDebateRound,
  getAgentFindings,
  getStepFindings,
  getLatestFinding,
} from "./workflow/context.js";
```

- [ ] **Step 3: Write __tests__/context.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { createContext, addFinding, addDebateRound, getAgentFindings, getStepFindings, getLatestFinding } from "../workflow/context.js";
import type { Analysis } from "../agent/types.js";

const analysis: Analysis = { conclusion: "OK", confidence: 0.8, sentiment: "bullish", reasoning: ["r1"] };

describe("workflow context", () => {
  it("createContext initializes with target and empty findings", () => {
    const ctx = createContext({ type: "stock", code: "600519" }, "分析", "test-wf");
    expect(ctx.target.code).toBe("600519");
    expect(ctx.findings).toHaveLength(0);
    expect(ctx.workflowName).toBe("test-wf");
  });

  it("addFinding appends immutably", () => {
    const ctx = createContext({ type: "stock", code: "000001" }, "task", "wf");
    const ctx2 = addFinding(ctx, "step1", "agent1", analysis);
    expect(ctx.findings).toHaveLength(0); // original unchanged
    expect(ctx2.findings).toHaveLength(1);
    expect(ctx2.findings[0].step).toBe("step1");
  });

  it("getAgentFindings filters by agent", () => {
    let ctx = createContext({ type: "stock", code: "test" }, "task", "wf");
    ctx = addFinding(ctx, "s1", "agentA", analysis);
    ctx = addFinding(ctx, "s2", "agentB", analysis);
    expect(getAgentFindings(ctx, "agentA")).toHaveLength(1);
  });

  it("getStepFindings filters by step", () => {
    let ctx = createContext({ type: "stock", code: "test" }, "task", "wf");
    ctx = addFinding(ctx, "stepX", "agentA", analysis);
    ctx = addFinding(ctx, "stepX", "agentB", analysis);
    ctx = addFinding(ctx, "stepY", "agentC", analysis);
    expect(getStepFindings(ctx, "stepX")).toHaveLength(2);
  });

  it("getLatestFinding returns most recent", () => {
    let ctx = createContext({ type: "stock", code: "test" }, "task", "wf");
    expect(getLatestFinding(ctx)).toBeUndefined();
    ctx = addFinding(ctx, "s1", "a1", { ...analysis, conclusion: "first" });
    ctx = addFinding(ctx, "s2", "a2", { ...analysis, conclusion: "last" });
    expect(getLatestFinding(ctx)!.analysis.conclusion).toBe("last");
  });

  it("addDebateRound appends debate history", () => {
    let ctx = createContext({ type: "stock", code: "test" }, "task", "wf");
    ctx = addDebateRound(ctx, { round: 1, entries: [{ agent: "牛方", argument: "看多理由" }] });
    expect(ctx.debateRounds).toHaveLength(1);
    expect(ctx.debateRounds[0].round).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 16 tests PASS (10 previous + 6 new)

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat: workflow context factory — createContext, addFinding, immutable updates"

---

### Task 8: @agenttrade/core — Primitive: analyze

**Files:**
- Create: `packages/core/src/workflow/primitives/analyze.ts`
- Create: `packages/core/src/llm/fake-model.ts` (test-only fake LLM)
- Create: `packages/core/src/__tests__/analyze.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

**Interfaces:**
- Consumes: `AgentRegistry`, `ExecutionContext`, `WorkflowStep`, `addFinding` (Tasks 5-7)
- Produces: `executeAnalyze(step, registry, context)` → `ExecutionContext`

- [ ] **Step 1: Write src/llm/fake-model.ts**

```typescript
/**
 * Fake chat model for testing primitives without real LLM calls.
 * Extends LangChain's BaseChatModel so it's compatible with AgentExecutor.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";

export interface FakeResponse {
  text: string;
}

export class FakeChatModel extends BaseChatModel {
  lc_namespace = ["agenttrade", "test"];

  constructor(private responses: FakeResponse[] = []) {
    super({});
    this.responses = responses;
  }

  setResponses(responses: FakeResponse[]): void {
    this.responses = [...responses];
  }

  _llmType(): string {
    return "fake";
  }

  async _generate(
    _messages: BaseMessage[],
    _options?: this["ParsedCallOptions"],
    _runManager?: any,
  ): Promise<{ generations: { text: string; message: AIMessage }[] }> {
    const next = this.responses.shift();
    const text = next?.text ?? '{"conclusion":"默认结论","confidence":0.5,"sentiment":"neutral","reasoning":["无足够信息"]}';
    return {
      generations: [{ text, message: new AIMessage(text) }],
    };
  }
}
```

- [ ] **Step 2: Write src/workflow/primitives/analyze.ts**

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep } from "../types.js";
import type { Analysis } from "../../agent/types.js";
import { addFinding } from "../context.js";

export type LLMProvider = "anthropic" | "openai";

export interface AnalyzeOptions {
  provider?: LLMProvider;
  modelName?: string;
  llm?: BaseChatModel; // override — used in tests
}

let _defaultProvider: LLMProvider = "anthropic";

export function setDefaultLLMProvider(provider: LLMProvider): void {
  _defaultProvider = provider;
}

function createLLM(options: AnalyzeOptions = {}): BaseChatModel {
  if (options.llm) return options.llm;
  const provider = options.provider ?? _defaultProvider;
  if (provider === "openai") {
    return new ChatOpenAI({ modelName: options.modelName ?? "gpt-4o" });
  }
  return new ChatAnthropic({ modelName: options.modelName ?? "claude-sonnet-4-6" });
}

export async function executeAnalyze(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const match = step.agent as { id?: string; capability?: string } | undefined;
  if (!match) throw new Error(`Analyze step "${step.id}" requires an agent match`);

  const agents = registry.match(match as any, { min: 1, max: 1 });
  if (agents.length === 0) {
    throw new Error(`No agent found for step "${step.id}" matching ${JSON.stringify(match)}`);
  }
  const agent = agents[0];

  const prompt = (step.prompt ?? "分析 {target}")
    .replace("{target}", context.target.name ?? context.target.code);

  const llm = createLLM(options);
  const messages = [
    new SystemMessage(buildSystemPrompt(agent.personality.stance)),
    new HumanMessage(formatPromptWithContext(prompt, context)),
  ];

  const response = await llm.invoke(messages);
  const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const analysis = parseAnalysis(text, agent.id);

  return addFinding(context, step.id, agent.id, analysis);
}

function buildSystemPrompt(stance: string): string {
  const stanceGuide = {
    bullish: "你是一个乐观的分析师，倾向于寻找积极因素和上涨信号。",
    bearish: "你是一个谨慎的分析师，倾向于寻找风险因素和下跌信号。",
    neutral: "你是一个客观的分析师，平衡考虑多空因素。",
  };
  return `${stanceGuide[stance as keyof typeof stanceGuide] ?? stanceGuide.neutral}
请用中文回复。输出JSON格式：{"conclusion":"结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["理由1","理由2","理由3"]}`;
}

function formatPromptWithContext(prompt: string, context: ExecutionContext): string {
  const parts = [prompt];
  const prevFindings = context.findings;
  if (prevFindings.length > 0) {
    parts.push("\n\n已有的分析结论（供参考）：");
    for (const f of prevFindings) {
      parts.push(`- [${f.agent}]: ${f.analysis.conclusion} (置信度: ${f.analysis.confidence})`);
    }
  }
  return parts.join("\n");
}

function parseAnalysis(text: string, agentId: string): Analysis {
  try {
    // Try JSON extraction from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    const parsed = JSON.parse(jsonStr);
    return {
      conclusion: parsed.conclusion ?? "无法解析",
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      sentiment: parsed.sentiment ?? "neutral",
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning ?? ""],
      rawOutput: text,
    };
  } catch {
    return {
      conclusion: text.slice(0, 100),
      confidence: 0.5,
      sentiment: "neutral",
      reasoning: ["无法解析LLM输出为JSON"],
      rawOutput: text,
    };
  }
}
```

- [ ] **Step 3: Add export to src/index.ts**

```typescript
export { executeAnalyze, setDefaultLLMProvider } from "./workflow/primitives/analyze.js";
export type { AnalyzeOptions, LLMProvider } from "./workflow/primitives/analyze.js";
```

- [ ] **Step 4: Write __tests__/analyze.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executeAnalyze } from "../workflow/primitives/analyze.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";
import type { Analysis } from "../agent/types.js";

function makeAgent(overrides: Partial<BaseAgent> = {}): BaseAgent {
  return {
    id: "test-agent",
    name: "测试Agent",
    capabilities: ["test"],
    personality: { stance: "neutral" },
    tools: [],
    analyze: async (ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: "direct call",
      confidence: 0.6,
      sentiment: "neutral",
      reasoning: ["called directly"],
    }),
    ...overrides,
  };
}

describe("executeAnalyze", () => {
  let registry: AgentRegistry;

  beforeEach(() => { registry = new AgentRegistry(); });

  it("runs an agent and returns updated context", async () => {
    registry.register(makeAgent({ id: "a1" }));
    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "分析");
    const fakeLLM = new FakeChatModel([
      { text: '{"conclusion":"看多茅台","confidence":0.8,"sentiment":"bullish","reasoning":["趋势好","量能足"]}' },
    ]);

    const result = await executeAnalyze(
      { id: "step1", type: "analyze", prompt: "分析 {target}", agent: { id: "a1" } },
      registry, ctx, { llm: fakeLLM }
    );

    expect(result.findings).toHaveLength(1);
    const finding = result.findings[0];
    expect(finding.step).toBe("step1");
    expect(finding.agent).toBe("a1");
    expect(finding.analysis.sentiment).toBe("bullish");
    expect(finding.analysis.confidence).toBe(0.8);
    expect(finding.analysis.reasoning).toHaveLength(2);
  });

  it("throws when no agent matches", async () => {
    const ctx = createContext({ type: "stock", code: "test" }, "task");
    await expect(
      executeAnalyze(
        { id: "s1", type: "analyze", prompt: "test", agent: { id: "nobody" } },
        registry, ctx, { llm: new FakeChatModel() }
      )
    ).rejects.toThrow("No agent found");
  });

  it("replaces {target} in prompt", async () => {
    registry.register(makeAgent({ id: "a1" }));
    const ctx = createContext({ type: "stock", code: "600519", name: "贵州茅台" }, "分析");
    const fakeLLM = new FakeChatModel([
      { text: '{"conclusion":"贵州茅台OK","confidence":0.7,"sentiment":"bullish","reasoning":["r1"]}' },
    ]);
    const result = await executeAnalyze(
      { id: "s1", type: "analyze", prompt: "请分析 {target}", agent: { id: "a1" } },
      registry, ctx, { llm: fakeLLM }
    );
    expect(result.findings[0].analysis.conclusion).toContain("茅台");
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 19 tests PASS (16 + 3 new)

- [ ] **Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat: analyze primitive — single-agent analysis with LLM integration"

---

### Task 9: @agenttrade/core — Primitives: panel, critique

**Files:**
- Create: `packages/core/src/workflow/primitives/panel.ts`
- Create: `packages/core/src/workflow/primitives/critique.ts`
- Modify: `packages/core/src/index.ts` (add exports)
- Create: `packages/core/src/__tests__/panel.test.ts`
- Create: `packages/core/src/__tests__/critique.test.ts`

**Interfaces:**
- Consumes: `executeAnalyze` (Task 8), `AgentRegistry`, `ExecutionContext`, `WorkflowStep`, `getStepFindings`, `addFinding`
- Produces: `executePanel()`, `executeCritique()`

- [ ] **Step 1: Write src/workflow/primitives/panel.ts**

```typescript
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep } from "../types.js";
import { executeAnalyze, type AnalyzeOptions } from "./analyze.js";

export async function executePanel(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const match = step.match ?? (step.agent as any);
  if (!match) throw new Error(`Panel step "${step.id}" requires a match`);

  const count = step.count ?? "all";
  const agents = registry.match(match, count);

  if (agents.length === 0) {
    throw new Error(`No agents matched for panel "${step.id}"`);
  }

  // Run all agents in parallel
  const panelSteps: WorkflowStep[] = agents.map((a, i) => ({
    id: `${step.id}__${a.id}`,
    type: "analyze" as const,
    prompt: step.prompt,
    agent: { id: a.id },
  }));

  const results = await Promise.all(
    panelSteps.map(s => executeAnalyze(s, registry, context, options))
  );

  // Merge all findings from all results
  const allFindings = results.flatMap(r => r.findings);
  const uniqueFindings = allFindings.filter(
    (f, i, arr) => arr.findIndex(x => x.step === f.step && x.agent === f.agent) === i
  );

  return {
    ...context,
    findings: [...context.findings, ...uniqueFindings],
  };
}
```

- [ ] **Step 2: Write src/workflow/primitives/critique.ts**

```typescript
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep } from "../types.js";
import { addFinding, getStepFindings } from "../context.js";
import { type AnalyzeOptions } from "./analyze.js";
import { FakeChatModel } from "../../llm/fake-model.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function createLLM(options: AnalyzeOptions = {}): BaseChatModel {
  if (options.llm) return options.llm;
  const provider = options.provider ?? "anthropic";
  if (provider === "openai") return new ChatOpenAI({ modelName: options.modelName ?? "gpt-4o" });
  return new ChatAnthropic({ modelName: options.modelName ?? "claude-sonnet-4-6" });
}

export async function executeCritique(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  if (!step.targetStep) {
    throw new Error(`Critique step "${step.id}" requires targetStep`);
  }

  const targetFindings = getStepFindings(context, step.targetStep);
  if (targetFindings.length === 0) {
    throw new Error(`No findings from target step "${step.targetStep}" for critique`);
  }

  const reviewerId = step.reviewer ?? step.agent?.id;
  if (!reviewerId) throw new Error(`Critique step "${step.id}" requires a reviewer`);

  const reviewer = registry.get(reviewerId);
  if (!reviewer) throw new Error(`Reviewer agent "${reviewerId}" not found`);

  const targetText = targetFindings
    .map(f => `[${f.agent}] 结论: ${f.analysis.conclusion}\n置信度: ${f.analysis.confidence}\n理由:\n${f.analysis.reasoning.map(r => `  - ${r}`).join("\n")}`)
    .join("\n\n");

  const prompt = (step.prompt ?? "审阅以下分析结论，找出逻辑漏洞和不足之处：")
    .replace("{target}", context.target.name ?? context.target.code);

  const llm = createLLM(options);
  const messages = [
    new SystemMessage(`你是一个严谨的分析审阅者。批判性地审视以下分析结论，找出：
1. 逻辑漏洞或假设不成立的地方
2. 数据支撑不足的论点
3. 被忽略的风险因素
4. 反驳的观点和证据

请用中文回复JSON格式：
{"conclusion":"审阅总结","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["问题1","问题2","问题3"]}`),
    new HumanMessage(`${prompt}\n\n===== 待审阅分析 =====\n${targetText}\n=====`),
  ];

  const response = await llm.invoke(messages);
  const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  // Parse JSON (same pattern as analyze)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  let analysis;
  try {
    const parsed = JSON.parse(jsonStr);
    analysis = {
      conclusion: parsed.conclusion ?? "无法解析",
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      sentiment: parsed.sentiment ?? "neutral",
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning ?? ""],
      rawOutput: text,
    };
  } catch {
    analysis = { conclusion: text.slice(0, 100), confidence: 0.5, sentiment: "neutral" as const, reasoning: ["parse failed"], rawOutput: text };
  }

  return addFinding(context, step.id, reviewerId, analysis);
}
```

- [ ] **Step 3: Add exports to src/index.ts**

```typescript
export { executePanel } from "./workflow/primitives/panel.js";
export { executeCritique } from "./workflow/primitives/critique.js";
```

- [ ] **Step 4: Write __tests__/panel.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executePanel } from "../workflow/primitives/panel.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeAgent(id: string, caps: string[]): BaseAgent {
  return {
    id, name: id, capabilities: caps,
    personality: { stance: "neutral" },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id} concludes`, confidence: 0.7, sentiment: "neutral", reasoning: ["reason"],
    }),
  };
}

describe("executePanel", () => {
  let registry: AgentRegistry;
  const fakeLLM = new FakeChatModel([
    { text: '{"conclusion":"panel result","confidence":0.7,"sentiment":"neutral","reasoning":["ok"]}' },
    { text: '{"conclusion":"panel result2","confidence":0.6,"sentiment":"bullish","reasoning":["ok2"]}' },
  ]);

  beforeEach(() => { registry = new AgentRegistry(); });

  it("runs multiple agents in parallel", async () => {
    registry.register(makeAgent("a1", ["technical"]));
    registry.register(makeAgent("a2", ["technical"]));
    const ctx = createContext({ type: "stock", code: "test" }, "task");
    const result = await executePanel(
      { id: "p1", type: "panel", prompt: "分析", match: { capability: "technical" }, count: "all" },
      registry, ctx, { llm: fakeLLM }
    );
    expect(result.findings).toHaveLength(2);
  });

  it("respects count limit", async () => {
    registry.register(makeAgent("a1", ["analyst"]));
    registry.register(makeAgent("a2", ["analyst"]));
    registry.register(makeAgent("a3", ["analyst"]));
    const ctx = createContext({ type: "stock", code: "test" }, "task");
    const result = await executePanel(
      { id: "p1", type: "panel", prompt: "分析", match: { capability: "analyst" }, count: { min: 1, max: 2 } },
      registry, ctx, { llm: fakeLLM }
    );
    expect(result.findings.length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 5: Write __tests__/critique.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executeCritique } from "../workflow/primitives/critique.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext, addFinding } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeAgent(id: string): BaseAgent {
  return {
    id, name: id, capabilities: ["reviewer"],
    personality: { stance: "neutral" },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: "ok", confidence: 0.5, sentiment: "neutral", reasoning: ["r"],
    }),
  };
}

describe("executeCritique", () => {
  let registry: AgentRegistry;
  const fakeLLM = new FakeChatModel([
    { text: '{"conclusion":"有逻辑漏洞","confidence":0.6,"sentiment":"bearish","reasoning":["问题1: 数据不足","问题2: 忽略风险"]}' },
  ]);

  beforeEach(() => { registry = new AgentRegistry(); });

  it("reviews findings from target step", async () => {
    registry.register(makeAgent("reviewer1"));
    const targetAnalysis: Analysis = {
      conclusion: "目标分析结果", confidence: 0.9, sentiment: "bullish", reasoning: ["理由A", "理由B"],
    };
    let ctx = createContext({ type: "stock", code: "test" }, "task");
    ctx = addFinding(ctx, "target-step", "target-agent", targetAnalysis);

    const result = await executeCritique(
      { id: "crit1", type: "critique", targetStep: "target-step", reviewer: "reviewer1" },
      registry, ctx, { llm: fakeLLM }
    );

    expect(result.findings).toHaveLength(2); // original + critique
    const critique = result.findings[1];
    expect(critique.step).toBe("crit1");
    expect(critique.analysis.sentiment).toBe("bearish");
  });

  it("throws when target step has no findings", async () => {
    registry.register(makeAgent("r1"));
    const ctx = createContext({ type: "stock", code: "test" }, "task");
    await expect(
      executeCritique(
        { id: "c1", type: "critique", targetStep: "nonexistent", reviewer: "r1" },
        registry, ctx, { llm: fakeLLM }
      )
    ).rejects.toThrow("No findings from target step");
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 26 tests PASS (19 + 7 new)

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat: panel and critique primitives — multi-agent parallel, cross-review"
```

---

### Task 10: @agenttrade/core — Primitives: debate, vote, synthesize

**Files:**
- Create: `packages/core/src/workflow/primitives/debate.ts`
- Create: `packages/core/src/workflow/primitives/vote.ts`
- Create: `packages/core/src/workflow/primitives/synthesize.ts`
- Modify: `packages/core/src/index.ts` (add exports)
- Create: `packages/core/src/__tests__/debate.test.ts`
- Create: `packages/core/src/__tests__/vote.test.ts`
- Create: `packages/core/src/__tests__/synthesize.test.ts`

**Interfaces:**
- Consumes: AgentRegistry, ExecutionContext, addFinding, addDebateRound, executeAnalyze
- Produces: `executeDebate()`, `executeVote()`, `executeSynthesize()`

- [ ] **Step 1: Write src/workflow/primitives/debate.ts**

```typescript
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep, DebateRound } from "../types.js";
import { addFinding, addDebateRound } from "../context.js";
import type { AnalyzeOptions } from "./analyze.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function createLLM(options: AnalyzeOptions = {}): BaseChatModel {
  if (options.llm) return options.llm;
  return options.provider === "openai"
    ? new ChatOpenAI({ modelName: options.modelName ?? "gpt-4o" })
    : new ChatAnthropic({ modelName: options.modelName ?? "claude-sonnet-4-6" });
}

export async function executeDebate(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const agentIds = (step.agent as { id: string }[])?.map(a => a.id) ?? [];
  if (agentIds.length < 2) throw new Error("Debate requires at least 2 agents");

  const maxRounds = step.maxRounds ?? 2;
  const agents = agentIds.map(id => {
    const a = registry.get(id);
    if (!a) throw new Error(`Agent "${id}" not found for debate`);
    return a;
  });

  const topic = (step.prompt ?? "对 {target} 进行辩论分析")
    .replace("{target}", context.target.name ?? context.target.code);

  let currentCtx = context;
  const llm = createLLM(options);

  for (let round = 1; round <= maxRounds; round++) {
    const roundEntries: DebateRound["entries"] = [];

    for (const agent of agents) {
      const history = roundEntries
        .map(e => `[${e.agent}]: ${e.argument}`)
        .join("\n");

      const messages: BaseMessage[] = [
        new SystemMessage(`你正在参与一场辩论。你是${agent.name}（立场: ${agent.personality.stance}）。
辩论主题: ${topic}
这是第 ${round}/${maxRounds} 轮。
${round > 1 ? "请回应上一轮对手的观点，补充论据或针对性地反驳。" : "请提出你的核心论点。"}
回复JSON: {"conclusion":"你的论点","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["论据1","论据2"]}`),
      ];

      if (history) {
        messages.push(new HumanMessage(`本轮已有的发言:\n${history}\n\n请发表你的观点：`));
      } else {
        messages.push(new HumanMessage("请发表你的开场观点："));
      }

      const response = await llm.invoke(messages);
      const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
      let analysis;
      try {
        const parsed = JSON.parse(jsonStr);
        analysis = {
          conclusion: parsed.conclusion ?? text.slice(0, 100),
          confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
          sentiment: parsed.sentiment ?? "neutral",
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning ?? ""],
          rawOutput: text,
        };
      } catch {
        analysis = { conclusion: text.slice(0, 100), confidence: 0.5, sentiment: "neutral" as const, reasoning: ["parse failed"], rawOutput: text };
      }

      currentCtx = addFinding(currentCtx, `${step.id}__round${round}`, agent.id, analysis);
      roundEntries.push({ agent: agent.id, argument: analysis.conclusion });
    }

    currentCtx = addDebateRound(currentCtx, { round, entries: roundEntries });
  }

  return currentCtx;
}
```

- [ ] **Step 2: Write src/workflow/primitives/vote.ts**

```typescript
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep } from "../types.js";
import { addFinding } from "../context.js";
import { executePanel } from "./panel.js";
import type { AnalyzeOptions } from "./analyze.js";

export async function executeVote(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  // Vote is a specialized panel where each agent provides a verdict + confidence
  const votePrompt = (step.prompt ?? "基于目前所有分析，对 {target} 做出你的投票判断（看多/看空/观望），并给出置信度")
    .replace("{target}", context.target.name ?? context.target.code);

  const voteStep: WorkflowStep = {
    ...step,
    prompt: votePrompt,
    type: "panel",
  };

  return executePanel(voteStep, registry, context, options);
}
```

- [ ] **Step 3: Write src/workflow/primitives/synthesize.ts**

```typescript
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentRegistry } from "../../agent/registry.js";
import type { ExecutionContext, WorkflowStep } from "../types.js";
import { addFinding } from "../context.js";
import type { AnalyzeOptions } from "./analyze.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Analysis } from "../../agent/types.js";

function createLLM(options: AnalyzeOptions = {}): BaseChatModel {
  if (options.llm) return options.llm;
  return options.provider === "openai"
    ? new ChatOpenAI({ modelName: options.modelName ?? "gpt-4o" })
    : new ChatAnthropic({ modelName: options.modelName ?? "claude-sonnet-4-6" });
}

export async function executeSynthesize(
  step: WorkflowStep,
  registry: AgentRegistry,
  context: ExecutionContext,
  options: AnalyzeOptions = {},
): Promise<ExecutionContext> {
  const agentId = (step.agent as { id: string })?.id ?? "judge";
  const judge = registry.get(agentId);

  const allFindingsSummary = context.findings
    .map(f => `### [${f.step}] ${f.agent}\n**结论**: ${f.analysis.conclusion}\n**立场**: ${f.analysis.sentiment}\n**置信度**: ${f.analysis.confidence}\n**理由**:\n${f.analysis.reasoning.map(r => `- ${r}`).join("\n")}`)
    .join("\n\n");

  const debateSummary = context.debateRounds
    .map(r => `**第${r.round}轮**:\n${r.entries.map(e => `  - [${e.agent}]: ${e.argument}`).join("\n")}`)
    .join("\n\n");

  const prompt = (step.prompt ?? "综合以上所有分析结论和辩论记录，对 {target} 给出最终研判报告")
    .replace("{target}", context.target.name ?? context.target.code);

  const llm = createLLM(options);
  const systemPrompt = `你是一位首席投资分析师，负责综合团队的研究成果给出最终研判。
你需要：
1. 汇总多空双方的核心观点
2. 评估各方论据的有力程度
3. 指出被忽略的关键因素
4. 给出最终建议（包括操作建议、关键点位参考）
5. 如果信息不足以做出判断，诚实说明

请用中文回复Markdown格式的综合研判报告。最后附加一行JSON便于程序解析：
\`\`\`json
{"conclusion":"最终结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["核心论据1","核心论据2"]}
\`\`\``;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`${prompt}\n\n===== 全部分析记录 =====\n${allFindingsSummary}\n\n===== 辩论记录 =====\n${debateSummary || "(无辩论记录)"}`),
  ];

  const response = await llm.invoke(messages);
  const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  // Extract JSON from the final code block
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  let analysis: Analysis;
  try {
    const parsed = JSON.parse(jsonStr);
    analysis = {
      conclusion: parsed.conclusion ?? "综合研判完成",
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      sentiment: parsed.sentiment ?? "neutral",
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning ?? ""],
      rawOutput: text,
    };
  } catch {
    analysis = { conclusion: text.slice(0, 200), confidence: 0.5, sentiment: "neutral", reasoning: [text], rawOutput: text };
  }

  return addFinding(context, step.id, agentId, analysis);
}
```

- [ ] **Step 4: Add exports to src/index.ts**

```typescript
export { executeDebate } from "./workflow/primitives/debate.js";
export { executeVote } from "./workflow/primitives/vote.js";
export { executeSynthesize } from "./workflow/primitives/synthesize.js";
```

- [ ] **Step 5: Write __tests__/debate.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executeDebate } from "../workflow/primitives/debate.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeAgent(id: string, stance: "bullish" | "bearish"): BaseAgent {
  return {
    id, name: id, capabilities: ["debater"],
    personality: { stance },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id} argument`, confidence: 0.7, sentiment: stance, reasoning: ["r"],
    }),
  };
}

describe("executeDebate", () => {
  let registry: AgentRegistry;
  const fakeLLM = new FakeChatModel([
    { text: '{"conclusion":"牛方: 看多理由A/B/C","confidence":0.8,"sentiment":"bullish","reasoning":["A","B","C"]}' },
    { text: '{"conclusion":"熊方: 反驳看多，风险X/Y","confidence":0.7,"sentiment":"bearish","reasoning":["X","Y"]}' },
    { text: '{"conclusion":"牛方回应: 风险X可控","confidence":0.75,"sentiment":"bullish","reasoning":["回应X"]}' },
    { text: '{"conclusion":"熊方最后: 坚持看空","confidence":0.7,"sentiment":"bearish","reasoning":["最终"]}' },
  ]);

  beforeEach(() => { registry = new AgentRegistry(); });

  it("runs structured multi-round debate", async () => {
    registry.register(makeAgent("bull-1", "bullish"));
    registry.register(makeAgent("bear-1", "bearish"));
    const ctx = createContext({ type: "stock", code: "600519" }, "辩论茅台走势", "debate-test");

    const result = await executeDebate(
      {
        id: "d1", type: "debate", maxRounds: 2, prompt: "辩论 {target} 短期走势",
        agent: [{ id: "bull-1" }, { id: "bear-1" }],
      },
      registry, ctx, { llm: fakeLLM }
    );

    // 2 rounds × 2 agents = 4 findings
    expect(result.findings).toHaveLength(4);
    // 2 debate rounds
    expect(result.debateRounds).toHaveLength(2);
    expect(result.debateRounds[0].entries).toHaveLength(2);
  });

  it("throws with fewer than 2 agents", async () => {
    registry.register(makeAgent("only-one", "bullish"));
    const ctx = createContext({ type: "stock", code: "test" }, "task");
    await expect(
      executeDebate({ id: "d1", type: "debate", agent: [{ id: "only-one" }] }, registry, ctx, { llm: fakeLLM })
    ).rejects.toThrow("at least 2 agents");
  });
});
```

- [ ] **Step 6: Write __tests__/vote.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executeVote } from "../workflow/primitives/vote.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeAgent(id: string, stance: "bullish" | "bearish" | "neutral"): BaseAgent {
  return {
    id, name: id, capabilities: ["voter"],
    personality: { stance },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id} votes ${stance}`, confidence: 0.6, sentiment: stance, reasoning: ["r"],
    }),
  };
}

describe("executeVote", () => {
  let registry: AgentRegistry;
  const fakeLLM = new FakeChatModel([
    { text: '{"conclusion":"看多","confidence":0.8,"sentiment":"bullish","reasoning":["好"]}' },
    { text: '{"conclusion":"看空","confidence":0.6,"sentiment":"bearish","reasoning":["差"]}' },
    { text: '{"conclusion":"观望","confidence":0.5,"sentiment":"neutral","reasoning":["不确定"]}' },
  ]);

  beforeEach(() => { registry = new AgentRegistry(); });

  it("collects votes from all matching agents", async () => {
    registry.register(makeAgent("v1", "bullish"));
    registry.register(makeAgent("v2", "bearish"));
    registry.register(makeAgent("v3", "neutral"));
    const ctx = createContext({ type: "stock", code: "test" }, "投票");

    const result = await executeVote(
      { id: "vote1", type: "vote", match: { capability: "voter" }, count: "all" },
      registry, ctx, { llm: fakeLLM }
    );

    expect(result.findings).toHaveLength(3);
    const sentiments = result.findings.map(f => f.analysis.sentiment);
    expect(sentiments).toContain("bullish");
    expect(sentiments).toContain("bearish");
    expect(sentiments).toContain("neutral");
  });
});
```

- [ ] **Step 7: Write __tests__/synthesize.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { executeSynthesize } from "../workflow/primitives/synthesize.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext, addFinding, addDebateRound } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeJudge(): BaseAgent {
  return {
    id: "judge", name: "首席分析师", capabilities: ["judge", "synthesizer"],
    personality: { stance: "neutral" },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: "judges", confidence: 0.7, sentiment: "neutral", reasoning: ["r"],
    }),
  };
}

describe("executeSynthesize", () => {
  let registry: AgentRegistry;
  const fakeLLM = new FakeChatModel([
    { text: '综合研判: 短期偏多。\n```json\n{"conclusion":"短期看多，建议关注","confidence":0.72,"sentiment":"bullish","reasoning":["MACD金叉","量价配合"]}\n```' },
  ]);

  beforeEach(() => { registry = new AgentRegistry(); registry.register(makeJudge()); });

  it("synthesizes all findings into final report", async () => {
    let ctx = createContext({ type: "stock", code: "600519" }, "最终研判");
    const a1: Analysis = { conclusion: "看多", confidence: 0.8, sentiment: "bullish", reasoning: ["理由1"] };
    const a2: Analysis = { conclusion: "看空", confidence: 0.65, sentiment: "bearish", reasoning: ["理由2"] };
    ctx = addFinding(ctx, "step1", "bull", a1);
    ctx = addFinding(ctx, "step2", "bear", a2);
    ctx = addDebateRound(ctx, { round: 1, entries: [{ agent: "bull", argument: "看多" }, { agent: "bear", argument: "看空" }] });

    const result = await executeSynthesize(
      { id: "final", type: "synthesize", agent: { id: "judge" } },
      registry, ctx, { llm: fakeLLM }
    );

    const finalFinding = result.findings.find(f => f.step === "final");
    expect(finalFinding).toBeDefined();
    expect(finalFinding!.analysis.sentiment).toBe("bullish");
    expect(finalFinding!.analysis.confidence).toBe(0.72);
    expect(finalFinding!.analysis.rawOutput).toContain("综合研判");
  });
});
```

- [ ] **Step 8: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 34 tests PASS (26 + 8 new)

- [ ] **Step 9: Commit**

```bash
git add packages/core/
git commit -m "feat: debate, vote, synthesize primitives — complete adversarial primitive set"

---

### Task 11: @agenttrade/core — Builder DSL & Scheduler

**Files:**
- Create: `packages/core/src/workflow/builder.ts`
- Create: `packages/core/src/workflow/scheduler.ts`
- Modify: `packages/core/src/index.ts` (add exports)
- Create: `packages/core/src/__tests__/builder.test.ts`
- Create: `packages/core/src/__tests__/scheduler.test.ts`

**Interfaces:**
- Consumes: All 6 primitives (Tasks 8-10), AgentRegistry, ExecutionContext, all types (Task 5)
- Produces: `defineWorkflow()` Builder, `WorkflowScheduler` class

- [ ] **Step 1: Write src/workflow/builder.ts**

```typescript
import type {
  WorkflowDAG, WorkflowStep, PrimitiveType,
  AgentMatch, AgentCount,
} from "./types.js";

type StepDef = Omit<WorkflowStep, "id" | "type">;

interface PrimitiveFn {
  (config: Record<string, unknown>): { type: PrimitiveType; config: Record<string, unknown> };
}

// Primitive constructors — used as markers in the Builder DSL
export const analyze = (config: { agent: AgentMatch | { id?: string; capability?: string }; prompt: string }): WorkflowStep => ({
  id: "", type: "analyze", ...config,
}) as WorkflowStep;

export const critique = (config: { reviewer: string; targetStep: string; prompt?: string }): WorkflowStep => ({
  id: "", type: "critique", agent: { id: config.reviewer }, targetStep: config.targetStep, prompt: config.prompt,
}) as WorkflowStep;

// Composition helpers
export const parallel = (children: WorkflowStep[]): WorkflowStep => ({
  id: "", type: "parallel", children,
}) as WorkflowStep;

export const sequential = (children: WorkflowStep[]): WorkflowStep => ({
  id: "", type: "sequential", children,
}) as WorkflowStep;

// Panic — helper to define panel/vote/synthesize/debate steps inline
export const panel = (config: { match: AgentMatch; count?: AgentCount | "all"; prompt: string }): WorkflowStep => ({
  id: "", type: "panel", ...config,
}) as WorkflowStep;

export const synthesize = (config: { agent: string; prompt: string }): WorkflowStep => ({
  id: "", type: "synthesize", agent: { id: config.agent }, prompt: config.prompt,
}) as WorkflowStep;

export const vote = (config: { match: AgentMatch; count?: AgentCount | "all"; prompt: string }): WorkflowStep => ({
  id: "", type: "vote", ...config,
}) as WorkflowStep;

export const debate = (config: { agents: { id: string }[]; maxRounds?: number; prompt: string }): WorkflowStep => ({
  id: "", type: "debate", agent: config.agents as AgentMatch[], maxRounds: config.maxRounds, prompt: config.prompt,
}) as WorkflowStep;

// Builder
class WorkflowBuilder {
  private dag: WorkflowDAG;

  constructor(name: string, description?: string) {
    this.dag = { name, version: "1", description, steps: [] };
  }

  step(id: string, primitive: WorkflowStep, overrides?: Partial<WorkflowStep>): this {
    const step: WorkflowStep = { ...primitive, id, ...overrides };
    this.dag.steps.push(step);
    return this;
  }

  build(): WorkflowDAG {
    // Validate: connect steps with "next" if not specified
    for (let i = 0; i < this.dag.steps.length - 1; i++) {
      const step = this.dag.steps[i];
      if (!step.next && step.type !== "parallel" && step.type !== "sequential") {
        step.next = [this.dag.steps[i + 1].id];
      }
    }
    return JSON.parse(JSON.stringify(this.dag)); // deep clone
  }
}

export function defineWorkflow(config: { name: string; description?: string }): WorkflowBuilder {
  return new WorkflowBuilder(config.name, config.description);
}
```

- [ ] **Step 2: Write src/workflow/scheduler.ts**

```typescript
import type { WorkflowDAG, WorkflowStep, ExecutionContext } from "./types.js";
import type { AgentRegistry } from "../agent/registry.js";
import { executeAnalyze, type AnalyzeOptions } from "./primitives/analyze.js";
import { executePanel } from "./primitives/panel.js";
import { executeCritique } from "./primitives/critique.js";
import { executeDebate } from "./primitives/debate.js";
import { executeVote } from "./primitives/vote.js";
import { executeSynthesize } from "./primitives/synthesize.js";

export interface SchedulerEvents {
  onStepStart?: (stepId: string, type: string) => void;
  onStepComplete?: (stepId: string, context: ExecutionContext) => void;
  onPause?: (stepId: string, reason: string) => Promise<void>;
}

export class WorkflowScheduler {
  constructor(private registry: AgentRegistry) {}

  async execute(
    dag: WorkflowDAG,
    context: ExecutionContext,
    options: AnalyzeOptions = {},
    events: SchedulerEvents = {},
  ): Promise<ExecutionContext> {
    let currentCtx = context;

    // Flatten all steps and sub-steps into execution order
    const flatSteps = flattenSteps(dag.steps);

    for (const step of flatSteps) {
      events.onStepStart?.(step.id, step.type);

      switch (step.type) {
        case "analyze":
          currentCtx = await executeAnalyze(step, this.registry, currentCtx, options);
          break;
        case "panel":
          currentCtx = await executePanel(step, this.registry, currentCtx, options);
          break;
        case "critique":
          currentCtx = await executeCritique(step, this.registry, currentCtx, options);
          break;
        case "debate":
          currentCtx = await executeDebate(step, this.registry, currentCtx, options);
          break;
        case "vote":
          currentCtx = await executeVote(step, this.registry, currentCtx, options);
          break;
        case "synthesize":
          currentCtx = await executeSynthesize(step, this.registry, currentCtx, options);
          break;
        case "parallel": {
          if (!step.children) break;
          const results = await Promise.all(
            step.children.map(child => this.executeSubStep(child, currentCtx, options))
          );
          // Merge findings from parallel results
          const allFindings = results.flatMap(r => r.findings);
          const unique = allFindings.filter(
            (f, i, arr) => arr.findIndex(x => x.step === f.step && x.agent === f.agent) === i
          );
          currentCtx = { ...currentCtx, findings: [...currentCtx.findings, ...unique] };
          break;
        }
        case "sequential":
          if (step.children) {
            for (const child of step.children) {
              currentCtx = await this.executeSubStep(child, currentCtx, options);
            }
          }
          break;
      }

      events.onStepComplete?.(step.id, currentCtx);
    }

    return currentCtx;
  }

  private async executeSubStep(
    step: WorkflowStep,
    context: ExecutionContext,
    options: AnalyzeOptions,
  ): Promise<ExecutionContext> {
    // Simplified: only handle analyze sub-steps for now (used by parallel/sequential)
    return executeAnalyze(step, this.registry, context, options);
  }
}

function flattenSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const result: WorkflowStep[] = [];
  for (const step of steps) {
    result.push(step);
    // parallel/sequential children are handled inline, not flattened
    // (they execute within their parent step's switch case)
  }
  return result;
}
```

- [ ] **Step 3: Add exports to src/index.ts**

```typescript
export {
  defineWorkflow,
  analyze,
  critique,
  parallel,
  sequential,
  panel,
  synthesize,
  vote,
  debate,
} from "./workflow/builder.js";
export { WorkflowScheduler } from "./workflow/scheduler.js";
export type { SchedulerEvents } from "./workflow/scheduler.js";
```

- [ ] **Step 4: Write __tests__/builder.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { defineWorkflow, analyze, parallel, critique, synthesize } from "../workflow/builder.js";

describe("Workflow Builder", () => {
  it("builds a simple workflow DAG", () => {
    const dag = defineWorkflow({ name: "test-wf", description: "A test workflow" })
      .step("step1", analyze({ agent: { id: "a1" }, prompt: "分析 {target}" }))
      .step("step2", synthesize({ agent: "judge", prompt: "总结" }))
      .build();

    expect(dag.name).toBe("test-wf");
    expect(dag.steps).toHaveLength(2);
    expect(dag.steps[0].id).toBe("step1");
    expect(dag.steps[0].type).toBe("analyze");
    expect(dag.steps[0].next).toEqual(["step2"]);
  });

  it("builds workflow with parallel composition", () => {
    const dag = defineWorkflow({ name: "parallel-test" })
      .step("multi", parallel([
        analyze({ agent: { id: "a1" }, prompt: "p1" }).step as any,
        analyze({ agent: { id: "a2" }, prompt: "p2" }).step as any,
      ]))
      .step("final", synthesize({ agent: "judge", prompt: "总结" }))
      .build();

    expect(dag.steps[0].type).toBe("parallel");
    expect(dag.steps[0].children).toHaveLength(2);
  });

  it("produces valid JSON DAG", () => {
    const dag = defineWorkflow({ name: "json-test" })
      .step("a", analyze({ agent: { id: "x" }, prompt: "test" }))
      .build();
    const json = JSON.stringify(dag);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("json-test");
    expect(parsed.steps).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Write __tests__/scheduler.test.ts**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowScheduler } from "../workflow/scheduler.js";
import { defineWorkflow, analyze, synthesize } from "../workflow/builder.js";
import { AgentRegistry } from "../agent/registry.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";

function makeAgent(id: string, stance: "bullish" | "neutral" = "neutral"): BaseAgent {
  return {
    id, name: id, capabilities: ["analyst"],
    personality: { stance },
    tools: [],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id} analysis`, confidence: 0.7, sentiment: stance, reasoning: ["ok"],
    }),
  };
}

describe("WorkflowScheduler", () => {
  let registry: AgentRegistry;
  let scheduler: WorkflowScheduler;
  const fakeLLM = new FakeChatModel([
    { text: '{"conclusion":"step1分析结果","confidence":0.8,"sentiment":"bullish","reasoning":["理由A"]}' },
    { text: '综合研判: 看多。\n```json\n{"conclusion":"最终看多","confidence":0.75,"sentiment":"bullish","reasoning":["核心理由"]}\n```' },
  ]);

  beforeEach(() => {
    registry = new AgentRegistry();
    registry.register(makeAgent("analyst1", "bullish"));
    registry.register(makeAgent("judge1"));
    scheduler = new WorkflowScheduler(registry);
  });

  it("executes a simple 2-step workflow", async () => {
    const dag = defineWorkflow({ name: "simple" })
      .step("analysis", analyze({ agent: { id: "analyst1" }, prompt: "分析 {target}" }))
      .step("final", synthesize({ agent: "judge1", prompt: "总结" }))
      .build();

    const ctx = createContext({ type: "stock", code: "600519", name: "茅台" }, "分析任务", "simple");
    const events: string[] = [];
    const result = await scheduler.execute(dag, ctx, { llm: fakeLLM }, {
      onStepStart: (id) => events.push(`start:${id}`),
      onStepComplete: (id) => events.push(`done:${id}`),
    });

    expect(result.findings).toHaveLength(2);
    expect(events).toContain("start:analysis");
    expect(events).toContain("done:final");
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 39 tests PASS (34 + 5 new)

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat: Builder DSL + WorkflowScheduler — define and execute workflows"
```

---

### Task 12: @agenttrade/agents — 3 Built-in Agents

**Files:**
- Create: `packages/agents/src/technical-analyst/agent.ts`
- Create: `packages/agents/src/technical-analyst/tools.ts`
- Create: `packages/agents/src/technical-analyst/prompts.ts`
- Create: `packages/agents/src/financial-analyst/agent.ts`
- Create: `packages/agents/src/financial-analyst/tools.ts`
- Create: `packages/agents/src/financial-analyst/prompts.ts`
- Create: `packages/agents/src/judge/agent.ts`
- Create: `packages/agents/src/judge/prompts.ts`
- Modify: `packages/agents/src/index.ts` (export all 3 agents)
- Create: `packages/agents/src/__tests__/agents.test.ts`

**Interfaces:**
- Consumes: BaseAgent, Analysis, AgentPersona, ExecutionContext (Task 5), DataClient (Task 4)
- Produces: `TechnicalAnalystAgent`, `FinancialReportAgent`, `JudgeAgent`

- [ ] **Step 1: Write src/technical-analyst/prompts.ts**

```typescript
export const TECHNICAL_SYSTEM_PROMPT = `你是一位A股技术分析专家，擅长K线形态、趋势识别和技术指标分析。

分析时请关注：
1. 趋势判断：当前处于上升/下降/震荡趋势
2. 均线系统：5/10/20/60日均线的排列和交叉信号
3. MACD：金叉/死叉、底背离/顶背离
4. RSI：超买超卖区间
5. 布林带：宽度变化和价格在带内的位置
6. 关键支撑位和压力位
7. 量价配合关系

{stance_guide}

请用中文回复JSON格式：
{"conclusion":"你的技术分析结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["技术理由1","技术理由2","技术理由3"]}
`;

export function getStanceGuide(stance: string): string {
  if (stance === "bullish") return "你的立场偏多，积极寻找技术面的看涨信号和突破形态。";
  if (stance === "bearish") return "你的立场偏空，警惕技术面的看跌信号和破位风险。";
  return "保持中立客观，平衡看待多空信号。";
}
```

- [ ] **Step 2: Write src/technical-analyst/tools.ts**

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DataClient } from "@agenttrade/data-client";

const client = new DataClient({ baseUrl: process.env.DATA_SERVICE_URL ?? "http://localhost:9500" });

export const getKlineTool = tool(
  async ({ symbol, period, count }) => {
    return client.kline.get({ symbol, period: period as any, count });
  },
  {
    name: "get_kline",
    description: "获取A股K线数据。返回开盘价、最高价、最低价、收盘价、成交量。",
    schema: z.object({
      symbol: z.string().describe("股票代码，如 600519"),
      period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      count: z.number().default(120).describe("K线数量"),
    }),
  }
);

export const getIndicatorsTool = tool(
  async ({ symbol, names }) => {
    return client.kline.indicators({ symbol, names });
  },
  {
    name: "get_indicators",
    description: "获取技术指标：MACD、RSI、MA（多周期均线）、BOLL（布林带）",
    schema: z.object({
      symbol: z.string(),
      names: z.array(z.enum(["MACD", "RSI", "MA", "BOLL"])).default(["MACD", "RSI"]),
    }),
  }
);
```

- [ ] **Step 3: Write src/technical-analyst/agent.ts**

```typescript
import type { BaseAgent, AgentPersona, Analysis } from "@agenttrade/core";
import type { ExecutionContext } from "@agenttrade/core";
import type { StructuredTool } from "@langchain/core/tools";
import { TECHNICAL_SYSTEM_PROMPT, getStanceGuide } from "./prompts.js";
import { getKlineTool, getIndicatorsTool } from "./tools.js";

export class TechnicalAnalystAgent implements BaseAgent {
  id: string;
  name = "技术面分析Agent";
  capabilities = ["technical", "trend", "volume", "kline"];
  personality: AgentPersona;
  tools: StructuredTool[];

  constructor(config: { id: string; personality: AgentPersona }) {
    this.id = config.id;
    this.personality = config.personality;
    this.capabilities = [...this.capabilities, config.personality.stance];
    this.tools = [getKlineTool, getIndicatorsTool] as unknown as StructuredTool[];
  }

  canCritique = true;
  canDebate = true;

  async analyze(context: ExecutionContext): Promise<Analysis> {
    // In production, this would use LangChain AgentExecutor with tools.
    // For MVP, the analyze primitive handles LLM interaction.
    // This method is a fallback for direct agent invocation (tests).
    const systemPrompt = TECHNICAL_SYSTEM_PROMPT
      .replace("{stance_guide}", getStanceGuide(this.personality.stance));

    // Delegate to LangChain AgentExecutor or the framework's LLM layer
    // The actual execution is handled by executeAnalyze primitive
    throw new Error("TechnicalAnalystAgent.analyze() should be called via executeAnalyze primitive, not directly");
  }
}
```

- [ ] **Step 4: Write src/financial-analyst/prompts.ts, tools.ts, agent.ts** (similar pattern)

`prompts.ts`:
```typescript
export const FINANCIAL_SYSTEM_PROMPT = `你是一位A股基本面分析专家，擅长从财报数据中挖掘公司价值。

分析时请关注：
1. 营收和利润增长趋势（同比、环比）
2. 盈利能力：毛利率、净利率、ROE
3. 估值水平：PE、PB、PS 的历史分位数
4. 财务健康度：资产负债率、现金流
5. 行业地位和竞争格局
6. 公司治理和分红情况

{stance_guide}

请用中文回复JSON格式：
{"conclusion":"你的基本面分析结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["基本面理由1","基本面理由2","基本面理由3"]}
`;

export function getStanceGuide(stance: string): string {
  if (stance === "bullish") return "你偏多，重点挖掘公司的成长性和价值低估。";
  if (stance === "bearish") return "你偏空，重点发现财务风险、估值泡沫和业绩隐患。";
  return "保持客观，全面评估财务质量和估值合理性。";
}
```

`tools.ts`:
```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DataClient } from "@agenttrade/data-client";

const client = new DataClient({ baseUrl: process.env.DATA_SERVICE_URL ?? "http://localhost:9500" });

export const getFinancialSummaryTool = tool(
  async ({ symbol }) => client.financial.summary(symbol),
  { name: "get_financial_summary", description: "获取财报关键指标：营收增速、利润增速、毛利率、ROE等",
    schema: z.object({ symbol: z.string() }) }
);

export const getValuationTool = tool(
  async ({ symbol }) => client.financial.valuation(symbol),
  { name: "get_valuation", description: "获取估值指标：PE、PB、PS、市值等",
    schema: z.object({ symbol: z.string() }) }
);
```

`agent.ts`:
```typescript
import type { BaseAgent, AgentPersona, Analysis } from "@agenttrade/core";
import type { ExecutionContext } from "@agenttrade/core";
import type { StructuredTool } from "@langchain/core/tools";
import { FINANCIAL_SYSTEM_PROMPT, getStanceGuide } from "./prompts.js";
import { getFinancialSummaryTool, getValuationTool } from "./tools.js";

export class FinancialReportAgent implements BaseAgent {
  id: string;
  name = "财报分析Agent";
  capabilities = ["fundamental", "financial-report", "valuation", "a-share"];
  personality: AgentPersona;
  tools: StructuredTool[];

  constructor(config: { id: string; personality: AgentPersona }) {
    this.id = config.id;
    this.personality = config.personality;
    this.capabilities = [...this.capabilities, config.personality.stance];
    this.tools = [getFinancialSummaryTool, getValuationTool] as unknown as StructuredTool[];
  }

  canCritique = true;
  canDebate = true;

  async analyze(_context: ExecutionContext): Promise<Analysis> {
    throw new Error("FinancialReportAgent.analyze() should be called via executeAnalyze primitive");
  }
}
```

- [ ] **Step 5: Write src/judge/prompts.ts and agent.ts**

`prompts.ts`:
```typescript
export const JUDGE_SYSTEM_PROMPT = `你是一位公正的首席投资分析师，负责综合各方分析得出最终结论。

你的职责：
1. 客观审视所有分析观点，不偏袒任何一方
2. 识别各方的逻辑漏洞和未考虑的因素
3. 综合判断，给出可操作的建议

请用中文回复综合研判报告，末尾附加JSON：
\`\`\`json
{"conclusion":"最终结论","confidence":0.0-1.0,"sentiment":"bullish|bearish|neutral","reasoning":["核心理由1","核心理由2"]}
\`\`\``;
```

`agent.ts`:
```typescript
import type { BaseAgent, AgentPersona, Analysis } from "@agenttrade/core";
import type { ExecutionContext } from "@agenttrade/core";
import type { StructuredTool } from "@langchain/core/tools";
import { JUDGE_SYSTEM_PROMPT } from "./prompts.js";

export class JudgeAgent implements BaseAgent {
  id = "judge";
  name = "裁判/研判Agent";
  capabilities = ["judge", "synthesizer", "neutral"];
  personality: AgentPersona = { stance: "neutral", style: "balanced", description: "公正的首席分析师" };
  tools: StructuredTool[] = [];

  canCritique = true;
  canDebate = false;

  async analyze(_context: ExecutionContext): Promise<Analysis> {
    throw new Error("JudgeAgent.analyze() should be called via executeSynthesize primitive");
  }
}
```

- [ ] **Step 6: Rewrite src/index.ts**

```typescript
export { TechnicalAnalystAgent } from "./technical-analyst/agent.js";
export { FinancialReportAgent } from "./financial-analyst/agent.js";
export { JudgeAgent } from "./judge/agent.js";
```

- [ ] **Step 7: Write __tests__/agents.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { TechnicalAnalystAgent } from "../technical-analyst/agent.js";
import { FinancialReportAgent } from "../financial-analyst/agent.js";
import { JudgeAgent } from "../judge/agent.js";

describe("Built-in Agents", () => {
  it("TechnicalAnalystAgent has correct capabilities", () => {
    const agent = new TechnicalAnalystAgent({ id: "tech-1", personality: { stance: "bullish" } });
    expect(agent.id).toBe("tech-1");
    expect(agent.capabilities).toContain("technical");
    expect(agent.capabilities).toContain("bullish");
    expect(agent.tools).toHaveLength(2);
    expect(agent.canCritique).toBe(true);
  });

  it("FinancialReportAgent has correct capabilities", () => {
    const agent = new FinancialReportAgent({ id: "fin-1", personality: { stance: "neutral" } });
    expect(agent.capabilities).toContain("fundamental");
    expect(agent.tools).toHaveLength(2);
  });

  it("JudgeAgent has neutral stance", () => {
    const agent = new JudgeAgent();
    expect(agent.id).toBe("judge");
    expect(agent.personality.stance).toBe("neutral");
    expect(agent.canDebate).toBe(false);
  });

  it("agents can be instantiated with different personas", () => {
    const bull = new TechnicalAnalystAgent({ id: "tech-bull", personality: { stance: "bullish" } });
    const bear = new TechnicalAnalystAgent({ id: "tech-bear", personality: { stance: "bearish" } });
    expect(bull.personality.stance).toBe("bullish");
    expect(bear.personality.stance).toBe("bearish");
    expect(bull.id).not.toBe(bear.id);
  });
});
```

- [ ] **Step 8: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/agents test
```
Expected: 4 tests PASS

- [ ] **Step 9: Commit**

```bash
git add packages/agents/
git commit -m "feat: 3 built-in agents — technical, financial, judge"
```

---

### Task 13: Workflow Definitions & CLI

**Files:**
- Create: `workflows/bull-bear.ts`
- Create: `workflows/quick-scan.ts`
- Modify: `packages/cli/src/index.ts` (replace placeholder)
- Create: `packages/cli/src/commands/analyze.ts`
- Create: `packages/cli/src/reporter.ts`
- Create: `packages/cli/src/__tests__/reporter.test.ts`

**Interfaces:**
- Consumes: defineWorkflow, all primitives, agents, DataClient, AgentRegistry, WorkflowScheduler (Tasks 4-12)
- Produces: Complete runnable CLI with `agenttrade analyze` command

- [ ] **Step 1: Write workflows/bull-bear.ts**

```typescript
import { defineWorkflow, analyze, parallel, critique, synthesize } from "@agenttrade/core";

export const bullBearWorkflow = defineWorkflow({
  name: "bull-bear",
  description: "标准牛熊对抗分析 — 牛方和熊方技术面分析后互相审阅，裁判综合裁决"
})
.step("bull-analysis", analyze({
  agent: { capability: "bullish" },
  prompt: "从技术面看多 {target}，给出3条核心理由。关注均线多头排列、MACD金叉、放量突破等信号。",
}))
.step("bear-analysis", analyze({
  agent: { capability: "bearish" },
  prompt: "从技术面看空 {target}，给出3条核心理由。关注死叉、破位、顶背离、缩量等信号。",
}))
.step("cross-critique", parallel([
  critique({
    reviewer: "technical-bull",
    targetStep: "bear-analysis",
    prompt: "作为牛方，逐条审阅熊方的看空理由。哪些论据不够有力？哪些被夸大？请具体反驳。",
  }),
  critique({
    reviewer: "technical-bear",
    targetStep: "bull-analysis",
    prompt: "作为熊方，逐条审阅牛方的看多理由。哪些信号是假突破？哪些利好已被定价？请具体反驳。",
  }),
]))
.step("final", synthesize({
  agent: "judge",
  prompt: "综合牛方、熊方的分析以及双方的互驳，对 {target} 的短期走势做出最终研判。给出操作建议和关键点位。",
}))
.build();
```

- [ ] **Step 2: Write workflows/quick-scan.ts**

```typescript
import { defineWorkflow, analyze, synthesize } from "@agenttrade/core";

export const quickScanWorkflow = defineWorkflow({
  name: "quick-scan",
  description: "快速扫描 — 技术面和基本面并行分析，裁判直接综合"
})
.step("tech", analyze({
  agent: { capability: "technical" },
  prompt: "快速扫描 {target} 的技术面，给出关键信号（一页以内）。",
}))
.step("fundamental", analyze({
  agent: { capability: "fundamental" },
  prompt: "快速扫描 {target} 的基本面，给出关键估值指标（一页以内）。",
}))
.step("summary", synthesize({
  agent: "judge",
  prompt: "快速综合技术面和基本面信息，对 {target} 给出简要研判。",
}))
.build();
```

- [ ] **Step 3: Write packages/cli/src/commands/analyze.ts**

```typescript
import { AgentRegistry, registerInstances, WorkflowScheduler, createContext, setDefaultLLMProvider, setHumanInputHandler } from "@agenttrade/core";
import { TechnicalAnalystAgent, FinancialReportAgent, JudgeAgent } from "@agenttrade/agents";
import { DataClient } from "@agenttrade/data-client";
import type { AnalysisTarget, TargetType } from "@agenttrade/core";
import { bullBearWorkflow } from "../../../../workflows/bull-bear.js";
import { quickScanWorkflow } from "../../../../workflows/quick-scan.js";
import { Reporter } from "../reporter.js";

const WORKFLOWS: Record<string, any> = {
  "bull-bear": bullBearWorkflow,
  "quick-scan": quickScanWorkflow,
};

export interface AnalyzeOptions {
  code?: string;
  sector?: string;
  index?: string;
  workflow: string;
  provider?: "anthropic" | "openai";
  model?: string;
  dataServiceUrl?: string;
}

export async function runAnalyze(options: AnalyzeOptions): Promise<void> {
  // Setup
  if (options.provider) setDefaultLLMProvider(options.provider);
  if (options.dataServiceUrl) process.env.DATA_SERVICE_URL = options.dataServiceUrl;

  const workflowDag = WORKFLOWS[options.workflow];
  if (!workflowDag) {
    console.error(`Unknown workflow: ${options.workflow}`);
    console.error(`Available: ${Object.keys(WORKFLOWS).join(", ")}`);
    process.exit(1);
  }

  // Determine target
  let target: AnalysisTarget;
  if (options.sector) {
    target = { type: "sector", code: options.sector };
    // Lookup sector name
    const client = new DataClient({ baseUrl: options.dataServiceUrl });
    try {
      const info = await client.sector.constituents(options.sector);
      target.name = info.name;
    } catch { /* ignore, use code as name */ }
  } else if (options.index) {
    target = { type: "index", code: options.index };
  } else if (options.code) {
    target = { type: "stock", code: options.code };
    const client = new DataClient({ baseUrl: options.dataServiceUrl });
    try {
      const info = await client.reference.get(options.code);
      target.name = info.name;
    } catch { /* ignore */ }
  } else {
    console.error("Please specify --code, --sector, or --index");
    process.exit(1);
  }

  // Setup agent registry
  const registry = new AgentRegistry();
  registerInstances(registry, [
    new TechnicalAnalystAgent({ id: "technical-bull", personality: { stance: "bullish", style: "optimistic" } }),
    new TechnicalAnalystAgent({ id: "technical-bear", personality: { stance: "bearish", style: "skeptical" } }),
    new TechnicalAnalystAgent({ id: "technical-neutral", personality: { stance: "neutral" } }),
    new FinancialReportAgent({ id: "financial-bull", personality: { stance: "bullish" } }),
    new FinancialReportAgent({ id: "financial-bear", personality: { stance: "bearish" } }),
    new FinancialReportAgent({ id: "financial-neutral", personality: { stance: "neutral" } }),
    new JudgeAgent(),
  ]);

  const scheduler = new WorkflowScheduler(registry);
  const context = createContext(target, `对${target.name ?? target.code}进行分析`, options.workflow);
  const reporter = new Reporter();

  reporter.startAnalysis(target, options.workflow);

  const result = await scheduler.execute(workflowDag, context,
    { provider: options.provider, modelName: options.model },
    {
      onStepStart: (stepId, type) => reporter.onStepStart(stepId, type, registry),
      onStepComplete: (stepId, ctx) => reporter.onStepComplete(stepId, ctx),
    }
  );

  reporter.renderReport(result);
}
```

- [ ] **Step 4: Write packages/cli/src/reporter.ts**

```typescript
import chalk from "chalk";
import type { AnalysisTarget, ExecutionContext, AgentRegistry } from "@agenttrade/core";

const STEP_ICONS: Record<string, string> = {
  analyze: "📊", panel: "🧑‍🤝‍🧑", critique: "⚔️",
  debate: "🗣️", vote: "🗳️", synthesize: "📋",
  parallel: "⇉", sequential: "→",
};

export class Reporter {
  private startTime = 0;
  private stepCount = 0;
  private totalSteps = 0;

  startAnalysis(target: AnalysisTarget, workflowName: string): void {
    this.startTime = Date.now();
    const label = target.name ? `${target.code}（${target.name}）` : target.code;
    console.log(chalk.cyan(`\n🔍 正在分析 ${label}...`));
    console.log(chalk.gray(`   工作流: ${workflowName} [${target.type}]`));
  }

  onStepStart(stepId: string, type: string, registry?: AgentRegistry): void {
    this.stepCount++;
    const icon = STEP_ICONS[type] ?? "•";
    console.log(chalk.yellow(`\n${icon} Step ${this.stepCount}: ${stepId} (${type})`));
  }

  onStepComplete(stepId: string, ctx: ExecutionContext): void {
    const latest = ctx.findings.filter(f => f.step === stepId || f.step.startsWith(stepId));
    for (const f of latest.slice(-3)) { // show last 3 findings from this step
      const sentimentIcon = f.analysis.sentiment === "bullish" ? "🟢"
        : f.analysis.sentiment === "bearish" ? "🔴" : "⚪";
      console.log(chalk.green(`   ✅ [${f.agent}] ${f.analysis.conclusion.slice(0, 80)}`));
    }
  }

  renderReport(ctx: ExecutionContext): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(chalk.cyan("\n" + "━".repeat(50)));
    console.log(chalk.bold(`\n📄 分析报告 — ${ctx.target.name ?? ctx.target.code}`));

    const sentiments = ctx.findings.map(f => f.analysis.sentiment);
    const bulls = sentiments.filter(s => s === "bullish").length;
    const bears = sentiments.filter(s => s === "bearish").length;
    console.log(chalk.bold(`\n【多空分布】`));
    console.log(`  🟢 看多: ${bulls}  |  🔴 看空: ${bears}  |  ⚪ 中性: ${sentiments.length - bulls - bears}`);

    console.log(chalk.bold(`\n【各方观点】`));
    for (const f of ctx.findings) {
      const icon = f.analysis.sentiment === "bullish" ? "🟢"
        : f.analysis.sentiment === "bearish" ? "🔴" : "⚪";
      console.log(`  ${icon} [${f.agent}] ${f.analysis.conclusion} (置信度: ${f.analysis.confidence})`);
      for (const r of f.analysis.reasoning) {
        console.log(`     - ${r}`);
      }
    }

    const latest = ctx.findings.at(-1);
    if (latest && latest.analysis.rawOutput) {
      console.log(chalk.bold(`\n【综合研判】`));
      console.log(latest.analysis.rawOutput);
    }

    console.log(chalk.gray(`\n⏱️  耗时: ${elapsed}s  |  步骤: ${ctx.findings.length}`));
    console.log();
  }
}
```

- [ ] **Step 5: Write packages/cli/src/index.ts (CLI entry)**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { runAnalyze } from "./commands/analyze.js";

const program = new Command();

program
  .name("agenttrade")
  .description("AgentTrade — 多Agent对抗行情分析系统")
  .version("0.1.0");

program
  .command("analyze")
  .description("分析个股、板块或指数")
  .option("-c, --code <code>", "股票代码，如 600519")
  .option("-s, --sector <name>", "板块名称，如 CPO")
  .option("-i, --index <code>", "指数代码，如 000001")
  .option("-w, --workflow <name>", "工作流名称", "bull-bear")
  .option("-p, --provider <provider>", "LLM provider: anthropic | openai", "anthropic")
  .option("-m, --model <name>", "模型名称")
  .option("--data-service <url>", "数据服务地址", "http://localhost:9500")
  .action(async (options) => {
    try {
      await runAnalyze({
        code: options.code,
        sector: options.sector,
        index: options.index,
        workflow: options.workflow,
        provider: options.provider,
        model: options.model,
        dataServiceUrl: options.dataService,
      });
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  });

program.parse();
```

- [ ] **Step 6: Write __tests__/reporter.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { Reporter } from "../reporter.js";
import type { ExecutionContext } from "@agenttrade/core";

describe("Reporter", () => {
  it("can be instantiated", () => {
    const reporter = new Reporter();
    expect(reporter).toBeDefined();
  });

  it("startAnalysis does not throw", () => {
    const reporter = new Reporter();
    expect(() => reporter.startAnalysis({ type: "stock", code: "600519" }, "test")).not.toThrow();
  });

  it("renderReport handles empty context", () => {
    const reporter = new Reporter();
    const ctx: ExecutionContext = {
      target: { type: "stock", code: "000001" },
      task: "test",
      findings: [],
      debateRounds: [],
      workflowName: "test",
      startedAt: Date.now(),
    };
    expect(() => reporter.renderReport(ctx)).not.toThrow();
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd D:\c2 && pnpm --filter @agenttrade/cli test
```
Expected: 3 tests PASS

- [ ] **Step 8: Commit**

```bash
git add workflows/ packages/cli/
git commit -m "feat: workflow definitions + CLI — analyze command with reporter"
```

---

### Task 14: Integration Test — End-to-End Workflow Run

**Files:**
- Create: `packages/core/src/__tests__/integration.test.ts`
- Modify: `packages/cli/src/__tests__/reporter.test.ts` (add integration scenario)

**Interfaces:**
- Consumes: Everything (Tasks 1-13)
- Produces: Verified end-to-end workflow execution with fake LLM

- [ ] **Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistry } from "../agent/registry.js";
import { registerInstances } from "../agent/loader.js";
import { WorkflowScheduler } from "../workflow/scheduler.js";
import { defineWorkflow, analyze, parallel, critique, synthesize } from "../workflow/builder.js";
import { createContext } from "../workflow/context.js";
import { FakeChatModel } from "../llm/fake-model.js";
import type { BaseAgent, Analysis } from "../agent/types.js";
import type { ExecutionContext } from "../workflow/types.js";
import type { StructuredTool } from "@langchain/core/tools";

// Integration test: full bull-bear workflow with mock agents and fake LLM

function makeStanceAgent(id: string, stance: "bullish" | "bearish"): BaseAgent {
  return {
    id,
    name: id,
    capabilities: ["test", stance],
    personality: { stance },
    tools: [] as unknown as StructuredTool[],
    canCritique: true,
    canDebate: true,
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: `${id}: ${stance} analysis conclusion`,
      confidence: 0.75,
      sentiment: stance,
      reasoning: [`${stance} reason 1`, `${stance} reason 2`, `${stance} reason 3`],
    }),
  };
}

function makeJudge(): BaseAgent {
  return {
    id: "judge",
    name: "裁决Agent",
    capabilities: ["judge"],
    personality: { stance: "neutral" },
    tools: [] as unknown as StructuredTool[],
    analyze: async (_ctx: ExecutionContext): Promise<Analysis> => ({
      conclusion: "综合裁决：短期偏多",
      confidence: 0.7,
      sentiment: "bullish",
      reasoning: ["综合来看多方论据更强", "空方的风险提示需关注"],
    }),
  };
}

describe("Integration: full bull-bear workflow", () => {
  it("executes the complete multi-agent adversarial flow", async () => {
    // Setup
    const registry = new AgentRegistry();
    registerInstances(registry, [
      makeStanceAgent("bull-tech", "bullish"),
      makeStanceAgent("bear-tech", "bearish"),
      makeJudge(),
    ]);

    // Define bull-bear workflow
    const dag = defineWorkflow({ name: "bull-bear-test", description: "集成测试" })
      .step("bull-analysis", analyze({
        agent: { capability: "bullish" },
        prompt: "从技术面看多 {target}",
      }))
      .step("bear-analysis", analyze({
        agent: { capability: "bearish" },
        prompt: "从技术面看空 {target}",
      }))
      .step("cross-critique", parallel([
        critique({ reviewer: "bull-tech", targetStep: "bear-analysis" }),
        critique({ reviewer: "bear-tech", targetStep: "bull-analysis" }),
      ]))
      .step("final", synthesize({ agent: "judge", prompt: "综合裁决" }))
      .build();

    // Fake LLM responses for 4 steps: bull-analysis, bear-analysis, 2 critiques, synthesize
    const fakeLLM = new FakeChatModel([
      { text: '{"conclusion":"技术面看多","confidence":0.8,"sentiment":"bullish","reasoning":["A","B","C"]}' },
      { text: '{"conclusion":"技术面看空","confidence":0.7,"sentiment":"bearish","reasoning":["X","Y","Z"]}' },
      { text: '{"conclusion":"审阅熊方：论据X较弱","confidence":0.6,"sentiment":"bullish","reasoning":["问题1","问题2"]}' },
      { text: '{"conclusion":"审阅牛方：论据A存疑","confidence":0.6,"sentiment":"bearish","reasoning":["问题1","问题2"]}' },
      { text: '综合研判：短期看多。\n```json\n{"conclusion":"短期看多","confidence":0.72,"sentiment":"bullish","reasoning":["多方更强","关注风险"]}\n```' },
    ]);

    const scheduler = new WorkflowScheduler(registry);
    const ctx = createContext(
      { type: "stock", code: "600519", name: "贵州茅台" },
      "分析短期走势",
      "bull-bear-test"
    );

    // Execute
    const result = await scheduler.execute(dag, ctx, { llm: fakeLLM }, {
      onStepStart: (_id) => { /* silent */ },
      onStepComplete: (_id, _c) => { /* silent */ },
    });

    // Verify
    expect(result.findings.length).toBeGreaterThanOrEqual(4); // at least bull, bear, 2 critiques, final
    expect(result.findings.length).toBeLessThanOrEqual(5);

    // Bull analysis exists
    const bullFinding = result.findings.find(f => f.step === "bull-analysis");
    expect(bullFinding).toBeDefined();
    expect(bullFinding!.analysis.sentiment).toBe("bullish");

    // Bear analysis exists
    const bearFinding = result.findings.find(f => f.step === "bear-analysis");
    expect(bearFinding).toBeDefined();
    expect(bearFinding!.analysis.sentiment).toBe("bearish");

    // Final synthesis exists
    const finalFinding = result.findings.find(f => f.step === "final");
    expect(finalFinding).toBeDefined();
    expect(finalFinding!.agent).toBe("judge");

    // Context propagated correctly
    expect(result.target.code).toBe("600519");
    expect(result.workflowName).toBe("bull-bear-test");
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
cd D:\c2 && pnpm --filter @agenttrade/core test
```
Expected: 40 tests PASS (39 + 1 integration)

- [ ] **Step 3: Run full test suite across all packages**

```bash
cd D:\c2 && pnpm test
```
Expected: all packages PASS (core: 40, agents: 4, data-client: 5, cli: 3 = 52 total)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: integration test — full bull-bear workflow end-to-end with fake LLM"
```

```

```

```

```

```

```

```

```

