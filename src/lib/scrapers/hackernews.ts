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

interface AlgoliaCommentHit {
  objectID: string;
  parent_id: string;
  story_id?: string;
  author?: string;
  comment_text?: string;
  created_at?: string;
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

async function findLatestHiringThread(): Promise<AlgoliaHit | undefined> {
  const candidates: AlgoliaHit[] = [];
  for (const query of ["Ask%20HN%3A%20Who%20is%20hiring", "%22who%20is%20hiring%22"]) {
    const search = await fetchJson<AlgoliaSearchResponse>(
      `https://hn.algolia.com/api/v1/search?query=${query}&restrictSearchableAttributes=title&tags=story&hitsPerPage=200`,
    );
    candidates.push(
      ...search.hits.filter((h) => /^ask hn: who is hiring\?/i.test(h.title?.trim() ?? "")),
    );
  }
  return candidates.sort(
    (a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""),
  )[0];
}

export async function scrapeHackerNews(): Promise<Job[]> {
  const latest = await findLatestHiringThread();
  if (!latest) return [];

  const comments = await fetchJson<{ hits: AlgoliaCommentHit[] }>(
    `https://hn.algolia.com/api/v1/search?tags=story_${latest.objectID},comment&hitsPerPage=1000`,
  );

  const threadUrl = "https://news.ycombinator.com/item?id=" + latest.objectID;
  const jobs: Job[] = [];
  for (const child of comments.hits.slice(0, MAX_JOBS)) {
    if (!child.comment_text || String(child.parent_id) !== latest.objectID) continue;
    const lines = splitLines(child.comment_text);
    const titleLine = lines.find((l) => l.length > 2 && !l.startsWith(">"));
    if (!titleLine) continue;
    const cleanTitle = titleLine.replace(/\s*\|.*/, "").trim();
    if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 80) continue;
    const firstUrl = child.comment_text.match(/https?:\/\/[^\s"'<>)\]]+/)?.[0] ?? "";
    const blurb = lines.slice(1).join(" · ");
    jobs.push(
      buildJob({
        source: "hackernews",
        externalId: child.objectID,
        title: cleanTitle,
        company: titleLine.includes("|") ? titleLine.split("|")[1].trim() || "HN" : "HN",
        location: /remote/i.test(child.comment_text) ? ["Remote"] : [],
        tags: [],
        description: blurb
          ? `${blurb}\n\n${stripHtml(child.comment_text).slice(0, 1200)}\n\nHN ${latest.title ?? "Who is hiring"}`
          : stripHtml(child.comment_text).slice(0, 1500),
        url: threadUrl,
        applyUrl: firstUrl || threadUrl,
        postedAt: child.created_at ?? null,
      }),
    );
  }
  return jobs;
}