import type { AppTab } from '../../types'

const APP_TABS: AppTab[] = ['Log', 'Insights', 'Chat']

interface TabBarProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <section className="mb-4 grid grid-cols-3 border-b border-slate-200 bg-white sm:mb-6 sm:rounded-xl sm:border sm:p-2">
      {APP_TABS.map((tab) => (
        <button
          key={tab}
          className={`px-3 py-3 text-sm font-medium transition sm:rounded-lg sm:py-2 ${
            activeTab === tab
              ? 'border-b-2 border-blue-600 text-blue-700 sm:border-b-0 sm:bg-blue-600 sm:text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          onClick={() => onTabChange(tab)}
          type="button"
        >
          {tab}
        </button>
      ))}
    </section>
  )
}

export default TabBar
