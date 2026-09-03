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
  const candidates: string[] = [];
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) candidates.push(fenced[1]);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  }

  for (const candidate of candidates) {
    for (const attempt of [candidate, repairJson(candidate)]) {
      if (!attempt) continue;
      const s = attempt.indexOf("{");
      const en = attempt.lastIndexOf("}");
      if (s < 0 || en <= s) continue;
      try {
        return JSON.parse(attempt.slice(s, en + 1));
      } catch {
        // try next
      }
    }
  }
  return null;
}

function repairJson(raw: string): string {
  return raw
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\\(?!["\\/bfnrtu])/g, "");
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
  const maxTries = 4;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      const res = await client().chat.completions.create({
        model: MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200,
      });
      return res.choices[0]?.message?.content ?? null;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      const rateLimited = status === 429 || /rate\s*limit|tokens.*per\s*minute|\b429\b/i.test(message);
      const isLastTry = attempt === maxTries - 1;
      if (rateLimited && !isLastTry) {
        const backoff = 1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
        console.warn(`[groq] rate limited, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxTries})`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      console.error("[groq] completion failed:", err);
      return null;
    }
  }
  return null;
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
  const parsed = extractJson(raw) as T | null;
  if (parsed === null) {
    try {
      const s = raw.indexOf("{");
      const en = raw.lastIndexOf("}");
      JSON.parse(raw.slice(s, en + 1));
    } catch (e) {
      console.error("[groq] JSON parse failed:", (e as Error).message);
    }
  }
  return parsed;
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