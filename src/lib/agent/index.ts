import type { Job, MatchResult, ResumeProfile } from "@/types";
import { completeText, isAIEnabled } from "@/lib/ai/groq";

function findMatch(matches: MatchResult[], jobId: string): MatchResult | undefined {
  return matches.find((m) => m.jobId === jobId);
}

export async function coverLetter(
  profile: ResumeProfile,
  job: Job,
  match?: MatchResult,
): Promise<{ text: string; llm: boolean }> {
  if (!isAIEnabled())
    return {
      llm: false,
      text: `Add a GROQ_API_KEY to generate a tailored cover letter. Meanwhile — lead with the overlap that matters for this role: ${match?.judge?.matchedSkills.slice(0, 3).join(", ") || job.tags.slice(0, 3).join(", ")}.`,
    };

  const text = await completeText({
    system:
      "You write concise, specific, confident cover letters (150-200 words). Use the candidate's actual evidence. No cliches, no 'I am writing to apply'. Reference the specific company and role.",
    user: `ROLE: ${job.title} at ${job.company}\nJOB TAGS: ${job.tags.join(", ")}\nJOB DESCRIPTION: ${job.description.slice(0, 1800)}\n\nCANDIDATE:\nSummary: ${profile.summary}\nSkills: ${profile.skills.join(", ")}\nProjects: ${profile.projects.map((p) => `${p.name}: ${p.description}`).join("; ")}\n\nMatch notes: ${match?.judge?.whyMatch ?? "n/a"}`,
    maxTokens: 500,
  });
  return { llm: true, text: text ?? "Could not generate a cover letter right now." };
}

export async function resumeBullet(
  profile: ResumeProfile,
  job: Job,
  match?: MatchResult,
): Promise<{ text: string; llm: boolean }> {
  const focus = match?.judge?.tailoredBullet || "";
  if (!isAIEnabled())
    return {
      llm: false,
      text: `Add a GROQ_API_KEY to generate a tailored bullet. Deterministic suggestion: ${focus || `emphasize ${job.tags.slice(0, 4).join(", ")} in your most relevant project.`}`,
    };

  const text = await completeText({
    system:
      "Rewrite ONE resume bullet for the candidate that maximizes fit to the job. Always start with an action verb, include a metric or outcome where plausible, and stay truthful to the candidate's actual experience. Return only the bullet (max 35 words).",
    user: `JOB: ${job.title} (${job.company}) — needs: ${job.tags.join(", ")}\n\nCandidate skills: ${profile.skills.join(", ")}\nCandidate projects: ${profile.projects.map((p) => `${p.name}: ${p.description}`).join("; ")}\n\nHint from matcher: ${focus}`,
    maxTokens: 200,
  });
  return { llm: true, text: text ?? "Could not generate a bullet right now." };
}

export async function interviewQuestions(
  profile: ResumeProfile,
  job: Job,
  match?: MatchResult,
): Promise<{ text: string; llm: boolean }> {
  if (!isAIEnabled())
    return {
      llm: false,
      text: "Add a GROQ_API_KEY to generate interview questions. Focus energy on the skills you're missing for this role.",
    };

  const text = await completeText({
    system:
      "Generate the 5 most likely technical + behavioral interview questions for this role, then a 1-line answer strategy for each referencing the candidate's actual experience. Use markdown with numbered questions and bold keywords.",
    user: `ROLE: ${job.title} at ${job.company}\nTAGS: ${job.tags.join(", ")}\nDESCRIPTION: ${job.description.slice(0, 1800)}\n\nCandidate skills: ${profile.skills.join(", ")}\nMissing skills: ${match?.judge?.missingSkills.join(", ") || "n/a"}`,
    maxTokens: 800,
  });
  return { llm: true, text: text ?? "Could not generate questions right now." };
}

export async function actionPlan(
  profile: ResumeProfile,
  matches: MatchResult[],
): Promise<{ text: string; llm: boolean }> {
  const top = matches.slice(0, 5).map(
    (m) =>
      `- ${m.job.title} @ ${m.job.company} (score ${m.score}, gaps: ${m.judge?.missingSkills.slice(0, 3).join(", ") || "none identified"})`,
  );
  if (!isAIEnabled())
    return {
      llm: false,
      text: `Add a GROQ_API_KEY for a prioritized plan. Fastest wins:\n${top.join("\n")}\n\nClose at least one skill gap this week before applying to the top match.`,
    };

  const text = await completeText({
    system:
      "You are a pragmatic job-search coach. Given a ranked list of matches and gaps, produce a tight, prioritized 7-day action plan: which to apply first and why, which 1-2 skills to close this week (with a concrete study path), and a daily cadence. Markdown, concise, 300 words max.",
    user: `Profile: ${profile.summary}\nSeniority: ${profile.seniority}\n\nRanked matches:\n${top}\n\nMissing skills overall: ${matches[0]?.judge?.missingSkills.join(", ") || "n/a"}`,
    maxTokens: 900,
  });
  return { llm: true, text: text ?? "Could not generate a plan right now." };
}

export { findMatch };