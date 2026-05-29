"""
Integration tests for the Stock Advisor Multi-Agent API.

These tests require the Flask server running on http://localhost:5001.
Run with: pytest -m integration
Start the server with: python backend/app.py
"""

import pytest
import requests

pytestmark = pytest.mark.integration

BASE_URL = "http://localhost:5001"


def test_happy_path_aapl():
    """GET /api/analyze?ticker=AAPL returns 200 with all required fields."""
    response = requests.get(f"{BASE_URL}/api/analyze", params={"ticker": "AAPL"})

    assert response.status_code == 200

    data = response.json()

    # All 7 top-level keys present — no more, no fewer
    assert set(data.keys()) == {
        "ticker",
        "final_recommendation",
        "final_justification",
        "technical_indicators",
        "sentiment_score",
        "news_articles",
        "historical_prices",
    }

    # final_recommendation is one of the valid values
    assert data["final_recommendation"] in {"buy", "sell", "hold"}

    # sentiment_score is a float in [-1.0, 1.0]
    sentiment = data["sentiment_score"]
    assert isinstance(sentiment, (int, float))
    assert -1.0 <= sentiment <= 1.0

    # technical_indicators has all 8 required keys
    assert set(data["technical_indicators"].keys()) == {
        "rsi", "macd", "sma20", "sma50", "price",
        "rsi_signal", "macd_signal_desc", "sma_signal_desc",
    }

    # Each news_articles entry has exactly the 4 required keys
    for article in data["news_articles"]:
        assert set(article.keys()) == {"title", "link", "publisher", "sentiment_label"}

    # Each historical_prices entry has exactly the 3 required keys
    for entry in data["historical_prices"]:
        assert set(entry.keys()) == {"date", "price", "sma20"}


def test_missing_ticker_returns_400():
    """GET /api/analyze (no ticker param) returns HTTP 400 with an error key."""
    response = requests.get(f"{BASE_URL}/api/analyze")

    assert response.status_code == 400
    assert "error" in response.json()


def test_empty_ticker_returns_400():
    """GET /api/analyze?ticker= (empty ticker) returns HTTP 400 with an error key."""
    response = requests.get(f"{BASE_URL}/api/analyze", params={"ticker": ""})

    assert response.status_code == 400
    assert "error" in response.json()


def test_invalid_ticker_returns_500():
    """GET /api/analyze?ticker=INVALIDXYZ999 returns HTTP 500 with an error key."""
    response = requests.get(
        f"{BASE_URL}/api/analyze", params={"ticker": "INVALIDXYZ999"}
    )

    assert response.status_code == 500
    assert "error" in response.json()


def test_cors_headers_present():
    """GET /api/analyze?ticker=AAPL response includes Access-Control-Allow-Origin: *."""
    response = requests.get(f"{BASE_URL}/api/analyze", params={"ticker": "AAPL"})

    assert "Access-Control-Allow-Origin" in response.headers
    assert response.headers["Access-Control-Allow-Origin"] == "*"
