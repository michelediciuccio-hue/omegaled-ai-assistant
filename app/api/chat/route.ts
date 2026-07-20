import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublishedSystemPrompt } from "@/lib/omegabot/prompt-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 6000;
const MAX_TOTAL_CHARACTERS = 36000;
const REQUEST_TIMEOUT_MS = 45000;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const requestSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  })
  .superRefine((value, context) => {
    const totalCharacters = value.messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );

    if (totalCharacters > MAX_TOTAL_CHARACTERS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La conversazione supera il limite consentito.",
        path: ["messages"],
      });
    }
  });

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
}

function getLocalFallback(messages: ChatMessage[]) {
  const input = getLastUserMessage(messages).toLocaleLowerCase("it");

  if (/^(ciao|salve|buongiorno|buonasera|hey|hello)[!,.?\s]*$/i.test(input)) {
    return "Ciao! Sono OmegaBot, l’assistente tecnico e commerciale OmegaLed. Posso aiutarti con Ledwall, monitor LCD, Digital Signage, configurazioni, assistenza e pre-valutazioni di progetto.";
  }

  if (input.includes("passo pixel") && input.includes("vetrin")) {
    return "Per una vetrina OmegaLed non propone P2 o P2.6. La valutazione parte normalmente da P2.9 oppure P3.9, in base a distanza di visione, dimensioni dello schermo, luminosità richiesta ed esposizione alla luce. Indicami distanza minima di visione e misure disponibili, così restringiamo la scelta corretta.";
  }

  if ((input.includes("configur") || input.includes("preventiv")) && input.includes("outdoor")) {
    return "Per configurare un Ledwall outdoor servono quattro dati iniziali: larghezza e altezza, distanza di visione, tipo di installazione e posizione geografica. In genere si parte da P3.9 con luminosità almeno 5.000–5.500 Nits e protezione IP65. Indicami le dimensioni previste e se sarà installato a parete, su struttura o autoportante.";
  }

  if (input.includes("monitor lcd") && (input.includes("assist") || input.includes("problema"))) {
    return "Per iniziare la diagnosi del monitor LCD indicami modello, tipo di problema, eventuale messaggio di errore e se il dispositivo si accende. Se possibile prepara anche una foto dello schermo e dell’etichetta tecnica.";
  }

  if (input.includes("pre-valutazione") || input.includes("progetto")) {
    return "Per una pre-valutazione servono: prodotto desiderato, misure indicative, luogo di installazione, utilizzo indoor o outdoor e città. Con questi dati OmegaLed può impostare una prima configurazione tecnica e commerciale.";
  }

  return "La connessione al motore AI è momentaneamente limitata, ma posso comunque raccogliere i dati del progetto. Scrivi prodotto, misure, utilizzo indoor o outdoor, città e distanza di visione. La richiesta potrà poi essere completata da un consulente OmegaLed.";
}

function fallbackResponse(messages: ChatMessage[], reason: string) {
  return NextResponse.json(
    {
      message: getLocalFallback(messages),
      responseId: null,
      model: "local-fallback",
      promptVersion: null,
      promptSource: "fallback",
      degraded: true,
      degradedReason: reason,
    },
    { headers: { "Cache-Control": "no-store", "X-OmegaBot-Mode": "fallback" } },
  );
}

export async function POST(request: Request) {
  let parsedMessages: ChatMessage[] = [];

  try {
    const body = requestSchema.parse(await request.json());
    parsedMessages = body.messages;

    if (!process.env.OPENAI_API_KEY) {
      console.error("OmegaBot configuration error", { code: "missing_openai_api_key" });
      return fallbackResponse(parsedMessages, "missing_api_key");
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 2,
    });

    const model = process.env.OPENAI_MODEL || "gpt-5-mini";
    const activePrompt = await getPublishedSystemPrompt();

    const response = await client.responses.create({
      model,
      instructions: activePrompt.prompt,
      input: body.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const text = response.output_text?.trim();
    if (!text) return fallbackResponse(parsedMessages, "empty_response");

    return NextResponse.json(
      {
        message: text,
        responseId: response.id,
        model,
        promptVersion: activePrompt.version,
        promptSource: activePrompt.source,
        degraded: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Richiesta non valida.", details: error.flatten() },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof OpenAI.APIError) {
      console.error("OmegaBot OpenAI API error", {
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.request_id,
        message: error.message,
      });

      if (error.status === 429) {
        const reason = error.code === "insufficient_quota" ? "insufficient_quota" : "rate_limit";
        return fallbackResponse(parsedMessages, reason);
      }

      if (error.status && error.status >= 500) {
        return fallbackResponse(parsedMessages, "openai_unavailable");
      }
    } else {
      console.error("OmegaBot API error", error);
    }

    return jsonError(
      "Il servizio AI non è momentaneamente disponibile. Contatta l’assistenza OmegaLed.",
      500,
    );
  }
}
