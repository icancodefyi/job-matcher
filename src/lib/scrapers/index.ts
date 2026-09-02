import type { Job, JobSource, ScrapeSummary } from "@/types";
import { dedupeJobs } from "./normalize";
import { scrapeRemoteOk } from "./remoteok";
import { scrapeRemotive } from "./remotive";
import { scrapeHackerNews } from "./hackernews";

interface SourceResult {
  source: JobSource;
  ok: boolean;
  count: number;
  error?: string;
}

export async function scrapeSources(
  sources: JobSource[],
  opts: { limit?: number } = {},
): Promise<{ jobs: Job[]; summary: ScrapeSummary }> {
  const jobs: Job[] = [];
  const results: SourceResult[] = [];
  const limit = opts.limit ?? 400;

  const runners: Record<JobSource, () => Promise<Job[]>> = {
    remoteok: scrapeRemoteOk,
    remotive: scrapeRemotive,
    hackernews: scrapeHackerNews,
    greenhouse: async () => [],
  };

  const wanted = sources.filter((s) => Object.keys(runners).includes(s));
  if (wanted.length === 0) {
    return { jobs: [], summary: { fetched: 0, newJobs: 0, sources: [] } };
  }

  const settled = await Promise.allSettled(
    wanted.map((s) => runners[s]()),
  );

  settled.forEach((result, i) => {
    const source = wanted[i];
    if (result.status === "fulfilled") {
      const list = result.value.slice(0, limit);
      jobs.push(...list);
      results.push({ source, ok: list.length > 0, count: list.length });
    } else {
      results.push({
        source,
        ok: false,
        count: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  const unique = dedupeJobs(jobs);
  return {
    jobs: unique,
    summary: {
      fetched: unique.length,
      newJobs: unique.length,
      sources: results,
    },
  };
}