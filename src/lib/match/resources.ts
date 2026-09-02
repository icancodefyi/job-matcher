import type { LearningResource } from "@/types";

interface ResourceSpec {
  title: string;
  url: string;
  provider: LearningResource["provider"];
}

const CURATED: Record<string, ResourceSpec> = {
  python: { title: "Python Crash Course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=rfscVS0vtbw", provider: "youtube" },
  fastapi: { title: "FastAPI — Official Docs & Tutorial", url: "https://fastapi.tiangolo.com/tutorial/", provider: "docs" },
  "react": { title: "React Official Docs", url: "https://react.dev/learn", provider: "docs" },
  nextjs: { title: "Next.js Learn", url: "https://nextjs.org/learn", provider: "docs" },
  typescript: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", provider: "docs" },
  node: { title: "Node.js Developer Guide", url: "https://nodejs.org/en/learn", provider: "docs" },
  llm: { title: "Introduction to LLMs (DeepLearning.AI)", url: "https://www.youtube.com/results?search_query=large+language+models+explained+course", provider: "youtube" },
  rag: { title: "RAG from Scratch (LangChain playlist)", url: "https://www.youtube.com/results?search_query=rag+from+scratch+langchain+playlist", provider: "youtube" },
  langchain: { title: "LangChain Academy", url: "https://academy.langchain.com/", provider: "course" },
  "langchain.js": { title: "LangChain.js Docs", url: "https://js.langchain.com/docs/", provider: "docs" },
  "vector-db": { title: "Vector Databases for AI (course)", url: "https://www.youtube.com/results?search_query=vector+database+course+pinecone", provider: "youtube" },
  pinecone: { title: "Pinecone Learning Center", url: "https://www.pinecone.io/learn/", provider: "course" },
  sql: { title: "SQL Tutorial (freeCodeCamp)", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", provider: "youtube" },
  postgresql: { title: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/", provider: "course" },
  mongodb: { title: "MongoDB University", url: "https://university.mongodb.com/", provider: "course" },
  docker: { title: "Docker in 100 Seconds + course", url: "https://www.youtube.com/results?search_query=docker+course+freecodecamp", provider: "youtube" },
  kubernetes: { title: "Kubernetes Course (freeCodeCamp)", url: "https://www.youtube.com/results?search_query=kubernetes+course+freecodecamp", provider: "youtube" },
  aws: { title: "AWS Certified Developer Path", url: "https://aws.amazon.com/certification/certified-developer-associate/", provider: "course" },
  airflow: { title: "Apache Airflow Docs", url: "https://airflow.apache.org/docs/", provider: "docs" },
  spark: { title: "PySpark Course (freeCodeCamp)", url: "https://www.youtube.com/results?search_query=pyspark+course", provider: "youtube" },
  snowflake: { title: "Snowflake Learning", url: "https://learn.snowflake.com/", provider: "course" },
  oauth: { title: "OAuth 2.0 Explained (video)", url: "https://www.youtube.com/results?search_query=oauth+2.0+explained", provider: "youtube" },
  "react-native": { title: "React Native Docs", url: "https://reactnative.dev/docs/getting-started", provider: "docs" },
  pytorch: { title: "PyTorch Tutorials", url: "https://pytorch.org/tutorials/", provider: "docs" },
  vllm: { title: "vLLM Docs", url: "https://docs.vllm.ai/", provider: "docs" },
  tailwind: { title: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs", provider: "docs" },
  kafka: { title: "Apache Kafka Intro (course)", url: "https://www.youtube.com/results?search_query=apache+kafka+course", provider: "youtube" },
};

export function resourcesForSkill(displaySkill: string): LearningResource[] {
  const key = displaySkill.toLowerCase().trim();
  const direct = CURATED[key];

  const youtubeSearch = encodeURIComponent(`learn ${displaySkill} full course`);
  const webSearch = encodeURIComponent(`${displaySkill} documentation tutorial`);

  const out: LearningResource[] = [];
  if (direct) {
    out.push({ title: direct.title, url: direct.url, provider: direct.provider });
  } else {
    out.push({
      title: `YouTube: ${displaySkill} course`,
      url: `https://www.youtube.com/results?search_query=${youtubeSearch}`,
      provider: "youtube",
    });
    out.push({
      title: `Search: ${displaySkill} docs & tutorials`,
      url: `https://www.google.com/search?q=${webSearch}`,
      provider: "search",
    });
  }

  if (!direct) {
    out.push({
      title: "MDN Web Docs",
      url: `https://developer.mozilla.org/search?q=${encodeURIComponent(displaySkill)}`,
      provider: "docs",
    });
  }

  return out.slice(0, 3);
}