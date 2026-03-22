# DayGraph MVP Release Runbook

Last updated: March 22, 2026

## 1) Pre-release checks

- Confirm `main` is green locally:
  - `cd daygraph-web && npm run verify:phase1`
- Confirm Firebase environment variables are present in `functions/.env`.
- Confirm Firestore rules/indexes are in sync with deployed expectations.

## 2) Deploy sequence

1. Deploy backend + frontend:
   - `cd daygraph-web`
   - `firebase deploy --only functions,hosting`
2. If rules/indexes changed, deploy data layer:
   - `firebase deploy --only firestore:rules,firestore:indexes`

## 3) Smoke tests (production)

- Open `https://daygraph-49867.web.app`.
- Sign in with Google.
- Verify Today:
  - Create text log.
  - Edit duration/time.
  - Delete one log.
- Verify Insights:
  - Range selector reacts (7/30/90).
  - Daily summary, breakdown, trend, correlations render.
- Verify Chat:
  - Send message and receive response.
  - Deep Research mode toggle works.
  - Inline chart renders when returned.
- Verify Suggestion:
  - Suggestion card can be dismissed.
  - One-tap log creates an activity.

## 4) Rollback plan

- Hosting rollback:
  - Firebase Console > Hosting > Release history > rollback to previous version.
- Functions rollback:
  - Redeploy previous known-good commit:
    - `git checkout <previous_commit>`
    - `cd daygraph-web && firebase deploy --only functions`
- If schema/rules regression is detected:
  - Redeploy previous `firestore.rules` and `firestore.indexes.json`.

## 5) Post-release monitoring

- Check Firebase Functions logs for:
  - `getChatResponse`, `getSuggestion`, `getCorrelations`, `weeklyRecap`
- Check `users/{uid}/aiTelemetry` docs for latency/error anomalies.
- Track client errors via browser console during dogfooding.

## 6) Release metadata

- Recommended release tag: `v1.0.0-mvp`.
- Release owner: Product engineering.
- Environment: `daygraph-49867` production.
