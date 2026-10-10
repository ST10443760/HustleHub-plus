import { useEffect, useRef, useState } from 'react';

/**
 * Loads data with an api function and tracks loading / ready / error.
 *
 *   const { status, data, error, errorStatus, reload } = useApiData((signal) => listMyGigs(signal), 'my-gigs');
 *
 * `key` identifies the request: when it changes (or reload() is called) a
 * new request starts. Each result remembers which request it answers, so
 * "loading" is worked out during render instead of being reset inside an
 * effect, and a slow old response can never overwrite a newer one.
 */
export default function useApiData(load, key = '') {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${key}:${reloadCount}`;
  const [result, setResult] = useState({ key: null, status: 'loading', data: null, error: '', errorStatus: null });

  // Always call the latest `load` without restarting the request on every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    const thisKey = `${key}:${reloadCount}`;

    loadRef.current(controller.signal)
      .then((data) => setResult({ key: thisKey, status: 'ready', data, error: '', errorStatus: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setResult({ key: thisKey, status: 'error', data: null, error: err.message, errorStatus: err.status ?? null });
      });

    return () => controller.abort();
  }, [key, reloadCount]);

  const view =
    result.key === requestKey ? result : { status: 'loading', data: null, error: '', errorStatus: null };

  return { ...view, reload: () => setReloadCount((count) => count + 1) };
}
