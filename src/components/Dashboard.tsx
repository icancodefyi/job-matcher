"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Markdown from "./Markdown";
import type {
  Application,
  ApplicationStatus,
  Job,
  JobSource,
  MatchResult,
  ResumeProfile,
  SkillGap,
} from "@/types";

const SAMPLE_RESUME = `Zaid Khan
Generative AI Developer

I am a Generative AI developer with 2 years of experience building RAG pipelines, LLM agents, and AI chatbots. Skilled in Python, LangChain, FastAPI, Next.js, React, TypeScript, PostgreSQL, Docker. Previously built a resume matching tool and an SEO monitoring SaaS. Senior intern at Ember Labs. Currently in San Francisco, open to remote.

PROJECTS
1. RAG Job Matcher — built retrieval pipeline with Pinecone and LangChain, FastAPI backend, Next.js frontend.
2. Video QA bot — RAG over YouTube transcripts using vector database and GPT agents.

EDUCATION
B.Tech Computer Science`;

const SOURCE_LABEL: Record<JobSource, string> = {
  remoteok: "RemoteOK",
  remotive: "Remotive",
  hackernews: "HN Hiring",
  greenhouse: "Greenhouse",
  seed: "Demo",
};

const SOURCE_COLOR: Record<JobSource, string> = {
  remoteok: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  remotive: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  hackernews: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  greenhouse: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  seed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const TIER_COLOR: Record<string, string> = {
  strong: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  possible: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  weak: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const STATUS_OPTIONS: ApplicationStatus[] = ["saved", "applied", "interview", "offer", "rejected"];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

function fmtSalary(job: Job): string {
  if (!job.salaryMin && !job.salaryMax) return "—";
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (job.salaryMin === job.salaryMax) return fmt(job.salaryMin ?? job.salaryMax ?? 0);
  return `${fmt(job.salaryMin ?? 0)}–${fmt(job.salaryMax ?? 0)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-zinc-500";
}

function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "match" | "miss" | "default" }) {
  const tones = {
    match: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    miss: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    default: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${tones[tone]}`}>
      {tone === "match" ? "✓ " : tone === "miss" ? "+ " : ""}
      {children}
    </span>
  );
}

type Tab = "resume" | "jobs" | "matches" | "gaps" | "plan" | "apps";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("resume");
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  const [resumeText, setResumeText] = useState(SAMPLE_RESUME);
  const [resumeName, setResumeName] = useState("Zaid Khan");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentOut, setAgentOut] = useState<Record<string, { text: string; llm: boolean }>>({});

  useEffect(() => {
    (async () => {
      try {
        const [j, m, a] = await Promise.all([
          api<{ jobs: Job[]; stats: Record<string, number> }>("/api/jobs?limit=200"),
          api<{ matches: MatchResult[] }>("/api/matches"),
          api<{ applications: Application[] }>("/api/applications"),
        ]);
        setJobs(j.jobs);
        setStats(j.stats);
        setMatches(m.matches);
        setApplications(a.applications);
      } catch {
        // server data not ready yet
      }
    })();
  }, []);

  const appStatus = useMemo(() => {
    const map = new Map(applications.map((a) => [a.jobId, a.status]));
    return map;
  }, [applications]);

  async function run(fn: () => Promise<void>, label: string) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    await run(async () => {
      const res = await api<{ profile: ResumeProfile }>("/api/resume/analyze", {
        method: "POST",
        body: JSON.stringify({ resumeText, name: resumeName }),
      });
      setProfile(res.profile);
      setTab("jobs");
    }, "analyzing");
  }

  async function analyzePdf(base64: string, fileName: string) {
    await run(async () => {
      const res = await api<{ profile: ResumeProfile; extractedText?: string }>(
        "/api/resume/analyze",
        {
          method: "POST",
          body: JSON.stringify({ base64, fileName, name: resumeName }),
        },
      );
      if (res.extractedText) setResumeText(res.extractedText);
      setProfile(res.profile);
      setTab("jobs");
    }, "analyzing");
  }

  async function scrape(sources: JobSource[]) {
    await run(async () => {
      const res = await api<{ jobs: Job[]; summary: { totalJobs: number } }>("/api/jobs/scrape", {
        method: "POST",
        body: JSON.stringify({ sources, includeSeed: true, limit: 250 }),
      });
      setJobs(res.jobs);
      setStats((s) => ({ ...(s ?? {}), jobs: res.summary.totalJobs }));
    }, "scraping");
  }

  async function runMatches() {
    await run(async () => {
      const res = await api<{ matches: MatchResult[]; total: number }>("/api/matches", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMatches(res.matches);
      setTab("matches");
    }, "matching");
  }

  async function computeGaps() {
    await run(async () => {
      const res = await api<{ gaps: SkillGap[] }>("/api/gaps", {
        method: "POST",
        body: JSON.stringify({ topN: 8 }),
      });
      setGaps(res.gaps);
      setTab("gaps");
    }, "gaps");
  }

  async function genAgent(action: string, jobId: string) {
    const key = `${action}:${jobId}`;
    await run(async () => {
      const res = await api<{ text: string; llm: boolean }>("/api/agent", {
        method: "POST",
        body: JSON.stringify({ action, jobId }),
      });
      setAgentOut((prev) => ({ ...prev, [key]: res }));
    }, action === "plan" ? "plan" : "agent");
  }

  async function setAppStatus(jobId: string, status: ApplicationStatus) {
    await run(async () => {
      const res = await api<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ jobId, status }),
      });
      setApplications((prev) => {
        const rest = prev.filter((a) => a.jobId !== jobId);
        return [...rest, res.application];
      });
    }, "saving");
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        const base64 = dataUrl.includes("base64,") ? dataUrl.split("base64,")[1] : dataUrl;
        void analyzePdf(base64, file.name);
      };
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setResumeText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  const nav: { key: Tab; label: string; badge?: number }[] = [
    { key: "resume", label: "Résumé" },
    { key: "jobs", label: "Jobs", badge: jobs.length },
    { key: "matches", label: "Matches", badge: matches.length },
    { key: "gaps", label: "Skill Gaps", badge: gaps.length },
    { key: "plan", label: "Agent Plan" },
    { key: "apps", label: "Applications", badge: applications.length },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                JobMatcher{" "}
                <span className="ml-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                  AI Scraper + Resume Matcher
                </span>
              </h1>
              <p className="text-xs text-zinc-500">
                Scrape free job boards → analyze your résumé → get ranked matches &amp; skill-gap learning paths
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {stats && (
                <>
                  <Stat label="jobs" value={stats.jobs ?? 0} />
                  <Stat label="matches" value={stats.matches ?? 0} />
                  <Stat label="gaps" value={stats.profiles ? gaps.length || "—" : "—"} />
                </>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                  profile?.llmFailed === false
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${profile?.llmFailed === false ? "bg-emerald-400" : "bg-zinc-500"}`} />
                {profile?.llmFailed === false ? "GPT-OSS · LLM active" : profile ? "Heuristic mode" : "LLM idle"}
              </span>
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === n.key
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                {n.label}
                {typeof n.badge === "number" && n.badge > 0 && (
                  <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-200">
                    {n.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {tab === "resume" && (
          <ResumeTab
            resumeText={resumeText}
            resumeName={resumeName}
            profile={profile}
            busy={busy}
            onText={setResumeText}
            onName={setResumeName}
            onSample={() => {
              setResumeText(SAMPLE_RESUME);
              setResumeName("Zaid Khan");
            }}
            onFile={onFile}
            onAnalyze={analyze}
          />
        )}

        {tab === "jobs" && (
          <JobsTab
            jobs={jobs}
            busy={busy}
            onScrape={scrape}
            profileReady={Boolean(profile)}
            onMatch={runMatches}
          />
        )}

        {tab === "matches" && (
          <MatchesTab
            matches={matches}
            profileReady={Boolean(profile)}
            busy={busy}
            onRun={runMatches}
            onGaps={computeGaps}
            agentOut={agentOut}
            onAgent={genAgent}
            appStatus={appStatus}
            onStatus={setAppStatus}
          />
        )}

        {tab === "gaps" && (
          <GapsTab gaps={gaps} busy={busy} onCompute={computeGaps} requireRun={matches.length === 0} />
        )}

        {tab === "plan" && (
          <PlanTab busy={busy} onPlan={() => genAgent("plan", "")} agentOut={agentOut} />
        )}

        {tab === "apps" && (
          <AppsTab applications={applications} jobs={jobs} onStatus={setAppStatus} />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1">
      <span className="font-semibold text-white">{value}</span>
      <span className="ml-1.5 text-zinc-400">{label}</span>
    </span>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-white">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-zinc-500">{sub}</p>}
    </div>
  );
}

function LoadingBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-300">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
      {label}…
    </div>
  );
}

function ResumeTab(props: {
  resumeText: string;
  resumeName: string;
  profile: ResumeProfile | null;
  busy: string | null;
  onText: (v: string) => void;
  onName: (v: string) => void;
  onSample: () => void;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <SectionTitle sub="Upload your résumé (PDF, .txt, .md), paste it, or load the sample.">
          1 · Your résumé
        </SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={props.resumeName}
              onChange={(e) => props.onName(e.target.value)}
              placeholder="Your name (optional)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
            />
            <button onClick={props.onSample} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Load sample
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Upload
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.markdown" hidden onChange={props.onFile} />
          </div>
          <textarea
            value={props.resumeText}
            onChange={(e) => props.onText(e.target.value)}
            rows={14}
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={props.onAnalyze}
              disabled={props.busy !== null || !props.resumeText.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.busy === "analyzing" ? "Analyzing…" : "Analyze with GPT-OSS"}
            </button>
            <p className="text-xs text-zinc-500">
              Extracts skills, experience, seniority &amp; target role via <code className="text-violet-400">openai/gpt-oss-20b</code>
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle sub="What the model read from your résumé.">2 · Extracted profile</SectionTitle>
        {!props.profile ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            Paste text and hit <span className="text-violet-300">Analyze</span> to see your parsed profile here.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            {props.profile.llmFailed && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Groq unavailable — falling back to heuristic parsing. Add <code>GROQ_API_KEY</code> for full analysis.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Name</p>
                <p className="font-semibold text-white">{props.profile.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Target role</p>
                <p className="font-semibold text-white">{props.profile.targetRole || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Experience</p>
                <p className="font-semibold text-white">{props.profile.yearsOfExperience} yrs</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Seniority</p>
                <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${TIER_COLOR[props.profile.seniority ?? "weak"]}`}>
                  {props.profile.seniority ?? "unknown"}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-zinc-500">Summary</p>
                <p className="text-sm leading-relaxed text-zinc-300">{props.profile.summary}</p>
              </div>
              <div className="col-span-2">
                <p className="mb-1.5 text-xs text-zinc-500">Skills {props.profile.skills.length ? `(${props.profile.skills.length})` : ""}</p>
                <div className="flex flex-wrap gap-1.5">
                  {props.profile.skills.map((s) => (
                    <Chip key={s} tone="match">
                      {s}
                    </Chip>
                  ))}
                  {props.profile.skills.length === 0 && <span className="text-sm text-zinc-600">none detected</span>}
                </div>
              </div>
              {props.profile.projects.length > 0 && (
                <div className="col-span-2">
                  <p className="mb-1.5 text-xs text-zinc-500">Projects</p>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    {props.profile.projects.map((p, i) => (
                      <li key={i}>
                        <span className="font-semibold text-zinc-200">{p.name}</span> · {p.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function JobsTab(props: {
  jobs: Job[];
  busy: string | null;
  onScrape: (s: JobSource[]) => void;
  profileReady: boolean;
  onMatch: () => void;
}) {
  return (
    <div>
      <SectionTitle sub="Pull live listings from free, scrape-friendly sources.">Jobs</SectionTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => props.onScrape(["remoteok", "remotive", "hackernews"])}
          disabled={props.busy !== null}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {props.busy === "scraping" ? "Scraping…" : "Scrape live (RemoteOK · Remotive · HN)"}
        </button>
        <button
          onClick={() => props.onScrape(["seed"])}
          disabled={props.busy !== null}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Load demo jobs
        </button>
        {props.profileReady && (
          <button
            onClick={props.onMatch}
            disabled={props.busy !== null || props.jobs.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {props.busy ? "Working…" : "Match against my profile →"}
          </button>
        )}
        {!props.profileReady && (
          <span className="text-xs text-zinc-500">Analyze a résumé first, then run matching.</span>
        )}
      </div>

      {props.busy === "scraping" && <LoadingBar label="Contacting job boards" />}

      <div className="grid gap-3 sm:grid-cols-2">
        {props.jobs.slice(0, 60).map((job) => (
          <article key={job.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-white">{job.title}</h3>
                <p className="text-sm text-zinc-400">{job.company}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${SOURCE_COLOR[job.source]}`}>
                {SOURCE_LABEL[job.source]}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {job.location.join(" · ") || "Remote"} · {fmtSalary(job)} · {fmtDate(job.postedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.tags.slice(0, 8).map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{job.description}</p>
            <div className="mt-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-violet-400 hover:text-violet-300"
              >
                View / apply ↗
              </a>
            </div>
          </article>
        ))}
        {props.jobs.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
            No jobs yet. Hit <span className="text-violet-300">Scrape live</span> or <span className="text-violet-300">Load demo jobs</span>.
          </div>
        )}
      </div>
    </div>
  );
}

function MatchesTab(props: {
  matches: MatchResult[];
  profileReady: boolean;
  busy: string | null;
  onRun: () => void;
  onGaps: () => void;
  agentOut: Record<string, { text: string; llm: boolean }>;
  onAgent: (action: string, jobId: string) => void;
  appStatus: Map<string, ApplicationStatus>;
  onStatus: (jobId: string, status: ApplicationStatus) => void;
}) {
  return (
    <div>
      <SectionTitle sub="Ranked by a deterministic pre-score, then refined by GPT-OSS as a recruiter.">
        Matches
      </SectionTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {props.profileReady ? (
          <button
            onClick={props.onRun}
            disabled={props.busy !== null || props.matches.length === 0}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {props.busy === "matching" ? "Scoring… (LLM judging ~15 top jobs)" : "Re-run matching"}
          </button>
        ) : (
          <span className="text-sm text-zinc-500">Analyze a résumé first to unlock matching.</span>
        )}
        <button
          onClick={props.onGaps}
          disabled={props.busy !== null || props.matches.length === 0}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Compute skill gaps →
        </button>
      </div>

      {props.busy === "matching" && <LoadingBar label="GPT-OSS is interviewing your résumé against each job" />}

      <div className="space-y-3">
        {props.matches.map((m) => (
          <MatchCard
            key={m.jobId}
            m={m}
            agentOut={props.agentOut}
            onAgent={props.onAgent}
            busy={props.busy}
            appStatus={props.appStatus.get(m.jobId)}
            onStatus={(s) => props.onStatus(m.jobId, s)}
          />
        ))}
        {props.matches.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
            Nothing matched yet. Run matching to see ranked results.
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard(props: {
  m: MatchResult;
  agentOut: Record<string, { text: string; llm: boolean }>;
  onAgent: (action: string, jobId: string) => void;
  busy: string | null;
  appStatus?: ApplicationStatus;
  onStatus: (s: ApplicationStatus) => void;
}) {
  const { m } = props;
  const agentKey = (action: string) => `${action}:${m.jobId}`;
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{m.job.title}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${TIER_COLOR[m.judge?.tier ?? "weak"]}`}>
              {m.judge?.tier ?? "—"}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${SOURCE_COLOR[m.job.source]}`}>
              {SOURCE_LABEL[m.job.source]}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{m.job.company} · {m.job.location.join(" · ")} · {fmtSalary(m.job)}</p>
        </div>
        <div className="w-36 shrink-0">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold text-white">{Math.round(m.score)}</span>
            <span className="text-[10px] text-zinc-500">pre {Math.round(m.preScore)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
            <div className={`h-1.5 rounded-full ${scoreColor(m.score)}`} style={{ width: `${Math.max(4, m.score)}%` }} />
          </div>
        </div>
      </div>

      {m.judge && (
        <div className="mt-3 space-y-2.5">
          <div>
            <p className="mb-1 text-xs font-medium text-emerald-400">Matched skills</p>
            <div className="flex flex-wrap gap-1.5">
              {m.judge.matchedSkills.slice(0, 10).map((s) => (
                <Chip key={s} tone="match">{s}</Chip>
              ))}
              {m.judge.matchedSkills.length === 0 && <span className="text-xs text-zinc-600">none</span>}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-amber-400">Skills to close</p>
            <div className="flex flex-wrap gap-1.5">
              {m.judge.missingSkills.slice(0, 8).map((s) => (
                <Chip key={s} tone="miss">{s}</Chip>
              ))}
              {m.judge.missingSkills.length === 0 && <span className="text-xs text-zinc-600">none identified</span>}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">{m.judge.whyMatch}</p>
          {m.judge.tailoredBullet && (
            <blockquote className="rounded-lg border-l-2 border-violet-500 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-300">
              {m.judge.tailoredBullet}
            </blockquote>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
        <a
          href={m.job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
        >
          Apply ↗
        </a>
        <AgentButton label="Cover letter" action="cover-letter" {...props} />
        <AgentButton label="Re-write bullet" action="rebullet" {...props} />
        <AgentButton label="Interview Qs" action="interview" {...props} />
        <select
          value={props.appStatus ?? "saved"}
          onChange={(e) => props.onStatus(e.target.value as ApplicationStatus)}
          className="ml-auto rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "saved" ? "○ Not started" : s === "applied" ? "✓ Applied" : s === "interview" ? "● Interview" : s === "offer" ? "★ Offer" : "✕ Rejected"}
            </option>
          ))}
        </select>
      </div>

      {props.agentOut[agentKey("cover-letter")] && (
        <AgentOutput label="Cover letter" out={props.agentOut[agentKey("cover-letter")]} />
      )}
      {props.agentOut[agentKey("rebullet")] && (
        <AgentOutput label="Tailored bullet" out={props.agentOut[agentKey("rebullet")]} />
      )}
      {props.agentOut[agentKey("interview")] && (
        <AgentOutput label="Interview questions" out={props.agentOut[agentKey("interview")]} />
      )}
    </article>
  );
}

function AgentButton(props: {
  label: string;
  action: string;
  m: MatchResult;
  agentOut: Record<string, { text: string; llm: boolean }>;
  onAgent: (action: string, jobId: string) => void;
  busy: string | null;
  appStatus?: ApplicationStatus;
  onStatus: (s: ApplicationStatus) => void;
}) {
  const { label, action, busy, onAgent, m } = props;
  const generating = busy === "agent";
  return (
    <button
      onClick={() => onAgent(action, m.jobId)}
      disabled={busy !== null}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
    >
      {generating ? "…" : label}
    </button>
  );
}

function AgentOutput({ label, out }: { label: string; out: { text: string; llm: boolean } }) {
  return (
    <div className="mt-3 rounded-lg border border-violet-500/20 bg-zinc-800/40 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-violet-300">{label}</p>
        {!out.llm && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
            heuristic fallback
          </span>
        )}
      </div>
      <Markdown text={out.text} />
    </div>
  );
}

function GapsTab(props: { gaps: SkillGap[]; busy: string | null; onCompute: () => void; requireRun: boolean }) {
  return (
    <div>
      <SectionTitle sub="Missing skills across your top matches, ranked by how often they block you — with free resources to close each gap.">
        Skill Gaps → Learning Path
      </SectionTitle>
      {props.requireRun ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          Run matching first, then compute your skill gaps.
        </div>
      ) : (
        <>
          <button
            onClick={props.onCompute}
            disabled={props.busy !== null}
            className="mb-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {props.busy === "gaps" ? "Computing…" : "Compute my skill gaps"}
          </button>
          <div className="grid gap-3 md:grid-cols-2">
            {props.gaps.map((g, i) => (
              <div key={g.skill} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-500">#{i + 1}</span>
                    <h3 className="font-semibold capitalize text-white">{g.skill}</h3>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                    {g.jobsCount} {g.jobsCount === 1 ? "job" : "jobs"}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                  <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${Math.max(10, g.importance * 100)}%` }} />
                </div>
                <div className="mt-3 space-y-1.5">
                  {g.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-300 hover:border-violet-500/40 hover:text-white"
                    >
                      <span className="truncate pr-2">{r.title}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">{r.provider}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            {props.gaps.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
                No gaps computed yet — hit the button above.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlanTab(props: { busy: string | null; onPlan: () => void; agentOut: Record<string, { text: string; llm: boolean }> }) {
  const plan = props.agentOut["plan:"];
  return (
    <div>
      <SectionTitle sub="An agent reviews your ranked matches and produces a prioritized 7-day job-hunt plan.">
        The Job-Hunt Agent
      </SectionTitle>
      <button
        onClick={props.onPlan}
        disabled={props.busy !== null}
        className="mb-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {props.busy === "plan" ? "Planning…" : "Generate my action plan"}
      </button>
      {plan ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          {!plan.llm && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Heuristic fallback — add <code>GROQ_API_KEY</code> for a full agent plan.
            </div>
          )}
          <Markdown text={plan.text} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
          Generate a plan to see priorities, dates, and skill-closing study paths.
        </div>
      )}
    </div>
  );
}

function AppsTab(props: {
  applications: Application[];
  jobs: Job[];
  onStatus: (jobId: string, status: ApplicationStatus) => void;
}) {
  const byStatus = useMemo(() => {
    const map: Record<string, Application[]> = {
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
      saved: [],
    };
    for (const a of props.applications) map[a.status]?.push(a);
    return map;
  }, [props.applications]);

  const counts: { status: ApplicationStatus; n: number }[] = [
    { status: "applied", n: byStatus.applied.length },
    { status: "interview", n: byStatus.interview.length },
    { status: "offer", n: byStatus.offer.length },
    { status: "rejected", n: byStatus.rejected.length },
  ];

  return (
    <div>
      <SectionTitle sub="Track where each application stands. Set status from any Matches card.">
        Application Tracker
      </SectionTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {counts.map((c) => (
          <span key={c.status} className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-xs">
            <span className="font-semibold text-white">{c.n}</span>
            <span className="ml-1.5 capitalize text-zinc-400">{c.status}</span>
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/40">
            {props.applications.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Nothing tracked yet. Change a status on a Matches card to start your pipeline.
                </td>
              </tr>
            )}
            {props.applications.map((a) => {
              const job = props.jobs.find((j) => j.id === a.jobId);
              return (
                <tr key={a.jobId}>
                  <td className="px-4 py-2 font-medium text-white">{job?.title ?? a.jobId}</td>
                  <td className="px-4 py-2 text-zinc-400">{job?.company ?? "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      value={a.status}
                      onChange={(e) => props.onStatus(a.jobId, e.target.value as ApplicationStatus)}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-violet-500"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}