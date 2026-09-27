/**
 * One-off maintenance for ingested news signals (dataSource = "live"):
 *  1. decodes leftover HTML entities (Google News double-encodes `&nbsp;`),
 *  2. re-classifies type / severity / sentiment with the current classifier
 *     (Gemini → Groq → Ollama → keyword heuristics).
 *
 * Run: npm run signals:clean
 */
import { PrismaClient } from "@prisma/client";

import { classifyArticles } from "../lib/ingest/classify";

const prisma = new PrismaClient();

function cleanText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const rows = await prisma.signal.findMany({ where: { dataSource: "live" }, orderBy: { timestamp: "asc" } });
  if (rows.length === 0) {
    console.log("No live signals to clean.");
    return;
  }

  const cleaned = rows.map((row) => ({ ...row, title: cleanText(row.title), body: cleanText(row.body) }));
  const { method, classifications } = await classifyArticles(
    cleaned.map((row) => ({
      title: row.title,
      summary: row.body,
      link: row.url ?? row.id,
      guid: row.id,
      publishedAt: row.timestamp.toISOString(),
      publisher: row.publisher ?? "",
    })),
  );

  let typeChanges = 0;
  await prisma.$transaction(
    cleaned.map((row, i) => {
      const c = classifications[i]!;
      if (c.type !== row.type) typeChanges += 1;
      return prisma.signal.update({
        where: { id: row.id },
        data: { title: row.title, body: row.body, type: c.type, severity: c.severity, sentiment: c.sentiment },
      });
    }),
  );

  console.log(`Cleaned ${rows.length} live signals; classifier=${method}; ${typeChanges} type change(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
