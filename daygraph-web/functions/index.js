const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const logger = require('firebase-functions/logger')

if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

const ACTIVITY_CATEGORIES = [
  'meal',
  'caffeine',
  'sleep',
  'exercise',
  'social',
  'work',
  'leisure',
  'self_care',
  'errand',
  'transit',
]

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.1-pro'
const GEMINI_RESEARCH_MODEL = process.env.GEMINI_RESEARCH_MODEL || GEMINI_CHAT_MODEL

const CATEGORY_KEYWORDS = {
  meal: ['breakfast', 'lunch', 'dinner', 'meal', 'snack'],
  caffeine: ['coffee', 'latte', 'espresso', 'tea', 'caffeine', 'energy drink'],
  sleep: ['sleep', 'slept', 'nap', 'bed'],
  exercise: ['walk', 'run', 'workout', 'gym', 'yoga', 'hike', 'bike'],
  social: ['family', 'friend', 'call', 'date', 'meet'],
  work: ['work', 'meeting', 'deep work', 'admin', 'project'],
  leisure: ['read', 'tv', 'movie', 'game', 'hobby', 'leisure'],
  self_care: ['meditate', 'journaling', 'doctor', 'self care', 'grooming'],
  errand: ['grocery', 'groceries', 'chores', 'errand'],
  transit: ['drive', 'commute', 'travel', 'train', 'flight'],
}

function formatDateKeyInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Unable to format date key for timezone')
  }

  return `${year}-${month}-${day}`
}

function getTimezoneOffsetMs(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value || '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1')
  const day = Number(parts.find((part) => part.type === 'day')?.value || '1')
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0')
  const second = Number(parts.find((part) => part.type === 'second')?.value || '0')

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - date.getTime()
}

function zonedDateKeyStartToUtc(dateKey, timezone) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const offset = getTimezoneOffsetMs(new Date(utcGuess), timezone)
  return new Date(utcGuess - offset)
}

function addDaysToDateKey(dateKey, days) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  base.setUTCDate(base.getUTCDate() + days)
  const yyyy = base.getUTCFullYear()
  const mm = `${base.getUTCMonth() + 1}`.padStart(2, '0')
  const dd = `${base.getUTCDate()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseTimestampToDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function getUserTimezone(uid) {
  const userSnap = await db.doc(`users/${uid}`).get()
  return userSnap.exists ? userSnap.data()?.timezone || 'UTC' : 'UTC'
}

async function recomputeDailyStats(uid, timezone, dateKey) {
  const start = zonedDateKeyStartToUtc(dateKey, timezone)
  const nextStart = zonedDateKeyStartToUtc(addDaysToDateKey(dateKey, 1), timezone)
  const dailyRef = db.doc(`users/${uid}/dailyStats/${dateKey}`)
  const activitiesRef = db.collection(`users/${uid}/activities`)
  const snapshot = await activitiesRef
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('timestamp', '<', admin.firestore.Timestamp.fromDate(nextStart))
    .get()

  if (snapshot.empty) {
    await dailyRef.delete().catch(() => null)
    return
  }

  const categoryCounts = Object.fromEntries(
    ACTIVITY_CATEGORIES.map((category) => [category, 0]),
  )
  const categoryMinutes = Object.fromEntries(
    ACTIVITY_CATEGORIES.map((category) => [category, 0]),
  )

  let totalActivities = 0
  let totalMinutes = 0
  let pointInTimeCount = 0
  let moodTotal = 0
  let moodCount = 0
  let energyTotal = 0
  let energyCount = 0
  let firstActivityAt = null
  let lastActivityAt = null

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const category = ACTIVITY_CATEGORIES.includes(data.category)
      ? data.category
      : 'leisure'
    const minutes =
      typeof data.durationMinutes === 'number' && data.durationMinutes > 0
        ? Math.round(data.durationMinutes)
        : 0
    const timestamp = parseTimestampToDate(data.timestamp)

    totalActivities += 1
    totalMinutes += minutes
    categoryCounts[category] += 1
    categoryMinutes[category] += minutes

    if (data.isPointInTime === true || minutes === 0) {
      pointInTimeCount += 1
    }

    if (typeof data.mood === 'number') {
      moodTotal += data.mood
      moodCount += 1
    }

    if (typeof data.energy === 'number') {
      energyTotal += data.energy
      energyCount += 1
    }

    if (timestamp) {
      if (!firstActivityAt || timestamp < firstActivityAt) firstActivityAt = timestamp
      if (!lastActivityAt || timestamp > lastActivityAt) lastActivityAt = timestamp
    }
  })

  await dailyRef.set(
    {
      date: dateKey,
      timezone,
      totalActivities,
      totalMinutes,
      pointInTimeCount,
      categoryCounts,
      categoryMinutes,
      moodCount,
      moodAverage: moodCount > 0 ? Number((moodTotal / moodCount).toFixed(2)) : null,
      energyCount,
      energyAverage: energyCount > 0 ? Number((energyTotal / energyCount).toFixed(2)) : null,
      firstActivityAt: firstActivityAt
        ? admin.firestore.Timestamp.fromDate(firstActivityAt)
        : null,
      lastActivityAt: lastActivityAt
        ? admin.firestore.Timestamp.fromDate(lastActivityAt)
        : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

function getWeekStartDateKey(dateKey) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const dayOfWeek = utcDate.getUTCDay()
  const daysFromMonday = (dayOfWeek + 6) % 7
  return addDaysToDateKey(dateKey, -daysFromMonday)
}

async function recomputeWeeklyStatsForUser(uid, timezone, now = new Date()) {
  const todayKey = formatDateKeyInTimezone(now, timezone)
  const weekStartDate = getWeekStartDateKey(todayKey)
  const weekEndDate = addDaysToDateKey(weekStartDate, 6)
  const weeklyRef = db.doc(`users/${uid}/weeklyStats/${weekStartDate}`)

  const weekDailyDocs = await Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const date = addDaysToDateKey(weekStartDate, index)
      const snap = await db.doc(`users/${uid}/dailyStats/${date}`).get()
      return snap.exists ? snap.data() : null
    }),
  )

  const categoryCounts = Object.fromEntries(
    ACTIVITY_CATEGORIES.map((category) => [category, 0]),
  )
  const categoryMinutes = Object.fromEntries(
    ACTIVITY_CATEGORIES.map((category) => [category, 0]),
  )

  let totalActivities = 0
  let totalMinutes = 0
  let moodTotal = 0
  let moodCount = 0
  let energyTotal = 0
  let energyCount = 0
  let daysTracked = 0

  weekDailyDocs.forEach((daily) => {
    if (!daily) return

    if (typeof daily.totalActivities === 'number' && daily.totalActivities > 0) {
      daysTracked += 1
    }

    totalActivities +=
      typeof daily.totalActivities === 'number' ? daily.totalActivities : 0
    totalMinutes += typeof daily.totalMinutes === 'number' ? daily.totalMinutes : 0
    moodTotal +=
      typeof daily.moodAverage === 'number' && typeof daily.moodCount === 'number'
        ? daily.moodAverage * daily.moodCount
        : 0
    moodCount += typeof daily.moodCount === 'number' ? daily.moodCount : 0
    energyTotal +=
      typeof daily.energyAverage === 'number' && typeof daily.energyCount === 'number'
        ? daily.energyAverage * daily.energyCount
        : 0
    energyCount += typeof daily.energyCount === 'number' ? daily.energyCount : 0

    ACTIVITY_CATEGORIES.forEach((category) => {
      const dailyCount =
        typeof daily.categoryCounts?.[category] === 'number'
          ? daily.categoryCounts[category]
          : 0
      const dailyMinutes =
        typeof daily.categoryMinutes?.[category] === 'number'
          ? daily.categoryMinutes[category]
          : 0

      categoryCounts[category] += dailyCount
      categoryMinutes[category] += dailyMinutes
    })
  })

  const streakEndKey = addDaysToDateKey(todayKey, -1)
  const oldestStreakKey = addDaysToDateKey(streakEndKey, -179)
  const streakSnapshot = await db
    .collection(`users/${uid}/dailyStats`)
    .where('date', '>=', oldestStreakKey)
    .where('date', '<=', streakEndKey)
    .orderBy('date', 'asc')
    .get()

  const activeDays = new Set(
    streakSnapshot.docs
      .map((docSnap) => docSnap.data())
      .filter((data) => typeof data.totalActivities === 'number' && data.totalActivities > 0)
      .map((data) => data.date),
  )

  let currentStreakDays = 0
  let cursor = streakEndKey
  while (activeDays.has(cursor)) {
    currentStreakDays += 1
    cursor = addDaysToDateKey(cursor, -1)
  }

  let bestStreakDays = 0
  let running = 0
  for (let i = 0; i < 180; i += 1) {
    const date = addDaysToDateKey(oldestStreakKey, i)
    if (activeDays.has(date)) {
      running += 1
      if (running > bestStreakDays) bestStreakDays = running
    } else {
      running = 0
    }
  }

  await weeklyRef.set(
    {
      weekStartDate,
      weekEndDate,
      timezone,
      totalActivities,
      totalMinutes,
      daysTracked,
      averageDailyActivities: Number((totalActivities / 7).toFixed(2)),
      averageDailyMinutes: Number((totalMinutes / 7).toFixed(2)),
      moodAverage: moodCount > 0 ? Number((moodTotal / moodCount).toFixed(2)) : null,
      energyAverage: energyCount > 0 ? Number((energyTotal / energyCount).toFixed(2)) : null,
      categoryCounts,
      categoryMinutes,
      currentStreakDays,
      bestStreakDays,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

function inferDurationMinutes(text) {
  const normalized = text.toLowerCase()
  const hourMatch = normalized.match(/(\d+)\s*(h|hr|hrs|hour|hours)/)
  if (hourMatch) return Number(hourMatch[1]) * 60

  const minuteMatch = normalized.match(/(\d+)\s*(m|min|mins|minute|minutes)/)
  if (minuteMatch) return Number(minuteMatch[1])

  return null
}

function toSubCategory(text, category) {
  const normalized = text.toLowerCase()
  if (category === 'meal') {
    if (normalized.includes('breakfast')) return 'breakfast'
    if (normalized.includes('lunch')) return 'lunch'
    if (normalized.includes('dinner')) return 'dinner'
  }
  if (category === 'caffeine' && normalized.includes('tea')) return 'tea'
  if (category === 'caffeine') return 'coffee'
  if (category === 'exercise' && normalized.includes('walk')) return 'walk'
  return 'general'
}

function buildCorrectionRules(corrections) {
  return corrections
    .map((item) => {
      const phrase = item.activityText || item.activity || item.input || item.notes || null
      const correctedCategory =
        typeof item.correctedCategory === 'string'
          ? item.correctedCategory
          : typeof item.correctedValue === 'string'
            ? item.correctedValue
            : null

      if (!phrase || !correctedCategory || !(correctedCategory in CATEGORY_KEYWORDS)) {
        return null
      }

      return {
        phrase: phrase.toLowerCase(),
        category: correctedCategory,
      }
    })
    .filter(Boolean)
}

function inferCategory(text, correctionRules = []) {
  const normalized = text.toLowerCase()

  for (const rule of correctionRules) {
    if (normalized.includes(rule.phrase)) return rule.category
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category
    }
  }

  return 'leisure'
}

function fallbackParseActivities(text, timezone, correctionRules = []) {
  const now = new Date()
  const clauses = text
    .split(/,|\band then\b|\bthen\b/i)
    .map((part) => part.trim())
    .filter(Boolean)

  if (clauses.length === 0) return []

  return clauses.map((clause) => {
    const category = inferCategory(clause, correctionRules)
    const durationMinutes = inferDurationMinutes(clause)
    const isPointInTime = durationMinutes === null

    return {
      activity: clause,
      category,
      subCategory: toSubCategory(clause, category),
      timestamp: now.toISOString(),
      endTimestamp:
        durationMinutes === null
          ? null
          : new Date(now.getTime() + durationMinutes * 60000).toISOString(),
      durationMinutes,
      isPointInTime,
      tags: [],
      quantity: null,
      timezone,
    }
  })
}

async function loadUserContext(uid) {
  const [userSnap, correctionsSnap, recentActivitiesSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.collection(`users/${uid}/corrections`).orderBy('createdAt', 'desc').limit(20).get(),
    db.collection(`users/${uid}/activities`).orderBy('timestamp', 'desc').limit(20).get(),
  ])

  const userTimezone = userSnap.exists ? userSnap.data()?.timezone || 'UTC' : 'UTC'
  const corrections = correctionsSnap.docs.map((doc) => doc.data())
  const recentActivities = recentActivitiesSnap.docs.map((doc) => {
    const data = doc.data()
    return {
      activity: data.activity || '',
      category: data.category || 'leisure',
      timestamp: data.timestamp?.toDate?.()?.toISOString?.() || null,
    }
  })

  return {
    timezone: userTimezone,
    correctionRules: buildCorrectionRules(corrections),
    recentActivities,
  }
}

function sanitizeParsedActivities(parsed, timezone) {
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item) => {
      const category = ACTIVITY_CATEGORIES.includes(item?.category)
        ? item.category
        : 'leisure'
      const activity = typeof item?.activity === 'string' ? item.activity.trim() : ''
      if (!activity) return null

      const subCategory =
        typeof item?.subCategory === 'string' && item.subCategory.trim().length > 0
          ? item.subCategory.trim()
          : toSubCategory(activity, category)

      const timestamp =
        typeof item?.timestamp === 'string' && !Number.isNaN(Date.parse(item.timestamp))
          ? new Date(item.timestamp).toISOString()
          : new Date().toISOString()

      let durationMinutes =
        typeof item?.durationMinutes === 'number' && item.durationMinutes > 0
          ? Math.round(item.durationMinutes)
          : null

      let isPointInTime = item?.isPointInTime === true || durationMinutes === null
      if (isPointInTime) durationMinutes = null

      const endTimestamp =
        durationMinutes === null
          ? null
          : new Date(new Date(timestamp).getTime() + durationMinutes * 60000).toISOString()

      const tags = Array.isArray(item?.tags)
        ? item.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
        : []

      const quantity =
        typeof item?.quantity === 'number' && item.quantity > 0
          ? Math.round(item.quantity)
          : null

      return {
        activity,
        category,
        subCategory,
        timestamp,
        endTimestamp,
        durationMinutes,
        isPointInTime,
        tags,
        quantity,
        timezone,
      }
    })
    .filter(Boolean)
}

async function parseWithGemini({ text, timezone, correctionRules, recentActivities }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const correctionsSummary = correctionRules
    .map((rule) => `${rule.phrase} => ${rule.category}`)
    .slice(0, 20)

  const recentSummary = recentActivities
    .map((item) => `${item.timestamp || 'unknown'} | ${item.activity} (${item.category})`)
    .slice(0, 20)

  const prompt = [
    'You are an activity parser for DayGraph.',
    'Parse the user input into an array of structured activity objects.',
    `Timezone: ${timezone}`,
    `Now: ${new Date().toISOString()}`,
    'Allowed categories: meal, caffeine, sleep, exercise, social, work, leisure, self_care, errand, transit.',
    'If no duration is present, use isPointInTime=true and durationMinutes=null.',
    'If input has multiple activities, split them into multiple objects.',
    'Use concise activity text preserving user wording.',
    correctionsSummary.length > 0
      ? `User correction rules:\n${correctionsSummary.join('\n')}`
      : 'User correction rules: none',
    recentSummary.length > 0
      ? `Recent activity context:\n${recentSummary.join('\n')}`
      : 'Recent activity context: none',
    `User input: ${text}`,
  ].join('\n\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                activity: { type: 'STRING' },
                category: { type: 'STRING' },
                subCategory: { type: 'STRING' },
                timestamp: { type: 'STRING' },
                durationMinutes: { type: 'NUMBER' },
                isPointInTime: { type: 'BOOLEAN' },
                tags: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                quantity: { type: 'NUMBER' },
              },
              required: ['activity', 'category', 'isPointInTime'],
            },
          },
        },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini HTTP ${response.status}: ${body}`)
  }

  const payload = await response.json()
  const textPart = payload?.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part?.text === 'string',
  )

  if (!textPart?.text) {
    throw new Error('Gemini response did not include JSON text content')
  }

  const parsed = JSON.parse(textPart.text)
  const sanitized = sanitizeParsedActivities(parsed, timezone)

  if (sanitized.length === 0) {
    throw new Error('Gemini returned empty/invalid parsed activities')
  }

  return sanitized
}

async function callGeminiJson({
  model,
  prompt,
  schema,
  temperature = 0.2,
}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini HTTP ${response.status}: ${body}`)
  }

  const payload = await response.json()
  const textPart = payload?.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part?.text === 'string',
  )

  if (!textPart?.text) {
    throw new Error('Gemini response did not include JSON text content')
  }

  return JSON.parse(textPart.text)
}

function chooseChatContextTier(message, deepResearch) {
  if (deepResearch) return 'deep'

  const normalized = message.toLowerCase()
  if (message.length < 80) return 'quick'

  if (
    normalized.includes('trend') ||
    normalized.includes('pattern') ||
    normalized.includes('week') ||
    normalized.includes('month') ||
    normalized.includes('why')
  ) {
    return 'standard'
  }

  return 'quick'
}

async function loadChatContext(uid, tier) {
  const limits = {
    quick: { activities: 12, dailyStats: 7, weeklyStats: 2 },
    standard: { activities: 30, dailyStats: 30, weeklyStats: 6 },
    deep: { activities: 60, dailyStats: 90, weeklyStats: 12 },
  }[tier]

  const [activitiesSnap, dailyStatsSnap, weeklyStatsSnap] = await Promise.all([
    db
      .collection(`users/${uid}/activities`)
      .orderBy('timestamp', 'desc')
      .limit(limits.activities)
      .get(),
    db
      .collection(`users/${uid}/dailyStats`)
      .orderBy('date', 'desc')
      .limit(limits.dailyStats)
      .get(),
    db
      .collection(`users/${uid}/weeklyStats`)
      .orderBy('weekStartDate', 'desc')
      .limit(limits.weeklyStats)
      .get(),
  ])

  return {
    activities: activitiesSnap.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        activity: data.activity || '',
        category: data.category || 'leisure',
        timestamp: data.timestamp?.toDate?.()?.toISOString?.() || null,
        durationMinutes:
          typeof data.durationMinutes === 'number' ? data.durationMinutes : null,
        mood: typeof data.mood === 'number' ? data.mood : null,
        energy: typeof data.energy === 'number' ? data.energy : null,
      }
    }),
    dailyStats: dailyStatsSnap.docs.map((docSnap) => docSnap.data()),
    weeklyStats: weeklyStatsSnap.docs.map((docSnap) => docSnap.data()),
  }
}

function buildFallbackChatResponse(message, context, tier) {
  const latestWeek = context.weeklyStats[0]
  const latestDay = context.dailyStats[0]

  const summary = []
  if (latestDay) {
    summary.push(
      `Today you logged ${latestDay.totalActivities || 0} items and ${latestDay.totalMinutes || 0} active minutes.`,
    )
  }
  if (latestWeek) {
    summary.push(
      `This week is at ${latestWeek.totalActivities || 0} logs with a current streak of ${latestWeek.currentStreakDays || 0} days.`,
    )
  }

  return {
    answer: [
      `You asked: "${message}"`,
      summary.join(' '),
      'I could not reach AI right now, but your latest tracked stats are shown above.',
    ]
      .filter(Boolean)
      .join('\n\n'),
    chart: null,
    confidence: 'medium',
    suggestedFollowups: [
      'Show my top categories this week.',
      'How does today compare with my average?',
    ],
    groundedFrom: {
      tier,
      activities: context.activities.length,
      dailyStats: context.dailyStats.length,
      weeklyStats: context.weeklyStats.length,
      model: 'fallback',
    },
  }
}

function buildSuggestionCandidates({ todayStats, recentActivities }) {
  const suggestions = []
  const todayCount = typeof todayStats?.totalActivities === 'number' ? todayStats.totalActivities : 0
  const todayExerciseMinutes = todayStats?.categoryMinutes?.exercise || 0
  const todayMealCount = todayStats?.categoryCounts?.meal || 0
  const recentCaffeineCount = recentActivities.filter(
    (item) => item.category === 'caffeine',
  ).length

  if (todayCount < 3) {
    suggestions.push({
      id: 'complete-three-logs',
      title: 'Add one more quick log',
      reason: 'A few logs improve daily trend quality without extra effort.',
      actionText: 'Log a quick check-in',
      activityDraft: {
        activity: 'Quick check-in',
        category: 'self_care',
        subCategory: 'check_in',
        isPointInTime: true,
        durationMinutes: null,
      },
    })
  }

  if (todayExerciseMinutes < 15) {
    suggestions.push({
      id: 'short-movement',
      title: 'Take a short movement break',
      reason: 'A 10-15 minute walk can improve energy patterns later in the day.',
      actionText: 'Log a 15 min walk',
      activityDraft: {
        activity: '15 min walk',
        category: 'exercise',
        subCategory: 'walk',
        isPointInTime: false,
        durationMinutes: 15,
      },
    })
  }

  if (todayMealCount === 0) {
    suggestions.push({
      id: 'log-meal',
      title: 'Log your next meal',
      reason: 'Meal timing data often explains energy dips in the afternoon.',
      actionText: 'Log meal',
      activityDraft: {
        activity: 'Meal',
        category: 'meal',
        subCategory: 'general',
        isPointInTime: true,
        durationMinutes: null,
      },
    })
  }

  if (recentCaffeineCount >= 3) {
    suggestions.push({
      id: 'hydrate-reset',
      title: 'Hydration reset',
      reason: 'You logged several caffeinated items recently. A water break may help.',
      actionText: 'Log hydration break',
      activityDraft: {
        activity: 'Hydration break',
        category: 'self_care',
        subCategory: 'hydration',
        isPointInTime: true,
        durationMinutes: null,
      },
    })
  }

  return suggestions
}

function estimateTokenCount(text) {
  if (typeof text !== 'string' || text.length === 0) return 0
  return Math.ceil(text.length / 4)
}

function estimateCostUsd(inputTokens, outputTokens) {
  const inputCost = inputTokens * 0.0000003
  const outputCost = outputTokens * 0.0000006
  return Number((inputCost + outputCost).toFixed(6))
}

async function recordAiTelemetry(uid, payload) {
  try {
    await db.collection(`users/${uid}/aiTelemetry`).add({
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    logger.warn('recordAiTelemetry failed', {
      uid,
      error: String(error),
    })
  }
}

async function parseActivities(text, context) {
  try {
    const parsed = await parseWithGemini({
      text,
      timezone: context.timezone,
      correctionRules: context.correctionRules,
      recentActivities: context.recentActivities,
    })

    return {
      parsed,
      confidence: 0.9,
      parser: 'gemini',
    }
  } catch (error) {
    logger.warn('Gemini parsing failed, using fallback parser', {
      error: String(error),
      model: GEMINI_MODEL,
    })

    const fallback = fallbackParseActivities(
      text,
      context.timezone,
      context.correctionRules,
    )

    return {
      parsed: fallback,
      confidence: 0.6,
      parser: 'fallback',
    }
  }
}

exports.getChatResponse = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use chat.')
  }

  const message = typeof request.data?.message === 'string' ? request.data.message.trim() : ''
  const deepResearch = request.data?.deepResearch === true
  const sessionId =
    typeof request.data?.sessionId === 'string' && request.data.sessionId.trim()
      ? request.data.sessionId.trim()
      : db.collection('_').doc().id

  if (!message) {
    throw new HttpsError('invalid-argument', 'Message is required.')
  }
  if (message.length > 3000) {
    throw new HttpsError('invalid-argument', 'Message is too long.')
  }

  const startedAt = Date.now()
  const tier = chooseChatContextTier(message, deepResearch)
  const context = await loadChatContext(request.auth.uid, tier)

  try {
    const prompt = [
      'You are DayGraph assistant.',
      'Answer only using provided user data context.',
      'Be calm, practical, and non-judgmental.',
      `Context tier: ${tier}`,
      `Deep research mode: ${deepResearch ? 'on' : 'off'}`,
      `Recent activities JSON: ${JSON.stringify(context.activities)}`,
      `Daily stats JSON: ${JSON.stringify(context.dailyStats)}`,
      `Weekly stats JSON: ${JSON.stringify(context.weeklyStats)}`,
      `User message: ${message}`,
      'Return JSON with: answer (string), confidence (low|medium|high), suggestedFollowups (array string max 3), and optional chart (object or null).',
      'If including chart, chart must include type(line|bar), title, labels(string[]), and series(array of {name, values:number[]}).',
    ].join('\n\n')

    const model = deepResearch ? GEMINI_RESEARCH_MODEL : GEMINI_CHAT_MODEL
    const parsed = await callGeminiJson({
      model,
      prompt,
      temperature: deepResearch ? 0.3 : 0.2,
      schema: {
        type: 'OBJECT',
        properties: {
          answer: { type: 'STRING' },
          confidence: { type: 'STRING' },
          suggestedFollowups: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          chart: {
            type: 'OBJECT',
            nullable: true,
            properties: {
              type: { type: 'STRING' },
              title: { type: 'STRING' },
              labels: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              series: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    values: {
                      type: 'ARRAY',
                      items: { type: 'NUMBER' },
                    },
                  },
                  required: ['name', 'values'],
                },
              },
            },
          },
        },
        required: ['answer', 'confidence', 'suggestedFollowups'],
      },
    })

    const elapsedMs = Date.now() - startedAt
    const outputText = typeof parsed.answer === 'string' ? parsed.answer : ''
    const inputTokens = estimateTokenCount(prompt)
    const outputTokens = estimateTokenCount(outputText)

    await recordAiTelemetry(request.auth.uid, {
      endpoint: 'getChatResponse',
      status: 'success',
      latencyMs: elapsedMs,
      tier,
      model,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
      deepResearch,
      error: null,
    })

    return {
      sessionId,
      answer: outputText,
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence)
        ? parsed.confidence
        : 'medium',
      suggestedFollowups: Array.isArray(parsed.suggestedFollowups)
        ? parsed.suggestedFollowups.slice(0, 3).filter((item) => typeof item === 'string')
        : [],
      chart: parsed.chart && typeof parsed.chart === 'object' ? parsed.chart : null,
      groundedFrom: {
        tier,
        activities: context.activities.length,
        dailyStats: context.dailyStats.length,
        weeklyStats: context.weeklyStats.length,
        model,
      },
      latencyMs: elapsedMs,
    }
  } catch (error) {
    logger.error('getChatResponse failed, using fallback', {
      uid: request.auth.uid,
      error: String(error),
      tier,
    })

    const elapsedMs = Date.now() - startedAt
    await recordAiTelemetry(request.auth.uid, {
      endpoint: 'getChatResponse',
      status: 'fallback',
      latencyMs: elapsedMs,
      tier,
      model: 'fallback',
      inputTokens: estimateTokenCount(message),
      outputTokens: 0,
      estimatedCostUsd: 0,
      deepResearch,
      error: String(error),
    })

    const fallback = buildFallbackChatResponse(message, context, tier)
    return {
      sessionId,
      ...fallback,
      latencyMs: elapsedMs,
    }
  }
})

exports.getSuggestion = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to get suggestions.')
  }

  const uid = request.auth.uid
  const startedAt = Date.now()

  try {
    const dismissedIds = Array.isArray(request.data?.dismissedIds)
      ? request.data.dismissedIds.filter((item) => typeof item === 'string')
      : []

    const [todayStatsSnap, recentActivitiesSnap, dismissalSnap] = await Promise.all([
      db
        .collection(`users/${uid}/dailyStats`)
        .orderBy('date', 'desc')
        .limit(1)
        .get(),
      db
        .collection(`users/${uid}/activities`)
        .orderBy('timestamp', 'desc')
        .limit(24)
        .get(),
      db
        .collection(`users/${uid}/suggestionDismissals`)
        .orderBy('dismissedAt', 'desc')
        .limit(20)
        .get()
        .catch(() => null),
    ])

    const todayStats = todayStatsSnap.docs[0]?.data() || null
    const recentActivities = recentActivitiesSnap.docs.map((docSnap) => docSnap.data())
    const remotelyDismissed = dismissalSnap
      ? dismissalSnap.docs
          .map((docSnap) => docSnap.data()?.suggestionId)
          .filter((item) => typeof item === 'string')
      : []

    const dismissedSet = new Set([...dismissedIds, ...remotelyDismissed])
    const candidates = buildSuggestionCandidates({ todayStats, recentActivities })
    const nextSuggestion =
      candidates.find((candidate) => !dismissedSet.has(candidate.id)) || null

    await recordAiTelemetry(uid, {
      endpoint: 'getSuggestion',
      status: nextSuggestion ? 'success' : 'empty',
      latencyMs: Date.now() - startedAt,
      tier: 'heuristic',
      model: 'heuristic',
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      deepResearch: false,
      error: null,
    })

    return {
      suggestion: nextSuggestion,
    }
  } catch (error) {
    await recordAiTelemetry(uid, {
      endpoint: 'getSuggestion',
      status: 'error',
      latencyMs: Date.now() - startedAt,
      tier: 'heuristic',
      model: 'heuristic',
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      deepResearch: false,
      error: String(error),
    })
    throw new HttpsError('internal', 'Unable to compute suggestion right now.')
  }
})

exports.parseActivityPreview = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to parse activities.')
  }

  const text = typeof request.data?.text === 'string' ? request.data.text.trim() : ''
  if (!text) {
    throw new HttpsError('invalid-argument', 'Input text is required.')
  }

  if (text.length > 1200) {
    throw new HttpsError('invalid-argument', 'Input text is too long.')
  }

  const context = await loadUserContext(request.auth.uid)
  const result = await parseActivities(text, context)

  logger.info('parseActivityPreview', {
    uid: request.auth.uid,
    items: result.parsed.length,
    timezone: context.timezone,
    parser: result.parser,
    model: GEMINI_MODEL,
  })

  return {
    parsed: result.parsed,
    confidence: result.confidence,
    warnings: result.parsed.length === 0 ? ['No activities detected in the provided text.'] : [],
  }
})

exports.onActivityRawCreate = onDocumentCreated(
  {
    document: 'users/{uid}/activitiesRaw/{rawId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid
    const rawId = event.params.rawId
    const snapshot = event.data
    if (!snapshot) return

    const rawData = snapshot.data()
    if (!rawData || rawData.status !== 'pending') return

    const rawInput = typeof rawData.input === 'string' ? rawData.input.trim() : ''
    if (!rawInput) {
      await snapshot.ref.update({
        status: 'failed',
        errorMessage: 'Missing input text',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      return
    }

    try {
      const context = await loadUserContext(uid)
      const result = await parseActivities(rawInput, context)
      const parsed = result.parsed

      if (parsed.length === 0) {
        await snapshot.ref.update({
          status: 'failed',
          errorMessage: 'No activities parsed from input',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return
      }

      const batch = db.batch()
      const parsedIds = []
      const activitiesCollection = db.collection(`users/${uid}/activities`)

      for (const draft of parsed) {
        const ref = activitiesCollection.doc()
        parsedIds.push(ref.id)

        batch.set(ref, {
          activity: draft.activity,
          category: draft.category,
          subCategory: draft.subCategory,
          timestamp: admin.firestore.Timestamp.fromDate(new Date(draft.timestamp)),
          endTimestamp: draft.endTimestamp
            ? admin.firestore.Timestamp.fromDate(new Date(draft.endTimestamp))
            : null,
          durationMinutes: draft.durationMinutes,
          isPointInTime: draft.isPointInTime,
          tags: draft.tags,
          mood: null,
          energy: null,
          notes: rawInput,
          source: rawData.source || 'text',
          rawInput,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          editedAt: null,
        })
      }

      batch.update(snapshot.ref, {
        status: 'parsed',
        parsedActivityIds: parsedIds,
        parser: result.parser,
        parsedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await batch.commit()

      logger.info('onActivityRawCreate success', {
        uid,
        rawId,
        parsedCount: parsedIds.length,
        parser: result.parser,
      })
    } catch (error) {
      logger.error('onActivityRawCreate failed', {
        uid,
        rawId,
        error: String(error),
      })

      await snapshot.ref.update({
        status: 'failed',
        errorMessage: 'Background parsing failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  },
)

exports.onActivityWriteAggregateDaily = onDocumentWritten(
  {
    document: 'users/{uid}/activities/{activityId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid
    const timezone = await getUserTimezone(uid)
    const beforeData = event.data?.before?.data()
    const afterData = event.data?.after?.data()
    const dateKeys = new Set()

    const beforeTimestamp = parseTimestampToDate(beforeData?.timestamp)
    if (beforeTimestamp) {
      dateKeys.add(formatDateKeyInTimezone(beforeTimestamp, timezone))
    }

    const afterTimestamp = parseTimestampToDate(afterData?.timestamp)
    if (afterTimestamp) {
      dateKeys.add(formatDateKeyInTimezone(afterTimestamp, timezone))
    }

    await Promise.all(
      Array.from(dateKeys).map(async (dateKey) => {
        await recomputeDailyStats(uid, timezone, dateKey)
      }),
    )
  },
)

exports.nightlyTrendCompute = onSchedule(
  {
    schedule: 'every day 02:15',
    timeZone: 'Etc/UTC',
    region: 'us-central1',
  },
  async () => {
    const usersSnapshot = await db.collection('users').get()

    await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const uid = userDoc.id
        const timezone = userDoc.data()?.timezone || 'UTC'

        try {
          await recomputeWeeklyStatsForUser(uid, timezone)
        } catch (error) {
          logger.error('nightlyTrendCompute user failure', {
            uid,
            error: String(error),
          })
        }
      }),
    )
  },
)

exports.weeklyRecap = onSchedule(
  {
    schedule: 'every monday 03:20',
    timeZone: 'Etc/UTC',
    region: 'us-central1',
  },
  async () => {
    const usersSnapshot = await db.collection('users').get()

    await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const uid = userDoc.id
        try {
          const weeklySnap = await db
            .collection(`users/${uid}/weeklyStats`)
            .orderBy('weekStartDate', 'desc')
            .limit(1)
            .get()

          const weeklyDoc = weeklySnap.docs[0]
          if (!weeklyDoc) return

          const weeklyData = weeklyDoc.data()
          const prompt = [
            'You are DayGraph weekly recap assistant.',
            'Create a concise, calm weekly narrative.',
            `Weekly stats JSON: ${JSON.stringify(weeklyData)}`,
            'Return JSON with summary (string) and highlights (array of up to 3 strings).',
          ].join('\n\n')

          let recap
          try {
            recap = await callGeminiJson({
              model: GEMINI_CHAT_MODEL,
              prompt,
              temperature: 0.3,
              schema: {
                type: 'OBJECT',
                properties: {
                  summary: { type: 'STRING' },
                  highlights: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                },
                required: ['summary', 'highlights'],
              },
            })
          } catch (error) {
            recap = {
              summary:
                `You logged ${weeklyData.totalActivities || 0} activities and ` +
                `${weeklyData.totalMinutes || 0} minutes this week.`,
              highlights: [
                `Current streak: ${weeklyData.currentStreakDays || 0} days`,
                `Best streak: ${weeklyData.bestStreakDays || 0} days`,
              ],
            }
            logger.warn('weeklyRecap using fallback text', {
              uid,
              error: String(error),
            })
          }

          await weeklyDoc.ref.set(
            {
              recap: {
                summary:
                  typeof recap.summary === 'string'
                    ? recap.summary
                    : 'Weekly recap unavailable.',
                highlights: Array.isArray(recap.highlights)
                  ? recap.highlights
                      .filter((item) => typeof item === 'string')
                      .slice(0, 3)
                  : [],
                model: GEMINI_CHAT_MODEL,
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            },
            { merge: true },
          )
        } catch (error) {
          logger.error('weeklyRecap user failure', {
            uid,
            error: String(error),
          })
        }
      }),
    )
  },
)
