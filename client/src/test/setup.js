import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// No test may reach the network: any fetch that isn't explicitly mocked
// fails loudly instead of silently calling a real server.
globalThis.fetch = vi.fn(() => Promise.reject(new Error('Unexpected network call in a test')));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});
