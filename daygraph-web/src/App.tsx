import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import LoadingState from './components/shared/LoadingState'
import { resetUserData } from './services/accountService'
import { auth, db } from './firebase'
import type { AppTab, UserProfileDoc } from './types'

const TodayTab = lazy(() => import('./components/today/TodayTab'))
const InsightsTab = lazy(() => import('./components/insights/InsightsTab'))
const ChatTab = lazy(() => import('./components/chat/ChatTab'))

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

  await setDoc(userRef, {
    ...newProfile,
    onboardingCompleted: false,
  })
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('Today')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
        .then(async () => {
          const userSnap = await getDoc(doc(db, `users/${nextUser.uid}`))
          const onboardingCompleted = userSnap.data()?.onboardingCompleted === true
          if (isMounted) {
            setShowOnboarding(!onboardingCompleted)
          }
        })
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

  const handleResetData = async () => {
    const isConfirmed = window.confirm(
      'This will permanently delete your logs, insights, suggestions, and chat-related data. Continue?',
    )
    if (!isConfirmed) return

    try {
      await resetUserData()
      setActiveTab('Today')
      setShowOnboarding(true)
    } catch (error) {
      console.error('Failed to reset user data:', error)
      window.alert('Unable to reset your data right now. Please try again.')
    }
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
    const withSuspense = (content: ReactNode) => (
      <Suspense
        fallback={<LoadingState message="Loading tab..." title="Please wait" />}
      >
        {content}
      </Suspense>
    )

    if (activeTab === 'Today') {
      return withSuspense(<TodayTab user={user} />)
    }

    if (activeTab === 'Insights') {
      return withSuspense(<InsightsTab user={user} />)
    }

    if (activeTab === 'Chat') {
      return withSuspense(<ChatTab user={user} />)
    }

    return null
  }

  return (
    <AppShell
      activeTab={activeTab}
      onResetData={handleResetData}
      onSignOut={handleSignOut}
      onTabChange={setActiveTab}
      user={user}
    >
      {renderActiveTab()}
      {showOnboarding ? (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          uid={user.uid}
        />
      ) : null}
    </AppShell>
  )
}

export default App
