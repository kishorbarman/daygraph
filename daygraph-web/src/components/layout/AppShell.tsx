import type { User } from 'firebase/auth'
import type { ReactNode } from 'react'
import type { AppTab } from '../../types'
import InstallAppBanner from '../shared/InstallAppBanner'
import Header from './Header'
import TabBar from './TabBar'

interface AppShellProps {
  user: User
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  onSignOut: () => Promise<void>
  onResetData: () => Promise<void>
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  children: ReactNode
}

function AppShell({
  user,
  activeTab,
  onResetData,
  onTabChange,
  onSignOut,
  onThemeToggle,
  theme,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-slate-50">
      <Header
        displayName={user.displayName ?? 'there'}
        email={user.email}
        onResetData={onResetData}
        onSignOut={onSignOut}
        onThemeToggle={onThemeToggle}
        theme={theme}
      />
      <InstallAppBanner />
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 pb-4 sm:px-6 sm:pb-8">{children}</div>
    </div>
  )
}

export default AppShell
