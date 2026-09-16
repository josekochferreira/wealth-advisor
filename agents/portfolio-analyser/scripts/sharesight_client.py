"""Minimal Sharesight API v3 client.

Sharesight has no MCP connector, so the portfolio-analyser agent shells out
to this script to pull holdings during a run.

Auth: Sharesight uses OAuth2. This client expects a already-issued access
token in the SHARESIGHT_ACCESS_TOKEN environment variable — see
https://api.sharesight.com/api/v3/documentation for how to obtain one.

Usage:
    python sharesight_client.py portfolios
    python sharesight_client.py holdings <portfolio_id>
"""

import json
import os
import sys
import urllib.request

API_BASE = "https://api.sharesight.com/api/v3"


def _get(path: str) -> dict:
    token = os.environ.get("SHARESIGHT_ACCESS_TOKEN")
    if not token:
        raise SystemExit("SHARESIGHT_ACCESS_TOKEN is not set")
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def portfolios() -> dict:
    return _get("/portfolios.json")


def holdings(portfolio_id: str) -> dict:
    return _get(f"/portfolios/{portfolio_id}/holdings.json")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    command = sys.argv[1]
    if command == "portfolios":
        print(json.dumps(portfolios(), indent=2))
    elif command == "holdings":
        if len(sys.argv) < 3:
            raise SystemExit("usage: sharesight_client.py holdings <portfolio_id>")
        print(json.dumps(holdings(sys.argv[2]), indent=2))
    else:
        raise SystemExit(f"unknown command: {command}")
