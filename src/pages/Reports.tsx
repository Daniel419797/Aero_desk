import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CalendarRange, DollarSign, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDatabase } from '../context/DatabaseContext';
import { parseOperationalReport, parseRevenueReport } from '../services/reportAdapters';

const COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8'];
const unavailable = 'Unavailable';
const formatCount = (value: number | null) => value === null ? '—' : value.toLocaleString();
const formatPercent = (value: number | null) => value === null ? unavailable : `${value}%`;
const formatNoShows = (count: number | null, rate: number | null) => {
  if (count === null && rate === null) return '—';
  if (count === null) return formatPercent(rate);
  return rate === null ? count.toLocaleString() : `${count.toLocaleString()} (${rate}%)`;
};

const MissingContract: React.FC<{ report: string }> = ({ report }) => (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900" role="alert">
    <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} />{report} data is unavailable</div>
    <p className="mt-2 text-xs leading-5">The backend response does not match the documented production report contract. No client-generated or placeholder metrics are shown.</p>
  </div>
);

export const Reports: React.FC = () => {
  const { state, loadReports, isLoading } = useDatabase();
  const [activeTab, setActiveTab] = useState<'revenue' | 'operations'>('revenue');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const revenue = useMemo(() => parseRevenueReport(state.api_reports.revenue), [state.api_reports.revenue]);
  const operational = useMemo(() => parseOperationalReport(state.api_reports.operational), [state.api_reports.operational]);

  const applyFilters = async () => {
    setError('');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError('Start date must be on or before end date.');
      return;
    }
    const result = await loadReports(dateFrom || undefined, dateTo || undefined);
    if (!result.success) setError(result.error || 'Unable to refresh report data.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Authoritative reports</h1>
          <p className="mt-1 text-xs text-slate-500">Metrics come from backend aggregate endpoints or transparent calculations from their returned values.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-medium uppercase text-slate-500">From<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800" /></label>
          <label className="text-[10px] font-medium uppercase text-slate-500">To<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800" /></label>
          <button type="button" onClick={() => void applyFilters()} disabled={isLoading} className="inline-flex h-[34px] items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />Apply</button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">{error}</div>}

      <div className="flex gap-1 border-b border-slate-200">
        <button type="button" onClick={() => setActiveTab('revenue')} className={`border-b-2 px-4 py-3 text-xs font-semibold ${activeTab === 'revenue' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Revenue</button>
        <button type="button" onClick={() => setActiveTab('operations')} className={`border-b-2 px-4 py-3 text-xs font-semibold ${activeTab === 'operations' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Operations</button>
      </div>

      {activeTab === 'revenue' && (!revenue ? <MissingContract report="Revenue report" /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Total revenue" value={`$${revenue.summary.total_revenue.toLocaleString()}`} icon={<DollarSign size={20} />} />
            <Summary label={revenue.count_label} value={revenue.summary.tickets_issued.toLocaleString()} icon={<Users size={20} />} />
            <Summary label="Average per flight" value={`$${Math.round(revenue.summary.average_revenue_per_flight).toLocaleString()}`} icon={<TrendingUp size={20} />} />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="h-[320px] rounded-xl border border-slate-200 p-5 lg:col-span-2"><h2 className="mb-4 text-xs font-semibold text-slate-900">Revenue per flight</h2><ResponsiveContainer width="100%" height="88%"><BarChart data={revenue.by_flight}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="flight_no" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="total_revenue" fill="#2563eb" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></section>
            <section className="h-[320px] rounded-xl border border-slate-200 p-5"><h2 className="mb-4 text-xs font-semibold text-slate-900">Revenue by payment method</h2><ResponsiveContainer width="100%" height="88%"><PieChart><Pie data={revenue.by_payment_method} dataKey="total_revenue" nameKey="method" innerRadius={55} outerRadius={85}>{revenue.by_payment_method.map((row, index) => <Cell key={row.method} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></section>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-4">Flight</th><th className="p-4">Route</th><th className="p-4 text-right">{revenue.row_count_label}</th><th className="p-4 text-right">{revenue.average_label}</th><th className="p-4 text-right">Revenue</th></tr></thead><tbody className="divide-y divide-slate-200">{revenue.by_flight.map(row => <tr key={`${row.flight_id || row.flight_no}`}><td className="p-4 font-mono font-semibold">{row.flight_no}</td><td className="p-4">{row.route || '—'}</td><td className="p-4 text-right">{row.tickets_sold}</td><td className="p-4 text-right">${row.average_fare.toLocaleString()}</td><td className="p-4 text-right font-semibold">${row.total_revenue.toLocaleString()}</td></tr>)}</tbody></table></div>
        </div>
      ))}

      {activeTab === 'operations' && (!operational ? <MissingContract report="Operational report" /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Average occupancy" value={`${operational.summary.average_occupancy_rate}%`} icon={<Activity size={20} />} />
            <Summary label="On-time performance" value={`${operational.summary.on_time_performance}%`} icon={<CalendarRange size={20} />} />
            <Summary label="No-show rate" value={formatPercent(operational.summary.no_show_rate)} icon={<Users size={20} />} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-4">Flight</th><th className="p-4 text-right">Capacity</th><th className="p-4 text-right">Confirmed</th><th className="p-4 text-right">Occupancy</th><th className="p-4 text-right">Boarded</th><th className="p-4 text-right">No-shows</th><th className="p-4 text-right">On time</th></tr></thead><tbody className="divide-y divide-slate-200">{operational.by_flight.map(row => <tr key={`${row.flight_id || row.flight_no}`}><td className="p-4 font-mono font-semibold">{row.flight_no}</td><td className="p-4 text-right">{formatCount(row.capacity)}</td><td className="p-4 text-right">{formatCount(row.confirmed_passengers)}</td><td className="p-4 text-right">{row.occupancy_rate}%</td><td className="p-4 text-right">{formatCount(row.boarded)}</td><td className="p-4 text-right">{formatNoShows(row.no_shows, row.no_show_rate)}</td><td className="p-4 text-right">{row.on_time === null ? '—' : row.on_time ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>
        </div>
      ))}
    </div>
  );
};

const Summary: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-5"><span className="text-blue-600">{icon}</span><div><span className="block text-[10px] font-medium uppercase text-slate-500">{label}</span><strong className="mt-1 block text-xl text-slate-950">{value}</strong></div></div>
);

export default Reports;
