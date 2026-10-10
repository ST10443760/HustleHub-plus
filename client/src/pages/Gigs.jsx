import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listGigs } from '../api/gigs';
import FormField from '../components/FormField';
import GigCard from '../components/GigCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusMessage';
import { GIG_CATEGORIES, GIGS_PAGE_SIZE, MAX_PRICE } from '../utils/constants';
import { formatCategory } from '../utils/format';
import useDebouncedValue from '../utils/useDebouncedValue';
import { validatePriceRange } from '../utils/validation';

// The filters live in the URL (?q=&category=&page=...), so a search can be
// bookmarked and the back button works. Anything invalid in the URL is
// dropped here rather than sent to the API.
function readFilters(searchParams) {
  const page = Number.parseInt(searchParams.get('page'), 10);
  const category = searchParams.get('category') || '';
  const price = (key) => {
    const raw = searchParams.get(key) || '';
    const value = Number(raw);
    return raw !== '' && Number.isFinite(value) && value >= 0 && value <= MAX_PRICE ? raw : '';
  };
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
    category: GIG_CATEGORIES.includes(category) ? category : '',
    q: (searchParams.get('q') || '').slice(0, 50),
    minPrice: price('minPrice'),
    maxPrice: price('maxPrice'),
  };
}

function toSearchParams(filters) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && !(key === 'page' && value === 1)) params[key] = String(value);
  }
  return params;
}

export default function Gigs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  // Text inputs are local and debounced; the URL only changes once typing stops.
  const [q, setQ] = useState(filters.q);
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);
  const debouncedQ = useDebouncedValue(q.trim());
  const debouncedMin = useDebouncedValue(minPrice);
  const debouncedMax = useDebouncedValue(maxPrice);
  const priceErrors = validatePriceRange(minPrice, maxPrice, MAX_PRICE);

  const [result, setResult] = useState({ status: 'loading', gigs: [], total: 0, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  function applyFilters(changes) {
    setSearchParams(toSearchParams({ ...filters, page: 1, ...changes }), { replace: true });
  }

  // Latest filters, read by the effect below without re-running it.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Push the debounced search and price range into the URL (back to page 1).
  // Runs only when what the user typed settles - not when the URL changes on
  // its own (Back button), which would otherwise be overwritten.
  useEffect(() => {
    const current = filtersRef.current;
    const rangeErrors = validatePriceRange(debouncedMin, debouncedMax, MAX_PRICE);
    if (Object.keys(rangeErrors).length > 0) return;
    if (debouncedQ === current.q && debouncedMin === current.minPrice && debouncedMax === current.maxPrice) return;
    setSearchParams(
      toSearchParams({ ...current, page: 1, q: debouncedQ, minPrice: debouncedMin, maxPrice: debouncedMax }),
      { replace: true }
    );
  }, [debouncedQ, debouncedMin, debouncedMax, setSearchParams]);

  // When the URL changes from outside (Back/Forward, a bookmarked link),
  // bring the inputs in line with it. Text the user is still typing that
  // already matches the URL (e.g. a trailing space) is left alone.
  useEffect(() => {
    setQ((typed) => (typed.trim() === filters.q ? typed : filters.q));
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
  }, [filters.q, filters.minPrice, filters.maxPrice]);

  // Load the gigs whenever the filters in the URL change.
  useEffect(() => {
    const controller = new AbortController();
    setResult((current) => ({ ...current, status: 'loading', error: '' }));

    listGigs({ ...filters, limit: GIGS_PAGE_SIZE }, controller.signal)
      .then((data) => setResult({ status: 'ready', gigs: data.gigs, total: data.total, error: '' }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setResult({ status: 'error', gigs: [], total: 0, error: err.message });
      });

    return () => controller.abort();
  }, [filters, reloadKey]);

  function clearFilters() {
    setQ('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({}, { replace: true });
  }

  function goToPage(page) {
    setSearchParams(toSearchParams({ ...filters, page }));
    window.scrollTo(0, 0);
  }

  const totalPages = Math.max(1, Math.ceil(result.total / GIGS_PAGE_SIZE));
  const hasFilters = Boolean(filters.q || filters.category || filters.minPrice || filters.maxPrice);

  return (
    <section aria-labelledby="gigs-title">
      <div className="page-header">
        <h1 id="gigs-title">Browse gigs</h1>
        <p>Find a freelancer for your next project.</p>
      </div>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <FormField
          id="gig-search"
          className="field-search"
          label="Search"
          type="search"
          placeholder="Logo, blog post, website…"
          value={q}
          maxLength={50}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="field">
          <label htmlFor="gig-category">Category</label>
          <select
            id="gig-category"
            value={filters.category}
            onChange={(e) => applyFilters({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {GIG_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
        </div>
        <FormField
          id="gig-min-price"
          label="Min price (R)"
          type="number"
          inputMode="decimal"
          min="0"
          max={MAX_PRICE}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          error={priceErrors.minPrice}
        />
        <FormField
          id="gig-max-price"
          label="Max price (R)"
          type="number"
          inputMode="decimal"
          min="0"
          max={MAX_PRICE}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          error={priceErrors.maxPrice}
        />
      </form>

      {result.status === 'loading' && <LoadingState label="Loading gigs…" />}

      {result.status === 'error' && (
        <ErrorState message={result.error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {result.status === 'ready' && result.gigs.length === 0 && (
        <EmptyState title={hasFilters ? 'No gigs match your search' : 'No gigs yet'}>
          {hasFilters ? (
            <button type="button" className="button secondary" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <p>Check back soon - freelancers are adding new gigs all the time.</p>
          )}
        </EmptyState>
      )}

      {result.status === 'ready' && result.gigs.length > 0 && (
        <>
          <p className="field-hint" aria-live="polite">
            {result.total} {result.total === 1 ? 'gig' : 'gigs'} found
          </p>
          <div className="gig-grid">
            {result.gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
          <Pagination page={filters.page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}
    </section>
  );
}
