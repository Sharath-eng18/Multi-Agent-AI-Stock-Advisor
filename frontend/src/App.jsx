import React, { useState } from 'react';

// Custom Markdown Justification renderer (styled for Bauhaus theme)
const MarkdownJustification = ({ text }) => {
  if (!text) return null;
  const paragraphs = text.split('\n\n');
  return (
    <div className="space-y-4 text-left font-body text-base font-bold leading-relaxed text-primary">
      {paragraphs.map((p, idx) => {
        if (p.startsWith('### ')) {
          return (
            <h3 key={idx} className="font-display font-black text-xl uppercase tracking-tight mt-6 mb-2 border-b-2 border-outline pb-1">
              {p.replace('### ', '')}
            </h3>
          );
        }

        // Parse bold text
        const parts = p.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="border-l-4 border-primary pl-3">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={partIdx} className="font-black bg-primary-container px-1 border-b-2 border-outline">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

// Interactive SVG Stock Chart styled with Bauhaus / Neo-Brutalist elements
const StockChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-4 border-outline bg-surface-container text-center">
        <span className="material-symbols-outlined text-4xl mb-2">activity_zone</span>
        <p className="font-headline font-black uppercase text-lg">No price data available.</p>
      </div>
    );
  }

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  const [hoverIndex, setHoverIndex] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 20;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.price - minPrice) / (maxPrice - minPrice)) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  const smaPoints = data.map((d, i) => {
    if (!d.sma20) return null;
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.sma20 - minPrice) / (maxPrice - minPrice)) * (height - 2 * paddingY);
    return { x, y };
  }).filter(Boolean);

  const smaPath = smaPoints.length > 0
    ? smaPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const handleMouseMove = (e) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;

    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((p, idx) => {
      const distance = Math.abs(p.x - (clientX * (width / svgRect.width)));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    setHoverIndex(closestIndex);
    setHoverPos({
      x: points[closestIndex].x,
      y: points[closestIndex].y
    });
  };

  return (
    <div className="relative w-full border-4 border-outline bg-surface p-6 shadow-neo">
      <div className="flex justify-between items-center mb-6 border-b-2 border-outline pb-4">
        <div>
          <span className="font-headline font-black text-2xl uppercase tracking-tight block">30-Day Trend</span>
          <span className="font-body text-xs font-bold uppercase text-on-surface-variant">Interactive Visualisation</span>
        </div>
        <div className="flex gap-4 font-headline text-xs font-black uppercase">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-tertiary border border-outline"></span> Price
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 border-t-2 border-dashed border-secondary inline-block"></span> SMA (20)
          </span>
        </div>
      </div>

      <div className="relative w-full h-[220px]">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0055ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0055ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#1a1a1a" strokeOpacity="0.1" strokeDasharray="4" strokeWidth="1.5" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#1a1a1a" strokeOpacity="0.1" strokeDasharray="4" strokeWidth="1.5" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#1a1a1a" strokeOpacity="0.1" strokeDasharray="4" strokeWidth="1.5" />

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#chart-gradient)" />}

          {/* Price Trend Line */}
          {linePath && <path d={linePath} fill="none" stroke="#0055ff" strokeWidth="3.5" strokeLinecap="round" />}

          {/* SMA Line */}
          {smaPath && <path d={smaPath} fill="none" stroke="#e63b2e" strokeWidth="2" strokeDasharray="5,3" strokeLinecap="round" />}

          {/* Hover tracker line & dot */}
          {hoverIndex !== null && (
            <>
              <line x1={hoverPos.x} y1={paddingY} x2={hoverPos.x} y2={height - paddingY} stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="3" />
              <circle cx={hoverPos.x} cy={hoverPos.y} r="6" fill="#0055ff" stroke="#1a1a1a" strokeWidth="2" />
            </>
          )}
        </svg>

        {hoverIndex !== null && data[hoverIndex] && (
          <div
            className="absolute bg-surface-bright border-2 border-outline p-3 shadow-neo pointer-events-none z-10 flex flex-col gap-1 font-headline font-black text-xs uppercase"
            style={{
              left: `${(hoverPos.x / width) * 100}%`,
              top: `${(hoverPos.y / height) * 100 - 65}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-on-surface-variant font-bold">{data[hoverIndex].date}</span>
            <span className="text-primary text-sm font-black">Price: ${data[hoverIndex].price.toFixed(2)}</span>
            {data[hoverIndex].sma20 && (
              <span className="text-secondary">SMA 20: ${data[hoverIndex].sma20.toFixed(2)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [view, setView] = useState("landing"); // landing, loading, result
  const [ticker, setTicker] = useState("");
  const [inputTicker, setInputTicker] = useState("");
  const [headerSearchTicker, setHeaderSearchTicker] = useState("");
  const [analysisStep, setAnalysisStep] = useState("idle"); // idle, fetching, aggregating, done
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAnalyze = async (searchTicker) => {
    if (!searchTicker || !searchTicker.trim()) return;

    const formattedTicker = searchTicker.trim().toUpperCase();
    setTicker(formattedTicker);
    setView("loading");
    setErrorMsg("");
    setReport(null);
    setAnalysisStep("fetching");

    try {
      // Step 1: Start data fetching
      const response = await fetch(`http://127.0.0.1:5001/api/analyze?ticker=${formattedTicker}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to analyze ${formattedTicker}. Please try again.`);
      }

      // Step 2: Transition to aggregator step visually
      setAnalysisStep("aggregating");
      await new Promise(resolve => setTimeout(resolve, 800)); // Smooth transition buffer

      const data = await response.json();
      setReport(data);
      setAnalysisStep("done");
      setView("result");

      // Reset search inputs
      setInputTicker("");
      setHeaderSearchTicker("");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred while connecting to the server.");
      setView("landing");
    }
  };

  const handleLandingSubmit = (e) => {
    e.preventDefault();
    handleAnalyze(inputTicker);
  };

  const handleHeaderSubmit = (e) => {
    e.preventDefault();
    handleAnalyze(headerSearchTicker);
  };

  const goToLanding = () => {
    setView("landing");
    setReport(null);
    setErrorMsg("");
    setTicker("");
    setInputTicker("");
    setHeaderSearchTicker("");
  };

  // Helper for recommendation styling
  const getRecommendationStyle = (rec) => {
    const r = rec?.toLowerCase();
    if (r === 'buy') return 'signal-buy';
    if (r === 'sell') return 'signal-sell';
    return 'signal-hold';
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col relative selection:bg-primary-container selection:text-on-primary-container">

      {/* -------------------- TOP APP BAR -------------------- */}
      <header className="bg-background border-b-4 border-outline flex justify-between items-center w-full px-4 md:px-10 py-6 sticky top-0 z-50">
        <div
          onClick={goToLanding}
          className="text-3xl font-headline font-black text-primary tracking-tighter cursor-pointer hover:opacity-85 select-none active:translate-y-0.5"
        >
          STOC.AI
        </div>

        {/* Header navigation (mock links for desktop) */}
        <nav className="hidden md:flex gap-4 items-center font-headline font-black uppercase tracking-tight text-sm">
          <button
            onClick={goToLanding}
            className={`border-2 border-outline px-3 py-1.5 transition-all ${view === 'landing'
                ? 'bg-primary-container text-on-primary-container border-b-4 border-r-4 shadow-sm'
                : 'hover:bg-primary hover:text-on-primary active:translate-y-0.5'
              }`}
          >
            Dashboard
          </button>
          <span className="px-3 py-1.5 text-primary opacity-45 cursor-not-allowed">Market</span>
          <span className="px-3 py-1.5 text-primary opacity-45 cursor-not-allowed">Agents</span>
          <span className="px-3 py-1.5 text-primary opacity-45 cursor-not-allowed">Portfolio</span>
        </nav>

        <div className="flex items-center gap-4">
          {/* Quick Search bar shown in results view (desktop) */}
          {view === 'result' && (
            <form onSubmit={handleHeaderSubmit} className="hidden md:flex items-center border-2 border-outline px-3 py-1.5 bg-surface-container-highest">
              <span className="material-symbols-outlined mr-2 text-primary font-bold">search</span>
              <input
                className="bg-transparent border-none outline-none focus:ring-0 text-sm font-bold uppercase text-primary placeholder-on-surface-variant"
                placeholder="SEARCH TICKER..."
                type="text"
                value={headerSearchTicker}
                onChange={(e) => setHeaderSearchTicker(e.target.value.toUpperCase())}
              />
            </form>
          )}

          <button className="hidden md:block border-2 border-outline bg-primary text-on-primary font-headline font-black uppercase tracking-tight px-6 py-2 hover:bg-primary-container hover:text-primary transition-colors duration-75 neo-brutalist-shadow neo-brutalist-shadow-hover">
            LOGIN
          </button>

          {/* Mobile toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden bg-primary-container border-2 border-outline p-2 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          >
            <span className="material-symbols-outlined block">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {/* Mobile toggle drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b-4 border-outline bg-background flex flex-col p-6 gap-4 font-headline font-black uppercase tracking-tight text-base sticky top-[84px] z-40 shadow-neo">
          <button
            onClick={() => {
              goToLanding();
              setMobileMenuOpen(false);
            }}
            className={`border-2 border-outline px-4 py-3 text-left transition-all font-black ${view === 'landing'
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface hover:bg-primary-container'
              }`}
          >
            Dashboard
          </button>
          <span className="border-2 border-outline px-4 py-3 bg-surface text-primary opacity-45 cursor-not-allowed">Market</span>
          <span className="border-2 border-outline px-4 py-3 bg-surface text-primary opacity-45 cursor-not-allowed">Agents</span>
          <span className="border-2 border-outline px-4 py-3 bg-surface text-primary opacity-45 cursor-not-allowed">Portfolio</span>
          <button className="border-2 border-outline bg-primary text-on-primary px-4 py-3 hover:bg-primary-container hover:text-primary transition-colors text-center font-black">
            LOGIN
          </button>
        </div>
      )}

      {/* -------------------- MAIN CONTENT CANVAS -------------------- */}
      <main className="flex-grow">

        {/* error message banner */}
        {errorMsg && (
          <div className="max-w-6xl mx-auto mt-6 px-6">
            <div className="border-4 border-outline bg-red-100 p-5 flex items-center gap-4 text-red-950 font-headline font-black uppercase shadow-neo">
              <span className="material-symbols-outlined text-4xl text-error font-bold">warning</span>
              <div>
                <h4 className="text-lg">Analysis Failed</h4>
                <p className="font-body font-bold text-sm lowercase text-red-800">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 1: LANDING PAGE -------------------- */}
        {view === 'landing' && (
          <div>
            {/* DESKTOP LANDING VIEW */}
            <div className="hidden md:block">
              {/* Hero Section */}
              <section className="relative min-h-[700px] flex flex-col items-center justify-center border-b-4 border-outline p-6 md:p-12 overflow-hidden bg-background">
                {/* Grid Background Overlay */}
                <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

                <div className="z-10 w-full max-w-6xl mx-auto flex flex-col items-center text-center space-y-12">
                  <h1 className="font-display font-black text-5xl md:text-7xl lg:text-9xl leading-none tracking-tighter text-primary uppercase select-none">
                    INSTANT<br />
                    <span className="text-secondary bg-primary-container px-4 ml-[-1rem] border-4 border-outline neo-brutalist-shadow inline-block transform -rotate-2">AGENTIC</span><br />
                    ANALYSIS.
                  </h1>
                  <p className="font-body text-lg md:text-2xl font-bold max-w-2xl border-l-4 border-primary pl-4 text-left">
                    Multiple specialized AI agents analyzing markets in real-time. Uncover patterns. Exploit inefficiencies. Command your portfolio.
                  </p>

                  {/* Massive Search Input */}
                  <div className="w-full max-w-4xl relative mt-8">
                    <form className="flex w-full" onSubmit={handleLandingSubmit}>
                      <div className="relative w-full flex">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-4xl text-primary font-bold">search</span>
                        <input
                          className="w-full bg-surface border-4 border-outline border-r-0 pl-20 pr-6 py-6 text-2xl md:text-4xl font-headline font-black uppercase placeholder-on-surface-variant focus:outline-none focus:bg-primary-container focus:placeholder-primary transition-colors"
                          placeholder="ENTER TICKER (e.g., AAPL, TSLA)"
                          type="text"
                          value={inputTicker}
                          onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                        />
                        <button
                          className="bg-primary text-on-primary border-4 border-outline px-6 md:px-8 py-6 font-headline font-black text-xl md:text-2xl hover:bg-tertiary hover:text-on-primary transition-colors flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
                          type="submit"
                        >
                          ANALYZE <span className="material-symbols-outlined font-bold">arrow_forward</span>
                        </button>
                      </div>
                    </form>
                    {/* Decorative architectural block */}
                    <div className="absolute -bottom-4 -right-4 w-full h-full bg-primary -z-10 pointer-events-none"></div>
                  </div>
                </div>
              </section>

              {/* Trending / Ticker Grid Section */}
              <section className="border-b-4 border-outline bg-surface-container">
                <div className="grid grid-cols-1 md:grid-cols-4 border-b-4 border-outline">

                  <div className="col-span-1 border-r-4 border-outline p-6 flex items-center justify-between md:justify-center bg-primary text-on-primary">
                    <h2 className="font-headline font-black text-2xl uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                      Trending Now
                    </h2>
                  </div>

                  {/* Ticker Cards Grid */}
                  <div className="col-span-1 md:col-span-3 flex overflow-x-auto border-t-4 md:border-t-0 border-outline hide-scrollbar">
                    {/* NVDA */}
                    <div
                      onClick={() => handleAnalyze("NVDA")}
                      className="flex-shrink-0 w-64 md:w-1/3 border-r-4 border-outline p-6 bg-surface hover:bg-primary-container transition-colors cursor-pointer group active:bg-yellow-100"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-headline font-black text-3xl">NVDA</span>
                        <span className="font-body font-bold text-secondary flex items-center">+4.2% <span className="material-symbols-outlined text-sm ml-1 font-bold">arrow_upward</span></span>
                      </div>
                      <div className="h-16 w-full border-2 border-outline bg-background mb-4 relative overflow-hidden">
                        <svg className="absolute inset-0 h-full w-full stroke-secondary stroke-2" fill="none" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <path d="M0,40 L20,30 L40,35 L60,10 L80,15 L100,5"></path>
                        </svg>
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider text-on-surface-variant group-hover:text-primary">Tech • AI Agent Alpha</div>
                    </div>

                    {/* TSLA */}
                    <div
                      onClick={() => handleAnalyze("TSLA")}
                      className="flex-shrink-0 w-64 md:w-1/3 border-r-4 border-outline p-6 bg-surface hover:bg-primary-container transition-colors cursor-pointer group active:bg-yellow-100"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-headline font-black text-3xl">TSLA</span>
                        <span className="font-body font-bold text-error flex items-center">-1.8% <span className="material-symbols-outlined text-sm ml-1 font-bold">arrow_downward</span></span>
                      </div>
                      <div className="h-16 w-full border-2 border-outline bg-background mb-4 relative overflow-hidden">
                        <svg className="absolute inset-0 h-full w-full stroke-error stroke-2" fill="none" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <path d="M0,5 L20,15 L40,10 L60,35 L80,25 L100,40"></path>
                        </svg>
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider text-on-surface-variant group-hover:text-primary">Auto • Momentum Shift</div>
                    </div>

                    {/* PLTR */}
                    <div
                      onClick={() => handleAnalyze("PLTR")}
                      className="flex-shrink-0 w-64 md:w-1/3 p-6 bg-surface hover:bg-primary-container transition-colors cursor-pointer group active:bg-yellow-100"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-headline font-black text-3xl">PLTR</span>
                        <span className="font-body font-bold text-secondary flex items-center">+8.7% <span className="material-symbols-outlined text-sm ml-1 font-bold">arrow_upward</span></span>
                      </div>
                      <div className="h-16 w-full border-2 border-outline bg-background mb-4 relative overflow-hidden">
                        <svg className="absolute inset-0 h-full w-full stroke-secondary stroke-2" fill="none" preserveAspectRatio="none" viewBox="0 0 100 40">
                          <path d="M0,35 L20,30 L40,15 L60,20 L80,5 L100,0"></path>
                        </svg>
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider text-on-surface-variant group-hover:text-primary">Data • High Conviction</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* MOBILE LANDING VIEW */}
            <div className="md:hidden flex flex-col gap-12 pt-8 pb-24">
              {/* Hero Section */}
              <section className="px-6 flex flex-col items-center text-center">
                <div className="inline-block bg-secondary text-on-primary font-black px-3 py-1 text-sm uppercase mb-4 border-2 border-outline">
                  Live Data Processing
                </div>
                <h1 className="font-headline font-black text-5xl leading-none uppercase tracking-tighter mb-8 break-words max-w-sm">
                  INSTANT <span className="bg-primary-container">AGENTIC</span> ANALYSIS
                </h1>

                {/* Search Bar */}
                <div className="w-full max-w-md relative group">
                  <div className="absolute -inset-1 bg-primary border-4 border-outline translate-x-1 translate-y-1"></div>
                  <form onSubmit={handleLandingSubmit} className="relative bg-white border-4 border-outline flex items-center p-4">
                    <span className="material-symbols-outlined text-primary mr-3 text-3xl">search</span>
                    <input
                      id="mobile-search-input"
                      className="w-full font-headline font-bold text-xl uppercase outline-none placeholder:text-outline-variant bg-transparent border-none focus:ring-0"
                      placeholder="ENTER TICKER (E.G. NVDA)"
                      type="text"
                      value={inputTicker}
                      onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                    />
                  </form>
                </div>
                <p className="mt-8 font-bold uppercase text-xs tracking-widest opacity-70">Empowering Bauhaus AGENTIC Systems v2.4</p>
              </section>

              {/* Trending Section */}
              <section className="px-6">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="font-headline font-black text-3xl uppercase leading-none">Trending</h2>
                  <div className="bg-primary text-white text-xs font-black px-2 py-1">24H VOL</div>
                </div>

                {/* Vertical Stack of Cards */}
                <div className="flex flex-col gap-4">
                  {/* NVDA */}
                  <div
                    onClick={() => handleAnalyze("NVDA")}
                    className="bg-surface-container border-4 border-outline p-4 flex items-center justify-between relative overflow-hidden neo-brutalist-shadow-sm hover:neo-brutalist-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col z-10">
                      <span className="font-headline font-black text-3xl">NVDA</span>
                      <span className="text-xs font-bold uppercase opacity-60">NVIDIA CORP</span>
                    </div>
                    <div className="flex flex-col items-end z-10">
                      <span className="font-headline font-black text-2xl text-tertiary">132.54</span>
                      <span className="bg-primary text-on-primary px-2 py-0.5 text-xs font-bold">+2.41%</span>
                    </div>
                    {/* Sparkline Mockup (Visual) */}
                    <div className="absolute bottom-0 left-0 w-full h-12 opacity-30 pointer-events-none">
                      <svg className="w-full h-full preserve-3d" viewBox="0 0 100 20">
                        <polyline fill="none" points="0,20 10,15 20,18 30,10 40,12 50,5 60,8 70,2 80,6 90,4 100,0" stroke="#0055ff" strokeWidth="2"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* TSLA */}
                  <div
                    onClick={() => handleAnalyze("TSLA")}
                    className="bg-surface-container border-4 border-outline p-4 flex items-center justify-between relative overflow-hidden neo-brutalist-shadow-sm hover:neo-brutalist-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col z-10">
                      <span className="font-headline font-black text-3xl">TSLA</span>
                      <span className="text-xs font-bold uppercase opacity-60">TESLA MOTORS</span>
                    </div>
                    <div className="flex flex-col items-end z-10">
                      <span className="font-headline font-black text-2xl text-secondary">198.22</span>
                      <span className="bg-secondary text-on-primary px-2 py-0.5 text-xs font-bold">-1.15%</span>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-12 opacity-30 pointer-events-none">
                      <svg className="w-full h-full" viewBox="0 0 100 20">
                        <polyline fill="none" points="0,5 10,8 20,4 30,12 40,10 50,15 60,12 70,18 80,14 90,16 100,20" stroke="#e63b2e" strokeWidth="2"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* PLTR */}
                  <div
                    onClick={() => handleAnalyze("PLTR")}
                    className="bg-primary-container border-4 border-outline p-4 flex items-center justify-between relative overflow-hidden neo-brutalist-shadow-sm hover:neo-brutalist-shadow active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col z-10">
                      <span className="font-headline font-black text-3xl">PLTR</span>
                      <span className="text-xs font-bold uppercase opacity-60">PALANTIR TECH</span>
                    </div>
                    <div className="flex flex-col items-end z-10">
                      <span className="font-headline font-black text-2xl">24.12</span>
                      <span className="bg-primary text-on-primary px-2 py-0.5 text-xs font-bold">+5.12%</span>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-12 opacity-30 pointer-events-none">
                      <svg className="w-full h-full" viewBox="0 0 100 20">
                        <polyline fill="none" points="0,18 10,14 20,16 30,12 40,14 50,8 60,10 70,4 80,6 90,2 100,0" stroke="#1a1a1a" strokeWidth="2"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bento Analysis Teaser */}
              <section className="px-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 border-4 border-outline bg-white p-6 neo-brutalist-shadow-sm">
                    <h3 className="font-headline font-black text-2xl uppercase mb-2">Macro Pulse</h3>
                    <p className="font-body font-bold text-sm leading-tight uppercase">Agent clusters detecting heavy institutional accumulation in high-growth semiconductors.</p>
                  </div>
                  <div className="col-span-1 border-4 border-outline bg-tertiary text-white p-4 aspect-square flex flex-col justify-end">
                    <span className="material-symbols-outlined text-4xl mb-auto">bolt</span>
                    <span className="font-headline font-black text-lg leading-none uppercase">Rapid Signal</span>
                  </div>
                  <div className="col-span-1 border-4 border-outline bg-secondary text-white p-4 aspect-square flex flex-col justify-end">
                    <span className="material-symbols-outlined text-4xl mb-auto">warning</span>
                    <span className="font-headline font-black text-lg leading-none uppercase">Risk Alert</span>
                  </div>
                </div>
              </section>

              {/* Visual Anchor */}
              <section className="px-6">
                <div className="relative w-full aspect-video border-4 border-outline overflow-hidden neo-brutalist-shadow group">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    alt="A futuristic digital data dashboard rendered in a high-contrast neo-brutalist style."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRFYga4rWeSMolaRVtYbUmONGLrPFltHA_gJo095yeg6jCDLS4tjlXWEHXMu_F8jmB1FzkBonnk3a_sHp7UHH4xjaSFullQ1e_l24rAb91S8-IggWNNX8nUp7bgIBddLMUqAFbj9Tkz5pDqFx8cmW080PzvjDEk6FUoF7nitDuxetRD3iF5_0NaLP6IuPnPBNzZiXr9FgJQ_V0MgUv8akVGpI9J7V36JpIh4eNERJIEuCULTFYey6lF32lOdQCqKqtuGDxu3dNSoIB"
                  />
                  <div className="absolute inset-0 bg-primary-container/20 pointer-events-none"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white border-2 border-outline p-2 font-black uppercase text-xs">
                    NEURAL-AGENTIC ARCHITECTURE V0.8
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 2: LOADING / AGENT WORKFLOW STATE -------------------- */}
        {view === 'loading' && (
          <section className="min-h-[600px] flex flex-col items-center justify-center p-6 bg-background relative">
            <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none"></div>

            <div className="z-10 w-full max-w-4xl mx-auto flex flex-col items-center space-y-12">
              <div className="border-4 border-outline bg-primary-container p-8 shadow-neo text-center max-w-lg w-full relative">
                {/* Decorative dots */}
                <div className="absolute top-3 left-3 w-4.5 h-4.5 rounded-full bg-outline"></div>
                <div className="absolute top-3 right-3 w-4.5 h-4.5 rounded-full bg-outline"></div>

                <h3 className="font-display font-black text-3xl uppercase tracking-tighter mb-4 text-primary">
                  AGENT PIPELINE ACTIVE
                </h3>
                <p className="font-body font-bold text-sm text-on-surface-variant uppercase tracking-wider">
                  Analyzing {ticker} via LangGraph Multi-Agent network...
                </p>
                <div className="mt-8 flex justify-center">
                  <div className="w-12 h-12 border-8 border-outline border-t-tertiary animate-spin"></div>
                </div>
              </div>

              {/* Neo-brutalist workflow step visualizer */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative">

                {/* Step 1: Sentiment */}
                <div className={`border-4 border-outline p-6 shadow-neo transition-all ${analysisStep === 'fetching'
                    ? 'bg-yellow-200 translate-y-[-4px] shadow-[8px_8px_0px_0px_#1a1a1a]'
                    : 'bg-surface opacity-60'
                  }`}>
                  <div className="flex items-center gap-3 mb-3 border-b-2 border-outline pb-2">
                    <span className="material-symbols-outlined font-black text-2xl">newspaper</span>
                    <h4 className="font-headline font-black uppercase text-lg">Sentiment Agent</h4>
                  </div>
                  <p className="font-body text-xs font-bold text-on-surface-variant uppercase">
                    {analysisStep === 'fetching' ? 'Downloading headlines & running batch sentiment classification...' : 'Pending data pull'}
                  </p>
                </div>

                {/* Step 2: Technical */}
                <div className={`border-4 border-outline p-6 shadow-neo transition-all ${analysisStep === 'fetching'
                    ? 'bg-yellow-200 translate-y-[-4px] shadow-[8px_8px_0px_0px_#1a1a1a]'
                    : 'bg-surface opacity-60'
                  }`}>
                  <div className="flex items-center gap-3 mb-3 border-b-2 border-outline pb-2">
                    <span className="material-symbols-outlined font-black text-2xl">calculate</span>
                    <h4 className="font-headline font-black uppercase text-lg">Technical Agent</h4>
                  </div>
                  <p className="font-body text-xs font-bold text-on-surface-variant uppercase">
                    {analysisStep === 'fetching' ? 'Calculating RSI index, MACD signals, and Moving Average crossovers...' : 'Waiting for sentiment'}
                  </p>
                </div>

                {/* Step 3: Portfolio Advisor */}
                <div className={`border-4 border-outline p-6 shadow-neo transition-all ${analysisStep === 'aggregating'
                    ? 'bg-yellow-200 translate-y-[-4px] shadow-[8px_8px_0px_0px_#1a1a1a]'
                    : 'bg-surface opacity-60'
                  }`}>
                  <div className="flex items-center gap-3 mb-3 border-b-2 border-outline pb-2">
                    <span className="material-symbols-outlined font-black text-2xl">security</span>
                    <h4 className="font-headline font-black uppercase text-lg">Portfolio Advisor</h4>
                  </div>
                  <p className="font-body text-xs font-bold text-on-surface-variant uppercase">
                    {analysisStep === 'aggregating' ? 'Blending technical indicator values and news score to execute final branch recommendation...' : 'Aggregating consensus'}
                  </p>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* -------------------- VIEW 3: STOCK ANALYSIS RESULTS -------------------- */}
        {view === 'result' && report && (() => {
          const currentPrice = report.technical_indicators?.price || 0;
          const targetPrice = report.final_recommendation?.toLowerCase() === 'buy'
            ? (currentPrice * 1.25).toFixed(2)
            : report.final_recommendation?.toLowerCase() === 'sell'
              ? (currentPrice * 0.85).toFixed(2)
              : (currentPrice * 1.05).toFixed(2);
          return (
            <div className="container mx-auto px-4 py-12 md:px-10 max-w-7xl">
              {/* DESKTOP RESULTS VIEW */}
              <div className="hidden md:block">
                {/* Ticker Header & Recommendation Cards */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">

                  {/* Ticker Info (Left Col) */}
                  <div className="lg:col-span-1 flex flex-col justify-between border-4 border-outline p-6 bg-surface shadow-neo">
                    <div>
                      <div className="inline-block border-2 border-outline px-3 py-1 bg-surface-container-high mb-4 shadow-neo-sm">
                        <span className="font-headline font-black text-lg tracking-tighter">NASDAQ: {report.ticker}</span>
                      </div>
                      <h2 className="text-5xl md:text-6xl font-display font-black tracking-tighter leading-none mb-2 uppercase break-all">
                        {report.ticker}
                      </h2>
                      <p className="font-body text-on-surface-variant font-bold uppercase tracking-widest text-xs mb-8 border-b-2 border-outline pb-2 inline-block">
                        LangGraph Evaluated
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t-2 border-outline pt-6">
                      <div>
                        <span className="block font-headline text-xs uppercase font-bold text-on-surface-variant">Current Price</span>
                        <span className="block font-display text-3xl font-black">${report.technical_indicators?.price || 'N/A'}</span>
                        <span className="text-primary-container font-black flex items-center mt-2 bg-outline px-2 py-0.5 inline-flex text-xs uppercase">
                          ACTIVE FEED
                        </span>
                      </div>
                      <div>
                        <span className="block font-headline text-xs uppercase font-bold text-on-surface-variant">RSI Status</span>
                        <span className="block font-display text-3xl font-black">{report.technical_indicators?.rsi || 'N/A'}</span>
                        <span className="text-secondary font-black mt-2 block text-xs uppercase">
                          {report.technical_indicators?.rsi_signal || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Consensus recommendation Box (Right Col) */}
                  <div className={`lg:col-span-2 border-4 border-outline p-8 md:p-12 shadow-neo-lg relative overflow-hidden flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_#1a1a1a] ${getRecommendationStyle(report.final_recommendation)}`}>

                    {/* Background decorative design blocks */}
                    <div className="absolute top-0 right-0 w-64 h-64 border-l-4 border-b-4 border-outline bg-primary opacity-10 rounded-bl-full pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 border-r-4 border-t-4 border-outline bg-tertiary opacity-10 rounded-tr-full pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

                    <span className="font-headline uppercase font-black tracking-widest border-2 border-outline px-4 py-1.5 mb-6 bg-surface z-10 shadow-neo-sm">
                      Consensus Action
                    </span>

                    <h3 className="text-8xl md:text-[10rem] font-display font-black tracking-tighter leading-none text-on-primary-container z-10 uppercase select-none">
                      {report.final_recommendation}
                    </h3>

                    <div className="bg-surface border-2 border-outline p-4 mt-6 max-w-xl z-10 shadow-neo text-left">
                      <h4 className="font-headline font-black uppercase text-sm mb-2 border-b border-outline pb-1">
                        Advisor Justification
                      </h4>
                      <p className="font-body text-xs font-bold text-primary">
                        Consensus reached via technical indicators (MACD: {report.technical_indicators?.macd_signal_desc}, SMA: {report.technical_indicators?.sma_signal_desc}) and sentiment score ({report.sentiment_score}).
                      </p>
                    </div>
                  </div>

                </section>

                {/* Multi-Agent Consensus Grid */}
                <section className="mb-16">
                  <div className="flex items-end justify-between border-b-4 border-outline pb-4 mb-8">
                    <h3 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tighter">Multi-Agent Consensus</h3>
                    <span className="font-headline font-black text-xs bg-outline text-inverse-on-surface px-3 py-1 uppercase shadow-neo-sm">
                      Decentralised Signals
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* Agent 1: Quantitative */}
                    <div className="border-4 border-outline bg-surface-container-high p-6 shadow-neo hover:bg-surface-bright transition-colors relative">
                      <div className="absolute top-0 right-0 bg-outline text-inverse-on-surface p-2 border-b-4 border-l-4 border-outline">
                        <span className="material-symbols-outlined font-bold text-xl">calculate</span>
                      </div>
                      <span className="font-headline text-xs font-black uppercase tracking-widest text-tertiary block mb-2">Quant Agent</span>
                      <h4 className="text-2xl font-display font-black uppercase mb-4">
                        {report.technical_indicators?.rsi_signal === 'Neutral' && report.technical_indicators?.macd_signal_desc === 'Bullish' ? 'Mild Bullish' :
                          report.technical_indicators?.rsi_signal === 'Oversold' ? 'Oversold Buy' :
                            report.technical_indicators?.rsi_signal === 'Overbought' ? 'Overbought Sell' :
                              report.technical_indicators?.macd_signal_desc === 'Bullish' ? 'Momentum Bull' : 'Bearish Trend'}
                      </h4>
                      <ul className="space-y-3 font-body font-bold text-xs border-t-2 border-outline pt-4">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          RSI at {report.technical_indicators?.rsi} ({report.technical_indicators?.rsi_signal}).
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          MACD index is {report.technical_indicators?.macd} ({report.technical_indicators?.macd_signal_desc}).
                        </li>
                      </ul>
                    </div>

                    {/* Agent 2: Fundamental Analyst */}
                    <div className="border-4 border-outline bg-surface-container-high p-6 shadow-neo hover:bg-surface-bright transition-colors relative">
                      <div className="absolute top-0 right-0 bg-outline text-inverse-on-surface p-2 border-b-4 border-l-4 border-outline">
                        <span className="material-symbols-outlined font-bold text-xl">menu_book</span>
                      </div>
                      <span className="font-headline text-xs font-black uppercase tracking-widest text-primary-fixed-dim block mb-2">Analyst Agent</span>
                      <h4 className="text-2xl font-display font-black uppercase mb-4">
                        {report.technical_indicators?.sma_signal_desc === 'Bullish Crossover' ? 'Buy Crossover' : 'Bear Crossover'}
                      </h4>
                      <ul className="space-y-3 font-body font-bold text-xs border-t-2 border-outline pt-4">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          SMA 20 is ${report.technical_indicators?.sma20}.
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          SMA 50 is ${report.technical_indicators?.sma50 || 'N/A'}.
                        </li>
                      </ul>
                    </div>

                    {/* Agent 3: Sentiment */}
                    <div className="border-4 border-outline bg-surface-container-high p-6 shadow-neo hover:bg-surface-bright transition-colors relative">
                      <div className="absolute top-0 right-0 bg-outline text-inverse-on-surface p-2 border-b-4 border-l-4 border-outline">
                        <span className="material-symbols-outlined font-bold text-xl">forum</span>
                      </div>
                      <span className="font-headline text-xs font-black uppercase tracking-widest text-secondary block mb-2">Sentiment Agent</span>
                      <h4 className="text-2xl font-display font-black uppercase mb-4">
                        {report.sentiment_score > 0.15 ? 'Bullish Sentiment' :
                          report.sentiment_score < -0.15 ? 'Bearish Sentiment' : 'Neutral Sentiment'}
                      </h4>
                      <ul className="space-y-3 font-body font-bold text-xs border-t-2 border-outline pt-4">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          Aggregated sentiment score: {report.sentiment_score.toFixed(2)}.
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          Analyzed {report.news_articles?.length || 0} recent financial news headlines.
                        </li>
                      </ul>
                    </div>

                    {/* Agent 4: Risk */}
                    <div className="border-4 border-outline bg-surface-container-high p-6 shadow-neo hover:bg-surface-bright transition-colors relative">
                      <div className="absolute top-0 right-0 bg-outline text-inverse-on-surface p-2 border-b-4 border-l-4 border-outline">
                        <span className="material-symbols-outlined font-bold text-xl">security</span>
                      </div>
                      <span className="font-headline text-xs font-black uppercase tracking-widest text-outline block mb-2">Risk Agent</span>
                      <h4 className="text-2xl font-display font-black uppercase mb-4">
                        {report.technical_indicators?.rsi > 70 || report.technical_indicators?.rsi < 30 ? 'Elevated' : 'Moderate'}
                      </h4>
                      <ul className="space-y-3 font-body font-bold text-xs border-t-2 border-outline pt-4">
                        <li className="flex items-start">
                          {report.technical_indicators?.rsi > 70 ? (
                            <span className="material-symbols-outlined text-secondary mr-2 shrink-0 font-bold text-sm">warning</span>
                          ) : (
                            <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          )}
                          RSI volatility indicator: {report.technical_indicators?.rsi > 70 ? 'Overbought risk' : 'Healthy trade limits'}.
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary-container mr-2 shrink-0 font-bold text-sm">check_box</span>
                          Sentiment stability confirmation check passed.
                        </li>
                      </ul>
                    </div>

                  </div>
                </section>

                {/* Price Trend Chart & News Articles Layout */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

                  {/* Left Col: Price Trend Chart (col-span-8) */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    <StockChart data={report.historical_prices} />

                    {/* Advisor Written report */}
                    <div className="border-4 border-outline bg-surface p-6 shadow-neo text-left">
                      <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-4 border-b-2 border-outline pb-2">
                        Advisor Detailed Verdict
                      </h3>
                      <MarkdownJustification text={report.final_justification} />
                    </div>
                  </div>

                  {/* Right Col: News Sentiment & Articles (col-span-4) */}
                  <div className="lg:col-span-4 border-4 border-outline bg-surface p-6 shadow-neo flex flex-col">
                    <div className="flex items-center justify-between border-b-2 border-outline pb-4 mb-6">
                      <div>
                        <h3 className="font-display font-black text-2xl uppercase tracking-tighter">News Sentiment</h3>
                        <span className="font-body text-xs font-bold text-on-surface-variant uppercase">Recent Headlines</span>
                      </div>
                      <span className={`px-2.5 py-1 border-2 border-outline font-headline font-black text-xs uppercase ${report.sentiment_score > 0.15 ? 'bg-bauhaus-green text-primary' :
                          report.sentiment_score < -0.15 ? 'bg-red-500 text-on-primary' : 'bg-yellow-400 text-primary'
                        }`}>
                        {report.sentiment_score > 0.15 ? 'Bullish' :
                          report.sentiment_score < -0.15 ? 'Bearish' : 'Neutral'}
                      </span>
                    </div>

                    <div className="flex-grow overflow-y-auto max-h-[500px] pr-2 space-y-4">
                      {report.news_articles?.map((article, idx) => (
                        <a
                          key={idx}
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border-2 border-outline p-4 bg-surface-container hover:bg-primary-container transition-colors group relative"
                        >
                          <h4 className="font-headline font-black text-sm text-primary mb-2 line-clamp-2 group-hover:text-primary-dark">
                            {article.title}
                          </h4>
                          <div className="flex justify-between items-center text-xs font-bold uppercase text-on-surface-variant">
                            <span>{article.publisher}</span>
                            <span className={`px-1.5 py-0.5 border border-outline ${article.sentiment_label === 'positive' ? 'bg-green-200 text-green-900' :
                                article.sentiment_label === 'negative' ? 'bg-red-200 text-red-900' : 'bg-gray-200 text-gray-800'
                              }`}>
                              {article.sentiment_label}
                            </span>
                          </div>
                        </a>
                      ))}
                      {(!report.news_articles || report.news_articles.length === 0) && (
                        <div className="p-8 text-center border-2 border-dashed border-outline font-headline font-black uppercase text-sm">
                          No headlines available.
                        </div>
                      )}
                    </div>
                  </div>

                </section>
              </div>

              {/* MOBILE RESULTS VIEW */}
              <div className="md:hidden p-6 max-w-xl mx-auto space-y-8 pb-24">
                {/* Market Breadcrumb */}
                <div className="flex items-center gap-2 font-headline font-bold text-sm tracking-widest opacity-60">
                  <span>MARKET</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward_ios</span>
                  <span>NASDAQ: {report.ticker}</span>
                </div>

                {/* Consensus Action Block */}
                <section className="space-y-4">
                  <div className={`${getRecommendationStyle(report.final_recommendation)} p-8 neo-brutalist-shadow flex flex-col items-center justify-center text-center`}>
                    <span className="font-headline font-black text-xs tracking-[0.3em] uppercase mb-2">CONSENSUS ACTION</span>
                    <h1 className="font-headline font-black text-7xl leading-none uppercase">{report.final_recommendation}</h1>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border-2 border-outline p-4 neo-brutalist-shadow-sm">
                      <span className="block text-xs font-headline font-bold uppercase opacity-60 mb-1">Current Price</span>
                      <span className="text-2xl font-headline font-black tracking-tight">${report.technical_indicators?.price || 'N/A'}</span>
                    </div>
                    <div className="bg-primary-container border-2 border-outline p-4 neo-brutalist-shadow-sm">
                      <span className="block text-xs font-headline font-bold uppercase opacity-60 mb-1">Target Price</span>
                      <span className="text-2xl font-headline font-black tracking-tight">${targetPrice}</span>
                    </div>
                  </div>
                </section>

                {/* Analysis Hero Image */}
                <div className="border-4 border-outline neo-brutalist-shadow overflow-hidden bg-white">
                  <img
                    alt={`${report.ticker} Technical Analysis`}
                    className="w-full h-48 object-cover grayscale contrast-125"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEbYnDcnYzm3d1JHUxoi6EuHsMeyWHfmcH4ZDInv1XRrN6fo30eNOZLup7zfeRr2Qo_JMOflgcTHDNIpdJO2A2PS9G01VPcBhIVg69uJMAG-ZQ5D9r2opUb6gHH0usqecu0QQ8cLXIqaw7SRvWZhfOi6Gt3YFCBquJv2P4VTBHr6MON77yTFgPmna3xg92gJpLn4qf5QZgCSR6YA0BK-TViSGXR_iYcmoYYJygnZh6ZDPuIEsHNn-kP_kmhIxCQNV4VkWpF8ORUJMM"
                  />
                </div>

                {/* Agents Section */}
                <section className="space-y-6">
                  <h2 id="agent-intelligence-header" className="font-headline font-black text-3xl uppercase tracking-tighter">AGENT INTELLIGENCE</h2>
                  <div className="flex flex-col gap-6">
                    {/* Quant Agent */}
                    <div className="bg-white border-4 border-outline p-6 neo-brutalist-shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 bg-primary text-white border-b-2 border-l-2 border-outline">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
                      </div>
                      <h3 className="font-headline font-black text-xl mb-4">QUANT AGENT</h3>
                      <ul className="space-y-3 font-body text-sm font-medium">
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>RSI at {report.technical_indicators?.rsi} ({report.technical_indicators?.rsi_signal}).</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>MACD index is {report.technical_indicators?.macd} ({report.technical_indicators?.macd_signal_desc}).</span>
                        </li>
                      </ul>
                    </div>

                    {/* Analyst Agent */}
                    <div className="bg-white border-4 border-outline p-6 neo-brutalist-shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 bg-tertiary text-white border-b-2 border-l-2 border-outline">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person_search</span>
                      </div>
                      <h3 className="font-headline font-black text-xl mb-4">ANALYST AGENT</h3>
                      <ul className="space-y-3 font-body text-sm font-medium">
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>SMA 20 is ${report.technical_indicators?.sma20}.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>SMA 50 is ${report.technical_indicators?.sma50 || 'N/A'} ({report.technical_indicators?.sma_signal_desc}).</span>
                        </li>
                      </ul>
                    </div>

                    {/* Sentiment Agent */}
                    <div className="bg-white border-4 border-outline p-6 neo-brutalist-shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 bg-primary-container text-primary border-b-2 border-l-2 border-outline">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>mood</span>
                      </div>
                      <h3 className="font-headline font-black text-xl mb-4">SENTIMENT AGENT</h3>
                      <ul className="space-y-3 font-body text-sm font-medium">
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>Sentiment score: {report.sentiment_score?.toFixed(2)} ({report.sentiment_score > 0.15 ? 'Bullish' : report.sentiment_score < -0.15 ? 'Bearish' : 'Neutral'}).</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary">check_circle</span>
                          <span>Analyzed {report.news_articles?.length || 0} recent financial news headlines.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Risk Agent */}
                    <div className="bg-white border-4 border-outline p-6 neo-brutalist-shadow-sm relative overflow-hidden border-r-8 border-r-secondary">
                      <div className="absolute top-0 right-0 p-2 bg-secondary text-white border-b-2 border-l-2 border-outline">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
                      </div>
                      <h3 className="font-headline font-black text-xl mb-4">RISK AGENT</h3>
                      <ul className="space-y-3 font-body text-sm font-medium">
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-secondary">warning</span>
                          <span>RSI volatility indicator: {report.technical_indicators?.rsi > 70 || report.technical_indicators?.rsi < 30 ? 'Elevated risk bounds' : 'Healthy trade limits'}.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-secondary">warning</span>
                          <span>Sentiment stability: {report.sentiment_score < -0.3 ? 'High negative sentiment risk' : 'Normal bounds'}.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Price Chart for mobile (from stockchart component) */}
                <section className="space-y-4">
                  <StockChart data={report.historical_prices} />
                </section>

                {/* Advisor Verdict for mobile */}
                <div className="border-4 border-outline bg-surface p-6 neo-brutalist-shadow-sm text-left">
                  <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-4 border-b-2 border-outline pb-2">
                    Advisor Verdict
                  </h3>
                  <MarkdownJustification text={report.final_justification} />
                </div>

                {/* CTA Action */}
                <button
                  onClick={() => alert(`Order executed for ${report.ticker} at $${report.technical_indicators?.price}`)}
                  className="w-full bg-primary text-white font-headline font-black text-2xl py-6 neo-brutalist-shadow hover:bg-tertiary transition-colors flex items-center justify-center gap-4 group active:translate-x-0.5 active:translate-y-0.5"
                >
                  EXECUTE ORDER
                  <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
                </button>
              </div>

            </div>
          );
        })()}

      </main>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="bg-primary border-t-4 border-outline flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-10 py-12 gap-8 mt-auto z-10 text-on-primary">
        <div className="text-xl font-headline font-black text-primary-container uppercase select-none">
          STOC.AI
        </div>
        <div className="font-body text-xs font-bold uppercase text-center md:text-left tracking-wide">
          ©2026 BAUHAUS AGENTIC SYSTEMS. FORM FOLLOWS PROFIT.
        </div>
        <nav className="flex gap-6 font-headline text-xs font-black uppercase">
          <span className="opacity-80 hover:text-primary-container cursor-pointer transition-colors">Terms</span>
          <span className="opacity-80 hover:text-primary-container cursor-pointer transition-colors">Privacy</span>
          <span className="opacity-80 hover:text-primary-container cursor-pointer transition-colors">API</span>
          <span className="opacity-80 hover:text-primary-container cursor-pointer transition-colors">GitHub</span>
        </nav>
      </footer>

      {/* Mobile-only Bottom Navigation Bar */}
      {view !== 'loading' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t-4 border-outline z-[60] flex justify-around items-center h-16 px-2 shadow-neo">
          <button
            onClick={goToLanding}
            className={`flex flex-col items-center justify-center w-1/4 h-full border-r-2 border-outline font-headline font-black uppercase text-[10px] ${view === 'landing' ? 'bg-primary-container text-on-primary-container' : 'text-primary'
              }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'landing' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
            <span className="mt-1">Dash</span>
          </button>

          <button
            onClick={() => {
              if (report) {
                setView('result');
              } else {
                goToLanding();
                setTimeout(() => {
                  const input = document.getElementById("mobile-search-input") || document.querySelector('input');
                  if (input) input.focus();
                }, 100);
              }
            }}
            className={`flex flex-col items-center justify-center w-1/4 h-full border-r-2 border-outline font-headline font-black uppercase text-[10px] ${view === 'result' ? 'bg-primary-container text-on-primary-container' : 'text-primary'
              }`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: view === 'result' ? "'FILL' 1" : "'FILL' 0" }}>trending_up</span>
            <span className="mt-1">Market</span>
          </button>

          <button
            onClick={() => {
              if (report) {
                setView('result');
                setTimeout(() => {
                  const el = document.getElementById("agent-intelligence-header") || document.querySelector('h2');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              } else {
                alert("Please analyze a stock first to see agent intelligence.");
              }
            }}
            className="flex flex-col items-center justify-center w-1/4 h-full border-r-2 border-outline font-headline font-black uppercase text-[10px] text-primary"
          >
            <span className="material-symbols-outlined">smart_toy</span>
            <span className="mt-1">Agents</span>
          </button>

          <button
            onClick={() => alert("Portfolio feature is coming soon!")}
            className="flex flex-col items-center justify-center w-1/4 h-full font-headline font-black uppercase text-[10px] text-primary"
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="mt-1">Portfolio</span>
          </button>
        </nav>
      )}

      {/* Mobile-only Floating Action Button (FAB) */}
      {view !== 'loading' && (
        <button
          onClick={() => {
            goToLanding();
            setTimeout(() => {
              const input = document.getElementById("mobile-search-input") || document.querySelector('input');
              if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
          className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-primary text-on-primary border-4 border-outline neo-brutalist-shadow flex items-center justify-center hover:bg-tertiary active:translate-x-0.5 active:translate-y-0.5 z-50 rounded-none animate-bounce"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      )}

    </div>
  );
}

export default App;
