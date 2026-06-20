"""K-line and technical indicator endpoints."""

from fastapi import APIRouter, Query, HTTPException
from services.akshare_adapter import get_kline as fetch_kline
from services.indicator_calc import calc_macd, calc_rsi, calc_ma, calc_bollinger

router = APIRouter(prefix="/kline", tags=["kline"])


@router.get("/{symbol}")
async def kline(
    symbol: str,
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    count: int = Query(120, ge=1, le=500),
    adjust: str = Query("qfq", pattern="^(none|qfq|hfq)$"),
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
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
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
