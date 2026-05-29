"""
Stock Advisor Multi-Agent System — Flask backend.

All production logic lives in this single file (single-file architecture).
"""

import concurrent.futures
import datetime
import logging
import sys
from typing import TypedDict

import pandas as pd
# pyrefly: ignore [missing-import]
import yfinance as yf

from flask import Flask, jsonify, request
from flask_cors import CORS
from langchain_huggingface import HuggingFacePipeline
from transformers import pipeline as hf_pipeline
# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, END

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Flask application
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from any origin on all routes

# ---------------------------------------------------------------------------
# Global state flags
# ---------------------------------------------------------------------------
MODEL_READY: bool = False
sentiment_pipeline = None  # HuggingFace pipeline singleton (loaded in Task 8)

# ---------------------------------------------------------------------------
# HuggingFace model loading via LangChain (at module level, before any request)
# ---------------------------------------------------------------------------
try:
    # Load the sentiment pipeline using transformers directly (DistilBERT is a
    # classification model — HuggingFacePipeline.from_model_id uses Seq2Seq by
    # default so we build the transformers pipeline first, then wrap it).
    _transformers_pipe = hf_pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        truncation=True,
        max_length=512,
    )
    # Wrap in LangChain's HuggingFacePipeline for LangChain compatibility
    _hf_lc = HuggingFacePipeline(pipeline=_transformers_pipe)
    # Expose the underlying transformers pipeline for direct batch inference
    # in the News Sentiment Analyst node: sentiment_pipeline(texts) → list[dict]
    sentiment_pipeline = _hf_lc.pipeline
    MODEL_READY = True
    logging.info("HuggingFace model loaded successfully via LangChain")
except Exception as e:
    logging.error(f"Failed to load HuggingFace model: {type(e).__name__}: {e}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# LangGraph shared state
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    ticker: str
    news_articles: list
    sentiment_score: float
    technical_indicators: dict
    historical_prices: list
    final_recommendation: str
    final_justification: str


# ---------------------------------------------------------------------------
# Agent node stubs (replaced in Tasks 4, 5, 6)
# ---------------------------------------------------------------------------

def _map_label_to_sentiment(label: str) -> tuple[str, int]:
    """
    Map a HuggingFace model output label to a (sentiment_label, numeric_score) pair.

    Normalises the raw label to lowercase, then:
    - Contains "pos"  → ("positive", +1)
    - Contains "neg"  → ("negative", -1)
    - "label_0"       → ("positive", +1)
    - "label_1"       → ("negative", -1)
    - "label_2"       → ("neutral",   0)
    - Anything else   → ("neutral",   0)
    """
    normalised = label.lower().strip()
    if "pos" in normalised:
        return "positive", 1
    if "neg" in normalised:
        return "negative", -1
    # Handle generic LABEL_N style outputs
    if normalised == "label_0":
        return "positive", 1
    if normalised == "label_1":
        return "negative", -1
    if normalised == "label_2":
        return "neutral", 0
    return "neutral", 0


def news_sentiment_analyst_node(state: AgentState) -> dict:
    """
    News Sentiment Analyst node.

    Fetches up to 10 recent news headlines (last 7 days) for the given ticker,
    classifies each using the global HuggingFace sentiment_pipeline, and returns
    a partial state update with news_articles and sentiment_score.
    """
    ticker: str = state["ticker"]
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)

    # --- Fetch headlines ---
    try:
        raw_news = yf.Ticker(ticker).news or []
    except Exception as exc:
        logger.warning("Failed to fetch news for %s: %s", ticker, exc)
        return {"news_articles": [], "sentiment_score": 0.0}

    # Filter to articles published within the last 7 days (supporting nested yfinance schema)
    recent: list[dict] = []
    for article in raw_news:
        content = article.get("content", {}) if "content" in article else article
        
        # Extract publisher
        pub_info = content.get("provider", {})
        if isinstance(pub_info, dict):
            publisher = pub_info.get("displayName", "") or pub_info.get("publisher", "")
        else:
            publisher = str(pub_info)
        if not publisher:
            publisher = content.get("publisher", "")
            
        title = content.get("title", "")
        link = (
            content.get("canonicalUrl", {}).get("url", "")
            or content.get("clickThroughUrl", {}).get("url", "")
            or content.get("link", "")
        )
        
        # Extract publish date
        pub_dt = None
        pub_date_str = content.get("pubDate") or content.get("displayTime")
        if pub_date_str:
            try:
                cleaned = pub_date_str
                if cleaned.endswith("Z"):
                    cleaned = cleaned[:-1] + "+00:00"
                pub_dt = datetime.datetime.fromisoformat(cleaned)
            except Exception:
                pass
                
        if pub_dt is None:
            pub_ts = content.get("providerPublishTime") or article.get("providerPublishTime")
            if pub_ts:
                try:
                    pub_dt = datetime.datetime.fromtimestamp(int(pub_ts), tz=datetime.timezone.utc)
                except Exception:
                    pass
                    
        if pub_dt is None:
            continue
            
        if pub_dt.tzinfo is None:
            pub_dt = pub_dt.replace(tzinfo=datetime.timezone.utc)
            
        if pub_dt >= cutoff:
            recent.append({
                "title": title,
                "link": link,
                "publisher": publisher,
            })

    # Cap at 10 articles
    recent = recent[:10]

    # Fallback: 0 headlines
    if not recent:
        return {"news_articles": [], "sentiment_score": 0.0}

    # --- Classify headlines ---
    # Attempt to run the entire batch through the sentiment pipeline.
    # On any HuggingFace exception, fall back to all-neutral.
    titles = [a.get("title", "") for a in recent]

    try:
        pipeline_results = sentiment_pipeline(titles)
        # pipeline_results is a list of dicts like [{"label": "POSITIVE", "score": 0.99}, ...]
        # Wrap each individual result extraction in try/except so a single
        # malformed result assigns "neutral" to that headline only.
        labels_and_scores: list[tuple[str, int]] = []
        for res in pipeline_results:
            try:
                sentiment_label, numeric_score = _map_label_to_sentiment(res["label"])
            except Exception as per_exc:
                logger.warning(
                    "Failed to parse sentiment result for a headline (%s): %s",
                    ticker,
                    per_exc,
                )
                sentiment_label, numeric_score = "neutral", 0
            labels_and_scores.append((sentiment_label, numeric_score))
    except Exception as exc:
        logger.warning("HuggingFace pipeline failed for %s: %s", ticker, exc)
        # Assign neutral to all headlines and set score to 0.0
        labels_and_scores = [("neutral", 0)] * len(recent)

    # --- Build news_articles list ---
    news_articles: list[dict] = []
    for article, (sentiment_label, _) in zip(recent, labels_and_scores):
        news_articles.append(
            {
                "title": article.get("title", ""),
                "link": article.get("link", ""),
                "publisher": article.get("publisher", ""),
                "sentiment_label": sentiment_label,
            }
        )

    # --- Compute sentiment_score ---
    numeric_scores = [score for _, score in labels_and_scores]
    if numeric_scores:
        raw_mean = sum(numeric_scores) / len(numeric_scores)
        sentiment_score = round(raw_mean, 10)
    else:
        sentiment_score = 0.0

    # If all labels ended up neutral due to a pipeline exception, score is 0.0
    # (already handled above since all numeric_scores would be 0)

    return {
        "news_articles": news_articles,
        "sentiment_score": sentiment_score,
    }


# ---------------------------------------------------------------------------
# Technical Analyst helper functions (used by the node and by property tests)
# ---------------------------------------------------------------------------

def derive_rsi_signal(rsi: float) -> str:
    """
    Derive the RSI signal string from a numeric RSI value.

    Returns:
        "Oversold"   when rsi < 30
        "Overbought" when rsi > 70
        "Neutral"    otherwise (30 <= rsi <= 70)
    """
    if rsi < 30:
        return "Oversold"
    if rsi > 70:
        return "Overbought"
    return "Neutral"


def derive_macd_signal(macd) -> str:
    """
    Derive the MACD signal description from a MACD value (float or None).

    Returns:
        "Insufficient Data" when macd is None
        "Bullish"           when macd > 0
        "Bearish"           when macd <= 0
    """
    if macd is None:
        return "Insufficient Data"
    if macd > 0:
        return "Bullish"
    return "Bearish"


def derive_sma_signal(sma20: float, sma50) -> str:
    """
    Derive the SMA crossover signal description.

    Args:
        sma20: The 20-period simple moving average (always a float).
        sma50: The 50-period simple moving average (float or None).

    Returns:
        "Insufficient Data" when sma50 is None
        "Bullish Crossover" when sma20 > sma50
        "Bearish Crossover" when sma20 <= sma50
    """
    if sma50 is None:
        return "Insufficient Data"
    if sma20 > sma50:
        return "Bullish Crossover"
    return "Bearish Crossover"


def technical_analyst_node(state: AgentState) -> dict:
    """
    Technical Analyst node.

    Fetches 6 months of OHLCV data for the ticker, computes RSI (14-period
    Wilder's smoothing), MACD (EMA12 - EMA26), SMA_20, and SMA_50, derives
    signal strings, and builds the technical_indicators dict and
    historical_prices array.

    Raises:
        ValueError: if yfinance returns no data or fewer than 15 trading days.
    """
    ticker: str = state["ticker"]

    # --- Fetch OHLCV data ---
    df = yf.download(ticker, period="6mo", progress=False, auto_adjust=True)

    # Flatten MultiIndex columns if present (yfinance >=0.2 may return them)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    if df.empty or len(df) < 15:
        raise ValueError(
            f"Insufficient price data for ticker '{ticker}': "
            f"only {len(df)} trading day(s) returned."
        )

    close = df["Close"].dropna()
    n = len(close)

    # --- RSI (14-period Wilder's smoothing) ---
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)

    # Initial average gain/loss over first 14 periods (simple mean)
    avg_gain = gain.iloc[1:15].mean()
    avg_loss = loss.iloc[1:15].mean()

    # Apply Wilder's EMA (alpha = 1/14) for subsequent periods
    alpha = 1.0 / 14
    for i in range(15, n):
        avg_gain = alpha * gain.iloc[i] + (1 - alpha) * avg_gain
        avg_loss = alpha * loss.iloc[i] + (1 - alpha) * avg_loss

    if avg_loss == 0:
        rsi_value = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi_value = 100.0 - (100.0 / (1.0 + rs))

    # --- MACD (EMA12 - EMA26) ---
    if n >= 26:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_series = ema12 - ema26
        macd_raw = macd_series.iloc[-1]
        macd_value = None if pd.isna(macd_raw) else float(macd_raw)
    else:
        macd_value = None

    # --- SMA_20 ---
    sma20_value = float(close.iloc[-20:].mean()) if n >= 20 else float(close.mean())

    # --- SMA_50 ---
    if n >= 50:
        sma50_value: float | None = float(close.iloc[-50:].mean())
    else:
        sma50_value = None

    # --- Most recent closing price ---
    price_value = float(close.iloc[-1])

    # --- Derive signal strings ---
    rsi_signal = derive_rsi_signal(rsi_value)
    macd_signal_desc = derive_macd_signal(macd_value)
    sma_signal_desc = derive_sma_signal(sma20_value, sma50_value)

    # --- Build technical_indicators dict (round non-null numerics to 2 dp) ---
    technical_indicators = {
        "rsi": round(rsi_value, 2),
        "macd": round(macd_value, 2) if macd_value is not None else None,
        "sma20": round(sma20_value, 2),
        "sma50": round(sma50_value, 2) if sma50_value is not None else None,
        "price": round(price_value, 2),
        "rsi_signal": rsi_signal,
        "macd_signal_desc": macd_signal_desc,
        "sma_signal_desc": sma_signal_desc,
    }

    # --- Build historical_prices for the last 30 trading days ---
    last_30 = close.iloc[-30:]
    historical_prices: list[dict] = []

    for idx, (date_idx, price_raw) in enumerate(last_30.items()):
        # Position of this entry within the full close series
        pos_in_full = n - len(last_30) + idx  # 0-based index in `close`

        # SMA_20 for this entry: need at least 20 preceding trading days
        # i.e., pos_in_full >= 19 (indices 0..18 are the first 19 days, so
        # index 19 is the 20th day and the first for which a 20-day window exists)
        if pos_in_full >= 19:
            window = close.iloc[pos_in_full - 19: pos_in_full + 1]  # 20 values
            sma20_hist_raw = window.mean()
            sma20_hist: float | None = (
                None if pd.isna(sma20_hist_raw) else round(float(sma20_hist_raw), 2)
            )
        else:
            sma20_hist = None

        # Format date as ISO 8601 string (YYYY-MM-DD)
        if hasattr(date_idx, "date"):
            date_str = date_idx.date().isoformat()
        else:
            date_str = str(date_idx)[:10]

        price_hist = round(float(price_raw), 2) if not pd.isna(price_raw) else None

        historical_prices.append(
            {
                "date": date_str,
                "price": price_hist,
                "sma20": sma20_hist,
            }
        )

    return {
        "technical_indicators": technical_indicators,
        "historical_prices": historical_prices,
    }


def make_recommendation(
    rsi: float,
    macd,
    sma20: float,
    sma50,
    sentiment_score: float,
) -> str:
    """
    Apply the five-branch Portfolio Advisor decision logic in strict priority order.

    Args:
        rsi:             RSI value (float).
        macd:            MACD value (float or None).
        sma20:           SMA_20 value (float).
        sma50:           SMA_50 value (float or None).
        sentiment_score: Aggregate sentiment score in [-1.0, 1.0].

    Returns:
        One of "buy", "sell", or "hold".
    """
    # Branch 1 (highest priority): oversold + positive sentiment → buy
    if rsi < 30 and sentiment_score > 0.0:
        return "buy"

    # Branch 2: overbought + negative sentiment → sell
    if rsi > 70 and sentiment_score < 0.0:
        return "sell"

    # Branch 3: bullish MACD + bullish SMA crossover + positive sentiment → buy
    # Guard: None MACD or None SMA_50 does NOT satisfy the numeric comparison.
    if (
        macd is not None
        and sma50 is not None
        and macd > 0
        and sma20 > sma50
        and sentiment_score > 0.0
    ):
        return "buy"

    # Branch 4: bearish MACD + bearish SMA crossover + negative sentiment → sell
    # Guard: None MACD or None SMA_50 does NOT satisfy the numeric comparison.
    if (
        macd is not None
        and sma50 is not None
        and macd <= 0
        and sma20 <= sma50
        and sentiment_score < 0.0
    ):
        return "sell"

    # Branch 5 (default): hold
    return "hold"


def portfolio_advisor_node(state: AgentState) -> dict:
    """
    Portfolio Advisor node.

    Reads technical_indicators and sentiment_score from state, applies the
    five-branch decision logic via make_recommendation(), and composes a
    Markdown justification string.

    Returns a partial state update dict with final_recommendation and
    final_justification.
    """
    indicators: dict = state["technical_indicators"]
    sentiment_score: float = state["sentiment_score"]

    rsi: float = indicators["rsi"]
    macd = indicators["macd"]          # float or None
    sma20: float = indicators["sma20"]
    sma50 = indicators["sma50"]        # float or None
    rsi_signal: str = indicators["rsi_signal"]
    macd_signal_desc: str = indicators["macd_signal_desc"]
    sma_signal_desc: str = indicators["sma_signal_desc"]

    # Determine recommendation
    recommendation = make_recommendation(rsi, macd, sma20, sma50, sentiment_score)

    # Format MACD display value
    macd_display = str(macd) if macd is not None else "N/A"

    # Compose Markdown justification
    justification = (
        f"**RSI** is {rsi} (**{rsi_signal}**). "
        f"An RSI below 30 indicates an oversold condition, while above 70 indicates overbought."
        f"\n\n"
        f"**MACD** is {macd_display} (**{macd_signal_desc}**). "
        f"A positive MACD signals bullish momentum; a negative or zero MACD signals bearish momentum."
        f"\n\n"
        f"**SMA Crossover** signal is **{sma_signal_desc}** "
        f"(SMA_20 = {sma20}, SMA_50 = {sma50 if sma50 is not None else 'N/A'}). "
        f"A bullish crossover occurs when the short-term average rises above the long-term average."
        f"\n\n"
        f"**Sentiment Score** is {sentiment_score}. "
        f"Scores above 0 reflect positive market sentiment; scores below 0 reflect negative sentiment."
        f"\n\n"
        f"**Recommendation: {recommendation.upper()}** — based on the combined technical and sentiment signals above."
    )

    return {
        "final_recommendation": recommendation,
        "final_justification": justification,
    }


# ---------------------------------------------------------------------------
# LangGraph pipeline construction
# ---------------------------------------------------------------------------

_graph = StateGraph(AgentState)
_graph.add_node("news_sentiment_analyst", news_sentiment_analyst_node)
_graph.add_node("technical_analyst", technical_analyst_node)
_graph.add_node("portfolio_advisor", portfolio_advisor_node)
_graph.set_entry_point("news_sentiment_analyst")
_graph.add_edge("news_sentiment_analyst", "technical_analyst")
_graph.add_edge("technical_analyst", "portfolio_advisor")
_graph.add_edge("portfolio_advisor", END)
pipeline = _graph.compile()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/analyze", methods=["GET"])
def analyze():
    """
    GET /api/analyze?ticker=<SYMBOL>

    Returns a full analysis report for the given ticker symbol.

    Error responses:
        400 — ticker query parameter is absent or empty
        503 — HuggingFace model not yet ready
        504 — pipeline execution timed out (> 60 s)
        500 — any other internal error
    """
    ticker = request.args.get("ticker", "").strip()

    # Layer 1 — validate ticker parameter
    if not ticker:
        return jsonify({"error": "ticker query parameter is required"}), 400

    # Layer 1 — model readiness check (wired fully in Task 7/8)
    if not MODEL_READY:
        return jsonify({"error": "Model not yet ready. Please retry shortly."}), 503

    # Build the initial state with zero values for all fields except ticker
    initial_state: AgentState = {
        "ticker": ticker,
        "news_articles": [],
        "sentiment_score": 0.0,
        "technical_indicators": {},
        "historical_prices": [],
        "final_recommendation": "",
        "final_justification": "",
    }

    # Invoke the pipeline with a 60-second timeout
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(pipeline.invoke, initial_state)
            try:
                final_state = future.result(timeout=60)
            except concurrent.futures.TimeoutError:
                return (
                    jsonify({"error": "Analysis timed out after 60 seconds"}),
                    504,
                )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 500
    except Exception as exc:
        return (
            jsonify(
                {
                    "error": (
                        f"Internal server error: {type(exc).__name__}: {exc}"
                    )
                }
            ),
            500,
        )

    # Return the seven top-level keys from the final state
    return (
        jsonify(
            {
                "ticker": final_state["ticker"],
                "final_recommendation": final_state["final_recommendation"],
                "final_justification": final_state["final_justification"],
                "technical_indicators": final_state["technical_indicators"],
                "sentiment_score": final_state["sentiment_score"],
                "news_articles": final_state["news_articles"],
                "historical_prices": final_state["historical_prices"],
            }
        ),
        200,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(port=5001, debug=False)
