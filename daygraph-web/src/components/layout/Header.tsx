import { useState } from 'react'

interface HeaderProps {
  displayName: string
  onSignOut: () => Promise<void>
  onResetData: () => Promise<void>
}

function Header({ displayName, onSignOut, onResetData }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:mb-6 sm:rounded-xl sm:border sm:px-5">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
            onClick={() => setIsMenuOpen(true)}
            type="button"
          >
            ☰
          </button>
          <img
            alt="DayGraph logo"
            className="h-9 w-9 rounded-xl"
            src="/brand/daygraph-logo.svg"
          />
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">DayGraph</h1>
            <p className="text-sm text-slate-600">Welcome, {displayName}</p>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 transition ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <button
          aria-label="Close navigation menu"
          className={`absolute inset-0 bg-slate-900/45 transition-opacity ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white p-4 shadow-2xl transition-transform duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Navigation</p>
            <button
              aria-label="Close navigation menu"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              onClick={() => setIsMenuOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>

          <nav className="space-y-1">
            <a
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              href="/privacy.html"
              rel="noreferrer"
              target="_blank"
            >
              Privacy
            </a>
            <button
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
              onClick={() => {
                setIsMenuOpen(false)
                void onResetData()
              }}
              type="button"
            >
              Reset data
            </button>
            <button
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setIsMenuOpen(false)
                void onSignOut()
              }}
              type="button"
            >
              Sign out
            </button>
          </nav>
        </aside>
      </div>
    </>
  )
}

export default Header
