import { load as cheerioLoad } from "cheerio";
import type { Job } from "@/types";
import { buildJob, fetchText, normalizeJobTitle, stripHtml } from "./normalize";

const FEEDS = [
  "https://weworkremotely.com/categories/remote-full-stack-programming/jobs.rss",
  "https://weworkremotely.com/categories/remote-front-end-programming/jobs.rss",
  "https://weworkremotely.com/categories/remote-back-end-programming/jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin/jobs.rss",
  "https://weworkremotely.com/categories/remote-design/jobs.rss",
];

interface RssItem {
  title: string;
  link?: string;
  description?: string;
  pubDate: string | null;
  company?: string;
}

function parseRss(xml: string): RssItem[] {
  const $ = cheerioLoad(xml, { xmlMode: true });
  const items: RssItem[] = [];
  $("item").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").text().trim();
    if (!title) return;
    items.push({
      title,
      link: $el.find("link").text().trim(),
      description: $el.find("description").text(),
      pubDate: $el.find("pubDate").text().trim() || null,
    });
  });
  return items;
}

export async function scrapeWeWorkRemotely(): Promise<Job[]> {
  const jobs: Job[] = [];
  const errors: string[] = [];
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed);
      const items = parseRss(xml);
      for (const item of items) {
        const fullTitle = item.title;
        const parts = fullTitle.split(/\s+at\s+/i);
        const title = parts[0] ? normalizeJobTitle(parts[0]) : fullTitle;
        const company = parts.slice(1).join(" at ") || "Unknown";
        jobs.push(
          buildJob({
            source: "weworkremotely",
            externalId: item.link || fullTitle,
            title,
            company,
            location: ["Remote"],
            tags: [],
            description: item.description ? stripHtml(item.description) : "",
            url: item.link ?? "",
            applyUrl: item.link ?? "",
            postedAt: item.pubDate ?? null,
          }),
        );
      }
    } catch (err) {
      errors.push(String(err));
    }
  }
  if (jobs.length === 0 && errors.length) {
    throw new Error(errors[0]);
  }
  return jobs;
}