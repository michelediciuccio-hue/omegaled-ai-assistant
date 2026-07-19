"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./content-manager.module.css";

type Resource = "products" | "prices" | "documents";
type Item = Record<string, unknown> & { id: string };
const TOKEN_KEY = "omegabot_admin_access_token";

const emptyForms = {
  products: { sku: "", name: "", family: "", category: "", series: "", environment: "indoor", technology: "", short_description: "", technical_notes: "", datasheet_url: "", active: true },
  prices: { product_id: "", audience: "public", price_type: "unit", currency: "EUR", amount: 0, vat_included: false, valid_from: new Date().toISOString().slice(0, 10), valid_until: "", includes: "", excludes: "", note: "", active: true },
  documents: { title: "", slug: "", category: "", audience: "public", source_type: "manual", status: "draft", language: "it", summary: "", content: "", source_url: "", storage_path: "", version_label: "", manufacturer: "", product_skus: "", tags: "" },
} as const;

function cleanPayload(resource: Resource, form: Record<string, unknown>) {
  const data = { ...form } as Record<string, unknown>;
  for (const key of Object.keys(data)) if (data[key] === "") data[key] = null;
  for (const key of ["includes", "excludes", "product_skus", "tags"]) {
    if (key in data) data[key] = String(data[key] ?? "").split("|").map((v) => v.trim()).filter(Boolean);
  }
  if (resource === "prices") data.amount = Number(data.amount ?? 0);
  return data;
}

export default function ContentManagerPage() {
  const [resource, setResource] = useState<Resource>("products");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ ...emptyForms.products });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Accesso richiesto");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (method = "GET", body?: unknown, query = "") => {
    const response = await fetch(`/api/admin/content${query}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Operazione non riuscita");
    return data;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setBusy(true);
      const params = new URLSearchParams({ resource, limit: "200" });
      if (search.trim()) params.set("search", search.trim());
      const data = await api("GET", undefined, `?${params.toString()}`);
      setItems(data.items);
      setStatus(`${data.items.length} elementi caricati`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Errore");
    } finally { setBusy(false); }
  }, [api, resource, search, token]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(TOKEN_KEY) ?? "";
    setToken(stored);
    setStatus(stored ? "Sessione amministratore attiva" : "Accedi prima dal Prompt Studio");
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setSelected(null);
    setForm({ ...(emptyForms[resource] as Record<string, unknown>) });
  }, [resource]);

  const fields = useMemo(() => Object.keys(emptyForms[resource]), [resource]);

  function choose(item: Item) {
    setSelected(item);
    const next = { ...(emptyForms[resource] as Record<string, unknown>) };
    for (const key of Object.keys(next)) {
      const value = item[key];
      next[key] = Array.isArray(value) ? value.join("|") : (value ?? "");
    }
    setForm(next);
  }

  function newItem() {
    setSelected(null);
    setForm({ ...(emptyForms[resource] as Record<string, unknown>) });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true);
      const data = cleanPayload(resource, form);
      if (selected) await api("PATCH", { resource, id: selected.id, data });
      else await api("POST", { resource, data });
      setStatus(selected ? "Elemento aggiornato" : "Elemento creato");
      newItem();
      await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!selected) return;
    try {
      setBusy(true);
      await api("DELETE", { resource, id: selected.id });
      setStatus("Elemento archiviato");
      newItem();
      await load();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Archiviazione non riuscita"); }
    finally { setBusy(false); }
  }

  function renderField(key: string) {
    const value = form[key];
    if (["active", "vat_included"].includes(key)) return <label className={styles.check} key={key}><input type="checkbox" checked={Boolean(value)} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{key}</label>;
    if (["short_description", "technical_notes", "summary", "content", "note"].includes(key)) return <label key={key}>{key}<textarea rows={key === "content" ? 10 : 4} value={String(value ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>;
    if (key === "environment") return <label key={key}>{key}<select value={String(value ?? "indoor")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option>indoor</option><option>outdoor</option><option>vetrina</option><option>ibrido</option></select></label>;
    if (key === "audience") return <label key={key}>{key}<select value={String(value ?? "public")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option value="public">pubblico</option><option value="reseller">rivenditore</option><option value="installer">installatore</option><option value="internal">interno</option></select></label>;
    if (key === "status") return <label key={key}>{key}<select value={String(value ?? "draft")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option value="draft">bozza</option><option value="published">pubblicato</option><option value="archived">archiviato</option><option value="processing">elaborazione</option><option value="error">errore</option></select></label>;
    if (key === "source_type") return <label key={key}>{key}<select value={String(value ?? "manual")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{["manual","pdf","docx","csv","url","faq","procedure","datasheet","case_study"].map(v => <option key={v}>{v}</option>)}</select></label>;
    if (key === "price_type") return <label key={key}>{key}<select value={String(value ?? "unit")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{["unit","square_meter","configuration","starting_from","monthly_rental"].map(v => <option key={v}>{v}</option>)}</select></label>;
    const type = key === "amount" ? "number" : key.includes("valid_") ? "date" : "text";
    return <label key={key}>{key}<input type={type} value={String(value ?? "")} onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })} /></label>;
  }

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span>Ω</span><div><strong>OmegaBot</strong><small>Content Manager</small></div></div>
      <Link href="/admin">Dashboard</Link>
      <Link href="/admin/prompt-studio">Prompt Studio</Link>
      <Link href="/admin/catalog-import">Import CSV</Link>
      <Link href="/admin/content-manager" className={styles.active}>Content Manager</Link>
    </aside>
    <section className={styles.workspace}>
      <header className={styles.header}><div><p>OmegaLed AI Platform</p><h1>Contenuti e catalogo</h1><span>{status}</span></div><button onClick={newItem}>+ Nuovo</button></header>
      {!token && <div className={styles.notice}>Accedi dal Prompt Studio. La sessione amministratore viene condivisa nella stessa scheda.</div>}
      <nav className={styles.tabs}>{(["products","prices","documents"] as Resource[]).map((r) => <button key={r} className={resource === r ? styles.tabActive : ""} onClick={() => setResource(r)}>{r}</button>)}</nav>
      <div className={styles.grid}>
        <section className={styles.listPanel}>
          <div className={styles.search}><input placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} /><button onClick={() => void load()} disabled={busy}>Cerca</button></div>
          <div className={styles.list}>{items.map((item) => <button key={item.id} className={selected?.id === item.id ? styles.selected : ""} onClick={() => choose(item)}><strong>{String(item.name ?? item.title ?? item.sku ?? item.id)}</strong><span>{String(item.sku ?? item.category ?? item.audience ?? "")}</span></button>)}</div>
        </section>
        <form className={styles.editor} onSubmit={save}>
          <div className={styles.editorTitle}><div><p>{selected ? "Modifica" : "Nuovo elemento"}</p><h2>{selected ? String(selected.name ?? selected.title ?? selected.sku) : resource}</h2></div>{selected && <button type="button" className={styles.danger} onClick={archive}>Archivia</button>}</div>
          <div className={styles.formGrid}>{fields.map(renderField)}</div>
          <div className={styles.actions}><button type="button" onClick={newItem}>Annulla</button><button type="submit" disabled={busy || !token}>{busy ? "Salvataggio..." : "Salva"}</button></div>
        </form>
      </div>
    </section>
  </main>;
}
