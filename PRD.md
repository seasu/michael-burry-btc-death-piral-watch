# PRD.md — BTC Death Spiral Watch（精簡版）

## 1) 目標
在 X 上用「可審計、可重現」的方式，固定頻率發布 BTC 槓桿風險監測結果，建立可信度與流量，並可逐步變現（X 分潤/訂閱/導流）。

## 2) 核心價值
- **差異化**：不是搬運圖表；每篇貼文都能回溯到 repo 內的原始數據與判讀結果（audit trail）。
- **低風險**：不截圖、不爬站 UI，只用公開 API + 自產內容。
- **低維護**：每小時抓一次、每日一貼，元件少（GitHub Actions + Pages）。

## 3) 目標使用者與情境
- X 上的加密交易者/研究者：想快速判斷是否出現去槓桿螺旋訊號
- 轉推者/內容聚合者：需要可引用與可驗證的資料來源
- 作者（你）：希望穩定自動產出內容、累積可審計歷史、降低日常維運

## 4) 產品範圍（MVP）
### 4.1 指標（只做 3 個）
- BTC Price (USD)：CoinGecko
- BTCUSDT Open Interest (USD value)：Binance Futures
- BTCUSDT Funding rate：Binance Futures

### 4.2 判讀規則（MVP）
- Price↓ 且 OI↓ → Spiral risk ↑  
- Price↑ 且 OI↑ → Spiral risk ↓  
- 其他 → Neutral

### 4.3 內容輸出
- 每日 09:00（Asia/Taipei）自動發 X 貼文（固定模板）
- 每日生成可審計檔：
  - `data/daily/YYYY-MM-DD.json`
  - `posts/YYYY-MM-DD.txt`

### 4.4 展示（GitHub Pages）
- Latest 值
- 近 7 天 Price/OI/Funding 圖
- 最近 30 筆歷史表格

## 5) 系統架構（C’）
- GitHub Actions（排程）
  - **每小時**：抓數據 → 寫 `data/latest.json` + append `data/history.csv` → commit（有變更才 commit）
  - **每日**：生成 `daily.json` + `post.txt` → commit → 發到 X
- GitHub Pages（靜態站）：讀 repo 內 data 檔案顯示
- GitHub Secrets/Variables：集中管理設定（單一入口）

## 6) 設定與營運（單一入口）
Repo → Settings → Secrets and variables → Actions  
- Secrets：`X_BEARER_TOKEN`, `X_POST_URL`
- Variables：`REPO_HTTP_URL`, `PAGES_BASE_URL`, `HASHTAGS`, `SYMBOL`

## 7) 安全要求（必須）
- PR workflow 不可讀 secrets；不得使用 `pull_request_target`
- 發文 workflow 只允許 main + schedule/dispatch
- 發文前必須先 commit 審計檔（commit 後才發 X）
- workflow 權限最小化（只給 `contents: write`）

## 8) 驗收標準（MVP）
- `history.csv` 每天增加約 24 筆（允許偶發缺筆）
- 每日 09:00（TPE）成功發出貼文
- 每日貼文可對應到 `data/daily/YYYY-MM-DD.json`
- Pages 可正常展示 latest + 7d 圖 + 表格

## 9) 非目標（先不做）
- 清算（liquidations）、資金流（fund flows）、礦工指標
- 圖片貼文、自動生成圖卡
- 多幣種、多交易所聚合

## 10) 後續擴充（MVP 穩定後）
- 週報（每週一）— 從 `history.csv` 生成摘要 thread
- 加入更多指標（需評估來源穩定性與合法性）
- 發文模板 A/B（提升互動與留存）
