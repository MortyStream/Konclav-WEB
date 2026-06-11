# Konclav — Notes pour Claude Code

Site marketing d'une app intranet privée pour associations suisses. Site statique, design Linear-inspired, fini à ~95% en termes de structure.

## Stack

- **Astro 6.3.7** static output (`npm run build` → `dist/`)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, pas de `tailwind.config.js` — tokens dans `src/styles/global.css` via `@theme`)
- **@astrojs/sitemap** pour `sitemap-index.xml` au build
- **Inter** auto-hébergée via `@fontsource/inter` (subsets latin uniquement, weights 400/500/600/700 + 300/400 italic pour `.italic-display`)
- Zéro framework JS — scripts `is:inline` dans `Layout.astro` et `JoinModal.astro`
- View Transitions natives MPA via `@view-transition { navigation: auto; }` (pas de `ClientRouter` SPA)
- **express** uniquement pour servir `dist/` en prod via `server.js` (cf. déploiement Infomaniak)

## Design system

Tokens dans `src/styles/global.css`:

```
--color-ink-950: #08090a   /* background */
--color-ink-900: #0f1011
--color-ink-800: #111214
--color-ink-50:  #f4f4f5   /* texte primaire */
--color-ink-200: #e4e4e7
--color-ink-300: #d4d4d8
--color-ink-400: #a1a1aa   /* texte muted */
--color-ink-500: #8b8b94   /* WCAG AA sur ink-950 : 5.1:1 */
--color-accent-500: #5e6ad2  /* accent Linear (réservé fonds/bordures) */
--color-accent-400: #7170ff  /* accent pour texte (5.18:1 sur ink-950) */
--color-accent-300: #9b9bff
```

Conventions visuelles :
- **Fond** : `bg-ink-950` (jamais `#000000` pur — smear OLED)
- **Cards** : `border border-white/10 bg-white/[0.02] rounded-2xl`
- **Halos** : `radial-gradient(closest-side, #5e6ad2, transparent 70%)` à `opacity 0.2–0.3`, blur `3xl`, placé en `-z-10`
- **Easing** : `cubic-bezier(0.16, 1, 0.3, 1)` partout (animations + transitions)
- **Type** : `text-balance` sur les H1, `tracking-tight`, `font-feature-settings: 'cv11' 1, 'ss03' 1, 'calt' 1` pour le look Linear
- **Reveals scroll** : marquer un élément avec `data-reveal`, l'IntersectionObserver dans `Layout.astro` ajoute `is-visible`
- **Effets retirés (audit 10/06/2026)** : cursor-spotlight, boutons magnétiques, tilt 3D, draw-on-scroll — ne pas réintroduire

## Arborescence

```
src/
  layouts/
    Layout.astro          # head + meta + scripts globaux + JoinModal monté ici
    LegalLayout.astro     # wrapper pages légales (prose-legal, tables, blockquote, code)
  components/
    Navbar.astro          # liens + burger mobile (focus-trap, aria-current)
    Hero.astro            # H1 + 2 stats (Audience / Données app) + PhoneFan ou carrousel mobile
    Features.astro        # 4 cards bento (Tâches/Agenda/Documents/Membres)
    Security.astro        # 2 bentos stats + 4 points (RLS/TLS/2FA/Backups)
    TrustBand.astro       # 4 badges (Conçu en Suisse / Conforme LPD-RGPD / Sans engagement / AES-256)
    PriceSimulator.astro  # 2 sliders + résultat live (aria-live)
    Onboarding.astro      # 3 étapes (Demande / Provisionnement / Go live)
    FAQ.astro             # <details> + JSON-LD FAQPage
    CTAFinal.astro        # box spotlight
    Footer.astro          # liens produit + légaux (incl. /sous-traitance)
    Icon.astro            # 10 icons SVG inline
    Logo.astro            # <img> logo-mark.png (TODO: passer en SVG)
    PhoneShot.astro       # frame iPhone unique (prop `priority` pour LCP)
    PhoneFan.astro        # éventail desktop de 4 PhoneShot (Hero lg+)
    JoinModal.astro       # modal wizard 4 étapes → POST JSON Edge Function Supabase website-lead-submit (honeypot + focus-trap)
    CTAButton.astro       # bouton CTA réutilisable (primary/secondary, joinOpen)
  pages/
    index.astro
    admin.astro           # Cockpit admin (noindex, hors sitemap, aucun lien) — auth Supabase + RLS email
    inscription.astro     # carrousel d'écrans + CTA inscription (ex-demo.astro ; redirect 301 /demo → /inscription dans server.js)
    tarifs.astro          # Pack fondateurs + 2 plans + simulateur + inclus + FAQ + CTA
    404.astro             # noindex
    confidentialite.astro # politique nLPD/RGPD complète
    conditions.astro      # CGU (essai 14 j inclus)
    sous-traitance.astro  # DPA art. 9 nLPD / art. 28 RGPD — noindex + exclu sitemap
    mentions-legales.astro
  styles/
    global.css            # tokens @theme + utilities (reveal/spotlight/bento/cta-shimmer/.join-error…)
public/
  favicon-32.png / favicon-192.png / apple-touch-icon.png
  logo-mark.png           # 256×256
  og.jpg                  # 1200×630, ~27 Ko
  robots.txt
  app/*.webp              # 7 screenshots de l'app (utilisés par PhoneShot)
```

## État actuel

Site fonctionnellement complet. Deux campagnes d'audit hostile (5 puis 4 personas en parallèle) ont produit ~8 commits de corrections couvrant :

- **Honnêteté marketing** : claims absolus retirés (« 0 tracker » / « jamais hors UE » / « TVA incluse » / « synchro Google et Apple ») reformulés en versions vraies (Umami divulgué, transferts US documentés, prix nets)
- **Sécurité** : en-têtes complets dans `server.js` (CSP, HSTS, COOP/CORP, Permissions-Policy verrouillée, X-Robots-Tag pour DPA/404), `.htaccess` legacy supprimé, compression + graceful shutdown, honeypot anti-spam sur le formulaire
- **Conformité légale** : 4 pages nLPD/RGPD/DPA complètes, info Google Forms (US) au point de collecte, base précontractuelle au lieu du faux consentement
- **A11y** : `<noscript>` anti-page-blanche, skip-link, focus-trap robuste (modal + menu mobile), contrastes AA (accent-400 pour texte), `role="alert"`, `aria-required`, formulaire complet
- **Perf** : polices auto-hébergées **latin-only** (28 → 6 woff2), LCP eager+fetchpriority sur les phones centraux, OG en JPEG (225 → 27 Ko), suppression de ~10 classes CSS mortes et d'un block JS counter buggué

Composants supprimés au passage : `screens/`, `bento/`, `PhoneFrame.astro` (jamais importés).

## Placeholders / actions restantes avant prod

Les pages légales sont remplies avec les vraies infos (Kévin Perret, Sion, `contact@konclav.ch`, statut personne physique non assujettie TVA). Restent :

- **Date des pages légales** : confidentialité + conditions au `10 juin 2026` ; mentions-légales + sous-traitance encore au `27 mai 2026`, à rebumper si édition.
- **OG image** : régénérer si le H1 change (script non versionné, cf. section dédiée).

## Commandes utiles

```bash
npm run dev        # localhost:4321
npm run build      # → dist/ avec sitemap-index.xml généré
npm run preview
npm start          # node server.js → sert dist/ sur PORT (3000 par défaut), utilisé par Infomaniak
```

## Déploiement Infomaniak (Node.js v24)

L'hébergement Infomaniak du domaine `konclav.ch` est configuré en **Site Node.js** (pas en static Apache). Le projet reste un Astro static output, mais on ajoute un petit `server.js` (express) qui sert `dist/` sur le port fourni par Infomaniak.

Paramètres avancés Node.js dans le manager Infomaniak :

| Champ | Valeur |
|---|---|
| Version de Node.js | 24 |
| Commande d'exécution | `npm start` |
| Port d'écoute | 3000 |
| Commande de construction | `npm install && npm run build` |

Le serveur (`server.js`) :
- Écoute sur `process.env.PORT || 3000`
- Sert `dist/` avec `express.static`, extension `.html` implicite (donc `/tarifs/` → `dist/tarifs/index.html`)
- **En-têtes de sécurité** : CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy verrouillée, COOP/CORP, Origin-Agent-Cluster
- `X-Robots-Tag: noindex` automatique sur `/sous-traitance` et `/404`
- Compression `gzip` activée
- Cache long (1 an, immutable) sur les assets versionnés, `max-age=0, must-revalidate` (ETag strong) sur les HTML
- Fallback 404 → `dist/404.html`
- Graceful shutdown sur SIGTERM/SIGINT

Upload du code sur Infomaniak via FTP/SSH ou Git (cf. onglet FTP/SSH du manager). Après upload, Infomaniak lance `npm install && npm run build` puis `npm start`.

## Backend partagé avec l'app (Supabase Zurich)

Le formulaire d'inscription n'utilise PLUS Google Forms. Architecture :

- **Projet Supabase** : `Konclav.app` (`ehbdngidjrkhfrprfgqg`, eu-central-2 Zurich) — le MÊME que l'app mobile. L'autre projet (`Konclav`, Irlande) est legacy, ne pas l'utiliser.
- **Table `public.leads`** : propriété de CE repo. RLS activée, AUCUNE policy (deny-by-default), accès service_role uniquement. Un `comment on table` le documente en base. L'app mobile ne doit ni lire ni écrire dedans — et réciproquement, ce repo ne touche à AUCUNE autre table.
- **Edge Function `website-lead-submit`** (verify_jwt=false) : valide (honeypot `website`, rate-limit IP 1/60s, caps longueur), insert dans `leads`, mail récap à `contact@konclav.ch` via Resend (`RESEND_API_KEY` déjà en secret, domaine vérifié, pattern copié de `send-bug-email`).
- **CSP** : `connect-src` inclut `https://ehbdngidjrkhfrprfgqg.supabase.co` dans `server.js`.
- **Cockpit admin Phases A + B** : `konclav.ch/admin` (page statique vanilla JS, clé publishable), 3 onglets — Inscriptions / Audience / Facturation. Migration `cockpit_admin_leads_access` (leads) + `cockpit_billing_schema` (customers, invoices, invoice_lines — numérotation auto INV-YYYY-NNN par trigger+sequence, totaux recalculés par trigger, RLS via `public.is_konclav_admin()` = email `contact@konclav.ch`) + `cockpit_analytics_internal` (page_events + RPC `cockpit_analytics(p_period)`). Compte auth créé à la main dans le dashboard.
- **Analytics maison** (Umami Cloud abandonné — son API de lecture est paywallée ~20 CHF/mois) :
  - Tracker inline dans `Layout.astro` (~30 lignes) → POST `text/plain` (pas de preflight CORS) vers Edge Function `website-track` (verify_jwt=false). Expose `window.konclavTrack('nom-event')` — utilisé par JoinModal pour `join-submit`.
  - `website-track` : filtre bots (regex UA), rate-limit 120/min/IP, ignore `/admin*`, anonymise : `visitor_hash = SHA-256(sel-quotidien + IP + UA)` tronqué 32 chars, sel dérivé du service_role key + date UTC (rotation minuit, zéro secret à gérer). Ni IP ni UA stockés. Pays dérivé de la timezone navigateur (`TZ_COUNTRY` map), pas de géo IP.
  - Table `public.page_events` : RLS select admin-only, écriture service_role uniquement. Rétention 13 mois (purge opportuniste dans la RPC). `event` null = pageview, sinon événement custom.
  - RPC `cockpit_analytics('24h'|'7d'|'30d'|'90d')` : security definer + gate email, renvoie JSON complet (stats, série temporelle Europe/Zurich avec trous à zéro, top pages/sources/pays/browsers/devices/events). Conséquence assumée : un visiteur qui revient le lendemain compte comme nouveau (anonymisation 24 h, comme Plausible).
- **Edge Functions cockpit** : `cockpit-invoice-pdf` **v2** (verify_jwt + double check email ; pdf-lib + qrcode via esm.sh ; A4 + QR Swiss Payments Code v2.2, adresses type K, réf NON, **croix suisse dessinée au centre du QR** (ECC M) ; NPA/localité émetteur surchargables via secrets `QR_ISSUER_ZIP`/`QR_ISSUER_CITY`, défaut 1950 Sion ; charge les données via PostgREST avec le JWT user pour respecter la RLS). `cockpit-umami-stats` existe encore mais est ORPHELINE (plus appelée — à supprimer du dashboard à l'occasion, pas de tool MCP delete).
- **Sprint 1 cockpit (11/06/2026)** — migration `sprint1_save_invoice_mfa_guards` :
  - `is_konclav_admin()` v2 (security definer) : exige une session **aal2** dès qu'un facteur TOTP vérifié existe — sinon aal1 suffit, zéro lockout. Gate de `cockpit_analytics` passé dessus aussi. UI 2FA dans `admin.astro` : bouton « 2FA » dans le header → modal enrôlement (QR via GoTrue `/auth/v1/factors`) ou désactivation ; écran de challenge au login. Téléphone perdu = supprimer le facteur dans le dashboard Supabase (Authentication → Users).
  - RPC `save_invoice(p_invoice jsonb, p_lines jsonb)` security invoker (RLS s'applique), grant `authenticated` only — remplace le PATCH→DELETE→POST fragile du modal facture.
  - Contraintes : `qty >= 0`, `unit_price >= 0`, `vat_rate` 0–100 (+ migration précédente `counter_audit_hardening` : revoke EXECUTE sur les 5 fonctions trigger, search_path fixé).
  - Front cockpit : toasts (plus aucun `alert()`), KPIs cash (encaissé ce mois / en attente / en retard / encaissé total, échéances dépassées en rose), AbortController sur les 4 loaders, message suppression client honnête (FK RESTRICT, erreur 23503 détectée), PDF ouvert via ancre `rel=noopener`, `<th scope="col">`.
  - HIBP (leaked password protection) : abandonné — réservé au plan Pro Supabase ; compensé par le 2FA TOTP (gratuit).
- **Sprint 2 cockpit (11/06/2026) — CRM + provisionnement (Phase C livrée)** — migration `sprint2_crm_provisioning` :
  - **Onglet Aperçu** (défaut) : KPIs cliquables (à relancer / demandes 7 j / retards / encaissé du mois) + listes avec saut direct au lead.
  - **CRM leads** : `leads.next_action_at` (rappel, badge 🔔 rose si dépassé), table `lead_events` (journal immuable RLS admin : status_change / note / email_sent / reminder_set / provisioned), timeline dans le card, envoi d'emails depuis 4 templates éditables via Edge Function `cockpit-send-email` (Resend `noreply@konclav.ch`, reply-to contact@, rate-limit 10/min, caps 200/5000).
  - **Provisionnement** (Edge Function `cockpit-orgs`, validée explicitement) : bouton 🚀 sur le lead → crée `organizations` + compte auth président (mdp temporaire affiché UNE fois au cockpit, `mustChangePassword=true`, pattern de `create-member-account`) + `users` (role admin, associationRole president = bootstrap org neuve, dérogation documentée à la règle red-team) + lie `customers.org_id`/`leads.provisioned_org_id` (uuid souples, PAS de FK vers les tables de l'app) + email d'accès Resend + rollback complet si échec. GET = liste orgs (membres, président, dernière connexion), PATCH = suspendre/réactiver (`isActive`). Gate : email admin + aal2 si 2FA (fail closed).
  - **Recherche globale ⌘K / Ctrl+K** : leads + clients + factures, navigation clavier, saut contextuel (ouvre le card lead / le modal facture).
  - Périmètre app strictement limité à `organizations` + `users` via `cockpit-orgs` — aucune autre table de l'app touchée, aucune FK depuis nos tables.
- **Sprint 3 cockpit (11/06/2026) — facturation récurrente** — migration `sprint3_subscriptions_billing` :
  - Table `subscriptions` (RLS admin, FK customers CASCADE) + colonnes `invoices.subscription_id` (FK interne SET NULL) / `last_reminder_at` / `reminder_count`.
  - `billing_daily()` (security definer, gate admin OU session_user postgres) : flip sent→overdue + génère les factures d'abonnement échues en **draft** (rattrapage max 24 périodes). Appelée par **pg_cron** `konclav-billing-daily` (05:00 UTC, quotidien) ET en opportuniste à l'ouverture de l'onglet Factures.
  - Edge Function `cockpit-invoice-reminder` : relance manuelle par facture (Resend, ton courtois puis ferme selon reminder_count, passe sent→overdue si échu). Même gate que les autres fonctions cockpit.
  - Front : sous-onglet Abonnements (CRUD, pause/reprise), bouton Relancer + compteur, badge 🔄 sur factures auto, export CSV (`;` + BOM Excel), vue Kanban leads (drag & drop = statut + lead_event), lignes Assos dépliables (factures/encaissé/en cours du client lié).
- **Sprint 4 cockpit (11/06/2026) — « mets tout »** — migration `sprint4_credit_notes_settings_monitoring` :
  - **Avoirs** : `invoices.doc_type` ('invoice'|'credit_note') + `credit_for_invoice_id` (FK interne SET NULL). Bouton « Avoir » → duplique en brouillon via `save_invoice` v2 (gère doc_type). Badge AVOIR, comptés négatifs dans les KPIs, PDF v3 (titre NOTE DE CRÉDIT, pas de section paiement/QR, mention facture corrigée).
  - **Rapprochement bancaire** : modal coller-relevé → match par n° de facture (pré-coché) ou montant exact (proposé) → marquage payé en lot. Pur front.
  - **Email groupé** : Edge Function `cockpit-broadcast` (segments leads actifs/convertis/clients, batch Resend 50, envois individuels, cap 200, 1/min, lead_events journalisés).
  - **Templates email éditables** : table `cockpit_settings` (key/value jsonb, RLS admin), clé `email_templates`, éditeur dans le modal email (« ✎ Modèles »), upsert PostgREST merge-duplicates.
  - **Monitoring** : RPC `cockpit_monitoring()` (runs pg_cron 7 j via cron.job_run_details, leads dormants 14 j, brouillons auto, factures en retard) + Edge Function `cockpit-monitoring` (20 derniers emails Resend avec statut — endpoint list dégradé proprement si indispo — et 20 derniers `bug_reports` de l'app, LECTURE SEULE validée explicitement). Affiché dans l'Aperçu : cards Conversion (taux, temps moyen, top source — calculés de leads + lead_events) / Santé système / Bugs signalés.
  - Pastille santé par asso (last_login : 🟢≤7 j 🟡≤30 j 🔴 au-delà/jamais), onglet actif persisté (sessionStorage `ck_tab`).
  - **Upgrades** : Astro 6.4.6, Express 5.2.1 (smoke tests : 200 sur /, /tarifs/, /admin/, 301 /demo, 404 fallback, CSP OK), @astrojs/sitemap 3.7.3. `scripts/og-gen.mjs` versionné + tâche `npm run og` (Playwright à installer ponctuellement, H1 dupliqué dans le script — à synchroniser si le Hero change).
- Reste du backlog produit : impersonation + audit log (nécessite du code côté APP — à coordonner avec la conv de l'app), annonces in-app (idem), édition du contenu du site depuis le cockpit (gros chantier), /blog, i18n, logo SVG (demande le fichier vectoriel source).

## Régénérer l'OG image

Le script utilisé pour générer `public/og.png` n'est PAS versionné (était en `/tmp/og-gen.mjs`). Si besoin de regen, recréer un script Playwright qui :
1. Render un HTML 1200×630 avec halo, badge "Pour les assos suisses", logo Konclav, H1 + sous-titre, 3 pills meta
2. Screenshot avec `deviceScaleFactor: 2`
3. Output à `public/og.jpg` (JPEG quality 82, ~27 Ko)

Recommandation : versionner le script dans `scripts/og-gen.mjs` + ajouter `"og": "node scripts/og-gen.mjs"` dans `package.json` si on régénère régulièrement.

## Skills disponibles (`.claude/skills/`)

7 skills de `nextlevelbuilder/ui-ux-pro-max-skill` installés. Le plus utile pour ce projet :

**ui-ux-pro-max** — design intelligence en CSV searchable :
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> -n <max>
```
Domains : `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `stack`.

Notamment `data/stacks/astro.csv` contient 54 guidelines Astro-spécifiques (Islands Architecture, content collections, client directives, perf). À utiliser pour un audit du code Astro actuel.

Le style qu'on a codé correspond exactement à "Modern Dark (Cinema Mobile)" dans `data/styles.csv` (même accent #5E6AD2, même easing).

Autres skills disponibles : `design-system`, `design`, `brand`, `banner-design`, `slides`, `ui-styling`.

## MCP servers (`.mcp.json`)

Aucun pour le moment — le serveur magic 21st-dev a été retiré, il n'apportait rien à un projet Astro statique.

## Conventions code

- Une seule responsabilité par composant `.astro`, pas de logique métier
- Frontmatter (`---`) pour les data arrays + props, JSX-like dans le template
- Pas de commentaires sauf si le WHY est non évident
- Préférer Tailwind utilities ; n'écrire de CSS custom que pour des patterns non couverts (FAQ accordion, spotlight, view-transition)
- Scripts client toujours `is:inline` (pas de bundling JS pour des pages quasi-statiques)
- `data-reveal` sur tout élément qui doit fade-in au scroll

## Branche de dev

Tout se passe sur `claude/modest-newton-5FRWm`. Push à chaque batch terminé. La branche est trackée côté origin.

## Pistes ouvertes

Idées non-bloquantes, par ordre de valeur perçue :

- **Logo en SVG** (actuellement PNG 45 Ko, chargé 3× par page)
- **Page `/blog` ou `/changelog`** (content collections Astro = idéal)
- **Internationalisation** fr-CH → de-CH / it-CH
- **Versionner** `scripts/og-gen.mjs` + npm task
- **Upgrade deps** (Astro 6.4, Express 5)

## Sanity checks avant de pousser

```bash
npm run build       # doit passer sans warning
grep -r 'TODO\|FIXME\|XXX' src/   # rien de critique laissé
```

## Notes diverses

- Le site est mono-langue `fr-CH` actuellement
- Pas de système de routing custom — file-based via `src/pages/`
- Sitemap exclut `/404` (configuré dans `astro.config.mjs`)
- `prefers-reduced-motion: reduce` désactive : reveal animations, view transitions, FAQ accordion animation, parallax chapitres
