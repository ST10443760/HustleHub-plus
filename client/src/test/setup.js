import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// findBy*/waitFor give up after 1s by default, which is too tight on a busy
// machine. 4s keeps the tests stable without hiding real failures.
configure({ asyncUtilTimeout: 4000 });

// No test may reach the network: any fetch that isn't explicitly mocked
// fails loudly instead of silently calling a real server.
globalThis.fetch = vi.fn(() => Promise.reject(new Error('Unexpected network call in a test')));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});
