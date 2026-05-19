/**
 * Cosine similarity search over the documents table using pgvector.
 * Uses raw SQL because Prisma does not support vector types natively.
 */

import { prisma } from "@/lib/db/prisma";
import { getEmbedding, toVectorLiteral } from "./embed";

export interface SearchResult {
  id: string;
  title: string;
  source: string;
  chunk: number;
  content: string;
  distance: number;
}

interface RawSearchRow {
  id: string;
  title: string;
  source: string;
  chunk: number;
  content: string;
  distance: number;
}

/**
 * Embeds `query` and returns the top-k most similar document chunks.
 * @param query   Natural language query string
 * @param topK    Number of results to return (default 5)
 */
export async function searchDocuments(
  query: string,
  topK = 5,
): Promise<SearchResult[]> {
  const embedding = await getEmbedding(query);
  const vectorLiteral = toVectorLiteral(embedding);

  // pgvector cosine distance operator: <=>
  const rows = await prisma.$queryRawUnsafe<RawSearchRow[]>(
    `SELECT id, title, source, chunk, content,
            (embedding <=> $1::vector) AS distance
     FROM documents
     WHERE embedding IS NOT NULL
     ORDER BY distance ASC
     LIMIT $2`,
    vectorLiteral,
    topK,
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    source: r.source,
    chunk: Number(r.chunk),
    content: r.content,
    distance: Number(r.distance),
  }));
}

/**
 * Formats search results into a concise context block
 * suitable for injecting into an LLM prompt.
 */
export function formatContextBlock(results: SearchResult[]): string {
  if (results.length === 0) return "";

  return results
    .map(
      (r, i) =>
        `[Source ${i + 1}: ${r.title}]\n${r.content}`,
    )
    .join("\n\n---\n\n");
}
