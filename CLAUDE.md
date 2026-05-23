# Konclav — Notes pour Claude Code

Site marketing d'une app intranet privée pour associations suisses. Site statique, design Linear-inspired, fini à ~95% en termes de structure.

## Stack

- **Astro 6.3.7** static output (`npm run build` → `dist/`)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, pas de `tailwind.config.js` — tokens dans `src/styles/global.css` via `@theme`)
- **@astrojs/sitemap** pour `sitemap-index.xml` au build
- **Inter** chargée depuis Google Fonts CSS2 (400/500/600/700)
- Zéro framework JS — tout est `is:inline` script dans `Layout.astro`
- View Transitions natives MPA via `@view-transition { navigation: auto; }` (pas de `ClientRouter` SPA)
- **express** uniquement pour servir `dist/` en prod via `server.js` (cf. déploiement Infomaniak)

## Design system

Tokens dans `src/styles/global.css`:

```
--color-ink-950: #08090a   /* background */
--color-ink-900: #0f1011
--color-ink-800: #111214
--color-ink-50:  #f4f4f5   /* texte primaire */
--color-ink-400: #a1a1aa   /* texte muted */
--color-ink-500: #71717a
--color-accent-500: #5e6ad2  /* accent Linear */
--color-accent-400: #7170ff
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
    Layout.astro          # head + meta (canonical/OG/twitter) + script global
    LegalLayout.astro     # wrapper pour pages légales avec prose-legal styling
  components/
    Navbar.astro          # liens: /#features /#security /tarifs /#faq
    Hero.astro
    Features.astro        # 4 cards data-spotlight (Kanban/Calendar/Bible/Notifs)
    Security.astro        # 6 points en liste, pas en cards
    Onboarding.astro      # 3 étapes (Contact/Provisionnement/Go live)
    FAQ.astro             # <details> natif, animation grid-row-trick
    CTAFinal.astro        # box spotlight
    Footer.astro          # liens produit + légaux + copyright
    Icon.astro            # 10 icons en SVG inline (Fragment per name)
    PhoneFrame.astro      # frame iPhone pour /demo
    screens/              # 4 écrans pour le phone cluster /demo
  pages/
    index.astro           # /
    demo.astro            # /demo — 4-phone cluster + captions + CTA mailto
    tarifs.astro          # /tarifs — 2 plans + inclus partout + FAQ + CTA
    404.astro             # /404
    confidentialite.astro # squelette RGPD/LPD
    conditions.astro      # squelette CGV/CGU
    mentions-legales.astro
  styles/
    global.css            # tokens @theme, reveal, spotlight, view-transition
public/
  favicon.svg / favicon.ico
  og.png                  # 1200×630 généré (cf. /tmp/og-gen.mjs initialement)
  robots.txt
```

## État actuel (chronologie batches)

1. Bootstrap Astro + Tailwind + README
2. Layout + Navbar + Hero
3. Features + Security + Icon
4. Onboarding + FAQ + CTAFinal + Footer
5. `/demo` avec 4-phone cluster (PhoneFrame + 4 screens)
6. `/tarifs` + `/404` + 3 pages légales squelette + LegalLayout
7. Polish : cursor spotlight, View Transitions MPA, font-feature-settings, tabular-nums
8. SEO : sitemap, robots.txt, OG image 1200×630, canonical + meta og/twitter
9. Skills + MCP installés (`.claude/skills/`, `.mcp.json`)

## Placeholders à remplir avant prod

- **`astro.config.mjs`** : `site: 'https://konclav.ch'` — changer si domaine final différent
- **`public/robots.txt`** : sitemap URL idem
- **`src/pages/confidentialite.astro`**, **`conditions.astro`**, **`mentions-legales.astro`** : `[Raison sociale]`, `[Forme juridique]`, `[Numéro IDE]`, hébergeur précis. Date "22 mai 2026" en dur dans chaque page.
- **`src/pages/tarifs.astro`** : prix `4 CHF / membre actif / mois` et forfait min `39 CHF` à valider
- **Email** : `mxrtystream@gmail.com` partout — bouger sur `contact@konclav.ch` au lancement
- **OG image** : si le wording du H1 change, régénérer avec le script (voir section ci-dessous)

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
- Cache long (1 an, immutable) sur les assets versionnés (js/css/img/font), cache court (5 min) sur les HTML
- Fallback 404 → `dist/404.html`

Upload du code sur Infomaniak via FTP/SSH ou Git (cf. onglet FTP/SSH du manager). Après upload, Infomaniak lance `npm install && npm run build` puis `npm start`.

## Régénérer l'OG image

Le script utilisé pour générer `public/og.png` n'est PAS versionné (était en `/tmp/og-gen.mjs`). Si besoin de regen, recréer un script Playwright qui :
1. Render un HTML 1200×630 avec halo, badge "Pour les assos suisses", logo Konclav, H1 + sous-titre, 3 pills meta
2. Screenshot avec `deviceScaleFactor: 2`
3. Output à `public/og.png`

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

- **magic** (`@21st-dev/magic`) : génération de composants React via natural language. Comme on est en Astro, usage = générer le React puis l'adapter en `.astro`. Pas critique pour le quotidien, plus pour scaffold rapide.

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

## Quand le user dit "go next" / "batch suivant"

Pistes ouvertes :
- Audit Astro vs `data/stacks/astro.csv` (54 guidelines)
- Page `/blog` ou `/changelog` (content collections Astro = idéal ici)
- Formulaire de réservation démo (remplacer mailto)
- Analytics privée (Plausible self-hosted, Umami)
- Versionner `scripts/og-gen.mjs` + npm task
- Compléter les pages légales avec les vraies infos
- Internationaliser (fr-CH → de-CH / it-CH pour les autres régions suisses)
- Améliorer le PhoneFrame (animations, plus d'écrans, mode interactif)

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
