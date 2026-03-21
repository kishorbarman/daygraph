# DayGraph — AI-Powered Life Activity Logger

## Product Spec v0.1 — Brainstorm Draft

---

## 1. Vision & Positioning

**One-liner:** An effortless life-logging app that captures your daily activities and uses AI to reveal patterns, correlations, and actionable insights about how you spend your time and what affects your well-being.

**Core thesis:** People have a vague sense of how they spend their days, but no real data. Habit trackers force you into rigid checkboxes. Journals are too much friction. DayGraph sits in the sweet spot — fast, flexible logging (text, voice, taps) with AI that structures, analyzes, and *proactively coaches* based on your actual life data.

**Why this isn't an LLM wrapper:** The value lives in persistent structured data accumulated over weeks/months, time-aware proactive UI that changes based on context, rich dashboards with trend visualizations, and an AI that has deep context on *your specific patterns* — not generic advice.

**Target user:** Health-conscious, self-improvement-oriented adults who want to understand their daily rhythms without the friction of manual spreadsheets or rigid habit apps. Initially: Kishor (dogfooding). Eventually: consumer SaaS.

**Working name:** DayGraph (alternatives to explore: Dayflow, Rhythm, Tally, Chronicle, DayLens, Pulse)

---

## 2. App Structure — Three Pillars

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   [Today Tab]       [Insights Tab]       [Chat Tab]      │
│                                                          │
│   Quick logging     Dashboards &         Conversational   │
│   + proactive       trend analysis       deep-dive with   │
│   suggestions                            your AI advisor  │
│                                                          │
│   All three share the same data layer + AI engine         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts & Data Model

### Activity Log Entry

Every log entry has:

| Field | Type | Source | Example |
|---|---|---|---|
| `activity` | string (AI-normalized) | User input → AI parsing | "Morning walk with Nugget" |
| `category` | enum | AI-classified | exercise, meal, sleep, caffeine, social, work, leisure, self-care, errand, transit |
| `timestamp` | datetime | Auto-captured or user-specified | 2026-03-17T08:30:00 |
| `duration_minutes` | int (nullable) | AI-inferred or user-specified | 30 |
| `is_point_in_time` | boolean | AI-inferred | false (walk has duration) / true (had a coffee) |
| `tags` | string[] | AI-extracted + user-added | ["Nugget", "outdoors", "morning routine"] |
| `mood` | 1-5 scale (optional) | User-prompted or skipped | 4 |
| `energy` | 1-5 scale (optional) | User-prompted or skipped | 3 |
| `notes` | string (optional) | User's raw input preserved | "Nugget was extra energetic today" |
| `source` | enum | Auto-tracked | text, voice, preset, auto |

### Activity Categories (AI-classified, user-correctable)

- **Meal** — breakfast, lunch, dinner, snack (sub-type tracked)
- **Caffeine** — coffee, tea, energy drink (amount if mentioned)
- **Sleep** — nighttime sleep, nap (duration is key)
- **Exercise** — walk, run, gym, yoga, sport (with Nugget = also social)
- **Social** — family time, friends, phone call, date
- **Work** — deep work, meetings, admin, commute
- **Leisure** — reading, TV, gaming, hobbies
- **Self-care** — meditation, journaling, grooming, doctor visit
- **Errand** — groceries, chores, errands
- **Transit** — driving, commute, travel

### Context Signals (for proactive AI)

The AI engine also tracks derived context:

- **Time of day** — morning / afternoon / evening / night
- **Day of week** — weekday vs. weekend patterns
- **Recent history** — what you've already logged today
- **Patterns** — your "usual" schedule (built over 2+ weeks of data)
- **Gaps** — periods with no logged activity (prompt to fill in?)

---

## 4. Feature Set — Organized by Pillar & Tier

### PILLAR A: TODAY TAB (Logging + Proactive UI)

#### P0 — MVP

- **Quick Log Input Bar** — Always-visible input at bottom of screen. Hybrid: type freely ("walked Nugget for 30 min") or tap preset buttons. AI parses natural language into structured entry. Confirm/edit before saving (one-tap to accept AI parsing).

- **Voice Logging** — Mic button next to input bar. "Had a large oat milk latte at 3pm" → AI transcribes + parses. Works for single entries or batch ("Had breakfast at 8, walked Nugget at 9, then worked from 10 to 12:30").

- **Preset Quick Buttons** — Customizable grid of frequent activities. Learns from your patterns (most-logged activities float to top). Tap = log instantly with timestamp. Long-press = edit details before saving. Defaults: ☕ Coffee, 🍳 Breakfast, 🍽️ Lunch, 🍽️ Dinner, 🐕 Walk Nugget, 💤 Sleep, 🏋️ Workout, 👨‍👩‍👦 Family time

- **Today Timeline** — Chronological view of everything logged today. Visual timeline (not just a list) showing duration-based activities as blocks. Gaps are visible — subtly highlighted to prompt "what were you doing 2-4pm?"

- **Proactive Suggestion Card** — ONE card at the top of the Today tab that changes based on context. Gentle by default: "Good evening! Looks like you haven't logged dinner yet — did you eat?" / "You usually walk Nugget around 7pm. Heading out soon?" Time-aware, pattern-aware, day-of-week-aware. Tap to log the suggested activity instantly, dismiss, or snooze.

- **Mood/Energy Check-in** — Optional, non-intrusive. After logging 3+ activities, a subtle prompt: "How are you feeling right now? (skip)" Quick 1-5 tap for mood and energy separately. This is the data that powers the "what affects my mood" insights.

#### P1 — Post-MVP

- **Smart Gap Detection** — "You have a 3-hour gap this afternoon. Want to fill it in?" Learns which gaps matter (you don't need to log every minute of work).

- **Photo Logging** — Snap a photo of your meal → AI identifies it and logs "lunch — pasta with vegetables." Uses device camera or photo library.

- **Location-Aware Suggestions** — If at the gym → suggest "Workout?" If at a coffee shop → suggest "Coffee?" Requires location permission (opt-in).

- **Recurring Activity Templates** — "Every weekday at 7am I wake up" → auto-log with one confirm tap.

- **Widget (Mobile)** — Home screen widget for one-tap logging without opening the app.

#### P2 — Growth

- **Wearable Integration** — Auto-log sleep and exercise from Fitbit/Garmin/Apple Watch.
- **Calendar Sync** — Pull meetings from Google Calendar as "work — meeting" entries.
- **Passive Tracking** — Screen time, step count (from phone sensors) as background context.

---

### PILLAR B: INSIGHTS TAB (Dashboards & Analysis)

#### P0 — MVP

- **Daily Summary Card** — At-a-glance: how today compared to your average. Time breakdown (work/exercise/social/leisure pie chart). Mood and energy trend line for the day. Highlight: "You had 3 coffees today vs. your usual 2."

- **Time Breakdown Dashboard** — Where does your time go? Weekly and monthly views. Stacked bar chart by category per day. Filter by category to drill into specifics. "You spent 42 hours working this week, 6 hours on exercise, 14 hours with family."

- **Health Correlations Panel** — The flagship insight: what affects what? Sleep duration vs. next-day energy score (scatter plot). Caffeine intake vs. sleep quality. Exercise frequency vs. mood trend. AI-generated narrative: "Weeks where you exercise 4+ times, your average mood is 4.1 vs. 3.2 when you exercise 1-2 times."

- **Mood & Energy Tracker** — Mood and energy plotted over time (line chart, 7/30/90 day view). Overlay with activity categories to spot correlations visually. "Your energy tends to dip on days with 3+ meetings."

- **Streaks & Consistency** — Current streaks for key activities (Nugget walks, workouts, sleep before midnight). Consistency score: "You've logged 26 of the last 30 days."

#### P1 — Post-MVP

- **Caffeine Analytics** — Daily/weekly caffeine intake trend. Time of last caffeine vs. sleep onset (correlation). "Your sleep is 45 min shorter on days you have coffee after 3pm."

- **Weekend vs. Weekday Comparison** — Side-by-side patterns. Are you resting enough on weekends? Or overworking?

- **Monthly Report (AI-Generated)** — Full narrative report: "March was your most active month. You walked Nugget 24 times, averaged 7.2 hours of sleep, and your mood trended upward in the second half of the month after you started morning workouts."

- **Social Time Analysis** — Hours spent with family/friends/alone over time. Correlation with mood.

- **Trend Alerts** — "Your sleep duration has decreased 3 weeks in a row." / "You've skipped your morning walk 4 of the last 5 days."

#### P2 — Growth

- **Comparative Benchmarks** — "You sleep more than 68% of DayGraph users your age" (opt-in, anonymized).
- **Custom Dashboards** — Build your own insight panels. Track any metric you care about.
- **Export & Share** — PDF/CSV export. Share a monthly summary with a partner or coach.

---

### PILLAR C: AI CHAT TAB (Conversational Deep-Dive — Powered by Gemini 3.1 Pro)

#### P0 — MVP

- **Natural Language Q&A** — "How much did I sleep last week?" / "When did I last go to the gym?" / "What's my average mood on days I walk Nugget?" Gemini 3.1 Pro has full access to your activity log (injected as context via Cloud Functions) and answers with specific data, leveraging its advanced reasoning for nuanced analysis.

- **Deep Research Mode** — Complex multi-step analysis triggered by open-ended questions. Uses Gemini 3.1 Pro's deep reasoning capabilities. "What's affecting my energy levels?" → AI analyzes sleep, caffeine, exercise, meals, work patterns, and produces a mini-report with charts. "Am I spending enough time with family?" → AI calculates weekly family time, trends it, compares to your other activities, and gives an honest assessment.

- **Inline Visualizations** — AI generates charts and graphs within the chat. "Show me my sleep pattern for March" → renders a chart.

- **Conversational Memory** — Chat retains context within a session. "What about compared to January?" follows naturally from a prior question.

#### P1 — Post-MVP

- **Coaching Mode** — "Help me sleep better" → AI analyzes your data, identifies your specific blockers (late caffeine, inconsistent bedtime, low exercise), and creates a personalized plan. Weekly check-ins: "Last week I suggested cutting coffee after 2pm. Your data shows you had coffee at 3pm twice — but your sleep did improve by 20 min on the other nights!"

- **"What If" Scenarios** — "What would happen if I walked Nugget every morning?" → AI projects mood/energy impact based on your existing correlation data.

- **Goal Setting via Chat** — "I want to work out 5 times a week" → AI sets up tracking, adjusts insights to include goal progress, and coaches you toward it.

#### P2 — Growth

- **Voice Chat** — Talk to your AI advisor instead of typing.
- **Proactive Check-ins** — AI initiates conversation: "Hey, I noticed you haven't logged much this week. Everything okay?"
- **Shareable Insights** — "Generate a summary I can share with my doctor about my sleep patterns."

---

### PILLAR D: AI ENGINE (Gemini 3-Powered Backend Intelligence)

#### P0 — MVP

- **Natural Language Parsing (Gemini 3 Flash)** — Convert free text and voice input into structured activity entries. Handle ambiguity: "coffee" → category: caffeine, amount: 1, time: now. Handle batch: "breakfast at 8, gym from 9 to 10, then worked until lunch." Gemini 3 Flash outperforms 2.5 Pro at 3x the speed — sub-200ms parsing for an instant-feeling UX.
- **Smart Categorization (Gemini 3 Flash)** — Auto-classify activities into categories. Learn from user corrections via few-shot examples stored per-user in Firestore ("that wasn't work, it was a personal project").
- **Duration Inference (Gemini 3 Flash)** — AI decides: "had coffee" = point-in-time. "Worked on project" = needs duration (prompt or infer from next activity).
- **Proactive Suggestion Engine (Gemini 3 Flash)** — Time + day + pattern based. Runs on each app open via Cloud Function: "What should I suggest right now?" Receives recent activity history + user patterns as context. Limited to ONE suggestion at a time (not overwhelming).
- **Correlation Engine (Gemini 3.1 Pro)** — Statistical analysis across activity types, mood, and energy. Powers the Health Correlations panel and Deep Research responses. 3.1 Pro's advanced reasoning handles complex multi-variable analysis and natural language report generation.

**Cost note:** Gemini 3 Flash at $0.50/1M input tokens handles the high-volume parsing cheaply. For even lower costs on bulk categorization, Gemini 3.1 Flash-Lite at $0.25/1M input tokens is an option. Gemini 3.1 Pro reserved for the heavy analytical work (chat, research, reports).

#### P1 — Post-MVP

- **Pattern Recognition** — Detect routines: "You have a consistent morning routine: wake → coffee → Nugget walk → breakfast." Detect disruptions: "Your routine has been irregular this week."
- **Anomaly Detection** — "You slept 4 hours last night — that's unusual. Everything okay?"
- **Predictive Mood Model** — Based on today's activities so far, predict end-of-day mood/energy. "Based on your patterns, getting a walk in this evening could boost your energy."

#### P2 — Growth

- **Personalized Insight Generation** — Weekly AI-written insights unique to you. Not generic health advice — specific to YOUR data.
- **Cross-user Pattern Mining** — (Opt-in) Find patterns across anonymized user base to improve recommendations.

---

### PILLAR E: PLATFORM & INFRASTRUCTURE

**Stack: Firebase + Gemini AI**

#### P0 — MVP

- **Firebase Auth (Google OAuth)** — Sign in with Gmail via Firebase Authentication. Single-user for now. Firebase Auth handles token management, session persistence, and security rules integration out of the box.
- **Firestore Database** — Activity logs, user preferences, and AI-generated insights stored in Cloud Firestore. Real-time listeners for instant UI updates when new entries are logged. Firestore Security Rules enforce per-user data isolation (users can only read/write their own data).
- **Firebase Hosting** — Responsive web app hosted on Firebase Hosting with global CDN. PWA-capable for "add to home screen" experience. Automatic SSL.
- **Cloud Functions for Firebase** — Serverless backend for AI processing pipeline, scheduled jobs (nightly trend computation, weekly recaps), and Gemini API calls. Triggered by Firestore writes (new activity → parse/categorize) and HTTP endpoints (chat API, deep research).
- **Gemini AI Engine** — Gemini 2.0 Flash for fast operations (activity parsing, categorization, proactive suggestions). Gemini 2.5 Pro for complex operations (deep research, correlation analysis, coaching). All AI calls routed through Cloud Functions — API keys never exposed to client.
- **Privacy-First Architecture** — No data shared with third parties. Firestore Security Rules + Firebase Auth ensure strict per-user data isolation. AI processing uses user's data only for their own insights. Clear privacy policy.

#### P1 — Post-MVP

- **Android App** — Native Android app (your strength) using Firebase Android SDK. Firebase Cloud Messaging (FCM) for push notifications (proactive suggestions, check-ins, weekly recaps).
- **Firestore Offline Persistence** — Built-in offline support via Firestore SDK. Log activities offline, auto-sync when reconnected. Works on web and mobile.
- **Data Export** — Cloud Function to generate CSV/JSON export of all activity data. "Your data is yours."
- **iOS App** — After Android, using Firebase iOS SDK. Same backend, no additional infrastructure.

#### P2 — Growth

- **Multi-user / Household** — Firestore sub-collections for shared household data. Security Rules for shared vs. private views.
- **Firebase Extensions + Stripe** — Free tier (logging + basic insights) + Pro tier (AI chat, deep research, coaching, advanced dashboards). Stripe integration via Firebase Extension for billing.
- **API** — Cloud Functions HTTP endpoints for third-party integrations.

---

## 5. Tech Stack — Firebase + Gemini Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Web / PWA)                       │
│               React (or Next.js static export)                  │
│         Firebase JS SDK (Auth, Firestore, Hosting)              │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ Firestore real-time       │ HTTPS calls
               │ listeners                 │
┌──────────────▼──────────────┐  ┌────────▼────────────────────┐
│      Cloud Firestore        │  │   Cloud Functions (Node.js)  │
│                             │  │                              │
│  users/{uid}                │  │  onActivityCreate → Gemini   │
│    └─ activities/{id}       │  │    3 Flash (parse/categorize)│
│    └─ insights/{id}         │  │                              │
│    └─ preferences           │  │  onChatMessage → Gemini      │
│    └─ corrections/{id}      │  │    3.1 Pro (deep research)   │
│                             │  │                              │
│  Firestore Security Rules   │  │  scheduled: nightly trends   │
│  enforce per-user isolation  │  │  scheduled: weekly recap     │
│                             │  │                              │
└─────────────────────────────┘  │  getSuggestion → Gemini      │
                                 │    3 Flash (proactive nudge)  │
                                 └──────────┬──────────────────┘
                                            │
                                 ┌──────────▼──────────────────┐
                                 │      Gemini AI API           │
                                 │                              │
                                 │  3 Flash: parsing,           │
                                 │    categorization,           │
                                 │    suggestions (~100-200ms)  │
                                 │                              │
                                 │  3.1 Pro: deep research,     │
                                 │    correlations, coaching,   │
                                 │    report generation         │
                                 │                              │
                                 │  3.1 Flash-Lite: optional    │
                                 │    for bulk/batch ops at     │
                                 │    lowest cost               │
                                 └─────────────────────────────┘
```

**Why Firebase fits this project:**

- **Auth** — Google OAuth in ~10 lines of code. Session management handled automatically.
- **Firestore** — Real-time listeners mean the Today Timeline updates instantly when you log. Security Rules enforce data isolation without writing auth middleware.
- **Cloud Functions** — Serverless = no infrastructure to manage. Pay-per-invocation keeps costs near-zero while dogfooding. Firestore triggers mean AI processing happens automatically on every new log entry.
- **Hosting** — Global CDN, automatic SSL, one-command deploys.
- **Mobile SDKs** — When you build Android/iOS later, same backend, zero migration. Firestore offline persistence works out of the box.

---

## 6. Proactive Suggestion Examples

The proactive AI is a key differentiator. Here's how it should feel throughout the day:

| Time/Context | Suggestion | Tone |
|---|---|---|
| 7:00 AM weekday | "Good morning! Ready to log your wake-up time?" | Gentle |
| 8:30 AM, no breakfast logged | "Looks like you haven't had breakfast yet. Skip or log?" | Neutral nudge |
| 10:00 AM, 2nd coffee | "That's coffee #2 today. Your sleep tends to suffer after 3+ cups." | Informative |
| 3:00 PM, long work block | "You've been working for 3 hours straight. A short walk might help — your energy usually dips around now." | Gentle nudge |
| 6:30 PM, no exercise logged | "You usually walk Nugget around now. Heading out?" | Pattern-based |
| 9:00 PM, detailed on demand | User taps "Tell me more" → "Based on your last 2 weeks: nights where you stop screens by 9:30pm, you fall asleep 25 min faster and report higher morning energy." | Detailed |
| Sunday evening | "Here's your week in review: you exercised 4 times, averaged 6.8h sleep, and your best mood day was Thursday after that long Nugget walk." | Weekly recap |

---

## 7. Competitive Landscape

| Tool | What it does | DayGraph's advantage |
|---|---|---|
| Apple Health / Google Fit | Passive fitness tracking | No manual activity logging. No AI insights. No mood/social tracking. |
| Daylio | Mood + activity tracker | Rigid. No AI. No natural language. No correlations. No voice. |
| Bearable | Health correlation tracker | Complex UI. No AI chat. Steep learning curve. |
| Exist.io | Auto-tracking + correlations | No manual logging UX. No AI chat. No proactive suggestions. |
| Toggl Track | Time tracking for work | Work-only. No life activities. No AI. No health focus. |
| Generic LLM chat (Gemini/ChatGPT/Claude) | Ask questions about anything | No persistent data. No dashboards. No proactive suggestions. Can't track anything. |

**DayGraph's moat:** Effortless logging (voice/text/tap) + persistent personal data + AI that knows YOUR patterns + proactive time-aware UI + rich dashboards. No single competitor combines all five.

---

## 8. Key Open Questions

1. **Naming** — "DayGraph" works but might sound too technical. Alternatives: Dayflow, Rhythm, Chronicle, Pulse, Tally, DayLens?
2. **Gemini Model Selection** — Gemini 3 Flash for parsing/categorization/suggestions (speed-critical, $0.50/1M input). Gemini 3.1 Pro for deep research/correlations/coaching (quality-critical). Gemini 3.1 Flash-Lite ($0.25/1M input) as a budget option for high-volume batch processing (nightly trend computation, bulk re-categorization). Confirm this three-tier split or simplify to two?
3. **Voice Transcription** — Browser Web Speech API (free, decent) vs. Gemini 3 Flash's native audio input capabilities vs. Google Cloud Speech-to-Text (high quality, Firebase-native billing)?
4. **Firestore Data Architecture** — Flat collections vs. sub-collections for activity logs? How to structure for efficient time-range queries and AI context windows?
5. **Mood/Energy Prompting** — How often? After every log? 3x/day? Only when asked? Too frequent = annoying. Too rare = sparse data.
6. **Privacy Messaging** — This is deeply personal data. How prominent should privacy guarantees be in the product?
7. **Monetization Tiers** — What's free vs. paid? Logging should be free. AI insights as the paid unlock? Firebase + Gemini cost model matters here.
8. **Gemini Context Strategy** — Gemini 3 Flash and 3.1 Pro both support 1M token context windows. How much activity history to include in each AI call? Full history gets expensive at scale. Summarized context + recent raw data? Firestore aggregation functions to pre-compute stats?

---

## 9. Suggested MVP Scope (4-6 week build)

A focused MVP that proves the core value loop — **log → see patterns → get insights:**

1. **Google OAuth** — Sign in with Gmail
2. **Quick Log Input** — Text input + AI parsing into structured entries
3. **Voice Logging** — Mic button with transcription + AI parsing
4. **Preset Quick Buttons** — Customizable frequent-activity grid
5. **Today Timeline** — Chronological view of today's logged activities
6. **Proactive Suggestion Card** — ONE context-aware suggestion on the Today tab
7. **Time Breakdown Dashboard** — Where your time goes (weekly/monthly)
8. **Health Correlations Panel** — Sleep/caffeine/exercise vs. mood/energy
9. **Mood/Energy Check-in** — Optional 1-5 rating after logging
10. **AI Chat** — Natural language Q&A + deep research over your data
11. **Responsive Web App** — Works on desktop and mobile browsers

**Not in MVP:** Photo logging, location awareness, wearable integration, coaching mode, Android app, multi-user, billing.

---

*Next step: Review this spec → Lock features → Move to engineering design (architecture, data model, API design, AI pipeline).*
