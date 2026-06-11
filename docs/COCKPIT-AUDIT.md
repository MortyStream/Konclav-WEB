# Cockpit Konclav — Audit + Vision 2026

> Date : 11 juin 2026 · Branche : `claude/modest-newton-5FRWm` · Document de travail
>
> Source : audit en 3 angles (code, UI/UX trends 2026, catalogue features B2B).
> Verdict global : **ce qui tourne est solide pour 3 assos et 0 lead. Pas pour 30 assos et 50 leads. Il faut investir maintenant — pas dans 6 mois.**

---

## TL;DR (à lire si tu as 90 secondes)

1. **Le cockpit actuel est un MVP qui craque sur 3 fronts** dès qu'il grossit : (a) **un seul fichier de 1100 lignes vanilla JS** non testable, (b) **aucune pagination ni recherche** sur les tableaux, (c) **`alert()` natifs partout** au lieu de toasts modernes. Voir §1.
2. **Sécurité OK mais perfectible** : RLS Postgres rigoureuse, mais tokens JWT en `sessionStorage` (vulnérable au XSS), pas de 2FA, hash gate par email hardcodé (impossible d'ajouter un collaborateur). Voir §2.
3. **La vision 2026 visée** : refonte UI dans une lane **différente du site marketing** — dark violet/cyan avec aurora background animé, OKLCH tokens, command palette ⌘K, view transitions natives, toasts à la Vercel, drawers Linear-style. Voir §3.
4. **Roadmap pragmatique en 4 sprints** : Quick Wins (2 j) → Pro Tools (1 sem) → Industrialisation (2 sem) → Polish & Power (1 sem). Voir §5.
5. **Top 20 features** classées valeur/effort. Les 4 premières (2FA, KPI cash mensuel, command palette, kanban leads) sont une **demi-journée chacune** et transforment l'expérience. Voir §6.

---

## §1. État des lieux — l'audit sans concession

### 1.1 Bugs latents et code smells

| Symptôme | Fichier:ligne | Sévérité | Reméd. |
|---|---|---|---|
| JWT (access + refresh) en `sessionStorage` — XSS = vol immédiat | `admin.astro:392-397` | Élevée | Refresh token en cookie `httpOnly; Secure; SameSite=Strict` |
| Race condition sur changement de statut concurrent | `admin.astro:584-591` | Moyenne | `AbortController` + rollback basé sur état au moment du fire |
| Périodes audience qui se chevauchent si on clique vite | `admin.astro:613-622` | Moyenne | `AbortController` par fetch |
| Cast `+value` sans garde sur quantités/prix → NaN dans le total | `admin.astro:943-944` | Moyenne | Validation numérique stricte + feedback UI |
| `window.open()` sans `noopener,noreferrer` (tabnabbing) | `admin.astro:906` | Faible | Ajouter les flags |
| `pdf-lib` (~500 Ko via esm.sh) téléchargé à chaque cold start | Edge function | Moyenne | Inline les bytes ou bundler en local Deno |

### 1.2 Performance — le mur à 500 items

- **Re-render complet** sur chaque PATCH : `renderLeads()` régénère tout le DOM. À 500 lignes, freeze visible. Pas de réutilisation virtuelle.
- **Inline JS de 1100 lignes** parsé à chaque page admin (~28 Ko gzip). Pas catastrophique mais cumulé avec le reste, on dépasse 50 Ko de JS bloquant.
- **RPC `cockpit_analytics`** recalcule tout en SQL à chaque clic. Pas de matérialisation, pas de cache HTTP. À 13 mois × milliers d'événements/jour → 2-5s par appel.
- **Aucune pagination** : `select=*` sans `limit` sur leads, customers, invoices. **Bombe à retardement.**

### 1.3 A11y — points faibles

- Onglets : `aria-selected` OK mais **pas de gestion clavier flèches gauche/droite** (pattern WAI-ARIA standard).
- Modals : `aria-modal="true"` OK mais **focus trap manquant** — Tab peut sortir vers le background.
- Tableaux : `<th>` sans `scope="col"`.
- `aria-live="polite"` sur la liste entière → spam screen reader à chaque re-render.

### 1.4 Maintenabilité — la vraie dette

1100 lignes vanilla JS en `is:inline` = **non-testable**, non-typé, pas isolé. Ajouter "filtrer factures par date" = toucher 20-50 lignes dans le seul fichier, avec un risque de régression sur les autres modules (scope IIFE partagé). À 6 mois, ajouter une feature deviendra douloureux.

### 1.5 Manques fonctionnels immédiats

- ❌ Pas de skeleton loader (juste "Chargement…" texte gris)
- ❌ `alert()` natifs partout au lieu de toasts (UX 2005)
- ❌ Aucune recherche / filtre / tri sur les tableaux
- ❌ Aucune pagination
- ❌ Pas d'undo après suppression
- ❌ Pas d'optimistic UI
- ❌ Pas de bulk actions
- ❌ Pas d'export CSV

### 1.6 Limites architecturales

- **RLS gate `is_konclav_admin()` hardcodé sur l'email** → **impossible d'ajouter un collaborateur** sans nouvelle migration. Solution : table `admin_users(user_id uuid, role text)` + `auth.uid() IN (...)`.
- **Pas de webhook entrant** : impossible de recevoir une notif paiement Stripe/Twint.
- **Pas de cron jobs** : factures qui ne passent jamais auto en `overdue` à J+30.
- **Pas d'immutabilité des factures émises** : modifier `vat_rate` sur une facture payée change le PDF re-téléchargé. **Légalement problématique.**

---

## §2. Sécurité — état actuel

✅ **Solide** : RLS Postgres deny-by-default, CSP avec hashes SHA-256, honeypot anti-spam sur formulaire, ETag strong sur HTML, HSTS preload, COOP/CORP, Permissions-Policy verrouillée, X-Robots-Tag noindex sur `/admin`.

⚠️ **À renforcer** :
- **2FA TOTP** absent — un mot de passe ne suffit pas pour gardien d'un business.
- **JWT en `sessionStorage`** → vulnérable XSS.
- **Pas de session révoke** ni de log "qui s'est connecté depuis quoi".
- **Pas d'audit log** des actions critiques (delete invoice, mark paid, change customer email).

---

## §3. Vision visuelle 2026 — Command Center

> **Brief** : différent du dark Linear sobre du site public. Plus chargé visuellement, plus moderne, plus "outil de pro" — sans tomber dans le gadget.

### 3.1 Palette OKLCH (dark, violet→cyan)

```
--bg-0:        oklch(15% 0.02 270)   /* near-black, légère teinte bleue */
--bg-1:        oklch(20% 0.03 270)   /* card */
--bg-2:        oklch(24% 0.03 270)   /* card hover */
--border:      oklch(30% 0.03 270 / 0.40)
--text:        oklch(95% 0.01 270)
--text-muted:  oklch(70% 0.02 270)
--accent:      oklch(70% 0.18 295)   /* violet électrique */
--accent-2:    oklch(80% 0.16 200)   /* cyan */
--success:     oklch(72% 0.18 145)
--warning:     oklch(80% 0.16 80)
--danger:      oklch(65% 0.22 25)
```

Light mode dès le jour 1 (luminances mirorisées L 95↔15) — facturer un soir d'été à la lumière naturelle a du sens.

### 3.2 Background dynamique

3 couches superposées, **CSS pur, 0 JS, < 3 Ko, < 1% CPU** :

1. **Aurora** : 3-4 blobs `radial-gradient(closest-side, oklch(70% 0.20 295), transparent 70%)` en `position: absolute`, `filter: blur(80px)`, animation `drift` 20s ease-in-out infinite (translate ±20%). Opacity 0.30.
2. **Grid SVG** statique : pattern lignes verticales/horizontales à 2% opacité, déformation perspective subtile (Vercel-style).
3. **Noise overlay** : SVG turbulence ou PNG 200×200 répété, opacity 0.04, mix-blend-mode overlay.

`@media (prefers-reduced-motion: reduce) { animation-play-state: paused }`.

### 3.3 Typographie

- **Inter** (déjà chargé) pour le corps : `font-feature-settings: 'cv11', 'ss03', 'calt'`
- **Geist Mono** ou **JetBrains Mono** auto-hébergé pour les IDs, montants, dates
- `font-variant-numeric: tabular-nums` partout dans les tableaux et KPI
- Hiérarchie : H1 page 24px/600/tracking-tight · KPI big 32-40px/600/tabular · Body 14px · Meta 12px/500/uppercase/letter-spacing-0.04em

### 3.4 Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ◐ Konclav    ⌘K Rechercher…              🔔  Kévin Perret  ▾           │ ← Topbar 56px
├──────────┬──────────────────────────────────────────────────────────────┤
│          │  Vue d'ensemble · Aujourd'hui                                │
│ 📊 Aper. │  ┌────────────┬────────┬────────┬────────┐                   │
│ 📥 Leads │  │   MRR      │ Encais.│ En att.│ Retard │   ← Bento KPI    │
│ 🧾 Fact. │  │  1'240 CHF │  840   │  420   │  240 ⚠ │     4-up         │
│ 👥 Clien.│  └────────────┴────────┴────────┴────────┘                   │
│ 📈 Audi. │                                                              │
│ ⚙️  Param.│  ┌──────────────────────────────┬───────────────────────┐  │
│          │  │ Trafic (7j) ▁▂▄▆█▇▅           │ Activité récente      │  │
│ ─────    │  │ ╱╲     ╱╲                     │ • Nouveau lead 5min   │  │
│ ◐ Mode   │  │╱  ╲___╱  ╲___                 │ • Facture INV-007 …   │  │
│ « collap.│  └──────────────────────────────┴───────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────────┘
   256px               aurora background derrière tout l'écran
   ou 56px collapsée
```

- **Sidebar** 256px expanded → 56px icons-only (toggle `[` / `]`, persist localStorage)
- **Topbar** 56px avec ⌘K input visible, notifications, profil
- **Bento KPI** 4-up sur la home, ratio responsif
- **Split-pane list+detail** pour Leads et Factures (480px liste / reste détail), état dans l'URL
- **Mobile** : sidebar devient drawer bottom, KPI strip horizontale scrollable, table → cards stack

### 3.5 Patterns "killer" à inclure

| Pattern | Effort | Effet |
|---|---|---|
| **Command palette ⌘K** | M | LE truc qui change tout. ~150 lignes vanilla |
| **Toasts à la Vercel** (stack bas-droite + promise + undo) | S | Remplace tous les `alert()`. ~100 lignes |
| **Drawer right-side** pour fiche lead/facture | M | État dans l'URL = deep-link friendly |
| **Skeleton shimmer** sur chargements | S | -30% latence perçue |
| **Stale-while-revalidate** (cache localStorage → fade nouveau) | M | Sensation "instant" |
| **View Transitions cross-page** (déjà actif côté site) | S | Réutiliser sur le cockpit |
| **Status pills OKLCH** | S | 11px/500/uppercase/letter-spacing |
| **Sparklines SVG** dans les lignes du tableau | S | Pas de Chart.js (90 Ko), 25 lignes vanilla |
| **Density toggle** (compact / confortable / spacious) | S | CSS var `--density` multiplie paddings |
| **Animated counter** sur KPI au mount | S | rAF + easing, tabular-nums |

---

## §4. Architecture cible

### 4.1 Refonte du code

```
src/pages/admin/
  index.astro              ← shell : sidebar + topbar + outlet
  leads/index.astro        ← liste
  leads/[id].astro         ← détail (drawer ou page)
  invoices/index.astro
  invoices/[id].astro
  customers/index.astro
  customers/[id].astro
  audience/index.astro
  settings.astro

src/admin/                 ← logique JS modulaire (ESM, importable)
  auth.js
  api.js                   ← wrapper REST + RPC + Edge Functions
  toast.js
  command-palette.js
  table.js                 ← table générique (sort, filter, paginate, density)
  drawer.js
  skeletons.js
  utils.js
```

Chaque page admin charge **uniquement** les modules dont elle a besoin via `<script type="module" src="…">`. Code-splitting natif. La CSP collecte les hashes du shell ; les modules sont sur `self`, autorisés par défaut.

### 4.2 Évolutions backend

- Nouvelle table `admin_users(user_id uuid, role text, invited_at timestamptz)` → policy RLS basée dessus au lieu de l'email hardcodé. Compatible team future.
- Table `audit_log(actor_user_id, action, target_type, target_id, payload jsonb, at timestamptz)` pour tracer delete/mark-paid/etc.
- Table `automations(trigger, conditions jsonb, actions jsonb, enabled)` pour les workflows (digest hebdo, relances).
- Materialized view `mv_analytics_daily` rafraîchie par `pg_cron` toutes les 5 min → la RPC `cockpit_analytics` lit la MV au lieu de scanner la table chaude.
- `pg_cron` jobs : marquer factures `sent` → `overdue` à due_date+1 ; lancer le digest hebdo.
- Edge Function `cockpit-actions` (verify_jwt + 2FA challenge) pour les actions sensibles (delete invoice, change vat_rate sur facture payée).

---

## §5. Roadmap en 4 sprints

### 🚀 Sprint 1 — Quick Wins (2 jours)

Objectif : **moderniser sans refondre**. Tout dans le code existant.

- [ ] **2FA TOTP** via Supabase Auth (factor enrollment + challenge à login)
- [ ] **Toast system** vanilla (remplace tous les `alert()`)
- [ ] **KPI cash du mois** sur Facturation : encaissé / dû / retard en gros chiffres
- [ ] **AbortController** sur les fetch (audience period switch + leads status)
- [ ] **`noopener,noreferrer`** sur `window.open(pdf)`
- [ ] **Validation numérique** sur quantités et prix de facture
- [ ] **`<th scope="col">`** sur les tableaux

**Livrable** : UX déjà visiblement plus pro. Sécurité hardcore.

### 🎨 Sprint 2 — Pro Tools (1 semaine)

Objectif : **transformer le quotidien**. Refonte UI partielle.

- [ ] **Aurora background + OKLCH tokens + Geist Mono** (juste sur `/admin`, pas le site)
- [ ] **Sidebar collapsible** + topbar moderne
- [ ] **Command palette ⌘K** (nav + recherche + actions)
- [ ] **Drawer right-side** pour fiche lead (au lieu de `<details>` expandable)
- [ ] **Vue Kanban des leads** (drag & drop entre statuts)
- [ ] **Templates email** + envoi depuis cockpit via Resend
- [ ] **Next action + rappel** sur lead (champ + badge si dépassé)
- [ ] **Lead → Customer en 1 clic** (pré-remplissage adresse)
- [ ] **Activity stream** sur la home cockpit
- [ ] **Export CSV factures**
- [ ] **Skeleton shimmer** + stale-while-revalidate

**Livrable** : c'est un vrai outil pro. Vraiment.

### 🏭 Sprint 3 — Industrialisation (2 semaines)

Objectif : **scaler à 30+ assos sans douleur**.

- [ ] **Refactor JS en modules ESM** (`src/admin/*.js`)
- [ ] **Table générique** (tri / filtre / pagination / densité / bulk select)
- [ ] **Table `admin_users`** + RLS basée dessus (préparer team)
- [ ] **Audit log** des actions critiques + page de consultation
- [ ] **Abonnements récurrents** (table + cron de génération de factures)
- [ ] **Relances impayés auto** (J+7, J+14, J+30 par email Resend)
- [ ] **Marquer auto `overdue`** à due_date+1 via `pg_cron`
- [ ] **Devis (quotes)** + conversion 1-clic en facture
- [ ] **Materialized view** pour analytics + refresh `pg_cron`
- [ ] **Provisionning d'asso** (Phase C — bouton qui crée l'org dans la DB de l'app + invite par magic link)

**Livrable** : business ops sur pilote auto.

### ✨ Sprint 4 — Polish & Power (1 semaine)

Objectif : **finition perçue 10/10**.

- [ ] **Undo après actions destructives** (toast 5s)
- [ ] **Shortcuts clavier** (J/K nav, E édit, N new, ? cheatsheet)
- [ ] **Density toggle** (compact/confortable/spacious)
- [ ] **Light mode toggle**
- [ ] **Conversion funnel** (visite → form open → submit → contacted → converted)
- [ ] **Comparaison période/période** (+12% vs 7j passés)
- [ ] **Webhooks sortants** (Slack/Discord) sur événements clés
- [ ] **Digest hebdo** par email à Kévin
- [ ] **Status page Edge Functions** (ping toutes les 5 min, historique 7j)
- [ ] **Empty states avec illustrations SVG line-art**

**Livrable** : Linear/Vercel-grade.

---

## §6. Top 20 features par valeur/effort

| # | Feature | Sprint | Effort | Impact |
|---|---|---|---|---|
| 1 | 2FA TOTP | 1 | S | 🔥🔥🔥 Sécurité |
| 2 | KPI cash mensuel (encais./dû/retard) | 1 | S | 🔥🔥🔥 Quotidien |
| 3 | Toast system (remplace alert) | 1 | S | 🔥🔥 UX |
| 4 | Templates email | 2 | S | 🔥🔥 -30min/sem |
| 5 | Next action + rappel sur lead | 2 | S | 🔥🔥 Anti-oubli |
| 6 | Lead → Customer 1 clic | 2 | S | 🔥🔥 Friction zéro |
| 7 | Export CSV factures | 1 | S | 🔥🔥 Obligation comptable |
| 8 | Command palette ⌘K | 2 | M | 🔥🔥🔥 Productivité |
| 9 | Aurora bg + OKLCH + sidebar moderne | 2 | M | 🔥🔥 Visuel |
| 10 | Vue Kanban leads | 2 | M | 🔥🔥 Stratégique |
| 11 | Activity stream home | 2 | M | 🔥 État du monde |
| 12 | Envoi email depuis cockpit | 2 | M | 🔥🔥 Trace |
| 13 | Drawer right-side lead/facture | 2 | M | 🔥 Linear UX |
| 14 | Digest hebdo email | 4 | S | 🔥🔥 Force l'usage |
| 15 | Relances impayés auto | 3 | M | 🔥🔥🔥 Cash récup |
| 16 | Abonnements récurrents | 3 | L | 🔥🔥🔥 Scaling |
| 17 | Devis (quotes) | 3 | M | 🔥🔥 Demande clients |
| 18 | Audit log actions critiques | 3 | M | 🔥 Forensic |
| 19 | Provisioning asso + magic link | 3 | L | 🔥🔥🔥 Bloque scaling actuellement |
| 20 | Status page Edge Functions | 4 | M | 🔥 Détecte bugs silencieux |

**À reporter sine die** : team & permissions (un seul user), A/B testing (pas de volume), heatmap (idem), API publique, éditeur visuel PDF, mode no-code workflow builder.

---

## §7. Pourquoi maintenant — argument business

Aujourd'hui : 3 assos signées, 0 lead, le cockpit suffit.
Dans 6 mois (hypothèse modeste) : 15 assos, 5 leads en pipeline, 12 factures à émettre par mois, des relances à faire, un onboarding à industrialiser.

**Sans investir maintenant** : Kévin va passer 4-6 h/sem sur des tâches d'administration manuelle (ressaisie facture mensuelle, relances à la main, leads perdus dans Gmail). À 30 CHF de l'heure d'opportunité, c'est 600-900 CHF/mois de coût caché.

**Avec investir 5-6 semaines de dev** (Sprints 1-4) : ces 4-6 h/sem disparaissent. ROI atteint en 2-3 mois.

**Conclusion** : le Sprint 1 (2 jours) est un no-brainer immédiat. Le Sprint 2 (1 semaine) est le meilleur ROI absolu. Les Sprints 3 et 4 peuvent attendre la 5e asso signée pour être priorisés.

---

## §8. Annexes — snippets de référence

### 8.1 Aurora background (CSS pur)

```css
.aurora { position: fixed; inset: 0; z-index: -2; overflow: hidden; pointer-events: none; }
.aurora::before, .aurora::after, .aurora .blob {
  content: ""; position: absolute; width: 60vw; height: 60vw; border-radius: 50%;
  filter: blur(80px); opacity: 0.30;
  animation: drift 22s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate;
}
.aurora::before { background: oklch(70% 0.20 295); top: -10%; left: -10%; }
.aurora::after  { background: oklch(80% 0.16 200); bottom: -15%; right: -10%; animation-delay: -7s; }
.aurora .blob   { background: oklch(72% 0.18 320); top: 30%; left: 40%; animation-delay: -14s; }
@keyframes drift {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(15%, -10%) scale(1.1); }
}
@media (prefers-reduced-motion: reduce) {
  .aurora::before, .aurora::after, .aurora .blob { animation-play-state: paused; }
}
```

### 8.2 Toast système (vanilla, ~80 lignes)

```js
const Toast = (() => {
  const root = document.createElement("div");
  root.className = "toast-stack";
  document.body.appendChild(root);
  const show = (msg, opts = {}) => {
    const el = document.createElement("div");
    el.className = `toast toast-${opts.type || "info"}`;
    el.innerHTML = `<span>${msg}</span>` + (opts.action ? `<button>${opts.action.label}</button>` : "");
    if (opts.action) el.querySelector("button").onclick = () => { opts.action.onClick(); el.remove(); };
    root.appendChild(el);
    setTimeout(() => el.classList.add("toast-out"), (opts.duration || 5000) - 200);
    setTimeout(() => el.remove(), opts.duration || 5000);
    return el;
  };
  return {
    info:    (m, o) => show(m, { ...o, type: "info" }),
    success: (m, o) => show(m, { ...o, type: "success" }),
    error:   (m, o) => show(m, { ...o, type: "error" }),
    promise: async (p, msgs) => {
      const el = show(msgs.loading, { type: "info", duration: 30000 });
      try { const r = await p; el.remove(); show(typeof msgs.success === "function" ? msgs.success(r) : msgs.success, { type: "success" }); return r; }
      catch (e) { el.remove(); show(typeof msgs.error === "function" ? msgs.error(e) : msgs.error, { type: "error" }); throw e; }
    },
  };
})();
```

### 8.3 Command palette (squelette ~150 lignes)

```js
// kbd: cmd+K → dialog showModal → input + listbox filtrable
// items: { id, label, section, keywords, action }
// scorer: subsequence match + bonus word-start + consecutive
// nav: ArrowUp/Down déplace aria-selected, Enter exécute action
// fermeture: ESC, clic backdrop, action exécutée
```

Voir Superhuman blog "How to build a remarkable command palette" pour les détails de design des sections et du scoring.

### 8.4 Sources visuelles

Linear UI refresh 2026 · Vercel Geist · Stripe Apps patterns · Raycast Pro 2026 · Cal.com Insights · Trigger.dev dashboards · Plain/Liveblocks/Inngest consoles. Liens dans l'historique du subagent UX/UI.

---

## §9. Ce que je te recommande de décider maintenant

1. **OK pour Sprint 1 immédiat** (2 jours) ? C'est un quick win sans risque, je peux le faire en une session.
2. **OK pour la lane visuelle "Command Center violet/cyan + aurora"** ? Si tu veux voir un mockup HTML statique avant de t'engager, je peux le pondre en 30 min.
3. **OK pour refondre le JS en modules ESM** (Sprint 3) ? C'est l'investissement le plus structurant — sans, tu te tireras une balle dans le pied à terme.
4. **Provisioning d'asso (Phase C)** : tu veux qu'on coordonne avec l'app maintenant ou on attend la 4e/5e asso signée ?

Réponds quand tu veux, le doc reste dans `docs/COCKPIT-AUDIT.md`.
