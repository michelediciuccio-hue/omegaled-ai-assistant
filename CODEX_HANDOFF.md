# Codex Handoff - OmegaLed AI Assistant

Updated: 2026-07-22

## Current state
Repository: `michelediciuccio-hue/omegaled-ai-assistant`

Production:
- Frontend: `https://omegaled-ai-assistant.vercel.app/`
- Admin: `https://omegaled-ai-assistant.vercel.app/admin`
- Concierge Control: `https://omegaled-ai-assistant.vercel.app/admin/concierge-control`
- Knowledge Base: `https://omegaled-ai-assistant.vercel.app/admin/knowledge-base`

Current working branch:
- `feature/frontend-builder`

Open pull request:
- PR #11: `feat: connect concierge settings to public frontend`
- Head commit before these docs: `91a3ac398a572de0633edf4808f12e05a047c449`

## Already merged
- Knowledge Base admin structure and schema.
- Catalog and price import validation.
- Production chat fallback during OpenAI errors.
- Concierge channel settings schema.
- Concierge admin page.
- Direct admin login inside Concierge Control.
- Frontend link inside Concierge Control.

## What PR #11 currently adds
- Server-side load of website concierge settings from Supabase.
- Dynamic public title and subtitle.
- Dynamic chat welcome message.
- Dynamic quick actions.
- Dynamic input placeholder and submit label.
- Safe fallback when Supabase/config is unavailable.

Important: verify CI for the latest branch head before merging. These documentation commits changed the branch head after the feature commits.

## User's actual requested outcome
The user does not want only editable text fields. The admin must become a real site and bot control center.

### Frontend Builder
Build a back-office editor that can control:
- OmegaLed logo upload and selection;
- showroom background image upload and selection;
- title, subtitle and eyebrow;
- benefit list;
- chat title, role, welcome text, quick actions, placeholder and button labels;
- support and WhatsApp labels;
- background color and image;
- overlay color and opacity;
- primary/accent color;
- text colors;
- panel and chat colors;
- layout preset;
- content width;
- spacing;
- border radius;
- visible sections and section order;
- preview;
- draft, publish and rollback.

Default desired visual:
- professional OmegaLed showroom;
- illuminated Ledwall and digital totems;
- dark premium technology atmosphere;
- OmegaLed brand colors, mainly white, grey, red and the existing teal where already used consistently;
- uploaded or approved assets only.

Do not use image URLs pasted from random websites as permanent production assets.

### Knowledge & Experience
Extend the existing Knowledge Base so an admin can add and manage:
- PDFs;
- Word files;
- spreadsheets and CSV;
- catalogs and price lists;
- manuals and technical sheets;
- FAQ;
- manual experience entries;
- solved cases;
- technical rules;
- commercial rules;
- corrections to bad answers.

Required workflow:
1. Upload or write content.
2. Extract and normalize text.
3. Review extracted content.
4. Mark draft or approved.
5. Chunk/index only approved content.
6. Test a question against draft or production knowledge.
7. Publish.
8. Bot retrieves approved relevant knowledge when answering.

## Recommended delivery sequence
### PR A: Complete Frontend Builder schema and admin UI
- Extend the channel/settings schema or create versioned frontend configuration tables.
- Add fields for appearance, assets, benefits and layout.
- Add protected admin APIs.
- Expand `/admin/concierge-control` or create `/admin/frontend-builder`.
- Provide live preview.
- Do not yet add complex file upload in the same PR unless required for logo/background.

### PR B: Asset storage
- Private or controlled Supabase Storage bucket.
- Admin upload for logo and background.
- Validated MIME types and size limits.
- Public serving strategy for active published assets.
- Replace/delete safely.

### PR C: Public frontend renderer
- Public endpoint returns only published configuration.
- Home page renders logo, background, colors, sections and layout from config.
- Keep safe defaults.
- Verify mobile and desktop.

### PR D: Knowledge file upload and extraction
- Storage.
- File metadata.
- PDF, DOCX, TXT, CSV/XLSX extraction.
- Extraction status and errors.
- Manual review.

### PR E: Retrieval integration
- Approved content only.
- Chunking and embeddings or another retrieval method.
- Source references.
- Chat prompt receives relevant knowledge.
- Test mode before production.

## Existing relevant files
- `app/page.tsx`
- `components/chat/omega-chat.tsx`
- `app/admin/concierge-control/page.tsx`
- `app/admin/concierge-control/concierge-control.module.css`
- `app/api/admin/concierge-settings/route.ts`
- `app/api/admin/knowledge/route.ts`
- `app/admin/knowledge-base/page.tsx`
- `lib/admin/supabase-admin.ts`
- `supabase/migrations/20260722_create_concierge_channel_settings.sql`
- `supabase/migrations/20260721_create_knowledge_base.sql`

## Known issue to verify first
The database migration for `concierge_channel_settings` must actually be applied in the Supabase project. If it is not applied, the admin may load but cannot read or save settings. Do not claim a feature works merely because its code exists.

Also verify the Vercel environment contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `OPENAI_API_KEY`

Never put secret values into GitHub files.

## First Codex task
1. Read `AGENTS.md` and this file.
2. Inspect PR #11 and the current branch.
3. Run lint, typecheck and build.
4. Fix any CI issues.
5. Verify the public frontend truly changes after saving a website setting.
6. Merge PR #11 only when CI and deployment are green.
7. Then create a new branch for the full Frontend Builder.

## Acceptance criteria for the next milestone
An administrator can:
- log in directly;
- upload/select an OmegaLed logo;
- upload/select a showroom background;
- change all main visible text;
- change key colors and overlay;
- preview changes;
- publish;
- refresh the public frontend and see the published result without modifying code.
