3Civette Webapp – UI/UX Spec v1.0

Obiettivo: progettare un sito + webapp integrata per servizi Audio/Video/Luci orientati a hotel e centri congressi. La guida definisce design system, stile grafico, pattern UX, architettura informativa e specifiche tecniche per gli sviluppatori.

1) Brand & Tone of Voice

Personalità: affidabile, tecnico, elegante, rapido.

Voce: chiara, concreta, orientata al beneficio per l’hotel (zero pensieri, pieno controllo, revenue sharing su upsell tecnico).

Microcopy: verbi d’azione, frasi brevi; evitare gergo tecnico in hero e CTA.

2) Design Tokens (CSS Variables / Tailwind)

:root{
  /* Colori di base */
  --brand-black:#0B0B0C;      /* testi forti / header */
  --brand-ink:#111827;        /* corpi testo */
  --brand-gold:#D4AF37;       /* CTA, accenti */
  --brand-silver:#E5E7EB;     /* linee, bordi leggeri */
  --bg:#FFFFFF;               /* sfondo card/pagine */
  --bg-soft:#F8FAFC;          /* sezioni alternate */

  /* Stati */
  --ok:#16a34a; --warn:#f59e0b; --error:#dc2626;

  /* Tipografia */
  --font-display:"Archivo Black", "Bebas Neue", system-ui;
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";

  /* Spaziatura */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px; --space-8:32px; --space-12:48px; --space-16:64px;

  /* Raggi / Ombre */
  --radius:16px; --radius-lg:20px; --shadow:0 8px 24px rgba(0,0,0,.08);
}

Tailwind (consigliato): definire theme.extend.colors con brand.black/gold/ink, radius xl=20px, shadow brand.

3) Colori & Uso

Primario: --brand-black per header, testi titoli, footer.

Accento (CTA): --brand-gold (background dei bottoni primari, bullet attivi, badge). Testo su oro sempre nero per contrasto AAA.

Secondari: gradienti scuri discreti come background per hero/cover.

Bordi/Divisioni: --brand-silver 1px.

Esempi

Bottone primario: bg brand-gold, testo brand-black, hover: luminosità -8% + ombra.

Link: testo brand-ink, hover underline + tinta oro al 30%.

4) Tipografia

Display/Hero: --font-display (peso bold/black, letter-spacing leggero).

Testo: --font-sans 16–18px, line-height 1.6.

Gerarchie:

H1 48–64px (mobile 36–40) – display

H2 32–40px

H3 22–24px

Body 16–18px

Caption 13–14px

Stili: evitare più di 2 famiglie per pagina.

5) Layout & Grid

Container: max-width 1200px, padding orizzontale 24px (mobile) / 40px (desktop).

Griglie:

12 colonne desktop (gutter 24px),

6 colonne tablet,

4 colonne mobile.

Sezioni verticali: padding --space-12 (mobile) – --space-16 (desktop).

Hero: altezza 80–90vh, overlay scuro 0.35.

6) Componenti UI (specifiche)

Header

Sticky con fondo bianco 95% + backdrop-blur.

Sinistra: logo. Destra: nav + CTA Contattaci.

Mobile: hamburger → off-canvas a destra (full-height, focus-trap, ESC to close).

Bottoni

Primario: bg --brand-gold, testo --brand-black, radius --radius, padding 12×20, uppercase tracking-wide. Stato hover attivo/disabled.

Secondario: bordo 1px --brand-gold, testo --brand-gold, bg trasparente → hover bg --brand-gold 10%.

Cards

Fondo --bg, bordo --brand-silver, ombra --shadow, radius --radius.

Titolo H3, descrizione body, opzionale icona 24×24.

Liste servizi (3×2)

Griglia 3 colonne (mobile 1), icona + H3 + body.

Distanze: 16/8/16 (titolo/descrizione/button).

Form contatti

3 input + textarea, label visibili (non placeholder-only).

Bordo 1px --brand-silver, focus ring oro 2px.

Messaggi di errore in --error.

Check privacy obbligatoria + link policy.

Testimonianze / Loghi

Loghi in scala di grigi → colore on hover.

Footer

Sfondo --brand-black, testo bianco 80%, link in oro 80%.

7) Pattern UX chiave

CTA sempre visibile in header (desktop) e in hero (mobile/desktop).

Sezioni brevi con titolo + 3-6 bullet di beneficio → link a pagina di dettaglio.

Progressivo avvicinamento alla conversione:

Hero → CTA Consulenza

Servizi → CTA Preventivo

Case study → CTA Contattaci

Form più corto possibile (Nome, Email, Telefono, Messaggio, Privacy).

Accessibilità: contrasto AA/AAA, focus ring visibile, skip-to-content, aria-label per icone.

8) Architettura Informativa & Sitemap

Sito v1 (marketing)

/ Landing

Hero (promessa + CTA)

Valore per hotel (benefici chiave)

Servizi (AVL + allestimenti + manutenzione)

Portfolio (3–6 highlight)

Partnership / Revenue sharing

Testimonianze

Contatti (form + contatti diretti)

/servizi (dettaglio categorie + pacchetti)

/realizzazioni (grid case study, schede con gallery e numeri)

/chi-siamo (team, certificazioni, processi)

/contatti (form esteso, mappa, FAQ)

Webapp v1 (AREA HOTEL / CLIENTI)

/app (login)

Dashboard: prossimi eventi, stato impianti (se collegati), richieste in corso

Eventi: lista + dettaglio (timeline tecnica, materiali, planimetrie)

Ticketing tecnico: apri ticket, stato, chat con tecnico

Documenti: manuali sala, deliverable evento (schede, preventivi, consuntivi)

Profilo Struttura: sale, dotazioni, preferenze, recapiti

Ruoli: Admin 3Civette / Hotel Manager / Tecnico Sala / Cliente finale (solo lettura evento)

9) Architettura Frontend (tecnica)

Stack consigliato: Next.js (app router) + Tailwind + Headless UI (modal, dialog) + Zod (validation) + React Query (dati async).

Routing:

Sito pubblico: SSR/SSG.

Webapp: CSR ibrido con hydration + protected routes.

State: React Query per remote, Zustand per UI locale.

Forms: React Hook Form + Zod; invio a API /api/contact (rate limit + captcha).

Immagini: Next/Image per pubblico; in webapp preview documenti/planimetrie (PDF viewer).

Accessibilità: eslint-plugin-jsx-a11y, test con axe.

Performance: immagini lazy, font display swap, code-splitting per pagina.

10) Component Tree (estratto)

<RootLayout>
  <Header />
  <Main>
    <Hero />
    <ValueProps />
    <ServicesGrid />
    <PortfolioCarousel />
    <PartnershipBanner />
    <Testimonials />
    <ContactForm />
  </Main>
  <Footer />
</RootLayout>

// Webapp
<AppLayout>
  <Sidebar />
  <Topbar />
  <Dashboard />
  <EventsList />
  <EventDetail>
    <Timeline /> <TechChecklist /> <DocsGallery /> <Chat />
  </EventDetail>
  <Tickets />
  <Profile />
</AppLayout>

11) Specifiche Interazioni

Menu mobile: animazione slide 200ms, overlay dim 40%, trap del focus, chiusura via ESC e swipe-back.

Cards: hover lift translateY(-2px) + shadow più intensa.

CTA: ripple/press feedback 120ms.

Form: error under input + toast di successo; invio con Enter.

12) SEO & Analytics

SEO: title ≤ 60, meta description ≤ 160; schema.org Organization, Service e Event per case study.

OG: og:image 1200×630, og:title, og:description.

Analytics: GA4 + eventi personalizzati (lead_submit, cta_click, portfolio_open). Consent mode.

13) Accessibilità (Checklist)

Contrasto ≥ AA (testare oro/nero e oro/bianco).

Focus ring visibile per tutti i controlli.

Label esplicite e aria-* per icone.

Skip link Salta al contenuto.

Test tastiera: 100% navigabile.

14) Contenuti & Copy (linee guida)

Headline: promessa di risultato (“Soluzioni tecniche chiavi in mano per hotel e centri congressi”).

Sottotitolo: come lo facciamo (integrazione sale + personale qualificato).

Proof: numeri (eventi/anno, capienze gestite, tempi medi risposta).

CTA: “Richiedi una consulenza gratuita” / “Scarica scheda service”.

15) Libreria Componenti (naming + props)

Button({variant:"primary|secondary|ghost", size:"sm|md|lg", iconLeft?, iconRight?})

Card({title, subtitle?, media?, actions?})

ServiceItem({icon, title, desc})

Testimonial({quote, author, role, logo?})

ContactForm({onSubmit}) → valida con Zod, restituisce {ok:boolean, error?:string}.

AppSidebar({role}) (webapp)

EventRow({id, title, date, room, status}) (webapp)

16) Esempi di classi Tailwind

Bottoni primari: inline-flex items-center justify-center rounded-xl px-5 py-3 bg-brand-gold text-brand-black font-semibold uppercase tracking-wide hover:brightness-95 shadow

Card: rounded-2xl border border-gray-200 shadow bg-white

Input: rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent

17) Roadmap UI

v1: landing + form + portfolio + pagina servizi.

v1.1: testimonianze, case study, FAQ.

v2 (webapp): login, dashboard eventi, ticketing tecnico, documenti.

v2.1: notifiche email/push, calendario condiviso, export PDF.

18) Definition of Done (UI)

Pixel-fit vs spec ≥ 95% sugli allineamenti.

AA contrast pass su tutte le pagine.

LCP < 2.5s su 4G, immagini lazy.

Test tastiera completo.

Eventi GA4 tracciati per CTA e submit form.

19) Materiali

Logo vettoriale (SVG)

10–12 foto eventi (min. 1600px)

Icone outline 24px coerenti (Lucide/Feather)

Font web (display + sans) con licenza.

20) Note per Dev

Centralizzare i token (Tailwind + CSS vars). Niente colori hardcoded nei componenti.

Ogni componente deve supportare className e data-testid.

Usare aria-* su menu, dialog, tab, accordion (Headless UI consigliato).

Validazione lato client + server (Zod). Rate-limit sulle API dei form.

Preparare un file README_DESIGN.md con screenshot delle sezioni reali.