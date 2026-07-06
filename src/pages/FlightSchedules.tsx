import React, { useState } from 'react';
import { useDatabase, FlightSchedule } from '../context/DatabaseContext';
import { Search, ShieldAlert, Edit2 } from 'lucide-react';

export const FlightSchedules: React.FC = () => {
  const { state, updateFlightSchedule } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<FlightSchedule | null>(null);

  // Form states
  const [depDatetime, setDepDatetime] = useState('');
  const [arrDatetime, setArrDatetime] = useState('');
  const [actualDep, setActualDep] = useState('');
  const [actualArr, setActualArr] = useState('');
  const [terminal, setTerminal] = useState('');
  const [gate, setGate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredSchedules = state.flight_schedules.filter(sch => {
    const flight = state.flights.find(f => f.flight_id === sch.flight_id);
    if (!flight) return false;
    const term = searchTerm.toLowerCase();
    return (
      flight.flight_no.toLowerCase().includes(term) ||
      sch.terminal.toLowerCase().includes(term) ||
      sch.gate.toLowerCase().includes(term)
    );
  });

  const openEditModal = (sch: FlightSchedule) => {
    setSelectedSchedule(sch);
    setDepDatetime(sch.dep_datetime);
    setArrDatetime(sch.arr_datetime);
    setActualDep(sch.actual_dep || '');
    setActualArr(sch.actual_arr || '');
    setTerminal(sch.terminal);
    setGate(sch.gate);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedSchedule) return;

    const data: Partial<FlightSchedule> = {
      dep_datetime: depDatetime,
      arr_datetime: arrDatetime,
      actual_dep: actualDep || null,
      actual_arr: actualArr || null,
      terminal,
      gate
    };

    const res = await updateFlightSchedule(selectedSchedule.flight_id, data);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update schedule.');
    } else {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500/50">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by flight number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
          />
        </div>
      </div>

      {/* Grid of Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSchedules.map(sch => {
          const flight = state.flights.find(f => f.flight_id === sch.flight_id);
          const origin = state.airports.find(ap => ap.airport_id === flight?.origin_airport_id);
          const dest = state.airports.find(ap => ap.airport_id === flight?.dest_airport_id);

          return (
            <div
              key={sch.schedule_id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between h-[230px]"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-xs font-bold text-white font-mono uppercase">
                    {flight?.flight_no}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Terminal {sch.terminal} • Gate {sch.gate || 'N/A'}
                  </span>
                </div>

                <div className="mt-4 flex justify-between items-center text-xs">
                  <div className="text-left">
                    <span className="text-[9px] text-slate-600 font-bold uppercase block">Departure</span>
                    <span className="font-semibold text-slate-200 font-mono">{origin?.iata_code}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(sch.dep_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(sch.dep_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {sch.actual_dep && (
                      <span className="text-[9px] text-emerald-400 font-bold block mt-1">
                        Act: {new Date(sch.actual_dep).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center flex-1 px-4">
                    <span className="h-0.5 w-full bg-slate-800 relative">
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-500"></span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-600 font-bold uppercase block">Arrival</span>
                    <span className="font-semibold text-slate-200 font-mono">{dest?.iata_code}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(sch.arr_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(sch.arr_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {sch.actual_arr && (
                      <span className="text-[9px] text-emerald-400 font-bold block mt-1">
                        Act: {new Date(sch.actual_arr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openEditModal(sch)}
                className="w-full mt-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 size={12} />
                Adjust Times & Gates
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl relative flex flex-col space-y-4"
          >
            <h3 className="text-base font-bold text-white">Adjust Flight Schedule</h3>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs items-center">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Terminal</label>
                  <input
                    type="text"
                    value={terminal}
                    onChange={e => setTerminal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Gate</label>
                  <input
                    type="text"
                    value={gate}
                    onChange={e => setGate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sched Departure</label>
                  <input
                    type="datetime-local"
                    value={depDatetime}
                    onChange={e => setDepDatetime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sched Arrival</label>
                  <input
                    type="datetime-local"
                    value={arrDatetime}
                    onChange={e => setArrDatetime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-slate-850 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Actual Departure</label>
                  <input
                    type="datetime-local"
                    value={actualDep}
                    onChange={e => setActualDep(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Actual Arrival</label>
                  <input
                    type="datetime-local"
                    value={actualArr}
                    onChange={e => setActualArr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  />
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
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default FlightSchedules;
