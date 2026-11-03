# Konclav — Notes pour Claude Code

Site marketing d'une app intranet privée pour associations suisses. Site statique, design Linear-inspired, fini à ~95% en termes de structure.

## Stack

- **Astro 6.4.6** static output (`npm run build` → build atomique vers `dist/`, cf. Déploiement)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, pas de `tailwind.config.js` — tokens dans `src/styles/global.css` via `@theme`)
- **@astrojs/sitemap** pour `sitemap-index.xml` au build
- **Inter** auto-hébergée via `@fontsource/inter` (subsets latin uniquement, weights 400/500/600/700 + 300/400 italic pour `.italic-display`)
- Zéro framework JS — scripts `is:inline` dans `Layout.astro` et `JoinModal.astro`
- View Transitions natives MPA via `@view-transition { navigation: auto; }` (pas de `ClientRouter` SPA)
- **express** uniquement pour servir `dist/` en prod via `server.js` (cf. déploiement Infomaniak)

## Design system — « Apple-like » clair (refonte du 03/11/2026)

Deux thèmes, pilotés par `<html data-theme>` (posé dans `Layout.astro`) :
- **Clair (défaut)** — tout le site marketing : sobre, blanc, une seule couleur d'accent tirée du logo.
- **Sombre** — uniquement `/admin` (cockpit) et `/espace` (espace client), via `<Layout dark>`. Rendu inchangé : tokens `ink-*` / `accent-*`, `.aurora-global`, grain, `.cta-shimmer`, `.live-dot`, autofill sombre. **Ne pas supprimer ces styles** : le cockpit et l'espace en dépendent.

Tokens clairs (`src/styles/global.css`, bloc `@theme`) :

```
--color-paper:     #ffffff   fond
--color-mist:      #f5f5f7   sections alternées, tuiles
--color-cloud:     #e8e8ed   survol
--color-hairline:  #d2d2d7   filets
--color-graphite:  #1d1d1f   texte principal + boutons
--color-slate:     #6e6e73   texte secondaire (5.1:1 sur blanc, 4.6:1 sur mist)
--color-ash:       #86868b   décor seulement (icônes, placeholders) — jamais du texte courant
--color-night:     #0a0a0b   bande sombre (AG)
--color-brand-500: #e8572a   accent : icônes, aplats
--color-brand-600: #c2410c   accent texte & liens (5.2:1 sur blanc)
--color-brand-300: #ff9a62   accent sur fond sombre
--font-display: -apple-system, BlinkMacSystemFont, "Inter", …   (SF Pro sur Apple, Inter auto-hébergée ailleurs)
```

Composants CSS (dans `@layer components` → surchargeables par les utilitaires Tailwind) :
- Typo : `.t-hero`, `.t-section`, `.t-tile`, `.t-lead`, `.t-eyebrow` (petit titre orange en casse normale — plus de MAJUSCULES espacées).
- `.text-gradient-brand` (rouge → orange → or du logo, contraste ≥ 3:1 → **grands titres uniquement**) et `.text-gradient-brand-night` sur fond sombre.
- Boutons pilule `.btn` + `.btn-primary` (graphite) / `.btn-secondary` / `.btn-light` / `.btn-sm` ; lien « En savoir plus › » `.link-chevron`. Composant `CTAButton` (variants `primary` / `secondary` / `light` / `link`).
- `.chip`, `.tile` (rayon 28px, fond mist, `container-type: inline-size`), `.nav-glass` (barre translucide flou + saturation, plus opaque une fois défilée), `.range` (curseur façon iOS, `--fill` posé par le JS du simulateur).
- `.device` (cadre iPhone) : largeur via `--dw` (accepte `min()` / `cqw` → compositions fluides sans JS), hauteur via `aspect-ratio`. Toujours passer par `PhoneShot`.

Mouvement :
- `[data-reveal]` : fondu + montée de 28px, courbe `--ease-fluid` = `cubic-bezier(0.22, 1, 0.36, 1)`, déclenché par l'IntersectionObserver de `Layout`. Décalages via `style="transition-delay: …"`. **Le contenu n'est masqué que sous `html.js`** (classe posée par la 1ʳᵉ ligne du script de tête) et un filet CSS l'affiche de force à 2,5 s si le script du bas n'a pas posé `html.reveal-ready` → un script bloqué (CSP, extension) laisse une page lisible, jamais blanche. Ne pas réintroduire de `[data-reveal] { opacity: 0 }` non conditionné.
- Animations liées au scroll (CSS `animation-timeline: view()`, amélioration progressive Chrome/Edge/Safari 26+, état final statique ailleurs) : `.sd-zoom` (iPhone du hero), `.sd-rise` (iPhone des tuiles), `.sd-spread-l/r` (téléphones latéraux de la bande AG). **Jamais sur un élément qui porte déjà `data-reveal`** (les deux posent `transform`) → un wrapper chacun.
- Tout est coupé en `prefers-reduced-motion: reduce`.
- Retirés à la refonte, à ne pas réintroduire : halos colorés, aurora côté site, grain, bordures dégradées animées, split-text mot à mot, parallax, float, reflet de vitre, `.bento`, `.display-*`, `.italic-display`. (Déjà retirés en juin : cursor-spotlight, boutons magnétiques, tilt 3D, draw-on-scroll.)

Pièges :
- Avec Tailwind v4, du CSS **hors `@layer`** bat les utilitaires quelle que soit la spécificité → styles de composants dans `@layer components`, anneau de focus clair dans `@layer base`.
- Ne jamais centrer (`justify-center`) une rangée qui défile horizontalement : les premiers éléments deviennent inatteignables (galerie de `/inscription`).
- Le texte du H1 / sous-titre / CTA du hero et du bloc final reste surchargeable depuis le cockpit (`data-content-key`) ; une surcharge remplace le texte brut (le mot en dégradé disparaît, voulu : anti-XSS).

## Arborescence

```
src/
  layouts/
    Layout.astro          # head + meta + scripts globaux + JoinModal monté ici
    LegalLayout.astro     # wrapper pages légales (prose-legal, tables, blockquote, code)
  components/
    Navbar.astro          # barre translucide + menu mobile plein écran (focus-trap, aria-current)
    Hero.astro            # titre centré (mot en dégradé) + CTA pilule + lien chevron + PhoneFan
    Features.astro        # 5 tuiles (grille 3+3 / 2+2+2, iPhone qui sort du bas) + bande sombre AG
    Security.astro        # 4 garanties techniques (RLS/TLS/2FA/Backups), filets fins
    TrustBand.astro       # 4 garanties centrées (Conçu en Suisse / LPD-RGPD / Sans engagement / AES-256)
    PriceSimulator.astro  # 2 curseurs façon iOS + résultat live (aria-live)
    Onboarding.astro      # 3 étapes numérotées sur cartes blanches (fond mist)
    FAQ.astro             # <details> + JSON-LD FAQPage
    CTAFinal.astro        # grande tuile centrée
    Footer.astro          # 4 colonnes Apple (marque / Produit / Légal / Contact + espace client)
    Icon.astro            # 10 icons SVG inline
    Logo.astro            # <img> logo-mark.png (TODO: passer en SVG)
    PhoneShot.astro       # cadre iPhone CSS, largeur via --dw (prop `priority` pour LCP)
    PhoneFan.astro        # composition hero : 3 iPhone droits, tailles en cqw
    JoinModal.astro       # modal wizard 4 étapes → POST JSON Edge Function Supabase website-lead-submit (honeypot + focus-trap)
    CTAButton.astro       # bouton pilule / lien chevron (primary/secondary/light/link, joinOpen)
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
    global.css            # tokens @theme + composants (@layer components) + reveal/sd-* + styles sombres cockpit/espace
public/
  favicon-32.png / favicon-192.png / apple-touch-icon.png
  logo-mark.png           # 256×256
  og.jpg                  # 1200×630, ~64 Ko (npm run og)
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
npm run build      # scripts/build.mjs : verrou + astro build → dist-next/ + bascule atomique vers dist/
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

### Build atomique (`npm run build` = `node scripts/build.mjs`)

`astro build` vide son dossier de sortie au démarrage : construire directement dans `dist/` servait des 404 pendant ~5 s (et pour de bon si le build plantait) — **incident du 03/11/2026** : `/admin` en « 404 — Page introuvable » juste après un build lancé en SSH. Désormais :
1. **Verrou** `.build.lock/` : un seul build à la fois (SSH + manager ne se marchent plus dessus) — le second **attend** la fin du premier (5 min max, puis abandonne avec un message). Le verrou est « vivant » tant que son propriétaire le touche (**battement toutes les 5 s**, pas de pid : manager et SSH ne tournent pas forcément dans le même environnement). Un build tué net (kill -9, timeout du manager) cesse de battre → son verrou est **repris après 2 min** (le temps qu'un Astro orphelin finisse), sous un second verrou `.build.lock-takeover/` pour que deux builds simultanés ne le prennent pas tous les deux. Chaque build ne libère que son propre verrou (jeton aléatoire dans `.build.lock/owner`). Un build suspendu plus de 2 min (Ctrl+Z, environnement gelé) dont le verrou a été repris s'arrête sans basculer (« verrou perdu »).
2. `astro build --outDir dist-next` — le site en ligne n'est pas touché.
3. **Validation** (`scripts/swap-dist.mjs`) : `index.html`, `404.html`, `admin/`, `espace/`, `tarifs/`, `inscription/`, `sitemap-index.xml`, `_astro/` non vide — sinon rien n'est basculé.
4. **Bascule** `dist/` → `dist-prev/`, `dist-next/` → `dist/` (deux `rename`, quelques µs). Retour arrière automatique si un renommage échoue ; une bascule interrompue est réparée au lancement suivant (`node scripts/swap-dist.mjs` seul suffit).
5. `dist-prev/` = build précédent. **Revenir en arrière** : `mv dist dist-x && mv dist-prev dist` (aucun redémarrage requis).

Arrêter un build : Ctrl+C, `kill <pid de node scripts/build.mjs>` ou `kill -- -<pgid>` → le build Astro est arrêté, rien n'est basculé, verrou libéré (un signal envoyé au seul process `npm` ne suffit pas : le build continue et bascule). Trois copies du site coexistent pendant un build (~8 Mo).

### Le serveur (`server.js`)

- Écoute sur `process.env.PORT || 3000` ; log de démarrage : `Konclav up on :3000 — server.js <SERVER_REV> — dist=… — index.html du <date>, N hash(es) CSP`
- En-tête **`X-Konclav-Server: <SERVER_REV>`** (date de révision du fichier) → `curl -sI https://konclav.ch/ | grep -i x-konclav` dit quel `server.js` tourne réellement. **Bumper `SERVER_REV` à chaque modification de `server.js`.**
- Sert `dist/` avec `express.static`, extension `.html` implicite (donc `/tarifs/` → `dist/tarifs/index.html`)
- **CSP par page** : `script-src` = hashes SHA-256 des `<script>` inline **du fichier servi**, calculés à la volée et mis en cache par (inode, mtime, taille). Un build sans redémarrage reçoit donc aussitôt les bons hashes (avant : hashes figés au démarrage → formulaire et cockpit bloqués après un build). Pas de `'unsafe-inline'`.
- **En-têtes de sécurité** : CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy verrouillée, COOP/CORP, Origin-Agent-Cluster (y compris sur la 301 `/demo`)
- `X-Robots-Tag: noindex, nofollow` sur `/sous-traitance`, `/404`, `/admin`, `/espace`
- Compression `gzip`/`br`
- Cache : 1 an `immutable` **uniquement** sur `/_astro/` (noms hachés) ; 1 jour sur les images/icônes/polices de `public/` (logo, `og.jpg`, captures — même URL d'un build à l'autre) ; 5 min sur le reste (`robots.txt`, sitemaps) ; `max-age=0, must-revalidate` (ETag faible de `express.static`) sur les HTML
- 404 : `dist/404.html` gardée **en mémoire** (stylée même pendant une bascule), `no-store`, vrai statut 404 aussi sur `/404`, `/404.html` et leurs variantes encodées (`/%34%30%34`, `//404`…). Si `dist/` a été basculé pendant la requête, la recherche est refaite une fois dans le nouveau build (puis 503 « réessayer dans 1 s » si besoin) au lieu d'un faux 404. `X-Robots-Tag: noindex` sur tous les 404
- `dist/index.html` absent → **503 « Mise à jour en cours »** autonome (`Retry-After`, `no-store`, se recharge seule) au lieu de 404 trompeurs ; erreur de lecture → même page (jamais de trace avec le chemin serveur)
- Port déjà pris → message « impossible d'écouter » et code de sortie 1 (pas de faux « Konclav up »)
- Graceful shutdown sur SIGTERM/SIGINT

### Procédure de déploiement (SSH)

```bash
cd ~/sites/konclav.ch
git checkout package-lock.json          # si npm l'a modifié (sinon le pull refuse)
git pull origin claude/modest-newton-5FRWm
git log --oneline -1                    # doit montrer le dernier commit poussé
npm install && npm run build            # attendre « swap-dist : nouveau build en ligne »
```

- **Redémarrer l'app dans le manager Infomaniak uniquement si `server.js` a changé** (un build seul ne recharge pas le code Node). Vérifier ensuite `curl -sI https://konclav.ch/ | grep -i x-konclav` = `SERVER_REV` attendu.
- Un changement de pages/composants/CSS ne demande **aucun** redémarrage : la bascule + la CSP par page suffisent.
- Tester en navigation privée (un onglet resté ouvert garde l'ancienne version). `/admin/` avec la barre finale.

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
- **Edge Functions cockpit** : `cockpit-invoice-pdf` **v2** — puis v4 RLS, v5 débiteur = asso, **v6 adresses type S** (cf. 03/11/2026) — (verify_jwt + double check email ; pdf-lib + qrcode via esm.sh ; A4 + QR Swiss Payments Code v2.2, adresses type K à l'époque, réf NON, **croix suisse dessinée au centre du QR** (ECC M) ; NPA/localité émetteur surchargables via secrets `QR_ISSUER_ZIP`/`QR_ISSUER_CITY`, défaut 1950 Sion ; charge les données via PostgREST avec le JWT user pour respecter la RLS). `cockpit-umami-stats` existe encore mais est ORPHELINE (plus appelée — à supprimer du dashboard à l'occasion, pas de tool MCP delete).
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
- **Bug reports avec captures (26/06/2026)** — `cockpit-monitoring` **v2** : chaque bug porte désormais `user_id` + `screenshot_count` + description complète, et un mode `?shots=<userId>&ts=<epochMs>` génère des **liens signés 1 h** vers les captures du bucket privé `bug-reports`. Le chemin capture↔rapport n'est PAS stocké en base (limite app) → matching par **fenêtre temporelle** : les fichiers `bug-<epochMs>-<i>.jpg` du dossier `{userId}` dont le timestamp tombe dans `[createdAt-10s, createdAt+120s]` (les uploads suivent l'insert de 1-2 s). Validé en SQL : 9 captures réparties sur 7 rapports, zéro orpheline, zéro collision. **Service_role côté serveur uniquement** (clé jamais exposée au client), lecture seule, gate admin+2FA. CSP `img-src` étendu au domaine Supabase pour afficher les vignettes. Front : card Bugs cliquable (badge 📷 N), modal détail (description complète + captures en grille → lightbox plein écran), bouton « Voir les N » pour la liste complète. Si l'app ajoute un jour une colonne `screenshotPaths`, basculer dessus pour un lien 100 % déterministe (non bloquant — le matching temporel suffit).
  - **Upgrades** : Astro 6.4.6, Express 5.2.1 (smoke tests : 200 sur /, /tarifs/, /admin/, 301 /demo, 404 fallback, CSP OK), @astrojs/sitemap 3.7.3. `scripts/og-gen.mjs` versionné + tâche `npm run og` (Playwright à installer ponctuellement, H1 dupliqué dans le script — à synchroniser si le Hero change).
- Reste du backlog produit : impersonation + audit log (nécessite du code côté APP — à coordonner avec la conv de l'app), annonces in-app (idem), édition du contenu du site depuis le cockpit (gros chantier), /blog, i18n, logo SVG (demande le fichier vectoriel source).
- **Sprint 5 cockpit (12/06/2026) — onboarding email auto** — migration `sprint5_onboarding_emails` (+ fix `sprint5_onboarding_emails_fix`) :
  - Table `scheduled_emails` (RLS admin, GRANT cohérent) + RPC `claim_due_emails(p_max)` atomique (`FOR UPDATE SKIP LOCKED`, status `pending`→`sending` dans la même transaction → zéro double envoi). `revoke execute` total : exécution service_role uniquement (via Edge Function).
  - Edge Function `cockpit-onboarding-tick` : dual-gate (admin/2FA classique OU header `X-Cron-Secret == CRON_SECRET`), envoie via Resend en filant les templates `cockpit_settings.onboarding_emails`, `bcc contact@konclav.ch` sur les envois automatiques (suivi discret).
  - `cockpit-orgs` v2 : au provisionnement, lit les `delay_days` des templates et insère 3 lignes dans `scheduled_emails` (J+1, J+7, J+14 par défaut).
  - 3 templates par défaut seedés (« 3 conseils », « inviter le comité », « première AG »), éditables depuis l'Aperçu (modal « Onboarding » → bouton « Modifier »).
  - **Filet opportuniste** : tick fire-and-forget à chaque ouverture de l'Aperçu (toast en cas d'envois). Suffisant tant qu'il y a 0-2 assos. **À l'échelle, ajouter un pg_cron** : (1) configurer un secret `CRON_SECRET` dans les env Edge Functions Supabase (dashboard), (2) `select cron.schedule('konclav-onboarding-tick', '*/10 * * * *', $$select net.http_post('https://ehbdngidjrkhfrprfgqg.supabase.co/functions/v1/cockpit-onboarding-tick', '{}'::jsonb, '{}'::jsonb, headers:=jsonb_build_object('x-cron-secret','<CRON_SECRET>','Content-Type','application/json'))$$);`. Le filet opportuniste reste utile en parallèle.
- **Sprint 6 cockpit (12/06/2026) — édition du contenu du site** :
  - Edge Function `website-content` (verify_jwt=false, GET, CORS *, Cache-Control 60 s) : expose une whitelist stricte de 6 clés depuis `cockpit_settings.site_content` (`hero.title`, `hero.subtitle`, `hero.cta_primary`, `cta_final.eyebrow`, `cta_final.title`, `cta_final.subtitle`). Caps 500 chars/valeur. Aucune autre clé cockpit n'est exposée.
  - Composants Hero/CTAFinal : ancres `data-content-key="..."` sur les 6 éléments éditables. Le contenu par défaut reste dans le HTML servi par Astro (= SEO et 1ʳᵉ visite préservés).
  - Layout.astro : `window.__splitText(el)` extrait et réutilisable + script qui (1) hydrate depuis localStorage 24 h, (2) fetch revalidation, (3) applique via `textContent` (anti-XSS), (4) relance split-text si l'élément concerné en avait. Skip total sur `/admin*`.
  - Cockpit : card « ✏️ Contenu du site » dans l'Aperçu → modal avec les 6 champs, défaut affiché en aide, vide = retour au défaut.
  - **Tradeoff documenté** : l'override stocke du texte plat → le formatting HTML (`<em>` du sous-titre Hero par défaut) est perdu si l'utilisateur surcharge. Anti-XSS, voulu.
- **Sprint 7 cockpit (13/06/2026, nuit) — polish global UX/produit** :
  - **Aperçu refondu autour du MRR** : KPI héros « MRR · Revenu récurrent » avec gradient + glow + tooltip d'aide, ARR en sublabel, 3 KPIs cliquables (encaissé mois + delta vs mois précédent, en attente avec retard, leads + relances), grand graphique encaissé 12 mois (avoirs déduits), activity feed unifié (lead créé / statut changé / conversion / paiement) avec timeline verticale et dates relatives.
  - **Audience v2** : courbe lissée Catmull-Rom→Bézier avec gradient et animation de tracé, ligne fantôme période précédente en pointillés, crosshair + tooltip flottant au survol, KPIs cliquables = sélecteur de métrique (Visiteurs / Sessions / Pages vues), badge live « X en ce moment » (RPC `cockpit_live`, poll 30 s), compteurs animés, skeletons shimmer, export CSV multi-sections. Migration `cockpit_analytics_previous_period` + `cockpit_analytics_v4_live_sessions` (prev_series, sessions par bucket, RPC `cockpit_live`).
  - **Facturation enrichie** : graphe revenus 6 mois (barres avec gradient vertical), aging report 0-30/31-60/61-90/90+ avec barres colorées jaune→rouge, filtre période (Ce mois / Trimestre / Année / YTD), tri par colonnes, recherche live, export CSV factures.
  - **Inscriptions — pipeline en entonnoir** : Card Pipeline `Nouveaux → Contactés → Convertis` avec flèches, barres proportionnelles, taux de passage entre étapes, taux de conversion global, refusés en pied. Clic étape = filtre direct la liste.
  - **Assos — vue commerciale** : 5 cards summary (Actives / Suspendues / Membres / Actives 7j / Liées à facturation), avatars colorés (initiales + gradient HSL déterministe), pastille santé 🟢🟡🔴 sur la dernière connexion, badge « Suspendue » inline avec le nom, **colonne Facturation avec tarif visible** (« 120 CHF/an », « Gratuite », « en pause ») éditable en 1 clic via le modal abo existant, bouton « + Créer fiche client » en 1 clic depuis l'asso (pré-remplissage automatique). Tri + recherche live.
  - **Polish UX cross-cockpit** :
    - **Modal de confirmation custom `ckConfirm({ title, message, okText, danger, icon })`** retourne `Promise<bool>` ; remplace les 10 `confirm()` natifs (suspendre, supprimer client/facture/abo, créer avoir, désactiver 2FA, envoyer relance/broadcast, provisionner, créer fiche client). Variante `danger` avec bouton rouge.
    - **Empty states élégants** factorisés via `ckEmpty(icon, title, message, ctaHtml)` (icône gradient violet, message d'aide, CTA contextuel) dans Factures / Clients / Assos / Abonnements / recherche sans résultat.
    - **Raccourcis clavier** style Linear/GitHub : `g a` Aperçu, `g i` Inscriptions, `g s` Assos, `g u` Audience, `g f` Facturation, `?` modal d'aide listant tout, `⌘K` recherche (existant), Esc fermer (existant). Skip auto si focus dans un input.
    - **Tri + recherche** dans tous les tableaux (Factures / Clients / Assos / Abonnements) : `applyTableFilters`, `thSort`, `tableSearchBar`, `registerTable` factorisés, état persistant par tableau (`tableState`), debounce 200ms, focus + caret position préservés au re-render.
    - **Cmd+K élargi** : navigation directe (« Aller à Aperçu »…) + assos + abonnements + factures + clients + leads ; chaque résultat ouvre directement le modal d'édition concerné.
    - **Activity feed** dans l'Aperçu : timeline verticale unifiée (📝 lead, ↻ statut, 🚀 conversion, 💰 paiement) avec dates relatives en français (« il y a 3 min », « hier ») et clic = saut vers le lead.
    - **Badge « ⎘ copier »** sur email + mot de passe temporaire au provisionnement (clipboard API + feedback visuel « ✓ copié »).
    - **Tooltip d'aide `ckInfo(text)`** sur les KPIs ambigus (MRR expliqué : Monthly Recurring Revenue).
    - **Animations fade-in cascade** pour les éléments avec `data-anim-in` (désactivé en reduced-motion).
    - **Skeletons shimmer** unifiés pendant le chargement.
  - **Backend — fix systémique** : migration `fix_service_role_grants` a remis les GRANT (select/insert/update/delete) au rôle service_role sur les 9 tables Konclav-WEB qui en manquaient (oubli de mes premières migrations — la RLS bypasse mais le grant de base est requis). Conséquence avant fix : `website-track` et `cockpit-onboarding-tick` plantaient en 500. Tout fonctionne maintenant.
  - **Backend — perf** : migration `perf_indexes_and_rls_initplan` ajoute 3 indexes sur les FK qui en manquaient (`invoices.credit_for_invoice_id`, `invoices.subscription_id`, `subscriptions.customer_id`) et optimise les policies leads (`auth.jwt()` → `(select auth.jwt())`, évaluation 1×/requête au lieu de 1×/ligne).
- **Sprint 9 cockpit (27/06/2026) — batch de 10 features votées + filtre anti-bot** :
  - **Filtre anti-bot compliance** : `cockpit_analytics(p_period, p_exclude_bots=true)` exclut les visiteurs `country=US ∧ lang ilike 'en%'` (crawlers Apple App Review / Google Play / scanners RGPD US qui ne visitent que les pages légales). Validé : 103 visiteurs bruts → 17 réels sur 90 j. Toggle « 🤖 Bots masqués/inclus » dans le header Audience (ON par défaut).
  - **C10 Bloc-notes** : card Aperçu + modal autosave (900 ms) dans `cockpit_settings.kevin_notes` (RLS admin, privé).
  - **C4 Forecast MRR** : card projection 12 mois sous le graphe encaissé (MRR actuel + rythme de nouveaux abos sur 90 j × MRR moyen/abo). Empty state si 0 abo.
  - **C3 Calendrier des échéances** : modal mensuel navigable lancé depuis l'Aperçu — échéances factures (rose), factures d'abo à venir (violet), relances leads (ambre). Données déjà chargées (0 requête en plus).
  - **C7 Relevé client annuel** : Edge Function `cockpit-customer-statement` (lecture seule service_role) → PDF récap annuel (factures + statuts + totaux). Bouton « 📄 Relevé » par client. **v2 (03/11/2026)** : la v1 se contentait de décoder le claim `email` du JWT, sans contrôle aal → une session mot de passe seul (aal1) pouvait télécharger le relevé de n'importe quel client (nom, adresse, montants). Gate aligné sur `cockpit-invoice-reminder` : `verify_jwt` + `getUser()` + email admin strict + `aal2` exigé si un facteur TOTP vérifié existe (`admin.auth.admin.mfa.listFactors`, fail closed). Génération PDF inchangée.
  - **C1 + E4 Détail asso enrichi** : `cockpit-orgs` **v3** GET renvoie aussi les membres du comité (nom/email/rôle/dernière connexion). Détail asso en 2 colonnes : accès espace client (membres comité + fraîcheur 🟢🟡🔴) / facturation. E4 « version safe » : l'accès découle du rôle de comité, attribué **dans l'app** — aucune élévation de rôle depuis le site.
  - **E5 Notif email à l'émission** : Edge Function `cockpit-invoice-notify` (gate admin/2FA) → email « Nouvelle facture » au client avec lien espace. Proposé via `ckConfirm` quand l'admin passe une facture draft→sent.
  - **E2 ZIP factures par année (espace client)** : bouton « 📦 <année> (ZIP) » dans `/espace`, writer ZIP minimal en JS (méthode store + CRC32, zéro dépendance — PDF déjà compressés), récupère chaque PDF via `cockpit-invoice-pdf`.
  - **E10 Demandes de modification** : migration `client_change_requests` — table `change_requests` (RLS admin + org member) + RPC `submit_change_request(subject, message)` (org/email dérivés du compte, anti cross-org). Bloc dans `/espace` (onglet coordonnées) → bannière + modal de traitement dans le cockpit (Marquer traité / Rejeter).
  - **E6 Reçus de don** : NOTÉ pour la conv app (sera côté app, pas le site).
- **Statut de paiement app-aware (05/07/2026) — coordination app↔site** : l'app a créé `organizations."billingStatus"` (`ok`|`overdue`|`suspended`, défaut `ok`, CHECK gelé) qu'elle lit au login : `overdue` = bandeau relance au comité (5 rôles billing) + badge, `suspended` = écran bloquant pour toute l'asso (données intactes, comité garde le lien vers `/espace`). **Canal d'écriture dédié côté site** : `cockpit-orgs` **v4** — PATCH accepte `{billing_status}` (validé serveur contre les 3 valeurs, écrit via service key, gate email admin + aal2), GET expose `billing_status`. UI cockpit onglet Assos : badges inline (« Paiement en retard » ambre / « Bloquée (impayé) » rose) + bloc « Statut de paiement » dans le détail asso (3 boutons À jour / En retard / Suspendue, `ckConfirm` explicite sur chaque transition, `suspended` en `danger`). **Passage MANUEL uniquement** (reco Kévin : jamais de cron qui suspend seul) ; retour à `ok` = seul désarmement. `isActive` (suspension de compte existante) et `billingStatus` restent 2 leviers distincts. Périmètre app inchangé : `organizations` + `users` via `cockpit-orgs`, aucune autre table touchée.
- **Premiers clients réels (05/07/2026)** : fiche + abo **PLR Sion** (1er client externe, org `080baa77…`, président Samy) — 19,50 CHF/mois (Pack fondateurs −50 %, 1er mois offert, 1ʳᵉ facture 10.08.2026 ; **repasser à 39 CHF avant le 10.02.2027**, noté dans `customers.notes`). Facture annuelle **Mystéria** `INV-2026-009` (brouillon, 400 CHF, échéance 04.08.2026). IBAN émetteur Kévin `CH49 0878 1000 3294 3560 0` (validé mod-97). Émetteur QR-bill = Kévin Perret, `1950 Sion` — **sans rue** (choix de vie privée, cf. 03/11).
- **Facturation — durcissement « propre et pro » (01/11/2026)** : audit de la 1ʳᵉ vraie facture (Mystéria `INV-2026-010`) → 4 défauts corrigés. **(1)** `invoices.issuer_addr` avait pour `DEFAULT` `'Sion, Valais, Suisse'` → le QR-bill prenait « Sion » comme rue du créancier (il lit le segment avant la 1ʳᵉ virgule) ; migration `invoice_issuer_addr_default_and_billing_labels` avait mis le `DEFAULT` à l'adresse complète de Kévin — **⚠️ annulé le 03/11** (Kévin ne veut pas de rue sur ses factures : `DEFAULT` = `1950 Sion`, cf. entrée suivante). **(2)** `billing_daily()` écrivait en dur `notes = 'Générée automatiquement — abonnement'`, **imprimé sur le PDF client** (le PDF rend `inv.notes` sous « NOTE ») → passe à `null` ; le `subscription_id` + le badge 🔄 du cockpit suffisent à identifier les factures auto. **(3)** libellé de ligne toujours en `MM.YYYY` même pour un abo **annuel** (« Abonnement Konclav (07.2026) » pour 400 CHF/an = trompeur) → désormais sensible à `billing_interval` : mensuel = `MM.YYYY`, annuel = `année du JJ.MM.AAAA au JJ.MM.AAAA`. **(4)** `cockpit-invoice-pdf` **v5** : débiteur du QR-bill = `asso_name` (l'entité qui paie) et non `contact_name` — sur un QR-bill suisse « payable par » doit nommer l'entité ; le contact reste en « À l'attention de » dans le corps du PDF. Email de facturation Mystéria → `finance@mysteriaevent.ch`. **Restent ouverts** : aucun document « quittance » dédié (la facture passée à `paid` affiche « PAID » et le relevé annuel en font office) ; trou de numérotation 008→010 (INV-2026-009 supprimée — sans conséquence, non assujetti TVA).
- **Facturation — vie privée + QR-bill type S + emails autosuffisants (03/11/2026)** :
  - **Vie privée émetteur** (choix explicite de Kévin : ses clients ne doivent pas savoir où il habite) → **jamais de rue sur les factures**. Migration `invoice_issuer_addr_private_default` : `invoices.issuer_addr` DEFAULT = `'1950 Sion'` + 4 factures corrigées. Scan base (fonctions `public`/`private`, `cockpit_settings`, `invoices`) : plus aucune occurrence de la rue.
  - **QR-bill → adresses structurées (type S)**, `cockpit-invoice-pdf` **v6**. Le type K (combiné) n'est plus émissible depuis le 21.11.2025 ; son traitement par les banques n'est garanti que jusqu'au **21.11.2026** (PostFinance, ZKB). En S la rue est facultative → créancier = nom + NPA/localité (`QR_ISSUER_ZIP`/`QR_ISSUER_CITY`) + CH, rue via secret optionnel `QR_ISSUER_STREET` (vide par défaut) ; débiteur = l'asso, rue/n° séparés par `splitStreet`, bloc omis si NPA/localité manquent (il est facultatif). **Payload validé octet pour octet contre la lib de référence Python `qrbill`** (31 lignes, cas avec et sans débiteur). Statut du PDF en français (EN RETARD / PAYÉE / ENVOYÉE / BROUILLON / ANNULÉE).
  - **Emails de facture autosuffisants** : `cockpit-invoice-reminder` **v2** + `cockpit-invoice-notify` **v2** joignent le **PDF avec QR-bill** (généré via `cockpit-invoice-pdf` avec le JWT admin de l'appelant ; base64 par blocs de 32 Ko) et affichent bénéficiaire / IBAN / communication en clair → un destinataire « finance@ » sans compte Konclav peut payer sans passer par `/espace`. Si le PDF échoue, l'email part quand même sans pièce jointe (`pdf_attached=false`).
  - Mystéria : contact `Loïc` · `finance@mysteriaevent.ch`. IBAN Yuh (IID 08781 = Swissquote) confirmé actif par Kévin.
  - **Ouvert — décision Kévin** : la rue reste publiée sur 3 pages légales (mentions légales, confidentialité, sous-traitance). Une adresse y est attendue (identité e-commerce, LCD art. 3 al. 1 let. s ; responsable du traitement, nLPD art. 19) → alternative propre : une adresse de domiciliation.
- **Refonte design « Apple-like » (03/11/2026)** — demande de Kévin : « plus moderne, sobre, apple like, fluide ». Thème clair (cf. section Design system), accent aligné sur le logo rouge-orangé (fin du violet Linear qui jurait avec le logo et l'app), accueil desktop 10 600 → 8 400 px (5 chapitres alternés → grille de tuiles), bande sombre AG, image OG régénérée. Cockpit / espace volontairement inchangés (`<Layout dark>`, 3 lignes modifiées en tout). Textes marketing conservés tels quels (claims audités), sauf « ! » → « . » dans le H1 (placeholder du cockpit aligné) et les puces redondantes des tuiles retirées. Script du formulaire d'inscription identique à 1 ligne près (classe du placeholder du sélecteur de canton). Vérifié : 23 tests navigateur (formulaire de bout en bout avec envoi simulé — zéro lead créé —, validation, menu mobile, simulateur, FAQ, admin/espace toujours sombres, zéro erreur JS), captures desktop/mobile avec et sans animations.
- **À ressortir le jour où il y a une audience** (décidé 12/06 — pas prioritaire tant qu'il n'y a personne qui voit le site à part Kévin) :
  - **/blog** — content collection Astro, articles en Markdown (SEO + partages LinkedIn). Idée d'angles : « préparer une AG », « gérer les cotisations sans Excel », « nLPD pour les assos »
  - **/changelog** — content collection idem, une entrée par release/feature de l'app (rassure les prospects que le produit vit, rappel des nouveautés aux clients actuels)

## Régénérer l'OG image

`npm run og` → `scripts/og-gen.mjs` (Playwright, déjà disponible dans l'environnement) écrit `public/og.jpg` en **1200×630** (= dimensions annoncées par les balises `og:image`), JPEG q82, ~64 Ko. Style clair : logo + H1 avec le dégradé de marque + capture `app/accueil.webp` dans un iPhone. Le texte du H1 est dupliqué dans le script : à resynchroniser si le hero change. Logo, capture et police Inter sont embarqués en `data:` URI (une page `setContent()` ne peut pas lire de fichier local `file://`).

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

## Sprint 8 — Espace client (`/espace`) 13/06/2026

Page client multi-tenant : un membre du **comité** d'une asso (président, vice-président, trésorier, secrétaire, comité) se connecte avec son compte de l'app et accède à :
- statut + montant + prochain renouvellement de son abonnement Konclav
- historique des factures avec téléchargement PDF (QR-bill suisse réutilisé)
- édition des coordonnées de facturation

**Pourquoi sur le site et pas dans l'app** : modèle Notion/Slack/Linear. Apple/Google ne prélèvent rien si le paiement est sur le web. B2B + virement bancaire = catégorie hors IAP. L'app ne propose rien à l'achat.

**Sécurité multi-tenant (migration `client_portal_multitenant_access`)** :
- `public.current_user_org_id()` (wrapper `private.current_org_id()` qui existe côté app)
- `public.is_org_billing_manager()` (filtre les 5 rôles statutaires)
- 4 policies SELECT additionnelles `*_select_org_member` sur customers / invoices / invoice_lines / subscriptions — en **parallèle** des policies admin (RLS = OR entre policies du même cmd → l'admin garde tout son accès)
- RPC `public.update_my_billing_contact(p_data jsonb)` (security definer + check rôle + whitelist colonnes : impossible de changer asso_name, org_id, lead_id)
- RPC `public.my_billing_dashboard()` (1 appel = fiche client + sub active + historique factures), sécurisée par les mêmes checks

**Edge Function** : `cockpit-invoice-pdf` v4 — retrait de la gate « email admin strict ». Maintenant le JWT user passe à PostgREST → la RLS décide. Un président → ses factures uniquement. Un membre lambda → 404. L'admin → tout (comme avant).

**Page Astro** `/espace.astro` (auth Supabase REST + JS inline, même pattern que `/admin` mais plus court). Sections : login → dashboard avec onglets « Mes factures » + « Mes coordonnées ». PDF téléchargé via `cockpit-invoice-pdf`.

**Noindex** : `server.js` ajoute `X-Robots-Tag: noindex, nofollow` sur `/espace`, et `astro.config.mjs` l'exclut du `sitemap-index.xml`. Lien discret dans le footer (avec `rel="nofollow"` et icône cadenas).

**Limites assumées** :
- L'edition n'utilise pas la RLS mais une RPC ciblée (plus simple à auditer que des policies UPDATE avec contraintes colonne par colonne)
- Pas de gestion abo côté client (souscription/résiliation depuis l'espace) — c'est volontaire, ça reste géré par Kévin via le cockpit
- Pas de paiement en ligne (Stripe/Twint) — QR-bill suffit, 0% commission

**Triple check sécurité (migration `client_portal_hardening_drafts_caps`)** — tests d'isolation passés en simulant les JWT en SQL (`set local role authenticated` + `request.jwt.claims`) :
- ✅ Président d'une org A ne voit AUCUNE facture de l'org B (`nb_vu = 0`)
- ✅ Membre lambda (role hors comité) ne voit RIEN même dans sa propre org (`is_mgr = false`)
- ✅ Les **brouillons** (`draft`) sont exclus des policies client (durcissement) : un président voit ses factures `sent` mais pas les `draft` de son asso (la page les masquait déjà, mais l'Edge Function PDF aurait pu en servir un si l'UUID était connu). L'admin garde ses policies séparées → voit tout.
- ✅ Caps de longueur dans `update_my_billing_contact` (200/50/120/2 chars selon champ).
- `/espace` exclu du tracking d'audience (client `Layout.astro` + serveur `website-track` v5) — page authentifiée, hors stats marketing.

## Pistes ouvertes

Idées non-bloquantes, par ordre de valeur perçue :

- **Logo en SVG** (actuellement PNG 45 Ko, chargé 3× par page)
- **Page `/blog` ou `/changelog`** (content collections Astro = idéal)
- **Internationalisation** fr-CH → de-CH / it-CH

## Sanity checks avant de pousser

```bash
npm run build       # doit passer sans warning et finir par « swap-dist : … en ligne »
grep -r 'TODO\|FIXME\|XXX' src/   # rien de critique laissé
```

## Notes diverses

- Le site est mono-langue `fr-CH` actuellement
- Pas de système de routing custom — file-based via `src/pages/`
- Sitemap exclut `/404` (configuré dans `astro.config.mjs`)
- `prefers-reduced-motion: reduce` désactive : reveal animations, view transitions, FAQ accordion animation, parallax chapitres
