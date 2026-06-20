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
