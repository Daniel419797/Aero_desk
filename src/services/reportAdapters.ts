type UnknownRecord = Record<string, unknown>;

export interface RevenueByFlight {
  flight_id?: number;
  flight_no: string;
  route: string;
  tickets_sold: number;
  total_revenue: number;
  average_fare: number;
}

export interface RevenueByMethod {
  method: string;
  total_revenue: number;
  payment_count: number;
}

export interface RevenueReport {
  count_label: 'Bookings' | 'Tickets issued';
  row_count_label: 'Passengers' | 'Tickets';
  average_label: 'Average revenue' | 'Average fare';
  summary: {
    total_revenue: number;
    tickets_issued: number;
    average_revenue_per_flight: number;
  };
  by_flight: RevenueByFlight[];
  by_payment_method: RevenueByMethod[];
}

export interface OperationalByFlight {
  flight_id?: number;
  flight_no: string;
  capacity: number | null;
  confirmed_passengers: number | null;
  occupancy_rate: number;
  boarded: number | null;
  no_shows: number | null;
  no_show_rate: number | null;
  on_time: boolean | null;
}

export interface OperationalReport {
  summary: {
    average_occupancy_rate: number;
    on_time_performance: number;
    no_show_rate: number | null;
  };
  by_flight: OperationalByFlight[];
}

const record = (value: unknown): UnknownRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null
);
const array = (value: unknown) => Array.isArray(value) ? value.map(record).filter(Boolean) as UnknownRecord[] : [];
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const firstDefined = (...values: unknown[]) => values.find(value => value !== undefined && value !== null);
const optionalNumber = (...values: unknown[]) => {
  const value = firstDefined(...values);
  return value === undefined ? null : number(value);
};
const text = (value: unknown) => typeof value === 'string' ? value : '';

export const parseRevenueReport = (value: unknown): RevenueReport | null => {
  const root = record(value);
  if (!root) return null;
  const summary = record(root.summary) || root;
  const byFlightRows = array(root.by_flight || root.revenue_by_flight || root.flights);
  const byMethodRows = array(root.by_payment_method || root.revenue_by_payment_method || root.payment_methods);
  const hasFlightCollection = 'by_flight' in root || 'revenue_by_flight' in root || 'flights' in root;
  const hasMethodCollection = 'by_payment_method' in root || 'revenue_by_payment_method' in root || 'payment_methods' in root;
  if (!hasFlightCollection || !hasMethodCollection) return null;

  const by_flight = byFlightRows.map(row => ({
    flight_id: row.flight_id === undefined ? undefined : number(row.flight_id),
    flight_no: text(row.flight_no),
    route: text(row.route),
    tickets_sold: number(firstDefined(row.tickets_sold, row.ticket_count, row.total_passengers)),
    total_revenue: number(firstDefined(row.total_revenue, row.revenue)),
    average_fare: number(firstDefined(row.average_fare, row.avg_fare))
      || (() => {
        const count = number(firstDefined(row.tickets_sold, row.ticket_count, row.total_passengers));
        return count ? number(firstDefined(row.total_revenue, row.revenue)) / count : 0;
      })(),
  }));
  const by_payment_method = byMethodRows.map(row => ({
    method: text(firstDefined(row.method, row.payment_method)),
    total_revenue: number(firstDefined(row.total_revenue, row.revenue, row.amount, row.total)),
    payment_count: number(firstDefined(row.payment_count, row.count)),
  }));
  const summaryRevenue = firstDefined(summary.net_revenue, summary.total_revenue);
  const totalRevenue = summaryRevenue === undefined
    ? by_flight.reduce((total, row) => total + row.total_revenue, 0)
    : number(summaryRevenue);
  const summaryTickets = firstDefined(summary.tickets_issued, summary.total_tickets, summary.total_bookings);
  const ticketsIssued = summaryTickets === undefined
    ? by_flight.reduce((total, row) => total + row.tickets_sold, 0)
    : number(summaryTickets);
  const usesPublishedContract = 'total_bookings' in summary
    || byFlightRows.some(row => 'total_passengers' in row);
  return {
    count_label: usesPublishedContract ? 'Bookings' : 'Tickets issued',
    row_count_label: usesPublishedContract ? 'Passengers' : 'Tickets',
    average_label: usesPublishedContract ? 'Average revenue' : 'Average fare',
    summary: {
      total_revenue: totalRevenue,
      tickets_issued: ticketsIssued,
      average_revenue_per_flight: number(summary.average_revenue_per_flight)
        || (by_flight.length ? totalRevenue / by_flight.length : 0),
    },
    by_flight,
    by_payment_method,
  };
};

export const parseOperationalReport = (value: unknown): OperationalReport | null => {
  const root = record(value);
  if (!root) return null;
  const summary = record(root.summary) || root;
  const rows = array(root.by_flight || root.operational_by_flight || root.flights);
  const hasFlightCollection = 'by_flight' in root || 'operational_by_flight' in root || 'flights' in root;
  if (!hasFlightCollection) return null;
  return {
    summary: {
      average_occupancy_rate: number(firstDefined(
        summary.average_occupancy_rate,
        summary.avg_occupancy_rate,
        summary.average_occupancy_percent,
      )),
      on_time_performance: number(firstDefined(
        summary.on_time_performance,
        summary.on_time_rate,
        summary.on_time_percent,
      )),
      no_show_rate: optionalNumber(summary.no_show_rate, summary.average_no_show_rate),
    },
    by_flight: rows.map(row => ({
      flight_id: row.flight_id === undefined ? undefined : number(row.flight_id),
      flight_no: text(row.flight_no),
      capacity: optionalNumber(row.capacity, row.seat_capacity),
      confirmed_passengers: optionalNumber(row.confirmed_passengers, row.confirmed_bookings),
      occupancy_rate: number(firstDefined(row.occupancy_rate, row.occupancy_percent)),
      boarded: optionalNumber(row.boarded, row.boarded_count),
      no_shows: optionalNumber(row.no_shows, row.no_show_count),
      no_show_rate: optionalNumber(row.no_show_rate),
      on_time: typeof row.on_time === 'boolean' ? row.on_time : null,
    })),
  };
};
