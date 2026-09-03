import type { ResumeProfile, Seniority, WorkExperience } from "@/types";
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
        contact: { ...record.contact, ...llm.contact },
        workExperience: llm.workExperience?.length ? llm.workExperience : record.workExperience,
        projects: llm.projects?.length ? llm.projects : record.projects,
        certifications: llm.certifications?.length ? llm.certifications : record.certifications,
        languages: llm.languages?.length ? llm.languages : record.languages,
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

interface LlmProfile {
  name?: string;
  summary?: string;
  skills?: string[];
  yearsOfExperience?: number;
  seniority?: Seniority | null;
  targetRole?: string;
  preferredLocation?: string[];
  projects?: { name: string; description: string }[];
  education?: string;
  contact?: {
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
    portfolioUrl?: string;
  };
  workExperience?: WorkExperience[];
  currentCompany?: string;
  currentTitle?: string;
  certifications?: string[];
  languages?: string[];
  availability?: string;
}

const LLM_SYSTEM = `You are an expert resume parser. Extract a COMPLETE structured profile from the resume text below. Return ONLY a JSON object with these fields:

{
  "name": "Full name of the candidate",
  "summary": "2-3 sentence professional summary in third person",
  "skills": ["Skill1", "Skill2", ...],
  "yearsOfExperience": 0,
  "seniority": "junior" | "mid" | "senior" | null,
  "targetRole": "The role they are targeting or best fit for",
  "preferredLocation": ["Location1", "Location2"],
  "projects": [{"name": "Project name", "description": "What it does, tech used, outcome"}],
  "education": "Degree, institution, year",
  "contact": {
    "email": "email@example.com",
    "phone": "+1-xxx-xxx-xxxx",
    "linkedIn": "linkedin.com/in/username or full URL",
    "github": "github.com/username or full URL",
    "portfolioUrl": "https://..."
  },
  "workExperience": [
    {
      "company": "Company name",
      "title": "Job title",
      "startDate": "MMM YYYY or YYYY",
      "endDate": "MMM YYYY or 'Present'",
      "duration": "e.g. 2 years 3 months",
      "description": "1-2 sentence role summary",
      "highlights": ["Key achievement 1 with metric", "Key achievement 2"]
    }
  ],
  "currentCompany": "Most recent employer",
  "currentTitle": "Most recent job title",
  "certifications": ["AWS Certified Developer", ...],
  "languages": ["English", "Hindi", ...],
  "availability": "e.g. Immediate, 2 weeks notice, 1 month"
}

RULES:
- Extract ONLY what is explicitly stated in the resume. Never fabricate.
- For fields not found, use null or omit the field entirely.
- Keep all strings concise and factual. Do not invent details.
- skills: include both technical and soft skills mentioned. Be specific (e.g. "React" not just "Frontend").
- yearsOfExperience: total years of professional work experience. If not stated, infer from work history dates.
- seniority: infer from job titles (intern/junior = junior, mid-level/3-5yr = mid, lead/staff/8+yr = senior).
- workExperience: extract EVERY job listed, in reverse chronological order. Include ALL highlights/bullets.
- contact: extract email, phone, LinkedIn, GitHub, portfolio from the text. Look for URLs, @ symbols, phone patterns.
- certifications: any professional certifications or licenses mentioned.
- languages: programming languages AND spoken languages if mentioned.
- availability: only if explicitly stated (e.g. "available immediately", "2-week notice period").`;

async function llmExtract(text: string, name?: string): Promise<Partial<LlmProfile> | null> {
  const prompt = `${name ? `Candidate name (use if found in resume, otherwise ignore): ${name}\n` : ""}
RESUME TEXT:
${text.slice(0, 14000)}`;

  const res = await completeJSON<LlmProfile>({
    system: LLM_SYSTEM,
    user: prompt,
    maxTokens: 2400,
    temperature: 0.1,
  });

  if (!res) return null;

  const safeWork = Array.isArray(res.workExperience)
    ? res.workExperience
        .filter((w) => w?.company || w?.title)
        .slice(0, 10)
        .map((w) => ({
          company: String(w.company ?? ""),
          title: String(w.title ?? ""),
          startDate: w.startDate ? String(w.startDate) : undefined,
          endDate: w.endDate ? String(w.endDate) : undefined,
          duration: w.duration ? String(w.duration) : undefined,
          description: w.description ? String(w.description) : undefined,
          highlights: Array.isArray(w.highlights) ? w.highlights.map(String).slice(0, 6) : [],
        }))
    : [];

  return {
    name: res.name ? String(res.name) : undefined,
    summary: typeof res.summary === "string" ? res.summary : undefined,
    skills: Array.isArray(res.skills) ? res.skills.map(String).slice(0, 40) : undefined,
    yearsOfExperience: typeof res.yearsOfExperience === "number" ? res.yearsOfExperience : undefined,
    seniority: ["junior", "mid", "senior"].includes(res.seniority as string)
      ? (res.seniority as Seniority)
      : undefined,
    targetRole: typeof res.targetRole === "string" ? res.targetRole : undefined,
    preferredLocation: Array.isArray(res.preferredLocation) ? res.preferredLocation.map(String).slice(0, 5) : undefined,
    projects: Array.isArray(res.projects) ? res.projects.slice(0, 6) : undefined,
    education: typeof res.education === "string" ? res.education : undefined,
    contact: res.contact && typeof res.contact === "object"
      ? {
          email: res.contact.email ? String(res.contact.email) : undefined,
          phone: res.contact.phone ? String(res.contact.phone) : undefined,
          linkedIn: res.contact.linkedIn ? String(res.contact.linkedIn) : undefined,
          github: res.contact.github ? String(res.contact.github) : undefined,
          portfolioUrl: res.contact.portfolioUrl ? String(res.contact.portfolioUrl) : undefined,
        }
      : undefined,
    workExperience: safeWork,
    currentCompany: typeof res.currentCompany === "string" ? res.currentCompany : undefined,
    currentTitle: typeof res.currentTitle === "string" ? res.currentTitle : undefined,
    certifications: Array.isArray(res.certifications) ? res.certifications.map(String).slice(0, 10) : undefined,
    languages: Array.isArray(res.languages) ? res.languages.map(String).slice(0, 10) : undefined,
    availability: typeof res.availability === "string" ? res.availability : undefined,
  };
}

function heuristicExtract(text: string, name?: string): Omit<ResumeProfile, "id" | "sourceText" | "llmFailed" | "createdAt" | "updatedAt"> {
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

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  const portfolioMatch = text.match(/(?:portfolio|website|personal site|blog)\s*[:–-]?\s*(https?:\/\/[^\s,;]+)/i);

  return {
    name,
    summary: text.slice(0, 300),
    skills: detected.slice(0, 30),
    yearsOfExperience,
    seniority,
    targetRole,
    preferredLocation,
    projects: safeProjects,
    education: undefined,
    contact: {
      email: emailMatch?.[0],
      phone: phoneMatch?.[0],
      linkedIn: linkedInMatch?.[0],
      github: githubMatch?.[0],
      portfolioUrl: portfolioMatch?.[1],
    },
    workExperience: [],
    certifications: [],
    languages: [],
    availability: undefined,
  };
}