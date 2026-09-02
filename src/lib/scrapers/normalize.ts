import { load as cheerioLoad } from "cheerio";
import type { Job, JobSource } from "@/types";

export function stripHtml(html: string): string {
  if (!html) return "";
  const $ = cheerioLoad(html);
  return $.text().replace(/\s+/g, " ").trim();
}

export function hashId(parts: (string | number | null | undefined)[]): string {
  const input = parts.map((p) => String(p ?? "")).join("||");
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/#/g, "");
}

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.slice(0, 24);
}

export function buildJob(partial: {
  source: JobSource;
  title: string;
  company: string;
  location: string[];
  tags: string[];
  description: string;
  url: string;
  applyUrl?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  postedAt?: string | null;
  externalId?: string;
}): Job {
  const now = new Date().toISOString();
  const id = hashId([partial.source, partial.externalId, partial.company, partial.title, partial.url]);
  return {
    id,
    source: partial.source,
    title: partial.title.trim(),
    company: partial.company.trim() || "Unknown",
    location: partial.location,
    tags: normalizeTags(partial.tags),
    description: partial.description,
    url: partial.url,
    applyUrl: partial.applyUrl || partial.url,
    salaryMin: partial.salaryMin ?? null,
    salaryMax: partial.salaryMax ?? null,
    currency: partial.currency ?? "USD",
    postedAt: partial.postedAt ?? null,
    externalId: partial.externalId ? String(partial.externalId) : undefined,
    scrapedAt: now,
  };
}

export function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const j of jobs) {
    const key = hashId([j.company, j.title, j.location.join(",")]);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(j);
    }
  }
  return out;
}

export function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  return fetchText(url, timeoutMs).then((t) => JSON.parse(t) as T);
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 JobMatcher/0.1",
        accept: "application/json, text/xml, application/rss+xml, text/html;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function parseSalary(value: unknown): {
  min: number | null;
  max: number | null;
} | null {
  if (typeof value !== "string") return null;
  const nums = value.match(/\d+(\.\d+)?/g);
  if (!nums) return null;
  const parsed = nums.map((n) => Math.round(Number(n) * 1000));
  if (parsed.length === 1) return { min: parsed[0], max: parsed[0] };
  return { min: Math.min(...parsed), max: Math.max(...parsed) };
}

export function normalizeJobTitle(raw: string): string {
  return raw
    .replace(/\s*\(.*?\)/g, "")
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s*[-|]+\s*.*$/, "")
    .trim();
}