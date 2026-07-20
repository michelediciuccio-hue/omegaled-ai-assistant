"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./knowledge-base.module.css";

type DocumentRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  source_type: string;
  audience: string;
  status: string;
  description: string | null;
  body_text: string | null;
  source_url: string | null;
  tags: string[];
  active: boolean;
  version: number;
  updated_at: string;
};

type FormState = {
  id?: string;
  title: string;
  slug: string;
  category: string;
  source_type: "manual" | "pdf" | "docx" | "txt" | "url" | "faq" | "datasheet" | "catalog";
  audience: "public" | "reseller" | "installer" | "internal";
  status: "draft" | "ready" | "active" | "archived" | "error";
  description: string;
  body_text: string;
  source_url: string;
  tags: string;
  active: boolean;
};

type KnowledgeResponse = {
  documents?: DocumentRow[];
  document?: DocumentRow;
  deleted?: boolean;
  error?: string;
};

const TOKEN_KEY = "omegabot_admin_access_token";
const emptyForm: FormState = {
  title: "",
  slug: "",
  category: "generale",
  source_type: "manual",
  audience: "public",
  status: "draft",
  description: "",
  body_text: "",
  source_url: "",
  tags: "",
  active: false,
};

function normalizeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Caricamento archivio…");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit): Promise<KnowledgeResponse> => {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Accedi prima dal Prompt Studio.");

    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const data = await response.json() as KnowledgeResponse;
    if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
    return data;
  }, []);

  const load = useCallback(async (searchQuery = "") => {
    try {
      setBusy(true);
      const data = await request(`/api/admin/knowledge${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
      const loadedDocuments = data.documents || [];
      setDocuments(loadedDocuments);
      setStatus(`${loadedDocuments.length} documenti disponibili.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Errore di caricamento.");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    total: documents.length,
    active: documents.filter((item) => item.active && item.status === "active").length,
    draft: documents.filter((item) => item.status === "draft").length,
    internal: documents.filter((item) => item.audience === "internal").length,
  }), [documents]);

  function edit(document: DocumentRow) {
    setForm({
      id: document.id,
      title: document.title,
      slug: document.slug,
      category: document.category,
      source_type: document.source_type as FormState["source_type"],
      audience: document.audience as FormState["audience"],
      status: document.status as FormState["status"],
      description: document.description || "",
      body_text: document.body_text || "",
      source_url: document.source_url || "",
      tags: document.tags?.join(", ") || "",
      active: document.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy(true);
      setStatus(form.id ? "Aggiornamento documento…" : "Creazione documento…");
      const payload = {
        ...form,
        slug: form.slug || normalizeSlug(form.title),
        description: form.description || null,
        body_text: form.body_text || null,
        source_url: form.source_url || null,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      const method = form.id ? "PATCH" : "POST";
      await request("/api/admin/knowledge", { method, body: JSON.stringify(payload) });
      setForm(emptyForm);
      setStatus("Documento salvato correttamente.");
      await load(query);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Eliminare definitivamente questo documento e tutte le versioni?")) return;
    try {
      setBusy(true);
      await request("/api/admin/knowledge", { method: "DELETE", body: JSON.stringify({ id }) });
      if (form.id === id) setForm(emptyForm);
      setStatus("Documento eliminato.");
      await load(query);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eliminazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div>Ω</div><span><strong>OmegaBot</strong><small>Control Center</small></span></div>
        <nav><p>Workspace</p><Link href="/admin">⌂ Dashboard</Link><Link href="/admin/prompt-studio">✦ Prompt Studio</Link><Link href="/admin/knowledge-base" className={styles.active}>▤ Knowledge Base</Link><Link href="/admin/catalog-import">◇ Catalogo & Import</Link></nav>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div><p>OmegaLed Knowledge Control</p><h1>Knowledge Base</h1><span>Archivio documentale amministrabile. Nessun contenuto viene usato dal bot finché non sarà collegato in una fase successiva.</span></div>
          <Link href="/admin" className={styles.back}>Torna alla Dashboard</Link>
        </header>

        <div className={styles.status}>{status}</div>

        <section className={styles.metrics}>
          <article><span>Totale</span><strong>{counts.total}</strong></article>
          <article><span>Attivi</span><strong>{counts.active}</strong></article>
          <article><span>Bozze</span><strong>{counts.draft}</strong></article>
          <article><span>Interni</span><strong>{counts.internal}</strong></article>
        </section>

        <section className={styles.layout}>
          <form className={styles.editor} onSubmit={save}>
            <div className={styles.panelHeader}><div><span>{form.id ? "MODIFICA" : "NUOVO"}</span><h2>{form.id ? "Modifica documento" : "Crea documento"}</h2></div>{form.id && <button type="button" onClick={() => setForm(emptyForm)}>Nuovo</button>}</div>
            <div className={styles.formGrid}>
              <label className={styles.full}>Titolo<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: form.id ? form.slug : normalizeSlug(event.target.value) })} required /></label>
              <label>Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: normalizeSlug(event.target.value) })} required /></label>
              <label>Categoria<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></label>
              <label>Tipo<select value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value as FormState["source_type"] })}><option value="manual">Testo manuale</option><option value="pdf">PDF</option><option value="docx">Word</option><option value="txt">Testo</option><option value="url">URL</option><option value="faq">FAQ</option><option value="datasheet">Scheda tecnica</option><option value="catalog">Catalogo</option></select></label>
              <label>Visibilità<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as FormState["audience"] })}><option value="public">Pubblico</option><option value="reseller">Rivenditori</option><option value="installer">Installatori</option><option value="internal">Interno</option></select></label>
              <label>Stato<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}><option value="draft">Bozza</option><option value="ready">Pronto</option><option value="active">Attivo</option><option value="archived">Archiviato</option><option value="error">Errore</option></select></label>
              <label className={styles.switch}><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Documento abilitato</label>
              <label className={styles.full}>Descrizione<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
              <label className={styles.full}>Contenuto testuale<textarea value={form.body_text} onChange={(event) => setForm({ ...form, body_text: event.target.value })} rows={10} /></label>
              <label className={styles.full}>URL sorgente<input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} /></label>
              <label className={styles.full}>Tag separati da virgola<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></label>
            </div>
            <div className={styles.actions}><button type="submit" disabled={busy}>{form.id ? "Salva nuova versione" : "Crea documento"}</button></div>
          </form>

          <section className={styles.archive}>
            <div className={styles.panelHeader}><div><span>ARCHIVIO</span><h2>Documenti</h2></div></div>
            <div className={styles.search}><input placeholder="Cerca titolo, slug o categoria" value={query} onChange={(event) => setQuery(event.target.value)} /><button onClick={() => void load(query)} disabled={busy}>Cerca</button></div>
            <div className={styles.list}>
              {documents.map((document) => (
                <article key={document.id}>
                  <div><span className={document.active ? styles.live : styles.off}>{document.status}</span><small>v{document.version}</small></div>
                  <h3>{document.title}</h3>
                  <p>{document.description || "Nessuna descrizione."}</p>
                  <footer><span>{document.category} · {document.audience}</span><div><button onClick={() => edit(document)}>Modifica</button><button className={styles.danger} onClick={() => void remove(document.id)}>Elimina</button></div></footer>
                </article>
              ))}
              {!documents.length && <p className={styles.empty}>Nessun documento presente.</p>}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
