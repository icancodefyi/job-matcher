export const COMMON_SKILLS = [
  "python", "typescript", "javascript", "react", "next.js", "nextjs", "node.js", "node",
  "java", "go", "golang", "rust", "c++", "c#", "sql", "postgresql", "mysql", "mongodb",
  "redis", "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "git",
  "fastapi", "django", "flask", "spring", "express", "graphql", "rest", "grpc",
  "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "vllm", "mlflow", "onnx",
  "langchain", "llamaindex", "rag", "llm", "openai", "vector-db", "pinecone", "weaviate",
  "airflow", "dbt", "spark", "pyspark", "snowflake", "kafka", "spark-streaming",
  "oauth", "oidc", "rbac", "iam", "sso", "security", "threat-modeling", "sdlc",
  "react-native", "flutter", "swift", "kotlin", "html", "css", "tailwind",
  "seo", "analytics", "posthog", "data-engineering", "mlops", "fine-tuning",
  "openai", "prompt-engineering", "ai-agents", "multi-agent", "embeddings", "bm25",
  "api-design", "real-time", "streaming", "observability",
  "cicd", "monitoring", "design-systems", "accessibility", "performance",
];

// Words that show up in job descriptions but are not learnable skills.
export const GENERIC_JOB_TERMS = new Set([
  "delivery", "rider", "motorcycle", "spain", "port", "business", "new", "exec",
  "finance", "scheme", "medical", "testing", "education", "customer", "support",
  "time", "position", "team", "role", "work", "company", "experience", "years",
  "recruiter", "sales", "marketing", "full", "part", "remote", "employee", "staff",
  "training", "benefits", "salary", "pay", "hour", "product", "service", "client",
  "tax", "legal", "admin", "office", "cleaning", "driver", "clerk", "produce",
]);

export function isRealSkill(token: string): boolean {
  const t = token.toLowerCase();
  if (t.length < 3) return false;
  if (GENERIC_JOB_TERMS.has(t)) return false;
  if (COMMON_SKILLS.includes(t)) return true;
  if (/(docker|k8s|ml|nlp|ai|api|ci|sql|aws|gcp|azure|oss|sso|wfh)/.test(t)) return true;
  if (/\.(js|ts|py|go|rs|rb|php|sh)$/.test(t)) return true;
  if (COMMON_SKILLS.some((s) => s.startsWith(t) && t.length >= 4)) return true;
  return false;
}