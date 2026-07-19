import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resourceSchema = z.enum(["products", "prices", "documents"]);

const productSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(240),
  family: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  series: z.string().trim().max(120).nullable().optional(),
  environment: z.enum(["indoor", "outdoor", "vetrina", "ibrido"]).nullable().optional(),
  technology: z.string().trim().max(120).nullable().optional(),
  short_description: z.string().trim().max(1200).nullable().optional(),
  technical_notes: z.string().trim().max(6000).nullable().optional(),
  datasheet_url: z.string().url().nullable().optional(),
  active: z.boolean().default(true),
});

const priceSchema = z.object({
  product_id: z.string().uuid(),
  audience: z.enum(["public", "reseller", "installer", "internal"]),
  price_type: z.enum(["unit", "square_meter", "configuration", "starting_from", "monthly_rental"]),
  currency: z.string().trim().length(3).default("EUR"),
  amount: z.number().nonnegative(),
  vat_included: z.boolean().default(false),
  valid_from: z.string().date(),
  valid_until: z.string().date().nullable().optional(),
  includes: z.array(z.string().trim()).default([]),
  excludes: z.array(z.string().trim()).default([]),
  note: z.string().trim().max(1200).nullable().optional(),
  active: z.boolean().default(true),
});

const documentSchema = z.object({
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(1).max(120),
  audience: z.enum(["public", "reseller", "installer", "internal"]).default("public"),
  source_type: z.enum(["manual", "pdf", "docx", "csv", "url", "faq", "procedure", "datasheet", "case_study"]),
  status: z.enum(["draft", "published", "archived", "processing", "error"]).default("draft"),
  language: z.string().trim().min(2).max(8).default("it"),
  summary: z.string().trim().max(2000).nullable().optional(),
  content: z.string().max(200000).nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  storage_path: z.string().trim().max(1000).nullable().optional(),
  version_label: z.string().trim().max(120).nullable().optional(),
  manufacturer: z.string().trim().max(160).nullable().optional(),
  product_skus: z.array(z.string().trim()).default([]),
  tags: z.array(z.string().trim()).default([]),
});

const createSchema = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("products"), data: productSchema }),
  z.object({ resource: z.literal("prices"), data: priceSchema }),
  z.object({ resource: z.literal("documents"), data: documentSchema }),
]);

const updateSchema = z.object({
  resource: resourceSchema,
  id: z.string().uuid(),
  data: z.record(z.unknown()),
});

const deleteSchema = z.object({
  resource: resourceSchema,
  id: z.string().uuid(),
});

const tableByResource = {
  products: "catalog_products",
  prices: "catalog_prices",
  documents: "knowledge_documents",
} as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function writeAudit(actor: { id: string; email: string }, action: string, resource: string, resourceId: string, beforeData: unknown, afterData: unknown) {
  await supabaseAdminFetch("/rest/v1/admin_audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      resource_type: resource,
      resource_id: resourceId,
      before_data: beforeData,
      after_data: afterData,
    }),
  });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const resource = resourceSchema.parse(url.searchParams.get("resource"));
    const search = (url.searchParams.get("search") ?? "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 250);
    const table = tableByResource[resource];

    const filters = new URLSearchParams();
    filters.set("select", "*");
    filters.set("order", "updated_at.desc");
    filters.set("limit", String(limit));

    if (search) {
      const escaped = search.replace(/[,%()]/g, " ").trim();
      if (resource === "products") filters.set("or", `(sku.ilike.*${escaped}*,name.ilike.*${escaped}*,family.ilike.*${escaped}*)`);
      if (resource === "documents") filters.set("or", `(title.ilike.*${escaped}*,category.ilike.*${escaped}*,summary.ilike.*${escaped}*)`);
    }

    const response = await supabaseAdminFetch(`/rest/v1/${table}?${filters.toString()}`);
    if (!response.ok) return jsonError(`Lettura ${resource} non riuscita.`, 502);
    return NextResponse.json({ items: await response.json() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    if (error instanceof z.ZodError) return jsonError("Parametri non validi.", 400);
    console.error("Admin content GET error", error);
    return jsonError("Operazione non riuscita.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = createSchema.parse(await request.json());
    const table = tableByResource[body.resource];
    const payload = {
      ...body.data,
      ...(body.resource === "documents" ? { created_by: actor.id, updated_by: actor.id } : {}),
    };

    const response = await supabaseAdminFetch(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return jsonError(`Creazione ${body.resource} non riuscita.`, 502);
    const records = await response.json();
    const item = records[0];
    await writeAudit(actor, "create", body.resource, item.id, null, item);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dati non validi.", details: error.flatten() }, { status: 400 });
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Admin content POST error", error);
    return jsonError("Operazione non riuscita.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = updateSchema.parse(await request.json());
    const table = tableByResource[body.resource];
    const currentResponse = await supabaseAdminFetch(`/rest/v1/${table}?id=eq.${body.id}&select=*`);
    const current = ((await currentResponse.json()) as unknown[])[0];
    if (!current) return jsonError("Elemento non trovato.", 404);

    const schema = body.resource === "products" ? productSchema.partial() : body.resource === "prices" ? priceSchema.partial() : documentSchema.partial();
    const data = schema.parse(body.data);
    const payload = {
      ...data,
      updated_at: new Date().toISOString(),
      ...(body.resource === "documents" ? { updated_by: actor.id } : {}),
    };

    const response = await supabaseAdminFetch(`/rest/v1/${table}?id=eq.${body.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return jsonError(`Aggiornamento ${body.resource} non riuscito.`, 502);
    const item = (await response.json())[0];
    await writeAudit(actor, "update", body.resource, body.id, current, item);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dati non validi.", details: error.flatten() }, { status: 400 });
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Admin content PATCH error", error);
    return jsonError("Operazione non riuscita.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const body = deleteSchema.parse(await request.json());
    const table = tableByResource[body.resource];
    const currentResponse = await supabaseAdminFetch(`/rest/v1/${table}?id=eq.${body.id}&select=*`);
    const current = ((await currentResponse.json()) as unknown[])[0];
    if (!current) return jsonError("Elemento non trovato.", 404);

    const softDeletePayload = body.resource === "documents"
      ? { status: "archived", updated_by: actor.id, updated_at: new Date().toISOString() }
      : { active: false, updated_at: new Date().toISOString() };

    const response = await supabaseAdminFetch(`/rest/v1/${table}?id=eq.${body.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(softDeletePayload),
    });
    if (!response.ok) return jsonError("Archiviazione non riuscita.", 502);
    const item = (await response.json())[0];
    await writeAudit(actor, "archive", body.resource, body.id, current, item);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Dati non validi.", 400);
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Admin content DELETE error", error);
    return jsonError("Operazione non riuscita.", 500);
  }
}