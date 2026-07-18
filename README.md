# OmegaLed AI Assistant

OmegaBot è l’assistente AI di OmegaLed dedicato a clienti, rivenditori, installatori e personale interno.

## Funzioni MVP

- chat specialistica su Ledwall, Led, LCD e Digital Signage;
- raccolta guidata delle esigenze di progetto;
- supporto tecnico di primo livello;
- proposta contestuale di contatto con un operatore OmegaLed;
- endpoint server-side basato su OpenAI Responses API;
- health check applicativo;
- controlli automatici lint, TypeScript e build.

## Stack

- Next.js 15
- React 19
- TypeScript
- OpenAI SDK
- Zod
- Vercel

## Avvio locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Aprire `http://localhost:3000`.

## Variabili ambiente

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
NEXT_PUBLIC_SUPPORT_EMAIL=info@omegaled.it
NEXT_PUBLIC_SUPPORT_PHONE=0550107253
NEXT_PUBLIC_WHATSAPP_NUMBER=393200175918
```

Non inserire mai chiavi reali nel repository.

## Controlli qualità

```bash
npm run lint
npm run typecheck
npm run build
```

oppure:

```bash
npm run check
```

## Endpoint

- `POST /api/chat`
- `GET /api/health`

## Deployment

La procedura ufficiale è documentata in [`docs/10_DEPLOYMENT_VERCEL.md`](docs/10_DEPLOYMENT_VERCEL.md).

## Documentazione

La cartella `docs/` contiene specifiche di prodotto, architettura, database, AI, comportamento OmegaBot, UI/UX, regole di sviluppo e procedure operative.
