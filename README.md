# Are we ESM yet?

ESM adoption dashboard for the JavaScript/TypeScript ecosystem. Tracks how high-impact npm packages are progressing from CommonJS toward ECMAScript Modules.

**Live:** [areweesmyet.com](https://areweesmyet.com)

## Features

- **Hero metric** — "X% of high-impact npm packages are ESM-ready"
- **Adoption breakdown** — ESM / dual / faux / CJS stacked bar
- **Trend chart** — Historical data from 2021 to present
- **Glossary** — Definitions of ESM, dual, faux, CJS

## Setup

```bash
pnpm install
```

### Environment

For local crawls, create a `.env` file:

```
NPM_TOKEN=your_npm_token_here
```

Get a read-only token at [npmjs.com/settings/~/tokens](https://www.npmjs.com/settings/~/tokens). Without it, npm may rate-limit (~15k requests).

## Scripts

| Command        | Description                                               |
| -------------- | --------------------------------------------------------- |
| `pnpm dev`     | Build and start preview server                            |
| `pnpm build`   | Build static site                                         |
| `pnpm preview` | Preview production build                                  |
| `pnpm crawl`   | Run ESM crawl (writes `data/*.json`, appends `index.csv`) |
| `pnpm lint`    | Lint with oxlint                                           |
| `pnpm lint:fix`| Lint and auto-fix                                          |
| `pnpm fmt`     | Format with oxfmt                                          |
| `pnpm fmt:check` | Check formatting without writing                         |

## Deploy (Cloudflare Pages)

1. Connect your GitHub repo to Cloudflare Pages
2. **Build command:** `pnpm build`
3. **Build output directory:** `dist`
4. **Environment:** None required for static build
5. Add custom domain `areweesmyet.com` in project settings

## Daily Crawl

A GitHub Action runs the crawl daily at 06:00 UTC. To enable:

1. Add `NPM_TOKEN` to repo secrets (Settings → Secrets and variables → Actions)
2. Push to trigger deploy; the crawl commits `data/*.json` and `index.csv` on success

Manual trigger: Actions → Daily ESM Crawl → Run workflow.

## Data

- **`index.csv`** — Aggregated trends (date, total, esm, dual, faux, cjs). Bootstrapped from [wooorm/npm-esm-vs-cjs](https://github.com/wooorm/npm-esm-vs-cjs).
- **`data/YYYY-MM-DD.json`** — Per-package classification. Only the latest 7 days are kept.

## Tech

- Single HTML file — No framework
- [Chart.js](https://chart.js) — Trend chart
- [npm-high-impact](https://github.com/wooorm/npm-high-impact) — Package list
- [pacote](https://github.com/npm/pacote) — npm registry client
