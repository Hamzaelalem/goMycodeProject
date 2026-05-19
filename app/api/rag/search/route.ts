import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { searchDocuments } from "@/lib/rag/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const topK = Number(searchParams.get("k") ?? "5");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  try {
    const results = await searchDocuments(query, topK);
    return NextResponse.json({ query, results });
  } catch (error) {
    console.error("[GET /api/rag/search]", error);
    return NextResponse.json(
      { error: "RAG search failed", detail: String(error) },
      { status: 500 },
    );
  }
}

/** Quick health check — returns document count */
export async function HEAD() {
  try {
    const count = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      "SELECT COUNT(*) FROM documents",
    );
    return new Response(null, {
      headers: { "X-Document-Count": String(count[0]?.count ?? 0) },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
