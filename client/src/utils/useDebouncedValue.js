import { useEffect, useState } from 'react';

// Returns `value` once it has stopped changing for `delay` ms - used so the
// gig search doesn't send a request on every keystroke.
export default function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
