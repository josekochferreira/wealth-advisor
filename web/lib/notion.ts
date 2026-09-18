const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function notionHeaders(): Record<string, string> {
  const { NOTION_API_KEY } = process.env;
  if (!NOTION_API_KEY) {
    throw new Error("missing NOTION_API_KEY");
  }
  return {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/** Looks up the most recent prior snapshot's Value for a portfolio, or null if there isn't one. */
async function getPreviousValue(databaseId: string, portfolioId: string): Promise<number | null> {
  const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: "Portfolio ID", rich_text: { equals: portfolioId } },
      sorts: [{ property: "Snapshot date", direction: "descending" }],
      page_size: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`notion query failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as {
    results: Array<{ properties: Record<string, { number?: number }> }>;
  };
  const value = data.results[0]?.properties?.["Value"]?.number;
  return typeof value === "number" ? value : null;
}

export interface PortfolioSnapshotEntry {
  portfolioId: string;
  portfolioName: string;
  currency: string;
  holdingsCount: number;
  value: number;
  costBase: number;
  capitalGain: number;
  dividendGain: number;
  currencyGain: number;
  totalGain: number;
  totalGainPercent: number;
  periodStart: string;
  snapshotDate: string;
  trigger: "scheduled" | "on-demand";
}

/** Writes one row into my-portfolio-db for a single portfolio's snapshot. */
export async function logPortfolioSnapshot(entry: PortfolioSnapshotEntry): Promise<void> {
  const { NOTION_DATABASE_ID } = process.env;
  if (!NOTION_DATABASE_ID) {
    throw new Error("missing NOTION_DATABASE_ID");
  }

  const previousValue = await getPreviousValue(NOTION_DATABASE_ID, entry.portfolioId);
  const valueChange = previousValue === null ? undefined : entry.value - previousValue;

  const numberProp = (value: number | undefined) =>
    value === undefined ? undefined : { number: value };

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        Name: { title: [{ text: { content: `${entry.portfolioName} – ${entry.snapshotDate}` } }] },
        Portfolio: { rich_text: [{ text: { content: entry.portfolioName } }] },
        "Portfolio ID": { rich_text: [{ text: { content: entry.portfolioId } }] },
        "Snapshot date": { date: { start: entry.snapshotDate } },
        "Period start": { date: { start: entry.periodStart } },
        Value: numberProp(entry.value),
        "Value change": numberProp(valueChange),
        "Cost base": numberProp(entry.costBase),
        "Capital gain": numberProp(entry.capitalGain),
        "Dividend gain": numberProp(entry.dividendGain),
        "Currency gain": numberProp(entry.currencyGain),
        "Total gain": numberProp(entry.totalGain),
        "Total gain %": numberProp(entry.totalGainPercent),
        Currency: { rich_text: [{ text: { content: entry.currency } }] },
        Holdings: numberProp(entry.holdingsCount),
        Trigger: { select: { name: entry.trigger } },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`notion write failed: ${response.status} ${await response.text()}`);
  }
}
