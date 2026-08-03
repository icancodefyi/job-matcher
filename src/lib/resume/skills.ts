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
  // Common English words the LLM sometimes mistakes for skills.
  "fast", "design", "open", "maintain", "build", "develop", "create", "manage",
  "lead", "help", "work", "scale", "production", "quality", "communication",
  "collaboration", "leadership", "problem", "solving", "analytical", "teamwork",
  "agile", "scrum", "ownership", "initiative", "detail", "organized", "written",
  "verbal", "english", "excellent", "strong", "able", "working", "ability",
  "next", "great", "good", "best", "top", "passion", "solve", "write",
  "responsible", "responsibilities", "required", "preferred", "will", "must",
  "nice", "plus", "client", "stakeholder", "cross", "functional", "learning",
  "growth", "environment", "schedule", "flexible", "deadline", "pressure",
  "remote-friendly", "distributed", "global", "medium", "scale-up", "startup",
  "early", "phase", "project", "program", "initiative", "effort", "value",
  "results", "impact", "outcome", "deliver", "deliverables", "milestones",
  "paid", "pacing", "pace", "participate", "participation", "partic", "attend",
  "english", "communication", "advanced", "intermediate", "fluent", "spoken",
  "written", "verbal", "conversational", "fast-paced", "dynamic", "env",
  "tech", "stack", "tools", "technology", "technologies", "modern", "cutting",
]);

const COMMON_ENGLISH = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "do", "does", "did", "will", "would", "can", "could",
  "should", "may", "might", "must", "shall", "this", "that", "these", "those",
  "it", "its", "we", "you", "they", "he", "she", "them", "their", "our", "your",
  "not", "no", "yes", "so", "such", "same", "other", "each", "every", "both",
  "one", "two", "three", "all", "any", "more", "most", "some", "few", "less",
  "very", "really", "just", "also", "well", "even", "still", "only", "too",
  "about", "between", "through", "during", "before", "after", "above", "below",
  "up", "down", "off", "over", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "what", "which", "who",
  "whom", "whose", "them", "along", "around", "across", "against", "among",
  "into", "onto", "upon", "within", "without", "because", "while", "since",
  "until", "whether", "though", "although", "get", "got", "make", "made",
  "like", "want", "need", "take", "give", "use", "used", "using", "using",
  "find", "keep", "know", "see", "seem", "say", "tell", "ask", "show",
  "think", "look", "come", "go", "become", "put", "set", "mean", "call",
  "key", "core", "area", "areas", "aspect", "field", "range", "level",
]);

export function isRealSkill(token: string): boolean {
  const t = token.toLowerCase().trim();
  if (t.length < 3) return false;
  if (GENERIC_JOB_TERMS.has(t)) return false;
  if (COMMON_ENGLISH.has(t)) return false;
  if (COMMON_SKILLS.includes(t)) return true;
  if (/\b(docker|k8s|ml|nlp|ai|api|ci|sql|aws|gcp|azure|oss|sso|wfh)\b/.test(t)) return true;
  if (/\.(js|ts|py|go|rs|rb|php|sh|yaml|yml|json|xml|css|html)$/.test(t)) return true;
  if (COMMON_SKILLS.some((s) => s.startsWith(t + ".") && !COMMON_ENGLISH.has(t))) return true;
  // Multi-word, hyphenated, or capitalized tech phrases (e.g. "React Native", "MLOps", "RESTful API")
  if (t.includes(" ") || t.includes("-") || /[A-Z]/.test(token)) return true;
  return false;
}