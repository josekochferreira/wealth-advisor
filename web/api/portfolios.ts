import type { IncomingMessage, ServerResponse } from "http";
import {
  getSharesightAccessToken,
  getPortfolioPerformance,
  hasValidApiToken,
  mapWithConcurrency,
  SHARESIGHT_API_BASE,
} from "../lib/sharesight";
import { logPortfolioSnapshot } from "../lib/notion";

interface SharesightPortfolio {
  id: number | string;
  name: string;
  currency_code?: string;
  currency?: string;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!hasValidApiToken(req.headers["authorization"] as string | undefined)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    const token = await getSharesightAccessToken();
    const upstream = await fetch(`${SHARESIGHT_API_BASE}/portfolios.json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(await upstream.text());
      return;
    }
    const data = (await upstream.json()) as { portfolios: SharesightPortfolio[] };

    const logResults = await mapWithConcurrency(data.portfolios, 3, async (portfolio) => {
      try {
        const performance = await getPortfolioPerformance(token, portfolio.id);
        await logPortfolioSnapshot({
          portfolioId: String(portfolio.id),
          portfolioName: portfolio.name,
          currency: portfolio.currency_code ?? portfolio.currency ?? "",
          holdingsCount: performance.holdings?.length ?? 0,
          value: performance.value,
          costBase: performance.value - performance.capital_gain,
          capitalGain: performance.capital_gain,
          dividendGain: performance.payout_gain,
          currencyGain: performance.currency_gain,
          totalGain: performance.total_gain,
          totalGainPercent: performance.total_gain_percent,
          periodStart: performance.start_date,
          snapshotDate: performance.end_date,
          trigger: "on-demand",
        });
        return { portfolioId: portfolio.id, status: "logged" as const };
      } catch (err) {
        console.error(`snapshot logging failed for portfolio ${portfolio.id}`, err);
        return {
          portfolioId: portfolio.id,
          status: "error" as const,
          message: err instanceof Error ? err.message : "unknown error",
        };
      }
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ...data, _notion: logResults }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }));
  }
}
