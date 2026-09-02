import { NextRequest, NextResponse } from "next/server";
import { matchesStore } from "@/lib/data/store";
import { computeSkillGaps } from "@/lib/match/gaps";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let topN = 8;
  try {
    const body = (await request.json()) as { topN?: number };
    if (typeof body.topN === "number") topN = body.topN;
  } catch {
    // default
  }

  const matches = matchesStore.list();
  if (matches.length === 0) {
    return NextResponse.json({ error: "Run matches first" }, { status: 400 });
  }

  const gaps = computeSkillGaps(matches, topN);
  return NextResponse.json({ gaps, total: gaps.length });
}