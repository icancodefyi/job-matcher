export type JobSource =
  | "remoteok"
  | "weworkremotely"
  | "hackernews"
  | "greenhouse"
  | "seed";

export interface Job {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string[];
  tags: string[];
  description: string;
  url: string;
  applyUrl: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  postedAt?: string | null;
  externalId?: string;
  scrapedAt: string;
}

export type Seniority = "junior" | "mid" | "senior";

export interface Project {
  name: string;
  description: string;
}

export interface ResumeProfile {
  id: string;
  name?: string;
  sourceText: string;
  summary: string;
  skills: string[];
  yearsOfExperience: number;
  seniority: Seniority | null;
  targetRole: string;
  preferredLocation: string[];
  projects: Project[];
  education?: string;
  llmFailed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MatchTier = "strong" | "possible" | "weak";

export interface MatchJudge {
  matchedSkills: string[];
  missingSkills: string[];
  whyMatch: string;
  tailoredBullet: string;
  tier: MatchTier;
  score: number;
}

export interface MatchResult {
  jobId: string;
  job: Job;
  preScore: number;
  judge: MatchJudge | null;
  score: number;
  matchedAt: string;
}

export interface LearningResource {
  title: string;
  url: string;
  provider: "youtube" | "docs" | "course" | "article" | "search";
}

export interface SkillGap {
  skill: string;
  jobIds: string[];
  jobsCount: number;
  importance: number;
  resources: LearningResource[];
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface Application {
  jobId: string;
  status: ApplicationStatus;
  updatedAt: string;
}

export interface ScrapeSummary {
  fetched: number;
  newJobs: number;
  sources: {
    source: JobSource;
    ok: boolean;
    count: number;
    error?: string;
  }[];
}

export interface JobScrapeRequest {
  sources?: JobSource[];
  includeSeed?: boolean;
  limit?: number;
  greenhouseOrgs?: string[];
}