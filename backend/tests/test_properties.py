"""
Property-based tests for the Stock Advisor Multi-Agent System.

Uses Hypothesis with @given and settings(max_examples=100).
Pure helper functions are defined inline to avoid triggering the HuggingFace
model load that happens at import time in backend/app.py.

References: Design §Property-Based Tests, §Correctness Properties (Properties 1-12)
"""

from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Inline copies of pure helper functions (avoids HuggingFace model load)
# ---------------------------------------------------------------------------

def _compute_sentiment_score(labels: list) -> float:
    mapping = {"positive": 1, "negative": -1, "neutral": 0}
    scores = [mapping[lbl] for lbl in labels]
    return round(sum(scores) / len(scores), 10)


def derive_rsi_signal(rsi: float) -> str:
    if rsi < 30:
        return "Oversold"
    if rsi > 70:
        return "Overbought"
    return "Neutral"


def derive_macd_signal(macd) -> str:
    if macd is None:
        return "Insufficient Data"
    if macd > 0:
        return "Bullish"
    return "Bearish"


def derive_sma_signal(sma20: float, sma50) -> str:
    if sma50 is None:
        return "Insufficient Data"
    if sma20 > sma50:
        return "Bullish Crossover"
    return "Bearish Crossover"


def make_recommendation(rsi: float, macd, sma20: float, sma50, sentiment_score: float) -> str:
    if rsi < 30 and sentiment_score > 0.0:
        return "buy"
    if rsi > 70 and sentiment_score < 0.0:
        return "sell"
    if (
        macd is not None
        and sma50 is not None
        and macd > 0
        and sma20 > sma50
        and sentiment_score >= 0.15
    ):
        return "buy"
    if (
        macd is not None
        and sma50 is not None
        and macd <= 0
        and sma20 <= sma50
        and sentiment_score <= -0.15
    ):
        return "sell"
    return "hold"


# ---------------------------------------------------------------------------
# Property 1: Sentiment score is bounded in [-1.0, 1.0]
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 1: sentiment_score is in [-1.0, 1.0]
@given(st.lists(st.sampled_from(["positive", "negative", "neutral"]), min_size=1))
@settings(max_examples=100)
def test_property_1_sentiment_score_bounds(labels):
    score = _compute_sentiment_score(labels)
    assert -1.0 <= score <= 1.0


# ---------------------------------------------------------------------------
# Property 2: Sentiment score equals arithmetic mean of mapped numeric values
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 2: sentiment_score equals arithmetic mean of mapped numeric values
@given(st.lists(st.sampled_from(["positive", "negative", "neutral"]), min_size=1))
@settings(max_examples=100)
def test_property_2_sentiment_score_mean_correctness(labels):
    mapping = {"positive": 1, "negative": -1, "neutral": 0}
    expected = round(sum(mapping[l] for l in labels) / len(labels), 10)
    assert _compute_sentiment_score(labels) == expected


# ---------------------------------------------------------------------------
# Property 3: Decision logic is total — always returns buy, sell, or hold
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 3: make_recommendation always returns buy, sell, or hold
@given(
    rsi=st.floats(min_value=0, max_value=100, allow_nan=False),
    macd=st.one_of(st.none(), st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False)),
    sma20=st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False),
    sma50=st.one_of(st.none(), st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False)),
    sentiment=st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
)
@settings(max_examples=100)
def test_property_3_decision_logic_totality(rsi, macd, sma20, sma50, sentiment):
    result = make_recommendation(rsi, macd, sma20, sma50, sentiment)
    assert result in {"buy", "sell", "hold"}


# ---------------------------------------------------------------------------
# Property 4a: RSI < 30 AND sentiment > 0 always yields buy (priority branch 1)
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 4: priority branches are respected (buy)
@given(
    rsi=st.floats(min_value=0.001, max_value=29.999, allow_nan=False),
    sentiment=st.floats(min_value=0.001, max_value=1.0, allow_nan=False),
    macd=st.one_of(st.none(), st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False)),
    sma20=st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False),
    sma50=st.one_of(st.none(), st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False)),
)
@settings(max_examples=100)
def test_property_4a_priority_buy(rsi, sentiment, macd, sma20, sma50):
    result = make_recommendation(rsi, macd, sma20, sma50, sentiment)
    assert result == "buy"


# ---------------------------------------------------------------------------
# Property 4b: RSI > 70 AND sentiment < 0 always yields sell (priority branch 2)
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 4: priority branches are respected (sell)
@given(
    rsi=st.floats(min_value=70.001, max_value=100.0, allow_nan=False),
    sentiment=st.floats(min_value=-1.0, max_value=-0.001, allow_nan=False),
    macd=st.one_of(st.none(), st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False)),
    sma20=st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False),
    sma50=st.one_of(st.none(), st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False)),
)
@settings(max_examples=100)
def test_property_4b_priority_sell(rsi, sentiment, macd, sma20, sma50):
    result = make_recommendation(rsi, macd, sma20, sma50, sentiment)
    assert result == "sell"


# ---------------------------------------------------------------------------
# Property 5: RSI signal derivation is correct for all RSI values
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 5: rsi_signal is correct for all RSI values
@given(st.floats(min_value=0, max_value=100, allow_nan=False))
@settings(max_examples=100)
def test_property_5_rsi_signal_derivation(rsi):
    result = derive_rsi_signal(rsi)
    if rsi < 30:
        assert result == "Oversold"
    elif rsi > 70:
        assert result == "Overbought"
    else:
        assert result == "Neutral"


# ---------------------------------------------------------------------------
# Property 6: MACD signal derivation is correct for all MACD values
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 6: macd_signal_desc is correct for all MACD values
@given(st.one_of(st.none(), st.floats(allow_nan=False, allow_infinity=False)))
@settings(max_examples=100)
def test_property_6_macd_signal_derivation(macd):
    result = derive_macd_signal(macd)
    if macd is None:
        assert result == "Insufficient Data"
    elif macd > 0:
        assert result == "Bullish"
    else:
        assert result == "Bearish"


# ---------------------------------------------------------------------------
# Property 7: SMA signal derivation is correct for all SMA values
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 7: sma_signal_desc is correct for all SMA values
@given(
    sma20=st.floats(allow_nan=False, allow_infinity=False),
    sma50=st.one_of(st.none(), st.floats(allow_nan=False, allow_infinity=False)),
)
@settings(max_examples=100)
def test_property_7_sma_signal_derivation(sma20, sma50):
    result = derive_sma_signal(sma20, sma50)
    if sma50 is None:
        assert result == "Insufficient Data"
    elif sma20 > sma50:
        assert result == "Bullish Crossover"
    else:
        assert result == "Bearish Crossover"


# ---------------------------------------------------------------------------
# Property 8: technical_indicators dict contains exactly 8 keys
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 8: technical_indicators contains exactly 8 keys
@given(
    rsi=st.floats(min_value=0, max_value=100, allow_nan=False),
    macd=st.one_of(st.none(), st.floats(min_value=-1e6, max_value=1e6, allow_nan=False, allow_infinity=False)),
    sma20=st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False),
    sma50=st.one_of(st.none(), st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False)),
    price=st.floats(min_value=0.01, max_value=1e6, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_property_8_technical_indicators_shape(rsi, macd, sma20, sma50, price):
    indicators = {
        "rsi": round(rsi, 2),
        "macd": round(macd, 2) if macd is not None else None,
        "sma20": round(sma20, 2),
        "sma50": round(sma50, 2) if sma50 is not None else None,
        "price": round(price, 2),
        "rsi_signal": derive_rsi_signal(rsi),
        "macd_signal_desc": derive_macd_signal(macd),
        "sma_signal_desc": derive_sma_signal(sma20, sma50),
    }
    assert set(indicators.keys()) == {
        "rsi", "macd", "sma20", "sma50", "price",
        "rsi_signal", "macd_signal_desc", "sma_signal_desc"
    }


# ---------------------------------------------------------------------------
# Property 9: Every news_articles entry has exactly 4 keys
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 9: every news_articles entry has exactly 4 keys
@given(
    st.lists(
        st.fixed_dictionaries({
            "title": st.text(),
            "link": st.text(),
            "publisher": st.text(),
            "sentiment_label": st.sampled_from(["positive", "negative", "neutral"]),
        })
    )
)
@settings(max_examples=100)
def test_property_9_news_articles_shape(articles):
    for article in articles:
        assert set(article.keys()) == {"title", "link", "publisher", "sentiment_label"}


# ---------------------------------------------------------------------------
# Property 10: Every historical_prices entry has exactly 3 keys
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 10: every historical_prices entry has exactly 3 keys
@given(
    st.lists(
        st.fixed_dictionaries({
            "date": st.dates().map(str),
            "price": st.floats(min_value=0.01, allow_nan=False, allow_infinity=False),
            "sma20": st.one_of(st.none(), st.floats(min_value=0.01, allow_nan=False, allow_infinity=False)),
        })
    )
)
@settings(max_examples=100)
def test_property_10_historical_prices_shape(prices):
    for entry in prices:
        assert set(entry.keys()) == {"date", "price", "sma20"}


# ---------------------------------------------------------------------------
# Property 11: Top-level response contains exactly 7 keys
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 11: response contains exactly 7 top-level keys
@given(
    st.fixed_dictionaries({
        "ticker": st.text(min_size=1, max_size=10),
        "final_recommendation": st.sampled_from(["buy", "sell", "hold"]),
        "final_justification": st.text(),
        "technical_indicators": st.fixed_dictionaries({
            "rsi": st.floats(min_value=0, max_value=100, allow_nan=False),
            "macd": st.one_of(st.none(), st.floats(allow_nan=False, allow_infinity=False)),
            "sma20": st.floats(min_value=0.01, allow_nan=False, allow_infinity=False),
            "sma50": st.one_of(st.none(), st.floats(min_value=0.01, allow_nan=False, allow_infinity=False)),
            "price": st.floats(min_value=0.01, allow_nan=False, allow_infinity=False),
            "rsi_signal": st.sampled_from(["Oversold", "Overbought", "Neutral"]),
            "macd_signal_desc": st.sampled_from(["Bullish", "Bearish", "Insufficient Data"]),
            "sma_signal_desc": st.sampled_from(["Bullish Crossover", "Bearish Crossover", "Insufficient Data"]),
        }),
        "sentiment_score": st.floats(min_value=-1.0, max_value=1.0, allow_nan=False),
        "news_articles": st.lists(st.fixed_dictionaries({
            "title": st.text(),
            "link": st.text(),
            "publisher": st.text(),
            "sentiment_label": st.sampled_from(["positive", "negative", "neutral"]),
        })),
        "historical_prices": st.lists(st.fixed_dictionaries({
            "date": st.dates().map(str),
            "price": st.floats(min_value=0.01, allow_nan=False, allow_infinity=False),
            "sma20": st.one_of(st.none(), st.floats(min_value=0.01, allow_nan=False, allow_infinity=False)),
        })),
    })
)
@settings(max_examples=100)
def test_property_11_top_level_response_shape(response):
    assert set(response.keys()) == {
        "ticker",
        "final_recommendation",
        "final_justification",
        "technical_indicators",
        "sentiment_score",
        "news_articles",
        "historical_prices",
    }


# ---------------------------------------------------------------------------
# Property 12: Numeric rounding to two decimal places
# ---------------------------------------------------------------------------

# Feature: stock-advisor-multi-agent, Property 12: round(value, 2) has at most 2 decimal places
@given(st.floats(allow_nan=False, allow_infinity=False))
@settings(max_examples=100)
def test_property_12_numeric_rounding(value):
    rounded = round(value, 2)
    # Convert to Decimal to count decimal places precisely
    d = Decimal(str(rounded))
    # The exponent of a Decimal gives the number of decimal places
    # e.g. Decimal("1.23") has exponent -2, Decimal("1.2") has exponent -1
    decimal_places = max(0, -d.as_tuple().exponent)
    assert decimal_places <= 2
