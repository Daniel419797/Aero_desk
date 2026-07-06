import React, { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Search, ShieldAlert } from 'lucide-react';
import { useDatabase, type Booking, type Payment } from '../context/DatabaseContext';

interface PaymentRow {
  booking: Booking;
  payment?: Payment;
  amount: number;
  status: Payment['status'] | 'Awaiting Payment';
}

export const Payments: React.FC = () => {
  const { state, processPayment } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<Payment['method']>('Cash');
  const [successTicketNo, setSuccessTicketNo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const passengerById = useMemo(() => new Map(state.passengers.map(item => [item.passenger_id, item])), [state.passengers]);
  const flightById = useMemo(() => new Map(state.flights.map(item => [item.flight_id, item])), [state.flights]);
  const seatById = useMemo(() => new Map(state.seats.map(item => [item.seat_id, item])), [state.seats]);
  const fareClassById = useMemo(() => new Map(state.fare_classes.map(item => [item.fare_class_id, item])), [state.fare_classes]);
  const paymentByBookingId = useMemo(() => new Map(state.payments.map(item => [item.booking_id, item])), [state.payments]);

  const rows = useMemo<PaymentRow[]>(() => state.bookings.reduce<PaymentRow[]>((result, booking) => {
    const payment = paymentByBookingId.get(booking.booking_id);
    if (payment) {
      result.push({ booking, payment, amount: payment.amount, status: payment.status });
      return result;
    }
    if (booking.status !== 'Pending') return result;

    const flight = flightById.get(booking.flight_id);
    const seat = seatById.get(booking.seat_id);
    const fareClass = fareClassById.get(seat?.fare_class_id || -1);
    const amount = (flight?.base_fare || 0) * (fareClass?.multiplier || 1);
    result.push({ booking, amount, status: 'Awaiting Payment' });
    return result;
  }, []), [fareClassById, flightById, paymentByBookingId, seatById, state.bookings]);

  const filteredRows = rows.filter(row => {
    const passenger = passengerById.get(row.booking.passenger_id);
    const flight = flightById.get(row.booking.flight_id);
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term
      || row.booking.pnr.toLowerCase().includes(term)
      || passenger?.full_name.toLowerCase().includes(term)
      || flight?.flight_no.toLowerCase().includes(term);
    const matchesMethod = filterMethod === 'All' || row.payment?.method === filterMethod;
    const matchesStatus = filterStatus === 'All' || row.status === filterStatus;
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const selectedRow = rows.find(row => row.booking.booking_id === selectedBookingId);

  const handleRecordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    if (!selectedRow) return;
    const result = await processPayment(selectedRow.booking.booking_id, payMethod);
    if (!result.success) {
      setErrorMsg(result.error || 'Failed to complete transaction.');
      return;
    }
    setSuccessTicketNo(result.ticket?.ticket_no || 'Issued');
    setSelectedBookingId(null);
  };

  const getStatusBadge = (status: PaymentRow['status']) => {
    if (status === 'Completed') return 'bg-emerald-950 text-emerald-400 border border-emerald-900/30';
    if (status === 'Refunded') return 'bg-red-950 text-red-400 border border-red-900/30';
    return 'bg-amber-950 text-amber-400 border border-amber-900/30';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:flex-row">
        <div className="flex w-full flex-1 flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative flex w-full items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 focus-within:border-blue-500/50 sm:max-w-xs">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search PNR, name, flight..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="ml-2 w-full border-none bg-transparent text-xs text-slate-200 outline-none"
            />
          </div>
          <select value={filterMethod} onChange={event => setFilterMethod(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none">
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          <select value={filterStatus} onChange={event => setFilterStatus(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none">
            <option value="All">All Statuses</option>
            <option value="Awaiting Payment">Awaiting Payment</option>
            <option value="Completed">Completed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      {successTicketNo && (
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-emerald-900/30 bg-emerald-950/40 p-4 text-xs text-emerald-400" role="status">
          <CheckCircle2 size={20} />
          <div><strong>Payment completed.</strong> Ticket <span className="font-mono">{successTicketNo}</span> was issued.</div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800 glass-panel">
        <table className="w-full min-w-[880px] text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900 text-[9px] font-bold uppercase text-slate-400">
            <tr><th className="p-4">PNR</th><th className="p-4">Passenger</th><th className="p-4">Flight</th><th className="p-4">Amount</th><th className="p-4">Method</th><th className="p-4">Date</th><th className="p-4">Status</th><th className="p-4 text-center">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredRows.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">No payment or unpaid booking records match these filters.</td></tr>
            ) : filteredRows.map(row => {
              const passenger = passengerById.get(row.booking.passenger_id);
              const flight = flightById.get(row.booking.flight_id);
              const dateValue = row.payment?.payment_date || row.booking.created_at;
              return (
                <tr key={row.booking.booking_id} className="hover:bg-slate-900/10">
                  <td className="p-4 font-mono font-bold tracking-wider text-slate-100">{row.booking.pnr}</td>
                  <td className="p-4 font-semibold text-slate-200">{passenger?.full_name || 'Unavailable'}</td>
                  <td className="p-4 font-mono font-bold text-slate-300">{flight?.flight_no || 'Unavailable'}</td>
                  <td className="p-4 font-bold text-slate-100">${row.amount.toLocaleString()} {!row.payment && <span className="block text-[9px] font-normal text-slate-500">Calculated fare</span>}</td>
                  <td className="p-4">{row.payment?.method || '—'}</td>
                  <td className="p-4 text-slate-400">{dateValue ? new Date(dateValue).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td className="p-4"><span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${getStatusBadge(row.status)}`}>{row.status}</span></td>
                  <td className="p-4 text-center">
                    {row.status === 'Awaiting Payment' ? (
                      <button type="button" onClick={() => { setSelectedBookingId(row.booking.booking_id); setErrorMsg(''); setSuccessTicketNo(null); }} className="mx-auto flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase text-white hover:bg-blue-500"><CreditCard size={10} />Receive Pay</button>
                    ) : <span className="text-[10px] font-bold uppercase text-slate-500">Settled</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-heading">
          <form onSubmit={handleRecordPayment} className="flex w-full max-w-sm flex-col space-y-4 rounded-2xl border border-slate-800 p-6 shadow-2xl glass-panel">
            <h3 id="payment-heading" className="flex items-center gap-2 text-base font-bold text-white"><CreditCard className="text-blue-400" size={18} />Process Payment</h3>
            {errorMsg && <div className="flex items-center gap-2 rounded-xl border border-red-900/30 bg-red-950/40 p-3 text-xs text-red-400" role="alert"><ShieldAlert size={16} />{errorMsg}</div>}
            <div className="space-y-1.5 rounded-xl border border-slate-850 bg-slate-900/60 p-3 text-xs text-slate-400">
              <div className="flex justify-between"><span>Calculated fare:</span><strong className="text-slate-200">${selectedRow.amount.toLocaleString()}</strong></div>
              <div className="flex justify-between"><span>Passenger PNR:</span><span className="font-mono text-slate-200">{selectedRow.booking.pnr}</span></div>
            </div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Payment Method
              <select value={payMethod} onChange={event => setPayMethod(event.target.value as Payment['method'])} className="mt-1 w-full rounded-xl border border-slate-850 bg-slate-950 p-2.5 text-xs text-slate-200 outline-none">
                <option value="Cash">Cash</option><option value="Card">Card Payment</option><option value="Bank Transfer">Bank Transfer</option>
              </select>
            </label>
            <div className="flex gap-3 pt-3"><button type="button" onClick={() => setSelectedBookingId(null)} className="flex-1 rounded-xl border border-slate-800 py-2 text-xs font-semibold text-slate-300">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Record Payment</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Payments;
