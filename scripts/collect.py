"""
collect.py — 每小時抓取 BTC 指標數據
BTC Death Spiral Watch
"""

import os
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
# 資料來源 URL
# ---------------------------------------------------------------------------

COINGECKO_PRICE_URL = (
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
)

def bybit_oi_url(symbol: str) -> str:
    return (
        f"https://api.bybit.com/v5/market/open-interest"
        f"?category=linear&symbol={symbol}&intervalTime=1h&limit=1"
    )

def bybit_ticker_url(symbol: str) -> str:
    return f"https://api.bybit.com/v5/market/tickers?category=linear&symbol={symbol}"


# ---------------------------------------------------------------------------
# 路徑
# ---------------------------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
LATEST_JSON = os.path.join(BASE_DIR, "data", "latest.json")
HISTORY_CSV = os.path.join(BASE_DIR, "data", "history.csv")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    symbol = get_symbol()

    # 1) 抓 BTC price
    price_data = fetch_json(COINGECKO_PRICE_URL)
    price_usd = float(price_data["bitcoin"]["usd"])

    # 2) 抓 Open Interest（Bybit, BTC 數量 × 價格 = USD）
    oi_data = fetch_json(bybit_oi_url(symbol))
    oi_btc = float(oi_data["result"]["list"][0]["openInterest"])
    oi_usd = oi_btc * price_usd

    # 3) 抓 Funding Rate（Bybit）
    ticker_data = fetch_json(bybit_ticker_url(symbol))
    funding_rate = float(ticker_data["result"]["list"][0]["fundingRate"])

    # 4) 對齊整點 ts
    ts = ts_utc_hour_aligned()

    row = {
        "ts_utc": ts,
        "price_usd": price_usd,
        "oi_usd": oi_usd,
        "funding_rate": funding_rate,
    }

    # 5) 寫 latest.json
    write_json(LATEST_JSON, row)

    # 6) append history.csv（dedupe by ts_utc）
    csv_append_dedup(HISTORY_CSV, row)

    print(f"[collect] OK — ts={ts}  price={price_usd}  oi={oi_usd}  funding={funding_rate}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[collect] FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
