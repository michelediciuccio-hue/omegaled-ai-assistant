import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ documentId: z.string().uuid() });

type KnowledgeDocument = {
  id: string;
  status: "draft" | "published" | "archived" | "processing" | "error";
  openai_vector_store_id: string | null;
  openai_vector_store_file_id: string | null;
};

type VectorFileStatus = {
  id: string;
  status?: "in_progress" | "completed" | "cancelled" | "failed";
  last_error?: { code?: string; message?: string } | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const { documentId } = bodySchema.parse(await request.json());

    const documentResponse = await supabaseAdminFetch(
      `/rest/v1/knowledge_documents?id=eq.${documentId}&select=id,status,openai_vector_store_id,openai_vector_store_file_id`,
    );
    if (!documentResponse.ok) return jsonError("Lettura documento non riuscita.", 502);

    const document = ((await documentResponse.json()) as KnowledgeDocument[])[0];
    if (!document) return jsonError("Documento non trovato.", 404);
    if (!document.openai_vector_store_id || !document.openai_vector_store_file_id) {
      return jsonError("Documento non collegato a un indice OpenAI.", 409);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return jsonError("OPENAI_API_KEY non configurata.", 503);

    const statusResponse = await fetch(
      `https://api.openai.com/v1/vector_stores/${encodeURIComponent(document.openai_vector_store_id)}/files/${encodeURIComponent(document.openai_vector_store_file_id)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
        cache: "no-store",
      },
    );

    if (!statusResponse.ok) return jsonError("Controllo indicizzazione OpenAI non riuscito.", 502);
    const vectorFile = (await statusResponse.json()) as VectorFileStatus;

    const nextStatus = vectorFile.status === "completed"
      ? "published"
      : vectorFile.status === "failed" || vectorFile.status === "cancelled"
        ? "error"
        : "processing";

    const indexingError = vectorFile.last_error?.message || vectorFile.last_error?.code || null;
    const now = new Date().toISOString();
    const updateResponse = await supabaseAdminFetch(`/rest/v1/knowledge_documents?id=eq.${document.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: nextStatus,
        indexed_at: nextStatus === "published" ? now : null,
        published_at: nextStatus === "published" ? now : null,
        indexing_error: indexingError,
        metadata: { vector_status: vectorFile.status || "unknown" },
        updated_by: actor.id,
        updated_at: now,
      }),
    });

    if (!updateResponse.ok) return jsonError("Aggiornamento stato non riuscito.", 502);
    const item = ((await updateResponse.json()) as unknown[])[0];

    await supabaseAdminFetch("/rest/v1/admin_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: actor.id,
        actor_email: actor.email,
        action: "sync_index_status",
        resource_type: "documents",
        resource_id: document.id,
        before_data: { status: document.status },
        after_data: { status: nextStatus, vector_status: vectorFile.status, indexing_error: indexingError },
      }),
    });

    return NextResponse.json(
      { item, indexing: { status: vectorFile.status || "unknown", error: indexingError } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Dati non validi.", 400);
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Knowledge status error", error);
    return jsonError("Operazione non riuscita.", 500);
  }
}
