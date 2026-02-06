# SPEC.md — BTC Death Spiral Watch（C’ 方案 / GitHub 全自動 + 可審計）
> 語言：繁體中文（硬規格保留英文原樣）  
> 目的：交付給 **Claude Code** 直接執行建立完整 repo。  
> **重要：Claude Code 必須嚴格遵守本文件的路徑、檔名、環境變數名稱、Cron、資料格式。不得自行改名或調整結構。**

---

## 0. 完成定義（Definition of Done）

完成後必須同時滿足：

1) Repo 結構 **完全符合**本文件「2) Repo 結構」。
2) GitHub Actions：
   - `hourly_collect.yml` **每小時**自動抓數據 → 更新檔案 → 有變更才 commit/push。
   - `daily_post.yml` **每日台北時間 09:00（UTC 01:00）**自動產出貼文內容（寫入 repo）→ commit/push 後才發到 X。
   - `pr_checks.yml` PR 僅做 lint/test/compile，**不得讀取 secrets、不得發文**。
3) GitHub Pages（/site 靜態站）：
   - 顯示最新值（latest）
   - 顯示近 7 天 Price/OI/Funding 圖表
   - 顯示至少最近 30 筆 history 表格
4) 貼文內容自動準備：
   - 每日生成 `posts/YYYY-MM-DD.txt`（即將發到 X 的全文）
   - 每日生成 `data/daily/YYYY-MM-DD.json`（審計依據：當天用的數據 + 24h 參考 + verdict）
5) README.md 必須包含：
   - 專案目的（可審計的 daily watch）
   - 資料來源與 verdict 規則
   - **單一設定入口**（只在 GitHub 一個地方設定 Secrets/Variables）
   - 本地測試命令
   - Workflow 驗證方式
   - 免責聲明（資訊用途，非投資建議）
6) 安全性：
   - PR workflow 絕對不可接觸 secrets
   - 不可使用 `pull_request_target`
   - daily 發文 workflow 只能在 `main` 分支以 `schedule`/`workflow_dispatch` 執行
   - workflow 權限最小化（least privilege）

---

## 1. 強約束（不得更改）

- **禁止**截圖/快照/爬取他人網站 UI。僅使用公開 API。
- 僅抓 3 個指標（MVP）：
  - BTC price（CoinGecko）
  - BTCUSDT Open Interest（USD value, Binance Futures）
  - BTCUSDT Funding rate（Binance Futures）
- 抓取頻率：**每小時一次**（不是每 5 分鐘）。
- 每日發文時間：**Asia/Taipei 09:00 = UTC 01:00**。
- Verdict 規則（MVP）固定如下：
  - `price↓` 且 `OI↓` → `"Spiral risk ↑"`
  - `price↑` 且 `OI↑` → `"Spiral risk ↓"`
  - 其他 → `"Neutral"`
- Repo 結構、檔名、路徑、環境變數名稱 **不得更改**。

---

## 2. Repo 結構（必須完全一致）

```text
btc-death-spiral-watch/
  data/
    latest.json
    history.csv
    daily/
      YYYY-MM-DD.json
  posts/
    YYYY-MM-DD.txt
    YYYY-MM-DD.error.txt
    THREAD_01_reasoning.txt
    THREAD_02_how_to_read.txt
  site/
    index.html
    app.js
    style.css
  scripts/
    collect.py
    make_post.py
    post_to_x.py
    utils.py
  .github/workflows/
    hourly_collect.yml
    daily_post.yml
    pr_checks.yml
  README.md
  requirements.txt
  .env.example
  LICENSE
```

---

## 3. 單一設定入口（Single Source of Truth）

**所有設定只允許在這個位置完成：**  
`Repo → Settings → Secrets and variables → Actions`

### 3.1 Secrets（敏感，必填）
- `X_BEARER_TOKEN`：X API v2 Bearer token
- `X_POST_URL`：預設 `https://api.x.com/2/tweets`（如需改用 twitter 網域則改成 `https://api.twitter.com/2/tweets`）

### 3.2 Variables（非敏感，必填/可選）
- `REPO_HTTP_URL`（必填）：例如 `https://github.com/<user>/btc-death-spiral-watch`
- `PAGES_BASE_URL`（必填）：例如 `https://<user>.github.io/btc-death-spiral-watch`
- `HASHTAGS`（可選）：例如 `#bitcoin #crypto #risk`
- `SYMBOL`（可選，預設 BTCUSDT）：例如 `BTCUSDT`

> Claude Code 必須讓 scripts / workflows 透過環境變數讀取上述值。  
> 同時提供 `.env.example` 供本地測試使用（名稱完全相同）。

---

## 4. 資料來源（API）與解析規格（不得更動）

### 4.1 BTC price（CoinGecko）
- URL：  
  `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- 解析：  
  `bitcoin.usd` → `price_usd`

### 4.2 Open Interest（Binance Futures, USD value）
- URL（MVP 固定 period=1h, limit=1）：  
  `https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=1`
- 解析：  
  `sumOpenInterestValue`（取 array[0]）→ `oi_usd`

### 4.3 Funding rate（Binance Futures）
- URL：  
  `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT`
- 解析：  
  `lastFundingRate` → `funding_rate`

---

## 5. 資料格式（MUST match）

### 5.1 `data/latest.json`
```json
{
  "ts_utc": "2026-02-05T01:00:00Z",
  "price_usd": 73223.12,
  "oi_usd": 24500000000.0,
  "funding_rate": 0.000123
}
```

### 5.2 `data/history.csv`
第一行固定欄位：
```csv
ts_utc,price_usd,oi_usd,funding_rate
```

資料列範例：
```csv
2026-02-05T01:00:00Z,73223.12,24500000000.0,0.000123
```

**重要：** append-only，但要以 `ts_utc` 去重（rerun 同一小時不得重複寫入）。

### 5.3 `data/daily/YYYY-MM-DD.json`
```json
{
  "date_tpe": "YYYY-MM-DD",
  "latest": {
    "ts_utc": "....",
    "price_usd": 0,
    "oi_usd": 0,
    "funding_rate": 0
  },
  "ref_24h": {
    "ts_utc": "....",
    "price_usd": 0,
    "oi_usd": 0,
    "funding_rate": 0
  },
  "price_change_24h_pct": -3.47,
  "oi_change_24h_pct": -2.10,
  "verdict": "Spiral risk ↑"
}
```

- `ref_24h` 若找不到，允許為 `null`
- `*_pct` 若 ref 缺失，允許為 `null`

---

## 6. 貼文內容規格（自動生成）

### 6.1 `posts/YYYY-MM-DD.txt`（每日發文全文）
格式固定（必須使用 Variables 組合連結）：

```text
BTC Death Spiral Watch (Daily) — YYYY-MM-DD (TPE)

Price: $<price> (<pchg>% 24h)
OI: $<oi_b>B (<oichg>% 24h)
Funding: <funding_rate>
Verdict: <verdict>

Audit: <REPO_HTTP_URL>/blob/main/data/daily/YYYY-MM-DD.json
Dashboard: <PAGES_BASE_URL>
<HASHTAGS>
```

- `<oi_b>` = `oi_usd / 1e9`，保留 2 位小數
- `<pchg>`、`<oichg>` 若無 ref，顯示 `n/a`

### 6.2 Thread 文案（必須生成）
在 repo 建立兩個檔案（內容由 Claude Code 生成繁體中文版本，可直接貼到 X）：
- `posts/THREAD_01_reasoning.txt`：緣由/依據/方法論/為何公開審計
- `posts/THREAD_02_how_to_read.txt`：指標解釋與判讀方式（不做投資建議）

---

## 7. Scripts 規格（Python）

### 7.1 共同要求
- Python 3.x
- `requirements.txt` 至少包含：`requests`, `python-dateutil`
- 每個 HTTP request 必須有 timeout（例如 10 秒）
- 基本重試（例如 2 次，exponential backoff）
- 所有儲存時間以 UTC 表示，`ts_utc` 使用 ISO8601 `...Z`
- TPE 日期：使用 `Asia/Taipei` 產生 `YYYY-MM-DD`（用於 daily 檔名與貼文日期）

### 7.2 `scripts/utils.py`
必須提供（可自行設計函式名，但功能要齊）：
- 讀取環境變數（Secrets/Variables）
- `fetch_json(url, timeout=..., retries=...)`
- 產生整點 `ts_utc`（對齊整點，避免同一小時多個 timestamp）
- CSV append + dedupe by `ts_utc`
- 輔助：格式化數字（price、pct、oi_b）

### 7.3 `scripts/collect.py`
流程：
1) 讀 `SYMBOL`（預設 `BTCUSDT`）。MVP 可以先只支援 BTCUSDT（但仍要讀 SYMBOL，未來可擴充）
2) 抓 3 個 API，解析出 `price_usd`、`oi_usd`、`funding_rate`
3) 以整點 `ts_utc` 寫入 `data/latest.json`
4) append `data/history.csv`（dedupe by `ts_utc`）
5) 若抓取失敗，exit non-zero（Actions 失敗，避免 commit 壞資料）

### 7.4 `scripts/make_post.py`
流程：
1) 讀 `data/latest.json`
2) 從 `data/history.csv` 找到 `ts_utc <= latest_ts - 24h` 的最近一筆作為 `ref_24h`
3) 計算 `price_change_24h_pct`、`oi_change_24h_pct`
4) 算 verdict（固定規則）
5) 寫入 `data/daily/YYYY-MM-DD.json`（TPE 日期）
6) 生成 `posts/YYYY-MM-DD.txt`（使用 `REPO_HTTP_URL`, `PAGES_BASE_URL`, `HASHTAGS`）

### 7.5 `scripts/post_to_x.py`
流程：
1) 讀 `posts/YYYY-MM-DD.txt`
2) 以 `X_BEARER_TOKEN` 呼叫 `X_POST_URL`（X API v2 create post）
3) 若失敗：重試一次
4) 若仍失敗：寫入 `posts/YYYY-MM-DD.error.txt`（包含 HTTP status + response text），exit non-zero

---

## 8. GitHub Actions 規格（安全性必做）

### 8.1 `hourly_collect.yml`
- 觸發：
  - `schedule: "0 * * * *"`（UTC，每小時整點）
  - `workflow_dispatch`
- steps：
  1) checkout
  2) setup python
  3) install requirements
  4) run `python scripts/collect.py`
  5) 只有在有 diff 時才 commit/push
- permissions（最小化）：
  - `contents: write`

### 8.2 `daily_post.yml`
- 觸發：
  - `schedule: "0 1 * * *"`（UTC = TPE 09:00）
  - `workflow_dispatch`
- 必須限制只在 `main` 分支有效（例如 job level `if: github.ref == 'refs/heads/main'`）
- 執行順序（不可改）：
  1) checkout
  2) setup python + install
  3) `python scripts/make_post.py`
  4) commit/push `data/daily/...` 與 `posts/...`（先上審計存根）
  5) `python scripts/post_to_x.py`
- 若發文失敗：
  - `.error.txt` 必須已產生
  - workflow 必須失敗 (exit non-zero)
- permissions（最小化）：
  - `contents: write`

### 8.3 `pr_checks.yml`
- 觸發：`pull_request`
- 不得讀 secrets，不得發文
- 至少執行：
  - `python -m compileall scripts`
  -（可選）簡單單元測試

**禁止使用：** `pull_request_target`

---

## 9. GitHub Pages（/site 靜態站）

### 9.1 `site/index.html`
- 簡潔頁面：標題 + 最新值區 + 3 張圖 + 表格

### 9.2 `site/app.js`
- 讀取資料（相對路徑）：
  - `../data/latest.json`
  - `../data/history.csv`
- 計算近 7 天（從 history.csv 篩選）
- 使用 Chart.js（建議 CDN）或純 JS 畫圖
- 表格至少顯示最近 30 行（ts、price、oi、funding）

### 9.3 `site/style.css`
- 簡單清爽即可

---

## 10. README.md（必含章節）

- 專案介紹（Why / What）
- 免責聲明
- 資料來源（CoinGecko / Binance Futures）
- Verdict 規則（固定）
- **單一設定入口（最重要）**
  - 清楚列出要去哪裡填 Secrets/Variables
  - 列出每個 key 的用途
- 本地測試：
  - `python scripts/collect.py`
  - `python scripts/make_post.py`
- Workflow 驗證：
  - 如何手動 workflow_dispatch
  - 成功後應出現哪些檔案

---

## 11. 維護策略（低維護要求）

- 指標只維持 3 個（price/OI/funding）
- 抓取頻率每小時一次
- 任何擴充（清算、flows、礦工）都放在未來，不得在 MVP 先做

---

## 12. Claude Code 最終輸出要求

完成後請在終端輸出：

1) repo tree（確認路徑）
2) 三個 workflows 的 cron 與安全策略摘要
3) README 的「單一設定入口」段落內容（方便我直接照做）
4) `posts/THREAD_01_reasoning.txt` 與 `posts/THREAD_02_how_to_read.txt` 已生成（繁體中文）
