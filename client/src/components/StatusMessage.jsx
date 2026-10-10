// Shared loading, error and empty states so every page behaves the same way.

export function LoadingState({ label = 'Loading…' }) {
  return (
    <p className="status" role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card status">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
