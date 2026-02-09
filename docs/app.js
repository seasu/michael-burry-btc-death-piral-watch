/**
 * app.js — BTC Death Spiral Watch dashboard
 * Features: i18n (zh-TW / en / ja), timezone selector, charts, table,
 *           animated number counters, smooth transitions
 */

(async function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ==================================================================
  // CountUp animation engine
  // ==================================================================
  function animateValue(el, endValue, formatter, duration) {
    if (!duration) duration = 900;
    const text = el.textContent;
    // Parse current displayed number (strip formatting)
    const startValue = parseFloat(text.replace(/[^0-9.\-]/g, "")) || 0;
    if (startValue === endValue || isNaN(endValue)) {
      el.textContent = formatter(endValue);
      return;
    }
    const startTime = performance.now();
    el.classList.add("counting");

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * ease;
      el.textContent = formatter(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatter(endValue);
        el.classList.remove("counting");
        el.classList.add("flash");
        el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
      }
    }
    requestAnimationFrame(tick);
  }

  // ==================================================================
  // i18n translations
  // ==================================================================
  const I18N = {
    "zh-TW": {
      subtitle: "可審計的每日槓桿風險監測",
      tz_label: "時區：",
      lang_label: "語言：",
      latest: "最新數據",
      price_label: "價格 (USD)",
      oi_label: "未平倉量",
      funding_label: "資金費率",
      updated: "更新時間：",
      charts_title: "7 天走勢圖",
      chart_price: "BTC 價格 (USD) — 7 天",
      chart_oi: "未平倉量 (USD) — 7 天",
      chart_funding: "資金費率 — 7 天",
      history_title: "歷史紀錄（最近 30 筆）",
      th_timestamp: "時間戳記",
      th_price: "價格 (USD)",
      th_oi: "OI (USD)",
      th_funding: "資金費率",
      guide_title: "指標說明 — 死亡螺旋風險",
      guide_intro: 'Michael Burry 式的「泡沫崩塌」核心邏輯：當槓桿過度膨脹，市場只需一個下跌觸發點，就會進入<strong>價格下跌 → 強制平倉 → 賣壓加劇 → 價格再跌</strong>的死亡螺旋。以下三個指標可以幫助判斷螺旋是否正在形成。',
      guide_price_title: "BTC Price (USD)",
      guide_price_desc: "比特幣現貨價格。價格本身不是風險指標，但價格的變動方向搭配 OI 變動才是關鍵。",
      th_24h_change: "24h 變動",
      th_status: "狀態",
      price_up: "正常上漲",
      price_flat: "盤整",
      price_correction: "修正",
      price_sharp_drop: "急跌警戒",
      price_crash: "崩盤等級",
      guide_oi_title: "Open Interest (OI)",
      guide_oi_desc: "未平倉合約總值。OI 代表市場上「還沒結束的賭注」有多大。OI 下降 = 有人被迫平倉或主動撤退，若同時價格也在跌，代表多頭正在被清算——這是螺旋的核心機制。",
      oi_rapid_increase: "槓桿快速增加，潛在風險累積",
      oi_healthy: "健康增長",
      oi_stable: "穩定",
      oi_deleveraging: "去槓桿中",
      oi_mass_liquidation: "大規模清算，螺旋風險高",
      guide_funding_title: "Funding Rate",
      guide_funding_desc: "永續合約多空雙方定期互付的費率。正值 = 多頭付錢（市場偏多），負值 = 空頭付錢（市場偏空）。極端正值代表多頭過度擁擠，是泡沫即將反轉的前兆；極端負值代表恐慌，螺旋可能正在發生。",
      th_funding_rate: "Funding Rate",
      fr_extreme_long: "多頭極度擁擠 — Burry 泡沫訊號",
      fr_long_bias: "偏多，留意反轉",
      fr_neutral: "中性健康",
      fr_short_bias: "偏空，去槓桿中",
      fr_extreme_panic: "極度恐慌 — 螺旋進行中",
      verdict_title: "Verdict 判讀規則",
      th_condition: "組合條件",
      th_verdict: "判讀",
      th_meaning: "含義",
      v_cond_spiral_up: "Price ↓ 且 OI ↓",
      v_meaning_spiral_up: "價格與槓桿同步下降，市場正在強制去槓桿，死亡螺旋風險升高",
      v_cond_spiral_down: "Price ↑ 且 OI ↑",
      v_meaning_spiral_down: "新資金進場推動價格，槓桿健康增長，螺旋風險低",
      v_cond_neutral: "其他組合",
      v_meaning_neutral: "訊號混合，暫無明確方向。例：價格跌但 OI 升 = 有人在抄底開多",
      burry_title: "什麼情況接近 Burry 所說的泡沫崩塌？",
      burry_intro: "當以下條件同時出現時，市場處於最危險的狀態：",
      burry_1: "OI 處於歷史高位（槓桿泡沫已形成）",
      burry_2: "Funding Rate > 0.03%（多頭極度擁擠，所有人都在同一邊）",
      burry_3: "價格開始下跌 > 5%（觸發第一波清算）",
      burry_4: "OI 急速下降 > 5%（連鎖清算已啟動）",
      burry_5: "Funding Rate 急轉為負（市場從貪婪瞬間轉為恐慌）",
      disclaimer: "以上閾值僅供參考，基於歷史經驗歸納，不構成投資建議。市場條件會改變，請自行判斷。",
      footer_info: "資料僅供參考，非投資建議。",
      error_loading: "載入資料失敗",
      risk_title: "風險狀態",
      risk_no_ref: "尚無 24h 參考數據",
      risk_spiral_up: "Spiral Risk ↑",
      risk_spiral_up_sub: "價格與 OI 同步下跌 — 去槓桿螺旋風險升高",
      risk_spiral_down: "Spiral Risk ↓",
      risk_spiral_down_sub: "價格與 OI 同步上升 — 螺旋風險低",
      risk_neutral_label: "Neutral",
      risk_neutral_sub: "訊號混合，暫無明確螺旋方向",
      ri_price: "價格",
      ri_oi: "OI",
      ri_funding: "資金費率",
    },
    en: {
      subtitle: "Auditable daily leverage-risk monitor",
      tz_label: "Timezone:",
      lang_label: "Language:",
      latest: "Latest",
      price_label: "Price (USD)",
      oi_label: "Open Interest",
      funding_label: "Funding Rate",
      updated: "Updated: ",
      charts_title: "7-Day Charts",
      chart_price: "BTC Price (USD) — 7d",
      chart_oi: "Open Interest (USD) — 7d",
      chart_funding: "Funding Rate — 7d",
      history_title: "History (latest 30)",
      th_timestamp: "Timestamp",
      th_price: "Price (USD)",
      th_oi: "OI (USD)",
      th_funding: "Funding Rate",
      guide_title: "Indicator Guide — Death Spiral Risk",
      guide_intro: 'The core logic of a Michael Burry-style "bubble collapse": when leverage is over-extended, a single downtick can trigger a <strong>price drop → forced liquidations → more selling pressure → further price drop</strong> death spiral. These three indicators help determine whether a spiral is forming.',
      guide_price_title: "BTC Price (USD)",
      guide_price_desc: "Bitcoin spot price. Price alone is not a risk indicator — what matters is the direction of price change combined with OI movement.",
      th_24h_change: "24h Change",
      th_status: "Status",
      price_up: "Normal rally",
      price_flat: "Consolidation",
      price_correction: "Correction",
      price_sharp_drop: "Sharp drop alert",
      price_crash: "Crash-level",
      guide_oi_title: "Open Interest (OI)",
      guide_oi_desc: "Total value of outstanding contracts. OI represents the size of open bets in the market. A drop in OI means positions are being closed (forced or voluntary). When OI drops alongside price, it signals long liquidations — the core mechanism of a spiral.",
      oi_rapid_increase: "Leverage building fast, risk accumulating",
      oi_healthy: "Healthy growth",
      oi_stable: "Stable",
      oi_deleveraging: "Deleveraging underway",
      oi_mass_liquidation: "Mass liquidation, high spiral risk",
      guide_funding_title: "Funding Rate",
      guide_funding_desc: "Periodic fee exchanged between longs and shorts on perpetual contracts. Positive = longs pay (market bullish). Negative = shorts pay (market bearish). Extreme positive signals overcrowded longs (bubble precursor); extreme negative signals panic (spiral may be active).",
      th_funding_rate: "Funding Rate",
      fr_extreme_long: "Extremely overcrowded longs — Burry bubble signal",
      fr_long_bias: "Long-biased, watch for reversal",
      fr_neutral: "Neutral & healthy",
      fr_short_bias: "Short-biased, deleveraging",
      fr_extreme_panic: "Extreme panic — spiral in progress",
      verdict_title: "Verdict Rules",
      th_condition: "Condition",
      th_verdict: "Verdict",
      th_meaning: "Meaning",
      v_cond_spiral_up: "Price ↓ and OI ↓",
      v_meaning_spiral_up: "Price and leverage dropping together — market is force-deleveraging, death spiral risk rising",
      v_cond_spiral_down: "Price ↑ and OI ↑",
      v_meaning_spiral_down: "New capital flowing in, healthy leverage growth, low spiral risk",
      v_cond_neutral: "Other combinations",
      v_meaning_neutral: "Mixed signals, no clear direction. e.g. Price ↓ but OI ↑ = bottom-fishing longs opening",
      burry_title: "When does it resemble Burry's bubble collapse?",
      burry_intro: "When all of the following conditions appear simultaneously, the market is at its most dangerous:",
      burry_1: "OI at historical highs (leverage bubble has formed)",
      burry_2: "Funding Rate > 0.03% (longs extremely overcrowded, everyone on the same side)",
      burry_3: "Price starts dropping > 5% (triggering the first wave of liquidations)",
      burry_4: "OI drops rapidly > 5% (chain liquidations activated)",
      burry_5: "Funding Rate flips sharply negative (market shifts from greed to panic instantly)",
      disclaimer: "The thresholds above are for reference only, based on historical patterns, and do not constitute investment advice. Market conditions change — use your own judgment.",
      footer_info: "Data for informational purposes only. Not investment advice.",
      error_loading: "Error loading data",
      risk_title: "Risk Status",
      risk_no_ref: "No 24h reference data yet",
      risk_spiral_up: "Spiral Risk ↑",
      risk_spiral_up_sub: "Price and OI dropping together — deleveraging spiral risk rising",
      risk_spiral_down: "Spiral Risk ↓",
      risk_spiral_down_sub: "Price and OI rising together — low spiral risk",
      risk_neutral_label: "Neutral",
      risk_neutral_sub: "Mixed signals, no clear spiral direction",
      ri_price: "Price",
      ri_oi: "OI",
      ri_funding: "Funding",
    },
    ja: {
      subtitle: "監査可能な日次レバレッジリスクモニター",
      tz_label: "タイムゾーン：",
      lang_label: "言語：",
      latest: "最新データ",
      price_label: "価格 (USD)",
      oi_label: "未決済建玉",
      funding_label: "資金調達率",
      updated: "更新：",
      charts_title: "7日間チャート",
      chart_price: "BTC 価格 (USD) — 7日",
      chart_oi: "未決済建玉 (USD) — 7日",
      chart_funding: "資金調達率 — 7日",
      history_title: "履歴（直近30件）",
      th_timestamp: "タイムスタンプ",
      th_price: "価格 (USD)",
      th_oi: "OI (USD)",
      th_funding: "資金調達率",
      guide_title: "指標ガイド — デス・スパイラルリスク",
      guide_intro: 'Michael Burry 流の「バブル崩壊」の核心ロジック：レバレッジが過度に膨張すると、ひとつの下落トリガーで<strong>価格下落 → 強制清算 → 売り圧力増大 → さらなる下落</strong>のデス・スパイラルに突入します。以下の3指標でスパイラル形成を判断できます。',
      guide_price_title: "BTC Price (USD)",
      guide_price_desc: "ビットコイン現物価格。価格単体はリスク指標ではなく、OIの変動方向と組み合わせて判断することが重要です。",
      th_24h_change: "24h 変動",
      th_status: "状態",
      price_up: "正常な上昇",
      price_flat: "レンジ相場",
      price_correction: "調整",
      price_sharp_drop: "急落警戒",
      price_crash: "暴落レベル",
      guide_oi_title: "Open Interest (OI)",
      guide_oi_desc: "未決済建玉の総額。OIは市場の「まだ決済されていない賭け」の大きさを表します。OI低下＝ポジションの強制清算または自主的撤退。価格と同時に下落する場合、ロングの清算が進行中——スパイラルの核心メカニズムです。",
      oi_rapid_increase: "レバレッジ急増、リスク蓄積中",
      oi_healthy: "健全な成長",
      oi_stable: "安定",
      oi_deleveraging: "デレバレッジ進行中",
      oi_mass_liquidation: "大規模清算、スパイラルリスク高",
      guide_funding_title: "Funding Rate（資金調達率）",
      guide_funding_desc: "無期限契約でロングとショートが定期的に支払う手数料。正値＝ロングが支払い（強気）、負値＝ショートが支払い（弱気）。極端な正値はロングの過密を示し、バブル反転の前兆。極端な負値はパニックを示し、スパイラル進行中の可能性。",
      th_funding_rate: "Funding Rate",
      fr_extreme_long: "ロング極度過密 — Burry バブルシグナル",
      fr_long_bias: "ロング寄り、反転に注意",
      fr_neutral: "中立・健全",
      fr_short_bias: "ショート寄り、デレバレッジ中",
      fr_extreme_panic: "極度のパニック — スパイラル進行中",
      verdict_title: "Verdict 判定ルール",
      th_condition: "条件の組み合わせ",
      th_verdict: "判定",
      th_meaning: "意味",
      v_cond_spiral_up: "Price ↓ かつ OI ↓",
      v_meaning_spiral_up: "価格とレバレッジが同時低下、市場は強制デレバレッジ中。デス・スパイラルリスク上昇",
      v_cond_spiral_down: "Price ↑ かつ OI ↑",
      v_meaning_spiral_down: "新規資金が流入し価格を押し上げ、健全なレバレッジ成長。スパイラルリスク低",
      v_cond_neutral: "その他の組み合わせ",
      v_meaning_neutral: "シグナル混在、明確な方向なし。例：価格↓ だがOI↑ ＝ 押し目買いのロング参入",
      burry_title: "Burryが言うバブル崩壊に近い状況とは？",
      burry_intro: "以下の条件がすべて同時に出現した場合、市場は最も危険な状態です：",
      burry_1: "OIが過去最高水準（レバレッジバブル形成済み）",
      burry_2: "Funding Rate > 0.03%（ロング極度過密、全員が同じ方向）",
      burry_3: "価格が5%以上下落開始（第一波清算のトリガー）",
      burry_4: "OIが5%以上急減（連鎖清算が発動）",
      burry_5: "Funding Rateが急激にマイナスへ（市場が瞬時に貪欲からパニックへ）",
      disclaimer: "上記の閾値は参考値であり、過去の経験則に基づくもので、投資助言ではありません。市場環境は変化します——ご自身で判断してください。",
      footer_info: "情報提供のみを目的としています。投資助言ではありません。",
      error_loading: "データの読み込みに失敗しました",
      risk_title: "リスク状態",
      risk_no_ref: "24h参考データなし",
      risk_spiral_up: "Spiral Risk ↑",
      risk_spiral_up_sub: "価格とOIが同時下落 — デレバレッジスパイラルリスク上昇",
      risk_spiral_down: "Spiral Risk ↓",
      risk_spiral_down_sub: "価格とOIが同時上昇 — スパイラルリスク低",
      risk_neutral_label: "Neutral",
      risk_neutral_sub: "シグナル混在、明確なスパイラル方向なし",
      ri_price: "価格",
      ri_oi: "OI",
      ri_funding: "資金調達率",
    },
  };

  // ==================================================================
  // i18n engine
  // ==================================================================
  const langSelect = $("#lang-select");
  const savedLang = localStorage.getItem("lang");
  if (savedLang && I18N[savedLang]) {
    langSelect.value = savedLang;
  }

  function getLang() {
    return langSelect.value;
  }

  function t(key) {
    const lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N["en"] && I18N["en"][key]) || key;
  }

  function applyI18n() {
    const lang = getLang();
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const text = t(key);
      if (text.includes("<")) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    });
  }

  // ==================================================================
  // Timezone
  // ==================================================================
  const tzSelect = $("#tz-select");
  const savedTz = localStorage.getItem("tz");
  if (savedTz && [...tzSelect.options].some((o) => o.value === savedTz)) {
    tzSelect.value = savedTz;
  }

  function getTimezone() { return tzSelect.value; }

  const tzAbbrs = {
    UTC: "UTC", "Asia/Taipei": "TPE", "America/New_York": "ET",
    "Europe/London": "LDN", "Asia/Tokyo": "JST",
  };
  function tzAbbr(tz) { return tzAbbrs[tz] || tz; }

  function fmtTs(utcStr) {
    const tz = getTimezone();
    const d = new Date(utcStr);
    if (tz === "UTC") return utcStr.replace("T", " ").replace("Z", "") + " UTC";
    return d.toLocaleString("sv-SE", { timeZone: tz }).replace("T", " ") + " " + tzAbbr(tz);
  }

  function fmtTsShort(utcStr) {
    const tz = getTimezone();
    const d = new Date(utcStr);
    if (tz === "UTC") return utcStr.replace("T", " ").replace("Z", "");
    return d.toLocaleString("sv-SE", { timeZone: tz }).replace("T", " ");
  }

  // ==================================================================
  // Formatters
  // ==================================================================
  const fmtPrice = (v) => "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtOI = (v) => "$" + (v / 1e9).toFixed(2) + "B";
  const fmtFunding = (v) => Number(v).toFixed(6);

  // ==================================================================
  // Fetch data
  // ==================================================================
  let latest, history;

  try {
    const latestResp = await fetch("data/latest.json");
    latest = await latestResp.json();
  } catch {
    applyI18n();
    $("#val-price").textContent = t("error_loading");
    return;
  }

  try {
    const histResp = await fetch("data/history.csv");
    const csv = await histResp.text();
    history = parseCSV(csv);
  } catch {
    history = [];
  }

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 4) continue;
      rows.push({
        ts_utc: cols[0],
        price_usd: parseFloat(cols[1]),
        oi_usd: parseFloat(cols[2]),
        funding_rate: parseFloat(cols[3]),
      });
    }
    return rows;
  }

  // ==================================================================
  // Charts — Modern styling
  // ==================================================================
  Chart.defaults.color = "#64748b";
  Chart.defaults.borderColor = "rgba(255,255,255,0.04)";
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recent = history.filter((r) => new Date(r.ts_utc) >= sevenDaysAgo);
  const labels = recent.map((r) => fmtTsShort(r.ts_utc));

  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(10,14,23,0.9)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleFont: { family: "'Inter', sans-serif", size: 11 },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 7, maxRotation: 0, font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.03)" },
      },
      y: {
        ticks: { font: { size: 10 } },
        grid: { color: "rgba(255,255,255,0.03)" },
      },
    },
    elements: {
      line: { borderWidth: 2 },
      point: { radius: 0, hoverRadius: 4, hoverBorderWidth: 2 },
    },
  };

  function makeGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  const priceCtx = $("#chart-price").getContext("2d");
  const priceChart = new Chart($("#chart-price"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Price",
        data: recent.map((r) => r.price_usd),
        borderColor: "#f97316",
        backgroundColor: makeGradient(priceCtx, "rgba(249,115,22,0.15)", "rgba(249,115,22,0)"),
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      ...commonOpts,
      plugins: {
        ...commonOpts.plugins,
        title: { display: true, text: t("chart_price"), color: "#94a3b8", font: { size: 12, weight: "500" }, padding: { bottom: 10 } },
      },
    },
  });

  const oiCtx = $("#chart-oi").getContext("2d");
  const oiChart = new Chart($("#chart-oi"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "OI",
        data: recent.map((r) => r.oi_usd),
        borderColor: "#3b82f6",
        backgroundColor: makeGradient(oiCtx, "rgba(59,130,246,0.15)", "rgba(59,130,246,0)"),
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      ...commonOpts,
      plugins: {
        ...commonOpts.plugins,
        title: { display: true, text: t("chart_oi"), color: "#94a3b8", font: { size: 12, weight: "500" }, padding: { bottom: 10 } },
      },
    },
  });

  const fundingCtx = $("#chart-funding").getContext("2d");
  const fundingChart = new Chart($("#chart-funding"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Funding",
        data: recent.map((r) => r.funding_rate),
        borderColor: "#06b6d4",
        backgroundColor: makeGradient(fundingCtx, "rgba(6,182,212,0.15)", "rgba(6,182,212,0)"),
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      ...commonOpts,
      plugins: {
        ...commonOpts.plugins,
        title: { display: true, text: t("chart_funding"), color: "#94a3b8", font: { size: 12, weight: "500" }, padding: { bottom: 10 } },
      },
    },
  });

  // ==================================================================
  // Risk status calculation
  // ==================================================================
  function findRef24h() {
    if (!history.length) return null;
    const latestDt = new Date(latest.ts_utc);
    const threshold = new Date(latestDt.getTime() - 24 * 60 * 60 * 1000);
    const candidates = history.filter((r) => new Date(r.ts_utc) <= threshold);
    if (!candidates.length) return null;
    candidates.sort((a, b) => (a.ts_utc > b.ts_utc ? -1 : 1));
    return candidates[0];
  }

  function classifyPrice(pct) {
    if (pct === null) return { color: "gray", key: "price_flat" };
    if (pct < -15)  return { color: "red",    key: "price_crash" };
    if (pct < -7)   return { color: "orange", key: "price_sharp_drop" };
    if (pct < -3)   return { color: "yellow", key: "price_correction" };
    if (pct > 3)    return { color: "green",  key: "price_up" };
    return { color: "gray", key: "price_flat" };
  }

  function classifyOI(pct) {
    if (pct === null) return { color: "gray", key: "oi_stable" };
    if (pct < -5)   return { color: "red",    key: "oi_mass_liquidation" };
    if (pct < -1)   return { color: "orange", key: "oi_deleveraging" };
    if (pct > 5)    return { color: "yellow", key: "oi_rapid_increase" };
    if (pct > 1)    return { color: "green",  key: "oi_healthy" };
    return { color: "gray", key: "oi_stable" };
  }

  function classifyFunding(rate) {
    const pct = rate * 100;
    if (pct > 0.03)  return { color: "red",    key: "fr_extreme_long" };
    if (pct > 0.01)  return { color: "yellow", key: "fr_long_bias" };
    if (pct < -0.03) return { color: "red",    key: "fr_extreme_panic" };
    if (pct < -0.01) return { color: "orange", key: "fr_short_bias" };
    return { color: "green", key: "fr_neutral" };
  }

  // ==================================================================
  // Render
  // ==================================================================
  let isFirstRender = true;

  function render() {
    applyI18n();

    // Latest — animated countUp on first load
    const priceEl = $("#val-price");
    const oiEl = $("#val-oi");
    const fundingEl = $("#val-funding");

    if (isFirstRender) {
      animateValue(priceEl, latest.price_usd, fmtPrice, 1200);
      animateValue(oiEl, latest.oi_usd, fmtOI, 1200);
      animateValue(fundingEl, latest.funding_rate, fmtFunding, 1200);
      isFirstRender = false;
    } else {
      priceEl.textContent = fmtPrice(latest.price_usd);
      oiEl.textContent = fmtOI(latest.oi_usd);
      fundingEl.textContent = fmtFunding(latest.funding_rate);
    }

    // Timestamp with live dot
    const tsEl = $("#val-ts");
    const liveDot = tsEl.querySelector(".live-dot");
    tsEl.textContent = "";
    if (liveDot) tsEl.appendChild(liveDot);
    tsEl.appendChild(document.createTextNode(" " + t("updated") + fmtTs(latest.ts_utc)));

    // Risk status
    const ref = findRef24h();
    const meter = $("#risk-meter");
    const icon = $("#risk-icon");
    const verdict = $("#risk-verdict");
    const sub = $("#risk-sub");
    const indContainer = $("#risk-indicators");

    if (!ref) {
      meter.className = "risk-meter risk-neutral";
      icon.textContent = "\u26AA";
      verdict.textContent = t("risk_neutral_label");
      sub.textContent = t("risk_no_ref");
      indContainer.innerHTML = "";
    } else {
      const pricePct = ref.price_usd ? ((latest.price_usd - ref.price_usd) / ref.price_usd) * 100 : null;
      const oiPct = ref.oi_usd ? ((latest.oi_usd - ref.oi_usd) / ref.oi_usd) * 100 : null;

      const pClass = classifyPrice(pricePct);
      const oClass = classifyOI(oiPct);
      const fClass = classifyFunding(latest.funding_rate);

      let vKey, vSubKey, vLevel, vIcon;
      if (pricePct !== null && oiPct !== null && pricePct < 0 && oiPct < 0) {
        vKey = "risk_spiral_up"; vSubKey = "risk_spiral_up_sub"; vLevel = "risk-high"; vIcon = "\u{1F534}";
      } else if (pricePct !== null && oiPct !== null && pricePct > 0 && oiPct > 0) {
        vKey = "risk_spiral_down"; vSubKey = "risk_spiral_down_sub"; vLevel = "risk-low"; vIcon = "\u{1F7E2}";
      } else {
        vKey = "risk_neutral_label"; vSubKey = "risk_neutral_sub"; vLevel = "risk-neutral"; vIcon = "\u{26AA}";
      }

      meter.className = "risk-meter " + vLevel;
      icon.textContent = vIcon;
      verdict.textContent = t(vKey);
      sub.textContent = t(vSubKey);

      const pctStr = (v) => v === null ? "n/a" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
      indContainer.innerHTML =
        `<span class="risk-ind"><span class="risk-dot ${pClass.color}"></span> ${t("ri_price")} ${pctStr(pricePct)} — ${t(pClass.key)}</span>` +
        `<span class="risk-ind"><span class="risk-dot ${oClass.color}"></span> ${t("ri_oi")} ${pctStr(oiPct)} — ${t(oClass.key)}</span>` +
        `<span class="risk-ind"><span class="risk-dot ${fClass.color}"></span> ${t("ri_funding")} ${(latest.funding_rate * 100).toFixed(4)}% — ${t(fClass.key)}</span>`;
    }

    // Table header timestamp with tz
    const thTs = $("#th-ts");
    thTs.textContent = t("th_timestamp") + " (" + tzAbbr(getTimezone()) + ")";

    // Chart labels + titles
    const newLabels = recent.map((r) => fmtTsShort(r.ts_utc));
    priceChart.data.labels = newLabels;
    priceChart.options.plugins.title.text = t("chart_price");
    priceChart.update("none");

    oiChart.data.labels = newLabels;
    oiChart.options.plugins.title.text = t("chart_oi");
    oiChart.update("none");

    fundingChart.data.labels = newLabels;
    fundingChart.options.plugins.title.text = t("chart_funding");
    fundingChart.update("none");

    // Table
    const tbody = $("#history-table tbody");
    tbody.innerHTML = "";
    const sorted = [...history].sort((a, b) => (a.ts_utc > b.ts_utc ? -1 : 1));
    const last30 = sorted.slice(0, 30);
    for (const row of last30) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${fmtTs(row.ts_utc)}</td>` +
        `<td>${fmtPrice(row.price_usd)}</td>` +
        `<td>${fmtOI(row.oi_usd)}</td>` +
        `<td>${fmtFunding(row.funding_rate)}</td>`;
      tbody.appendChild(tr);
    }
  }

  // ==================================================================
  // Event listeners
  // ==================================================================
  render();

  tzSelect.addEventListener("change", () => {
    localStorage.setItem("tz", tzSelect.value);
    render();
  });

  langSelect.addEventListener("change", () => {
    localStorage.setItem("lang", langSelect.value);
    render();
  });
})();
