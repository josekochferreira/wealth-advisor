const TOKEN_URL = "https://api.sharesight.com/oauth2/token";
export const SHARESIGHT_API_BASE = "https://api.sharesight.com/api/v3";

export async function getSharesightAccessToken(): Promise<string> {
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

export function hasValidApiToken(authorizationHeader: string | undefined): boolean {
  const expected = process.env.API_TOKEN;
  return Boolean(expected) && authorizationHeader === `Bearer ${expected}`;
}
