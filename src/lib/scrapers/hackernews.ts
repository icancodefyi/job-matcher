import { load as cheerioLoad } from "cheerio";
import type { Job } from "@/types";
import { buildJob, fetchJson, stripHtml } from "./normalize";

interface AlgoliaHit {
  objectID: string;
  title?: string;
  created_at?: string;
}

interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
}

interface AlgoliaItemText {
  text?: string;
}

interface AlgoliaItem {
  objectID: string;
  title?: string;
  children?: AlgoliaItemText[];
}

const MAX_JOBS = 150;

function splitLines(html: string): string[] {
  const $ = cheerioLoad(html);
  $("code").remove();
  const text = $.text();
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function scrapeHackerNews(): Promise<Job[]> {
  const search = await fetchJson<AlgoliaSearchResponse>(
    "https://hn.algolia.com/api/v1/search?query=%22who%20is%20hiring%22%20monthly&tags=story&hitsPerPage=5&numericFilters=points%3E10",
  );
  const latest = search.hits
    .filter((h) => h.title?.toLowerCase().includes("who is hiring"))
    .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""))[0];

  if (!latest) return [];

  const detail = await fetchJson<AlgoliaItem>(
    `https://hn.algolia.com/api/v1/items/${latest.objectID}`,
  );
  const comments = detail.children ?? [];

  const jobs: Job[] = [];
  for (const child of comments.slice(0, MAX_JOBS)) {
    if (!child.text) continue;
    const lines = splitLines(child.text);
    const titleLine = lines.find((l) => /(^|[|])/i.test(l) || l.length > 1);
    if (!titleLine || titleLine.startsWith(">")) continue;
    const cleanTitle = titleLine.replace(/\s*\|.*/, "").trim();
    if (!cleanTitle || cleanTitle.length > 80) continue;
    const firstUrl = child.text.match(/https?:\/\/[^\s"'<>)\]]+/)?.[0] ?? "";
    const blurb = lines.slice(1).join(" · ");
    jobs.push(
      buildJob({
        source: "hackernews",
        externalId: `${latest.objectID}-${jobs.length}`,
        title: cleanTitle,
        company: titleLine.includes("|") ? titleLine.split("|")[1].trim() || "HN" : "HN",
        location: /remote/i.test(child.text) ? ["Remote"] : [],
        tags: [],
        description: blurb ? `${blurb}\n\nHN ${latest.title ?? "Who is hiring"}` : stripHtml(child.text).slice(0, 1500),
        url: "https://news.ycombinator.com/item?id=" + latest.objectID,
        applyUrl: firstUrl || "/applications",
        postedAt: latest.created_at ?? null,
      }),
    );
  }
  return jobs;
}