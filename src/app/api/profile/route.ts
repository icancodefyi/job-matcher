import { NextRequest, NextResponse } from "next/server";
import { profileStore } from "@/lib/data/store";
import type { ResumeProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  let body: Partial<ResumeProfile> = {};
  try {
    body = (await request.json()) as Partial<ResumeProfile>;
  } catch {
    body = {};
  }

  const existing = profileStore.get();
  if (!existing) {
    return NextResponse.json({ error: "Analyze a resume first before editing" }, { status: 400 });
  }

  const updated: ResumeProfile = {
    ...existing,
    ...body,
    id: existing.id,
    sourceText: existing.sourceText,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    skills: Array.isArray(body.skills) ? body.skills.map((s) => String(s).trim()).filter(Boolean) : existing.skills,
    languages: body.languages ? body.languages.map((l) => String(l).trim()).filter(Boolean) : existing.languages,
    certifications: body.certifications
      ? body.certifications.map((c) => String(c).trim()).filter(Boolean)
      : existing.certifications,
    workExperience: Array.isArray(body.workExperience) ? body.workExperience : existing.workExperience,
    projects: Array.isArray(body.projects) ? body.projects : existing.projects,
    llmFailed: body.llmFailed ?? existing.llmFailed,
  };

  profileStore.save(updated);
  return NextResponse.json({ profile: updated });
}
