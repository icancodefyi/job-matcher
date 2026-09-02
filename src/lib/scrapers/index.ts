import type { Job, JobSource, ScrapeSummary } from "@/types";
import { dedupeJobs } from "./normalize";
import { scrapeRemoteOk } from "./remoteok";
import { scrapeWeWorkRemotely } from "./weworkremotely";
import { scrapeHackerNews } from "./hackernews";
import { seedJobs } from "./seed";

interface SourceResult {
  source: JobSource;
  ok: boolean;
  count: number;
  error?: string;
}

export async function scrapeSources(
  sources: JobSource[],
  opts: { includeSeed?: boolean; limit?: number } = {},
): Promise<{ jobs: Job[]; summary: ScrapeSummary }> {
  const jobs: Job[] = [];
  const results: SourceResult[] = [];
  const limit = opts.limit ?? 400;

  const runners: Record<JobSource, () => Promise<Job[]>> = {
    remoteok: scrapeRemoteOk,
    weworkremotely: scrapeWeWorkRemotely,
    hackernews: scrapeHackerNews,
    greenhouse: async () => [],
    seed: async () => seedJobs(),
  };

  const wanted = sources.filter((s) => Object.keys(runners).includes(s));
  if (wanted.length === 0) wanted.push("seed");

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

  if (opts.includeSeed && !results.some((r) => r.source === "seed" && r.count > 0)) {
    const seeds = seedJobs();
    jobs.push(...seeds);
    results.push({ source: "seed", ok: true, count: seeds.length });
  }

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