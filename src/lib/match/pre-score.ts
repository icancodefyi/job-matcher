import type { Job, ResumeProfile } from "@/types";
import { isRealSkill } from "@/lib/resume/skills";

const SENIORITY_ORDER: Record<string, number> = {
  junior: 0,
  mid: 1,
  senior: 2,
};

const STOPWORDS = new Set(
  "a an the and or of to in for on with at by from as is are was were be been being that this these those it its they their we our you your have has had do does did not no so".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .split(/[\s\-_.]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function skillTokens(skills: string[]): string[] {
  return skills.map((s) => s.toLowerCase().trim());
}

function matchCount(needleTokens: string[], haystackTokens: string[]): number {
  let hits = 0;
  for (const n of needleTokens) {
    if (haystackTokens.some((h) => h === n || h.startsWith(n) || n.startsWith(h))) hits++;
  }
  return hits;
}

export function scoreJob(profile: ResumeProfile, job: Job): number {
  if (!profile || !job) return 0;
  const profileSkills = skillTokens(profile.skills);

  const jobTagTokens = skillTokens(job.tags);
  const descTokens = tokenize(job.description.slice(0, 4000));

  let matched = 0;
  const matchedForReason: string[] = [];
  const allJobSkills = [...jobTagTokens, ...descTokens].slice(0, 60);
  for (const s of profileSkills) {
    if (matchCount([s], descTokens) > 0 || jobTagTokens.includes(s)) {
      matched++;
      matchedForReason.push(s);
    }
  }
  const skillCoverage = Math.min(1, matched / Math.max(1, allJobSkills.length));

  const titleTokens = tokenize(job.title);
  const targetTokens = tokenize(profile.targetRole);
  const titleHits = matchCount(targetTokens, titleTokens);
  const titleFit = Math.min(1, titleHits / Math.max(1, targetTokens.length));

  const descLower = job.description.toLowerCase();
  let expFit = 0.5;
  const jobExp = job.tags.find((t) => ["intern", "junior", "senior", "staff"].includes(t));
  const jobSeniority = jobExp && SENIORITY_ORDER[jobExp] !== undefined ? jobExp : null;
  if (profile.seniority && jobSeniority) {
    const diff = Math.abs(SENIORITY_ORDER[profile.seniority] - SENIORITY_ORDER[jobSeniority]);
    expFit = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.3;
  } else if (profile.seniority === "senior" && /staff|lead/i.test(job.title + " " + descLower)) {
    expFit = 0.85;
  } else if (profile.seniority === "junior" && /junior|intern|grad/i.test(job.title + " " + descLower)) {
    expFit = 0.95;
  }

  let locFit = 0.7;
  const profileLoc = profile.preferredLocation.map((l) => l.toLowerCase());
  const jobLoc = (job.location || []).map((l) => l.toLowerCase());
  if (jobLoc.some((l) => l.includes("remote")) && !profileLoc.includes("onsite")) {
    locFit = 1;
  } else if (profileLoc.some((l) => jobLoc.some((j) => j.includes(l) || l.includes(j)))) {
    locFit = 1;
  } else if (jobLoc.length === 0) {
    locFit = 0.75;
  }

  const score =
    skillCoverage * 45 +
    titleFit * 20 +
    expFit * 15 +
    locFit * 10 +
    (profile.skills.length > 4 ? 5 : 3) +
    Math.min(5, allJobSkills.length * 0.1);

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function inferSkillOverlap(profile: ResumeProfile, job: Job): {
  matched: string[];
  missing: string[];
} {
  const jobSkills: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...(job.tags ?? []), ...tokenize(job.description.slice(0, 3000))]) {
    const t = tag.toLowerCase();
    if (t.length < 3 || seen.has(t)) continue;
    seen.add(t);
    if (isRealSkill(t)) jobSkills.push(t);
  }

  const matched = profile.skills.filter((s) =>
    jobSkills.some((j) => j === s.toLowerCase() || s.toLowerCase().startsWith(j) || j.startsWith(s.toLowerCase())),
  );
  const matchedLower = new Set(matched.map((m) => m.toLowerCase()));
  const missing = jobSkills.filter((j) => !matchedLower.has(j)).slice(0, 10);

  return { matched, missing };
}