"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./catalog-import.module.css";

type Kind = "products" | "prices";
type Issue = { row: number; field?: string; message: string };
type Result = { totalRows?: number; validRows?: number; issues?: Issue[]; canCommit?: boolean; importedRows?: number; performedBy?: string; importedAt?: string; error?: string };

const TOKEN_KEY = "omegabot_admin_access_token";

export default function CatalogImportPage() {
  const [kind, setKind] = useState<Kind>("products");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Carica un file CSV e avvia la validazione.");

  async function readFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
    setResult(null);
    setStatus("File caricato. Nessun dato è stato ancora scritto.");
  }

  async function run(mode: "preview" | "commit") {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setStatus("Accedi prima dal Prompt Studio per ottenere una sessione amministratore.");
      return;
    }
    if (!csv) {
      setStatus("Seleziona prima un file CSV.");
      return;
    }
    try {
      setBusy(true);
      setStatus(mode === "preview" ? "Validazione in corso…" : "Importazione in corso…");
      const response = await fetch("/api/admin/catalog/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mode, kind, csv }),
      });
      const data = await response.json() as Result;
      setResult(data);
      if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
      setStatus(mode === "preview"
        ? data.canCommit ? "Validazione superata. Il file può essere importato." : "Validazione completata con errori."
        : `${data.importedRows ?? 0} righe importate correttamente.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  const canCommit = Boolean(result?.canCommit && csv && !busy);

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div>Ω</div><span><strong>OmegaBot</strong><small>Control Center</small></span></div>
        <nav>
          <p>Workspace</p>
          <Link href="/admin">⌂ <span>Dashboard</span></Link>
          <Link href="/admin/prompt-studio">✦ <span>Prompt Studio</span></Link>
          <Link href="/admin/catalog-import" className={styles.active}>◇ <span>Catalogo & Import</span></Link>
        </nav>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div><p>OmegaLed Data Control</p><h1>Catalogo & Import</h1><span>Valida prodotti e listini prima di scriverli nel database.</span></div>
          <Link href="/admin" className={styles.back}>Torna alla Dashboard</Link>
        </header>

        <div className={styles.status}><span /> <strong>{status}</strong></div>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><span>01</span><h2>Tipo di importazione</h2></div></div>
            <div className={styles.body}>
              <label><input type="radio" checked={kind === "products"} onChange={() => { setKind("products"); setResult(null); }} /> Prodotti e caratteristiche</label>
              <label><input type="radio" checked={kind === "prices"} onChange={() => { setKind("prices"); setResult(null); }} /> Listini e prezzi</label>
              <p>Il file deve usare esattamente il tracciato master previsto. Le colonne sconosciute o mancanti bloccano l’importazione.</p>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><span>02</span><h2>Carica CSV</h2></div></div>
            <div className={styles.body}>
              <label className={styles.dropzone}>
                <input type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} />
                <strong>{fileName || "Seleziona il file CSV"}</strong>
                <small>Il file resta in memoria finché non confermi l’importazione.</small>
              </label>
              <div className={styles.actions}>
                <button onClick={() => void run("preview")} disabled={busy || !csv}>Valida file</button>
                <button className={styles.primary} onClick={() => void run("commit")} disabled={!canCommit}>Importa nel database</button>
              </div>
            </div>
          </article>

          <article className={`${styles.panel} ${styles.full}`}>
            <div className={styles.panelHeader}><div><span>03</span><h2>Esito validazione</h2></div><small>{result?.totalRows ?? 0} righe lette</small></div>
            <div className={styles.summary}>
              <div><span>Valide</span><strong>{result?.validRows ?? result?.importedRows ?? 0}</strong></div>
              <div><span>Errori</span><strong>{result?.issues?.length ?? 0}</strong></div>
              <div><span>Scrittura consentita</span><strong>{result?.canCommit ? "Sì" : "No"}</strong></div>
            </div>
            <div className={styles.issues}>
              {!result && <p>Nessuna validazione eseguita.</p>}
              {result?.issues?.length === 0 && <p className={styles.ok}>Il file rispetta il tracciato e tutte le righe sono valide.</p>}
              {result?.issues?.map((issue, index) => (
                <div key={`${issue.row}-${issue.field}-${index}`}><b>Riga {issue.row}</b><span>{issue.field || "riga"}</span><p>{issue.message}</p></div>
              ))}
              {result?.importedRows !== undefined && <p className={styles.ok}>Importazione completata da {result.performedBy}. Righe scritte: {result.importedRows}.</p>}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
