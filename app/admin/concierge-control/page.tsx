"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "./concierge-control.module.css";

type Channel = "website" | "whatsapp";
type Settings = {
  channel: Channel;
  display_name: string;
  headline: string;
  subheadline: string;
  welcome_message: string;
  input_placeholder: string;
  submit_label: string;
  handoff_message: string;
  quick_actions: string[];
  enabled: boolean;
};

type SettingsListResponse = { settings: Settings[] };
type SettingsUpdateResponse = { settings: Settings };

const TOKEN_KEY = "omegabot_admin_access_token";

export default function ConciergeControlPage() {
  const [items, setItems] = useState<Record<Channel, Settings> | null>(null);
  const [channel, setChannel] = useState<Channel>("website");
  const [status, setStatus] = useState("Caricamento impostazioni…");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async <T,>(init?: RequestInit): Promise<T> => {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Accedi prima dal Prompt Studio.");
    const response = await fetch("/api/admin/concierge-settings", {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "Operazione non riuscita.");
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      const data = await request<SettingsListResponse>();
      const mapped = Object.fromEntries(
        data.settings.map((item) => [item.channel, item]),
      ) as Record<Channel, Settings>;
      setItems(mapped);
      setStatus("Impostazioni caricate.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Errore di caricamento.");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  if (!items) return <main className={styles.loading}>{status}</main>;
  const current = items[channel];

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setItems((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        [channel]: { ...previous[channel], [key]: value },
      };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy(true);
      setStatus("Salvataggio in corso…");
      const data = await request<SettingsUpdateResponse>({
        method: "PUT",
        body: JSON.stringify(current),
      });
      setItems((previous) => previous ? { ...previous, [channel]: data.settings } : previous);
      setStatus("Impostazioni salvate correttamente.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Ω <span>OmegaBot<small>Control Center</small></span></div>
        <Link href="/admin">⌂ Dashboard</Link>
        <Link href="/admin/concierge-control" className={styles.active}>◇ Concierge Control</Link>
        <Link href="/admin/knowledge-base">▤ Knowledge Base</Link>
        <Link href="/admin/catalog-import">▦ Catalogo</Link>
      </aside>

      <section className={styles.workspace}>
        <header>
          <div><p>OmegaLed Channel Content</p><h1>Concierge Control</h1><span>Modifica testi, pulsanti e messaggi per sito e WhatsApp senza intervenire sul codice.</span></div>
          <Link href="/admin">Torna alla Dashboard</Link>
        </header>

        <div className={styles.channelTabs}>
          <button type="button" className={channel === "website" ? styles.selected : ""} onClick={() => setChannel("website")}>Sito</button>
          <button type="button" className={channel === "whatsapp" ? styles.selected : ""} onClick={() => setChannel("whatsapp")}>WhatsApp Business</button>
        </div>

        <div className={styles.status}>{status}</div>

        <section className={styles.grid}>
          <form className={styles.panel} onSubmit={save}>
            <label>Nome profilo<input value={current.display_name} onChange={(e) => update("display_name", e.target.value)} /></label>
            <label>Titolo principale<input value={current.headline} onChange={(e) => update("headline", e.target.value)} /></label>
            <label>Sottotitolo<textarea rows={3} value={current.subheadline} onChange={(e) => update("subheadline", e.target.value)} /></label>
            <label>Messaggio iniziale<textarea rows={4} value={current.welcome_message} onChange={(e) => update("welcome_message", e.target.value)} /></label>
            <label>Testo campo di scrittura<input value={current.input_placeholder} onChange={(e) => update("input_placeholder", e.target.value)} /></label>
            <label>Testo pulsante<input value={current.submit_label} onChange={(e) => update("submit_label", e.target.value)} /></label>
            <label>Messaggio passaggio al personale<textarea rows={4} value={current.handoff_message} onChange={(e) => update("handoff_message", e.target.value)} /></label>
            <label>Azioni rapide, una per riga<textarea rows={6} value={current.quick_actions.join("\n")} onChange={(e) => update("quick_actions", e.target.value.split("\n").map((v) => v.trim()).filter(Boolean))} /></label>
            <label className={styles.switch}><input type="checkbox" checked={current.enabled} onChange={(e) => update("enabled", e.target.checked)} /> Canale attivo</label>
            <button type="submit" disabled={busy}>Salva impostazioni</button>
          </form>

          <article className={styles.preview}>
            <span>ANTEPRIMA {channel === "website" ? "SITO" : "WHATSAPP"}</span>
            <h2>{current.headline}</h2>
            <p>{current.subheadline}</p>
            <div className={styles.message}>{current.welcome_message}</div>
            <div className={styles.actions}>{current.quick_actions.map((item) => <button type="button" key={item}>{item}</button>)}</div>
            <div className={styles.composer}><span>{current.input_placeholder}</span><button type="button">{current.submit_label}</button></div>
            <small>{current.enabled ? "Canale attivo" : "Canale disattivato"}</small>
          </article>
        </section>
      </section>
    </main>
  );
}
