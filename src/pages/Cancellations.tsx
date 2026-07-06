import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Search, XOctagon, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Cancellations: React.FC = () => {
  const { state, cancelTicket } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelReason, setCancelReason] = useState('Passenger requested cancellation');
  
  // Search result states
  const [foundBooking, setFoundBooking] = useState<any>(null);
  const [foundTicket, setFoundTicket] = useState<any>(null);
  const [foundPayment, setFoundPayment] = useState<any>(null);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setFoundBooking(null);
    setFoundTicket(null);
    setFoundPayment(null);

    const term = searchQuery.trim().toUpperCase();
    if (!term) return;

    // Find ticket
    const ticket = state.tickets.find(t => t.ticket_no === term && !t.is_cancelled);
    let booking = state.bookings.find(b => b.pnr === term && b.status !== 'Cancelled');

    if (ticket) {
      booking = state.bookings.find(b => b.booking_id === ticket.booking_id);
      setFoundTicket(ticket);
    } else if (booking) {
      const t = state.tickets.find(t => t.booking_id === booking!.booking_id);
      setFoundTicket(t || null);
    }

    if (!booking) {
      setErrorMsg('No active confirmed booking or ticket found for that code.');
      return;
    }

    const payment = state.payments.find(p => p.booking_id === booking!.booking_id);

    setFoundBooking(booking);
    setFoundPayment(payment || null);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!foundBooking) return;
    if (!cancelReason) {
      setErrorMsg('Please specify a cancellation reason.');
      return;
    }

    const searchKey = foundTicket ? foundTicket.ticket_no : foundBooking.pnr;
    const res = await cancelTicket(searchKey, cancelReason);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to cancel reservation.');
    } else {
      setSuccessMsg('Cancellation completed. Booking, seat, ticket, and refund state were returned by the backend transaction.');
      setFoundBooking(null);
      setFoundTicket(null);
      setFoundPayment(null);
      setSearchQuery('');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-3 shadow-xl">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          Lookup Reservation PNR or Ticket ID
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-400 focus-within:border-blue-500/50">
            <Search size={18} />
            <input
              type="text"
              placeholder="e.g. PNR10A or TK-100293..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full font-mono uppercase tracking-widest"
              required
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-200 transition-all"
          >
            Find PNR
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3.5 flex gap-2 text-red-400 text-xs items-center">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-900/30 rounded-xl p-4 flex gap-3 text-emerald-400 text-xs items-center">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cancellation Form details panel */}
      {foundBooking && (
        <form onSubmit={handleCancelSubmit} className="glass-panel p-6 rounded-2xl border border-red-500/10 space-y-5 shadow-2xl relative overflow-hidden">
          {/* Subtle glow border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 to-indigo-600 opacity-60"></div>
          
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <XOctagon className="text-red-400 animate-pulse" size={18} />
            Verify Reservation Details
          </h3>

          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-900 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Passenger Profile:</span>
              <span className="text-slate-200 font-semibold">
                {state.passengers.find(p => p.passenger_id === foundBooking.passenger_id)?.full_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Flight route:</span>
              <span className="text-slate-200 font-bold font-mono">
                {state.flights.find(f => f.flight_id === foundBooking.flight_id)?.flight_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Seat Code:</span>
              <span className="text-slate-200 font-mono font-semibold">
                {state.seats.find(s => s.seat_id === foundBooking.seat_id)?.seat_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Invoice:</span>
              <span className="text-slate-200 font-mono capitalize">
                {foundPayment?.status} ({foundPayment?.method || 'Cash'})
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-2 mt-2 font-bold">
              <span className="text-slate-500">Fare Amount:</span>
              <span className="text-slate-200">${foundPayment?.amount || 0}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Cancellation Reason</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Specify reason for cancelling this ticket..."
              className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none h-20 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
              required
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFoundBooking(null)}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg hover:shadow-red-500/10"
            >
              Void Booking & Refund
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
export default Cancellations;
