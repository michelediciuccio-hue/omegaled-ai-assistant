import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, supabaseAdminFetch } from "@/lib/admin/supabase-admin";
import { validateImport } from "@/lib/catalog/csv-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mode: z.enum(["preview", "commit"]),
  kind: z.enum(["products", "prices"]),
  csv: z.string().min(1).max(5_000_000),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function importProducts(rows: Array<Record<string, unknown>>) {
  const response = await supabaseAdminFetch("/rest/v1/catalog_products?on_conflict=sku", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase products import ${response.status}: ${await response.text()}`);
  return (await response.json()) as Array<{ id: string; sku: string }>;
}

async function importPrices(rows: Array<Record<string, unknown>>) {
  const skus = [...new Set(rows.map((row) => String(row.sku)))];
  const encoded = encodeURIComponent(`(${skus.map((sku) => `"${sku.replaceAll('"', '\\"')}"`).join(",")})`);
  const productResponse = await supabaseAdminFetch(`/rest/v1/catalog_products?select=id,sku&sku=in.${encoded}`);
  if (!productResponse.ok) throw new Error(`Supabase product lookup ${productResponse.status}`);
  const products = (await productResponse.json()) as Array<{ id: string; sku: string }>;
  const productMap = new Map(products.map((product) => [product.sku, product.id]));
  const missingSkus = skus.filter((sku) => !productMap.has(sku));
  if (missingSkus.length) throw new Error(`SKU_NON_TROVATI: ${missingSkus.join(", ")}`);

  const payload = rows.map(({ sku, ...row }) => ({ ...row, product_id: productMap.get(String(sku)) }));
  const response = await supabaseAdminFetch("/rest/v1/catalog_prices", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase prices import ${response.status}: ${await response.text()}`);
  return (await response.json()) as Array<{ id: string }>;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = requestSchema.parse(await request.json());
    const validation = validateImport(body.kind, body.csv);

    if (body.mode === "preview" || !validation.isValid) {
      return NextResponse.json({
        mode: "preview",
        kind: body.kind,
        totalRows: validation.totalRows,
        validRows: validation.validRows.length,
        issues: validation.issues,
        canCommit: validation.isValid,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const imported = body.kind === "products"
      ? await importProducts(validation.validRows)
      : await importPrices(validation.validRows);

    return NextResponse.json({
      mode: "commit",
      kind: body.kind,
      importedRows: imported.length,
      performedBy: admin.email,
      importedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError("Richiesta di importazione non valida.", 400);
    const message = error instanceof Error ? error.message : "Operazione non riuscita.";
    if (message === "UNAUTHORIZED") return jsonError("Accesso richiesto.", 401);
    if (message === "FORBIDDEN") return jsonError("Utente non autorizzato.", 403);
    if (message.startsWith("CSV_") || message.startsWith("INTESTAZIONI_") || message.startsWith("SKU_NON_TROVATI")) return jsonError(message, 422);
    console.error("Catalog import error", error);
    return jsonError("Importazione non riuscita. Nessun dato è stato scritto parzialmente dal validatore.", 500);
  }
}
