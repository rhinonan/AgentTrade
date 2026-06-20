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
