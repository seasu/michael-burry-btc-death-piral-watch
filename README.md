# BTC Death Spiral Watch

在 X 上用「可審計、可重現」的方式，固定頻率發布 BTC 槓桿風險監測結果，建立可信度與流量。

## 免責聲明

> **本專案僅供資訊參考，不構成任何投資建議。**
> 加密貨幣具有高度波動性與風險，任何交易決策請自行評估。本專案作者不對任何因使用本資訊而產生的損失負責。

## 資料來源

| 指標 | 來源 | API |
|------|------|-----|
| BTC Price (USD) | CoinGecko | `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=usd` |
| BTCUSDT Open Interest | Bybit | `GET /v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1` |
| BTCUSDT Funding Rate | Bybit | `GET /v5/market/tickers?category=linear&symbol=BTCUSDT` |

## Verdict 判讀規則

| 條件 | 結果 |
|------|------|
| Price ↓ 且 OI ↓ | **Spiral risk ↑**（去槓桿螺旋風險上升）|
| Price ↑ 且 OI ↑ | **Spiral risk ↓**（槓桿健康增長）|
| 其他 | **Neutral**（中性）|

## 單一設定入口

**所有設定只在一個地方完成：**

`Repo → Settings → Secrets and variables → Actions`

### Secrets（敏感，必填）

| Name | 說明 |
|------|------|
| `X_BEARER_TOKEN` | X API v2 Bearer token |
| `X_POST_URL` | 預設 `https://api.x.com/2/tweets`（如需改用 twitter 網域則填 `https://api.twitter.com/2/tweets`）|

### Variables（非敏感）

| Name | 必填 | 說明 | 範例 |
|------|------|------|------|
| `REPO_HTTP_URL` | 是 | Repo 網址 | `https://github.com/<user>/btc-death-spiral-watch` |
| `PAGES_BASE_URL` | 是 | GitHub Pages 網址 | `https://<user>.github.io/btc-death-spiral-watch` |
| `HASHTAGS` | 否 | 貼文 hashtags | `#bitcoin #crypto #risk` |
| `SYMBOL` | 否 | 交易對（預設 BTCUSDT）| `BTCUSDT` |

## 本地測試

```bash
# 安裝相依套件
pip install -r requirements.txt

# 複製環境變數範本並填入
cp .env.example .env
source .env  # 或使用 dotenv

# 抓取數據（寫入 data/latest.json + data/history.csv）
python scripts/collect.py

# 生成每日貼文（寫入 data/daily/ + posts/）
python scripts/make_post.py

# 發文到 X（需要有效的 X_BEARER_TOKEN）
python scripts/post_to_x.py
```

## Workflow 驗證

### 手動觸發

1. 到 Repo → Actions
2. 選擇 **Hourly Collect** 或 **Daily Post**
3. 點擊 **Run workflow** → 選擇 `main` 分支 → **Run**

### 驗證成功

執行成功後，應出現：

- `data/latest.json` — 最新一筆數據
- `data/history.csv` — 歷史紀錄（append-only）
- `data/daily/YYYY-MM-DD.json` — 當日審計 JSON（Daily Post）
- `posts/YYYY-MM-DD.txt` — 當日貼文全文（Daily Post）

## Workflows 說明

| Workflow | 觸發 | 用途 |
|----------|------|------|
| `hourly_collect.yml` | 每小時整點 / 手動 | 抓取 3 個指標，更新 latest.json + history.csv |
| `daily_post.yml` | UTC 01:00（TPE 09:00）/ 手動 | 生成貼文 → commit 審計檔 → 發到 X |
| `pr_checks.yml` | Pull Request | Compile check（不讀 secrets、不發文）|

## License

MIT
