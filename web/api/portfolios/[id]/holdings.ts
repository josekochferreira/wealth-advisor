import type { IncomingMessage, ServerResponse } from "http";
import {
  getSharesightAccessToken,
  hasValidApiToken,
  SHARESIGHT_API_BASE,
} from "../../../lib/sharesight";
import { logSnapshotToNotion } from "../../../lib/notion";

interface RequestWithQuery extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

export default async function handler(req: RequestWithQuery, res: ServerResponse) {
  if (!hasValidApiToken(req.headers["authorization"] as string | undefined)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  const idParam = req.query?.id;
  const portfolioId = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!portfolioId) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "missing portfolio id" }));
    return;
  }

  try {
    const token = await getSharesightAccessToken();
    const upstream = await fetch(`${SHARESIGHT_API_BASE}/portfolios/${portfolioId}/holdings.json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const data = await upstream.json();

    let notionStatus: "logged" | "skipped" | "error" = "skipped";
    if (upstream.ok) {
      try {
        await logSnapshotToNotion(
          `Sharesight holdings (portfolio ${portfolioId}) – ${new Date().toISOString()}`,
          data
        );
        notionStatus = "logged";
      } catch (notionErr) {
        console.error("notion logging failed", notionErr);
        notionStatus = "error";
      }
    }

    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ...data, _notion: notionStatus }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }));
  }
}
