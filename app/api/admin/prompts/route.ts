import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { invalidatePromptCache } from "@/lib/omegabot/prompt-repository";
import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(""),
  content: z.string().min(1),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save-draft"),
    blocks: z.array(blockSchema).min(1),
    note: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("publish"),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("rollback"),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("test"),
    blocks: z.array(blockSchema).min(1),
    input: z.string().trim().min(1).max(6000),
  }),
]);

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });
  if (message === "FORBIDDEN") return NextResponse.json({ error: "Utente non autorizzato." }, { status: 403 });
  console.error("Prompt admin API error", error);
  return NextResponse.json({ error: "Operazione non riuscita." }, { status: 500 });
}

function composePrompt(blocks: z.infer<typeof blockSchema>[]) {
  return blocks
    .filter((block) => block.enabled && block.content.trim())
    .sort((a, b) => a.position - b.position)
    .map((block) => `## ${block.label}\n${block.content.trim()}`)
    .join("\n\n");
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const response = await supabaseAdminFetch(
      "/rest/v1/ai_prompt_versions?select=id,version,status,blocks,note,created_at,published_at&order=version.desc&limit=30",
    );
    if (!response.ok) throw new Error(`Supabase GET ${response.status}`);
    return NextResponse.json({ versions: await response.json() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = requestSchema.parse(await request.json());

    if (body.action === "save-draft") {
      const versionResponse = await supabaseAdminFetch(
        "/rest/v1/ai_prompt_versions?select=version&order=version.desc&limit=1",
      );
      if (!versionResponse.ok) throw new Error(`Supabase version GET ${versionResponse.status}`);
      const latest = (await versionResponse.json()) as Array<{ version: number }>;
      const version = (latest[0]?.version ?? 0) + 1;

      const insertResponse = await supabaseAdminFetch("/rest/v1/ai_prompt_versions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          version,
          status: "draft",
          blocks: body.blocks,
          note: body.note || `Bozza versione ${version}`,
          created_by: admin.id,
        }),
      });
      if (!insertResponse.ok) throw new Error(`Supabase draft POST ${insertResponse.status}`);
      const records = await insertResponse.json();
      return NextResponse.json({ version: records[0] });
    }

    if (body.action === "publish") {
      await supabaseAdminFetch("/rest/v1/ai_prompt_versions?status=eq.published", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "archived" }),
      });
      const publishResponse = await supabaseAdminFetch(`/rest/v1/ai_prompt_versions?id=eq.${body.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "published", published_at: new Date().toISOString() }),
      });
      if (!publishResponse.ok) throw new Error(`Supabase publish PATCH ${publishResponse.status}`);
      invalidatePromptCache();
      const records = await publishResponse.json();
      return NextResponse.json({ version: records[0] });
    }

    if (body.action === "rollback") {
      const sourceResponse = await supabaseAdminFetch(`/rest/v1/ai_prompt_versions?id=eq.${body.id}&select=blocks,note`);
      if (!sourceResponse.ok) throw new Error(`Supabase rollback GET ${sourceResponse.status}`);
      const source = (await sourceResponse.json()) as Array<{ blocks: unknown; note?: string }>;
      if (!source[0]) return NextResponse.json({ error: "Versione non trovata." }, { status: 404 });

      const versionResponse = await supabaseAdminFetch("/rest/v1/ai_prompt_versions?select=version&order=version.desc&limit=1");
      const latest = (await versionResponse.json()) as Array<{ version: number }>;
      const version = (latest[0]?.version ?? 0) + 1;
      const insertResponse = await supabaseAdminFetch("/rest/v1/ai_prompt_versions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          version,
          status: "draft",
          blocks: source[0].blocks,
          note: `Rollback da ${body.id}`,
          created_by: admin.id,
        }),
      });
      if (!insertResponse.ok) throw new Error(`Supabase rollback POST ${insertResponse.status}`);
      const records = await insertResponse.json();
      return NextResponse.json({ version: records[0] });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY non configurata." }, { status: 503 });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 2 });
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const response = await client.responses.create({
      model,
      instructions: composePrompt(body.blocks),
      input: body.input,
    });
    return NextResponse.json({ message: response.output_text?.trim() || "Nessuna risposta.", model });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi.", details: error.flatten() }, { status: 400 });
    }
    return errorResponse(error);
  }
}
