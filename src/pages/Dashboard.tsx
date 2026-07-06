import React from 'react';
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDatabase, Staff } from '../context/DatabaseContext';

interface MetricProps {
  label: string;
  value: string | number;
  action: string;
  onClick: () => void;
}

const Metric: React.FC<MetricProps> = ({ label, value, action, onClick }) => (
  <div className="min-w-0 px-0 py-5 sm:px-6 lg:px-8 lg:py-6 first:pl-0 last:pr-0">
    <div className="text-xs font-medium text-slate-600">{label}</div>
    <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 lg:text-[34px]">{value}</div>
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
    >
      {action}
      <ArrowRight size={14} />
    </button>
  </div>
);

const roleModules: Record<Staff['role'], string[]> = {
  'Super Admin': ['All modules', 'Staff management', 'System administration'],
  'Reservation Agent': ['Passengers', 'Bookings', 'Payments', 'Cancellations', 'Reports'],
  'Ground Staff': ['Boarding', 'Manifest', 'FIDS Monitor'],
  'Operations Manager': ['Airports', 'Fleet', 'Flight planning', 'Schedules', 'FIDS Monitor'],
  'Finance Officer': ['Payments', 'Reports', 'Manifest'],
};

export const Dashboard: React.FC = () => {
  const { state, currentRole, currentStaff } = useDatabase();
  const navigate = useNavigate();

  const activeFlightsCount = state.flights.filter(
    flight => flight.status !== 'Cancelled' && flight.status !== 'Arrived',
  ).length;
  const passengersCount = state.passengers.filter(passenger => passenger.is_active).length;
  const completedPayments = state.payments.filter(payment => payment.status === 'Completed');
  const refundedPayments = state.payments.filter(payment => payment.status === 'Refunded');
  const totalRevenue =
    completedPayments.reduce((sum, payment) => sum + payment.amount, 0) -
    refundedPayments.reduce((sum, payment) => sum + (payment.refund_amount || 0), 0);
  const confirmedBookingsCount = state.bookings.filter(booking => booking.status === 'Confirmed').length;
  const totalScheduledCapacity = state.flights
    .filter(flight => flight.status !== 'Cancelled')
    .reduce((sum, flight) => (
      sum + (state.aircraft.find(item => item.aircraft_id === flight.aircraft_id)?.seat_capacity || 0)
    ), 0);
  const occupancyRate = totalScheduledCapacity
    ? Math.round((confirmedBookingsCount / totalScheduledCapacity) * 100)
    : 0;

  const auditLogs = [...state.audit_logs].reverse().slice(0, 8);
  const modules = roleModules[currentRole];

  const actionTone = (action: string) => {
    if (action === 'CANCELLED') return 'bg-red-500';
    if (action === 'CREATE') return 'bg-emerald-500';
    return 'bg-blue-500';
  };

  return (
    <div>
      <section className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">
          Welcome back, {currentStaff?.full_name?.split(' ')[0] || 'AeroDesk user'}.
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">Here’s what’s happening across live operations.</p>
      </section>

      <section className="grid grid-cols-2 border-b border-slate-200 lg:grid-cols-4" aria-label="Key metrics">
        <Metric label="Active Flights" value={activeFlightsCount} action="View all flights" onClick={() => navigate('/flights')} />
        <div className="border-l md:pl-2 border-slate-200">
          <Metric label="Active Passengers" value={passengersCount} action="View passengers" onClick={() => navigate('/passengers')} />
        </div>
        <div className="border-t md:pl-2 border-slate-200 lg:border-l lg:border-t-0">
          <Metric label="Occupancy Rate" value={`${occupancyRate}%`} action="View seat load" onClick={() => navigate('/bookings')} />
        </div>
        <div className="border-l md:pl-2 border-t border-slate-200 lg:border-t-0">
          <Metric label="Net Revenue" value={`$${totalRevenue.toLocaleString()}`} action="View financials" onClick={() => navigate('/reports')} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 py-7 lg:pr-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Live Operations &amp; Audit Log</h2>
              <p className="mt-1 text-xs text-slate-500">Most recent database activity for this workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              View reports
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">
              Audit activity is unavailable until the backend exposes an audit-log endpoint.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-y border-slate-200 bg-white text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-2 py-3 font-medium">Time</th>
                    <th className="px-2 py-3 font-medium">Event</th>
                    <th className="px-2 py-3 font-medium">Role</th>
                    <th className="px-2 py-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-2 py-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-2 py-3.5 font-medium text-slate-800">{log.details}</td>
                      <td className="px-2 py-3.5 text-slate-500">{log.role}</td>
                      <td className="px-2 py-3.5">
                        <span className="flex items-center justify-end gap-2 text-[11px] font-medium text-slate-600">
                          <span className={`h-1.5 w-1.5 rounded-full ${actionTone(log.action)}`} />
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="border-t border-slate-200 py-7 lg:border-l lg:border-t-0 lg:pl-8" aria-labelledby="policy-heading">
          <h2 id="policy-heading" className="text-sm font-semibold text-slate-950">Role Policy Context</h2>
          <p className="mt-1 text-xs text-slate-500">Permissions adapt to the selected operating role.</p>

          <div className="mt-6 space-y-6">
            <div className="flex gap-3">
              <ShieldCheck size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Access level</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{currentRole}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <UsersRound size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Available modules</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{modules.join(' · ')}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <KeyRound size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Policy enforcement</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Unauthorized routes are blocked before module content renders.</div>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle2 size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Session state</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">Authenticated live API session active.</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Dashboard;
