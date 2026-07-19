"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./prompt-studio.module.css";

type PromptBlock = {
  id: string;
  label: string;
  description: string;
  content: string;
  position: number;
  enabled: boolean;
};

type RemoteVersion = {
  id: string;
  version: number;
  status: "draft" | "published" | "archived";
  blocks: PromptBlock[];
  note: string | null;
  created_at: string;
  published_at: string | null;
};

const TOKEN_KEY = "omegabot_admin_access_token";

const initialBlocks: PromptBlock[] = [
  {
    id: "identity",
    label: "Identità",
    description: "Definisce chi è OmegaBot e quale ruolo svolge.",
    content: "Sei OmegaBot, l’assistente tecnico e commerciale ufficiale di OmegaLed. Aiuti clienti, rivenditori e installatori a orientarsi tra Ledwall, monitor LCD, Digital Signage, configurazioni, installazioni e assistenza.",
    position: 0,
    enabled: true,
  },
  {
    id: "tone",
    label: "Tono e stile",
    description: "Regola chiarezza, profondità e linguaggio delle risposte.",
    content: "Rispondi in italiano chiaro, professionale e diretto. Usa sempre la grafia Led. Evita gergo inutile, promesse non verificabili e risposte vaghe. Adatta la profondità tecnica al livello dell’utente.",
    position: 1,
    enabled: true,
  },
  {
    id: "technical",
    label: "Regole tecniche",
    description: "Vincoli per consigli, calcoli e diagnosi.",
    content: "Prima di consigliare un prodotto raccogli ambiente, dimensioni, distanza di visione, luminosità, utilizzo e budget. Non inventare specifiche. Per calcoli strutturali, elettrici o di sicurezza segnala sempre la necessità di verifica da parte di un tecnico qualificato.",
    position: 2,
    enabled: true,
  },
  {
    id: "commercial",
    label: "Comportamento commerciale",
    description: "Come qualificare richieste e opportunità.",
    content: "Identifica se l’utente è cliente finale, rivenditore, installatore, progettista o service. Raccogli nome, azienda, città, telefono, email, prodotto richiesto, tempistiche e budget solo quando utili. Non forzare la vendita.",
    position: 3,
    enabled: true,
  },
  {
    id: "support",
    label: "Assistenza ed escalation",
    description: "Quando e come passare a un operatore umano.",
    content: "Quando mancano dati, la risposta è incerta, esiste un rischio tecnico o l’utente richiede un preventivo definitivo, proponi il passaggio a un consulente OmegaLed. In urgenza indica il numero 0550107253 e il canale WhatsApp configurato.",
    position: 4,
    enabled: true,
  },
  {
    id: "output",
    label: "Formato delle risposte",
    description: "Struttura finale delle risposte del chatbot.",
    content: "Apri con la risposta principale. Poi aggiungi i dati necessari, le verifiche e il passo successivo. Mantieni le risposte brevi per domande semplici e dettagliate per configurazioni, diagnosi e confronti tecnici.",
    position: 5,
    enabled: true,
  },
];

export default function PromptStudioPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [blocks, setBlocks] = useState<PromptBlock[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState(initialBlocks[0].id);
  const [versions, setVersions] = useState<RemoteVersion[]>([]);
  const [status, setStatus] = useState("Accesso richiesto");
  const [busy, setBusy] = useState(false);
  const [testInput, setTestInput] = useState("Quale passo pixel mi consigli per una vetrina?");
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(TOKEN_KEY) ?? "";
    if (!storedToken) return;

    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch("/api/admin/prompts", {
          method: "GET",
          headers: { Authorization: `Bearer ${storedToken}` },
          cache: "no-store",
        });
        const data = (await response.json()) as {
          versions?: RemoteVersion[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || "Sessione non valida.");
        if (cancelled) return;

        const remoteVersions = data.versions ?? [];
        const current = remoteVersions.find((version) => version.status === "published") ?? remoteVersions[0];

        setToken(storedToken);
        setVersions(remoteVersions);
        if (current?.blocks?.length) {
          setBlocks(current.blocks);
          setSelectedId(current.blocks[0].id);
        }
        setStatus(current ? `Versione ${current.version} caricata` : "Nessuna versione remota");
      } catch (error) {
        window.sessionStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Sessione non valida");
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => blocks.find((block) => block.id === selectedId) ?? blocks[0],
    [blocks, selectedId],
  );
  const published = versions.find((version) => version.status === "published");
  const hasChanges = JSON.stringify(blocks) !== JSON.stringify(published?.blocks ?? initialBlocks);
  const promptLength = blocks.reduce((total, block) => total + block.content.length, 0);

  async function apiRequest(body?: unknown, accessToken = token) {
    const response = await fetch("/api/admin/prompts", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
    return data;
  }

  async function loadVersions(accessToken = token) {
    try {
      setBusy(true);
      const data = (await apiRequest(undefined, accessToken)) as { versions: RemoteVersion[] };
      setVersions(data.versions);
      const current = data.versions.find((version) => version.status === "published") ?? data.versions[0];
      if (current?.blocks?.length) {
        setBlocks(current.blocks);
        setSelectedId(current.blocks[0].id);
      }
      setStatus(current ? `Versione ${current.version} caricata` : "Nessuna versione remota");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Errore di caricamento");
      if (error instanceof Error && /Accesso|autorizzato/i.test(error.message)) logout();
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      setStatus("Variabili Supabase pubbliche non configurate");
      return;
    }
    try {
      setBusy(true);
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.access_token) throw new Error(data.error_description || "Credenziali non valide.");
      window.sessionStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setPassword("");
      await loadVersions(data.access_token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setVersions([]);
    setStatus("Sessione terminata");
  }

  function updateSelected(content: string) {
    setBlocks((current) => current.map((block) => (block.id === selectedId ? { ...block, content } : block)));
    setStatus("Modifiche non salvate");
  }

  async function saveDraft() {
    try {
      setBusy(true);
      const data = await apiRequest({ action: "save-draft", blocks, note: "Bozza da Prompt Studio" });
      setStatus(`Bozza versione ${data.version.version} salvata`);
      await loadVersions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    try {
      setBusy(true);
      const draftData = await apiRequest({ action: "save-draft", blocks, note: "Versione pronta per produzione" });
      const data = await apiRequest({ action: "publish", id: draftData.version.id });
      setStatus(`Versione ${data.version.version} pubblicata in produzione`);
      await loadVersions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pubblicazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  async function rollback(version: RemoteVersion) {
    try {
      setBusy(true);
      const data = await apiRequest({ action: "rollback", id: version.id });
      setBlocks(data.version.blocks);
      setSelectedId(data.version.blocks[0]?.id ?? selectedId);
      setStatus(`Rollback creato come bozza versione ${data.version.version}`);
      await loadVersions();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rollback non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    try {
      setBusy(true);
      setTestResult("Test GPT in esecuzione…");
      const data = await apiRequest({ action: "test", blocks, input: testInput });
      setTestResult(`${data.message}\n\nModello: ${data.model}`);
      setStatus("Test completato senza modificare la produzione");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Test non riuscito");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brandBlock}><div className={styles.logoMark}>Ω</div><div><strong>OmegaBot</strong><span>Control Center</span></div></div>
          <nav className={styles.navigation}><p>Workspace</p><Link href="/admin">⌂ <span>Dashboard</span></Link><Link href="/admin/prompt-studio" className={styles.active}>✦ <span>Prompt Studio</span></Link></nav>
        </aside>
        <section className={styles.workspace}>
          <header className={styles.topbar}><div><p>Area protetta</p><h1>Accesso amministratore</h1><span>Le istruzioni di produzione non sono un quaderno condiviso lasciato sul tavolo.</span></div></header>
          <article className={styles.editorPanel}>
            <div className={styles.panelHeading}><div><span>Supabase Auth</span><h2>Accedi al Control Center</h2></div><small>{status}</small></div>
            <div className={styles.editorBody}>
              <label>Email amministratore<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
              <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
              <button onClick={login} disabled={busy || !email || !password}>Accedi</button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}><div className={styles.logoMark}>Ω</div><div><strong>OmegaBot</strong><span>Control Center</span></div></div>
        <nav className={styles.navigation}>
          <p>Workspace</p><Link href="/admin">⌂ <span>Dashboard</span></Link><Link href="/admin/prompt-studio" className={styles.active}>✦ <span>Prompt Studio</span></Link>
          <a href="#">▤ <span>Knowledge Base</span></a><a href="#">◇ <span>Prodotti</span></a><a href="#">⌘ <span>Configuratore</span></a><a href="#">◌ <span>Conversazioni</span></a><a href="#">↗ <span>Analytics</span></a><a href="#">◎ <span>Modelli AI</span></a>
          <p>Sistema</p><a href="#">♙ <span>Utenti e ruoli</span></a><a href="#">≡ <span>Log di sistema</span></a><a href="#">⚙ <span>Impostazioni</span></a>
        </nav>
        <div className={styles.sidebarFooter}><div>MD</div><span><strong>Michele</strong><small>Amministratore</small></span><button onClick={logout}>Esci</button></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p>OmegaLed AI Platform</p><h1>Prompt Studio</h1><span>Modifica, testa e pubblica le istruzioni operative reali di OmegaBot.</span></div>
          <div className={styles.actions}><button onClick={() => void loadVersions()} disabled={busy}>Aggiorna</button><button onClick={saveDraft} disabled={busy}>Salva bozza</button><button className={styles.publishButton} onClick={publish} disabled={busy || !hasChanges}>Pubblica versione</button></div>
        </header>

        <div className={styles.statusBar}><span className={hasChanges ? styles.warningDot : styles.liveDot} /><strong>{status}</strong><small>{published ? `Produzione: versione ${published.version}` : "Nessuna versione pubblicata"}</small><b>{promptLength.toLocaleString("it-IT")} caratteri</b></div>

        <section className={styles.editorGrid}>
          <article className={styles.blockList}>
            <div className={styles.panelHeading}><div><span>Architettura prompt</span><h2>Blocchi istruzione</h2></div><small>{blocks.length} blocchi</small></div>
            <div className={styles.blocks}>{blocks.map((block, index) => <button key={block.id} className={selectedId === block.id ? styles.blockActive : ""} onClick={() => setSelectedId(block.id)}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{block.label}</strong><small>{block.description}</small></span><b>{block.content.length}</b></button>)}</div>
          </article>

          <article className={styles.editorPanel}>
            <div className={styles.panelHeading}><div><span>Editor</span><h2>{selected.label}</h2></div><small>Backend Supabase</small></div>
            <div className={styles.editorBody}><label>Descrizione del blocco<input value={selected.description} readOnly /></label><label>Istruzioni<textarea value={selected.content} onChange={(event) => updateSelected(event.target.value)} spellCheck /></label><div className={styles.editorMeta}><span>{selected.content.length} caratteri</span><span>Priorità: {selected.position + 1}</span><span>Attivo: {selected.enabled ? "sì" : "no"}</span></div></div>
          </article>

          <article className={styles.testPanel}>
            <div className={styles.panelHeading}><div><span>Sandbox GPT</span><h2>Test reale</h2></div><small>Non modifica la produzione</small></div>
            <div className={styles.testBody}><label>Domanda di prova<textarea value={testInput} onChange={(event) => setTestInput(event.target.value)} /></label><button onClick={runTest} disabled={busy || !testInput.trim()}>Esegui test GPT</button><pre>{testResult || "La risposta del modello con la bozza corrente apparirà qui."}</pre></div>
          </article>

          <article className={styles.historyPanel}>
            <div className={styles.panelHeading}><div><span>Versionamento remoto</span><h2>Cronologia Supabase</h2></div><small>Ultime 30</small></div>
            <div className={styles.historyList}>{versions.length === 0 && <p>Nessuna versione trovata.</p>}{versions.map((version) => <div key={version.id}><span><strong>Versione {version.version} · {version.status}</strong><small>{new Date(version.created_at).toLocaleString("it-IT")} · {version.note || "Nessuna nota"}</small></span><button onClick={() => rollback(version)} disabled={busy}>Ripristina come bozza</button></div>)}</div>
          </article>
        </section>
      </section>
    </main>
  );
}
