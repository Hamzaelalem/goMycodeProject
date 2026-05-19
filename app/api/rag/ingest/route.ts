import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { chunkText } from "@/lib/rag/chunk";
import { getEmbedding, toVectorLiteral } from "@/lib/rag/embed";

const DOCS_DIR = path.join(process.cwd(), "mock-data", "documents");

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Formats a DB recommendation row into a rich text chunk for embedding */
function formatRecommendationChunk(rec: {
  id: string;
  rank: number;
  title: string;
  region: string;
  sector: string;
  capitalUsd: number;
  irrPct: number;
  horizonYears: number;
  riskLevel: string;
  confidence: number;
  status: string;
  tags: string[];
  rationale: string;
  modelVersion: string;
}): string {
  return [
    `Recommendation #${rec.rank}: ${rec.title}`,
    `Region: ${rec.region} | Sector: ${rec.sector}`,
    `Status: ${rec.status} | Confidence: ${rec.confidence}/100`,
    `Capital: $${(rec.capitalUsd / 1_000_000).toFixed(0)}M | IRR: ${rec.irrPct}% | Horizon: ${rec.horizonYears} years | Risk: ${rec.riskLevel}`,
    `Tags: ${rec.tags.join(", ")}`,
    ``,
    `Rationale: ${rec.rationale}`,
    ``,
    `Model: ${rec.modelVersion} | ID: ${rec.id}`,
  ].join("\n");
}

async function insertChunk(
  title: string,
  source: string,
  chunkIndex: number,
  content: string,
): Promise<void> {
  const embedding = await getEmbedding(content);
  const vectorLiteral = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `INSERT INTO documents (id, title, source, chunk, content, embedding, "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())`,
    title,
    source,
    chunkIndex,
    content,
    vectorLiteral,
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  try {
    // Check if already ingested
    const existing = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      "SELECT COUNT(*) FROM documents",
    );
    const count = Number(existing[0]?.count ?? 0);

    if (count > 0 && !force) {
      return NextResponse.json({
        message: `Already ingested ${count} chunks. Use ?force=true to re-ingest.`,
        count,
      });
    }

    if (force) {
      await prisma.$executeRawUnsafe("DELETE FROM documents");
    }

    const results: Array<{ source: string; label: string; chunks: number }> = [];

    // ── 1. Ingest markdown documents ─────────────────────────────────────────
    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
      const title = titleFromFilename(file);
      const chunks = chunkText(content);

      for (let i = 0; i < chunks.length; i++) {
        await insertChunk(title, file, i, chunks[i]);
      }

      results.push({ source: "document", label: file, chunks: chunks.length });
      console.log(`[RAG ingest] doc: ${file} → ${chunks.length} chunks`);
    }

    // ── 2. Ingest recommendations from PostgreSQL ─────────────────────────────
    const recommendations = await prisma.recommendation.findMany({
      orderBy: { rank: "asc" },
    });

    for (const rec of recommendations) {
      const chunkText_ = formatRecommendationChunk(rec);
      // Each recommendation = 1 chunk (they're already concise)
      await insertChunk(
        `Recommendation: ${rec.title}`,
        `recommendation:${rec.id}`,
        0,
        chunkText_,
      );
      results.push({
        source: "recommendation",
        label: rec.title,
        chunks: 1,
      });
      console.log(`[RAG ingest] rec: ${rec.title}`);
    }

    const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);
    const docCount = results.filter((r) => r.source === "document").length;
    const recCount = results.filter((r) => r.source === "recommendation").length;

    return NextResponse.json({
      message: "Ingestion complete",
      documents: docCount,
      recommendations: recCount,
      totalChunks,
      results,
    });
  } catch (error) {
    console.error("[POST /api/rag/ingest]", error);
    return NextResponse.json(
      { error: "Ingestion failed", detail: String(error) },
      { status: 500 },
    );
  }
}
