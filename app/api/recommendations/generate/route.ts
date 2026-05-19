import { NextRequest, NextResponse } from "next/server";

import {
  generateRecommendation,
  MalformedLlmOutputError,
} from "@/lib/recommendations/generateRecommendation";
import {
  parseGenerateRecommendationRequest,
  RecommendationValidationError,
} from "@/lib/recommendations/schema";

export async function POST(req: NextRequest) {
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
    if (error instanceof MalformedLlmOutputError) {
      return NextResponse.json(
        { error: "LLM output was malformed", detail: error.message },
        { status: 502 },
      );
    }

    console.error("[POST /api/recommendations/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 },
    );
  }
}

