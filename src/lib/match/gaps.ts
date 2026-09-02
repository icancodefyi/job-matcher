import type { MatchResult, SkillGap } from "@/types";
import { resourcesForSkill } from "./resources";
import { GENERIC_JOB_TERMS, isRealSkill } from "@/lib/resume/skills";

function isGapSkill(raw: string): boolean {
  const skill = raw.trim();
  if (!skill || skill.length > 42) return false;
  const key = skill.toLowerCase();
  if (GENERIC_JOB_TERMS.has(key) || GENERIC_JOB_TERMS.has(skill)) return false;
  if (key.includes(" ")) return true;
  return isRealSkill(key);
}

export function computeSkillGaps(matches: MatchResult[], topN = 8): SkillGap[] {
  const counts = new Map<string, { count: number; jobs: string[] }>();
  const sourceOf = new Map<string, string>();

  for (const m of matches.slice(0, topN)) {
    const missing = m.judge?.missingSkills ?? [];
    for (const raw of missing) {
      if (!isGapSkill(raw)) continue;
      const key = raw.trim().toLowerCase();
      const entry = counts.get(key) ?? { count: 0, jobs: [] };
      entry.count += 1;
      if (!entry.jobs.includes(m.jobId)) entry.jobs.push(m.jobId);
      counts.set(key, entry);
      if (!sourceOf.has(key)) sourceOf.set(key, raw.trim());
    }
  }

  const all = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxCount = Math.max(1, all[0]?.[1].count ?? 1);

  return all.map(([key, { count, jobs }]) => {
    const display = sourceOf.get(key) ?? key;
    return {
      skill: display,
      jobIds: jobs,
      jobsCount: count,
      importance: Math.round((count / maxCount) * 100) / 100,
      resources: resourcesForSkill(display),
    };
  });
}