"""
utils.py — 共用工具函式
BTC Death Spiral Watch
"""

import csv
import io
import json
import os
import time
from datetime import datetime, timezone, timedelta

import requests


# ---------------------------------------------------------------------------
# 環境變數讀取
# ---------------------------------------------------------------------------

def get_env(name: str, default: str | None = None, required: bool = False) -> str:
    """讀取環境變數，若 required=True 且缺失則 raise。"""
    val = os.environ.get(name, default)
    if required and not val:
        raise EnvironmentError(f"Missing required environment variable: {name}")
    return val


def get_symbol() -> str:
    return get_env("SYMBOL", "BTCUSDT")


def get_repo_http_url() -> str:
    return get_env("REPO_HTTP_URL", "")


def get_pages_base_url() -> str:
    return get_env("PAGES_BASE_URL", "")


def get_hashtags() -> str:
    return get_env("HASHTAGS", "")


# ---------------------------------------------------------------------------
# HTTP 抓取（含 timeout + 重試）
# ---------------------------------------------------------------------------

def fetch_json(url: str, timeout: int = 10, retries: int = 2) -> dict | list:
    """GET JSON with timeout and exponential-backoff retry."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(2 ** attempt)
    raise last_exc


# ---------------------------------------------------------------------------
# 時間工具
# ---------------------------------------------------------------------------

TPE_TZ = timezone(timedelta(hours=8))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ts_utc_hour_aligned(dt: datetime | None = None) -> str:
    """回傳對齊整點的 ISO8601 UTC 字串，例如 2026-02-05T01:00:00Z"""
    dt = dt or now_utc()
    aligned = dt.replace(minute=0, second=0, microsecond=0)
    return aligned.strftime("%Y-%m-%dT%H:%M:%SZ")


def tpe_date_str(dt: datetime | None = None) -> str:
    """取得 Asia/Taipei 當天日期 YYYY-MM-DD"""
    dt = dt or now_utc()
    tpe = dt.astimezone(TPE_TZ)
    return tpe.strftime("%Y-%m-%d")


def parse_ts(ts_str: str) -> datetime:
    """解析 ISO8601 UTC 字串為 datetime（aware）"""
    s = ts_str.replace("Z", "+00:00")
    return datetime.fromisoformat(s)


# ---------------------------------------------------------------------------
# CSV append + dedupe
# ---------------------------------------------------------------------------

HISTORY_HEADER = "ts_utc,price_usd,oi_usd,funding_rate\n"


def csv_append_dedup(filepath: str, row: dict) -> None:
    """Append a row to history.csv, deduplicating by ts_utc."""
    existing_ts = set()
    lines: list[str] = []

    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            reader = csv.DictReader(f)
            for r in reader:
                existing_ts.add(r["ts_utc"])
                lines.append(
                    f'{r["ts_utc"]},{r["price_usd"]},{r["oi_usd"]},{r["funding_rate"]}\n'
                )

    if row["ts_utc"] not in existing_ts:
        lines.append(
            f'{row["ts_utc"]},{row["price_usd"]},{row["oi_usd"]},{row["funding_rate"]}\n'
        )

    with open(filepath, "w") as f:
        f.write(HISTORY_HEADER)
        f.writelines(lines)


def read_history(filepath: str) -> list[dict]:
    """讀取 history.csv 回傳 list of dict。"""
    rows = []
    if not os.path.exists(filepath):
        return rows
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append({
                "ts_utc": r["ts_utc"],
                "price_usd": float(r["price_usd"]),
                "oi_usd": float(r["oi_usd"]),
                "funding_rate": float(r["funding_rate"]),
            })
    return rows


# ---------------------------------------------------------------------------
# 格式化數字
# ---------------------------------------------------------------------------

def fmt_price(v: float) -> str:
    """格式化價格，例如 73,223.12"""
    return f"{v:,.2f}"


def fmt_oi_b(v: float) -> str:
    """OI 轉為 B（十億），保留 2 位小數"""
    return f"{v / 1e9:.2f}"


def fmt_pct(v: float | None) -> str:
    """格式化百分比，None 則回傳 n/a"""
    if v is None:
        return "n/a"
    sign = "+" if v >= 0 else ""
    return f"{sign}{v:.2f}"


def fmt_funding(v: float) -> str:
    """格式化 funding rate"""
    return f"{v:.6f}"


# ---------------------------------------------------------------------------
# JSON 讀寫
# ---------------------------------------------------------------------------

def write_json(filepath: str, data: dict) -> None:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def read_json(filepath: str) -> dict:
    with open(filepath, "r") as f:
        return json.load(f)
