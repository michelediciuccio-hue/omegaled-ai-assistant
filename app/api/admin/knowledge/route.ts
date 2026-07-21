import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(2).max(80),
  source_type: z.enum(["manual", "pdf", "docx", "txt", "url", "faq", "datasheet", "catalog"]),
  audience: z.enum(["public", "reseller", "installer", "internal"]),
  status: z.enum(["draft", "ready", "active", "archived", "error"]),
  description: z.string().max(1000).nullable().optional(),
  body_text: z.string().max(500000).nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  file_name: z.string().max(255).nullable().optional(),
  mime_type: z.string().max(120).nullable().optional(),
  file_size_bytes: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  active: z.boolean().default(false),
});

const updateSchema = baseSchema.partial().extend({ id: z.string().uuid() });

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    let path = "/rest/v1/knowledge_documents?select=*&order=updated_at.desc";
    if (query) {
      const safe = query.replaceAll(",", " ").replaceAll("%", "");
      path += `&or=(title.ilike.*${encodeURIComponent(safe)}*,slug.ilike.*${encodeURIComponent(safe)}*,category.ilike.*${encodeURIComponent(safe)}*)`;
    }
    const response = await supabaseAdminFetch(path);
    if (!response.ok) throw new Error(`Supabase knowledge list ${response.status}: ${await response.text()}`);
    return NextResponse.json({ documents: await response.json() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Knowledge GET error", error);
    return jsonError("Impossibile leggere la Knowledge Base.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = baseSchema.parse(await request.json());
    const response = await supabaseAdminFetch("/rest/v1/knowledge_documents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...body, created_by: admin.email, updated_by: admin.email }),
    });
    if (!response.ok) throw new Error(`Supabase knowledge create ${response.status}: ${await response.text()}`);
    const [document] = await response.json();
    return NextResponse.json({ document }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Dati documento non validi.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Knowledge POST error", error);
    return jsonError("Impossibile creare il documento.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = updateSchema.parse(await request.json());
    const { id, ...changes } = body;
    const currentResponse = await supabaseAdminFetch(`/rest/v1/knowledge_documents?id=eq.${id}&select=*`);
    if (!currentResponse.ok) throw new Error(`Supabase knowledge current ${currentResponse.status}`);
    const [current] = await currentResponse.json();
    if (!current) return jsonError("Documento non trovato.", 404);

    const versionResponse = await supabaseAdminFetch("/rest/v1/knowledge_document_versions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        document_id: current.id,
        version: current.version,
        title: current.title,
        description: current.description,
        body_text: current.body_text,
        source_url: current.source_url,
        storage_bucket: current.storage_bucket,
        storage_path: current.storage_path,
        mime_type: current.mime_type,
        file_name: current.file_name,
        file_size_bytes: current.file_size_bytes,
        checksum: current.checksum,
        tags: current.tags,
        metadata: current.metadata,
        created_by: admin.email,
      }),
    });
    if (!versionResponse.ok && versionResponse.status !== 409) {
      throw new Error(`Supabase knowledge version ${versionResponse.status}: ${await versionResponse.text()}`);
    }

    const response = await supabaseAdminFetch(`/rest/v1/knowledge_documents?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...changes, version: current.version + 1, updated_by: admin.email }),
    });
    if (!response.ok) throw new Error(`Supabase knowledge update ${response.status}: ${await response.text()}`);
    const [document] = await response.json();
    return NextResponse.json({ document }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Dati di modifica non validi.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Knowledge PATCH error", error);
    return jsonError("Impossibile aggiornare il documento.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
    const response = await supabaseAdminFetch(`/rest/v1/knowledge_documents?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    if (!response.ok) throw new Error(`Supabase knowledge delete ${response.status}: ${await response.text()}`);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Identificativo non valido.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Knowledge DELETE error", error);
    return jsonError("Impossibile eliminare il documento.", 500);
  }
}
