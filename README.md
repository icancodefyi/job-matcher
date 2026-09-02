# JobMatcher — AI Job Scraper & Resume Matcher

A 1–week Build Sprint MVP for the **Generative AI Developer Intern** assignment:
scrape jobs from free sources → analyze a resume with an LLM → get ranked matches
with **skill-gap learning paths** so you become the best candidate.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind v4** and **Groq's
`openai/gpt-oss-20b`** (the smallest GPT-OSS model hosted on GroqCloud) for all
GenAI steps.

## The loop

```
Scrape live jobs (free, scrape-friendly)  →  Analyze résumé (GPT-OSS extracts profile)
        →  Ranked matches (deterministic pre-score + LLM recruiter verdict)
        →  Skill-gap learning path (missing skills → YouTube/docs/courses)
        →  Agentic extras (cover letter, resume bullet, interview prep, 7-day plan)
```

## Quickstart

```bash
cp .env.example .env.local   # add GROQ_API_KEY=
pnpm install
pnpm dev                     # → http://localhost:3000
```

The app works **without** a key too: every LLM step falls back to deterministic
heuristics and the UI labels those "heuristic" results.

### Demo script (2 minutes)

1. **Résumé** tab → *Upload résumé* (PDF / .txt / .md) or paste the text → *Analyze with GPT-OSS* → profile appears.
2. **Jobs** tab → *Scrape live* → listings from RemoteOK · Remotive · HN (all real, no demo data).
3. **Matches** tab → *Re-run matching* → ranked cards with score, tier, matched/missing skills, "why" and a tailored bullet.
4. *Compute skill gaps →* each gap shows free learning resources.
5. **Agent Plan** → *Generate my action plan* → a prioritized 7-day study + apply schedule.
6. Set status on any match card (**Applied / Interview / Offer**) → see the **Applications** tab.

## Features

| Area | What it does | Files |
|---|---|---|
| Job scraper | RemoteOK (JSON API), Remotive (JSON API), HN "Who's hiring" (Algolia) — no demo/fake data | `src/lib/scrapers/*` |
| Resume parser | Upload PDF/.txt/.md or paste → text extracted (pdf-parse) → LLM extracts summary, skills, seniority, target role, projects; heuristic fallback | `src/lib/resume/analyze.ts`, `extractPdf.ts` |
| Matcher | Deterministic pre-score + GPT-OSS "recruiter" verdict via structured JSON output | `src/lib/match/*` |
| Skill gaps | Aggregates missing skills across top matches → curated learning resources | `src/lib/match/gaps.ts`, `resources.ts` |
| Agent | Cover letter, resume re-bullet, interview Qs, 7-day action plan | `src/lib/agent/index.ts` |
| Storage | JSON file at `.data/db.json` (swap for MongoDB later — same `Store` interface) | `src/lib/data/store.ts` |
| UI | 6-tab dashboard: Résumé · Jobs · Matches · Skill Gaps · Plan · Applications | `src/components/Dashboard.tsx` |

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/jobs` | GET | list stored jobs (+ filters) |
| `/api/jobs/scrape` | POST | run scrapers (RemoteOK, Remotive, HN), upsert |
| `/api/resume/analyze` | POST | parse résumé text → `ResumeProfile` |
| `/api/matches` | GET/POST | list / run matching over stored profile + jobs |
| `/api/gaps` | POST | skill-gap aggregation → learning resources |
| `/api/applications` | GET/POST | application tracker |
| `/api/agent` | POST | `{action: plan\|cover-letter\|rebullet\|interview, jobId?}` |

## Notes for demo day

- **Vercel (production) note:** the default store writes to the local filesystem
  (`.data/db.json`), which is ephemeral in serverless. For a production deploy,
  implement the MongoDB adapter behind `src/lib/data/store.ts` (schema is already
  modeled after the parent `impiseo` project's `mongodb` usage).
- **Model choice:** Groq docs list only `openai/gpt-oss-120b` and
  `openai/gpt-oss-20b` — there is no `gpt-oss-small` on GroqCloud. The 20B is the
  "small" option; override with `GROQ_MODEL` if you prefer 120B.
- **PDF extraction:** `pdf-parse@1.1.1` is imported from its inner path
  (`pdf-parse/lib/pdf-parse.js`) — the package's main entry enters "debug mode"
  under bundlers and tries to read a test PDF at require time, which 500s in
  Next.js. Scanned/image-only PDFs return a clean 422.