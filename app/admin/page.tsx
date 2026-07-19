import Link from "next/link";
import styles from "./admin.module.css";

const navigation = [
  ["Dashboard", "⌂", true],
  ["Prompt Studio", "✦", false],
  ["Knowledge Base", "▤", false],
  ["Prodotti", "◇", false],
  ["Configuratore", "⌘", false],
  ["Conversazioni", "◌", false],
  ["Analytics", "↗", false],
  ["Modelli AI", "◎", false],
];

const systemNavigation = [
  ["Utenti e ruoli", "♙"],
  ["Log di sistema", "≡"],
  ["Impostazioni", "⚙"],
];

const metrics = [
  { label: "Conversazioni oggi", value: "164", delta: "+18%", detail: "rispetto a ieri" },
  { label: "Lead qualificati", value: "12", delta: "+4", detail: "nuove opportunità" },
  { label: "Documenti attivi", value: "127", delta: "98%", detail: "indicizzati correttamente" },
  { label: "Costo AI oggi", value: "€ 3,41", delta: "-8%", detail: "rispetto alla media" },
];

const activity = [
  { title: "Richiesta Ledwall outdoor 4×3 m", meta: "Lead commerciale · Firenze", time: "2 min fa", tone: "high" },
  { title: "Diagnosi modulo nero P2.6", meta: "Assistenza tecnica · Milano", time: "8 min fa", tone: "medium" },
  { title: "Confronto Totem Led e Totem LCD", meta: "Consulenza prodotto · Roma", time: "14 min fa", tone: "normal" },
  { title: "Richiesta noleggio operativo", meta: "Lead commerciale · Bologna", time: "21 min fa", tone: "high" },
];

const services = [
  { name: "OpenAI API", status: "Operativa", latency: "842 ms" },
  { name: "Supabase", status: "Da collegare", latency: "—" },
  { name: "Knowledge RAG", status: "Preparazione", latency: "—" },
  { name: "OmegaGest API", status: "Non collegata", latency: "—" },
];

function getNavigationHref(label: string) {
  if (label === "Dashboard") return "/admin";
  if (label === "Prompt Studio") return "/admin/prompt-studio";
  if (label === "Prodotti") return "/admin/catalog-import";
  return "#";
}

export default function AdminDashboardPage() {
  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark}>Ω</div>
          <div>
            <strong>OmegaBot</strong>
            <span>Control Center</span>
          </div>
        </div>

        <nav className={styles.navigation} aria-label="Navigazione principale">
          <p className={styles.navLabel}>Workspace</p>
          {navigation.map(([label, icon, active]) => (
            <Link
              key={label as string}
              href={getNavigationHref(label as string)}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <span>{icon}</span>
              {label}
              {label === "Conversazioni" && <small>7</small>}
            </Link>
          ))}

          <p className={styles.navLabel}>Sistema</p>
          {systemNavigation.map(([label, icon]) => (
            <Link key={label} href="#" className={styles.navItem}>
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.avatar}>MD</div>
          <div>
            <strong>Michele</strong>
            <span>Amministratore</span>
          </div>
          <button aria-label="Apri menu utente">•••</button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>OmegaLed AI Platform</p>
            <h1>Control Center</h1>
          </div>
          <div className={styles.topActions}>
            <button className={styles.iconButton} aria-label="Cerca">⌕</button>
            <button className={styles.iconButton} aria-label="Notifiche">♢</button>
            <Link href="/" className={styles.secondaryButton}>Apri OmegaBot ↗</Link>
            <Link href="/admin/prompt-studio" className={styles.primaryButton}>Apri Prompt Studio</Link>
          </div>
        </header>

        <div className={styles.statusBanner}>
          <span className={styles.liveDot} />
          <div>
            <strong>OmegaBot è operativo</strong>
            <p>Il servizio principale risponde regolarmente. Ultimo controllo pochi secondi fa.</p>
          </div>
          <button>Visualizza diagnostica</button>
        </div>

        <section className={styles.metricGrid} aria-label="Metriche principali">
          {metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <div className={styles.metricHeader}>
                <span>{metric.label}</span>
                <button aria-label={`Dettagli ${metric.label}`}>•••</button>
              </div>
              <strong className={styles.metricValue}>{metric.value}</strong>
              <p><b>{metric.delta}</b> {metric.detail}</p>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={`${styles.panel} ${styles.activityPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionLabel}>Live</span>
                <h2>Attività recente</h2>
              </div>
              <button className={styles.textButton}>Tutte le conversazioni →</button>
            </div>
            <div className={styles.activityList}>
              {activity.map((item) => (
                <div className={styles.activityRow} key={item.title}>
                  <span className={`${styles.activitySignal} ${styles[item.tone]}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                  <time>{item.time}</time>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionLabel}>Infrastruttura</span>
                <h2>Stato servizi</h2>
              </div>
              <button className={styles.iconButtonSmall}>↻</button>
            </div>
            <div className={styles.serviceList}>
              {services.map((service, index) => (
                <div className={styles.serviceRow} key={service.name}>
                  <span className={`${styles.serviceDot} ${index === 0 ? styles.serviceOnline : styles.servicePending}`} />
                  <div>
                    <strong>{service.name}</strong>
                    <p>{service.status}</p>
                  </div>
                  <time>{service.latency}</time>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.widePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.sectionLabel}>Qualità AI</span>
                <h2>Risposte e conoscenza</h2>
              </div>
              <select aria-label="Periodo analytics" defaultValue="7">
                <option value="7">Ultimi 7 giorni</option>
                <option value="30">Ultimi 30 giorni</option>
              </select>
            </div>
            <div className={styles.qualityGrid}>
              <div className={styles.scoreBlock}>
                <div className={styles.scoreRing}><span>91<small>%</small></span></div>
                <div>
                  <strong>Affidabilità stimata</strong>
                  <p>Basata su feedback, fonti trovate e richieste passate a un operatore.</p>
                </div>
              </div>
              <div className={styles.progressStack}>
                <div><span>Risposte con fonte</span><b>94%</b><i style={{ width: "94%" }} /></div>
                <div><span>Risoluzione autonoma</span><b>82%</b><i style={{ width: "82%" }} /></div>
                <div><span>Soddisfazione utenti</span><b>89%</b><i style={{ width: "89%" }} /></div>
              </div>
              <div className={styles.attentionCard}>
                <span>Richiede attenzione</span>
                <strong>8 risposte</strong>
                <p>Valutate come incomplete o non corrette.</p>
                <button>Apri Response Trainer</button>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
