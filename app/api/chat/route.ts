import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { OMEGABOT_SYSTEM_PROMPT } from "@/lib/omegabot/system-prompt";

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
  .super