interface LoadingStateProps {
  title: string
  message?: string
}

function LoadingState({ title, message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <h3 className="mb-2 text-sm font-medium text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

export default LoadingState
