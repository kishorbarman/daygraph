interface HeaderProps {
  displayName: string
  onSignOut: () => Promise<void>
}

function Header({ displayName, onSignOut }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:mb-6 sm:rounded-xl sm:border sm:px-5">
      <div className="flex items-center gap-3">
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
      <div className="flex items-center gap-2">
        <a
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          href="/privacy.html"
          rel="noreferrer"
          target="_blank"
        >
          Privacy
        </a>
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          onClick={onSignOut}
          type="button"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export default Header
