# STOC.AI — Multi-Agent AI Stock Advisor

> **Multiple specialized AI agents analyzing markets in real-time. Uncover patterns. Exploit inefficiencies. Command your portfolio.**

STOC.AI is a full-stack multi-agent stock analysis system that combines **NLP-powered news sentiment analysis**, **quantitative technical indicators**, and a **rule-based portfolio advisor** into a unified LangGraph pipeline. Enter any stock ticker and receive an instant **Buy / Hold / Sell** recommendation backed by transparent, data-driven justification.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Reference](#api-reference)
- [Decision Logic](#decision-logic)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Design & UI](#design--ui)
- [License](#license)

---

## Features

- 🤖 **Three Specialized AI Agents** — Sentiment Analyst, Technical Analyst, and Portfolio Advisor operating in a coordinated pipeline
- 📰 **Real-Time News Sentiment** — Fetches up to 10 recent headlines (last 7 days) via Yahoo Finance and classifies each with DistilBERT sentiment analysis
- 📊 **Technical Indicators** — Computes RSI (14-period Wilder's smoothing), MACD (EMA-12 minus EMA-26), SMA-20, and SMA-50 from 6 months of OHLCV data
- 🧠 **LangGraph Orchestration** — Agents execute as nodes in a directed acyclic graph with typed shared state
- 📈 **Interactive 30-Day Price Chart** — SVG-based chart with hover tooltips, price trend line, and SMA-20 overlay
- 🎨 **Neo-Brutalist / Bauhaus UI** — Premium design with bold typography, geometric shapes, and micro-interactions
- 🐳 **Docker Ready** — Production Dockerfile with Gunicorn for one-command deployment
- ✅ **Comprehensive Test Suite** — 40+ unit tests, 12 property-based tests (Hypothesis), and integration tests

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│   Bauhaus / Neo-Brutalist UI  •  TailwindCSS  •  SVG Charts │
│                     localhost:5173                          │
└─────────────────────┬───────────────────────────────────────┘
                      │  HTTP GET /api/analyze?ticker=AAPL
                      │  (Vite dev proxy → :5001)
┌─────────────────────▼───────────────────────────────────────┐
│                      BACKEND (Flask + LangGraph)            │
│                     localhost:5001                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               LangGraph StateGraph                  │    │
│  │                                                     │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌────────┐ │    │
│  │  │  News        │──▶│  Technical    │──▶│Portf.  │ │    │
│  │  │  Sentiment   │    │  Analyst     │    │Advisor │ │    │
│  │  │  Analyst     │    │              │    │        │ │    │
│  │  └──────────────┘    └──────────────┘    └────────┘ │    │
│  │       │                    │                 │      │    │
│  │   HuggingFace         yfinance         Decision     │    │
│  │   DistilBERT          OHLCV Data       Logic        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Pipeline

The system employs three agents orchestrated sequentially via **LangGraph's `StateGraph`**:

### 1. News Sentiment Analyst

- **Data Source:** Yahoo Finance news API (`yfinance.Ticker.news`)
- **Model:** `distilbert-base-uncased-finetuned-sst-2-english` loaded via LangChain's `HuggingFacePipeline`
- **Process:**
  1. Fetches up to 10 headlines from the last 7 days
  2. Runs batch sentiment classification (POSITIVE / NEGATIVE)
  3. Maps labels to numeric scores (+1, -1, 0) and computes the arithmetic mean
- **Output:** `news_articles` (list of headline objects with sentiment labels), `sentiment_score` (float in [-1.0, 1.0])

### 2. Technical Analyst

- **Data Source:** 6 months of OHLCV data via `yfinance.download()`
- **Indicators Computed:**
  | Indicator | Method |
  |-----------|--------|
  | **RSI** | 14-period Wilder's smoothing |
  | **MACD** | EMA(12) - EMA(26) |
  | **SMA-20** | 20-day simple moving average |
  | **SMA-50** | 50-day simple moving average |
- **Signal Derivation:**
  - RSI < 30 → `Oversold` · RSI > 70 → `Overbought` · else → `Neutral`
  - MACD > 0 → `Bullish` · MACD ≤ 0 → `Bearish` · None → `Insufficient Data`
  - SMA-20 > SMA-50 → `Bullish Crossover` · else → `Bearish Crossover`
- **Output:** `technical_indicators` (dict with 8 keys), `historical_prices` (last 30 trading days with per-day SMA-20)

### 3. Portfolio Advisor

- **Input:** `technical_indicators` + `sentiment_score` from the prior two agents
- **Output:** `final_recommendation` (buy / sell / hold) + `final_justification` (Markdown-formatted rationale)
- **Decision Logic:** See [Decision Logic](#decision-logic) below

### Shared State Schema

```python
class AgentState(TypedDict):
    ticker: str
    news_articles: list
    sentiment_score: float
    technical_indicators: dict
    historical_prices: list
    final_recommendation: str
    final_justification: str
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Python 3.9+** | Runtime |
| **Flask 3.0+** | REST API framework |
| **Flask-CORS 4.0+** | Cross-origin request handling |
| **LangGraph 0.2+** | Multi-agent state graph orchestration |
| **LangChain 0.2+** | LLM framework / HuggingFace integration |
| **Transformers 4.40+** | DistilBERT sentiment pipeline |
| **PyTorch 2.2+** | Model inference backend |
| **yfinance 0.2+** | Yahoo Finance market data API |
| **pandas 2.0+** | Data manipulation for OHLCV analysis |
| **Gunicorn 20.1+** | Production WSGI server (Linux / Docker) |

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **TailwindCSS 3.4** | Utility-first CSS framework |
| **Lucide React** | Icon library |
| **Google Fonts** | Space Grotesk + Inter typography |
| **Material Symbols** | Icon font for UI elements |

### Testing

| Technology | Purpose |
|---|---|
| **pytest** | Test runner |
| **Hypothesis 6.100+** | Property-based testing framework |
| **requests** | Integration test HTTP client |

### DevOps

| Technology | Purpose |
|---|---|
| **Docker** | Containerization |
| **ESLint** | JavaScript linting |
| **PostCSS + Autoprefixer** | CSS processing |

---

## Project Structure

```
Multi-Agent/
├── backend/
│   ├── app.py                  # Flask app — all agents, routes, and pipeline
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production Docker image (Python 3.9-slim + Gunicorn)
│   ├── .dockerignore           # Docker build exclusions
│   └── tests/
│       ├── __init__.py
│       ├── test_unit.py        # 30+ unit tests for all helper functions
│       ├── test_properties.py  # 12 property-based tests (Hypothesis, 100 examples each)
│       └── test_integration.py # API integration tests (requires running server)
│
├── frontend/
│   ├── index.html              # HTML entry point with Google Fonts
│   ├── package.json            # Node dependencies & scripts
│   ├── vite.config.js          # Vite config with API proxy to :5001
│   ├── tailwind.config.js      # Custom Bauhaus color palette & design tokens
│   ├── postcss.config.js       # PostCSS / Autoprefixer config
│   ├── eslint.config.js        # ESLint configuration
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Main application (landing, loading, results views)
│       ├── App.css             # Component-specific styles
│       └── index.css           # Tailwind directives & neo-brutalist utilities
│
├── .gitignore                  # Git exclusions (venv, node_modules, __pycache__, etc.)
└── README.md                   # This file
```

---

## Getting Started

### Prerequisites

- **Python 3.9+** with `pip`
- **Node.js 18+** with `npm`
- (Optional) **Docker** for containerized deployment

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the Flask development server
python app.py
```

> The backend starts on **http://localhost:5001**. On first launch, the DistilBERT model (~260 MB) is downloaded and cached automatically.

> ⚠️ **Windows Note:** Gunicorn is not supported on Windows. Use `python app.py` for local development. Gunicorn is used inside the Docker container (Linux).

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

> The frontend starts on **http://localhost:5173** with automatic API proxying to the backend at `:5001`.

### Running Both Together

1. Start the backend in one terminal: `cd backend && python app.py`
2. Start the frontend in another terminal: `cd frontend && npm run dev`
3. Open **http://localhost:5173** in your browser

---

## API Reference

### `GET /api/analyze`

Analyze a stock ticker and return a full multi-agent report.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `ticker` | string | Yes | Stock ticker symbol (e.g., `AAPL`, `TSLA`, `NVDA`) |

**Success Response (200):**

```json
{
  "ticker": "AAPL",
  "final_recommendation": "buy",
  "final_justification": "**RSI** is 28.5 (**Oversold**). ...",
  "technical_indicators": {
    "rsi": 28.5,
    "macd": 1.23,
    "sma20": 175.00,
    "sma50": 170.00,
    "price": 180.00,
    "rsi_signal": "Oversold",
    "macd_signal_desc": "Bullish",
    "sma_signal_desc": "Bullish Crossover"
  },
  "sentiment_score": 0.6,
  "news_articles": [
    {
      "title": "Apple hits record high",
      "link": "https://...",
      "publisher": "Reuters",
      "sentiment_label": "positive"
    }
  ],
  "historical_prices": [
    {
      "date": "2024-01-15",
      "price": 180.00,
      "sma20": 175.00
    }
  ]
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| `400` | Missing or empty `ticker` parameter |
| `500` | Insufficient price data or internal error |
| `503` | HuggingFace model not yet loaded |
| `504` | Pipeline execution timed out (> 60 seconds) |

---

## Decision Logic

The Portfolio Advisor applies a **five-branch priority decision tree**:

| Priority | Condition | Result |
|---|---|---|
| **1** (highest) | RSI < 30 **AND** sentiment > 0.0 | **BUY** |
| **2** | RSI > 70 **AND** sentiment < 0.0 | **SELL** |
| **3** | MACD > 0 **AND** SMA-20 > SMA-50 **AND** sentiment ≥ 0.15 | **BUY** |
| **4** | MACD ≤ 0 **AND** SMA-20 ≤ SMA-50 **AND** sentiment ≤ -0.15 | **SELL** |
| **5** (default) | None of the above | **HOLD** |

> Branches are evaluated in strict priority order. If Branch 1 matches, later branches are never checked.

> **Guard clauses:** Branches 3 and 4 require `macd` and `sma50` to be non-`None` (i.e., sufficient historical data). If either is `None`, these branches cannot fire, and the default **HOLD** is returned.

---

## Testing

The project includes three tiers of tests:

### Unit Tests (`test_unit.py`)

30+ deterministic tests covering all pure helper functions in isolation. Tests are self-contained — they define inline copies of helper functions to **avoid triggering the HuggingFace model load** at import time.

```bash
cd backend
pytest tests/test_unit.py -v
```

**Test Classes:**
- `TestSentimentScoreComputation` — Sentiment mean calculation
- `TestRsiSignalDerivation` — RSI threshold boundaries
- `TestMacdSignalDerivation` — MACD signal mapping (incl. `None`)
- `TestSmaSignalDerivation` — SMA crossover logic
- `TestMakeRecommendation` — All 5 decision branches + boundary cases
- `TestArticleObjectShape` — News article dict schema
- `TestResponseShape` — Full API response schema (7 top-level keys, 8 indicator keys)

### Property-Based Tests (`test_properties.py`)

12 Hypothesis-driven properties, each with 100 generated examples:

```bash
cd backend
pytest tests/test_properties.py -v
```

| Property | Description |
|---|---|
| P1 | Sentiment score bounded in [-1.0, 1.0] |
| P2 | Sentiment score equals arithmetic mean |
| P3 | Decision logic is total (always returns buy/sell/hold) |
| P4a | RSI < 30 + positive sentiment → always BUY |
| P4b | RSI > 70 + negative sentiment → always SELL |
| P5 | RSI signal derivation correct for all values |
| P6 | MACD signal derivation correct for all values |
| P7 | SMA signal derivation correct for all values |
| P8 | `technical_indicators` has exactly 8 keys |
| P9 | Every `news_articles` entry has exactly 4 keys |
| P10 | Every `historical_prices` entry has exactly 3 keys |
| P11 | Top-level response has exactly 7 keys |
| P12 | Numeric rounding to ≤ 2 decimal places |

### Integration Tests (`test_integration.py`)

End-to-end API tests against a running server:

```bash
# Terminal 1: Start the server
cd backend && python app.py

# Terminal 2: Run integration tests
cd backend
pytest tests/test_integration.py -v -m integration
```

**Test Cases:**
- Happy path: `GET /api/analyze?ticker=AAPL` → 200 with full response schema
- Missing ticker → 400
- Empty ticker → 400
- Invalid ticker → 500
- CORS headers present (`Access-Control-Allow-Origin: *`)

### Run All Tests

```bash
cd backend
# Unit + Property tests (no server required)
pytest tests/test_unit.py tests/test_properties.py -v

# All tests (server must be running for integration)
pytest -v
```

---

## Docker Deployment

Build and run the backend as a Docker container:

```bash
cd backend

# Build the image
docker build -t stoc-ai-backend .

# Run the container
docker run -p 7860:7860 stoc-ai-backend
```

> The container uses **Gunicorn** on port **7860** with the `python:3.9-slim` base image.

**Dockerfile overview:**

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
```

---

## Design & UI

The frontend uses a **Bauhaus / Neo-Brutalist** design language:

- **Typography:** Space Grotesk (headlines/display) + Inter (body text) via Google Fonts
- **Color Palette:** Material Design 3-inspired tokens with a warm, off-white surface (`#f5f0e8`) and high-contrast black outlines (`#1a1a1a`)
- **Accent Colors:** Primary Yellow (`#ffcc00`), Secondary Red (`#e63b2e`), Tertiary Blue (`#0055ff`)
- **Shadows:** Geometric `neo-brutalist-shadow` with interactive press states
- **Recommendation Signals:** Color-coded — Green (`#00FF41`) for BUY, Gold (`#FFD700`) for HOLD, Red (`#FF3131`) for SELL

### Views

1. **Landing Page** — Hero section with massive search input and trending ticker cards (NVDA, TSLA, PLTR)
2. **Loading State** — Animated agent pipeline visualizer showing Sentiment → Technical → Portfolio Advisor progress
3. **Results Dashboard** — Ticker info, consensus recommendation, multi-agent cards, interactive 30-day price chart, news sentiment feed, and detailed advisor justification

---

## License

This project is for educational and demonstration purposes.

---

<p align="center">
  <strong>STOC.AI</strong> — Form Follows Profit. © 2026
</p>
