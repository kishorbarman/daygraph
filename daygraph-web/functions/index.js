const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
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
