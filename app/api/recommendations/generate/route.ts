import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  generateRecommendation,
  MalformedLlmOutputError,
} from "@/lib/recommendations/generateRecommendation";
import {
  parseGenerateRecommendationRequest,
  RecommendationValidationError,
} from "@/lib/recommendations/schema";
import { LlmProviderError } from "@/lib/llm/errors";
import { clientKey, rateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";

// Paid LLM + RAG call — cap per caller to protect the LLM budget (brief §6).
const HOUR_MS = 60 * 60 * 1000;
const GENERATE_LIMIT = Number(process.env.RATE_LIMIT_GENERATE_PER_HOUR ?? 10);

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "generate"), GENERATE_LIMIT, HOUR_MS);
  if (!limit.ok) return tooManyRequestsResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const generationRequest = parseGenerateRecommendationRequest(body);
    const recommendation = await generateRecommendation(generationRequest);
    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error) {
    if (error instanceof RecommendationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof LlmProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.quota ? 429 : 503 });
    }
    if (error instanceof MalformedLlmOutputError) {
      return NextResponse.json(
        { error: "LLM output was malformed", detail: error.message },
        { status: 502 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[POST /api/recommendations/generate] database unreachable", error.message);
      return NextResponse.json(
        { error: "Database is unavailable — start it with `npm run db:up` and try again." },
        { status: 503 },
      );
    }

    console.error("[POST /api/recommendations/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 },
    );
  }
}

