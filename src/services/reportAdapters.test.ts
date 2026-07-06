import { describe, expect, it } from 'vitest';
import { parseOperationalReport, parseRevenueReport } from './reportAdapters';

describe('report adapters', () => {
  it('normalizes numeric backend revenue values without inventing totals', () => {
    const report = parseRevenueReport({
      summary: { total_revenue: '1250', tickets_issued: 5, average_revenue_per_flight: '625' },
      by_flight: [
        { flight_id: 1, flight_no: 'AD101', route: 'LOS → ABV', tickets_sold: 5, total_revenue: '1250', average_fare: '250' },
      ],
      by_payment_method: [{ method: 'Card', total_revenue: '1250', payment_count: 5 }],
    });

    expect(report?.summary).toEqual({
      total_revenue: 1250,
      tickets_issued: 5,
      average_revenue_per_flight: 625,
    });
    expect(report?.by_flight[0].average_fare).toBe(250);
  });

  it('rejects an undocumented revenue payload instead of showing placeholder metrics', () => {
    expect(parseRevenueReport({ message: 'ok' })).toBeNull();
  });

  it('accepts an empty but correctly shaped revenue report', () => {
    expect(parseRevenueReport({
      summary: { total_revenue: 0, tickets_issued: 0, average_revenue_per_flight: 0 },
      by_flight: [],
      by_payment_method: [],
    })?.summary.total_revenue).toBe(0);
  });

  it('normalizes the published 57-operation revenue contract and uses net revenue', () => {
    const report = parseRevenueReport({
      summary: {
        total_revenue: '1500',
        total_bookings: 6,
        total_refunds: '200',
        net_revenue: '1300',
      },
      by_flight: [{
        flight_no: 'AD202',
        route: 'LOS → ACC',
        total_passengers: 6,
        total_revenue: '1500',
        economy_revenue: '1500',
        business_revenue: '0',
        first_class_revenue: '0',
      }],
      by_payment_method: [{ method: 'Card', count: 6, total: '1500' }],
    });

    expect(report?.summary).toEqual({
      total_revenue: 1300,
      tickets_issued: 6,
      average_revenue_per_flight: 1300,
    });
    expect(report?.count_label).toBe('Bookings');
    expect(report?.row_count_label).toBe('Passengers');
    expect(report?.average_label).toBe('Average revenue');
    expect(report?.by_flight[0].average_fare).toBe(250);
    expect(report?.by_payment_method[0].total_revenue).toBe(1500);
  });

  it('uses the backend on-time value for operational reports', () => {
    const report = parseOperationalReport({
      summary: { average_occupancy_rate: 72.5, on_time_performance: 83.3, no_show_rate: 4.2 },
      by_flight: [{
        flight_id: 8,
        flight_no: 'AD808',
        capacity: 100,
        confirmed_passengers: 75,
        occupancy_rate: 75,
        boarded: 70,
        no_shows: 5,
        no_show_rate: 6.67,
        on_time: false,
      }],
    });

    expect(report?.summary.on_time_performance).toBe(83.3);
    expect(report?.by_flight[0].on_time).toBe(false);
  });

  it('preserves unavailable no-show fields in the published operational contract', () => {
    const report = parseOperationalReport({
      summary: {
        total_flights: 1,
        total_passengers: 75,
        average_occupancy_percent: '75',
        on_time_percent: '100',
        cancelled_flights: 0,
      },
      by_flight: [{
        flight_no: 'AD303',
        route: 'LOS → ABV',
        scheduled_dep: '2026-07-03T10:00:00Z',
        actual_dep: '2026-07-03T09:58:00Z',
        status: 'Departed',
        occupancy_percent: '75',
        on_time: true,
        delay_minutes: 0,
      }],
    });

    expect(report?.summary).toEqual({
      average_occupancy_rate: 75,
      on_time_performance: 100,
      no_show_rate: null,
    });
    expect(report?.by_flight[0]).toMatchObject({
      occupancy_rate: 75,
      capacity: null,
      confirmed_passengers: null,
      boarded: null,
      no_shows: null,
      no_show_rate: null,
      on_time: true,
    });
  });
});
