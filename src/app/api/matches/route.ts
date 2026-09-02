import { NextResponse } from "next/server";
import { jobsStore, matchesStore, profileStore } from "@/lib/data/store";
import { judgeMatches } from "@/lib/match/judge";

export const dynamic = "force-dynamic";

export async function GET() {
  const matches = matchesStore.list();
  return NextResponse.json({ matches, tiers: flatten(matchesStore.byTier()) });
}

export async function POST() {
  const profile = profileStore.get();
  if (!profile) {
    return NextResponse.json({ error: "Analyze a resume first" }, { status: 400 });
  }

  const jobs = jobsStore.list();
  if (jobs.length === 0) {
    return NextResponse.json(
      { error: "No jobs yet — scrape some jobs first" },
      { status: 400 },
    );
  }

  const matches = await judgeMatches(profile, jobs);
  matchesStore.replace(matches);

  return NextResponse.json({
    matches: matches.slice(0, 30),
    scored: matches.length,
    total: jobs.length,
    llm: Boolean(process.env.GROQ_API_KEY),
    tiers: flatten(matchesStore.byTier()),
  });
}

function flatten(tiers: ReturnType<typeof matchesStore.byTier>) {
  return {
    strong: tiers.strong.length,
    possible: tiers.possible.length,
    weak: tiers.weak.length,
  };
}