# Feature Specification: Pagina Pubblica Evento

**Feature Branch**: `004-facciamo-la-pagina`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "facciamo la pagina pubblica dell'evento"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Public event page accessible via URL slug
2. Extract key concepts from description
   → Actors: Partecipanti (anonimi/autenticati), Organizzatori
   → Actions: Visualizzare evento, scaricare slide, navigare sessioni/speech
   → Data: Eventi, sessioni, speech, slide, metriche
   → Constraints: Gestione privacy (pubblico/privato), token access
3. For each unclear aspect:
   → ✓ Layout gerarchico: hybrid (sessions expanded, speeches collapsed)
   → ✓ Download slide: singoli + batch ZIP (per-speech e per-session)
   → ✓ Metriche pubbliche: solo base (page_views e total_downloads), premium riservate ad admin
4. Fill User Scenarios & Testing section ✓
5. Generate Functional Requirements ✓
6. Identify Key Entities ✓
7. Run Review Checklist
   → WARN "Spec has 3 uncertainties - needs clarification"
8. Return: SUCCESS (spec ready for planning with clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-07
- Q: How should the event content be organized on the page? → A: Hybrid - sessions expanded, speeches collapsed within each session
- Q: Should the system support batch downloading of slides? → A: Yes - both per-speech and per-session ZIP downloads
- Q: Which metrics should be publicly visible to event participants on the public page? → A: Basic only - show page views and total downloads count
- Q: Should the system enforce rate limits on slide downloads? → A: Per-IP limit - max 50 downloads per hour per IP address
- Q: How should users provide access tokens for private events? → A: Form input only - show token input form on private event page

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
**Come partecipante ad un evento**, voglio accedere alla pagina pubblica dell'evento tramite un link condiviso, in modo da visualizzare il programma completo, i relatori, e scaricare le slide delle presentazioni che mi interessano.

**Come organizzatore**, voglio che i partecipanti possano facilmente navigare il contenuto dell'evento in modo gerarchico (evento → sessioni → speech → slide), con la possibilità di scaricare materiali e visualizzare informazioni aggiornate.

### Acceptance Scenarios

#### Scenario 1: Accesso a evento pubblico
1. **Given** un evento pubblico con slug "conferenza-2025"
   **When** l'utente naviga a `/events/conferenza-2025`
   **Then** la pagina mostra:
   - Nome e descrizione dell'evento
   - Data dell'evento
   - Metriche pubbliche: numero di visualizzazioni pagina e numero totale di download
   - Elenco di tutte le sessioni ordinate
   - Per ogni sessione: titolo, descrizione, orario

#### Scenario 2: Navigazione gerarchica sessioni/speech
1. **Given** un evento con 3 sessioni, ognuna con 2-3 speech
   **When** l'utente visualizza la pagina evento
   **Then** il sistema mostra:
   - Tutte le sessioni espanse visibili contemporaneamente in ordine di display_order
   - Ogni sessione contiene gli speech collassati (solo titoli visibili)
   - Utente può cliccare su uno speech per espandere e vedere: relatore, durata, descrizione, slide disponibili

#### Scenario 3: Download slide singola e batch
1. **Given** uno speech con 3 file PDF caricati
   **When** l'utente clicca su "Scarica" per una slide specifica
   **Then** il sistema:
   - Avvia il download del file individuale
   - Registra l'azione nel activity log (actor_type: anonymous/participant)
   - Incrementa il contatore downloads per quella slide

2. **Given** una sessione con 2 speech, ciascuno con 2 slide
   **When** l'utente clicca su "Scarica tutte le slide della sessione"
   **Then** il sistema:
   - Genera un file ZIP contenente tutte le 4 slide (organizzate per speech)
   - Avvia il download del ZIP
   - Registra un'azione batch_download nel activity log

3. **Given** uno speech con 3 slide
   **When** l'utente clicca su "Scarica tutte le slide dello speech"
   **Then** il sistema:
   - Genera un file ZIP contenente le 3 slide
   - Avvia il download del ZIP
   - Registra l'azione nel activity log

#### Scenario 4: Accesso a evento privato senza token
1. **Given** un evento privato con visibility="private"
   **When** l'utente naviga a `/events/slug-privato`
   **Then** il sistema:
   - Mostra una pagina di "Accesso Richiesto"
   - Visualizza un form con input per token (21 caratteri)
   - Spiega come ottenere il token (contattare organizzatore)
   - Form include bottone "Accedi" per submit

#### Scenario 5: Accesso a evento privato con token
1. **Given** un evento privato con form token visibile
   **When** l'utente inserisce un token valido nel form e clicca "Accedi"
   **Then** il sistema:
   - Valida il token (formato, scadenza, event_id)
   - Registra l'accesso (last_used_at, use_count)
   - Memorizza il token in browser session storage
   - Mostra il contenuto dell'evento completo

2. **Given** un token già memorizzato in session storage
   **When** l'utente ricarica la pagina o naviga nuovamente
   **Then** il sistema:
   - Recupera automaticamente il token da session storage
   - Revalida il token
   - Mostra contenuto senza richiedere nuovo input

#### Scenario 6: Visualizzazione stato evento
1. **Given** eventi con status diversi (upcoming, past, archived)
   **When** l'utente accede alla pagina
   **Then** il sistema mostra:
   - Badge visivo dello status (es: "In programma", "Concluso", "Archiviato")
   - Per eventi past/archived: indicazione che il contenuto è storico
   - Download sempre disponibili indipendentemente dallo status

### Edge Cases
- **Evento non trovato**: Cosa mostrare se lo slug non esiste?
  → Pagina 404 personalizzata con suggerimenti (torna alla home, contatta supporto)
- **Token scaduto**: Come gestire token validi ma scaduti?
  → Messaggio esplicativo "Token scaduto, contatta l'organizzatore per un nuovo accesso"
- **Evento senza sessioni**: Come mostrare evento vuoto?
  → Messaggio informativo "Nessuna sessione ancora disponibile, torna più tardi"
- **Speech senza slide**: Come indicare speech senza materiali?
  → Etichetta "Slide non disponibili" o nascondere la sezione download
- **Rate limit superato**: Come gestire utenti che superano 50 download/ora?
  → Mostrare messaggio "Limite download raggiunto (50/ora). Riprova tra X minuti." con Retry-After header

---

## Requirements *(mandatory)*

### Functional Requirements

#### Visualizzazione Evento
- **FR-001**: Il sistema DEVE mostrare la pagina evento accessibile tramite URL `/events/{slug}`
- **FR-002**: Il sistema DEVE visualizzare nome, descrizione, data e status dell'evento
- **FR-003**: Il sistema DEVE mostrare tutte le sessioni ordinate per display_order crescente
- **FR-004**: Per ogni sessione, il sistema DEVE mostrare titolo, descrizione e orario (se presente)
- **FR-005**: Per ogni speech, il sistema DEVE mostrare titolo, nome relatore, durata e descrizione

#### Controllo Accesso
- **FR-006**: Il sistema DEVE bloccare l'accesso a eventi privati senza token valido, mostrando form input
- **FR-007**: Il sistema DEVE fornire un form con input testo (21 caratteri) e bottone "Accedi" su eventi privati
- **FR-008**: Il sistema DEVE validare token verificando: formato (21 caratteri), scadenza (expires_at), appartenenza all'evento
- **FR-009**: Il sistema DEVE registrare accessi con token (aggiornare last_used_at e use_count)
- **FR-010**: Il sistema DEVE distinguere accessi organizer (permessi completi) da participant (solo visualizzazione)
- **FR-011**: Il sistema DEVE memorizzare token valido in browser session storage dopo primo accesso
- **FR-012**: Il sistema DEVE auto-validare token da session storage su page load, senza richiedere nuovo input
- **FR-013**: Il sistema DEVE mostrare messaggio chiaro se token invalido/scaduto ("Token non valido o scaduto")

#### Download Slide
- **FR-014**: Il sistema DEVE permettere download di singole slide tramite link diretto
- **FR-015**: Il sistema DEVE registrare ogni download nel activity_log (actor_type, action_type=download/batch_download, filename, file_size)
- **FR-016**: Il sistema DEVE incrementare contatori metriche (total_slide_downloads, per_slide_downloads)
- **FR-017**: Il sistema DEVE permettere download batch come ZIP: tutte le slide di uno speech, oppure tutte le slide di una sessione (organizzate per speech)
- **FR-018**: Il sistema DEVE mostrare nome file, dimensione e tipo (PDF/PPT/etc) per ogni slide
- **FR-019**: Il sistema DEVE generare nomi ZIP descrittivi (es: "sessione-titolo-slides.zip", "speech-titolo-slides.zip")
- **FR-020**: Il sistema DEVE applicare rate limit per IP: massimo 50 download per ora (include singoli e ZIP)
- **FR-021**: Il sistema DEVE rispondere con HTTP 429 e Retry-After header quando il rate limit viene superato
- **FR-022**: Il sistema DEVE mostrare messaggio user-friendly quando rate limit viene raggiunto, indicando tempo rimanente

#### Metriche e Tracking
- **FR-023**: Il sistema DEVE incrementare page_views ogni volta che la pagina evento viene caricata
- **FR-024**: Il sistema DEVE tracciare unique_visitors usando hash IP (solo visibile in admin dashboard, non pubblico)
- **FR-025**: Il sistema DEVE mostrare pubblicamente solo metriche base: page_views totali e total_slide_downloads
- **FR-026**: Il sistema DEVE mantenere metriche premium (unique_visitors, per_slide_downloads) private, accessibili solo ad admin/organizers
- **FR-027**: Il sistema DEVE rispettare retention_days per activity_logs (configurabile per evento)

#### Presentazione Contenuto
- **FR-028**: Il sistema DEVE usare layout ibrido: sessioni espanse visibili contemporaneamente, speech collassati (espandibili al click) all'interno di ogni sessione
- **FR-029**: Il sistema DEVE mostrare badge status visivo (upcoming=blu, past=grigio, archived=giallo)
- **FR-030**: Il sistema DEVE mostrare messaggio informativo per eventi senza sessioni/speech
- **FR-031**: Il sistema DEVE gestire slug non trovati con pagina 404 personalizzata

#### Responsive e Accessibilità
- **FR-032**: La pagina DEVE essere completamente responsive (mobile, tablet, desktop)
- **FR-033**: La pagina DEVE essere accessibile (WCAG 2.1 AA minimum)
- **FR-034**: I link download DEVONO essere chiaramente identificabili e accessibili da tastiera

### Key Entities

- **Evento**: Contenitore principale accessibile tramite slug URL, con attributi visibilità (public/private), status (upcoming/past/archived), e data
- **Sessione**: Raggruppamento tematico o temporale all'interno di un evento, con titolo, descrizione, orario e ordinamento
- **Speech**: Presentazione individuale all'interno di una sessione, con relatore, durata e materiali collegati
- **Slide**: File scaricabile (PDF, PPT, Keynote, ODP) associato ad uno speech, con nome, dimensione e tipo
- **Token**: Credenziale di accesso per eventi privati, con scadenza e tipo (organizer/participant)
- **Metriche**: Contatori di visualizzazioni e download a livello evento/slide
- **Activity Log**: Registro azioni (view, download) con retention configurabile

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 5 clarified)
  - Layout gerarchico: hybrid (sessions expanded, speeches collapsed) ✓
  - Download batch ZIP: per-speech e per-session ✓
  - Metriche pubbliche visibili: solo base (page_views, total_downloads) ✓
  - Rate limiting: 50 downloads/hour per IP ✓
  - Token input: form input only con session storage ✓
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (page views, downloads tracciati)
- [x] Scope is clearly bounded (solo visualizzazione pubblica, no editing)
- [x] Dependencies and assumptions identified (Feature 003 già implementata)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (visualizzazione, download, accesso)
- [x] Ambiguities resolved (5 clarifications completed)
- [x] User scenarios defined (6 acceptance scenarios + edge cases)
- [x] Requirements generated (34 functional requirements)
- [x] Entities identified (7 key entities)
- [x] Review checklist passed

---

## Dependencies

**Prerequisiti**:
- Feature 003 (Event Flow Management) DEVE essere completamente implementata e deployed
- Tabelle database: events, sessions, speeches, slides, access_tokens, event_metrics, activity_logs
- Supabase Storage configurato per bucket "slides" con RLS policies

**Impatto su Feature Esistenti**:
- Nessun breaking change previsto
- Estende funzionalità pubbliche senza modificare admin panel

---

## Success Metrics

- **Adozione**: > 80% eventi creati hanno almeno 1 visualizzazione pubblica entro 7 giorni
- **Engagement**: Tempo medio sulla pagina > 2 minuti per eventi con 3+ sessioni
- **Download**: > 30% visitatori scaricano almeno 1 slide
- **Performance**: Caricamento pagina < 2s (3G mobile, evento con 50 slide)
- **Accessibilità**: Score Lighthouse Accessibility > 90

---
