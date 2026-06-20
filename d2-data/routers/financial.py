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
