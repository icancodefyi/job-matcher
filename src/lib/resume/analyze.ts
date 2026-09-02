import type { ResumeProfile, Seniority } from "@/types";
import { completeJSON } from "@/lib/ai/groq";
import { COMMON_SKILLS } from "./skills";

export { COMMON_SKILLS as SKILL_DICTIONARY };

export async function analyzeResume(
  sourceText: string,
  name?: string,
): Promise<ResumeProfile> {
  const text = sourceText.trim();
  const cached = heuristicExtract(text, name);
  const record: ResumeProfile = {
    ...cached,
    id: `profile-${Date.now()}`,
    sourceText: text,
    llmFailed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (process.env.GROQ_API_KEY) {
    const llm = await llmExtract(text, name);
    if (llm) {
      return {
        ...record,
        ...llm,
        llmFailed: false,
        id: record.id,
        sourceText: text,
        createdAt: record.createdAt,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return record;
}

interface ResumeFields {
  name?: string;
  summary: string;
  skills: string[];
  yearsOfExperience: number;
  seniority: Seniority | null;
  targetRole: string;
  preferredLocation: string[];
  projects: { name: string; description: string }[];
  education?: string;
}

async function llmExtract(text: string, name?: string): Promise<Partial<ResumeFields> | null> {
  const system = `You extract a structured job-seeker profile from a resume. Return ONLY a JSON object:
{"summary": string, "skills": string[], "yearsOfExperience": number, "seniority": "junior"|"mid"|"senior"|null, "targetRole": string, "preferredLocation": string[], "projects": [{"name":string,"description":string}], "education": string|null}`;
  const res = await completeJSON<ResumeFields>({
    system,
    user: `${name ? `Candidate name: ${name}\n` : ""}RESUME:\n${text.slice(0, 12000)}`,
    maxTokens: 700,
    temperature: 0.2,
  });
  return res
    ? {
        name: res.name ?? name,
        summary: typeof res.summary === "string" ? res.summary : text.slice(0, 220),
        skills: (Array.isArray(res.skills) ? res.skills : []).slice(0, 40),
        yearsOfExperience: Math.max(0, Number(res.yearsOfExperience) || 0),
        seniority: ["junior", "mid", "senior"].includes(res.seniority as string)
          ? (res.seniority as Seniority)
          : null,
        targetRole: typeof res.targetRole === "string" ? res.targetRole : "",
        preferredLocation: Array.isArray(res.preferredLocation)
          ? res.preferredLocation.slice(0, 5)
          : [],
        projects: (Array.isArray(res.projects) ? res.projects : []).slice(0, 6),
        education: typeof res.education === "string" ? res.education : undefined,
      }
    : null;
}

function heuristicExtract(text: string, name?: string): ResumeFields {
  const lower = text.toLowerCase();
  const detected = COMMON_SKILLS.filter((s) => lower.includes(s.toLowerCase()));

  const yearsMatch = text.match(/(\d+)\s*(?:\+)?\s*years?\b/i);
  const yearsOfExperience = yearsMatch ? Math.max(0, Number(yearsMatch[1])) : 0;

  let seniority: Seniority | null = null;
  if (/(senior|staff|principal|lead|architect|^big\w*|head\s+of)/i.test(text)) seniority = "senior";
  else if (/(junior|intern|trainee|graduate|entry[- ]level|fresher)/i.test(text)) seniority = "junior";
  else if (yearsOfExperience > 1 || detected.length > 6) seniority = "mid";

  const roleMatch = text.match(/^(?:I am|I'?m|a)\s+(?:a\s+)?(.{2,40}?(?:engineer|developer|designer|scientist|architect|intern))\b/i);
  const targetRole = roleMatch ? roleMatch[1].trim() : "";

  const remote = /remote|work from home|wfh/i.test(text) ? "Remote" : null;
  const cities = [
    "San Francisco", "New York", "London", "Berlin", "Bangalore", "Bengaluru",
    "Mumbai", "Delhi", "Toronto", "Austin", "Seattle", "Chicago", "Amsterdam", "Singapore",
    "Dubai", "Hyderabad", "Pune", "Chennai", "Zurich", "Paris", "Tokyo", "Sydney",
  ];
  const foundCities = cities.filter((c) => lower.includes(c.toLowerCase()));
  const preferredLocation = [...new Set([...(remote ? [remote] : []), ...foundCities])].slice(0, 5);

  const projects = ["projects", "portfolio", "featured work"].map((kw) =>
    text.slice(text.toLowerCase().indexOf(kw) + kw.length, text.toLowerCase().indexOf(kw) + kw.length + 700),
  );
  const safeProjects = projects
    .map((s) => s.split(/\n{2,}|\b(?:education|experience|skills)\b/i)[0].trim())
    .filter((s) => s.length > 20)
    .slice(0, 3)
    .map((s, i) => ({ name: `Project ${i + 1}`, description: s.slice(0, 200) }));

  return {
    name,
    summary: text.slice(0, 220),
    skills: detected.slice(0, 30),
    yearsOfExperience,
    seniority,
    targetRole,
    preferredLocation,
    projects: safeProjects,
    education: undefined,
  };
}