import type { Job } from "@/types";
import { buildJob, fetchJson, normalizeJobTitle, parseSalary, stripHtml } from "./normalize";

interface RemoteOkRaw {
  id: number | string;
  slug?: string;
  date?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  url?: string;
  apply_url?: string;
  location?: string;
  salary_min?: string;
  salary_max?: string;
  currency?: string;
}

export async function scrapeRemoteOk(): Promise<Job[]> {
  const data = await fetchJson<RemoteOkRaw[]>("https://remoteok.com/api");
  if (!Array.isArray(data)) return [];
  const jobs: Job[] = [];
  for (const item of data) {
    if (!item?.position) continue;
    const salary = parseSalary(item.salary_min ?? item.salary_max ?? "");
    const slug = item.slug ?? String(item.id);
    jobs.push(
      buildJob({
        source: "remoteok",
        externalId: String(item.id),
        title: normalizeJobTitle(item.position),
        company: item.company ?? "Unknown",
        location: item.location ? [item.location] : ["Remote"],
        tags: item.tags ?? [],
        description: item.description ? stripHtml(item.description) : "",
        url: item.url ? `https://remoteok.com${item.url}` : `https://remoteok.com/remote-jobs/${slug}`,
        applyUrl: item.apply_url || item.url ? (item.url ? `https://remoteok.com${item.url}` : `https://remoteok.com/remote-jobs/${slug}`) : "",
        salaryMin: salary?.min ?? null,
        salaryMax: salary?.max ?? null,
        currency: item.currency ?? "USD",
        postedAt: item.date ?? null,
      }),
    );
  }
  return jobs;
}