"""Minimal Sharesight API v3 client.

Sharesight has no MCP connector, so the portfolio-analyser agent shells out
to this script to pull holdings during a run.

Auth: Sharesight uses OAuth2. Access tokens expire after 30 minutes, so this
client mints a fresh one on every invocation from a long-lived refresh
token. It expects three environment variables:

  SHARESIGHT_CLIENT_ID
  SHARESIGHT_CLIENT_SECRET
  SHARESIGHT_REFRESH_TOKEN

See https://api.sharesight.com/api/v3/documentation for how to obtain
these (client credentials come from Sharesight support; the refresh token
comes from a one-time OAuth2 authorization-code exchange).

Usage:
    python sharesight_client.py portfolios
    python sharesight_client.py holdings <portfolio_id>
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://api.sharesight.com/api/v3"
TOKEN_URL = "https://api.sharesight.com/oauth2/token"


def _refresh_access_token() -> str:
    client_id = os.environ.get("SHARESIGHT_CLIENT_ID")
    client_secret = os.environ.get("SHARESIGHT_CLIENT_SECRET")
    refresh_token = os.environ.get("SHARESIGHT_REFRESH_TOKEN")
    missing = [
        name
        for name, value in (
            ("SHARESIGHT_CLIENT_ID", client_id),
            ("SHARESIGHT_CLIENT_SECRET", client_secret),
            ("SHARESIGHT_REFRESH_TOKEN", refresh_token),
        )
        if not value
    ]
    if missing:
        raise SystemExit(f"missing environment variables: {', '.join(missing)}")

    data = "&".join(
        f"{key}={urllib.parse.quote(value, safe='')}"
        for key, value in (
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("client_id", client_id),
            ("client_secret", client_secret),
        )
    ).encode()
    request = urllib.request.Request(TOKEN_URL, data=data, method="POST")
    try:
        with urllib.request.urlopen(request) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"token refresh failed: {error.code} {error.read().decode()}")

    return payload["access_token"]


def _get(path: str) -> dict:
    token = _refresh_access_token()
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
