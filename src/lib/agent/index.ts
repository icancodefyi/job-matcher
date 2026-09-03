import type { Job, MatchResult, ResumeProfile } from "@/types";
import { completeText, isAIEnabled } from "@/lib/ai/groq";

function findMatch(matches: MatchResult[], jobId: string): MatchResult | undefined {
  return matches.find((m) => m.jobId === jobId);
}

function formatProfileContext(p: ResumeProfile): string {
  const parts: string[] = [];
  parts.push(`Name: ${p.name ?? "Not stated"}`);
  if (p.contact.email) parts.push(`Email: ${p.contact.email}`);
  if (p.contact.phone) parts.push(`Phone: ${p.contact.phone}`);
  if (p.contact.linkedIn) parts.push(`LinkedIn: ${p.contact.linkedIn}`);
  if (p.contact.github) parts.push(`GitHub: ${p.contact.github}`);
  if (p.contact.portfolioUrl) parts.push(`Portfolio: ${p.contact.portfolioUrl}`);
  parts.push(`Summary: ${p.summary}`);
  parts.push(`Target role: ${p.targetRole || "Not specified"}`);
  parts.push(`Seniority: ${p.seniority ?? "Unknown"}`);
  parts.push(`Total experience: ${p.yearsOfExperience} years`);
  if (p.currentCompany) parts.push(`Current company: ${p.currentCompany}`);
  if (p.currentTitle) parts.push(`Current title: ${p.currentTitle}`);
  if (p.availability) parts.push(`Availability: ${p.availability}`);
  parts.push(`Skills: ${p.skills.join(", ")}`);
  if (p.languages?.length) parts.push(`Languages: ${p.languages.join(", ")}`);
  if (p.certifications?.length) parts.push(`Certifications: ${p.certifications.join(", ")}`);
  if (p.preferredLocation.length) parts.push(`Preferred locations: ${p.preferredLocation.join(", ")}`);
  if (p.education) parts.push(`Education: ${p.education}`);
  if (p.workExperience.length) {
    parts.push("\nWork history:");
    for (const w of p.workExperience.slice(0, 5)) {
      const dur = w.duration ? ` (${w.duration})` : w.startDate ? ` (${w.startDate}–${w.endDate ?? "Present"})` : "";
      parts.push(`  • ${w.title} at ${w.company}${dur}`);
      if (w.description) parts.push(`    ${w.description}`);
      if (w.highlights?.length) {
        for (const h of w.highlights.slice(0, 4)) parts.push(`    - ${h}`);
      }
    }
  }
  if (p.projects.length) {
    parts.push("\nProjects:");
    for (const pr of p.projects.slice(0, 4)) {
      parts.push(`  • ${pr.name}: ${pr.description}`);
    }
  }
  return parts.join("\n");
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

  const ctx = formatProfileContext(profile);
  const text = await completeText({
    system:
      "You write concise, specific, confident cover letters (150-200 words). Use the candidate's actual work history, projects, and achievements as evidence. No cliches, no 'I am writing to apply'. Reference the specific company and role. Sound human, not robotic.",
    user: `ROLE: ${job.title} at ${job.company}\nJOB TAGS: ${job.tags.join(", ")}\nJOB DESCRIPTION: ${job.description.slice(0, 1800)}\n\nCANDIDATE PROFILE:\n${ctx}\n\nMatch notes: ${match?.judge?.whyMatch ?? "n/a"}`,
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

  const workSummary = profile.workExperience
    .slice(0, 3)
    .map((w) => `${w.title} at ${w.company}: ${w.highlights?.join("; ") ?? w.description ?? ""}`)
    .join("\n");

  const text = await completeText({
    system:
      "Rewrite ONE resume bullet for the candidate that maximizes fit to the job. Always start with an action verb, include a metric or outcome where plausible, and stay truthful to the candidate's actual experience and work history. Return only the bullet (max 35 words).",
    user: `JOB: ${job.title} (${job.company}) — needs: ${job.tags.join(", ")}\n\nCandidate skills: ${profile.skills.join(", ")}\nWork history:\n${workSummary || "No work history on file"}\nProjects: ${profile.projects.map((p) => `${p.name}: ${p.description}`).join("; ")}\n\nHint from matcher: ${focus}`,
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

  const ctx = formatProfileContext(profile);
  const text = await completeText({
    system:
      "Generate the 5 most likely technical + behavioral interview questions for this role, then a 1-line answer strategy for each referencing the candidate's actual work experience, projects, and achievements. Use markdown with numbered questions and bold keywords.",
    user: `ROLE: ${job.title} at ${job.company}\nTAGS: ${job.tags.join(", ")}\nDESCRIPTION: ${job.description.slice(0, 1800)}\n\nCANDIDATE PROFILE:\n${ctx}\n\nMissing skills: ${match?.judge?.missingSkills.join(", ") || "n/a"}`,
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

  const ctx = formatProfileContext(profile);
  const text = await completeText({
    system:
      "You are a pragmatic job-search coach. Given a full candidate profile and ranked matches, produce a tight, prioritized 7-day action plan: which to apply first and why, which 1-2 skills to close this week (with a concrete study path), daily cadence, and any networking/outreach suggestions based on their background. Markdown, concise, 350 words max.",
    user: `CANDIDATE PROFILE:\n${ctx}\n\nRanked matches:\n${top}\n\nMissing skills overall: ${matches[0]?.judge?.missingSkills.join(", ") || "n/a"}`,
    maxTokens: 900,
  });
  return { llm: true, text: text ?? "Could not generate a plan right now." };
}

export { findMatch };