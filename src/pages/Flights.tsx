import React, { useState } from 'react';
import { useDatabase, Flight } from '../context/DatabaseContext';
import { Search, Plus, ShieldAlert, AlertTriangle } from 'lucide-react';

export const Flights: React.FC = () => {
  const { state, createFlight, updateFlightStatus } = useDatabase();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterAirport, setFilterAirport] = useState('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [flightNo, setFlightNo] = useState('');
  const [originId, setOriginId] = useState<number>(0);
  const [destId, setDestId] = useState<number>(0);
  const [aircraftId, setAircraftId] = useState<number>(0);
  const [baseFare, setBaseFare] = useState<number>(200);
  
  // Schedule Form states (flights and schedules created atomically in v1)
  const [depDatetime, setDepDatetime] = useState('');
  const [arrDatetime, setArrDatetime] = useState('');
  const [terminal, setTerminal] = useState('');
  const [gate, setGate] = useState('');

  // Get options
  const activeAirports = state.airports.filter(a => a.is_active);
  const activeAircraft = state.aircraft.filter(a => a.status === 'Active');

  // Filter flights
  const filteredFlights = state.flights.filter(f => {
    const origin = state.airports.find(a => a.airport_id === f.origin_airport_id);
    const dest = state.airports.find(a => a.airport_id === f.dest_airport_id);

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      f.flight_no.toLowerCase().includes(term) ||
      origin?.iata_code.toLowerCase().includes(term) ||
      dest?.iata_code.toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'All' || f.status === filterStatus;

    const matchesAirport = filterAirport === 'All' || 
      origin?.iata_code === filterAirport || 
      dest?.iata_code === filterAirport;

    return matchesSearch && matchesStatus && matchesAirport;
  });

  const openAddModal = () => {
    setFlightNo('');
    setOriginId(activeAirports[0]?.airport_id || 0);
    setDestId(activeAirports[1]?.airport_id || 0);
    setAircraftId(activeAircraft[0]?.aircraft_id || 0);
    setBaseFare(200);
    setDepDatetime('');
    setArrDatetime('');
    setTerminal('T1');
    setGate('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!flightNo || !originId || !destId || !aircraftId || !depDatetime || !arrDatetime || !baseFare) {
      setErrorMsg('All core fields are required.');
      return;
    }

    if (originId === destId) {
      setErrorMsg('Origin and Destination airports cannot be the same.');
      return;
    }

    const flightData = {
      flight_no: flightNo.toUpperCase().trim(),
      origin_airport_id: Number(originId),
      dest_airport_id: Number(destId),
      aircraft_id: Number(aircraftId),
      base_fare: Number(baseFare),
      status: 'Scheduled' as const,
    };

    const scheduleData = {
      dep_datetime: depDatetime,
      arr_datetime: arrDatetime,
      terminal,
      gate,
    };

    const res = await createFlight(flightData, scheduleData);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create flight.');
    } else {
      setIsModalOpen(false);
    }
  };

  const getStatusBadge = (s: Flight['status']) => {
    switch (s) {
      case 'Scheduled':
        return 'bg-blue-950 text-blue-400 border border-blue-900/30';
      case 'Boarding':
        return 'bg-amber-950 text-amber-400 border border-amber-900/30';
      case 'Departed':
        return 'bg-indigo-950 text-indigo-400 border border-indigo-900/30';
      case 'Arrived':
        return 'bg-emerald-950 text-emerald-400 border border-emerald-900/30';
      default: // Cancelled
        return 'bg-red-950 text-red-400 border border-red-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500/50">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search flight no, airport..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50"
          >
            <option value="All" className="bg-slate-900">All Statuses</option>
            <option value="Scheduled" className="bg-slate-900">Scheduled</option>
            <option value="Boarding" className="bg-slate-900">Boarding</option>
            <option value="Departed" className="bg-slate-900">Departed</option>
            <option value="Arrived" className="bg-slate-900">Arrived</option>
            <option value="Cancelled" className="bg-slate-900">Cancelled</option>
          </select>

          {/* Airport filter */}
          <select
            value={filterAirport}
            onChange={e => setFilterAirport(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50"
          >
            <option value="All" className="bg-slate-900">All Airport Connections</option>
            {state.airports.map(ap => (
              <option key={ap.airport_id} value={ap.iata_code} className="bg-slate-900">{ap.iata_code} ({ap.city})</option>
            ))}
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          <Plus size={16} />
          Create New Flight
        </button>
      </div>

      {/* Flight Schedules Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden glass-panel">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-800">
            <tr>
              <th className="p-4">Flight</th>
              <th className="p-4">Route</th>
              <th className="p-4">Aircraft</th>
              <th className="p-4">Schedule (DEP → ARR)</th>
              <th className="p-4">Base Fare</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {filteredFlights.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No flights found matches filters.
                </td>
              </tr>
            ) : (
              filteredFlights.map(f => {
                const sched = state.flight_schedules.find(sc => sc.flight_id === f.flight_id);
                const ac = state.aircraft.find(a => a.aircraft_id === f.aircraft_id);
                const origin = state.airports.find(a => a.airport_id === f.origin_airport_id);
                const dest = state.airports.find(a => a.airport_id === f.dest_airport_id);

                return (
                  <tr key={f.flight_id} className="hover:bg-slate-900/10">
                    <td className="p-4 font-bold text-white font-mono tracking-wider">{f.flight_no}</td>
                    <td className="p-4 font-semibold text-slate-200">
                      {origin?.iata_code} → {dest?.iata_code}
                      <span className="text-[10px] text-slate-500 font-normal block">{origin?.city} to {dest?.city}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {ac?.registration_no}
                      <span className="text-[9px] text-slate-500 block font-sans">{ac?.model}</span>
                    </td>
                    <td className="p-4">
                      {sched ? (
                        <>
                          <div className="font-semibold">
                            {new Date(sched.dep_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(sched.dep_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Duration: {Math.round((new Date(sched.arr_datetime).getTime() - new Date(sched.dep_datetime).getTime()) / (60 * 60 * 1000))} hrs
                          </div>
                        </>
                      ) : 'Unscheduled'}
                    </td>
                    <td className="p-4 font-bold text-slate-200">${f.base_fare}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getStatusBadge(f.status)}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* Manage flight transitions */}
                        {f.status !== 'Arrived' && f.status !== 'Cancelled' && (
                          <select
                            value={f.status}
                            onChange={async e => {
                              const res = await updateFlightStatus(f.flight_id, e.target.value as any);
                              if (!res.success) alert(res.error);
                            }}
                            className="bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded px-2 py-1 outline-none cursor-pointer"
                          >
                            <option value="Scheduled" disabled={f.status !== 'Scheduled'}>Scheduled</option>
                            <option value="Boarding" disabled={f.status !== 'Scheduled'}>Boarding</option>
                            <option value="Departed" disabled={f.status !== 'Boarding'}>Departed</option>
                            <option value="Arrived" disabled={f.status !== 'Departed'}>Arrived</option>
                            <option value="Cancelled" disabled={f.status === 'Departed'}>Cancel</option>
                          </select>
                        )}
                        {f.status === 'Arrived' && <span className="text-[10px] text-slate-500 font-bold uppercase">Completed</span>}
                        {f.status === 'Cancelled' && <span className="text-[10px] text-slate-500 font-bold uppercase">Cancelled</span>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Flight Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-800 shadow-2xl relative flex flex-col space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-white">Create Flight Route & Initial Schedule</h3>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs items-center">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {activeAircraft.length === 0 && (
              <div className="bg-amber-950/30 border border-amber-900/30 rounded-xl p-3 flex gap-2 text-amber-400 text-xs items-center">
                <AlertTriangle size={16} />
                <span>No active aircraft are registered in the fleet. Activate aircraft first.</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Flight info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Flight Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AD101"
                    value={flightNo}
                    onChange={e => setFlightNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none font-mono focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Base Ticket Fare ($)</label>
                  <input
                    type="number"
                    min={10}
                    value={baseFare}
                    onChange={e => setBaseFare(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>

              {/* Airports */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Origin Airport</label>
                  <select
                    value={originId}
                    onChange={e => setOriginId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  >
                    {activeAirports.map(ap => (
                      <option key={ap.airport_id} value={ap.airport_id}>{ap.iata_code} - {ap.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Destination Airport</label>
                  <select
                    value={destId}
                    onChange={e => setDestId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  >
                    {activeAirports.map(ap => (
                      <option key={ap.airport_id} value={ap.airport_id}>{ap.iata_code} - {ap.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fleet & Aircraft */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Assign Active Aircraft</label>
                <select
                  value={aircraftId}
                  onChange={e => setAircraftId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                >
                  {activeAircraft.map(ac => (
                    <option key={ac.aircraft_id} value={ac.aircraft_id}>{ac.registration_no} ({ac.model}) - Cap: {ac.seat_capacity}</option>
                  ))}
                </select>
              </div>

              {/* Schedules */}
              <div className="border-t border-slate-850 pt-3 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 block">Initial Schedule Details</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Scheduled Departure</label>
                    <input
                      type="datetime-local"
                      value={depDatetime}
                      onChange={e => setDepDatetime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Scheduled Arrival</label>
                    <input
                      type="datetime-local"
                      value={arrDatetime}
                      onChange={e => setArrDatetime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Terminal</label>
                    <input
                      type="text"
                      placeholder="e.g. T5"
                      value={terminal}
                      onChange={e => setTerminal(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Gate</label>
                    <input
                      type="text"
                      placeholder="e.g. A22"
                      value={gate}
                      onChange={e => setGate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activeAircraft.length === 0}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                Create Flight
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Flights;
