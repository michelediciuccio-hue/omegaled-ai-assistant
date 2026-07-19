import { OMEGABOT_SYSTEM_PROMPT } from "@/lib/omegabot/system-prompt";

type PromptBlock = {
  id: string;
  label: string;
  content: string;
  position: number;
  enabled: boolean;
};

type PublishedPromptRecord = {
  id: string;
  version: number;
  blocks: PromptBlock[];
  published_at: string;
};

const PROMPT_CACHE_TTL_MS = 60_000;

let promptCache: {
  value: string;
  version: number | null;
  expiresAt: number;
} | null = null;

function composePrompt(blocks: PromptBlock[]) {
  return blocks
    .filter((block) => block.enabled && block.content.trim())
    .sort((a, b) => a.position - b.position)
    .map((block) => `## ${block.label}\n${block.content.trim()}`)
    .join("\n\n");
}

function getSupabaseConfiguration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

export async function getPublishedSystemPrompt() {
  const now = Date.now();

  if (promptCache && promptCache.expiresAt > now) {
    return {
      prompt: promptCache.value,
      version: promptCache.version,
      source: promptCache.version ? "supabase" : "fallback",
    } as const;
  }

  const config = getSupabaseConfiguration();

  if (!config) {
    promptCache = {
      value: OMEGABOT_SYSTEM_PROMPT,
      version: null,
      expiresAt: now + PROMPT_CACHE_TTL_MS,
    };

    return {
      prompt: OMEGABOT_SYSTEM_PROMPT,
      version: null,
      source: "fallback",
    } as const;
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/ai_prompt_versions?select=id,version,blocks,published_at&status=eq.published&order=version.desc&limit=1`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase prompt request failed with ${response.status}`);
    }

    const records = (await response.json()) as PublishedPromptRecord[];
    const record = records[0];
    const composedPrompt = record ? composePrompt(record.blocks) : "";

    if (!record || !composedPrompt) {
      throw new Error("No valid published prompt found");
    }

    promptCache = {
      value: composedPrompt,
      version: record.version,
      expiresAt: now + PROMPT_CACHE_TTL_MS,
    };

    return {
      prompt: composedPrompt,
      version: record.version,
      source: "supabase",
    } as const;
  } catch (error) {
    console.error("OmegaBot prompt repository fallback", error);

    promptCache = {
      value: OMEGABOT_SYSTEM_PROMPT,
      version: null,
      expiresAt: now + 15_000,
    };

    return {
      prompt: OMEGABOT_SYSTEM_PROMPT,
      version: null,
      source: "fallback",
    } as const;
  }
}

export function invalidatePromptCache() {
  promptCache = null;
}
