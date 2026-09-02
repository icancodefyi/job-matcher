import { NextRequest, NextResponse } from "next/server";
import { dbStats, jobsStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "200");
  const source = request.nextUrl.searchParams.get("source");
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase();

  let jobs = jobsStore.list();
  if (source) jobs = jobs.filter((j) => j.source === source);
  if (q) {
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  return NextResponse.json({
    jobs: jobs.slice(0, limit),
    stats: dbStats(),
  });
}