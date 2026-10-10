import { useRef, useState } from 'react';
import { GIG_CATEGORIES, MAX_PRICE } from '../utils/constants';
import { formatCategory } from '../utils/format';
import { validateGig } from '../utils/validation';
import FormField from './FormField';

export const EMPTY_GIG = { title: '', description: '', price: '', category: '', deliveryDays: '' };

function messageFor(err) {
  if (err.status === 403) return 'You can only change your own gigs.';
  if (err.status === 404) return 'This gig no longer exists.';
  return err.message;
}

/**
 * Shared by "New gig" and "Edit gig".
 *
 * initialValues must be PLAIN text (already run through decodeEntities when
 * editing). What the user typed is sent as-is and the API escapes it once,
 * so text like "Tom & Jerry's" never turns into "Tom &amp;amp; Jerry".
 * Price and delivery days are sent as real numbers.
 */
export default function GigForm({ initialValues = EMPTY_GIG, submitLabel, busyLabel, onSubmit }) {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const { errors: fieldErrors, values } = validateGig(form, { categories: GIG_CATEGORIES, maxPrice: MAX_PRICE });
    setErrors(fieldErrors);
    setFormError('');
    if (Object.keys(fieldErrors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(messageFor(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className="form card" onSubmit={handleSubmit} noValidate>
      <div aria-live="assertive">
        {formError && (
          <p className="alert error" role="alert">
            {formError}
          </p>
        )}
      </div>

      <FormField
        id="gig-title"
        label="Title"
        value={form.title}
        onChange={update('title')}
        error={errors.title}
        hint="3 to 100 characters"
        maxLength={100}
        required
      />
      <FormField
        id="gig-description"
        as="textarea"
        label="Description"
        value={form.description}
        onChange={update('description')}
        error={errors.description}
        hint="10 to 1000 characters"
        maxLength={1000}
        required
      />

      <div className="form-grid-2">
        <FormField
          id="gig-price"
          label="Price (R)"
          inputMode="decimal"
          value={form.price}
          onChange={update('price')}
          error={errors.price}
          hint="1 to 100000, up to 2 decimals"
          required
        />
        <FormField
          id="gig-delivery-days"
          label="Delivery days"
          inputMode="numeric"
          value={form.deliveryDays}
          onChange={update('deliveryDays')}
          error={errors.deliveryDays}
          hint="Whole days, 1 to 90"
          required
        />
        <div className="field">
          <label htmlFor="gig-category">Category</label>
          <select
            id="gig-category"
            value={form.category}
            onChange={update('category')}
            aria-invalid={errors.category ? 'true' : 'false'}
            aria-describedby={errors.category ? 'gig-category-error' : undefined}
            required
          >
            <option value="">Choose a category</option>
            {GIG_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
          <span id="gig-category-error" className="field-error" aria-live="polite">
            {errors.category}
          </span>
        </div>
      </div>

      <div className="button-row">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? busyLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
