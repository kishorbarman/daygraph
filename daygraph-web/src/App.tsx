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
import ChatTab from './components/chat/ChatTab'
import AppShell from './components/layout/AppShell'
import InsightsTab from './components/insights/InsightsTab'
import LoadingState from './components/shared/LoadingState'
import TodayTab from './components/today/TodayTab'
import { auth, db } from './firebase'
import type { AppTab, UserProfileDoc } from './types'

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

    if (activeTab === 'Chat') {
      return <ChatTab user={user} />
    }

    return null
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
