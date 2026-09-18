# portfolio-analyser API (Vercel)

Zero-framework Vercel serverless functions that expose Sharesight portfolio
data as a JSON API, callable on demand. No IBKR data here — see the
`agents/portfolio-analyser` folder one level up for the Claude-driven
agent that also reconciles against IBKR.

## Endpoints

- `GET /api/portfolios` — list of Sharesight portfolios
- `GET /api/portfolios/<id>/holdings` — holdings for one portfolio

Both require an `Authorization: Bearer <API_TOKEN>` header.

## Required environment variables

Set these in the Vercel project's **Settings → Environment Variables**:

- `SHARESIGHT_CLIENT_ID`
- `SHARESIGHT_CLIENT_SECRET`
- `SHARESIGHT_REFRESH_TOKEN`
- `API_TOKEN` — a secret you choose yourself; required to call these
  endpoints, since they'd otherwise expose your portfolio data to anyone
  who finds the URL.

## Example

```
curl -H "Authorization: Bearer $API_TOKEN" https://<your-deployment>.vercel.app/api/portfolios
```
