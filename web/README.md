# portfolio-analyser API (Vercel)

Zero-framework Vercel serverless functions that expose Sharesight portfolio
data as a JSON API, callable on demand. No IBKR data here — see the
`agents/portfolio-analyser` folder one level up for the Claude-driven
agent that also reconciles against IBKR.

`GET /api/portfolios` also writes one row per portfolio into the Notion
database `my-portfolio-db`, with value, cost base, and gain breakdown
(capital/dividend/currency/total) since inception, plus the change since
the previous snapshot of that portfolio — a running history without
anything scheduled.

## Endpoints

- `GET /api/portfolios` — list of Sharesight portfolios; also logs a
  performance snapshot per portfolio to Notion
- `GET /api/portfolios/<id>/holdings` — holdings for one portfolio
  (pass-through only, not logged — `my-portfolio-db` is a portfolio-level
  schema, not per-holding)

Both require an `Authorization: Bearer <API_TOKEN>` header. `/api/portfolios`'s
response includes `_notion`, an array of `{ portfolioId, status: "logged" | "error", message? }`
per portfolio, so you can tell whether each Notion write succeeded without
checking Vercel's function logs.

## Required environment variables

Set these in the Vercel project's **Settings → Environment Variables**:

- `SHARESIGHT_CLIENT_ID`
- `SHARESIGHT_CLIENT_SECRET`
- `SHARESIGHT_REFRESH_TOKEN`
- `API_TOKEN` — a secret you choose yourself; required to call these
  endpoints, since they'd otherwise expose your portfolio data to anyone
  who finds the URL.
- `NOTION_API_KEY` — an internal integration token from
  [notion.so/my-integrations](https://www.notion.so/my-integrations).
  After creating the integration, open `my-portfolio-db` in Notion, click
  **"..." → Connections**, and add the integration — otherwise the API
  can't see the database and writes will fail with a 404/403.
- `NOTION_DATABASE_ID` — `3df12e89-b5f6-809c-9dc6-c388a2b562e7` (the
  `my-portfolio-db` database under Wealth & Taxes / Portfolio)

## Example

```
curl -H "Authorization: Bearer $API_TOKEN" https://<your-deployment>.vercel.app/api/portfolios
```
