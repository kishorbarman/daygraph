# DayGraph

DayGraph is a mobile-first life activity logging app that uses AI to structure logs, surface patterns, and generate insights.

## Repository Structure

- `daygraph-web/` - React + Vite + Firebase web app (active app code)
- `docs/` - Product spec, engineering design, and execution board

## Current Status

Phase 1 (Foundation) is complete:
- Firebase auth-gated app shell
- Today tab with manual text and preset logging
- Real-time timeline read path
- Baseline loading/error/empty states
- Test + build verification pipeline

## Local Development

From `daygraph-web/`:

```bash
npm install
npm run dev
```

Run full Phase 1 verification:

```bash
npm run verify:phase1
```

## Deployment

From `daygraph-web/`:

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

## Key Docs

- `docs/daygraph-product-spec.md`
- `docs/daygraph-engineering-design.md`
- `docs/daygraph-execution-board.md`
- `docs/phase1-smoke-deploy-checklist.md`
