import type { Job } from "@/types";
import { buildJob, fetchJson, normalizeJobTitle, parseSalary, stripHtml } from "./normalize";

interface RemotiveRaw {
  id: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  tags?: string[];
  description?: string;
  salary?: string;
  publication_date?: string;
}

export async function scrapeRemotive(): Promise<Job[]> {
  const data = await fetchJson<{ jobs?: RemotiveRaw[] }>("https://remotive.com/api/remote-jobs");
  const items = data.jobs ?? [];
  const jobs: Job[] = [];
  for (const item of items) {
    if (!item?.title) continue;
    const salary = parseSalary(item.salary ?? "");
    const location = item.candidate_required_location
      ? item.candidate_required_location.split(",").map((l) => l.trim()).filter(Boolean)
      : [];
    const url = item.url ?? "";
    jobs.push(
      buildJob({
        source: "remotive",
        externalId: String(item.id),
        title: normalizeJobTitle(item.title),
        company: item.company_name ?? "Unknown",
        location: location.length ? location : ["Remote"],
        tags: item.tags ?? [],
        description: item.description ? stripHtml(item.description) : "",
        url,
        applyUrl: url,
        salaryMin: salary?.min ?? null,
        salaryMax: salary?.max ?? null,
        currency: "USD",
        postedAt: item.publication_date ?? null,
      }),
    );
  }
  return jobs;
}