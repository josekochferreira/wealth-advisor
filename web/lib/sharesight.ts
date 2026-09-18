const TOKEN_URL = "https://api.sharesight.com/oauth2/token";
export const SHARESIGHT_API_BASE = "https://api.sharesight.com/api/v3";
// The v3 performance endpoint is closed beta; v2's is stable and well documented.
const SHARESIGHT_API_V2_BASE = "https://api.sharesight.com/api/v2";

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

export interface PortfolioPerformance {
  value: number;
  capital_gain: number;
  payout_gain: number;
  currency_gain: number;
  total_gain: number;
  total_gain_percent: number;
  start_date: string;
  end_date: string;
  holdings?: unknown[];
}

/** Inception-to-today performance for one portfolio (v2 endpoint, since v3's is closed beta). */
export async function getPortfolioPerformance(
  accessToken: string,
  portfolioId: string | number
): Promise<PortfolioPerformance> {
  const response = await fetch(
    `${SHARESIGHT_API_V2_BASE}/portfolios/${portfolioId}/performance.json`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
  );
  if (!response.ok) {
    throw new Error(`performance fetch failed for portfolio ${portfolioId}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as PortfolioPerformance;
}

/** Runs `fn` over `items` with at most `limit` in flight at once (Sharesight caps concurrent connections at 3). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
