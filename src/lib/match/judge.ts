import type { Job, MatchJudge, MatchResult, ResumeProfile } from "@/types";
import { completeJSON } from "@/lib/ai/groq";
import { inferSkillOverlap, scoreJob } from "./pre-score";

const MAX_JUDGED = 15;

function fallbackJudge(profile: ResumeProfile, job: Job, preScore: number): MatchJudge {
  const { matched, missing } = inferSkillOverlap(profile, job);
  const tier = preScore >= 70 ? "strong" : preScore >= 45 ? "possible" : "weak";
  return {
    matchedSkills: matched.slice(0, 12),
    missingSkills: missing.slice(0, 8),
    whyMatch:
      matched.length > 0
        ? `Deterministic estimate: your skills (${matched.slice(0, 4).join(", ")}) overlap with what this role asks for.`
        : `Deterministic estimate only — add skills and re-run to unlock an AI judgement.`,
    tailoredBullet: `Highlight your strongest overlapping skills: ${matched.slice(0, 4).join(", ") || "core experience"}.`,
    tier,
    score: preScore,
  };
}

interface JudgeResponse extends Omit<MatchJudge, "score"> {
  score: number;
}

export async function judgeMatches(
  profile: ResumeProfile,
  jobs: Job[],
): Promise<MatchResult[]> {
  const scored: Array<{ job: Job; preScore: number }> = jobs
    .map((job) => ({ job, preScore: scoreJob(profile, job) }))
    .sort((a, b) => b.preScore - a.preScore);

  const top = scored.slice(0, MAX_JUDGED);
  const judged = await Promise.all(
    top.map(async ({ job, preScore }) => {
      let judge: MatchJudge | null = null;
      if (process.env.GROQ_API_KEY) {
        judge = await llmJudge(profile, job, preScore);
      }
      if (!judge) judge = fallbackJudge(profile, job, preScore);
      return toResult(job, preScore, judge);
    }),
  );

  const results = [...judged];
  const rest = scored.slice(MAX_JUDGED);
  for (const { job, preScore } of rest) {
    const judge = fallbackJudge(profile, job, preScore);
    results.push(toResult(job, preScore, judge));
  }

  return results.sort((a, b) => b.score - a.score);
}

function toResult(job: Job, preScore: number, judge: MatchJudge): MatchResult {
  return {
    jobId: job.id,
    job,
    preScore,
    judge,
    score: judge.score ?? preScore,
    matchedAt: new Date().toISOString(),
  };
}

async function llmJudge(
  profile: ResumeProfile,
  job: Job,
  preScore: number,
): Promise<MatchJudge | null> {
  const system = `You are an expert technical recruiter scoring how well a candidate's resume fits a job posting. Return ONLY a JSON object with these exact keys:
- "score": number 0-100
- "matchedSkills": string[] (skills the candidate has that the job needs)
- "missingSkills": string[] (important job skills the candidate lacks, max 8, most important first)
- "whyMatch": string (2 sentences, specific, referencing concrete resume evidence)
- "tailoredBullet": string (a single resume bullet the candidate could add proving fit for THIS job)
- "tier": "strong" | "possible" | "weak"`;

  const user = `PRE-SCORE: ${preScore}/100 (deterministic estimate — you may adjust)\n\n=== CANDIDATE PROFILE ===\nSummary: ${profile.summary}\nSkills: ${profile.skills.join(", ")}\nYears experience: ${profile.yearsOfExperience}\nSeniority: ${profile.seniority ?? "n/a"}\nTarget role: ${profile.targetRole}\nPreferred location: ${profile.preferredLocation.join(", ") || "any"}\nProjects: ${profile.projects.map((p) => `${p.name}: ${p.description}`).join(" | ")}\n\n=== JOB ===\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location.join(", ")}\nTags: ${job.tags.join(", ")}\nSalary: ${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"}\nDescription:\n${job.description.slice(0, 2600)}`;

  const res = await completeJSON<JudgeResponse>({ system, user, maxTokens: 900 });
  if (!res) return null;
  return {
    score: clamp(res.score, preScore - 20),
    matchedSkills: Array.isArray(res.matchedSkills) ? res.matchedSkills.slice(0, 12) : [],
    missingSkills: Array.isArray(res.missingSkills) ? res.missingSkills.slice(0, 8) : [],
    whyMatch: typeof res.whyMatch === "string" ? res.whyMatch : "Fit reasons could not be generated.",
    tailoredBullet: typeof res.tailoredBullet === "string" ? res.tailoredBullet : "",
    tier: res.tier === "strong" || res.tier === "possible" || res.tier === "weak" ? res.tier : "possible",
  };
}

function clamp(v: unknown, lo: number): number {
  const n = typeof v === "number" ? v : lo;
  return Math.max(0, Math.min(100, Math.round(n)));
}