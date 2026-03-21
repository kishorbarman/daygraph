interface LoginScreenProps {
  onSignIn: () => Promise<void>
  isSigningIn: boolean
  errorMessage: string | null
}

function LoginScreen({ onSignIn, isSigningIn, errorMessage }: LoginScreenProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center bg-slate-50 text-center sm:px-6">
      <div className="w-full border-y border-slate-200 bg-white px-5 py-10 sm:max-w-md sm:rounded-2xl sm:border sm:p-8 sm:shadow-sm">
        <img
          alt="DayGraph logo"
          className="mx-auto mb-4 h-14 w-14 rounded-2xl"
          src="/brand/daygraph-logo.svg"
        />
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-600">
          DayGraph
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Understand your daily rhythms
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Log daily activities and turn patterns into insights with AI.
        </p>
        <button
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          disabled={isSigningIn}
          onClick={onSignIn}
          type="button"
        >
          {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {errorMessage ? (
          <p className="mt-3 text-xs text-rose-600">{errorMessage}</p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Your data remains private and scoped to your account.
        </p>
      </div>
    </main>
  )
}

export default LoginScreen
