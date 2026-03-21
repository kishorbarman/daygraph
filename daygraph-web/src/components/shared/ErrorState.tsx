interface ErrorStateProps {
  title: string
  message: string
}

function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div className="border-y border-rose-200 bg-rose-50 px-4 py-4 sm:rounded-xl sm:border">
      <h3 className="mb-2 text-sm font-medium text-rose-700">{title}</h3>
      <p className="text-sm text-rose-600">{message}</p>
    </div>
  )
}

export default ErrorState
