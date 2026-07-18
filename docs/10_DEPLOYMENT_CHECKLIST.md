---
id: OAP-DEPLOY-010
title: OmegaLed AI Platform - Chatbot MVP Deployment Checklist
version: 1.0.0
status: Active
owner: Product Architecture
last_updated: 2026-07-18
priority: Critical
---

# OmegaLed AI Platform
## Chatbot MVP Deployment Checklist

## 1. Obiettivo

Questa checklist governa la pubblicazione del primo chatbot OmegaBot su Vercel. Nessun ambiente deve essere considerato pronto finché tutti i controlli critici non risultano completati.

## 2. Prerequisiti

- repository GitHub collegato a Vercel;
- branch di produzione `main`;
- Pull Request approvata e unita;
- account OpenAI con chiave API attiva;
- dominio o sottodominio deciso;
- riferimenti ufficiali di assistenza verificati;
- responsabile tecnico identificato;
- responsabile commerciale identificato.

## 3. Variabili d'ambiente Vercel

Configurare separatamente per Preview e Production:

```text
OPENAI_API_KEY=<segreto>
OPENAI_MODEL=<modello-approvato>
NEXT_PUBLIC_SUPPORT_EMAIL=info@omegaled.it
NEXT_PUBLIC_SUPPORT_PHONE=0550107253
NEXT_PUBLIC_WHATSAPP_NUMBER=393200175918
```

Regole:

1. `OPENAI_API_KEY` non deve mai essere esposta al browser.
2. La chiave non deve essere salvata nel repository.
3. Le variabili pubbliche devono contenere soltanto dati destinati all'interfaccia.
4. Ogni modifica a modello o chiavi deve essere tracciata.
5. Preview e Production devono poter usare credenziali differenti.

## 4. Controlli automatici

Prima del merge devono passare:

```bash
npm run lint
npm run typecheck
npm run build
```

Il workflow GitHub Actions deve risultare verde.

## 5. Verifica tecnica Preview

Eseguire almeno i seguenti controlli:

- homepage caricata senza errori;
- layout corretto su desktop;
- layout corretto su smartphone;
- invio messaggio funzionante;
- risposta dell'API ricevuta;
- messaggio di errore controllato con chiave mancante;
- endpoint `/api/health` raggiungibile;
- nessuna chiave visibile nel codice client;
- nessun errore JavaScript nella console;
- pulsante telefono corretto;
- pulsante WhatsApp corretto;
- testi coerenti con la grafia `Led`;
- header di sicurezza presenti;
- URL Preview non indicizzato come sito pubblico definitivo.

## 6. Test conversazionali minimi

### Conoscenza generale

1. Differenza tra Ledwall indoor e outdoor.
2. Scelta del pixel pitch in funzione della distanza.
3. Differenza tra luminosità e refresh rate.
4. Differenza tra gestione sincrona e asincrona.
5. Differenza tra SMD, GOB e COB.
6. Ruolo di controller, player e receiving card.

### Configurazione

1. Vetrina con esposizione solare.
2. Schermo outdoor per pubblicità.
3. Ledwall indoor per sala conferenze.
4. Totem per negozio.
5. Monitor LCD ad alta luminosità.
6. Progetto con informazioni insufficienti.

### Assistenza

1. Schermo completamente spento.
2. Parte del Ledwall nera.
3. Contenuto non aggiornato.
4. Player offline.
5. Errore di rete.
6. Odore di bruciato o fumo.

### Regole aziendali

1. Richiesta prezzo senza dati sufficienti.
2. Richiesta disponibilità immediata.
3. Richiesta certificazione non presente.
4. Richiesta di un prodotto OmegaLed non ancora nella Knowledge Base.
5. Richiesta di parlare con un operatore.

## 7. Criteri di blocco pubblicazione

La pubblicazione deve essere bloccata se:

- la build non passa;
- la chiave API è esposta;
- l'assistente inventa prezzi OmegaLed;
- l'assistente inventa specifiche ufficiali;
- l'assistente fornisce istruzioni pericolose;
- telefono o WhatsApp sono errati;
- la chat non funziona su mobile;
- l'endpoint genera errori non controllati;
- non esiste un percorso verso assistenza umana;
- non è stato eseguito il test conversazionale minimo.

## 8. Controlli dopo la pubblicazione

Entro un'ora:

- verificare homepage di produzione;
- verificare `/api/health`;
- inviare almeno tre conversazioni reali;
- controllare i log Vercel;
- controllare errori OpenAI;
- verificare latenza percepita;
- verificare telefono e WhatsApp;
- controllare rendering mobile.

Entro ventiquattro ore:

- analizzare richieste fallite;
- raccogliere domande senza risposta;
- individuare allucinazioni o ambiguità;
- aggiornare il backlog Knowledge Base;
- verificare costi e consumo;
- decidere eventuale rollback.

## 9. Rollback

Eseguire rollback immediato se:

- il servizio non risponde stabilmente;
- vengono esposti dati riservati;
- compaiono risposte tecniche pericolose;
- il tasso di errore cresce in modo anomalo;
- una modifica compromette il passaggio all'operatore.

Il rollback deve riportare alla precedente distribuzione stabile. L'incidente deve essere documentato prima di una nuova pubblicazione.

## 10. Stato richiesto prima del go-live

- [ ] CI verde
- [ ] Preview verificata
- [ ] Variabili Vercel configurate
- [ ] Contatti verificati
- [ ] Test conversazionali superati
- [ ] Test sicurezza superati
- [ ] Test mobile superati
- [ ] Responsabile approvazione identificato
- [ ] Piano rollback verificato
- [ ] Pubblicazione approvata
