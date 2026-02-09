"""
collect.py — 每小時抓取 BTC 指標數據
BTC Death Spiral Watch
"""

import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.utils import (
    get_symbol,
    fetch_json,
    ts_utc_hour_aligned,
    csv_append_dedup,
    write_json,
)

# ---------------------------------------------------------------------------
# 資料來源 URL（全部使用 CoinGecko，已驗證可從 GitHub Actions 存取）
# ---------------------------------------------------------------------------

COINGECKO_PRICE_URL = (
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
)

COINGECKO_DERIVATIVES_URL = (
    "https://api.coingecko.com/api/v3/derivatives"
)

# ---------------------------------------------------------------------------
# 路徑
# ---------------------------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
LATEST_JSON = os.path.join(BASE_DIR, "data", "latest.json")
HISTORY_CSV = os.path.join(BASE_DIR, "data", "history.csv")


# ---------------------------------------------------------------------------
# 從 derivatives 列表中找到 BTC 永續合約
# ---------------------------------------------------------------------------

def find_btc_perpetual(derivs: list, symbol: str) -> dict:
    """從 CoinGecko derivatives 中找 BTC perpetual ticker。"""
    # 正規化 symbol（例如 BTCUSDT → btcusdt）
    norm = re.sub(r"[^a-zA-Z0-9]", "", symbol).lower()

    for d in derivs:
        if d.get("contract_type") != "perpetual":
            continue
        raw_sym = re.sub(r"[^a-zA-Z0-9]", "", d.get("symbol", "")).lower()
        if raw_sym == norm:
            return d

    raise ValueError(f"Could not find {symbol} perpetual in CoinGecko derivatives data")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    symbol = get_symbol()

    # 1) 抓 BTC price
    price_data = fetch_json(COINGECKO_PRICE_URL)
    price_usd = float(price_data["bitcoin"]["usd"])

    # 2) 抓 derivatives（OI + Funding Rate）
    derivs = fetch_json(COINGECKO_DERIVATIVES_URL)
    ticker = find_btc_perpetual(derivs, symbol)

    oi_usd = float(ticker["open_interest"])
    # CoinGecko funding_rate 以百分比表示（0.01 = 0.01%），轉為小數
    funding_rate = float(ticker["funding_rate"]) / 100.0

    # 3) 對齊整點 ts
    ts = ts_utc_hour_aligned()

    row = {
        "ts_utc": ts,
        "price_usd": price_usd,
        "oi_usd": oi_usd,
        "funding_rate": funding_rate,
    }

    # 4) 寫 latest.json
    write_json(LATEST_JSON, row)

    # 5) append history.csv（dedupe by ts_utc）
    csv_append_dedup(HISTORY_CSV, row)

    print(f"[collect] OK — ts={ts}  price={price_usd}  oi={oi_usd}  funding={funding_rate}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[collect] FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
