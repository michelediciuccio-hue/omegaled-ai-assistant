import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const channelSchema = z.enum(["website", "whatsapp"]);
const settingsSchema = z.object({
  channel: channelSchema,
  display_name: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(2).max(180),
  subheadline: z.string().trim().min(2).max(500),
  welcome_message: z.string().trim().min(2).max(1500),
  input_placeholder: z.string().trim().min(1).max(180),
  submit_label: z.string().trim().min(1).max(80),
  handoff_message: z.string().trim().min(2).max(1500),
  quick_actions: z.array(z.string().trim().min(1).max(120)).max(12),
  enabled: z.boolean(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const response = await supabaseAdminFetch(
      "/rest/v1/concierge_channel_settings?select=*&order=channel.asc",
    );
    if (!response.ok) throw new Error(`Supabase concierge list ${response.status}: ${await response.text()}`);
    return NextResponse.json({ settings: await response.json() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Concierge settings GET error", error);
    return jsonError("Impossibile leggere le impostazioni Concierge.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = settingsSchema.parse(await request.json());
    const response = await supabaseAdminFetch(
      `/rest/v1/concierge_channel_settings?channel=eq.${body.channel}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ ...body, updated_at: new Date().toISOString(), updated_by: admin.email }),
      },
    );
    if (!response.ok) throw new Error(`Supabase concierge update ${response.status}: ${await response.text()}`);
    const [settings] = await response.json();
    return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Testi o impostazioni non validi.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Concierge settings PUT error", error);
    return jsonError("Impossibile salvare le impostazioni Concierge.", 500);
  }
}
