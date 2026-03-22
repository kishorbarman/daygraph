# DayGraph Full Execution Board (All Phases)

## Summary

- This is the implementation-ready execution board for Phases 1-5 (MVP) plus Phase 6 (post-MVP waves).
- Work is organized by phase, with strict entry criteria, ordered tasks, dependencies, and exit gates.
- We will execute Phase 1 first, then proceed phase-by-phase only after exit gates pass.

## Global Rules (Applies to Every Phase)

1. Branching: use feature branches prefixed `codex/`.
2. Completion gate for each task: code merged, tests passing, and acceptance scenario validated.
3. Completion gate for each phase: all required tasks done, no P0 blockers open, deployment checklist passed.
4. AI baseline: `gemini-3-flash` (parse/suggestions), `gemini-3.1-pro` (chat/research/correlations).
5. No schema-breaking changes after Phase 2 without migration plan.

## Execution Board

### Phase 1: Foundation (Week 1-2)

Entry criteria: repo initialized, Firebase project available.

| ID | Step | Depends On | Deliverable | Done When | Status |
|---|---|---|---|---|---|
| P1-01 | Initialize web app scaffold (React/Vite/Tailwind) | None | Running local app shell | App boots, lint/typecheck pass | Completed |
| P1-02 | Configure Firebase client + env wiring | P1-01 | `firebase.ts` + env docs | Auth/Firestore init succeeds locally | Completed |
| P1-03 | Implement Google Auth flow + auth guard | P1-02 | Login/logout + protected app | Unauth blocked, auth persists | Completed |
| P1-04 | Create Firestore rules + indexes | P1-02 | `firestore.rules`, indexes JSON | Owner-only read/write verified | Completed |
| P1-05 | Build AppShell + 3-tab navigation | P1-03 | Today/Insights/Chat routes | Tabs switch reliably | Completed |
| P1-06 | Implement base data types/contracts | P1-02 | TS interfaces for core docs | Types used by services/components | Completed |
| P1-07 | Build Today timeline read path | P1-05,P1-06 | Real-time activity list/timeline | New activity appears live | Completed |
| P1-08 | Build InputBar + preset logging fallback | P1-07 | Manual logging operational | Can log without AI services | Completed |
| P1-09 | Add baseline loading/error/empty states | P1-07,P1-08 | Shared state components | Failure paths are recoverable | Completed |
| P1-10 | Phase 1 integration tests + smoke deploy | P1-04..P1-09 | Test suite + staging deploy | All P1 acceptance checks pass | Completed |

Phase 1 exit gate:
- Auth works, secure data isolation verified, Today tab supports non-AI logging end-to-end.

Phase 1 status (updated March 21, 2026):
- Exit gate met.
- `npm run verify:phase1` passing (lint + tests + build).
- Firebase deploy successful for rules, indexes, and hosting (`daygraph-49867`).
- Mobile-first edge-to-edge UX refinement applied for authenticated shell + Today surfaces.
- Known intentional gap: activity edit/delete is not in Phase 1 scope (scheduled in Phase 2).

---

### Phase 2: AI Parsing + Voice (Week 2-3)

Entry criteria: Phase 1 exit gate passed.

| ID | Step | Depends On | Deliverable | Done When | Status |
|---|---|---|---|---|---|
| P2-01 | Implement `parseActivityPreview` callable | P1-10 | Function + schema validation | Returns structured drafts reliably | Completed |
| P2-02 | Build Parse Preview modal (edit/confirm) | P2-01 | UI for review before save | User edits persist correctly | Completed |
| P2-03 | Implement `activitiesRaw` write pipeline | P1-10 | Raw queue path in service layer | Raw docs created with status | Completed |
| P2-04 | Implement `onActivityRawCreate` trigger parse flow | P2-03 | Raw -> parsed `activities` pipeline | Batch inputs converted correctly | Completed |
| P2-05 | Implement corrections capture + storage | P2-02,P2-04 | `corrections` write path | Corrections stored with metadata | Completed |
| P2-06 | Feed recent corrections into parser context | P2-05 | Few-shot correction loop | Repeat misclassification decreases | Completed |
| P2-07 | Add voice input hook + mic UI | P2-02 | Speech-to-text input flow | Voice transcript reaches parser | Completed |
| P2-08 | Implement parse failure/retry UX | P2-04 | Failed status handling | No input loss on AI failures | Completed |
| P2-09 | Phase 2 integration + contract tests | P2-01..P2-08 | Tested AI logging stack | Text/voice single+batch pass | Completed |

Phase 2 exit gate:
- Natural-language and voice logging are stable with confirmation, corrections, and retries.

Phase 2 status (updated March 21, 2026):
- Exit gate met.
- Gemini-backed parsing integrated in Cloud Functions (`parseActivityPreview`, `onActivityRawCreate`) with fallback parser safety.
- `activitiesRaw` queue + Firestore trigger pipeline active in production.
- Timeline edit/delete shipped; category edits write correction records.
- Voice logging shipped in Today input, plus raw-queue parse retry UX.
- Local dev validation and verification suite passing (`npm run verify:phase1`), and Phase 2 functions deployed to `daygraph-49867`.

---

### Phase 3: Insights Dashboard (Week 3-4)

Entry criteria: Phase 2 exit gate passed.

| ID | Step | Depends On | Deliverable | Done When | Status |
|---|---|---|---|---|---|
| P3-01 | Implement activity->`dailyStats` aggregation trigger | P2-09 | Daily aggregates pipeline | Category counts/minutes accurate | Completed |
| P3-02 | Implement scheduled `nightlyTrendCompute` -> `weeklyStats` | P3-01 | Weekly rollup/streak job | Weekly docs generated correctly | Completed |
| P3-03 | Build date range selector (7/30/90) | P1-10 | Shared filter control | All insights react to filter | Completed |
| P3-04 | Build Daily Summary card | P3-01,P3-03 | Today vs average view | Values match aggregates | Completed |
| P3-05 | Build Time Breakdown chart | P3-01,P3-03 | Stacked category chart | Chart totals reconcile with data | Completed |
| P3-06 | Build Mood/Energy trend chart + threshold gating | P3-01,P3-03 | Dual line chart | Hidden/shown per data threshold | Completed |
| P3-07 | Build Streak cards | P3-02 | Streak panel | Non-gamified streak display | Completed |
| P3-08 | Add Mood/Energy prompt flow in Today | P3-01 | Prompt + writes | Trigger cadence behaves correctly | Completed |
| P3-09 | Phase 3 analytics validation tests | P3-01..P3-08 | Aggregate correctness tests | Timezone and DST tests pass | Completed |

Phase 3 exit gate:
- Insights tab is fully functional with trustworthy aggregates and chart behavior.

Phase 3 status (updated March 21, 2026):
- Exit gate met.
- `dailyStats` aggregation trigger and nightly `weeklyStats` trend/streak rollup are implemented in Cloud Functions.
- Insights tab now ships 7/30/90 filtering, Daily Summary, Time Breakdown, Mood/Energy trend gating, and Streak cards.
- Today tab now includes Mood/Energy prompt cadence and writes values back to activity records.
- Phase 3 validation tests added for analytics metrics and date-key handling (including DST boundary cases).
- Local verification passing (`npm run verify:phase1`) and local dev server validation completed.

---

### Phase 4: AI Chat + Suggestions (Week 4-5)

Entry criteria: Phase 3 exit gate passed.

| ID | Step | Depends On | Deliverable | Done When | Status |
|---|---|---|---|---|---|
| P4-01 | Implement `getChatResponse` callable with context tiers | P3-09 | Chat backend pipeline | Data-grounded responses returned | Completed |
| P4-02 | Build Chat UI (messages/input/session state) | P4-01 | Chat tab end-to-end | Multi-turn session works | Completed |
| P4-03 | Implement chart config extraction/validation | P4-01 | Safe chart payload parser | Invalid chart payloads fail gracefully | Completed |
| P4-04 | Build InlineChart renderer | P4-03 | Chat-embedded charts | Valid charts render correctly | Completed |
| P4-05 | Add Deep Research mode toggle | P4-01,P4-02 | Research mode UX/backend flag | Long-form mode operational | Completed |
| P4-06 | Implement `getSuggestion` callable | P3-09 | Suggestion engine API | Returns one suggestion or null | Completed |
| P4-07 | Build SuggestionCard + dismiss/one-tap log | P4-06 | Today proactive card | No repeated dismissed suggestion | Completed |
| P4-08 | Implement scheduled `weeklyRecap` narrative | P3-02,P4-01 | Weekly AI recap storage | Recap saved to weekly stats | Completed |
| P4-09 | Add telemetry for AI latency/cost/errors | P4-01,P4-06 | Observability dashboard events | Alertable metrics emitted | Completed |

Phase 4 exit gate:
- Chat and proactive suggestions work reliably with observability and guardrails.

Phase 4 status (updated March 21, 2026):
- Exit gate met.
- Chat backend callable (`getChatResponse`) shipped with context tiers, deep-research mode flag support, and grounded response contract.
- Chat tab shipped with multi-turn state, follow-ups, safe chart payload extraction/validation, and inline chart rendering.
- Suggestion backend callable (`getSuggestion`) shipped with dismissal-aware dedupe and nullable response behavior.
- Today proactive suggestion card shipped with dismiss and one-tap logging flows.
- Scheduled weekly recap job (`weeklyRecap`) shipped to persist recap narrative into `weeklyStats`.
- AI telemetry collection shipped for chat and suggestion paths (latency, estimated token/cost, and error/fallback status).
- Phase 4 changes deployed to Firebase Functions + Hosting (`daygraph-49867`) and local verification passed (`npm run verify:phase1`).

---

### Phase 5: Correlations + Production Polish (Week 5-6)

Entry criteria: Phase 4 exit gate passed.

| ID | Step | Depends On | Deliverable | Done When |
|---|---|---|---|---|
| P5-01 | Implement correlation analysis pipeline | P3-09,P4-01 | Correlation output contract | Sample-size-aware insights produced |
| P5-02 | Build Health Correlations UI panel | P5-01 | Narrative + supporting chart | Insight card renders consistently |
| P5-03 | Build onboarding flow (3 cards + preset setup) | P1-10 | First-run UX | Seen once, then skipped |
| P5-04 | Build preset customization UI | P1-10 | Add/remove/reorder presets | Persisted and reflected in Today |
| P5-05 | PWA setup (manifest/service worker/offline shell) | P1-10 | Installable web app | Install prompt + offline shell work |
| P5-06 | Full UX polish pass (responsive/loading/error/empty) | P3-09,P4-09 | Production UX consistency | Core flows pass mobile/desktop checks |
| P5-07 | Privacy policy + compliance checks | P1-10 | Public policy page + checklist | Linked and accessible in app |
| P5-08 | Performance pass (bundle, listeners, query efficiency) | P5-06 | Perf fixes + budgets | Targets met on staging |
| P5-09 | Final MVP release runbook + production deploy | P5-01..P5-08 | Tagged MVP release | Rollback-tested deployment |

Phase 5 exit gate:
- Production-ready MVP shipped with privacy/security/performance validated.

---

### Phase 6: Post-MVP Waves (Planned, Not Started)

Entry criteria: MVP in stable dogfooding use.

| Wave | Items | Prerequisites |
|---|---|---|
| P1 Wave | Smart gaps, caffeine analytics, weekend vs weekday, coaching mode, trend alerts, recurring templates | Stable MVP telemetry + UX feedback |
| P2 Wave | Wearables/calendar/passive tracking, voice chat, proactive check-ins, export/share, benchmarks, custom dashboards | Data-source agreements + privacy review |

## Test Plan by Phase

1. P1: auth security, manual logging, timeline sync, empty/error states.
2. P2: parser correctness (single/batch), voice path, correction learning, retry on failure.
3. P3: aggregate correctness, chart threshold behavior, timezone/DST consistency.
4. P4: grounded chat answers, inline chart safety, suggestion dedupe, deep research behavior.
5. P5: correlation validity (with sample size), onboarding completion, PWA install/offline, performance and release smoke tests.

## Assumptions and Defaults

- Single-user data isolation is the only tenancy model in MVP.
- Parse confirmation is required by default (no auto-save in MVP).
- "Calm, non-gamified" copy rules are mandatory acceptance criteria for Today/Insights prompts.
- Post-MVP items remain out of build scope until MVP release gate is passed.
