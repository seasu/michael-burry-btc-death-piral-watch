"""
post_to_x.py — 將當日貼文發到 X (Twitter)
BTC Death Spiral Watch
"""

import json
import os
import sys
import time

import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.utils import get_env, tpe_date_str

# ---------------------------------------------------------------------------
# 路徑
# ---------------------------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
POSTS_DIR = os.path.join(BASE_DIR, "posts")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def post_tweet(text: str, bearer_token: str, post_url: str) -> requests.Response:
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
    }
    payload = json.dumps({"text": text})
    resp = requests.post(post_url, headers=headers, data=payload, timeout=15)
    return resp


def main() -> None:
    bearer_token = get_env("X_BEARER_TOKEN", required=True)
    post_url = get_env("X_POST_URL", "https://api.x.com/2/tweets")

    date_tpe = tpe_date_str()
    post_path = os.path.join(POSTS_DIR, f"{date_tpe}.txt")

    if not os.path.exists(post_path):
        print(f"[post_to_x] Post file not found: {post_path}", file=sys.stderr)
        sys.exit(1)

    with open(post_path, "r") as f:
        text = f.read().strip()

    # 嘗試發文（最多 2 次）
    last_resp = None
    for attempt in range(2):
        resp = post_tweet(text, bearer_token, post_url)
        last_resp = resp
        if resp.status_code in (200, 201):
            print(f"[post_to_x] OK — status={resp.status_code}")
            return
        print(f"[post_to_x] Attempt {attempt + 1} failed: {resp.status_code} {resp.text}")
        if attempt < 1:
            time.sleep(3)

    # 全部失敗 → 寫 error.txt
    error_path = os.path.join(POSTS_DIR, f"{date_tpe}.error.txt")
    with open(error_path, "w") as f:
        f.write(f"HTTP {last_resp.status_code}\n{last_resp.text}\n")

    print(f"[post_to_x] FAILED after retries. Error saved to {error_path}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"[post_to_x] FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
