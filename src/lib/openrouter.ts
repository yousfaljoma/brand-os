import { decrypt } from "./encryption";
import { prisma } from "./db";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterChoice {
  message: { content: string; role: string };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  model: string;
}

interface OpenRouterModel {
  id: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
}

async function getApiKey(userId: string): Promise<string> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId, provider: "openrouter" },
    orderBy: { createdAt: "desc" },
  });
  if (!apiKey) throw new Error("OpenRouter API key not found. سجّل مفتاحك في الإعدادات.");
  return decrypt(apiKey.encryptedKey);
}

let cachedModel: string | null = null;
let modelCacheTime = 0;
const MODEL_CACHE_TTL = 1000 * 60 * 60;

const FALLBACK_FREE_MODELS = [
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-001",
  "meta-llama/llama-3.2-3b-instruct",
  "mistralai/mistral-7b-instruct",
];

async function discoverFreeModel(apiKey: string): Promise<string> {
  if (cachedModel && Date.now() - modelCacheTime < MODEL_CACHE_TTL) {
    return cachedModel;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: { data: OpenRouterModel[] } = await res.json();
    const freeModels = (data.data || []).filter((m) => {
      const p = parseFloat(m.pricing.prompt);
      const c = parseFloat(m.pricing.completion);
      return p === 0 && c === 0 && m.context_length > 0;
    });

    if (freeModels.length === 0) {
      cachedModel = FALLBACK_FREE_MODELS[0];
    } else {
      freeModels.sort((a, b) => b.context_length - a.context_length);
      cachedModel = freeModels[0].id;
    }
  } catch {
    cachedModel = FALLBACK_FREE_MODELS[0];
  }

  modelCacheTime = Date.now();
  return cachedModel!;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < maxRetries) {
      const waitSeconds = 5 * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    return response;
  }
  throw new Error("OpenRouter API: استنفذت المحاولات. حاول لاحقاً.");
}

export async function callOpenRouter(
  userId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const apiKey = await getApiKey(userId);
  const model = await discoverFreeModel(apiKey);

  const response = await fetchWithRetry(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${err}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const data = await res.json();
      return { valid: false, error: data.error?.message || "مفتاح API غير صالح" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "تعذّر الاتصال بـ OpenRouter. تحقق من اتصالك بالإنترنت." };
  }
}
