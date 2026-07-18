import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { OMEGABOT_SYSTEM_PROMPT } from "@/lib/omegabot/system-prompt";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY non configurata." },
        { status: 503 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-5.1-mini";

    const response = await client.responses.create({
      model,
      instructions: OMEGABOT_SYSTEM_PROMPT,
      input: body.messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
    });

    const text = response.output_text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "OmegaBot non ha prodotto una risposta valida." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: text,
      responseId: response.id,
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Richiesta non valida.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("OmegaBot API error", error);
    return NextResponse.json(
      {
        error:
          "Il servizio AI non è momentaneamente disponibile. Contatta l’assistenza OmegaLed.",
      },
      { status: 500 },
    );
  }
}
