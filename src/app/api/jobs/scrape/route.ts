import { NextRequest, NextResponse } from "next/server";
import { scrapeSources } from "@/lib/scrapers";
import { jobsStore } from "@/lib/data/store";
import type { JobScrapeRequest, JobSource } from "@/types";

export const dynamic = "force-dynamic";

const VALID_SOURCES: JobSource[] = [
  "remoteok",
  "remotive",
  "hackernews",
];

export async function POST(request: NextRequest) {
  let body: JobScrapeRequest = {};
  try {
    body = (await request.json()) as JobScrapeRequest;
  } catch {
    body = {};
  }

  const sources = (body.sources ?? ["remoteok", "remotive", "hackernews"])
    .filter((s): s is JobSource => VALID_SOURCES.includes(s as JobSource))
    .slice(0, 3) as JobSource[];

  const { jobs, summary } = await scrapeSources(sources, {
    limit: body.limit ?? 300,
  });

  const stored = jobsStore.addMany(jobs);

  return NextResponse.json({
    summary: { ...summary, newJobs: stored.added, totalJobs: stored.total },
    jobs: jobs.slice(0, body.limit ?? 50),
  });
}