import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

export const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export const isAIEnabled = () => Boolean(process.env.GROQ_API_KEY);

let _client: Groq | null = null;
function client(): Groq {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

function extractJson(raw: string): unknown | null {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface CompleteOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

async function complete(options: CompleteOptions): Promise<string | null> {
  if (!isAIEnabled()) return null;
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ];
  try {
    const res = await client().chat.completions.create({
      model: MODEL,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 1200,
    });
    return res.choices[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[groq] completion failed:", err);
    return null;
  }
}

export async function completeJSON<T>(
  options: CompleteOptions,
): Promise<T | null> {
  const raw = await complete({
    ...options,
    system: `${options.system}\n\nAlways respond with a single valid JSON object only — no markdown fences, no commentary.`,
    temperature: 0.2,
  });
  if (!raw) return null;
  return extractJson(raw) as T | null;
}

export async function completeText(options: CompleteOptions): Promise<string | null> {
  return complete({ ...options, temperature: options.temperature ?? 0.7 });
}

export async function* streamText(options: CompleteOptions): AsyncGenerator<string> {
  if (!isAIEnabled()) return;
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ];
  try {
    const stream = await client().chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: options.maxTokens ?? 1200,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (err) {
    console.error("[groq] stream failed:", err);
  }
}