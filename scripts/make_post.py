"""
make_post.py — 每日生成貼文內容與審計 JSON
BTC Death Spiral Watch
"""

import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.utils import (
    read_json,
    read_history,
    write_json,
    parse_ts,
    tpe_date_str,
    now_utc,
    get_repo_http_url,
    get_pages_base_url,
    get_hashtags,
    fmt_price,
    fmt_oi_b,
    fmt_pct,
    fmt_funding,
)

# ---------------------------------------------------------------------------
# 路徑
# ---------------------------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
LATEST_JSON = os.path.join(BASE_DIR, "data", "latest.json")
HISTORY_CSV = os.path.join(BASE_DIR, "data", "history.csv")
DAILY_DIR = os.path.join(BASE_DIR, "data", "daily")
POSTS_DIR = os.path.join(BASE_DIR, "posts")


# ---------------------------------------------------------------------------
# Verdict 規則
# ---------------------------------------------------------------------------

def compute_verdict(price_pct: float | None, oi_pct: float | None) -> str:
    if price_pct is None or oi_pct is None:
        return "Neutral"
    if price_pct < 0 and oi_pct < 0:
        return "Spiral risk ↑"
    if price_pct > 0 and oi_pct > 0:
        return "Spiral risk ↓"
    return "Neutral"


# ---------------------------------------------------------------------------
# 找 ref_24h
# ---------------------------------------------------------------------------

def find_ref_24h(history: list[dict], latest_ts_str: str) -> dict | None:
    """從 history 中找 ts_utc <= latest_ts - 24h 的最近一筆。"""
    latest_dt = parse_ts(latest_ts_str)
    threshold = latest_dt - timedelta(hours=24)

    candidates = [
        r for r in history if parse_ts(r["ts_utc"]) <= threshold
    ]
    if not candidates:
        return None
    # 取最接近 threshold 的那筆（最新的）
    candidates.sort(key=lambda r: parse_ts(r["ts_utc"]), reverse=True)
    return candidates[0]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # 1) 讀 latest
    latest = read_json(LATEST_JSON)

    # 2) 讀 history，找 ref_24h
    history = read_history(HISTORY_CSV)
    ref = find_ref_24h(history, latest["ts_utc"])

    # 3) 計算變動百分比
    price_pct = None
    oi_pct = None
    ref_data = None

    if ref:
        ref_data = {
            "ts_utc": ref["ts_utc"],
            "price_usd": ref["price_usd"],
            "oi_usd": ref["oi_usd"],
            "funding_rate": ref["funding_rate"],
        }
        if ref["price_usd"] != 0:
            price_pct = round(
                (latest["price_usd"] - ref["price_usd"]) / ref["price_usd"] * 100, 2
            )
        if ref["oi_usd"] != 0:
            oi_pct = round(
                (latest["oi_usd"] - ref["oi_usd"]) / ref["oi_usd"] * 100, 2
            )

    # 4) Verdict
    verdict = compute_verdict(price_pct, oi_pct)

    # 5) TPE 日期
    date_tpe = tpe_date_str()

    # 6) 寫 daily JSON
    daily = {
        "date_tpe": date_tpe,
        "latest": {
            "ts_utc": latest["ts_utc"],
            "price_usd": latest["price_usd"],
            "oi_usd": latest["oi_usd"],
            "funding_rate": latest["funding_rate"],
        },
        "ref_24h": ref_data,
        "price_change_24h_pct": price_pct,
        "oi_change_24h_pct": oi_pct,
        "verdict": verdict,
    }
    daily_path = os.path.join(DAILY_DIR, f"{date_tpe}.json")
    write_json(daily_path, daily)

    # 7) 生成貼文
    repo_url = get_repo_http_url()
    pages_url = get_pages_base_url()
    hashtags = get_hashtags()

    post_text = (
        f"BTC Death Spiral Watch (Daily) — {date_tpe} (TPE)\n"
        f"\n"
        f"Price: ${fmt_price(latest['price_usd'])} ({fmt_pct(price_pct)}% 24h)\n"
        f"OI: ${fmt_oi_b(latest['oi_usd'])}B ({fmt_pct(oi_pct)}% 24h)\n"
        f"Funding: {fmt_funding(latest['funding_rate'])}\n"
        f"Verdict: {verdict}\n"
        f"\n"
        f"Audit: {repo_url}/blob/main/data/daily/{date_tpe}.json\n"
        f"Dashboard: {pages_url}\n"
        f"{hashtags}"
    ).strip() + "\n"

    os.makedirs(POSTS_DIR, exist_ok=True)
    post_path = os.path.join(POSTS_DIR, f"{date_tpe}.txt")
    with open(post_path, "w") as f:
        f.write(post_text)

    print(f"[make_post] OK — date={date_tpe} verdict={verdict}")
    print(f"[make_post] daily → {daily_path}")
    print(f"[make_post] post  → {post_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[make_post] FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
