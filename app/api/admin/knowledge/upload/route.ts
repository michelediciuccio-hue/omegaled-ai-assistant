import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSupabaseAdminConfig,
  requireAdmin,
  supabaseAdminFetch,
} from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const BUCKET = "knowledge-base";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const metadataSchema = z.object({
  title: z.string().trim().min(2).max(240),
  category: z.string().trim().min(2).max(120),
  audience: z.enum(["public", "reseller", "installer", "internal"]).default("public"),
  language: z.string().trim().min(2).max(8).default("it"),
  manufacturer: z.string().trim().max(160).optional(),
  versionLabel: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(2000).optional(),
  productSkus: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

type OpenAIFile = { id: string; filename?: string };
type OpenAIVectorFile = { id: string; status?: string };

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[|,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function safeFilename(filename: string) {
  const clean = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || "documento";
}

function sourceTypeFromMime(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("wordprocessingml")) return "docx";
  if (mimeType === "text/csv") return "csv";
  return "manual";
}

async function uploadToSupabase(path: string, file: File) {
  const config = getSupabaseAdminConfig();
  return fetch(`${config.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
    cache: "no-store",
  });
}

async function removeFromSupabase(path: string) {
  const config = getSupabaseAdminConfig();
  await fetch(`${config.url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  }).catch(() => undefined);
}

async function uploadToOpenAI(file: File, apiKey: string): Promise<OpenAIFile> {
  const form = new FormData();
  form.set("purpose", "assistants");
  form.set("file", file, file.name);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_FILE_UPLOAD:${response.status}:${detail.slice(0, 400)}`);
  }

  return response.json() as Promise<OpenAIFile>;
}

async function attachToVectorStore(
  openaiFileId: string,
  vectorStoreId: string,
  apiKey: string,
  attributes: Record<string, string>,
): Promise<OpenAIVectorFile> {
  const response = await fetch(
    `https://api.openai.com/v1/vector_stores/${encodeURIComponent(vectorStoreId)}/files`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({ file_id: openaiFileId, attributes }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_VECTOR_ATTACH:${response.status}:${detail.slice(0, 400)}`);
  }

  return response.json() as Promise<OpenAIVectorFile>;
}

async function removeOpenAIFile(fileId: string, apiKey: string) {
  await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  }).catch(() => undefined);
}

export async function POST(request: Request) {
  let storagePath: string | null = null;
  let openaiFileId: string | null = null;

  try {
    const actor = await requireAdmin(request);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) return jsonError("File mancante.", 400);
    if (!file.name.trim()) return jsonError("Nome file non valido.", 400);
    if (file.size <= 0) return jsonError("Il file è vuoto.", 400);
    if (file.size > MAX_FILE_SIZE) return jsonError("Il file supera il limite di 25 MB.", 413);
    if (!allowedMimeTypes.has(file.type)) return jsonError(`Formato non consentito: ${file.type || "sconosciuto"}.`, 415);

    const metadataResult = metadataSchema.safeParse({
      title: form.get("title"),
      category: form.get("category"),
      audience: form.get("audience") || "public",
      language: form.get("language") || "it",
      manufacturer: form.get("manufacturer") || undefined,
      versionLabel: form.get("versionLabel") || undefined,
      summary: form.get("summary") || undefined,
      productSkus: parseList(form.get("productSkus")),
      tags: parseList(form.get("tags")),
    });

    if (!metadataResult.success) {
      return jsonError("Metadati non validi.", 400, metadataResult.error.flatten());
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    if (!openaiApiKey || !vectorStoreId) {
      return jsonError("OPENAI_API_KEY o OPENAI_VECTOR_STORE_ID non configurata.", 503);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const uniquePart = randomUUID();
    const filename = safeFilename(file.name);
    storagePath = `${new Date().getUTCFullYear()}/${uniquePart}-${filename}`;

    const duplicateResponse = await supabaseAdminFetch(
      `/rest/v1/knowledge_documents?checksum=eq.${checksum}&status=neq.archived&select=id,title&limit=1`,
    );
    if (duplicateResponse.ok) {
      const duplicates = (await duplicateResponse.json()) as Array<{ id: string; title: string }>;
      if (duplicates[0]) {
        return jsonError(`Documento già presente: ${duplicates[0].title}.`, 409);
      }
    }

    const storageResponse = await uploadToSupabase(storagePath, new File([bytes], file.name, { type: file.type }));
    if (!storageResponse.ok) {
      const detail = await storageResponse.text();
      return jsonError("Caricamento su Supabase Storage non riuscito.", 502, detail.slice(0, 400));
    }

    const openaiFile = await uploadToOpenAI(new File([bytes], file.name, { type: file.type }), openaiApiKey);
    openaiFileId = openaiFile.id;

    const metadata = metadataResult.data;
    const vectorFile = await attachToVectorStore(openaiFile.id, vectorStoreId, openaiApiKey, {
      audience: metadata.audience,
      category: metadata.category.slice(0, 512),
      language: metadata.language,
      manufacturer: metadata.manufacturer?.slice(0, 512) || "OmegaLed",
    });

    const slugBase = slugify(metadata.title) || "documento";
    const slug = `${slugBase}-${uniquePart.slice(0, 8)}`;
    const insertResponse = await supabaseAdminFetch("/rest/v1/knowledge_documents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: metadata.title,
        slug,
        category: metadata.category,
        audience: metadata.audience,
        source_type: sourceTypeFromMime(file.type),
        status: "processing",
        language: metadata.language,
        summary: metadata.summary || null,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        version_label: metadata.versionLabel || null,
        manufacturer: metadata.manufacturer || null,
        product_skus: metadata.productSkus,
        tags: metadata.tags,
        checksum,
        openai_file_id: openaiFile.id,
        openai_vector_store_id: vectorStoreId,
        openai_vector_store_file_id: vectorFile.id,
        metadata: { vector_status: vectorFile.status || "in_progress" },
        created_by: actor.id,
        updated_by: actor.id,
      }),
    });

    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      throw new Error(`SUPABASE_DOCUMENT_INSERT:${insertResponse.status}:${detail.slice(0, 400)}`);
    }

    const item = ((await insertResponse.json()) as unknown[])[0];
    await supabaseAdminFetch("/rest/v1/admin_audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: actor.id,
        actor_email: actor.email,
        action: "upload_and_index",
        resource_type: "documents",
        resource_id: (item as { id?: string })?.id || null,
        after_data: item,
      }),
    });

    return NextResponse.json(
      {
        item,
        indexing: {
          status: vectorFile.status || "in_progress",
          vectorStoreFileId: vectorFile.id,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";

    if (openaiFileId && process.env.OPENAI_API_KEY) {
      await removeOpenAIFile(openaiFileId, process.env.OPENAI_API_KEY);
    }
    if (storagePath) await removeFromSupabase(storagePath);

    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);

    console.error("Knowledge upload error", error);
    return jsonError("Caricamento o indicizzazione non riuscita.", 500);
  }
}
