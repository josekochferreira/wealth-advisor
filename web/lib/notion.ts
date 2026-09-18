const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const MAX_RICH_TEXT_CHARS = 1900; // Notion's actual limit is 2000; leave margin.

function chunkText(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

/**
 * Writes one page per call into claude_skills_db, storing the given data as
 * JSON code blocks in the page body. Notion limits a single page-create
 * request to 100 children blocks, so very large payloads would need
 * pagination this doesn't implement — fine for portfolio-sized JSON.
 */
export async function logSnapshotToNotion(title: string, data: unknown): Promise<void> {
  const { NOTION_API_KEY, NOTION_DATABASE_ID } = process.env;
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    throw new Error("missing NOTION_API_KEY or NOTION_DATABASE_ID");
  }

  const json = JSON.stringify(data, null, 2);
  const codeBlocks = chunkText(json, MAX_RICH_TEXT_CHARS).map((part) => ({
    object: "block",
    type: "code",
    code: {
      language: "json",
      rich_text: [{ type: "text", text: { content: part } }],
    },
  }));

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Date: { date: { start: new Date().toISOString() } },
      },
      children: codeBlocks,
    }),
  });

  if (!response.ok) {
    throw new Error(`notion write failed: ${response.status} ${await response.text()}`);
  }
}
