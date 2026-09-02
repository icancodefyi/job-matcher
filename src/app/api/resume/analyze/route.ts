import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/resume/analyze";
import { profileStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { resumeText?: string; name?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const resumeText = (body.resumeText ?? "").trim();
  if (!resumeText) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }
  if (resumeText.length > 30000) {
    return NextResponse.json({ error: "resumeText too large (max 30k chars)" }, { status: 413 });
  }

  const profile = await analyzeResume(resumeText, body.name);
  profileStore.save(profile);

  return NextResponse.json({ profile });
}