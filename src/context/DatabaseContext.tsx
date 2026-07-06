import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  ApiError,
  AUTH_EXPIRED_EVENT,
  type ApiObject,
  type LoginResponse,
  tokenStorage,
} from '../services/api';

export interface Passenger {
  passenger_id: number;
  passport_no: string;
  full_name: string;
  dob: string;
  gender: string;
  nationality: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface Airport {
  airport_id: number;
  iata_code: string;
  name: string;
  city: string;
  country: string;
  terminals: number;
  is_active: boolean;
}

export interface Aircraft {
  aircraft_id: number;
  registration_no: string;
  model: string;
  seat_capacity: number;
  status: 'Active' | 'Maintenance' | 'Retired';
}

export interface Staff {
  staff_id: number;
  full_name: string;
  email: string;
  role: 'Super Admin' | 'Reservation Agent' | 'Ground Staff' | 'Operations Manager' | 'Finance Officer';
  is_active: boolean;
}

export interface Flight {
  flight_id: number;
  flight_no: string;
  origin_airport_id: number;
  dest_airport_id: number;
  aircraft_id: number;
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Arrived' | 'Cancelled';
  base_fare: number;
}

export interface FlightSchedule {
  schedule_id: number;
  flight_id: number;
  dep_datetime: string;
  arr_datetime: string;
  actual_dep: string | null;
  actual_arr: string | null;
  terminal: string;
  gate: string;
}

export interface Seat {
  seat_id: number;
  flight_id: number;
  fare_class_id?: number;
  seat_number: string;
  travel_class: 'Economy' | 'Business' | 'First Class';
  status: 'Available' | 'Reserved' | 'Occupied';
}

export interface Booking {
  booking_id: number;
  passenger_id: number;
  flight_id: number;
  seat_id: number;
  staff_id: number;
  pnr: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  cancel_reason: string | null;
  created_at: string;
}

export interface Ticket {
  ticket_id: number;
  booking_id: number;
  ticket_no: string;
  travel_class: 'Economy' | 'Business' | 'First Class';
  base_fare: number;
  class_multiplier: number;
  fare_amount: number;
  issue_date: string;
  is_cancelled: boolean;
}

export interface Payment {
  payment_id: number;
  booking_id: number;
  method: 'Cash' | 'Card' | 'Bank Transfer';
  amount: number;
  status: 'Pending' | 'Completed' | 'Refunded';
  refund_amount: number | null;
  payment_date: string;
}

export interface BoardingRecord {
  boarding_id: number;
  booking_id: number;
  passenger_id: number;
  flight_id: number;
  boarded_at: string | null;
  status: 'Boarded' | 'No-Show' | 'Not Boarded';
}

export interface FlightManifestItem {
  passenger_name: string;
  passport_no: string;
  seat_number: string;
  travel_class: 'Economy' | 'Business' | 'First Class';
  ticket_no: string;
  booking_status: 'Pending' | 'Confirmed' | 'Cancelled';
  boarding_status: 'Boarded' | 'No-Show' | 'Not Boarded';
  boarded_at: string | null;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  entity: string;
  entity_id: number;
  action: string;
  role: string;
  details: string;
}

interface FareClass {
  fare_class_id: number;
  class_name: string;
  multiplier: number;
}

interface DatabaseState {
  passengers: Passenger[];
  airports: Airport[];
  aircraft: Aircraft[];
  staff: Staff[];
  flights: Flight[];
  flight_schedules: FlightSchedule[];
  seats: Seat[];
  bookings: Booking[];
  tickets: Ticket[];
  payments: Payment[];
  boarding_records: BoardingRecord[];
  audit_logs: AuditLog[];
  fare_classes: FareClass[];
  manifests: Record<number, FlightManifestItem[]>;
  api_reports: { revenue: unknown; operational: unknown };
}

type ActionResult<T extends object = object> = Promise<{ success: boolean; error?: string } & T>;

interface DatabaseContextType {
  state: DatabaseState;
  currentRole: Staff['role'];
  currentStaff: Staff | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  apiError: string | null;
  dataWarnings: string[];
  login: (email: string, password: string) => ActionResult;
  logout: () => void;
  refreshData: () => Promise<void>;
  loadReports: (dateFrom?: string, dateTo?: string) => ActionResult;
  loadFlightSeats: (flightId: number) => Promise<void>;
  loadBoarding: (flightId: number) => Promise<void>;
  loadManifest: (flightId: number) => Promise<void>;
  registerPassenger: (p: Omit<Passenger, 'passenger_id' | 'is_active'>) => ActionResult<{ id?: number }>;
  updatePassenger: (id: number, p: Partial<Passenger>) => ActionResult;
  addAirport: (a: Omit<Airport, 'airport_id' | 'is_active'>) => ActionResult;
  updateAirport: (id: number, a: Partial<Airport>) => ActionResult;
  addAircraft: (aircraft: Omit<Aircraft, 'aircraft_id'>) => ActionResult;
  updateAircraft: (id: number, aircraft: Partial<Aircraft>) => ActionResult;
  addStaff: (staff: Omit<Staff, 'staff_id' | 'is_active'> & { password: string }) => ActionResult;
  updateStaff: (id: number, staff: Partial<Pick<Staff, 'full_name' | 'role' | 'is_active'>>) => ActionResult;
  createFlight: (
    flight: Omit<Flight, 'flight_id'>,
    schedule: Omit<FlightSchedule, 'schedule_id' | 'flight_id' | 'actual_dep' | 'actual_arr'>,
  ) => ActionResult<{ id?: number }>;
  updateFlightStatus: (id: number, status: Flight['status']) => ActionResult;
  updateFlightSchedule: (flightId: number, schedule: Partial<FlightSchedule>) => ActionResult;
  createBooking: (passengerId: number, flightId: number, seatId: number) => ActionResult<{ booking?: Booking }>;
  processPayment: (bookingId: number, method: Payment['method']) => ActionResult<{ ticket?: Ticket }>;
  cancelTicket: (ticketNoOrPnr: string, reason: string) => ActionResult;
  recordBoarding: (bookingId: number, status: BoardingRecord['status']) => ActionResult;
  getFlightManifest: (flightId: number) => FlightManifestItem[];
}

const EMPTY_STATE: DatabaseState = {
  passengers: [],
  airports: [],
  aircraft: [],
  staff: [],
  flights: [],
  flight_schedules: [],
  seats: [],
  bookings: [],
  tickets: [],
  payments: [],
  boarding_records: [],
  audit_logs: [],
  fare_classes: [],
  manifests: {},
  api_reports: { revenue: null, operational: null },
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const record = (value: unknown): ApiObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as ApiObject) : {};
const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const boolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;
const list = (value: unknown, keys: string[] = []): ApiObject[] => {
  if (Array.isArray(value)) return value.map(record);
  const source = record(value);
  for (const key of ['items', ...keys]) {
    if (Array.isArray(source[key])) return (source[key] as unknown[]).map(record);
  }
  return [];
};

const roleFromApi = (value: unknown): Staff['role'] => {
  const normalized = text(value).replaceAll('_', ' ');
  const roles: Staff['role'][] = [
    'Super Admin',
    'Reservation Agent',
    'Ground Staff',
    'Operations Manager',
    'Finance Officer',
  ];
  return roles.includes(normalized as Staff['role']) ? (normalized as Staff['role']) : 'Reservation Agent';
};

const paymentMethodToApi = (value: Payment['method']) => value.replaceAll(' ', '_');
const paymentMethodFromApi = (value: unknown): Payment['method'] => {
  const normalized = text(value).replaceAll('_', ' ');
  return normalized === 'Cash' || normalized === 'Bank Transfer' ? normalized : 'Card';
};
const boardingStatusFromApi = (value: unknown): BoardingRecord['status'] => {
  const normalized = text(value).replaceAll('_', ' ').replace('No Show', 'No-Show');
  if (normalized === 'Boarded' || normalized === 'No-Show') return normalized;
  return 'Not Boarded';
};
const travelClass = (value: unknown): Seat['travel_class'] => {
  const normalized = text(value).replaceAll('_', ' ');
  if (normalized === 'Business' || normalized === 'First Class') return normalized;
  return 'Economy';
};

const mapStaff = (value: unknown): Staff => {
  const row = record(value);
  return {
    staff_id: number(row.staff_id),
    full_name: text(row.full_name),
    email: text(row.email),
    role: roleFromApi(row.role),
    is_active: boolean(row.is_active, true),
  };
};

const mapPassenger = (value: unknown): Passenger => {
  const row = record(value);
  return {
    passenger_id: number(row.passenger_id),
    passport_no: text(row.passport_no),
    full_name: text(row.full_name),
    dob: text(row.date_of_birth || row.dob),
    gender: text(row.gender),
    nationality: text(row.nationality),
    phone: text(row.phone),
    email: text(row.email),
    is_active: boolean(row.is_active, true),
  };
};

const mapAirport = (value: unknown): Airport => {
  const row = record(value);
  return {
    airport_id: number(row.airport_id),
    iata_code: text(row.iata_code),
    name: text(row.airport_name || row.name),
    city: text(row.city),
    country: text(row.country),
    terminals: number(row.terminals, 1),
    is_active: boolean(row.is_active, true),
  };
};

const mapAircraft = (value: unknown): Aircraft => {
  const row = record(value);
  return {
    aircraft_id: number(row.aircraft_id),
    registration_no: text(row.registration_no),
    model: text(row.model),
    seat_capacity: number(row.seat_capacity),
    status: (text(row.status, 'Active') as Aircraft['status']),
  };
};

const mapFlight = (value: unknown): Flight => {
  const row = record(value);
  return {
    flight_id: number(row.flight_id),
    flight_no: text(row.flight_no),
    origin_airport_id: number(row.origin_airport_id),
    dest_airport_id: number(row.dest_airport_id),
    aircraft_id: number(row.aircraft_id),
    status: text(row.status, 'Scheduled') as Flight['status'],
    base_fare: number(row.base_fare),
  };
};

const mapSchedule = (value: unknown): FlightSchedule => {
  const row = record(value);
  return {
    schedule_id: number(row.schedule_id),
    flight_id: number(row.flight_id),
    dep_datetime: text(row.dep_datetime),
    arr_datetime: text(row.arr_datetime),
    actual_dep: text(row.actual_dep) || null,
    actual_arr: text(row.actual_arr) || null,
    terminal: text(row.terminal),
    gate: text(row.gate),
  };
};

const mapFareClass = (value: unknown): FareClass => {
  const row = record(value);
  return {
    fare_class_id: number(row.fare_class_id),
    class_name: text(row.class_name),
    multiplier: number(row.multiplier, 1),
  };
};

const mapSeat = (value: unknown): Seat => {
  const row = record(value);
  return {
    seat_id: number(row.seat_id),
    flight_id: number(row.flight_id),
    fare_class_id: number(row.fare_class_id) || undefined,
    seat_number: text(row.seat_number),
    travel_class: travelClass(row.class_name || row.travel_class),
    status: text(row.status, 'Available') as Seat['status'],
  };
};

const mapBooking = (value: unknown): Booking => {
  const row = record(value);
  return {
    booking_id: number(row.booking_id),
    passenger_id: number(row.passenger_id),
    flight_id: number(row.flight_id),
    seat_id: number(row.seat_id),
    staff_id: number(row.staff_id),
    pnr: text(row.pnr),
    status: text(row.status, 'Pending') as Booking['status'],
    cancel_reason: text(row.cancel_reason) || null,
    created_at: text(row.booked_at || row.created_at),
  };
};

const mapPayment = (value: unknown): Payment => {
  const row = record(value);
  return {
    payment_id: number(row.payment_id),
    booking_id: number(row.booking_id),
    method: paymentMethodFromApi(row.method),
    amount: number(row.amount),
    status: text(row.status, 'Pending') as Payment['status'],
    refund_amount: row.refund_amount === null || row.refund_amount === undefined
      ? null
      : number(row.refund_amount),
    payment_date: text(row.payment_date),
  };
};

const mapTicket = (value: unknown, fareClasses: FareClass[]): Ticket => {
  const row = record(value);
  const fareClass = fareClasses.find(item => item.fare_class_id === number(row.fare_class_id));
  return {
    ticket_id: number(row.ticket_id),
    booking_id: number(row.booking_id),
    ticket_no: text(row.ticket_no),
    travel_class: travelClass(fareClass?.class_name || row.class_name || row.travel_class),
    base_fare: number(row.base_fare),
    class_multiplier: number(row.multiplier_snapshot || row.class_multiplier, fareClass?.multiplier || 1),
    fare_amount: number(row.final_fare || row.fare_amount),
    issue_date: text(row.issue_date),
    is_cancelled: boolean(row.is_cancelled),
  };
};

const mapBoardingRecord = (value: unknown, flightId: number, index: number): BoardingRecord => {
  const row = record(value);
  const nestedBooking = record(row.booking);
  const nestedPassenger = record(row.passenger);
  return {
    boarding_id: number(row.boarding_id, index + 1),
    booking_id: number(row.booking_id || nestedBooking.booking_id),
    passenger_id: number(row.passenger_id || nestedPassenger.passenger_id || nestedBooking.passenger_id),
    flight_id: number(row.flight_id || nestedBooking.flight_id, flightId),
    boarded_at: text(row.boarded_at) || null,
    status: boardingStatusFromApi(row.status || row.boarding_status || row.board_status),
  };
};

const mapManifestItem = (value: unknown): FlightManifestItem => {
  const row = record(value);
  const passenger = record(row.passenger);
  const booking = record(row.booking);
  const seat = record(row.seat);
  const ticket = record(row.ticket);
  return {
    passenger_name: text(row.passenger_name || row.full_name || passenger.full_name),
    passport_no: text(row.passport_no || passenger.passport_no),
    seat_number: text(row.seat_number || seat.seat_number),
    travel_class: travelClass(row.travel_class || row.class_name || seat.class_name),
    ticket_no: text(row.ticket_no || ticket.ticket_no, 'N/A (Pending Pay)'),
    booking_status: text(row.booking_status || booking.status, 'Pending') as Booking['status'],
    boarding_status: boardingStatusFromApi(row.boarding_status || row.status),
    boarded_at: text(row.boarded_at) || null,
  };
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The AeroDesk API request failed.';

const addOrReplace = <T,>(items: T[], item: T, getId: (value: T) => number) => {
  const id = getId(item);
  return items.some(value => getId(value) === id)
    ? items.map(value => (getId(value) === id ? item : value))
    : [...items, item];
};

const fulfilled = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const API_CONCURRENCY = 8;

const collectPagedRecords = async (
  fetchPage: (skip: number, limit: number) => Promise<unknown>,
  keys: string[],
): Promise<ApiObject[]> => {
  const rows: ApiObject[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetchPage(page * PAGE_SIZE, PAGE_SIZE);
    const pageRows = list(response, keys);
    rows.push(...pageRows);
    const pagination = record(record(response).pagination);
    if (pagination.has_more === false) return rows;
    if (pageRows.length < PAGE_SIZE) return rows;
  }
  throw new Error(`The API returned more than ${PAGE_SIZE * MAX_PAGES} records without pagination metadata.`);
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(API_CONCURRENCY, items.length) },
    () => worker(),
  ));
  return results;
};

const settle = async <T,>(request: () => Promise<T>): Promise<PromiseSettledResult<T>> => {
  try {
    return { status: 'fulfilled', value: await request() };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
};

const rejectedMessage = (service: string, result: PromiseSettledResult<unknown>) => {
  if (result.status !== 'rejected') return null;
  if (result.reason instanceof ApiError && [403, 404].includes(result.reason.status)) return null;
  return `${service}: ${errorMessage(result.reason)}`;
};

const userFromLogin = (response: LoginResponse): Staff => ({
  staff_id: response.staff_id,
  full_name: response.full_name,
  email: response.email,
  role: roleFromApi(response.role),
  is_active: true,
});

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DatabaseState>(EMPTY_STATE);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);

  const performRefresh = useCallback(async (signedInStaff: Staff) => {
    setIsLoading(true);
    setApiError(null);
    setDataWarnings([]);

    try {
      const baseResults = await Promise.allSettled([
        collectPagedRecords((skip, limit) => api.passengers.list({ skip, limit }), ['passengers']),
        collectPagedRecords((skip, limit) => api.airports.list({ skip, limit }), ['airports']),
        collectPagedRecords((skip, limit) => api.aircraft.list({ skip, limit }), ['aircraft']),
        collectPagedRecords((skip, limit) => api.fareClasses.list({ skip, limit }), ['fare_classes']),
        collectPagedRecords((skip, limit) => api.flights.list({ skip, limit }), ['flights']),
        collectPagedRecords((skip, limit) => api.bookings.list({ skip, limit }), ['bookings']),
        collectPagedRecords((skip, limit) => api.staff.list({ skip, limit }), ['staff']),
        api.reports.revenue(),
        api.reports.operational(),
        collectPagedRecords((skip, limit) => api.flights.listSchedules({ skip, limit }), ['schedules']),
        collectPagedRecords((skip, limit) => api.bookings.listPayments({ skip, limit }), ['payments']),
        collectPagedRecords((skip, limit) => api.bookings.listTickets({ skip, limit }), ['tickets']),
      ] as const);

      const unauthorized = baseResults.find(
        result => result.status === 'rejected' && result.reason instanceof ApiError && result.reason.status === 401,
      );
      if (unauthorized) throw unauthorized.status === 'rejected' ? unauthorized.reason : unauthorized;

      const passengers = fulfilled(baseResults[0], []).map(mapPassenger);
      const airports = fulfilled(baseResults[1], []).map(mapAirport);
      const aircraft = fulfilled(baseResults[2], []).map(mapAircraft);
      const fareClasses = fulfilled(baseResults[3], []).map(mapFareClass);
      const flights = fulfilled(baseResults[4], []).map(mapFlight);
      const bookings = fulfilled(baseResults[5], []).map(mapBooking);
      const serverStaff = fulfilled(baseResults[6], []).map(mapStaff);
      const staff = serverStaff.some(item => item.staff_id === signedInStaff.staff_id)
        ? serverStaff
        : [...serverStaff, signedInStaff];

      const schedules = fulfilled(baseResults[9], []).map(mapSchedule);
      const payments = fulfilled(baseResults[10], []).map(mapPayment);
      const tickets = fulfilled(baseResults[11], []).map(value => mapTicket(value, fareClasses));

      const bookedFlightIds = [...new Set(bookings.map(booking => booking.flight_id))];
      const seatResults = await mapWithConcurrency(
        bookedFlightIds,
        flightId => settle(() => api.bookings.seats(flightId)),
      );
      const seats = seatResults.flatMap(result =>
        result.status === 'fulfilled' ? list(result.value, ['seats']).map(mapSeat) : [],
      );

      setState({
        ...EMPTY_STATE,
        passengers,
        airports,
        aircraft,
        staff,
        flights,
        flight_schedules: schedules,
        seats,
        bookings,
        fare_classes: fareClasses,
        payments,
        tickets,
        api_reports: {
          revenue: fulfilled(baseResults[7], null),
          operational: fulfilled(baseResults[8], null),
        },
      });

      const baseServiceNames = [
        'Passengers',
        'Airports',
        'Aircraft',
        'Fare classes',
        'Flights',
        'Bookings',
        'Staff',
        'Revenue report',
        'Operational report',
        'Flight schedules',
        'Payments',
        'Tickets',
      ];
      const warnings = baseResults
        .map((result, index) => rejectedMessage(baseServiceNames[index], result))
        .filter((warning): warning is string => Boolean(warning));
      const seatFailureCount = seatResults.filter(result => result.status === 'rejected').length;
      if (seatFailureCount) warnings.push(`${seatFailureCount} seat availability request(s) failed.`);
      setDataWarnings(warnings);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        tokenStorage.clear();
        setCurrentStaff(null);
        setState(EMPTY_STATE);
        setDataWarnings([]);
      }
      setApiError(errorMessage(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      if (!tokenStorage.get()) {
        try {
          const refreshed = await api.auth.refresh();
          tokenStorage.set(refreshed.access_token);
        } catch {
          setIsInitializing(false);
          return;
        }
      }
      try {
        const staff = mapStaff(await api.auth.me());
        setCurrentStaff(staff);
        await performRefresh(staff);
      } catch {
        tokenStorage.clear();
        setCurrentStaff(null);
      } finally {
        setIsInitializing(false);
      }
    };
    void restoreSession();
  }, [performRefresh]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setCurrentStaff(null);
      setState(EMPTY_STATE);
      setDataWarnings([]);
      setApiError('Your session expired. Please sign in again.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  const login = async (email: string, password: string): ActionResult => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await api.auth.login(email, password);
      tokenStorage.set(response.access_token);
      const staff = userFromLogin(response);
      setCurrentStaff(staff);
      await performRefresh(staff);
      return { success: true };
    } catch (error) {
      tokenStorage.clear();
      setCurrentStaff(null);
      const message = errorMessage(error);
      setApiError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void api.auth.logout().catch(() => undefined);
    tokenStorage.clear();
    setCurrentStaff(null);
    setState(EMPTY_STATE);
    setApiError(null);
    setDataWarnings([]);
  };

  const refreshData = async () => {
    if (currentStaff) await performRefresh(currentStaff);
  };

  const loadFlightSeats = useCallback(async (flightId: number) => {
    try {
      const response = await api.bookings.seats(flightId);
      const seats = list(response, ['seats']).map(mapSeat);
      setState(previous => ({
        ...previous,
        seats: [...previous.seats.filter(seat => seat.flight_id !== flightId), ...seats],
      }));
    } catch (error) {
      setApiError(errorMessage(error));
    }
  }, []);

  const loadBoarding = useCallback(async (flightId: number) => {
    try {
      const response = await api.boarding.list(flightId);
      const records = list(response, ['boarding_records', 'boarding_list', 'passengers', 'records', 'items'])
        .map((item, index) => mapBoardingRecord(item, flightId, index));
      setState(previous => {
        const existingIds = new Set(records.map(item => item.booking_id));
        const missing = previous.bookings
          .filter(booking => booking.flight_id === flightId && booking.status === 'Confirmed')
          .filter(booking => !existingIds.has(booking.booking_id))
          .map((booking): BoardingRecord => ({
            boarding_id: -booking.booking_id,
            booking_id: booking.booking_id,
            passenger_id: booking.passenger_id,
            flight_id: booking.flight_id,
            boarded_at: null,
            status: 'Not Boarded',
          }));
        return {
          ...previous,
          boarding_records: [
            ...previous.boarding_records.filter(item => item.flight_id !== flightId),
            ...records,
            ...missing,
          ],
        };
      });
    } catch (error) {
      setApiError(errorMessage(error));
    }
  }, []);

  const loadManifest = useCallback(async (flightId: number) => {
    try {
      const response = await api.boarding.manifest(flightId);
      const manifest = list(response, ['manifest', 'passengers', 'items', 'records']).map(mapManifestItem);
      setState(previous => ({
        ...previous,
        manifests: { ...previous.manifests, [flightId]: manifest },
      }));
    } catch (error) {
      setApiError(errorMessage(error));
    }
  }, []);

  const loadReports: DatabaseContextType['loadReports'] = async (dateFrom, dateTo) => {
    try {
      const [revenue, operational] = await Promise.all([
        api.reports.revenue({ date_from: dateFrom, date_to: dateTo }),
        api.reports.operational({ date_from: dateFrom, date_to: dateTo }),
      ]);
      setState(previous => ({
        ...previous,
        api_reports: { revenue, operational },
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const registerPassenger: DatabaseContextType['registerPassenger'] = async passenger => {
    try {
      const created = mapPassenger(await api.passengers.create({
        full_name: passenger.full_name,
        date_of_birth: passenger.dob,
        gender: passenger.gender,
        nationality: passenger.nationality,
        passport_no: passenger.passport_no,
        phone: passenger.phone,
        email: passenger.email,
      }));
      setState(previous => ({ ...previous, passengers: [...previous.passengers, created] }));
      return { success: true, id: created.passenger_id };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updatePassenger: DatabaseContextType['updatePassenger'] = async (id, passenger) => {
    try {
      if (passenger.is_active === false) {
        await api.passengers.remove(id);
        setState(previous => ({
          ...previous,
          passengers: previous.passengers.map(item =>
            item.passenger_id === id ? { ...item, is_active: false } : item,
          ),
        }));
        return { success: true };
      }
      if (passenger.is_active === true) {
        return { success: false, error: 'The backend does not provide a passenger reactivation endpoint.' };
      }
      const payload: ApiObject = {};
      if (passenger.full_name !== undefined) payload.full_name = passenger.full_name;
      if (passenger.dob !== undefined) payload.date_of_birth = passenger.dob;
      if (passenger.gender !== undefined) payload.gender = passenger.gender;
      if (passenger.nationality !== undefined) payload.nationality = passenger.nationality;
      if (passenger.phone !== undefined) payload.phone = passenger.phone;
      if (passenger.email !== undefined) payload.email = passenger.email;
      const updated = mapPassenger(await api.passengers.update(id, payload));
      setState(previous => ({
        ...previous,
        passengers: addOrReplace(previous.passengers, updated, item => item.passenger_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const addAirport: DatabaseContextType['addAirport'] = async airport => {
    try {
      const created = mapAirport(await api.airports.create({
        airport_name: airport.name,
        iata_code: airport.iata_code,
        city: airport.city,
        country: airport.country,
        terminals: airport.terminals,
      }));
      setState(previous => ({ ...previous, airports: [...previous.airports, created] }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updateAirport: DatabaseContextType['updateAirport'] = async (id, airport) => {
    try {
      const payload: ApiObject = {};
      if (airport.name !== undefined) payload.airport_name = airport.name;
      if (airport.city !== undefined) payload.city = airport.city;
      if (airport.country !== undefined) payload.country = airport.country;
      if (airport.terminals !== undefined) payload.terminals = airport.terminals;
      if (airport.is_active !== undefined) payload.is_active = airport.is_active;
      const updated = mapAirport(await api.airports.update(id, payload));
      setState(previous => ({
        ...previous,
        airports: addOrReplace(previous.airports, updated, item => item.airport_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const addAircraft: DatabaseContextType['addAircraft'] = async aircraft => {
    try {
      const created = mapAircraft(await api.aircraft.create({
        registration_no: aircraft.registration_no,
        model: aircraft.model,
        seat_capacity: aircraft.seat_capacity,
        status: aircraft.status,
      }));
      setState(previous => ({ ...previous, aircraft: [...previous.aircraft, created] }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updateAircraft: DatabaseContextType['updateAircraft'] = async (id, aircraft) => {
    try {
      const payload: ApiObject = {};
      if (aircraft.model !== undefined) payload.model = aircraft.model;
      if (aircraft.seat_capacity !== undefined) payload.seat_capacity = aircraft.seat_capacity;
      if (aircraft.status !== undefined) payload.status = aircraft.status;
      const updated = mapAircraft(await api.aircraft.update(id, payload));
      setState(previous => ({
        ...previous,
        aircraft: addOrReplace(previous.aircraft, updated, item => item.aircraft_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const addStaff: DatabaseContextType['addStaff'] = async staffMember => {
    try {
      const created = mapStaff(await api.staff.create({
        full_name: staffMember.full_name,
        email: staffMember.email,
        role: staffMember.role.replaceAll(' ', '_'),
        password: staffMember.password,
      }));
      setState(previous => ({ ...previous, staff: [...previous.staff, created] }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updateStaff: DatabaseContextType['updateStaff'] = async (id, staffMember) => {
    try {
      const payload: ApiObject = {};
      if (staffMember.full_name !== undefined) payload.full_name = staffMember.full_name;
      if (staffMember.role !== undefined) payload.role = staffMember.role.replaceAll(' ', '_');
      if (staffMember.is_active !== undefined) payload.is_active = staffMember.is_active;
      const updated = mapStaff(await api.staff.update(id, payload));
      setState(previous => ({
        ...previous,
        staff: addOrReplace(previous.staff, updated, item => item.staff_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const createFlight: DatabaseContextType['createFlight'] = async (flight, schedule) => {
    try {
      const response = record(await api.flights.createWithSchedule({
        flight_no: flight.flight_no,
        origin_airport_id: flight.origin_airport_id,
        dest_airport_id: flight.dest_airport_id,
        aircraft_id: flight.aircraft_id,
        base_fare: flight.base_fare,
        dep_datetime: schedule.dep_datetime,
        arr_datetime: schedule.arr_datetime,
        terminal: schedule.terminal || null,
        gate: schedule.gate || null,
      }));
      const created = mapFlight(response.flight);
      const createdSchedule = mapSchedule(response.schedule);
      const createdSeats = list(response, ['seats']).map(mapSeat);
      setState(previous => ({
        ...previous,
        flights: [...previous.flights, created],
        flight_schedules: [...previous.flight_schedules, createdSchedule],
        seats: [...previous.seats.filter(item => item.flight_id !== created.flight_id), ...createdSeats],
      }));
      return { success: true, id: created.flight_id };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updateFlightStatus: DatabaseContextType['updateFlightStatus'] = async (id, status) => {
    try {
      const updated = mapFlight(await api.flights.update(id, { status }));
      setState(previous => ({
        ...previous,
        flights: addOrReplace(previous.flights, updated, item => item.flight_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const updateFlightSchedule: DatabaseContextType['updateFlightSchedule'] = async (flightId, schedule) => {
    try {
      const payload: ApiObject = {};
      for (const key of ['dep_datetime', 'arr_datetime', 'actual_dep', 'actual_arr', 'terminal', 'gate'] as const) {
        if (schedule[key] !== undefined) payload[key] = schedule[key];
      }
      const updated = mapSchedule(await api.flights.updateSchedule(flightId, payload));
      setState(previous => ({
        ...previous,
        flight_schedules: addOrReplace(previous.flight_schedules, updated, item => item.schedule_id),
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const createBooking: DatabaseContextType['createBooking'] = async (passengerId, flightId, seatId) => {
    try {
      const booking = mapBooking(await api.bookings.create({
        passenger_id: passengerId,
        flight_id: flightId,
        seat_id: seatId,
      }));
      const refreshedSeats = list(await api.bookings.seats(flightId), ['seats']).map(mapSeat);
      setState(previous => {
        return {
          ...previous,
          bookings: [...previous.bookings, booking],
          seats: [...previous.seats.filter(item => item.flight_id !== flightId), ...refreshedSeats],
        };
      });
      return { success: true, booking };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const processPayment: DatabaseContextType['processPayment'] = async (bookingId, method) => {
    const storageKey = `aerodesk_payment_idempotency_${bookingId}`;
    try {
      const idempotencyKey = sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, idempotencyKey);
      const response = record(await api.bookings.processPayment({
        booking_id: bookingId,
        method: paymentMethodToApi(method),
      }, idempotencyKey));
      const payment = mapPayment(response.payment || response);
      const ticket = mapTicket(response.ticket, state.fare_classes);
      const updatedBooking = mapBooking(response.booking);
      const returnedSeat = mapSeat(response.seat);
      setState(previous => ({
        ...previous,
        payments: [
          ...previous.payments.filter(item => item.booking_id !== bookingId),
          payment,
        ],
        tickets: addOrReplace(previous.tickets, ticket, item => item.ticket_id),
        bookings: addOrReplace(previous.bookings, updatedBooking, item => item.booking_id),
        seats: addOrReplace(previous.seats, returnedSeat, item => item.seat_id),
      }));
      sessionStorage.removeItem(storageKey);
      return { success: true, ticket };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const cancelTicket: DatabaseContextType['cancelTicket'] = async (ticketNoOrPnr, reason) => {
    try {
      const term = ticketNoOrPnr.trim().toUpperCase();
      let booking = state.bookings.find(item => item.pnr.toUpperCase() === term);
      if (!booking) {
        const ticket = state.tickets.find(item => item.ticket_no.toUpperCase() === term);
        booking = state.bookings.find(item => item.booking_id === ticket?.booking_id);
      }
      if (!booking) {
        try {
          booking = mapBooking(await api.bookings.getByPnr(term));
        } catch {
          const ticket = mapTicket(await api.bookings.getTicketByNumber(term), state.fare_classes);
          booking = mapBooking(await api.bookings.get(ticket.booking_id));
        }
      }
      const response = record(await api.bookings.cancel(booking.booking_id, reason));
      const updated = mapBooking(response.booking);
      const returnedSeat = response.seat ? mapSeat(response.seat) : null;
      const returnedTicket = response.ticket ? mapTicket(response.ticket, state.fare_classes) : null;
      const returnedPayment = response.payment ? mapPayment(response.payment) : null;
      setState(previous => ({
        ...previous,
        bookings: addOrReplace(previous.bookings, updated, item => item.booking_id),
        seats: returnedSeat
          ? addOrReplace(previous.seats, returnedSeat, item => item.seat_id)
          : previous.seats,
        tickets: returnedTicket
          ? addOrReplace(previous.tickets, returnedTicket, item => item.ticket_id)
          : previous.tickets,
        payments: returnedPayment
          ? addOrReplace(previous.payments, returnedPayment, item => item.payment_id)
          : previous.payments,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const recordBoarding: DatabaseContextType['recordBoarding'] = async (bookingId, status) => {
    try {
      if (status === 'Not Boarded') {
        return { success: false, error: 'The backend accepts only Boarded or No-Show records.' };
      }
      await api.boarding.record(bookingId, status === 'No-Show' ? 'No_Show' : 'Boarded');
      const booking = state.bookings.find(item => item.booking_id === bookingId);
      if (booking) await loadBoarding(booking.flight_id);
      return { success: true };
    } catch (error) {
      return { success: false, error: errorMessage(error) };
    }
  };

  const currentRole = currentStaff?.role || 'Reservation Agent';
  const contextValue: DatabaseContextType = {
    state,
    currentRole,
    currentStaff,
    isAuthenticated: Boolean(currentStaff && tokenStorage.get()),
    isInitializing,
    isLoading,
    apiError,
    dataWarnings,
    login,
    logout,
    refreshData,
    loadReports,
    loadFlightSeats,
    loadBoarding,
    loadManifest,
    registerPassenger,
    updatePassenger,
    addAirport,
    updateAirport,
    addAircraft,
    updateAircraft,
    addStaff,
    updateStaff,
    createFlight,
    updateFlightStatus,
    updateFlightSchedule,
    createBooking,
    processPayment,
    cancelTicket,
    recordBoarding,
    getFlightManifest: flightId => state.manifests[flightId] || [],
  };

  return <DatabaseContext.Provider value={contextValue}>{children}</DatabaseContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components -- provider and its hook intentionally share one context module.
export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};
