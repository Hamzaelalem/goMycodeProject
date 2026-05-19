import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { IrrProjectionPoint, ScenarioCard, ScenarioInputs } from "@/types";

export async function GET() {
  try {
    const snap = await prisma.scenarioSnapshot.findUnique({ where: { key: "default" } });
    if (!snap) {
      return NextResponse.json({ error: "No scenario snapshot" }, { status: 404 });
    }
    return NextResponse.json({
      defaultInputs: snap.defaultInputs as unknown as ScenarioInputs,
      scenarioCards: snap.scenarioCards as unknown as ScenarioCard[],
      irrProjection: snap.irrProjection as unknown as IrrProjectionPoint[],
    });
  } catch (error) {
    console.error("[GET /api/scenarios]", error);
    return NextResponse.json({ error: "Failed to fetch scenarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      defaultInputs: ScenarioInputs;
      scenarioCards: ScenarioCard[];
      irrProjection: IrrProjectionPoint[];
    };
    if (!body.defaultInputs || !body.scenarioCards || !body.irrProjection) {
      return NextResponse.json({ error: "Invalid scenario bundle" }, { status: 400 });
    }
    const jsonInputs = body.defaultInputs as unknown as Prisma.InputJsonValue;
    const jsonCards = body.scenarioCards as unknown as Prisma.InputJsonValue;
    const jsonProj = body.irrProjection as unknown as Prisma.InputJsonValue;
    const row = await prisma.scenarioSnapshot.upsert({
      where: { key: "default" },
      create: {
        key: "default",
        defaultInputs: jsonInputs,
        scenarioCards: jsonCards,
        irrProjection: jsonProj,
      },
      update: {
        defaultInputs: jsonInputs,
        scenarioCards: jsonCards,
        irrProjection: jsonProj,
      },
    });
    return NextResponse.json(
      {
        defaultInputs: row.defaultInputs as unknown as ScenarioInputs,
        scenarioCards: row.scenarioCards as unknown as ScenarioCard[],
        irrProjection: row.irrProjection as unknown as IrrProjectionPoint[],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/scenarios]", error);
    return NextResponse.json({ error: "Failed to save scenario" }, { status: 500 });
  }
}
