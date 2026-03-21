# DayGraph — Engineering & UX Design Document

## v0.1 — MVP Scope

---

## Table of Contents

1. System Architecture
2. Firestore Data Model
3. Cloud Functions — API & Pipeline Design
4. AI Pipeline — Gemini Integration
5. Frontend Architecture
6. UX Design — Screens & Flows
7. Security & Privacy
8. Development Phases & Build Plan

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                   │
│                                                                         │
│  React SPA (Vite) + Firebase JS SDK + TailwindCSS                      │
│  ├── Firebase Auth (Google OAuth)                                       │
│  ├── Firestore real-time listeners (activities, insights, suggestions)  │
│  ├── Web Speech API (voice → text, client-side)                        │
│  └── HTTP calls to Cloud Functions (chat, parsing, suggestions)         │
│                                                                         │
│  Hosted on Firebase Hosting (CDN + SSL + PWA)                          │
└──────────┬──────────────────────────┬───────────────────────────────────┘
           │                          │
           │  Firestore SDK           │  HTTPS (callable functions)
           │  (real-time sync)        │
           │                          │
┌──────────▼──────────────────────────▼───────────────────────────────────┐
│                        FIREBASE BACKEND                                 │
│                                                                         │
│  ┌─────────────────────┐    ┌──────────────────────────────────────┐   │
│  │   Cloud Firestore    │    │      Cloud Functions (Node.js 20)    │   │
│  │                      │    │                                      │   │
│  │  /users/{uid}        │◄──►│  TRIGGERS:                          │   │
│  │    /activities/{id}  │    │    onActivityRawCreate               │   │
│  │    /insights/{id}    │    │      → Gemini 3 Flash parse          │   │
│  │    /chatSessions/{id}│    │    onActivityParsedCreate            │   │
│  │    /suggestions      │    │      → update daily aggregates       │   │
│  │    /preferences      │    │                                      │   │
│  │    /dailyStats/{date}│    │  CALLABLE:                           │   │
│  │    /weeklyStats/{wk} │    │    parseActivityInput                │   │
│  │    /corrections/{id} │    │    getChatResponse                   │   │
│  │                      │    │    getSuggestion                     │   │
│  │  Security Rules:     │    │    getDeepResearch                   │   │
│  │  per-user isolation   │    │                                      │   │
│  └─────────────────────┘    │  SCHEDULED:                           │   │
│                              │    nightlyTrendCompute (daily 2am)    │   │
│                              │    weeklyRecap (Sunday 8pm)           │   │
│                              └──────────────┬───────────────────────┘   │
│                                              │                          │
└──────────────────────────────────────────────┼──────────────────────────┘
                                               │
                                    ┌──────────▼──────────────┐
                                    │   Google AI (Gemini)     │
                                    │                          │
                                    │   gemini-3-flash         │
                                    │     → parseActivity      │
                                    │     → categorize         │
                                    │     → getSuggestion      │
                                    │                          │
                                    │   gemini-3.1-pro         │
                                    │     → chatResponse       │
                                    │     → deepResearch       │
                                    │     → correlationAnalysis│
                                    │     → weeklyRecap        │
                                    └──────────────────────────┘
```

### Key Architecture Decisions

**Why React SPA (Vite) instead of Next.js?**
Firebase Hosting serves static files via CDN. We don't need SSR — all data comes from Firestore in real-time. Vite gives us fast builds, and deploying a static SPA to Firebase Hosting is trivial. When we build the Android app later, the same Cloud Functions backend works unchanged.

**Why callable functions instead of REST?**
Firebase callable functions automatically include the user's auth token — no manual header management. They also handle CORS, serialization, and error codes out of the box. Simpler client code.

**Two-phase activity creation:**
1. Client writes raw input to Firestore (`activities_raw`)
2. Cloud Function trigger picks it up, calls Gemini 3 Flash, writes parsed activity to `activities`
3. Client listens on `activities` collection — UI updates in real-time

This decouples the UI from AI latency. The user sees "processing..." briefly, then the parsed entry appears. If Gemini is slow or fails, the raw input is preserved and can be retried.

---

## 2. Firestore Data Model

### Collection Structure

```
firestore-root/
│
├── users/{uid}/                          # Per-user document
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── createdAt: timestamp
│   ├── lastActiveAt: timestamp
│   └── timezone: string                  # "America/Los_Angeles"
│
│   ├── preferences/settings              # Single doc for user prefs
│   │   ├── presets: array<Preset>        # Quick-log button config
│   │   ├── moodPromptFrequency: string   # "after_3_logs" | "3x_daily" | "manual"
│   │   ├── suggestionLevel: string       # "gentle" | "detailed" | "off"
│   │   └── categories: array<string>     # Custom categories (extends defaults)
│   │
│   ├── activities/{activityId}           # Parsed, structured activities
│   │   ├── activity: string              # "Morning walk with Nugget"
│   │   ├── category: string              # "exercise"
│   │   ├── subCategory: string           # "walk"
│   │   ├── timestamp: timestamp          # When the activity occurred
│   │   ├── endTimestamp: timestamp|null   # For duration-based activities
│   │   ├── durationMinutes: number|null   # Computed or AI-inferred
│   │   ├── isPointInTime: boolean        # true = no duration
│   │   ├── tags: array<string>           # ["Nugget", "outdoors"]
│   │   ├── mood: number|null             # 1-5
│   │   ├── energy: number|null           # 1-5
│   │   ├── notes: string                 # User's raw input preserved
│   │   ├── source: string                # "text" | "voice" | "preset" | "auto"
│   │   ├── rawInput: string              # Original user input before parsing
│   │   ├── createdAt: timestamp          # When logged (may differ from activity timestamp)
│   │   └── editedAt: timestamp|null
│   │
│   ├── activitiesRaw/{rawId}             # Unparsed inputs (temporary, cleaned up after parsing)
│   │   ├── input: string                 # Raw text or voice transcription
│   │   ├── source: string                # "text" | "voice" | "preset"
│   │   ├── createdAt: timestamp
│   │   ├── status: string                # "pending" | "parsed" | "failed"
│   │   └── parsedActivityIds: array<string>  # Links to resulting activities (batch input → multiple)
│   │
│   ├── dailyStats/{YYYY-MM-DD}           # Pre-computed daily aggregates
│   │   ├── date: string
│   │   ├── totalActivities: number
│   │   ├── categoryMinutes: map          # { exercise: 60, work: 480, ... }
│   │   ├── categoryCount: map            # { caffeine: 3, meal: 3, ... }
│   │   ├── avgMood: number|null
│   │   ├── avgEnergy: number|null
│   │   ├── moodEntries: number           # How many mood ratings today
│   │   ├── energyEntries: number
│   │   ├── sleepMinutes: number|null
│   │   ├── caffeineCount: number
│   │   ├── lastCaffeineTime: timestamp|null
│   │   ├── exerciseMinutes: number
│   │   └── updatedAt: timestamp
│   │
│   ├── weeklyStats/{YYYY-Www}            # e.g., "2026-W12"
│   │   ├── weekStart: timestamp
│   │   ├── categoryMinutes: map          # Totals for the week
│   │   ├── categoryCount: map
│   │   ├── avgMood: number|null
│   │   ├── avgEnergy: number|null
│   │   ├── exerciseDays: number          # Days with exercise logged
│   │   ├── avgSleepMinutes: number|null
│   │   ├── avgCaffeineCount: number
│   │   ├── streaks: map                  # { exercise: 5, nuggetWalk: 12, ... }
│   │   ├── aiRecap: string|null          # AI-generated weekly summary
│   │   └── updatedAt: timestamp
│   │
│   ├── chatSessions/{sessionId}
│   │   ├── createdAt: timestamp
│   │   ├── title: string                 # AI-generated or first message
│   │   └── messages: array<ChatMessage>
│   │       ├── role: "user" | "assistant"
│   │       ├── content: string
│   │       ├── timestamp: timestamp
│   │       ├── charts: array<ChartConfig>|null  # Inline visualizations
│   │       └── isDeepResearch: boolean
│   │
│   ├── corrections/{correctionId}        # User corrections to AI categorization
│   │   ├── activityId: string
│   │   ├── field: string                 # "category" | "subCategory" | "duration" etc.
│   │   ├── originalValue: any
│   │   ├── correctedValue: any
│   │   └── createdAt: timestamp
│   │
│   └── currentSuggestion                 # Single doc, overwritten each time
│       ├── text: string                  # "You usually walk Nugget around now."
│       ├── type: string                  # "gentle" | "informative" | "pattern"
│       ├── suggestedActivity: map|null   # Pre-filled activity for one-tap log
│       ├── generatedAt: timestamp
│       └── dismissedAt: timestamp|null
```

### Preset Object Shape

```typescript
interface Preset {
  id: string;
  emoji: string;           // "☕"
  label: string;           // "Coffee"
  category: string;        // "caffeine"
  subCategory?: string;    // "coffee"
  isPointInTime: boolean;  // true
  defaultDuration?: number; // null for point-in-time
  usageCount: number;      // For frequency-based sorting
}
```

### Indexing Strategy

Firestore composite indexes needed:

```
# Activities by date range (for timeline, insights)
users/{uid}/activities — (timestamp DESC)
users/{uid}/activities — (category ASC, timestamp DESC)

# Daily stats by date range (for charts)
users/{uid}/dailyStats — (date DESC)

# Chat sessions by recency
users/{uid}/chatSessions — (createdAt DESC)
```

### Why This Structure?

**Sub-collections under users/{uid}** — Firestore Security Rules can enforce `request.auth.uid == uid` at the top level, automatically protecting all nested data. No cross-user queries needed for MVP.

**dailyStats as pre-computed aggregates** — Instead of querying all activities for a date range and computing stats client-side (expensive reads, slow), we maintain running daily aggregates. Updated via Cloud Function triggers whenever an activity is created/modified. The Insights tab reads these directly — fast, cheap, and chart-ready.

**weeklyStats computed nightly** — A scheduled Cloud Function rolls up dailyStats into weeklyStats. This powers the weekly recap, streaks, and trend analysis without expensive queries.

**activitiesRaw as a processing queue** — Decouples user input from AI processing. If Gemini fails, raw input is preserved with status "failed" for retry. Once parsed, the raw doc can be cleaned up after 24 hours.

---

## 3. Cloud Functions — API & Pipeline Design

### Function Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  CLOUD FUNCTIONS                             │
│                                                              │
│  TRIGGER FUNCTIONS (Firestore-driven):                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ onActivityRawCreate                                  │    │
│  │   trigger: users/{uid}/activitiesRaw/{rawId}         │    │
│  │   action: call Gemini 3 Flash → parse → write to     │    │
│  │           users/{uid}/activities/{id}                 │    │
│  │           update dailyStats                           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ onCorrectionCreate                                   │    │
│  │   trigger: users/{uid}/corrections/{id}              │    │
│  │   action: update activity, store correction as       │    │
│  │           few-shot example for future categorization  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  CALLABLE FUNCTIONS (client-invoked):                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ parseActivityPreview                                 │    │
│  │   input: { text: string }                            │    │
│  │   output: { parsed: Activity, confidence: number }   │    │
│  │   model: Gemini 3 Flash                              │    │
│  │   purpose: Show parsed preview before user confirms  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ getChatResponse                                      │    │
│  │   input: { sessionId, message, isDeepResearch }      │    │
│  │   output: { response, charts? }                      │    │
│  │   model: Gemini 3.1 Pro                              │    │
│  │   purpose: AI chat Q&A and deep research             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ getSuggestion                                        │    │
│  │   input: { timezone, currentTime }                   │    │
│  │   output: { suggestion: Suggestion }                 │    │
│  │   model: Gemini 3 Flash                              │    │
│  │   purpose: Proactive suggestion on app open          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  SCHEDULED FUNCTIONS:                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ nightlyTrendCompute — runs daily at 2:00 AM user TZ │    │
│  │   action: roll up dailyStats → weeklyStats           │    │
│  │           compute streaks, trends                     │    │
│  │           detect anomalies                            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ weeklyRecap — runs Sunday 8:00 PM user TZ           │    │
│  │   action: call Gemini 3.1 Pro with weeklyStats      │    │
│  │           generate narrative recap                    │    │
│  │           store in weeklyStats.aiRecap               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ cleanupRawActivities — runs daily at 3:00 AM        │    │
│  │   action: delete activitiesRaw docs with status      │    │
│  │           "parsed" older than 24 hours               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Activity Parsing Pipeline — Detailed Flow

```
User types: "Had breakfast at 8, walked Nugget for 30min, then 2 coffees during work"
                    │
                    ▼
         ┌──────────────────┐
         │ Client: write to  │
         │ activitiesRaw     │
         │ status: "pending" │
         └────────┬─────────┘
                  │ (Firestore trigger)
                  ▼
         ┌──────────────────────────────────────────┐
         │ onActivityRawCreate                       │
         │                                           │
         │ 1. Read user's corrections (few-shot)     │
         │ 2. Read user's custom categories          │
         │ 3. Read today's activities so far          │
         │    (for time context / gap filling)        │
         │                                           │
         │ 4. Call Gemini 3 Flash:                   │
         │    System: "Parse activities from text.    │
         │    Return JSON array. Current time:        │
         │    10:30 AM, March 17, 2026. Today so far: │
         │    [woke up at 7am]. User corrections:     │
         │    [examples]. Output format: [schema]"    │
         │                                           │
         │ 5. Gemini returns:                        │
         │    [                                       │
         │      { activity: "Breakfast",              │
         │        category: "meal",                   │
         │        subCategory: "breakfast",            │
         │        timestamp: "2026-03-17T08:00:00",   │
         │        isPointInTime: true },              │
         │      { activity: "Walk with Nugget",       │
         │        category: "exercise",               │
         │        subCategory: "walk",                │
         │        timestamp: "2026-03-17T08:30:00",   │
         │        durationMinutes: 30,                │
         │        tags: ["Nugget", "outdoors"] },     │
         │      { activity: "Coffee during work",     │
         │        category: "caffeine",               │
         │        subCategory: "coffee",              │
         │        timestamp: "2026-03-17T09:00:00",   │
         │        isPointInTime: true,                │
         │        quantity: 2 }                       │
         │    ]                                       │
         │                                           │
         │ 6. Write each to activities/{id}           │
         │ 7. Update dailyStats for affected date     │
         │ 8. Set activitiesRaw status: "parsed"      │
         └───────────────────────────────────────────┘
```

### Chat Response Pipeline

```
User asks: "What's affecting my energy levels?"
                    │
                    ▼
         ┌──────────────────────────────────────────┐
         │ getChatResponse (callable function)        │
         │                                           │
         │ 1. Verify auth (automatic via callable)    │
         │ 2. Load context:                           │
         │    a. Last 30 days of dailyStats           │
         │    b. Last 7 days of raw activities        │
         │    c. Current weeklyStats (latest 4 weeks) │
         │    d. Chat session history (this session)   │
         │    e. User's preferences                   │
         │                                           │
         │ 3. Construct prompt:                       │
         │    System: "You are DayGraph, a personal   │
         │    life analyst. You have access to the    │
         │    user's complete activity history.        │
         │    Respond with specific data references.   │
         │    When relevant, include chart configs     │
         │    in your response using the chartConfig   │
         │    JSON schema."                           │
         │                                           │
         │    Context: [dailyStats + activities +     │
         │             weeklyStats as structured data] │
         │                                           │
         │    Conversation: [prior messages]           │
         │    User: "What's affecting my energy?"      │
         │                                           │
         │ 4. Call Gemini 3.1 Pro                     │
         │ 5. Parse response + extract chart configs   │
         │ 6. Store message pair in chatSession        │
         │ 7. Return response + charts to client       │
         └───────────────────────────────────────────┘
```

### Suggestion Engine Pipeline

```
User opens app at 6:45 PM on a Tuesday
                    │
                    ▼
         ┌──────────────────────────────────────────┐
         │ getSuggestion (callable function)          │
         │                                           │
         │ 1. Load context:                           │
         │    a. Today's activities so far             │
         │    b. Last 2 weeks of dailyStats            │
         │    c. Same day-of-week pattern (Tuesdays)   │
         │    d. User preferences (suggestion level)   │
         │    e. Current dismissed suggestion (if any)  │
         │                                           │
         │ 2. Call Gemini 3 Flash:                    │
         │    System: "Generate ONE proactive          │
         │    suggestion. Tone: gentle. Be specific    │
         │    to the user's patterns. If no good       │
         │    suggestion, return null. Include a        │
         │    pre-filled activity the user can          │
         │    one-tap to log."                         │
         │                                           │
         │    Context: [today's log + patterns]        │
         │    Current time: Tuesday 6:45 PM            │
         │                                           │
         │ 3. Gemini returns:                         │
         │    { text: "You usually walk Nugget around  │
         │      now — heading out soon?",              │
         │      type: "pattern",                       │
         │      suggestedActivity: {                   │
         │        activity: "Walk with Nugget",        │
         │        category: "exercise",                │
         │        subCategory: "walk",                 │
         │        tags: ["Nugget"] } }                 │
         │                                           │
         │ 4. Write to currentSuggestion doc           │
         │ 5. Return to client                         │
         └───────────────────────────────────────────┘
```

---

## 4. AI Pipeline — Gemini Integration

### Prompt Templates

#### Activity Parsing Prompt (Gemini 3 Flash)

```
SYSTEM:
You are an activity parser for a life-logging app called DayGraph.
Parse the user's natural language input into structured activity entries.

RULES:
- Current date/time: {{currentDateTime}} (timezone: {{timezone}})
- Return a JSON array of activity objects
- Each object must conform to this schema:
  {
    activity: string,        // Concise description
    category: enum,          // One of: meal, caffeine, sleep, exercise, social, work, leisure, self_care, errand, transit
    subCategory: string,     // More specific: "breakfast", "coffee", "walk", "deep_work", etc.
    timestamp: ISO string,   // When the activity happened (infer from context if relative)
    endTimestamp: ISO string | null,
    durationMinutes: number | null,
    isPointInTime: boolean,  // true for instant events (had coffee), false for duration events (worked)
    tags: string[],          // People, places, pets, notable details
    quantity: number | null  // "2 coffees" → 2
  }
- For ambiguous times, use context: "after lunch" → ~1pm, "morning" → 8-9am
- If input contains multiple activities, parse each separately
- Preserve the user's language in the activity field

{{#if corrections}}
USER CORRECTIONS (learn from these):
{{corrections}}
{{/if}}

{{#if todayActivities}}
TODAY'S ACTIVITIES SO FAR:
{{todayActivities}}
{{/if}}

USER INPUT:
"{{userInput}}"
```

#### Suggestion Prompt (Gemini 3 Flash)

```
SYSTEM:
You are DayGraph's proactive suggestion engine. Generate ONE helpful,
context-aware suggestion for the user based on their patterns.

RULES:
- Tone: {{suggestionLevel}} (gentle = casual nudge, detailed = data-backed)
- Return JSON: { text, type, suggestedActivity } or null if no good suggestion
- Types: "gentle", "informative", "pattern", "recap"
- NEVER suggest more than one thing
- Base suggestions on actual patterns, not generic advice
- If the user has already logged the obvious next activity, return null

CURRENT CONTEXT:
- Time: {{currentTime}} ({{dayOfWeek}})
- Today's activities: {{todayActivities}}
- Typical {{dayOfWeek}} pattern: {{dayOfWeekPattern}}
- Recent 2-week summary: {{recentSummary}}
- Last suggestion (if dismissed): {{lastDismissed}}
```

#### Chat / Deep Research Prompt (Gemini 3.1 Pro)

```
SYSTEM:
You are DayGraph, a personal life analyst and advisor. You have access
to the user's complete activity log and derived statistics.

YOUR CAPABILITIES:
- Answer specific questions with exact data from the user's log
- Identify correlations between activities, mood, and energy
- Generate insights backed by the user's actual patterns
- Create chart configurations when visual data would help

RESPONSE GUIDELINES:
- Always cite specific data: "You slept an average of 6.8 hours last week"
- When showing correlations, mention sample size: "Based on 23 data points..."
- Be honest about insufficient data: "You only have 5 days of mood data,
  so this correlation is preliminary"
- For chart requests, include a chartConfig JSON block:
  { type: "line"|"bar"|"scatter"|"pie",
    title: string,
    data: array,
    xKey: string,
    yKey: string,
    color: string }

USER DATA CONTEXT:
{{structuredDataContext}}

CONVERSATION HISTORY:
{{chatHistory}}
```

### Gemini Context Budget Strategy

To avoid excessive token costs, we use a tiered context approach:

```
┌─────────────────────────────────────────────────────────┐
│ CONTEXT TIERS (what data to send with each AI call)     │
│                                                          │
│ TIER 1: Activity Parsing (Gemini 3 Flash)               │
│   ~500-1000 tokens context                               │
│   • Current date/time                                    │
│   • Today's activities so far (summary)                  │
│   • User's correction history (last 20, as few-shot)     │
│   • Custom categories                                    │
│                                                          │
│ TIER 2: Suggestions (Gemini 3 Flash)                    │
│   ~1500-2500 tokens context                              │
│   • Current date/time + day of week                      │
│   • Today's full activity log                            │
│   • 2-week dailyStats summary (aggregated)               │
│   • Day-of-week historical pattern (3 prior same-days)   │
│                                                          │
│ TIER 3: Chat Q&A (Gemini 3.1 Pro)                       │
│   ~3000-8000 tokens context                              │
│   • Last 7 days raw activities                           │
│   • Last 30 days dailyStats                              │
│   • Last 4 weeks weeklyStats                             │
│   • Chat session history                                 │
│   • User preferences                                     │
│                                                          │
│ TIER 4: Deep Research (Gemini 3.1 Pro)                   │
│   ~8000-15000 tokens context                             │
│   • Last 90 days dailyStats                              │
│   • Last 30 days raw activities (full detail)            │
│   • Last 12 weeks weeklyStats                            │
│   • All corrections (for understanding preferences)      │
│   • Chat session history                                 │
│                                                          │
│ ESTIMATED MONTHLY COST (single user, active):            │
│   Parsing: ~20 calls/day × 1K tokens = 600K tokens/mo   │
│   Suggestions: ~5 calls/day × 2K tokens = 300K tokens/mo│
│   Chat: ~3 calls/day × 6K tokens = 540K tokens/mo       │
│   Deep Research: ~2 calls/week × 12K tokens = 96K/mo    │
│   Scheduled: ~38 calls/mo × 5K tokens = 190K tokens/mo  │
│                                                          │
│   Total: ~1.7M tokens/mo input                           │
│   Flash cost: ~$0.50 (parsing + suggestions)             │
│   Pro cost: ~$2-4 (chat + research + scheduled)          │
│   TOTAL: ~$3-5/month per active user                     │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Frontend Architecture

### Project Structure

```
daygraph-web/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── icons/                     # App icons
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Router + auth wrapper
│   ├── firebase.ts                # Firebase config + initialization
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Main layout with tab navigation
│   │   │   ├── TabBar.tsx         # Bottom tab bar (Today / Insights / Chat)
│   │   │   └── Header.tsx         # Top header with profile
│   │   │
│   │   ├── today/
│   │   │   ├── TodayTab.tsx       # Today tab container
│   │   │   ├── SuggestionCard.tsx # Proactive AI suggestion
│   │   │   ├── Timeline.tsx       # Visual timeline of activities
│   │   │   ├── TimelineEntry.tsx  # Single activity on timeline
│   │   │   ├── InputBar.tsx       # Text + voice input bar
│   │   │   ├── VoiceButton.tsx    # Mic button with recording state
│   │   │   ├── PresetGrid.tsx     # Quick-log preset buttons
│   │   │   ├── ParsePreview.tsx   # AI parse confirmation modal
│   │   │   └── MoodPrompt.tsx     # Mood/energy check-in
│   │   │
│   │   ├── insights/
│   │   │   ├── InsightsTab.tsx    # Insights tab container
│   │   │   ├── DailySummary.tsx   # Today's summary card
│   │   │   ├── TimeBreakdown.tsx  # Stacked bar chart
│   │   │   ├── HealthCorrelations.tsx # Scatter plots + AI narrative
│   │   │   ├── MoodEnergyChart.tsx # Line chart over time
│   │   │   ├── StreakCards.tsx     # Streak display
│   │   │   └── DateRangePicker.tsx # 7d / 30d / 90d toggle
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatTab.tsx        # Chat tab container
│   │   │   ├── ChatMessage.tsx    # Single message bubble
│   │   │   ├── ChatInput.tsx      # Chat text input
│   │   │   ├── InlineChart.tsx    # Chart rendered inside chat
│   │   │   └── DeepResearchToggle.tsx # Toggle for deep research mode
│   │   │
│   │   └── shared/
│   │       ├── Chart.tsx          # Recharts wrapper
│   │       ├── CategoryBadge.tsx  # Colored category pill
│   │       ├── EmojiPicker.tsx    # For preset customization
│   │       ├── LoadingSpinner.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts             # Firebase auth state
│   │   ├── useActivities.ts       # Real-time activities listener
│   │   ├── useDailyStats.ts       # Real-time daily stats
│   │   ├── useWeeklyStats.ts      # Weekly stats
│   │   ├── useSuggestion.ts       # Current suggestion listener
│   │   ├── useChatSession.ts      # Chat state management
│   │   ├── useVoiceInput.ts       # Web Speech API wrapper
│   │   └── usePresets.ts          # Preset management
│   │
│   ├── services/
│   │   ├── activityService.ts     # Write raw activities, confirm parsed
│   │   ├── chatService.ts         # Call chat Cloud Functions
│   │   ├── suggestionService.ts   # Fetch/dismiss suggestions
│   │   └── presetService.ts       # Manage presets
│   │
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   │
│   └── utils/
│       ├── categories.ts          # Category config (colors, icons, labels)
│       ├── dateUtils.ts           # Date formatting helpers
│       └── chartConfig.ts         # Default chart themes
│
├── firestore.rules                # Security rules
├── firestore.indexes.json         # Composite indexes
├── firebase.json                  # Firebase project config
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### Key Frontend Patterns

**Real-time listeners with optimistic UI:**
```typescript
// useActivities.ts — listens for today's activities in real-time
const useActivities = (date: string) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/activities`),
      where('timestamp', '>=', startOfDay(date)),
      where('timestamp', '<=', endOfDay(date)),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user, date]);

  return activities;
};
```

**Voice input hook:**
```typescript
// useVoiceInput.ts — wraps Web Speech API
const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = () => {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => setTranscript(e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  return { isListening, transcript, startListening, clearTranscript };
};
```

### Charting Library

**Recharts** — lightweight, React-native, works well for the chart types we need (line, bar, scatter, pie). The AI engine returns chart configs as JSON, and the `InlineChart` component renders them:

```typescript
interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'pie';
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
  color?: string;
}
```

---

## 6. UX Design — Screens & Flows

### Design Principles

1. **Speed above all** — Logging must be faster than opening Notes and typing. Target: 2 taps for a preset, <5 seconds for text, <10 seconds for voice.
2. **Calm, not gamified** — No streaks-as-guilt, no red badges, no FOMO. Warm, encouraging, insightful.
3. **Data density when wanted** — The Today tab is clean and simple. The Insights tab is dense and rich. The user controls how deep they go.
4. **One thing at a time** — One suggestion card. One mood prompt. One confirmation modal. Never stack cognitive load.

### Color & Typography System

```
PALETTE:
  Primary:      #1A73E8 (Google Blue — familiar, trustworthy)
  Background:   #FAFAFA (warm off-white)
  Surface:      #FFFFFF
  Text:         #1F2937 (near-black)
  Text-muted:   #6B7280
  Success:      #34A853
  Warning:      #FBBC04
  Accent:       #EA4335

  Category colors:
    meal:       #FF8A65 (warm orange)
    caffeine:   #8D6E63 (coffee brown)
    sleep:      #7986CB (soft indigo)
    exercise:   #66BB6A (green)
    social:     #F06292 (pink)
    work:       #42A5F5 (blue)
    leisure:    #AB47BC (purple)
    self_care:  #26C6DA (teal)
    errand:     #BDBDBD (grey)
    transit:    #FFA726 (amber)

TYPOGRAPHY:
  Headings:     DM Sans (clean, modern, geometric)
  Body:         DM Sans
  Mono/data:    JetBrains Mono (for stats and numbers)

SPACING:
  Base unit: 4px
  Component padding: 16px
  Section gap: 24px
  Screen padding: 20px (mobile) / 32px (desktop)
```

### Screen Designs

#### SCREEN 1: Login

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│            ◉  DayGraph               │
│                                      │
│       Understand your daily          │
│       rhythms with AI                │
│                                      │
│                                      │
│    ┌──────────────────────────┐      │
│    │  G  Sign in with Google  │      │
│    └──────────────────────────┘      │
│                                      │
│    Your data stays private.          │
│    Only you can see your logs.       │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

- Centered, minimal. One button. Privacy note visible on first screen.
- After auth, redirect to Today tab.
- On first login, show a brief onboarding (3 cards explaining log → insights → chat).

---

#### SCREEN 2: Today Tab

```
┌──────────────────────────────────────┐
│  DayGraph          Tue, Mar 17   👤  │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 💡 You usually walk Nugget    │    │
│  │    around now. Heading out?   │    │
│  │                               │    │
│  │  [🐕 Log walk]    [Dismiss]  │    │
│  └──────────────────────────────┘    │
│                                      │
│  TODAY'S TIMELINE                    │
│  ─────────────────                   │
│                                      │
│  7:00 ─── 💤 Woke up                │
│       │                              │
│  8:00 ─── 🍳 Breakfast               │
│       │                              │
│  8:30 ┬── 🐕 Walk with Nugget       │
│       │   30 min                     │
│  9:00 ┘                              │
│       │                              │
│  9:00 ┬── 💼 Deep work              │
│       │   3 hrs                      │
│ 12:00 ┘                              │
│       │                              │
│ 12:15 ─── ☕ Coffee                  │
│       │                              │
│ 12:30 ─── 🍽️ Lunch                  │
│       │                              │
│  ░░░░░░░░ 2:00 PM - now ░░░░░░░░░   │
│  (gap — tap to fill in)              │
│                                      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ☕  🍳  🍽️  🐕  💤  🏋️  👨‍👩‍👦  + │  │
│  │ (preset quick buttons)         │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ What did you do?        🎤 ↗  │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│  [ Today ]    [ Insights ]  [ Chat ] │
└──────────────────────────────────────┘
```

**Key UX details:**

- **Suggestion card** — Sits at the top, above the timeline. ONE card only. "Log walk" button creates the activity in one tap. "Dismiss" hides it and stores dismissal (so AI doesn't re-suggest the same thing immediately).
- **Timeline** — Duration activities shown as blocks with height proportional to time. Point-in-time activities shown as single markers. Gaps highlighted with a subtle dashed pattern — tappable to fill in.
- **Preset grid** — Horizontal scroll. Most-used presets float left. The "+" button opens a customization screen. Single tap = instant log with current timestamp.
- **Input bar** — Fixed at bottom, above tab bar. Text field + mic button + send arrow. Tapping the mic activates voice recording with a pulsing animation.
- **Mood prompt** — After the 3rd activity of the day, a subtle inline card slides into the timeline: "How's your energy? 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ (skip)" — disappears after response or skip.

---

#### SCREEN 3: Parse Confirmation Modal

```
┌──────────────────────────────────────┐
│                                      │
│  ┌──────────────────────────────┐    │
│  │ AI parsed your input:        │    │
│  │                              │    │
│  │ "walked nugget, had coffee"  │    │
│  │         ↓                    │    │
│  │                              │    │
│  │ 🐕 Walk with Nugget          │    │
│  │    exercise • now • 30 min   │    │
│  │    [edit]                    │    │
│  │                              │    │
│  │ ☕ Coffee                     │    │
│  │    caffeine • now            │    │
│  │    [edit]                    │    │
│  │                              │    │
│  │ ┌──────────┐ ┌──────────┐   │    │
│  │ │ ✓ Save   │ │  Cancel  │   │    │
│  │ └──────────┘ └──────────┘   │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

- Shows parsed result BEFORE saving. User can edit any field.
- "Save" writes all entries at once. Timeline updates in real-time via Firestore listener.
- If AI confidence is high (>0.9), we could auto-save and show a brief toast "Logged: Walk with Nugget, Coffee ✓" with an undo option. This is a tuning decision — start with always-confirm, move to auto-save once trust is built.

---

#### SCREEN 4: Insights Tab

```
┌──────────────────────────────────────┐
│  Insights                        👤  │
├──────────────────────────────────────┤
│                                      │
│  [ 7d ]  [30d]  [90d]               │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ TODAY'S SUMMARY               │    │
│  │                               │    │
│  │ 😊 Mood: 4.0   ⚡ Energy: 3.5│    │
│  │ ☕ 2 coffees (your avg: 2.3)  │    │
│  │ 🏃 45 min exercise            │    │
│  │ 💤 7.2 hrs sleep last night   │    │
│  └──────────────────────────────┘    │
│                                      │
│  TIME BREAKDOWN                      │
│  ┌──────────────────────────────┐    │
│  │ ████████░░░░▓▓▓▓░░▒▒ Mon    │    │
│  │ ██████████░░▓▓░░░░▒▒ Tue    │    │
│  │ ████████░░░░░▓▓▓▓▒▒▒ Wed    │    │
│  │ ██████████░░▓▓░░░░▒▒ Thu    │    │
│  │ ████████░░░░▓▓▓▓░░▒▒ Fri    │    │
│  │ ░░░░░░░░▓▓▓▓▓▓▒▒▒▒▒ Sat    │    │
│  │ ░░░░░░░░▓▓▓▓▓▓▒▒▒▒▒ Sun    │    │
│  │                               │    │
│  │ █ Work  ░ Exercise  ▓ Social │    │
│  │ ▒ Leisure  (tap for detail)  │    │
│  └──────────────────────────────┘    │
│                                      │
│  HEALTH CORRELATIONS                 │
│  ┌──────────────────────────────┐    │
│  │ 💡 "Weeks where you exercise │    │
│  │  4+ times, your avg mood is  │    │
│  │  4.1 vs 3.2 on 1-2x weeks"  │    │
│  │                               │    │
│  │  [scatter plot: exercise      │    │
│  │   frequency vs. avg mood]     │    │
│  │                               │    │
│  │  ● ●    ●                     │    │
│  │    ●  ●   ●  ●               │    │
│  │  ●                            │    │
│  │  └──────────────────→         │    │
│  │  Exercise days/week           │    │
│  └──────────────────────────────┘    │
│                                      │
│  MOOD & ENERGY                       │
│  ┌──────────────────────────────┐    │
│  │    ╱╲    ╱╲                   │    │
│  │   ╱  ╲  ╱  ╲  ╱              │    │
│  │  ╱    ╲╱    ╲╱               │    │
│  │  Mon Tue Wed Thu Fri Sat Sun │    │
│  │  — Mood   --- Energy         │    │
│  └──────────────────────────────┘    │
│                                      │
│  STREAKS                             │
│  🐕 Nugget walks: 12 days 🔥        │
│  🏋️ Workouts: 5 days                │
│  📝 Logging: 26 of 30 days          │
│                                      │
├──────────────────────────────────────┤
│  [ Today ]    [ Insights ]  [ Chat ] │
└──────────────────────────────────────┘
```

**Key UX details:**

- **Date range toggle** — 7d / 30d / 90d. All charts respond to this toggle. Default: 7d.
- **Today's Summary** — Quick glance at today vs. average. Shows only if today has 3+ activities logged.
- **Time Breakdown** — Stacked horizontal bar chart, one bar per day. Color-coded by category. Tapping a bar shows that day's detail.
- **Health Correlations** — AI-generated narrative insight + supporting chart. This is the "aha moment" card. Refreshed nightly. Shows different correlations on different visits (rotate through: sleep/energy, caffeine/sleep, exercise/mood).
- **Mood & Energy** — Dual line chart. Only shows if user has enough mood/energy data points (≥5 in the selected range).
- **Streaks** — Simple, non-judgmental. No "you broke your streak!" messaging. Just current counts.

---

#### SCREEN 5: Chat Tab

```
┌──────────────────────────────────────┐
│  Chat with DayGraph              👤  │
├──────────────────────────────────────┤
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🤖 Hi! I'm DayGraph. Ask me  │    │
│  │ anything about your daily     │    │
│  │ patterns, or try:             │    │
│  │                               │    │
│  │ • "How did I sleep this week?"│    │
│  │ • "What affects my energy?"   │    │
│  │ • "Show my caffeine trend"    │    │
│  └──────────────────────────────┘    │
│                                      │
│                           ┌────────┐ │
│                           │How much│ │
│                           │did I   │ │
│                           │sleep   │ │
│                           │last    │ │
│                           │week?   │ │
│                           └────────┘ │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🤖 Last week you averaged     │    │
│  │ 6.8 hours of sleep per night.│    │
│  │                               │    │
│  │ Your best night was Thursday  │    │
│  │ (8.1 hrs) and worst was       │    │
│  │ Saturday (5.5 hrs).           │    │
│  │                               │    │
│  │  ┌──────────────────────┐     │    │
│  │  │ 8h ─  ╱╲              │    │    │
│  │  │ 7h ─╱   ╲   ╱        │    │    │
│  │  │ 6h ─      ╲╱  ╲      │    │    │
│  │  │ 5h ─           ╲     │    │    │
│  │  │     M  T  W  T  F S S│    │    │
│  │  └──────────────────────┘     │    │
│  │                               │    │
│  │ Your Saturday sleep was after │    │
│  │ a late coffee at 4pm. On days │    │
│  │ you skip afternoon caffeine,  │    │
│  │ you sleep ~50min longer.      │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Ask about your data...  🔬 ↗  │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│  [ Today ]    [ Insights ]  [ Chat ] │
└──────────────────────────────────────┘
```

**Key UX details:**

- **Welcome message** — Shows suggested questions on first visit. These rotate based on available data.
- **Inline charts** — AI responses can include chart configs that render inline as interactive Recharts components.
- **Deep Research toggle** — The 🔬 icon next to the input bar. When active, the AI takes longer but produces deeper analysis. Visual indicator: a subtle "researching..." animation with progress steps.
- **Chat history** — Scrollable within a session. New sessions start fresh. Session list accessible via a menu.

---

### User Flows

#### Flow 1: First-Time Onboarding

```
Login → Welcome Cards (3 swipeable):
  1. "Log your day effortlessly" (screenshot of input bar)
  2. "See patterns emerge" (screenshot of insights)
  3. "Ask your AI advisor anything" (screenshot of chat)
→ "Set up your quick buttons" (customize presets)
→ Today Tab (empty state: "Log your first activity!")
```

#### Flow 2: Quick Preset Log

```
Tap ☕ preset → Activity appears on timeline instantly
  → Toast: "☕ Coffee logged at 3:15 PM"
  → After 3rd log today: mood/energy prompt slides in
```

#### Flow 3: Text Input Log

```
Type "walked nugget for 30 min" → Send
  → ParsePreview modal appears:
    "🐕 Walk with Nugget — exercise — 30 min — now"
  → Tap "Save"
  → Timeline updates via Firestore listener
```

#### Flow 4: Voice Log

```
Tap 🎤 → Pulsing mic animation
  → Speak: "Had lunch at 12, then worked until 5"
  → Transcript appears in input bar
  → Auto-send on silence (or tap send)
  → ParsePreview shows two entries:
    "🍽️ Lunch — 12:00 PM"
    "💼 Work — 12:30 PM to 5:00 PM — 4.5 hrs"
  → Tap "Save"
```

#### Flow 5: Correct AI Categorization

```
See "💼 Walk with Nugget" on timeline (wrong category)
  → Tap entry → Edit modal
  → Change category: exercise
  → Save → Correction stored → AI learns for next time
```

---

## 7. Security & Privacy

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User document — owner only
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      // All sub-collections inherit the uid check
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Security Checklist

- **API keys** — Gemini API key stored in Cloud Functions environment config (never in client code). Firebase config is client-safe by design (security rules protect data).
- **Auth enforcement** — All callable functions verify `context.auth` before proceeding. Firestore rules enforce per-user isolation.
- **Data encryption** — Firestore encrypts at rest (Google-managed keys). All traffic is HTTPS.
- **No PII in AI prompts** — We send activity data to Gemini, not email addresses or auth tokens. Gemini API data is not used for training (verify via Google's data use policy for API calls).
- **Session management** — Firebase Auth handles session tokens. Auto-refresh, auto-expire.
- **Rate limiting** — Cloud Functions have built-in concurrency limits. Add per-user rate limiting for chat (e.g., 50 messages/day) to prevent abuse and cost overruns.

---

## 8. Development Phases & Build Plan

### Phase 1: Foundation (Week 1-2)

```
GOAL: App shell + auth + basic logging

Tasks:
□ Firebase project setup (Firestore, Auth, Hosting, Functions)
□ React + Vite + Tailwind project scaffolding
□ Firebase Auth (Google OAuth) — login/logout flow
□ Firestore data model — create collections, security rules, indexes
□ AppShell + TabBar + routing (Today / Insights / Chat)
□ InputBar component (text input only, no AI parsing yet)
□ PresetGrid component (tap to log with hardcoded presets)
□ Timeline component (renders activities from Firestore listener)
□ Basic activity write (client writes directly to activities collection)

DELIVERABLE: You can log in, tap presets or type, and see activities
on a timeline. No AI yet — activities stored as-is.
```

### Phase 2: AI Parsing + Voice (Week 2-3)

```
GOAL: AI-powered input parsing + voice logging

Tasks:
□ Cloud Function: parseActivityPreview (callable)
□ Gemini 3 Flash integration — prompt template, JSON parsing
□ ParsePreview modal — show AI-parsed result, edit, confirm
□ Cloud Function: onActivityRawCreate (trigger) — background parsing
□ Voice input — Web Speech API integration (useVoiceInput hook)
□ VoiceButton component with recording state UI
□ Batch parsing — "had breakfast, walked nugget, then coffee"
□ Activity editing — tap timeline entry to edit/delete
□ Correction storage — save user corrections to Firestore

DELIVERABLE: Full AI-powered logging. Type or speak naturally,
AI parses into structured entries. Edit and correct.
```

### Phase 3: Insights Dashboard (Week 3-4)

```
GOAL: Insights tab with charts and stats

Tasks:
□ Cloud Function: onActivityCreate trigger → update dailyStats
□ dailyStats aggregation logic (category minutes, counts, mood/energy)
□ DailySummary component — today vs. average
□ TimeBreakdown component — stacked bar chart (Recharts)
□ MoodEnergyChart component — dual line chart
□ StreakCards component — current streaks
□ DateRangePicker — 7d / 30d / 90d toggle
□ Mood/Energy check-in prompt (MoodPrompt component)
□ Cloud Function: nightlyTrendCompute (scheduled) → weeklyStats

DELIVERABLE: Rich insights dashboard with real charts.
Daily/weekly stats auto-computed.
```

### Phase 4: AI Chat + Suggestions (Week 4-5)

```
GOAL: Conversational AI + proactive suggestions

Tasks:
□ Cloud Function: getChatResponse (callable) — Gemini 3.1 Pro
□ Chat context assembly (dailyStats + activities + weeklyStats)
□ ChatTab UI — message list, input, send
□ ChatMessage component — markdown rendering + inline charts
□ InlineChart component — render chart configs from AI response
□ Deep Research toggle + extended analysis flow
□ Cloud Function: getSuggestion (callable) — Gemini 3 Flash
□ SuggestionCard component — display + one-tap log + dismiss
□ Cloud Function: weeklyRecap (scheduled) — Sunday summary

DELIVERABLE: Full AI chat with data-backed responses and
inline visualizations. Proactive suggestions on app open.
```

### Phase 5: Health Correlations + Polish (Week 5-6)

```
GOAL: Flagship correlation insights + production polish

Tasks:
□ HealthCorrelations component — AI-generated narrative + chart
□ Correlation analysis Cloud Function (Gemini 3.1 Pro)
□ Preset customization UI — add/remove/reorder presets
□ PWA setup — manifest, service worker, offline shell
□ Loading states, error handling, empty states throughout
□ Onboarding flow (3 welcome cards + preset setup)
□ Mobile responsive refinement (test on real devices)
□ Performance audit — Firestore listener cleanup, bundle size
□ Privacy policy page
□ Deploy to production Firebase project

DELIVERABLE: Production-ready MVP. All 11 MVP features working.
Ready for daily dogfooding.
```

### Post-MVP Priorities

```
1. Smart Gap Detection
2. Caffeine Analytics deep-dive
3. Coaching Mode (chat-based)
4. Android native app (Firebase Android SDK)
5. Photo logging (Gemini vision)
6. Multi-user / household
```

---

*Next step: Begin Phase 1 — Firebase project setup + app scaffolding.*
