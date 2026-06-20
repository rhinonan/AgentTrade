"""pytest configuration for async test support and mock fixtures."""

import pytest


def _make_mock_kline(count=120):
    """Return fake kline data."""
    bars = []
    for i in range(count):
        bars.append({
            "date": f"2024-01-{i+1:02d}" if i < 31 else f"2024-02-{(i-30):02d}",
            "open": 150.0 + i * 0.5,
            "high": 152.0 + i * 0.5,
            "low": 148.0 + i * 0.5,
            "close": 151.0 + i * 0.5,
            "volume": 1000000 + i * 1000,
            "amount": 150000000 + i * 150000,
        })
    return bars


def _mock_get_kline(symbol, period="daily", count=120, adjust="qfq"):
    return _make_mock_kline(count)


def _mock_get_stock_info(symbol):
    """Return fake stock info for valid symbols, None for invalid."""
    if symbol in ("600519", "000858", "000001", "300394"):
        return {
            "symbol": symbol,
            "name": "Test Stock",
            "industry": "测试行业",
            "marketCap": 1000000000000.0,
            "totalShares": 1000000000.0,
        }
    return None


@pytest.fixture(autouse=True)
def mock_all_adapters(monkeypatch):
    """Mock all akshare adapter imports used by routers to prevent real API calls."""
    # kline.py: from services.akshare_adapter import get_kline as fetch_kline
    monkeypatch.setattr("routers.kline.fetch_kline", _mock_get_kline)
    # reference.py: from services.akshare_adapter import get_stock_info
    monkeypatch.setattr("routers.reference.get_stock_info", _mock_get_stock_info)
    # financial.py does lazy import inside the function body
    monkeypatch.setattr("services.akshare_adapter.get_kline", _mock_get_kline)
    monkeypatch.setattr("services.akshare_adapter.get_stock_info", _mock_get_stock_info)
