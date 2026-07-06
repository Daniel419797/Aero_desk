import React, { useEffect, useState } from 'react';
import { useDatabase, BoardingRecord } from '../context/DatabaseContext';
import { Search, UserCheck, UserX } from 'lucide-react';

export const Boarding: React.FC = () => {
  const { state, recordBoarding, loadBoarding, loadFlightSeats } = useDatabase();
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get active flights to populate dropdown
  const activeFlights = state.flights.filter(f => f.status !== 'Cancelled');

  useEffect(() => {
    if (selectedFlightId === null && activeFlights.length > 0) {
      setSelectedFlightId(activeFlights[0].flight_id);
    }
  }, [activeFlights, selectedFlightId]);

  useEffect(() => {
    if (selectedFlightId === null) return;
    void Promise.all([loadBoarding(selectedFlightId), loadFlightSeats(selectedFlightId)]);
  }, [selectedFlightId, loadBoarding, loadFlightSeats]);

  // Filter passengers on the selected flight
  const confirmedBookings = selectedFlightId 
    ? state.bookings.filter(b => b.flight_id === selectedFlightId && b.status === 'Confirmed') 
    : [];

  const boardingRecords = selectedFlightId
    ? state.boarding_records.filter(br => br.flight_id === selectedFlightId)
    : [];

  // Compute Stats
  const totalConfirmed = confirmedBookings.length;
  const boardedCount = boardingRecords.filter(br => br.status === 'Boarded').length;
  const noShowCount = boardingRecords.filter(br => br.status === 'No-Show').length;
  const progressPercent = totalConfirmed > 0 ? Math.round((boardedCount / totalConfirmed) * 100) : 0;

  // Filtered list
  const filteredBoarding = boardingRecords.filter(br => {
    const passenger = state.passengers.find(p => p.passenger_id === br.passenger_id);
    const booking = state.bookings.find(b => b.booking_id === br.booking_id);
    const seat = state.seats.find(s => s.seat_id === booking?.seat_id);

    const term = searchTerm.toLowerCase();
    return (
      passenger?.full_name.toLowerCase().includes(term) ||
      passenger?.passport_no.toLowerCase().includes(term) ||
      seat?.seat_number.toLowerCase().includes(term)
    );
  });

  const handleBoard = async (bookingId: number, status: BoardingRecord['status']) => {
    const res = await recordBoarding(bookingId, status);
    if (!res.success) {
      alert(res.error);
    }
  };

  const getBoardingBadge = (status: BoardingRecord['status']) => {
    switch (status) {
      case 'Boarded':
        return 'bg-emerald-950 text-emerald-400 border border-emerald-900/30';
      case 'No-Show':
        return 'bg-red-950 text-red-400 border border-red-900/30';
      default: // Not Boarded
        return 'bg-slate-900 text-slate-400 border border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Flight Selector Hub */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Select Operations Flight</label>
            <select
              value={selectedFlightId || ''}
              onChange={e => setSelectedFlightId(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer focus:border-blue-500/50"
            >
              <option value="" disabled>Select Flight...</option>
              {activeFlights.map(f => (
                <option key={f.flight_id} value={f.flight_id}>{f.flight_no} - Status: {f.status}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 max-w-xs">
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Search Manifest Passenger</label>
            <div className="relative w-full flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-400">
              <Search size={14} />
              <input
                type="text"
                placeholder="Name or seat..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Boarding Stats Dashboard */}
      {selectedFlightId && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-6 items-center shadow-lg">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>BOARDING COMPLETION</span>
              <span className="text-blue-400">{boardedCount} / {totalConfirmed} PASSENGERS</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-around items-center md:col-span-2 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Boarded</span>
              <span className="text-xl font-bold text-emerald-400">{boardedCount}</span>
            </div>
            <div className="border-r border-slate-850 h-8"></div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">No-Show</span>
              <span className="text-xl font-bold text-red-400">{noShowCount}</span>
            </div>
            <div className="border-r border-slate-850 h-8"></div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Pending</span>
              <span className="text-xl font-bold text-slate-400">{totalConfirmed - boardedCount - noShowCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Boarding list */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden glass-panel">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-800">
            <tr>
              <th className="p-4">Seat</th>
              <th className="p-4">Passenger Name</th>
              <th className="p-4">Passport / NIN</th>
              <th className="p-4">Ticket Number</th>
              <th className="p-4">Gate Record</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {!selectedFlightId ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Please select a flight to manage boarding.
                </td>
              </tr>
            ) : filteredBoarding.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No checked-in passengers found matching filters.
                </td>
              </tr>
            ) : (
              filteredBoarding.map(br => {
                const passenger = state.passengers.find(p => p.passenger_id === br.passenger_id);
                const booking = state.bookings.find(b => b.booking_id === br.booking_id);
                const seat = state.seats.find(s => s.seat_id === booking?.seat_id);
                const ticket = state.tickets.find(t => t.booking_id === br.booking_id);

                return (
                  <tr key={br.boarding_id} className="hover:bg-slate-900/10">
                    <td className="p-4 font-bold text-slate-100 font-mono">{seat?.seat_number}</td>
                    <td className="p-4 font-semibold text-slate-200">
                      {passenger?.full_name}
                      <span className="text-[10px] text-slate-500 block font-normal">{seat?.travel_class}</span>
                    </td>
                    <td className="p-4 font-mono uppercase text-slate-400">{passenger?.passport_no}</td>
                    <td className="p-4 font-mono text-slate-400">{ticket?.ticket_no || 'N/A'}</td>
                    <td className="p-4 font-mono text-slate-500">
                      {br.boarded_at ? new Date(br.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getBoardingBadge(br.status)}`}>
                        {br.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleBoard(br.booking_id, 'Boarded')}
                          disabled={br.status === 'Boarded'}
                          className={`py-1 px-2.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 transition-all ${
                            br.status === 'Boarded'
                              ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/30'
                          }`}
                        >
                          <UserCheck size={10} />
                          Board
                        </button>
                        <button
                          onClick={() => handleBoard(br.booking_id, 'No-Show')}
                          disabled={br.status === 'No-Show'}
                          className={`py-1 px-2.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 transition-all ${
                            br.status === 'No-Show'
                              ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                              : 'bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/30'
                          }`}
                        >
                          <UserX size={10} />
                          No-Show
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Boarding;
