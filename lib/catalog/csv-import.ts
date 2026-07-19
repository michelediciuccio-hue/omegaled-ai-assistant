import { z } from "zod";

export type ImportKind = "products" | "prices";
export type ImportIssue = { row: number; field?: string; message: string };

const environments = ["indoor", "outdoor", "vetrina", "ibrido"] as const;
const availability = ["in_stock", "on_order", "limited", "unavailable", "unknown"] as const;
const audiences = ["public", "reseller", "installer", "internal"] as const;
const priceTypes = ["unit", "square_meter", "configuration", "starting_from", "monthly_rental"] as const;

const productSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  family: z.string().trim().min(1),
  category: z.string().trim().min(1),
  series: z.string().trim().optional(),
  environment: z.enum(environments).optional(),
  technology: z.string().trim().optional(),
  pixel_pitch_mm: z.number().nonnegative().optional(),
  brightness_nits: z.number().int().nonnegative().optional(),
  refresh_rate_hz: z.number().int().nonnegative().optional(),
  ip_rating: z.string().trim().optional(),
  width_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
  depth_mm: z.number().int().positive().optional(),
  weight_kg: z.number().nonnegative().optional(),
  average_power_w: z.number().nonnegative().optional(),
  max_power_w: z.number().nonnegative().optional(),
  resolution_width: z.number().int().positive().optional(),
  resolution_height: z.number().int().positive().optional(),
  maintenance_access: z.string().trim().optional(),
  controller_compatibility: z.array(z.string()),
  player_compatibility: z.array(z.string()),
  required_accessories: z.array(z.string()),
  optional_accessories: z.array(z.string()),
  warranty_months: z.number().int().nonnegative().optional(),
  availability_status: z.enum(availability),
  lead_time_note: z.string().trim().optional(),
  short_description: z.string().trim().optional(),
  technical_notes: z.string().trim().optional(),
  datasheet_url: z.string().url().optional(),
  image_urls: z.array(z.string().url()),
  video_urls: z.array(z.string().url()),
  active: z.boolean(),
});

const priceSchema = z.object({
  sku: z.string().trim().min(1),
  audience: z.enum(audiences),
  price_type: z.enum(priceTypes),
  currency: z.string().trim().length(3),
  amount: z.number().nonnegative(),
  vat_included: z.boolean(),
  min_quantity: z.number().nonnegative().optional(),
  max_quantity: z.number().nonnegative().optional(),
  valid_from: z.string().date(),
  valid_until: z.string().date().optional(),
  includes: z.array(z.string()),
  excludes: z.array(z.string()),
  note: z.string().trim().optional(),
  active: z.boolean(),
}).superRefine((value, context) => {
  if (value.max_quantity !== undefined && value.min_quantity !== undefined && value.max_quantity < value.min_quantity) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["max_quantity"], message: "Deve essere maggiore o uguale alla quantità minima." });
  }
  if (value.valid_until && value.valid_until < value.valid_from) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["valid_until"], message: "Non può precedere valid_from." });
  }
});

export const PRODUCT_HEADERS = [
  "sku","name","family","category","series","environment","technology","pixel_pitch_mm","brightness_nits","refresh_rate_hz","ip_rating","width_mm","height_mm","depth_mm","weight_kg","average_power_w","max_power_w","resolution_width","resolution_height","maintenance_access","controller_compatibility","player_compatibility","required_accessories","optional_accessories","warranty_months","availability_status","lead_time_note","short_description","technical_notes","datasheet_url","image_urls","video_urls","active",
];

export const PRICE_HEADERS = [
  "sku","audience","price_type","currency","amount","vat_included","min_quantity","max_quantity","valid_from","valid_until","includes","excludes","note","active",
];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (quoted) throw new Error("CSV_NON_VALIDO: virgolette non chiuse.");
  return rows;
}

function optionalString(value: string) { const clean = value.trim(); return clean || undefined; }
function optionalNumber(value: string) { const clean = value.trim().replace(",", "."); return clean ? Number(clean) : undefined; }
function requiredNumber(value: string) { return Number(value.trim().replace(",", ".")); }
function booleanValue(value: string) { return ["true", "1", "si", "sì", "yes"].includes(value.trim().toLowerCase()); }
function listValue(value: string) { return value.split("|").map((item) => item.trim()).filter(Boolean); }
function optionalUrl(value: string) { return optionalString(value); }

function recordsFromRows(rows: string[][], expectedHeaders: string[]) {
  if (rows.length < 2) throw new Error("CSV_VUOTO: il file deve contenere intestazione e almeno una riga.");
  const headers = rows[0].map((header) => header.trim());
  const missing = expectedHeaders.filter((header) => !headers.includes(header));
  const extra = headers.filter((header) => !expectedHeaders.includes(header));
  if (missing.length || extra.length) {
    throw new Error(`INTESTAZIONI_NON_VALIDE: mancanti [${missing.join(", ")}], sconosciute [${extra.join(", ")}].`);
  }
  return rows.slice(1).map((values, index) => ({
    rowNumber: index + 2,
    record: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""])),
  }));
}

export function validateImport(kind: ImportKind, csv: string) {
  const expected = kind === "products" ? PRODUCT_HEADERS : PRICE_HEADERS;
  const source = recordsFromRows(parseCsv(csv), expected);
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  const validRows: Array<Record<string, unknown>> = [];

  for (const { rowNumber, record } of source) {
    const normalized = kind === "products" ? {
      sku: record.sku.trim(), name: record.name.trim(), family: record.family.trim(), category: record.category.trim(),
      series: optionalString(record.series), environment: optionalString(record.environment), technology: optionalString(record.technology),
      pixel_pitch_mm: optionalNumber(record.pixel_pitch_mm), brightness_nits: optionalNumber(record.brightness_nits), refresh_rate_hz: optionalNumber(record.refresh_rate_hz),
      ip_rating: optionalString(record.ip_rating), width_mm: optionalNumber(record.width_mm), height_mm: optionalNumber(record.height_mm), depth_mm: optionalNumber(record.depth_mm),
      weight_kg: optionalNumber(record.weight_kg), average_power_w: optionalNumber(record.average_power_w), max_power_w: optionalNumber(record.max_power_w),
      resolution_width: optionalNumber(record.resolution_width), resolution_height: optionalNumber(record.resolution_height), maintenance_access: optionalString(record.maintenance_access),
      controller_compatibility: listValue(record.controller_compatibility), player_compatibility: listValue(record.player_compatibility),
      required_accessories: listValue(record.required_accessories), optional_accessories: listValue(record.optional_accessories), warranty_months: optionalNumber(record.warranty_months),
      availability_status: record.availability_status.trim() || "unknown", lead_time_note: optionalString(record.lead_time_note), short_description: optionalString(record.short_description),
      technical_notes: optionalString(record.technical_notes), datasheet_url: optionalUrl(record.datasheet_url), image_urls: listValue(record.image_urls), video_urls: listValue(record.video_urls), active: booleanValue(record.active),
    } : {
      sku: record.sku.trim(), audience: record.audience.trim(), price_type: record.price_type.trim(), currency: record.currency.trim().toUpperCase(), amount: requiredNumber(record.amount),
      vat_included: booleanValue(record.vat_included), min_quantity: optionalNumber(record.min_quantity), max_quantity: optionalNumber(record.max_quantity), valid_from: record.valid_from.trim(),
      valid_until: optionalString(record.valid_until), includes: listValue(record.includes), excludes: listValue(record.excludes), note: optionalString(record.note), active: booleanValue(record.active),
    };

    const key = kind === "products" ? String(normalized.sku).toUpperCase() : `${String(normalized.sku).toUpperCase()}|${normalized.audience}|${normalized.price_type}|${normalized.valid_from}`;
    if (seen.has(key)) issues.push({ row: rowNumber, field: "sku", message: "Riga duplicata nel file." });
    seen.add(key);

    const result = (kind === "products" ? productSchema : priceSchema).safeParse(normalized);
    if (!result.success) {
      for (const issue of result.error.issues) issues.push({ row: rowNumber, field: issue.path.join("."), message: issue.message });
    } else {
      validRows.push(result.data as unknown as Record<string, unknown>);
    }
  }

  return { totalRows: source.length, validRows, issues, isValid: issues.length === 0 && validRows.length === source.length };
}
