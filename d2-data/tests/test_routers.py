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
