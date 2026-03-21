# Phase 1 Smoke + Deploy Checklist

## Automated Verification

Run from `/Users/kishorbarman/projects/daygraph/daygraph-web`:

```bash
npm run verify:phase1
```

This command validates:
- ESLint checks
- Phase 1 component integration tests
- TypeScript + production build

## Manual Smoke Checks (Staging)

1. Open app and confirm loading state appears briefly.
2. Sign in with Google and confirm app shell loads.
3. Verify `Today / Insights / Chat` tabs switch correctly.
4. Add a manual text log from Today input.
5. Add a preset log from Quick Presets.
6. Confirm both entries appear in Today timeline in real time.
7. Sign out and verify protected shell is no longer visible.
8. Attempt unauthenticated access and confirm login screen gate remains enforced.

## Firestore Security Validation

1. Deploy rules and indexes.
2. Verify user can read/write only `/users/{uid}/...` for their own uid.
3. Verify cross-user reads/writes are denied.

## Deploy Notes

- Ensure Firebase project variables are configured in local `.env` before build.
- Ensure Firestore composite indexes are deployed before timeline query validation.
- If deploy is blocked, do not proceed to Phase 2 until all smoke checks pass.
