import { afterEach, describe, expect, it, vi } from 'vitest';
import { readToken, saveToken } from '../utils/storage';
import { apiRequest, ApiError, GENERIC_ERROR, NETWORK_ERROR, setUnauthorizedHandler } from './client';

// A minimal stand-in for a fetch Response.
function respond(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: body === undefined ? () => Promise.reject(new SyntaxError('no json')) : () => Promise.resolve(body),
  };
}

afterEach(() => {
  setUnauthorizedHandler(null);
});

describe('apiRequest', () => {
  it('attaches the Bearer header when a token is stored, and sends JSON', async () => {
    saveToken('abc.def.ghi');
    fetch.mockResolvedValueOnce(respond(200, { success: true, data: { ok: 1 } }));

    await apiRequest('/api/bookings', { method: 'POST', body: { gigId: 'x' } });

    const [path, options] = fetch.mock.calls[0];
    expect(path).toBe('/api/bookings');
    expect(options.headers.Authorization).toBe('Bearer abc.def.ghi');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ gigId: 'x' }));
  });

  it('sends no Authorization header without a token', async () => {
    fetch.mockResolvedValueOnce(respond(200, { success: true, data: {} }));
    await apiRequest('/api/health');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('unwraps { success, data }', async () => {
    fetch.mockResolvedValueOnce(respond(200, { success: true, data: { gigs: [1, 2] } }));
    await expect(apiRequest('/api/gigs')).resolves.toEqual({ gigs: [1, 2] });
  });

  it("throws an ApiError carrying the server's error message and status", async () => {
    fetch.mockResolvedValueOnce(respond(409, { success: false, error: 'An account with this email already exists' }));
    const error = await apiRequest('/api/auth/register', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('An account with this email already exists');
  });

  it('gives a generic message on a network failure', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await apiRequest('/api/gigs').catch((e) => e);
    expect(error.status).toBe(0);
    expect(error.message).toBe(NETWORK_ERROR);
  });

  it('gives a generic message for a non-JSON error response', async () => {
    fetch.mockResolvedValueOnce(respond(400, undefined));
    await expect(apiRequest('/api/gigs')).rejects.toThrow(GENERIC_ERROR);
  });

  it("passes on the server's retry message for a 429", async () => {
    fetch.mockResolvedValueOnce(
      respond(429, { success: false, error: 'Too many requests, please try again in 42 seconds.' })
    );
    const error = await apiRequest('/api/bookings', { method: 'POST', body: {} }).catch((e) => e);
    expect(error.status).toBe(429);
    expect(error.message).toBe('Too many requests, please try again in 42 seconds.');
  });

  it('on a 401 for a logged-in call, clears the session and calls the logout handler', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    saveToken('expired.token.here');
    fetch.mockResolvedValueOnce(respond(401, { success: false, error: 'Not authenticated - invalid or expired token' }));

    await expect(apiRequest('/api/bookings/mine')).rejects.toMatchObject({ status: 401 });
    expect(readToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not log out on a 401 from the login form', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    saveToken('still.valid.token');
    fetch.mockResolvedValueOnce(respond(401, { success: false, error: 'Invalid email or password' }));

    await expect(apiRequest('/api/auth/login', { method: 'POST', body: {}, redirectOn401: false })).rejects.toThrow(
      'Invalid email or password'
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(readToken()).toBe('still.valid.token');
  });

  it('refuses absolute URLs so no API host can be hard-coded', async () => {
    await expect(apiRequest('https://evil.example/api/gigs')).rejects.toThrow(/relative/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
