/**
 * A labelled input with an optional hint and an inline error.
 *
 * The error sits in an aria-live region that's always rendered, so screen
 * readers announce it as soon as it appears, and the input points at it
 * with aria-describedby / aria-invalid. Pass as="textarea" for long text.
 */
export default function FormField({ id, label, error, hint, className = '', as: Control = 'input', ...inputProps }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <Control id={id} aria-invalid={error ? 'true' : 'false'} aria-describedby={describedBy} {...inputProps} />
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      <span id={errorId} className="field-error" aria-live="polite">
        {error}
      </span>
    </div>
  );
}
