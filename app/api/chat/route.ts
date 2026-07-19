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
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function isSimpleGreeting(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) return false;

  return /^(ciao|salve|buongiorno|buonasera|hey|hello)[!,.\s]*$/i.test(lastUserMessage.content);
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("OPENAI_API_KEY non configurata.", 503);
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

    if (!text) {
      return jsonError("OmegaBot non ha prodotto una risposta valida.", 502);
    }

    return NextResponse.json(
      {
        message: text,
        responseId: response.id,
        model,
        promptVersion: activePrompt.version,
        promptSource: activePrompt.source,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Richiesta non valida.",
          details: error.flatten(),
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (error instanceof OpenAI.APIError) {
      console.error("OmegaBot OpenAI API error", {
        status: error.status,
        code: error.code,
        type: error.type,
      });

      if (error.status === 429) {
        try {
          const clonedRequest = request.clone();
          const parsed = requestSchema.safeParse(await clonedRequest.json());
          if (parsed.success && isSimpleGreeting(parsed.data.messages)) {
            return NextResponse.json(
              {
                message:
                  "Ciao! Sono OmegaBot, l’assistente tecnico e commerciale OmegaLed. Posso aiutarti con Ledwall, monitor LCD, Digital Signage, configurazioni, assistenza e pre-valutazioni di progetto.",
                responseId: null,
                model: "local-fallback",
                promptVersion: null,
                promptSource: "fallback",
              },
              { headers: { "Cache-Control": "no-store" } },
            );
          }
        } catch {
          // Continua con il messaggio di servizio standard.
        }

        return jsonError(
          "Il servizio è temporaneamente sovraccarico. Riprova tra poco oppure contatta l’assistenza OmegaLed.",
          429,
        );
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
