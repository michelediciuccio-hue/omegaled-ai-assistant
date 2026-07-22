# OmegaLed AI Assistant - Codex Instructions

## Repository
- Repo: `michelediciuccio-hue/omegaled-ai-assistant`
- Framework: Next.js 15, React 19, TypeScript 5.8
- Runtime: Node 22
- Production: `https://omegaled-ai-assistant.vercel.app/`
- Admin: `https://omegaled-ai-assistant.vercel.app/admin`

## Product language
- Write `Led`, never `LED`.
- Brand name: `OmegaLed`.
- Public-facing copy must be clear, human, professional and direct.
- Avoid vague AI-style claims and unnecessary jargon.

## Core product goal
OmegaBot is the digital concierge for OmegaLed. It provides reliable product information, understands the user's intent, collects only essential data and routes the request to the right person, department or authorized partner.

OmegaBot is not allowed to:
- negotiate prices or discounts;
- produce final quotations;
- invent product specifications;
- replace structural, electrical or safety checks;
- conduct long sales interrogations.

## Channel behavior
### Website
- May provide more detailed approved product information.
- Can ask for environment, use, dimensions, city and viewing distance when relevant.
- Must route to the correct human when a final technical or commercial decision is required.

### WhatsApp Business
- Keep replies concise.
- Ask at most one or two questions per message.
- Identify intent quickly and prepare a clean human handoff.

## Admin requirements
The admin must genuinely control production behavior. Do not build decorative settings that are saved but unused.

The admin must support:
1. Frontend content and layout management.
2. Knowledge Base documents and manual experience entries.
3. Prompt and behavior configuration.
4. Testing before publishing.
5. Versioning and rollback where practical.

## Frontend Builder requirements
The public frontend must read its active configuration from Supabase, with safe defaults if configuration is missing.

Editable from admin:
- logo;
- eyebrow text;
- main title;
- subtitle;
- benefit list;
- chat name and role label;
- welcome message;
- quick actions;
- input placeholder;
- submit button text;
- support and WhatsApp labels;
- primary, secondary and text colors;
- background image;
- background overlay;
- panel backgrounds;
- border radius;
- spacing and content width;
- section visibility and order.

Desired default background: an OmegaLed showroom with illuminated Ledwall and digital totems. Do not hard-code a copyrighted third-party showroom image. Use an uploaded OmegaLed asset or a generated/approved asset stored in project storage.

## Knowledge and experience requirements
Admin users must be able to add:
- PDF;
- DOCX;
- TXT;
- CSV and XLSX;
- product catalogs;
- price lists;
- technical sheets;
- manuals;
- FAQ;
- solved cases;
- technical and commercial rules;
- corrections to wrong answers;
- manual experience notes.

Each item should have category, audience, active/draft state, source metadata, version and updated timestamp.

The bot must use only active approved knowledge. Do not connect unreviewed content directly to production answers.

## Architecture constraints
- Use existing Supabase REST helpers where possible.
- Keep admin endpoints protected with `requireAdmin`.
- Never expose service-role keys to the client.
- Public content endpoints may only return approved public configuration.
- Validate API payloads with Zod.
- Keep fallbacks so the public site remains usable when Supabase or OpenAI is unavailable.
- Do not mix unrelated features in the same pull request.

## Quality gate
Before merging:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- verify GitHub Actions CI;
- verify Vercel preview or production status;
- do not merge red builds.

## Current important product rule
Do not hard-code technical recommendations before the approved Knowledge Base is connected. In particular, storefront pitch recommendations must not be invented from general memory.

## Working style
- Inspect existing patterns before adding new files.
- Preserve working functionality.
- Prefer small, reviewable PRs.
- Clearly state what is implemented, what is only stored, and what is actually connected to production.
