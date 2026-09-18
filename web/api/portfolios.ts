import type { IncomingMessage, ServerResponse } from "http";

const TOKEN_URL = "https://api.sharesight.com/oauth2/token";
const API_BASE = "https://api.sharesight.com/api/v3";

async function getAccessToken(): Promise<string> {
  const { SHARESIGHT_CLIENT_ID, SHARESIGHT_CLIENT_SECRET, SHARESIGHT_REFRESH_TOKEN } =
    process.env;
  const missing = [
    ["SHARESIGHT_CLIENT_ID", SHARESIGHT_CLIENT_ID],
    ["SHARESIGHT_CLIENT_SECRET", SHARESIGHT_CLIENT_SECRET],
    ["SHARESIGHT_REFRESH_TOKEN", SHARESIGHT_REFRESH_TOKEN],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`missing environment variables: ${missing.join(", ")}`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: SHARESIGHT_REFRESH_TOKEN!,
    client_id: SHARESIGHT_CLIENT_ID!,
    client_secret: SHARESIGHT_CLIENT_SECRET!,
  });
  const response = await fetch(TOKEN_URL, { method: "POST", body });
  if (!response.ok) {
    throw new Error(`token refresh failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expected = process.env.API_TOKEN;
  const auth = (req.headers["authorization"] as string) || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    const token = await getAccessToken();
    const upstream = await fetch(`${API_BASE}/portfolios.json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }));
  }
}
