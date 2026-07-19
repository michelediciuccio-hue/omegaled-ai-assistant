"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./prompt-studio.module.css";

type PromptBlock = {
  id: string;
  label: string;
  description: string;
  content: string;
};

type SavedVersion = {
  id: string;
  createdAt: string;
  note: string;
  blocks: PromptBlock[];
};

const STORAGE_KEY = "omegabot_prompt_studio_v1";
const VERSION_KEY = "omegabot_prompt_versions_v1";

const initialBlocks: PromptBlock[] = [
  {
    id: "identity",
    label: "Identità",
    description: "Definisce chi è OmegaBot e quale ruolo svolge.",
    content: "Sei OmegaBot, l’assistente tecnico e commerciale ufficiale di OmegaLed. Aiuti clienti, rivenditori e installatori a orientarsi tra Ledwall, monitor LCD, Digital Signage, configurazioni, installazioni e assistenza.",
  },
  {
    id: "tone",
    label: "Tono e stile",
    description: "Regola chiarezza, profondità e linguaggio delle risposte.",
    content: "Rispondi in italiano chiaro, professionale e diretto. Usa sempre la grafia Led. Evita gergo inutile, promesse non verificabili e risposte vaghe. Adatta la profondità tecnica al livello dell’utente.",
  },
  {
    id: "technical",
    label: "Regole tecniche",
    description: "Vincoli per consigli, calcoli e diagnosi.",
    content: "Prima di consigliare un prodotto raccogli ambiente, dimensioni, distanza di visione, luminosità, utilizzo e budget. Non inventare specifiche. Per calcoli strutturali, elettrici o di sicurezza segnala sempre la necessità di verifica da parte di un tecnico qualificato.",
  },
  {
    id: "commercial",
    label: "Comportamento commerciale",
    description: "Come qualificare richieste e opportunità.",
    content: "Identifica se l’utente è cliente finale, rivenditore, installatore, progettista o service. Raccogli nome, azienda, città, telefono, email, prodotto richiesto, tempistiche e budget solo quando utili. Non forzare la vendita.",
  },
  {
    id: "support",
    label: "Assistenza ed escalation",
    description: "Quando e come passare a un operatore umano.",
    content: "Quando mancano dati, la risposta è incerta, esiste un rischio tecnico o l’utente richiede un preventivo definitivo, proponi il passaggio a un consulente OmegaLed. In urgenza indica il numero 0550107253 e il canale WhatsApp configurato.",
  },
  {
    id: "output",
    label: "Formato delle risposte",
    description: "Struttura finale delle risposte del chatbot.",
    content: "Apri con la risposta principale. Poi aggiungi i dati necessari, le verifiche e il passo successivo. Mantieni le risposte brevi per domande semplici e dettagliate per configurazioni, diagnosi e confronti tecnici.",
  },
];

export default function PromptStudioPage() {
  const [blocks, setBlocks] = useState<PromptBlock[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState(initialBlocks[0].id);
  const [publishedBlocks, setPublishedBlocks] = useState<PromptBlock[]>(initialBlocks);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [status, setStatus] = useState("Bozza locale");
  const [testInput, setTestInput] = useState("Quale passo pixel mi consigli per una vetrina?");
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedVersions = window.localStorage.getItem(VERSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { draft?: PromptBlock[]; published?: PromptBlock[] };
      if (parsed.draft) setBlocks(parsed.draft);
      if (parsed.published) setPublishedBlocks(parsed.published);
    }
    if (storedVersions) setVersions(JSON.parse(storedVersions) as SavedVersion[]);
  }, []);

  const selected = useMemo(
    () => blocks.find((block) => block.id === selectedId) ?? blocks[0],
    [blocks, selectedId],
  );

  const hasChanges = JSON.stringify(blocks) !== JSON.stringify(publishedBlocks);
  const promptLength = blocks.reduce((total, block) => total + block.content.length, 0);

  function persist(nextBlocks: PromptBlock[], nextPublished = publishedBlocks) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft: nextBlocks, published: nextPublished }),
    );
  }

  function updateSelected(content: string) {
    const next = blocks.map((block) => (block.id === selectedId ? { ...block, content } : block));
    setBlocks(next);
    persist(next);
    setStatus("Modifiche non pubblicate");
  }

  function saveDraft() {
    persist(blocks);
    setStatus("Bozza salvata");
  }

  function publish() {
    const version: SavedVersion = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      note: `Pubblicazione con ${blocks.length} blocchi`,
      blocks,
    };
    const nextVersions = [version, ...versions].slice(0, 20);
    setPublishedBlocks(blocks);
    setVersions(nextVersions);
    window.localStorage.setItem(VERSION_KEY, JSON.stringify(nextVersions));
    persist(blocks, blocks);
    setStatus("Versione pubblicata");
  }

  function rollback(version: SavedVersion) {
    setBlocks(version.blocks);
    setSelectedId(version.blocks[0]?.id ?? selectedId);
    persist(version.blocks);
    setStatus(`Ripristinata bozza del ${new Date(version.createdAt).toLocaleString("it-IT")}`);
  }

  function runTest() {
    const identity = blocks.find((block) => block.id === "identity")?.content ?? "";
    const tone = blocks.find((block) => block.id === "tone")?.content ?? "";
    setTestResult(
      `Simulazione locale completata.\n\nDomanda: ${testInput}\n\nIstruzioni applicate: ${identity.slice(0, 150)}${identity.length > 150 ? "…" : ""}\n\nStile: ${tone.slice(0, 130)}${tone.length > 130 ? "…" : ""}\n\nIl collegamento al modello AI verrà attivato nel prossimo step backend.`,
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark}>Ω</div>
          <div><strong>OmegaBot</strong><span>Control Center</span></div>
        </div>
        <nav className={styles.navigation}>
          <p>Workspace</p>
          <Link href="/admin">⌂ <span>Dashboard</span></Link>
          <Link href="/admin/prompt-studio" className={styles.active}>✦ <span>Prompt Studio</span></Link>
          <a href="#">▤ <span>Knowledge Base</span></a>
          <a href="#">◇ <span>Prodotti</span></a>
          <a href="#">⌘ <span>Configuratore</span></a>
          <a href="#">◌ <span>Conversazioni</span></a>
          <a href="#">↗ <span>Analytics</span></a>
          <a href="#">◎ <span>Modelli AI</span></a>
          <p>Sistema</p>
          <a href="#">♙ <span>Utenti e ruoli</span></a>
          <a href="#">≡ <span>Log di sistema</span></a>
          <a href="#">⚙ <span>Impostazioni</span></a>
        </nav>
        <div className={styles.sidebarFooter}><div>MD</div><span><strong>Michele</strong><small>Amministratore</small></span></div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p>OmegaLed AI Platform</p><h1>Prompt Studio</h1><span>Modifica e pubblica le istruzioni operative di OmegaBot.</span></div>
          <div className={styles.actions}>
            <button onClick={saveDraft}>Salva bozza</button>
            <button className={styles.publishButton} onClick={publish} disabled={!hasChanges}>Pubblica versione</button>
          </div>
        </header>

        <div className={styles.statusBar}>
          <span className={hasChanges ? styles.warningDot : styles.liveDot} />
          <strong>{status}</strong>
          <small>{hasChanges ? "Ci sono modifiche rispetto alla versione pubblicata." : "La bozza coincide con la versione pubblicata."}</small>
          <b>{promptLength.toLocaleString("it-IT")} caratteri</b>
        </div>

        <section className={styles.editorGrid}>
          <article className={styles.blockList}>
            <div className={styles.panelHeading}><div><span>Architettura prompt</span><h2>Blocchi istruzione</h2></div><small>{blocks.length} blocchi</small></div>
            <div className={styles.blocks}>
              {blocks.map((block, index) => (
                <button key={block.id} className={selectedId === block.id ? styles.blockActive : ""} onClick={() => setSelectedId(block.id)}>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <span><strong>{block.label}</strong><small>{block.description}</small></span>
                  <b>{block.content.length}</b>
                </button>
              ))}
            </div>
          </article>

          <article className={styles.editorPanel}>
            <div className={styles.panelHeading}><div><span>Editor</span><h2>{selected.label}</h2></div><small>Autosave locale</small></div>
            <div className={styles.editorBody}>
              <label>Descrizione del blocco<input value={selected.description} readOnly /></label>
              <label>Istruzioni<textarea value={selected.content} onChange={(event) => updateSelected(event.target.value)} spellCheck /></label>
              <div className={styles.editorMeta}><span>{selected.content.length} caratteri</span><span>Priorità: alta</span><span>Ambito: globale</span></div>
            </div>
          </article>

          <article className={styles.testPanel}>
            <div className={styles.panelHeading}><div><span>Sandbox</span><h2>Test rapido</h2></div><small>Non modifica la produzione</small></div>
            <div className={styles.testBody}>
              <label>Domanda di prova<textarea value={testInput} onChange={(event) => setTestInput(event.target.value)} /></label>
              <button onClick={runTest}>Esegui simulazione</button>
              <pre>{testResult || "Il risultato del test apparirà qui. La simulazione mostra quali istruzioni verrebbero applicate."}</pre>
            </div>
          </article>

          <article className={styles.historyPanel}>
            <div className={styles.panelHeading}><div><span>Versionamento</span><h2>Cronologia pubblicazioni</h2></div><small>Ultime 20</small></div>
            <div className={styles.historyList}>
              {versions.length === 0 && <p>Nessuna versione pubblicata da questo browser.</p>}
              {versions.map((version, index) => (
                <div key={version.id}><span><strong>Versione {versions.length - index}</strong><small>{new Date(version.createdAt).toLocaleString("it-IT")} · {version.note}</small></span><button onClick={() => rollback(version)}>Ripristina in bozza</button></div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
