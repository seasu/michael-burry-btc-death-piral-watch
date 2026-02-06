/**
 * app.js — BTC Death Spiral Watch dashboard
 */

(async function () {
  "use strict";

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const fmtPrice = (v) => "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtOI = (v) => "$" + (v / 1e9).toFixed(2) + "B";
  const fmtFunding = (v) => Number(v).toFixed(6);

  // ------------------------------------------------------------------
  // Fetch data
  // ------------------------------------------------------------------
  let latest, history;

  try {
    const latestResp = await fetch("../data/latest.json");
    latest = await latestResp.json();
  } catch {
    $("#val-price").textContent = "Error loading data";
    return;
  }

  try {
    const histResp = await fetch("../data/history.csv");
    const csv = await histResp.text();
    history = parseCSV(csv);
  } catch {
    history = [];
  }

  // ------------------------------------------------------------------
  // Parse CSV
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Latest values
  // ------------------------------------------------------------------
  $("#val-price").textContent = fmtPrice(latest.price_usd);
  $("#val-oi").textContent = fmtOI(latest.oi_usd);
  $("#val-funding").textContent = fmtFunding(latest.funding_rate);
  $("#val-ts").textContent = "Updated: " + latest.ts_utc;

  // ------------------------------------------------------------------
  // 7-day filter
  // ------------------------------------------------------------------
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recent = history.filter((r) => new Date(r.ts_utc) >= sevenDaysAgo);

  const labels = recent.map((r) => r.ts_utc.replace("T", " ").replace("Z", ""));

  // ------------------------------------------------------------------
  // Chart defaults
  // ------------------------------------------------------------------
  Chart.defaults.color = "#8b949e";
  Chart.defaults.borderColor = "#21262d";

  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } },
      },
      y: {
        ticks: { font: { size: 10 } },
      },
    },
  };

  // Price chart
  new Chart($("#chart-price"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Price (USD)",
        data: recent.map((r) => r.price_usd),
        borderColor: "#f0883e",
        backgroundColor: "rgba(240,136,62,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      ...commonOpts,
      plugins: { ...commonOpts.plugins, title: { display: true, text: "BTC Price (USD) — 7d", color: "#e6edf3" } },
    },
  });

  // OI chart
  new Chart($("#chart-oi"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Open Interest (USD)",
        data: recent.map((r) => r.oi_usd),
        borderColor: "#58a6ff",
        backgroundColor: "rgba(88,166,255,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      ...commonOpts,
      plugins: { ...commonOpts.plugins, title: { display: true, text: "Open Interest (USD) — 7d", color: "#e6edf3" } },
    },
  });

  // Funding chart
  new Chart($("#chart-funding"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Funding Rate",
        data: recent.map((r) => r.funding_rate),
        borderColor: "#3fb950",
        backgroundColor: "rgba(63,185,80,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      ...commonOpts,
      plugins: { ...commonOpts.plugins, title: { display: true, text: "Funding Rate — 7d", color: "#e6edf3" } },
    },
  });

  // ------------------------------------------------------------------
  // History table (latest 30)
  // ------------------------------------------------------------------
  const tbody = $("#history-table tbody");
  const sorted = [...history].sort((a, b) => (a.ts_utc > b.ts_utc ? -1 : 1));
  const last30 = sorted.slice(0, 30);

  for (const row of last30) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${row.ts_utc}</td>` +
      `<td>${fmtPrice(row.price_usd)}</td>` +
      `<td>${fmtOI(row.oi_usd)}</td>` +
      `<td>${fmtFunding(row.funding_rate)}</td>`;
    tbody.appendChild(tr);
  }
})();
