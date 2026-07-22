import { OmegaChat } from "@/components/chat/omega-chat";
import { getPublicConciergeSettings } from "@/lib/concierge/public-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getPublicConciergeSettings();

  return (
    <main className="page-shell">
      <section className="hero-copy">
        <span className="eyebrow">OmegaLed AI Platform</span>
        <h1>{settings.headline}</h1>
        <p>{settings.subheadline}</p>
        <ul>
          {settings.quick_actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {settings.enabled ? (
        <OmegaChat
          displayName={settings.display_name}
          welcomeMessage={settings.welcome_message}
          inputPlaceholder={settings.input_placeholder}
          submitLabel={settings.submit_label}
          starterPrompts={settings.quick_actions}
        />
      ) : (
        <section className="chat-shell" aria-label="Concierge non disponibile">
          <div className="chat-body">
            <article className="bubble assistant">
              Il Concierge OmegaLed è momentaneamente non disponibile.
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
