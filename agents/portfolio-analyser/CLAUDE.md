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
   has no MCP connector — this calls their REST API directly). Requires
   `SHARESIGHT_ACCESS_TOKEN` to be set in the environment; if it's missing,
   note that in the report and skip the Sharesight section rather than
   failing the whole run.
3. **Reconcile**: compare IBKR positions/quantities/cost basis against
   Sharesight's holdings for the same tickers. Flag mismatches (missing
   trades, quantity drift, corporate actions Sharesight hasn't applied yet).
4. **Summarize**: net worth, allocation vs. last report (if one exists in
   `reports/`), performance, and any reconciliation flags.
5. **Write** `reports/<YYYY-MM-DD>.md` with the above, commit, and push to
   the repo's default branch.

## Setup still needed before this can run unattended

- A Sharesight API access token (`SHARESIGHT_ACCESS_TOKEN`) configured as an
  environment variable on the Claude Code environment this agent runs in.
  Sharesight uses OAuth2 — see
  https://api.sharesight.com/api/v3/documentation for obtaining a token.
- A daily Routine (cron trigger) pointed at this repo with a prompt that
  tells the session to follow this file.
