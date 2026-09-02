import { NextRequest, NextResponse } from "next/server";
import { applicationsStore } from "@/lib/data/store";
import type { Application, ApplicationStatus } from "@/types";

export const dynamic = "force-dynamic";

const STATUSES: ApplicationStatus[] = ["saved", "applied", "interview", "offer", "rejected"];

export async function GET() {
  const list = applicationsStore.list();
  const counts = list.reduce<Record<ApplicationStatus, number>>(
    (acc, a) => {
      acc[a.status] += 1;
      return acc;
    },
    { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 },
  );
  return NextResponse.json({ applications: list, counts });
}

export async function POST(request: NextRequest) {
  let body: { jobId?: string; status?: ApplicationStatus } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.jobId || !STATUSES.includes(body.status as ApplicationStatus)) {
    return NextResponse.json({ error: "jobId and valid status required" }, { status: 400 });
  }
  const app: Application = {
    jobId: body.jobId,
    status: body.status as ApplicationStatus,
    updatedAt: new Date().toISOString(),
  };
  applicationsStore.upsert(app);
  return NextResponse.json({ application: app });
}