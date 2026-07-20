import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productSchema = z.object({
  sku: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(240),
  family: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  series: z.string().trim().max(120).nullable().optional(),
  environment: z.enum(["indoor", "outdoor", "vetrina", "ibrido"]).nullable().optional(),
  technology: z.string().trim().max(120).nullable().optional(),
  pixel_pitch_mm: z.number().nonnegative().nullable().optional(),
  brightness_nits: z.number().int().nonnegative().nullable().optional(),
  refresh_rate_hz: z.number().int().nonnegative().nullable().optional(),
  ip_rating: z.string().trim().max(40).nullable().optional(),
  short_description: z.string().trim().max(2000).nullable().optional(),
  technical_notes: z.string().trim().max(10000).nullable().optional(),
  availability_status: z.enum(["in_stock", "on_order", "limited", "unavailable", "unknown"]).default("unknown"),
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
  note: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().default(true),
});

const writeSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("product"), id: z.string().uuid().optional(), data: productSchema }),
  z.object({ entity: z.literal("price"), id: z.string().uuid().optional(), data: priceSchema }),
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function parseJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const encodedQuery = encodeURIComponent(`*${query.replaceAll("*", "")}*`);
    const filter = query ? `&or=(sku.ilike.${encodedQuery},name.ilike.${encodedQuery},family.ilike.${encodedQuery},category.ilike.${encodedQuery})` : "";

    const [productsResponse, pricesResponse] = await Promise.all([
      supabaseAdminFetch(`/rest/v1/catalog_products?select=*&order=updated_at.desc&limit=300${filter}`),
      supabaseAdminFetch("/rest/v1/catalog_prices?select=*&order=updated_at.desc&limit=1000"),
    ]);

    if (!productsResponse.ok || !pricesResponse.ok) {
      throw new Error(`Supabase catalog read failed: ${productsResponse.status}/${pricesResponse.status}`);
    }

    return NextResponse.json({
      products: await parseJson(productsResponse),
      prices: await parseJson(pricesResponse),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Catalog GET error", error);
    return jsonError("Impossibile caricare il catalogo.", 500);
  }
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PATCH(request: Request) {
  return save(request, true);
}

async function save(request: Request, editing: boolean) {
  try {
    const admin = await requireAdmin(request);
    const body = writeSchema.parse(await request.json());
    if (editing && !body.id) return jsonError("ID mancante.", 400);

    const table = body.entity === "product" ? "catalog_products" : "catalog_prices";
    const path = editing ? `/rest/v1/${table}?id=eq.${body.id}` : `/rest/v1/${table}`;
    const response = await supabaseAdminFetch(path, {
      method: editing ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body.data),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 409) return jsonError("Esiste già un elemento con questi dati univoci.", 409);
      throw new Error(`Supabase catalog write ${response.status}: ${detail}`);
    }

    return NextResponse.json({ saved: await parseJson(response), performedBy: admin.email }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Dati non validi. Controlla i campi obbligatori e i formati.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Catalog save error", error);
    return jsonError("Salvataggio non riuscito.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const body = z.object({ entity: z.enum(["product", "price"]), id: z.string().uuid() }).parse(await request.json());
    const table = body.entity === "product" ? "catalog_products" : "catalog_prices";
    const response = await supabaseAdminFetch(`/rest/v1/${table}?id=eq.${body.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Supabase catalog delete ${response.status}: ${await response.text()}`);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Richiesta di eliminazione non valida.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    console.error("Catalog delete error", error);
    return jsonError("Eliminazione non riuscita.", 500);
  }
}
