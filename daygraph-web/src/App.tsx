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
type Theme = 'light' | 'dark'

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
    return existingUser.data()?.onboardingCompleted === true
  }

  const newProfile: UserProfileDoc = {
    ...baseProfile,
    createdAt: serverTimestamp(),
  }

  await setDoc(userRef, {
    ...newProfile,
    onboardingCompleted: false,
  })
  return false
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('Log')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('daygraph-theme')
    return savedTheme === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    let isMounted = true

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthReady(true)

      if (!nextUser) {
        setShowOnboarding(false)
        return
      }

      void upsertUserProfile(nextUser)
        .then((onboardingCompleted) => {
          if (!isMounted || auth.currentUser?.uid !== nextUser.uid) return
          setShowOnboarding(!onboardingCompleted)
        })
        .catch((error) => {
          // Keep auth available even if profile upsert fails.
          console.error('Failed to sync user profile:', error)
          if (!isMounted || auth.currentUser?.uid !== nextUser.uid) return
          setShowOnboarding(false)
        })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('daygraph-theme', theme)
  }, [theme])

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
      setActiveTab('Log')
      setShowOnboarding(true)
    } catch (error) {
      console.error('Failed to reset user data:', error)
      window.alert('Unable to reset your data right now. Please try again.')
    }
  }

  const handleThemeToggle = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  if (!user) {
    return (
      <LoginScreen
        errorMessage={authErrorMessage}
        isCheckingSession={!authReady}
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

    if (activeTab === 'Log') {
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
      onThemeToggle={handleThemeToggle}
      theme={theme}
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
