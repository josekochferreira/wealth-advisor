# portfolio-analyser

Daily agent: reconcile Interactive Brokers (IBKR) with Sharesight and publish
a report. Runs either on demand or as a scheduled Routine that fires a fresh
session each day.

## Each run, do this

1. **Pull IBKR data** via the `Interactive_Brokers_IBKR` MCP connector:
   - `get_account_positions` — current holdings
   - `get_account_summary` / `get_account_balances` — cash and net worth
   - `get_pa_allocation` — asset/sector/region allocation
   - `get_pa_performance_all_periods` — TWR/return figures
2. **Pull Sharesight data** via `scripts/sharesight_client.py` (Sharesight
   has no MCP connector — this calls their REST API directly). The script
   mints a fresh 30-minute access token on every run from a long-lived
   refresh token, so it needs `SHARESIGHT_CLIENT_ID`,
   `SHARESIGHT_CLIENT_SECRET`, and `SHARESIGHT_REFRESH_TOKEN` set in the
   environment. If any are missing, or the call fails, note that in the
   report and skip the Sharesight section rather than failing the whole
   run. `api.sharesight.com` must also be allowed by this environment's
   network policy.
3. **Reconcile**: compare IBKR positions/quantities/cost basis against
   Sharesight's holdings for the same tickers. Flag mismatches (missing
   trades, quantity drift, corporate actions Sharesight hasn't applied yet).
4. **Summarize**: net worth, allocation vs. last report (if one exists in
   `reports/`), performance, and any reconciliation flags.
5. **Write** `reports/<YYYY-MM-DD>.md` with the above, commit, and push to
   the repo's default branch.

## Setup still needed before this can run unattended

- `SHARESIGHT_CLIENT_ID`, `SHARESIGHT_CLIENT_SECRET`, and
  `SHARESIGHT_REFRESH_TOKEN` configured as environment variables on the
  Claude Code environment this agent runs in (obtained via a one-time
  OAuth2 authorization-code exchange — see
  https://api.sharesight.com/api/v3/documentation).
- `api.sharesight.com` allowed by that environment's network policy.
- A daily Routine (cron trigger) pointed at this repo with a prompt that
  tells the session to follow this file.
