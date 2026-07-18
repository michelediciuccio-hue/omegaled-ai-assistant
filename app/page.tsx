import { OmegaChat } from "@/components/chat/omega-chat";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-copy">
        <span className="eyebrow">OmegaLed AI Platform</span>
        <h1>Consulenza tecnica Led e LCD, senza perdere tempo.</h1>
        <p>
          OmegaBot risponde su Ledwall, Digital Signage, monitor LCD, configurazioni,
          assistenza e pre-valutazioni di progetto. Quando serve, passa la richiesta
          a un consulente OmegaLed.
        </p>
        <ul>
          <li>Consigli tecnici chiari</li>
          <li>Configurazione guidata dello schermo</li>
          <li>Raccolta dati per quotazione</li>
          <li>Supporto per clienti, rivenditori e installatori</li>
        </ul>
      </section>
      <OmegaChat />
    </main>
  );
}
