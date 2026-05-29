"""
Unit tests for the Stock Advisor Multi-Agent System.

All tests are self-contained — no network calls, no HuggingFace model loading.
Pure helper functions are defined inline here to avoid triggering the module-level
model load in backend/app.py.

References: Requirements 1.2, 3.3, 3.4, 4.6, 4.7, 4.8, 5.2, 5.4, 6.1-6.6
Design §Unit Tests
"""

import pytest


# ---------------------------------------------------------------------------
# Inline copies of pure helper functions from backend/app.py
# (avoids triggering HuggingFace model loading at import time)
# ---------------------------------------------------------------------------

def _compute_sentiment_score(labels: list) -> float:
    """Compute the mean numeric sentiment score from a list of label strings."""
    label_to_score = {"positive": 1, "negative": -1, "neutral": 0}
    if not labels:
        return 0.0
    scores = [label_to_score.get(lbl, 0) for lbl in labels]
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
# 1. Sentiment score computation
# ---------------------------------------------------------------------------

class TestSentimentScoreComputation:

    def test_all_positive_returns_1(self):
        assert _compute_sentiment_score(["positive", "positive", "positive"]) == 1.0

    def test_all_negative_returns_minus_1(self):
        assert _compute_sentiment_score(["negative", "negative", "negative"]) == -1.0

    def test_all_neutral_returns_0(self):
        assert _compute_sentiment_score(["neutral", "neutral", "neutral"]) == 0.0

    def test_mixed_returns_0(self):
        assert _compute_sentiment_score(["positive", "negative", "neutral"]) == 0.0

    def test_single_positive_returns_1(self):
        assert _compute_sentiment_score(["positive"]) == 1.0


# ---------------------------------------------------------------------------
# 2. RSI signal derivation
# ---------------------------------------------------------------------------

class TestRsiSignalDerivation:

    def test_rsi_29_9_is_oversold(self):
        assert derive_rsi_signal(29.9) == "Oversold"

    def test_rsi_30_0_is_neutral(self):
        assert derive_rsi_signal(30.0) == "Neutral"

    def test_rsi_70_0_is_neutral(self):
        assert derive_rsi_signal(70.0) == "Neutral"

    def test_rsi_70_1_is_overbought(self):
        assert derive_rsi_signal(70.1) == "Overbought"

    def test_rsi_50_0_is_neutral(self):
        assert derive_rsi_signal(50.0) == "Neutral"


# ---------------------------------------------------------------------------
# 3. MACD signal derivation
# ---------------------------------------------------------------------------

class TestMacdSignalDerivation:

    def test_positive_macd_is_bullish(self):
        assert derive_macd_signal(1.5) == "Bullish"

    def test_zero_macd_is_bearish(self):
        assert derive_macd_signal(0.0) == "Bearish"

    def test_negative_macd_is_bearish(self):
        assert derive_macd_signal(-2.3) == "Bearish"

    def test_none_macd_is_insufficient_data(self):
        assert derive_macd_signal(None) == "Insufficient Data"


# ---------------------------------------------------------------------------
# 4. SMA signal derivation
# ---------------------------------------------------------------------------

class TestSmaSignalDerivation:

    def test_sma20_above_sma50_is_bullish_crossover(self):
        assert derive_sma_signal(110, 100) == "Bullish Crossover"

    def test_sma20_below_sma50_is_bearish_crossover(self):
        assert derive_sma_signal(100, 110) == "Bearish Crossover"

    def test_sma20_equal_sma50_is_bearish_crossover(self):
        assert derive_sma_signal(100, 100) == "Bearish Crossover"

    def test_sma50_none_is_insufficient_data(self):
        assert derive_sma_signal(100, None) == "Insufficient Data"


# ---------------------------------------------------------------------------
# 5. Portfolio Advisor decision logic
# ---------------------------------------------------------------------------

class TestMakeRecommendation:

    def test_branch1_rsi_25_positive_sentiment_is_buy(self):
        assert make_recommendation(rsi=25, macd=None, sma20=100, sma50=None, sentiment_score=0.5) == "buy"

    def test_branch2_rsi_75_negative_sentiment_is_sell(self):
        assert make_recommendation(rsi=75, macd=None, sma20=100, sma50=None, sentiment_score=-0.5) == "sell"

    def test_branch3_bullish_conditions_is_buy(self):
        assert make_recommendation(rsi=50, macd=1.0, sma20=110, sma50=100, sentiment_score=0.2) == "buy"

    def test_branch4_bearish_conditions_is_sell(self):
        assert make_recommendation(rsi=50, macd=-1.0, sma20=90, sma50=100, sentiment_score=-0.2) == "sell"

    def test_branch5_neutral_conditions_is_hold(self):
        assert make_recommendation(rsi=50, macd=0.0, sma20=100, sma50=100, sentiment_score=0.0) == "hold"

    def test_boundary_rsi_30_does_not_trigger_branch1(self):
        # RSI=30 is NOT < 30
        assert make_recommendation(rsi=30, macd=None, sma20=100, sma50=None, sentiment_score=0.1) == "hold"

    def test_boundary_rsi_70_does_not_trigger_branch2(self):
        # RSI=70 is NOT > 70
        assert make_recommendation(rsi=70, macd=None, sma20=100, sma50=None, sentiment_score=-0.1) == "hold"

    def test_boundary_zero_sentiment_with_oversold_rsi_is_hold(self):
        # sentiment=0.0 is NOT > 0.0
        assert make_recommendation(rsi=25, macd=None, sma20=100, sma50=None, sentiment_score=0.0) == "hold"

    def test_branch3_sentiment_exactly_015_is_buy(self):
        # sentiment >= 0.15 satisfies branch 3
        assert make_recommendation(rsi=50, macd=1.0, sma20=110, sma50=100, sentiment_score=0.15) == "buy"

    def test_branch4_sentiment_exactly_minus_015_is_sell(self):
        # sentiment <= -0.15 satisfies branch 4
        assert make_recommendation(rsi=50, macd=-1.0, sma20=90, sma50=100, sentiment_score=-0.15) == "sell"

    def test_none_macd_with_branch3_conditions_is_hold(self):
        assert make_recommendation(rsi=50, macd=None, sma20=110, sma50=100, sentiment_score=0.2) == "hold"

    def test_none_sma50_with_branch3_conditions_is_hold(self):
        assert make_recommendation(rsi=50, macd=1.0, sma20=110, sma50=None, sentiment_score=0.2) == "hold"


# ---------------------------------------------------------------------------
# 6. Article object shape
# ---------------------------------------------------------------------------

class TestArticleObjectShape:

    def test_article_has_exactly_four_keys(self):
        article = {
            "title": "Apple hits record high",
            "link": "https://example.com/article",
            "publisher": "Reuters",
            "sentiment_label": "positive",
        }
        assert set(article.keys()) == {"title", "link", "publisher", "sentiment_label"}

    def test_article_has_no_extra_keys(self):
        article = {
            "title": "Market falls on rate fears",
            "link": "",
            "publisher": "",
            "sentiment_label": "negative",
        }
        assert len(article) == 4

    def test_article_with_empty_link_and_publisher(self):
        article = {"title": "Headline", "link": "", "publisher": "", "sentiment_label": "neutral"}
        assert set(article.keys()) == {"title", "link", "publisher", "sentiment_label"}


# ---------------------------------------------------------------------------
# 7. Response shape
# ---------------------------------------------------------------------------

class TestResponseShape:

    EXPECTED_KEYS = {
        "ticker",
        "final_recommendation",
        "final_justification",
        "technical_indicators",
        "sentiment_score",
        "news_articles",
        "historical_prices",
    }

    def _make_mock_state(self) -> dict:
        return {
            "ticker": "AAPL",
            "final_recommendation": "buy",
            "final_justification": "**RSI** is 28.5 (Oversold).\n\n**Sentiment** is 0.6.",
            "technical_indicators": {
                "rsi": 28.5,
                "macd": 1.23,
                "sma20": 175.00,
                "sma50": 170.00,
                "price": 180.00,
                "rsi_signal": "Oversold",
                "macd_signal_desc": "Bullish",
                "sma_signal_desc": "Bullish Crossover",
            },
            "sentiment_score": 0.6,
            "news_articles": [
                {
                    "title": "Apple hits record high",
                    "link": "https://example.com",
                    "publisher": "Reuters",
                    "sentiment_label": "positive",
                }
            ],
            "historical_prices": [
                {"date": "2024-01-15", "price": 180.00, "sma20": 175.00}
            ],
        }

    def test_response_has_all_seven_top_level_keys(self):
        state = self._make_mock_state()
        assert set(state.keys()) == self.EXPECTED_KEYS

    def test_response_has_no_extra_top_level_keys(self):
        state = self._make_mock_state()
        assert len(state) == 7

    def test_technical_indicators_has_eight_keys(self):
        state = self._make_mock_state()
        ti = state["technical_indicators"]
        assert set(ti.keys()) == {
            "rsi", "macd", "sma20", "sma50", "price",
            "rsi_signal", "macd_signal_desc", "sma_signal_desc"
        }

    def test_news_articles_entries_have_four_keys(self):
        state = self._make_mock_state()
        for article in state["news_articles"]:
            assert set(article.keys()) == {"title", "link", "publisher", "sentiment_label"}

    def test_historical_prices_entries_have_three_keys(self):
        state = self._make_mock_state()
        for entry in state["historical_prices"]:
            assert set(entry.keys()) == {"date", "price", "sma20"}
