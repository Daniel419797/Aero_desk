import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiRequest, AUTH_EXPIRED_EVENT, tokenStorage } from './api';

describe('apiRequest', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends the bearer token and JSON body', async () => {
    tokenStorage.set('test-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/test', { method: 'POST', body: { value: 1 } });
    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(options.body).toBe('{"value":1}');
  });

  it('clears an expired session and emits an auth event on 401', async () => {
    tokenStorage.set('expired-token');
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Expired' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(apiRequest('/protected')).rejects.toMatchObject({ status: 401, message: 'Expired' });
    expect(tokenStorage.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });

  it('rotates the cookie-backed session and retries an expired access token once', async () => {
    tokenStorage.set('expired-token');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'refreshed-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest<{ ok: boolean }>('/protected')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'include' });
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer refreshed-token');
    expect(tokenStorage.get()).toBe('refreshed-token');
  });

  it('uses the atomic flight and schedule endpoint', async () => {
    tokenStorage.set('test-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await api.flights.createWithSchedule({ flight_no: 'AD101' });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/flights\/with-schedule$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('sends a server-authoritative payment request with an idempotency key', async () => {
    tokenStorage.set('test-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await api.bookings.processPayment(
      { booking_id: 40, method: 'Card' },
      '00000000-0000-4000-8000-000000000040',
    );

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Idempotency-Key')).toBe('00000000-0000-4000-8000-000000000040');
    expect(options.body).toBe('{"booking_id":40,"method":"Card"}');
    expect(options.body).not.toContain('amount');
  });

  it('applies the same date range to the operational report', async () => {
    tokenStorage.set('test-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await api.reports.operational({ date_from: '2026-07-01', date_to: '2026-07-03' });

    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/reports\/operational\?date_from=2026-07-01&date_to=2026-07-03$/,
    );
  });
});
