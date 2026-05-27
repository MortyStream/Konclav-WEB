# Konclav — site marketing

Site vitrine de **Konclav**, l'intranet privé pour associations suisses.

- **Stack** : Astro (static output) + Tailwind CSS v4, zéro framework JS.
- **Polices** : Inter auto-hébergée via `@fontsource/inter`.
- **Analytics** : Umami (sans cookie).
- **Déploiement** : Infomaniak (Node.js + `express`, voir `server.js`).

## Développement

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/ (avec sitemap)
npm run preview
```

## Production (Infomaniak)

| Réglage           | Valeur                                            |
| :---------------- | :------------------------------------------------ |
| Version Node.js   | 24                                                |
| Construction      | `npm install && npm run build`                    |
| Exécution         | `npm start` — `express` sert `dist/` sur `$PORT`  |

`server.js` ajoute les en-têtes de sécurité (CSP, HSTS…), la compression et le
fallback 404.

Détails (design system, conventions, déploiement, pages légales) : voir
**CLAUDE.md**.
