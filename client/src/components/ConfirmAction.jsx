/**
 * An inline "are you sure?" step for destructive actions (delete a gig).
 * Rendered in place of the button that opened it, with the question
 * announced to screen readers.
 */
export default function ConfirmAction({ title, children, confirmLabel, busyLabel, busy, error, onConfirm, onCancel }) {
  return (
    <div className="card confirm-panel" role="alertdialog" aria-labelledby="confirm-action-title">
      <h2 id="confirm-action-title">{title}</h2>
      {children}

      <div aria-live="assertive">
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="button-row">
        <button type="button" className="button danger" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
