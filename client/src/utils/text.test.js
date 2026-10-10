import { describe, expect, it } from 'vitest';
import { decodeEntities } from './text';

describe('decodeEntities', () => {
  it('decodes every entity the API produces', () => {
    expect(decodeEntities('&amp; &lt; &gt; &quot; &#x27; &#x2F; &#x5C; &#96;')).toBe('& < > " \' / \\ `');
  });

  it('decodes in a single pass, so escaped entities stay as typed', () => {
    // The user literally typed "&lt;" - the API stored "&amp;lt;".
    expect(decodeEntities('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
  });

  it('turns an escaped script-like title back into plain characters', () => {
    expect(decodeEntities('&lt;img src=x onerror=alert(1)&gt;')).toBe('<img src=x onerror=alert(1)>');
  });

  it('leaves other entities alone and handles non-strings', () => {
    expect(decodeEntities('&copy; 2026')).toBe('&copy; 2026');
    expect(decodeEntities(undefined)).toBe('');
    expect(decodeEntities(42)).toBe('');
  });
});
