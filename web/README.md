# portfolio-analyser API (Vercel)

Zero-framework Vercel serverless functions that expose Sharesight portfolio
data as a JSON API, callable on demand. No IBKR data here — see the
`agents/portfolio-analyser` folder one level up for the Claude-driven
agent that also reconciles against IBKR.

Every successful call also writes a snapshot page (JSON as code blocks)
into the Notion database `claude_skills_db`, for a running history without
needing anything scheduled.

## Endpoints

- `GET /api/portfolios` — list of Sharesight portfolios
- `GET /api/portfolios/<id>/holdings` — holdings for one portfolio

Both require an `Authorization: Bearer <API_TOKEN>` header. The response
includes `_notion: "logged" | "skipped" | "error"` so you can tell whether
the Notion write succeeded without checking Vercel's function logs.

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
  After creating the integration, open `claude_skills_db` in Notion, click
  **"..." → Connections**, and add the integration — otherwise the API
  can't see the database and writes will fail with a 404/403.
- `NOTION_DATABASE_ID` — `3de12e89-b5f6-8067-af71-f34f59349118` (the
  `claude_skills_db` database under JKF / Quick Notes + Sandbox / Claude
  Skills Agents Backlog)

## Example

```
curl -H "Authorization: Bearer $API_TOKEN" https://<your-deployment>.vercel.app/api/portfolios
```
