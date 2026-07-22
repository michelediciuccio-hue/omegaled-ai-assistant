"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OmegaChatProps = {
  displayName: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  submitLabel: string;
  starterPrompts: string[];
};

export function OmegaChat({
  displayName,
  welcomeMessage,
  inputPlaceholder,
  submitLabel,
  starterPrompts,
}: OmegaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "0550107253";
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "393200175918";

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage(content: string) {
    const clean = content.trim();
    if (!clean || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-20) }),
      });

      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !data.message) {
        throw new Error(data.error || "Risposta non disponibile");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.message! }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore inatteso";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${message}. Puoi contattare direttamente l’assistenza OmegaLed al ${supportPhone}.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section className="chat-shell" aria-label={`Chat con ${displayName}`}>
      <header className="chat-header">
        <div className="avatar" aria-hidden="true">Ω</div>
        <div>
          <strong>{displayName}</strong>
          <span>Concierge digitale OmegaLed</span>
        </div>
        <span className="status">Online</span>
      </header>

      <div className="chat-body" aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
            {message.content}
          </article>
        ))}
        {loading && <article className="bubble assistant typing">Sto analizzando la richiesta…</article>}
      </div>

      <div className="starter-grid">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={inputPlaceholder}
          rows={3}
          maxLength={8000}
        />
        <button type="submit" disabled={!canSend}>{submitLabel}</button>
      </form>

      <footer className="support-bar">
        <a href={`tel:${supportPhone}`}>Chiama assistenza</a>
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Parla su WhatsApp</a>
      </footer>
    </section>
  );
}
