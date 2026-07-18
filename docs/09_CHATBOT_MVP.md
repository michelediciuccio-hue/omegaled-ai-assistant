---
id: OAP-CHAT-009
title: OmegaLed AI Platform - Chatbot MVP and Expert Assistant Roadmap
version: 1.0.0
status: Implementation Started
owner: Product Architecture
last_updated: 2026-07-18
priority: Critical
---

# OmegaLed AI Platform
## Chatbot MVP and Expert Assistant Roadmap

## 1. Obiettivo

Creare un assistente AI destinato a clienti, rivenditori e installatori capace di:

- rispondere a domande generali e tecniche su Ledwall, tecnologia Led, monitor LCD e Digital Signage;
- spiegare funzionamento, componenti, limiti, manutenzione e criteri di scelta;
- raccogliere i dati necessari per configurare uno schermo;
- preparare una pre-valutazione tecnica del progetto;
- raccogliere informazioni per una quotazione verificata da OmegaLed;
- fornire primo livello di assistenza;
- proporre sempre un contatto con consulenza o assistenza umana.

## 2. Principio fondamentale

Il chatbot non viene “addestrato” caricando indiscriminatamente documenti in un modello. La conoscenza deve essere costruita tramite:

1. modello AI con competenza generale;
2. prompt e regole operative OmegaLed;
3. Knowledge Base verificata;
4. ricerca RAG con citazioni;
5. strumenti strutturati per configurazione e CRM;
6. valutazioni automatiche e revisione umana.

La conoscenza generale non deve mai essere confusa con dati ufficiali OmegaLed.

## 3. Pubblici serviti

### Cliente finale

- orientamento nella scelta;
- spiegazioni semplici;
- configurazione guidata;
- pre-valutazione;
- richiesta consulenza e preventivo.

### Rivenditore

- supporto tecnico-commerciale;
- confronto tra soluzioni;
- documentazione;
- preparazione opportunità;
- escalation verso referente OmegaLed.

### Installatore

- procedure autorizzate;
- checklist;
- componenti e cablaggi;
- diagnosi iniziale;
- escalation immediata per sicurezza e guasti critici.

## 4. Ambiti di competenza

La Knowledge Base dovrà coprire almeno:

- principi Led e LCD;
- pixel pitch e distanza di visione;
- luminosità, contrasto e riflessioni;
- refresh rate e riprese video;
- risoluzione e aspect ratio;
- indoor, outdoor e vetrina;
- IP rating e condizioni ambientali;
- cabinet, moduli, alimentatori e receiving card;
- controller, sender, player e cloud;
- sistemi sincroni e asincroni;
- GOB, SMD, COB e tecnologie correlate;
- trasparenti, totem, insegne e bordocampo;
- installazione, strutture, ventilazione e manutenzione;
- consumi e alimentazione;
- contenuti e gestione remota;
- sicurezza operativa;
- diagnostica di primo livello;
- catalogo e prodotti OmegaLed;
- procedure commerciali OmegaLed;
- noleggio operativo;
- casi d'uso per settore.

## 5. Configuratore guidato

Per una configurazione completa il chatbot deve raccogliere:

1. tipo di utilizzatore;
2. obiettivo del progetto;
3. luogo di installazione;
4. uso indoor, outdoor o vetrina;
5. distanza minima e media di visione;
6. dimensioni disponibili;
7. orientamento e rapporto d'aspetto;
8. luminosità ambientale;
9. tipologia di contenuti;
10. necessità di ripresa video;
11. modalità di installazione;
12. gestione locale, app o cloud;
13. disponibilità elettrica e rete;
14. tempi di consegna;
15. budget indicativo;
16. città e contatti;
17. necessità di sopralluogo.

Il risultato deve contenere:

- riepilogo dei dati;
- ipotesi dichiarate;
- soluzione suggerita;
- alternative;
- dati mancanti;
- rischi o vincoli;
- richiesta di verifica a un consulente OmegaLed.

## 6. Quotazione

Il chatbot non genera un prezzo definitivo nella fase iniziale.

Può:

- raccogliere dati;
- stimare la classe di soluzione;
- indicare i componenti necessari;
- preparare una scheda progetto;
- inviare la richiesta a un operatore.

I prezzi saranno disponibili solo quando verrà introdotto un catalogo versionato con regole, validità, ruoli e approvazione.

## 7. Assistenza

Il chatbot deve distinguere:

- domanda informativa;
- problema software;
- problema di contenuto;
- problema di rete;
- problema di controller;
- problema di modulo o cabinet;
- problema elettrico;
- problema strutturale;
- emergenza di sicurezza.

Per elettricità, strutture, lavori in quota, surriscaldamento, odore di bruciato, fumo, infiltrazioni o rischio per persone deve interrompere la diagnosi operativa e indirizzare a personale qualificato.

## 8. Escalation umana

Ogni conversazione deve offrire una delle seguenti azioni contestuali:

- parlare con assistenza;
- richiedere una consulenza;
- essere richiamati;
- inviare una richiesta preventivo;
- aprire un ticket;
- contattare il referente commerciale.

L'offerta deve essere naturale, non ripetitiva e coerente con la richiesta.

## 9. Fasi di sviluppo

### Fase A - MVP conversazionale

- interfaccia chat;
- API OpenAI;
- prompt OmegaBot;
- memoria breve della conversazione;
- pulsanti assistenza e WhatsApp;
- raccolta manuale dei dati di progetto.

### Fase B - Knowledge Base

- caricamento documenti;
- classificazione;
- versionamento;
- chunking;
- embedding;
- retrieval ibrido;
- citazioni;
- pannello di revisione.

### Fase C - Configuratore

- flusso strutturato;
- salvataggio progetto;
- calcoli tecnici;
- generazione scheda tecnica preliminare;
- invio al consulente.

### Fase D - Assistenza e CRM

- apertura ticket;
- allegati e foto;
- identificazione prodotto;
- integrazione Ermete;
- assegnazione operatore;
- storico completo.

### Fase E - Quotazione controllata

- catalogo prezzi;
- regole commerciali;
- preventivo in bozza;
- approvazione umana;
- generazione PDF.

## 10. Criteri di accettazione MVP

- la chat funziona su desktop e mobile;
- nessuna chiave API è esposta al browser;
- gli input sono validati;
- l'assistente non inventa prezzi OmegaLed;
- l'assistente distingue dati generali e ufficiali;
- l'assistente propone contatto umano;
- gli errori mostrano un percorso alternativo;
- il prompt usa sempre “Led”;
- il progetto è distribuibile su Vercel;
- la successiva integrazione RAG non richiede una riscrittura completa della UI.
