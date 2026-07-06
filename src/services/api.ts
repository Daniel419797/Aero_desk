export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://aerodesk-005d.onrender.com'
).replace(/\/$/, '');

const TOKEN_KEY = 'aerodesk_access_token';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 45_000);

export const AUTH_EXPIRED_EVENT = 'aerodesk:auth-expired';
let refreshPromise: Promise<string | null> | null = null;

export type QueryValue = string | number | boolean | null | undefined;
export type ApiObject = Record<string, unknown>;

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload?: unknown;

  constructor(
    status: number,
    message: string,
    payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const detail = (payload as ApiObject).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (!item || typeof item !== 'object') return String(item);
        const row = item as ApiObject;
        const location = Array.isArray(row.loc) ? row.loc.join('.') : '';
        return `${location}${location ? ': ' : ''}${String(row.msg || 'Invalid value')}`;
      })
      .join('; ');
  }
  const message = (payload as ApiObject).message;
  return typeof message === 'string' ? message : fallback;
};

const withQuery = (path: string, query?: Record<string, QueryValue>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
  query?: Record<string, QueryValue>;
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async response => {
        if (!response.ok) return null;
        const payload = await response.json() as Partial<LoginResponse>;
        if (!payload.access_token) return null;
        sessionStorage.setItem(TOKEN_KEY, payload.access_token);
        return payload.access_token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { auth = true, body, query, headers: suppliedHeaders, ...requestInit } = options;
  const headers = new Headers(suppliedHeaders);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  if (auth) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new ApiError(401, 'Please sign in to continue.');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const signal = requestInit.signal
    ? AbortSignal.any([requestInit.signal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
      ...requestInit,
      credentials: requestInit.credentials || 'include',
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    throw new ApiError(
      0,
      timedOut
        ? `The AeroDesk API did not respond within ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds.`
        : error instanceof Error
        ? `Could not reach the AeroDesk API: ${error.message}`
        : 'Could not reach the AeroDesk API.',
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (auth && response.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
        ...requestInit,
        credentials: requestInit.credentials || 'include',
        headers,
        signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = response.status === 204
    ? undefined
    : contentType.includes('application/json')
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);

  if (!response.ok) {
    if (auth && response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, getErrorMessage(payload, response.statusText), payload);
  }

  return payload as T;
};

export interface LoginResponse {
  access_token: string;
  token_type: string;
  staff_id: number;
  full_name: string;
  email: string;
  role: string;
}

export const tokenStorage = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, password },
      }),
    refresh: () => apiRequest<LoginResponse>('/auth/refresh', { method: 'POST', auth: false }),
    logout: () => apiRequest<ApiObject>('/auth/logout', { method: 'POST', auth: false }),
    me: () => apiRequest<ApiObject>('/auth/me'),
  },

  passengers: {
    list: (query?: { search?: string; skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/passengers/', { query }),
    get: (passengerId: number) => apiRequest<ApiObject>(`/passengers/${passengerId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/passengers/', { method: 'POST', body: payload }),
    update: (passengerId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/passengers/${passengerId}`, { method: 'PUT', body: payload }),
    remove: (passengerId: number) =>
      apiRequest<ApiObject>(`/passengers/${passengerId}`, { method: 'DELETE' }),
    history: (passengerId: number) =>
      apiRequest<unknown>(`/passengers/${passengerId}/history`),
  },

  airports: {
    list: (query?: {
      search?: string;
      country?: string;
      is_active?: boolean;
      skip?: number;
      limit?: number;
    }) => apiRequest<ApiObject>('/airports/', { query }),
    get: (airportId: number) => apiRequest<ApiObject>(`/airports/${airportId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/airports/', { method: 'POST', body: payload }),
    update: (airportId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/airports/${airportId}`, { method: 'PUT', body: payload }),
    remove: (airportId: number) =>
      apiRequest<ApiObject>(`/airports/${airportId}`, { method: 'DELETE' }),
  },

  aircraft: {
    list: (query?: { status?: string; skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/aircraft/', { query }),
    get: (aircraftId: number) => apiRequest<ApiObject>(`/aircraft/${aircraftId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/aircraft/', { method: 'POST', body: payload }),
    update: (aircraftId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/aircraft/${aircraftId}`, { method: 'PUT', body: payload }),
  },

  fareClasses: {
    list: (query?: { skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/fare-classes/', { query }),
    get: (fareClassId: number) => apiRequest<ApiObject>(`/fare-classes/${fareClassId}`),
  },

  staff: {
    list: (query?: { skip?: number; limit?: number }) => apiRequest<ApiObject>('/staff/', { query }),
    get: (staffId: number) => apiRequest<ApiObject>(`/staff/${staffId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/staff/', { method: 'POST', body: payload }),
    update: (staffId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/staff/${staffId}`, { method: 'PUT', body: payload }),
  },

  flights: {
    list: (query?: {
      status?: string;
      origin?: string;
      destination?: string;
      skip?: number;
      limit?: number;
    }) => apiRequest<ApiObject>('/flights/', { query }),
    get: (flightId: number) => apiRequest<ApiObject>(`/flights/${flightId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/flights/', { method: 'POST', body: payload }),
    createWithSchedule: (payload: ApiObject) =>
      apiRequest<ApiObject>('/flights/with-schedule', { method: 'POST', body: payload }),
    update: (flightId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/flights/${flightId}`, { method: 'PUT', body: payload }),
    createSchedule: (flightId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/flights/${flightId}/schedule`, { method: 'POST', body: payload }),
    getSchedule: (flightId: number) =>
      apiRequest<ApiObject>(`/flights/${flightId}/schedule`),
    listSchedules: (query?: { updated_since?: string; skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/flights/schedules', { query }),
    updateSchedule: (flightId: number, payload: ApiObject) =>
      apiRequest<ApiObject>(`/flights/${flightId}/schedule`, { method: 'PUT', body: payload }),
  },

  bookings: {
    list: (query?: {
      flight_id?: number;
      passenger_id?: number;
      status?: string;
      skip?: number;
      limit?: number;
    }) => apiRequest<ApiObject>('/bookings/', { query }),
    get: (bookingId: number) => apiRequest<ApiObject>(`/bookings/${bookingId}`),
    getByPnr: (pnr: string) => apiRequest<ApiObject>(`/bookings/pnr/${encodeURIComponent(pnr)}`),
    seats: (flightId: number) => apiRequest<ApiObject>(`/bookings/seats/${flightId}`),
    create: (payload: ApiObject) =>
      apiRequest<ApiObject>('/bookings/', { method: 'POST', body: payload }),
    cancel: (bookingId: number, cancelReason: string) =>
      apiRequest<ApiObject>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: { cancel_reason: cancelReason },
      }),
    processPayment: (payload: ApiObject, idempotencyKey: string) =>
      apiRequest<ApiObject>('/bookings/payments/', {
        method: 'POST',
        body: payload,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    getPayment: (bookingId: number) =>
      apiRequest<ApiObject>(`/bookings/payments/${bookingId}`),
    listPayments: (query?: { updated_since?: string; skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/bookings/payments', { query }),
    getTicket: (bookingId: number) =>
      apiRequest<ApiObject>(`/bookings/tickets/${bookingId}`),
    listTickets: (query?: { updated_since?: string; skip?: number; limit?: number }) =>
      apiRequest<ApiObject>('/bookings/tickets', { query }),
    getTicketByNumber: (ticketNo: string) =>
      apiRequest<ApiObject>(`/bookings/tickets/number/${encodeURIComponent(ticketNo)}`),
  },

  boarding: {
    list: (flightId: number) => apiRequest<unknown>(`/boarding/flight/${flightId}`),
    record: (bookingId: number, boardStatus: 'Boarded' | 'No_Show') =>
      apiRequest<unknown>('/boarding/record', {
        method: 'POST',
        query: { booking_id: bookingId, board_status: boardStatus },
      }),
    manifest: (flightId: number, boardingStatus?: string) =>
      apiRequest<unknown>(`/boarding/manifest/${flightId}`, {
        query: { boarding_status: boardingStatus },
      }),
  },

  reports: {
    revenue: (query?: { date_from?: string; date_to?: string }) =>
      apiRequest<unknown>('/reports/revenue', { query }),
    operational: (query?: { date_from?: string; date_to?: string }) =>
      apiRequest<unknown>('/reports/operational', { query }),
  },

  health: {
    root: () => apiRequest<unknown>('/', { auth: false }),
    check: () => apiRequest<unknown>('/health', { auth: false }),
  },
};
