import fs from "node:fs";
import path from "node:path";
import type { Application, Job, MatchResult, ResumeProfile } from "@/types";

export interface Db {
  jobs: Job[];
  profiles: ResumeProfile[];
  matches: MatchResult[];
  applications: Application[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY_DB: Db = { jobs: [], profiles: [], matches: [], applications: [] };

function readDb(): Db {
  try {
    if (!fs.existsSync(DB_FILE)) return EMPTY_DB;
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...EMPTY_DB, ...(JSON.parse(raw) as Partial<Db>) };
  } catch {
    return EMPTY_DB;
  }
}

function writeDb(db: Db): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export const jobsStore = {
  list(): Job[] {
    return readDb().jobs;
  },
  getById(id: string): Job | undefined {
    return readDb().jobs.find((j) => j.id === id);
  },
  addMany(jobs: Job[]): { added: number; total: number } {
    const db = readDb();
    const existing = new Set(db.jobs.map((j) => j.id));
    const fresh = jobs.filter((j) => !existing.has(j.id));
    if (fresh.length) {
      db.jobs = [...fresh, ...db.jobs];
      writeDb(db);
    }
    return { added: fresh.length, total: db.jobs.length };
  },
};

export const profileStore = {
  get(): ResumeProfile | undefined {
    const profiles = readDb().profiles;
    return profiles[profiles.length - 1];
  },
  save(profile: ResumeProfile): ResumeProfile {
    const db = readDb();
    const rest = db.profiles.filter((p) => p.id !== profile.id);
    db.profiles = [...rest, profile];
    writeDb(db);
    return profile;
  },
  clear(): void {
    const db = readDb();
    db.profiles = [];
    writeDb(db);
  },
};

export const matchesStore = {
  list(): MatchResult[] {
    return readDb().matches;
  },
  byTier(): { strong: MatchResult[]; possible: MatchResult[]; weak: MatchResult[] } {
    const all = readDb().matches;
    const strong = all.filter((m) => m.judge?.tier === "strong" || m.score >= 70);
    const possible = all.filter(
      (m) => m.judge?.tier === "possible" || (m.score >= 45 && m.score < 70),
    );
    const weak = all.filter(
      (m) => m.judge?.tier === "weak" || m.score < 45,
    );
    return { strong, possible, weak };
  },
  replace(matches: MatchResult[]): void {
    const db = readDb();
    db.matches = matches;
    writeDb(db);
  },
};

export const applicationsStore = {
  list(): Application[] {
    return readDb().applications;
  },
  upsert(app: Application): Application {
    const db = readDb();
    const rest = db.applications.filter((a) => a.jobId !== app.jobId);
    db.applications = [...rest, app];
    writeDb(db);
    return app;
  },
};

export function dbStats() {
  const db = readDb();
  return {
    jobs: db.jobs.length,
    profiles: db.profiles.length,
    matches: db.matches.length,
    applications: db.applications.length,
  };
}

export { readDb };