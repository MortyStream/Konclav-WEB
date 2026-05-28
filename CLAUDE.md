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
- **Cursor spotlight** : marquer une card avec `data-spotlight`, halo `::before` z:-1 isolation:isolate, mousemove délégué sur `document`

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
    TrustBand.astro       # 4 badges (Conçu en Suisse / Conforme LPD-RGPD / Hébergé UE / AES-256)
    Manifesto.astro       # H2 gradient + 3 stats (Sans cookie / UE / 30j Backups)
    PriceSimulator.astro  # 2 sliders + résultat live (aria-live)
    Onboarding.astro      # 3 étapes (Demande / Provisionnement / Go live)
    FAQ.astro             # <details> + JSON-LD FAQPage
    CTAFinal.astro        # box spotlight
    Footer.astro          # liens produit + légaux (incl. /sous-traitance)
    Icon.astro            # 10 icons SVG inline
    Logo.astro            # <img> logo-mark.png (TODO: passer en SVG)
    PhoneShot.astro       # frame iPhone unique (prop `priority` pour LCP)
    PhoneFan.astro        # éventail desktop de 4 PhoneShot (Hero lg+)
    JoinModal.astro       # modal wizard 4 étapes → POST Google Forms (honeypot + focus-trap)
    CTAButton.astro       # bouton CTA réutilisable (primary/secondary, magnetic, joinOpen)
  pages/
    index.astro
    demo.astro            # carrousel d'écrans + section "Demande de démo"
    tarifs.astro          # 2 plans + simulateur + inclus + FAQ + CTA
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

- **Tester pour de vrai le formulaire de démo** une fois déployé : les `entry.*` Google Forms ont été déclarés « placeholders » dans le code initial — confirmer qu'ils tombent dans la bonne feuille (envoyer une demande test → vérifier la Sheet).
- **Date des pages légales** : actuellement `27 mai 2026` dans les 4 pages, à rebumper si édition avant le lancement.
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
- `data-spotlight` sur les surfaces interactives premium (cards, CTA boxes)

## Branche de dev

Tout se passe sur `claude/modest-newton-5FRWm`. Push à chaque batch terminé. La branche est trackée côté origin.

## Pistes ouvertes

Idées non-bloquantes, par ordre de valeur perçue :

- **Logo en SVG** (actuellement PNG 45 Ko, chargé 3× par page)
- **Page `/blog` ou `/changelog`** (content collections Astro = idéal)
- **Internationalisation** fr-CH → de-CH / it-CH
- **Refactor CSP** : nonces server-rendus pour supprimer `'unsafe-inline'` (gros chantier)
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
- `prefers-reduced-motion: reduce` désactive : reveal animations, spotlight halo, view transitions, FAQ accordion animation
- `hover: none` (touch) désactive aussi le spotlight
