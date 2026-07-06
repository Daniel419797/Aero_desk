import React, { useState } from 'react';
import { useDatabase, Flight } from '../context/DatabaseContext';
import { Search, Calendar, Plane, Clock } from 'lucide-react';

export const FlightStatus: React.FC = () => {
  const { state, updateFlightStatus } = useDatabase();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [searchTerm, setSearchTerm] = useState('');

  // Filter flights by date and search query
  const filteredFlights = state.flights.filter(f => {
    const sched = state.flight_schedules.find(sc => sc.flight_id === f.flight_id);
    if (!sched) return false;

    // Matches date (extract YYYY-MM-DD from dep_datetime)
    const flightDate = sched.dep_datetime.split('T')[0];
    const matchesDate = flightDate === selectedDate;

    // Matches search
    const term = searchTerm.toLowerCase();
    const orig = state.airports.find(ap => ap.airport_id === f.origin_airport_id);
    const dest = state.airports.find(ap => ap.airport_id === f.dest_airport_id);
    const matchesSearch =
      f.flight_no.toLowerCase().includes(term) ||
      orig?.iata_code.toLowerCase().includes(term) ||
      dest?.iata_code.toLowerCase().includes(term);

    return matchesDate && matchesSearch;
  });

  const getStatusColor = (s: Flight['status']) => {
    switch (s) {
      case 'Scheduled':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Boarding':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Departed':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Arrived':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: // Cancelled
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  };

  const handleStatusChange = async (flightId: number, status: Flight['status']) => {
    const res = await updateFlightStatus(flightId, status);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          {/* Date Picker */}
          <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400">
            <Calendar size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 cursor-pointer"
            />
          </div>

          {/* Search Flight */}
          <div className="relative w-full sm:max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search flight no..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full font-mono uppercase"
            />
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          FIDS Board View
        </div>
      </div>

      {/* Flight Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFlights.length === 0 ? (
          <div className="md:col-span-2 glass-panel p-8 text-center text-slate-500 text-xs">
            No flights scheduled for this date ({selectedDate}).
          </div>
        ) : (
          filteredFlights.map(f => {
            const sched = state.flight_schedules.find(sc => sc.flight_id === f.flight_id)!;
            const ac = state.aircraft.find(c => c.aircraft_id === f.aircraft_id);
            const orig = state.airports.find(ap => ap.airport_id === f.origin_airport_id);
            const dest = state.airports.find(ap => ap.airport_id === f.dest_airport_id);

            return (
              <div
                key={f.flight_id}
                className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between h-[250px] relative overflow-hidden shadow-lg hover:border-slate-700 transition-all"
              >
                {/* Glow accent matching flight status */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800"></div>

                <div>
                  {/* Top line info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">FLIGHT LOG</span>
                      <h3 className="font-extrabold text-white text-lg font-mono tracking-wider mt-0.5">{f.flight_no}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(f.status)}`}>
                      {f.status}
                    </span>
                  </div>

                  {/* Route & Times */}
                  <div className="flex justify-between items-center mt-6 text-xs text-slate-300">
                    <div className="text-left space-y-1">
                      <span className="text-lg font-bold font-mono text-slate-100">{orig?.iata_code}</span>
                      <span className="text-[10px] text-slate-500 block">{orig?.city}</span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                        Dep: {new Date(sched.dep_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-6">
                      <Plane size={16} className="text-slate-600 rotate-90" />
                      <span className="h-[1px] w-full bg-slate-800 my-1 block"></span>
                      <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                        Gate {sched.gate || 'N/A'}
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-lg font-bold font-mono text-slate-100">{dest?.iata_code}</span>
                      <span className="text-[10px] text-slate-500 block">{dest?.city}</span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                        Arr: {new Date(sched.arr_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations footer */}
                <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-mono">
                    Tail: {ac?.registration_no} • {ac?.model}
                  </div>

                  {/* Flight Status transitions */}
                  {f.status !== 'Arrived' && f.status !== 'Cancelled' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-600 font-bold uppercase">Transition:</span>
                      <select
                        value={f.status}
                        onChange={e => handleStatusChange(f.flight_id, e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded px-2 py-1 outline-none cursor-pointer hover:border-slate-700"
                      >
                        <option value="Scheduled" disabled={f.status !== 'Scheduled'}>Scheduled</option>
                        <option value="Boarding" disabled={f.status !== 'Scheduled'}>Boarding</option>
                        <option value="Departed" disabled={f.status !== 'Boarding'}>Departed</option>
                        <option value="Arrived" disabled={f.status !== 'Departed'}>Arrived</option>
                        <option value="Cancelled" disabled={f.status === 'Departed'}>Cancel</option>
                      </select>
                    </div>
                  )}
                  {f.status === 'Arrived' && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                      <Clock size={12} className="text-emerald-500" /> Arrived On Time
                    </span>
                  )}
                  {f.status === 'Cancelled' && (
                    <span className="text-[10px] text-red-500 font-bold uppercase">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default FlightStatus;
