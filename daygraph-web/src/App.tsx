import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import LoginScreen from './components/auth/LoginScreen'
import AppShell from './components/layout/AppShell'
import InsightsTab from './components/insights/InsightsTab'
import LoadingState from './components/shared/LoadingState'
import TodayTab from './components/today/TodayTab'
import { auth, db } from './firebase'
import type { AppTab, UserProfileDoc } from './types'

const tabDescriptions: Record<AppTab, string> = {
  Today: 'Quick logging and timeline UI are next in Phase 1.',
  Insights: 'Dashboard cards and trend visualizations are planned for Phase 3.',
  Chat: 'AI assistant with deep research and charts is planned for Phase 4.',
}

async function upsertUserProfile(user: User) {
  const userRef = doc(db, `users/${user.uid}`)
  const baseProfile = {
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastActiveAt: serverTimestamp(),
  }

  const existingUser = await getDoc(userRef)

  if (existingUser.exists()) {
    await updateDoc(userRef, baseProfile)
    return
  }

  const newProfile: UserProfileDoc = {
    ...baseProfile,
    createdAt: serverTimestamp(),
  }

  await setDoc(userRef, newProfile)
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('Today')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)

      if (!nextUser) {
        if (isMounted) {
          setAuthReady(true)
        }
        return
      }

      void upsertUserProfile(nextUser)
        .catch((error) => {
          // Keep auth available even if profile upsert fails.
          console.error('Failed to sync user profile:', error)
        })
        .finally(() => {
          if (isMounted) {
            setAuthReady(true)
          }
        })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    setIsSigningIn(true)
    setAuthErrorMessage(null)
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Sign in failed:', error)
      setAuthErrorMessage('Sign in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
  }

  if (!authReady) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center bg-slate-50 sm:px-6">
        <LoadingState message="Loading DayGraph..." title="Starting up" />
      </main>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        errorMessage={authErrorMessage}
        isSigningIn={isSigningIn}
        onSignIn={handleSignIn}
      />
    )
  }

  const renderActiveTab = () => {
    if (activeTab === 'Today') {
      return <TodayTab user={user} />
    }

    if (activeTab === 'Insights') {
      return <InsightsTab user={user} />
    }

    return (
      <main className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border sm:p-5">
        <h2 className="mb-2 text-lg font-medium text-slate-900">{activeTab}</h2>
        <p className="text-sm text-slate-600">{tabDescriptions[activeTab]}</p>
      </main>
    )
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSignOut={handleSignOut}
      onTabChange={setActiveTab}
      user={user}
    >
      {renderActiveTab()}
    </AppShell>
  )
}

export default App
