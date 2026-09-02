import type { Job, JobSource } from "@/types";
import { buildJob } from "./normalize";

interface SeedSpec {
  title: string;
  company: string;
  salary: [number, number];
  location: string[];
  tags: string[];
  description: string;
}

const SPECS: SeedSpec[] = [
  {
    title: "Staff AI Engineer, Vector Search Platform",
    company: "Aster Labs",
    salary: [160, 230],
    location: ["Remote", "SF"],
    tags: ["ai", "rag", "vector-db", "python", "langchain", "llm", "staff"],
    description:
      "We are hiring a Staff AI Engineer to build retrieval systems at scale. You will design embedding pipelines, manage vector databases (Pinecone, Weaviate), implement hybrid search with BM25, and wire up LangChain agent workflows. Strong Python skills and LLM observability (Langfuse, Langsmith) experience required.",
  },
  {
    title: "Senior RAG / LLM Engineer",
    company: "Neurix",
    salary: [140, 200],
    location: ["Remote"],
    tags: ["rag", "llm", "python", "fastapi", "langchain", "ai-agents"],
    description:
      "Build retrieval-augmented generation systems for enterprise search. Experience with embeddings, chunking strategies, vector stores, and LLM evaluation harnesses. You will ship RAG APIs with FastAPI and maintain evals for quality.",
  },
  {
    title: "Backend Engineer, Real-time Systems",
    company: "Kino",
    salary: [120, 165],
    location: ["Remote"],
    tags: ["backend", "typescript", "node", "kafka", "docker", "kubernetes"],
    description:
      "Backend Engineer to build real-time infrastructure powering AI applications. Work with Node.js, TypeScript, PostgreSQL, Redis, and Docker. Experience with Kubernetes and Kafka is a plus.",
  },
  {
    title: "Frontend Engineer, Design Systems",
    company: "PetalAI",
    salary: [110, 155],
    location: ["Remote"],
    tags: ["frontend", "react", "typescript", "tailwind", "design-system"],
    description:
      "Frontend Engineer to craft product surfaces for AI tooling. React, Next.js, Tailwind CSS, TypeScript. Own the design system components and ship accessible, polished UI.",
  },
  {
    title: "Machine Learning Engineer, Serving",
    company: "Vesta",
    salary: [135, 190],
    location: ["Remote", "NYC"],
    tags: ["ml", "python", "pytorch", "vllm", "inference"],
    description:
      "ML Engineer for model serving and fine-tuning. PyTorch, vLLM, ONNX, MLflow. Own latency budgets and help scale inference to production.",
  },
  {
    title: "Growth Engineer, Content Pipelines",
    company: "Halogen",
    salary: [95, 135],
    location: ["Remote"],
    tags: ["growth", "seo", "nextjs", "postgresql", "analytics"],
    description:
      "Growth Engineer with strong full-stack skills to build SEO pipelines and analytics. Next.js, PostgreSQL, analytics tooling, data modeling.",
  },
  {
    title: "Data Engineer, Streaming",
    company: "Fernworks",
    salary: [105, 150],
    location: ["Remote"],
    tags: ["data", "python", "airflow", "sql", "spark", "snowflake"],
    description:
      "Data Engineer to build streaming pipelines with Airflow, dbt, Snowflake, and Spark. SQL fluency and cloud (AWS/GCP) experience expected.",
  },
  {
    title: "Security Engineer, Platform",
    company: "Talon",
    salary: [125, 175],
    location: ["Remote"],
    tags: ["security", "oauth", "oidc", "iam", "rbac", "aws"],
    description:
      "Security Engineer to own SSO, RBAC, and audit tooling. Experience with OAuth 2.0, OIDC, AWS IAM, and threat modeling.",
  },
  {
    title: "React Native Engineer, Mobile",
    company: "Driftbase",
    salary: [100, 145],
    location: ["London", "Remote"],
    tags: ["mobile", "react-native", "typescript", "offline"],
    description:
      "Mobile Engineer to ship a React Native app with offline-first data and push notifications. Own the iOS and Android release pipeline.",
  },
  {
    title: "Junior AI Developer (Intern to FTE)",
    company: "Ember Labs",
    salary: [60, 90],
    location: ["Remote"],
    tags: ["ai", "rag", "python", "llm", "intern", "fastapi"],
    description:
      "A growth track for developers excited about applied AI. You will build RAG helpers, prompt pipelines, and evaluation tooling on FastAPI. We invest in mentorship with a path from intern to full-time. Junior candidates welcome.",
  },
];

export function seedJobs(): Job[] {
  return SPECS.map((spec, i) =>
    buildJob({
      source: "seed" as JobSource,
      externalId: `seed-${i}`,
      title: spec.title,
      company: spec.company,
      location: spec.location,
      tags: spec.tags,
      description: spec.description,
      url: "https://example.com/jobs",
      applyUrl: "https://example.com/jobs",
      salaryMin: spec.salary[0],
      salaryMax: spec.salary[1],
      currency: "USD",
      postedAt: new Date(Date.now() - i * 36e6).toISOString(),
    }),
  );
}