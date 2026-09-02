import { NextRequest, NextResponse } from "next/server";
import { findMatch, actionPlan, coverLetter, interviewQuestions, resumeBullet } from "@/lib/agent";
import { jobsStore, matchesStore, profileStore } from "@/lib/data/store";
import type { MatchResult } from "@/types";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["plan", "cover-letter", "rebullet", "interview"]);

export async function POST(request: NextRequest) {
  let body: { action?: string; jobId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: `action must be one of: ${[...ACTIONS].join(", ")}` }, { status: 400 });
  }

  const profile = profileStore.get();
  if (!profile) return NextResponse.json({ error: "Analyze a resume first" }, { status: 400 });

  const matches: MatchResult[] = matchesStore.list();

  if (action === "plan") {
    const out = await actionPlan(profile, matches);
    return NextResponse.json({ text: out.text, llm: out.llm });
  }

  const job = body.jobId ? jobsStore.getById(body.jobId) : undefined;
  if (!job) return NextResponse.json({ error: "jobId required and must exist" }, { status: 400 });

  const match = findMatch(matches, job.id);

  let out: { text: string; llm: boolean } = { text: "", llm: false };
  switch (action) {
    case "cover-letter":
      out = await coverLetter(profile, job, match);
      break;
    case "rebullet":
      out = await resumeBullet(profile, job, match);
      break;
    case "interview":
      out = await interviewQuestions(profile, job, match);
      break;
  }
  return NextResponse.json({ text: out.text, llm: out.llm });
}