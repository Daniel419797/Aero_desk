import React, { useState } from 'react';
import { useDatabase, Aircraft } from '../context/DatabaseContext';
import { Search, Plus, Edit2, ShieldAlert, Cpu } from 'lucide-react';

export const AircraftPage: React.FC = () => {
  const { state, addAircraft, updateAircraft } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  // Form states
  const [registrationNo, setRegistrationNo] = useState('');
  const [model, setModel] = useState('');
  const [seatCapacity, setSeatCapacity] = useState(12);
  const [status, setStatus] = useState<'Active' | 'Maintenance' | 'Retired'>('Active');
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filter
  const filteredAircraft = state.aircraft.filter(ac => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      ac.registration_no.toLowerCase().includes(term) ||
      ac.model.toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'All' || ac.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingAircraft(null);
    setRegistrationNo('');
    setModel('');
    setSeatCapacity(12);
    setStatus('Active');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (ac: Aircraft) => {
    setEditingAircraft(ac);
    setRegistrationNo(ac.registration_no);
    setModel(ac.model);
    setSeatCapacity(ac.seat_capacity);
    setStatus(ac.status);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!registrationNo || !model || !seatCapacity || !status) {
      setErrorMsg('All fields are required.');
      return;
    }

    const aircraftData = {
      registration_no: registrationNo.toUpperCase().trim(),
      model,
      seat_capacity: Number(seatCapacity),
      status,
    };

    if (editingAircraft) {
      const res = await updateAircraft(editingAircraft.aircraft_id, aircraftData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update aircraft.');
      } else {
        setIsModalOpen(false);
      }
    } else {
      const res = await addAircraft(aircraftData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to register aircraft.');
      } else {
        setIsModalOpen(false);
      }
    }
  };

  const getStatusBadge = (s: Aircraft['status']) => {
    switch (s) {
      case 'Active':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30';
      case 'Maintenance':
        return 'bg-amber-950/40 text-amber-400 border border-amber-900/30';
      default: // Retired
        return 'bg-red-950/40 text-red-400 border border-red-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500/50">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search registration, model..."
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
            <option value="Active" className="bg-slate-900">Active</option>
            <option value="Maintenance" className="bg-slate-900">Maintenance</option>
            <option value="Retired" className="bg-slate-900">Retired</option>
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          <Plus size={16} />
          Register Aircraft
        </button>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredAircraft.map(ac => (
          <div
            key={ac.aircraft_id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between h-[190px]"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                  Tail Number
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getStatusBadge(ac.status)}`}>
                  {ac.status}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-100 mt-2 font-mono">{ac.registration_no}</h3>
              <p className="text-xs text-slate-400 mt-1">{ac.model}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase">
                <Cpu size={12} className="text-slate-600" />
                {ac.seat_capacity} Seats Capacity
              </span>

              <button
                onClick={() => openEditModal(ac)}
                className="py-1 px-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-1 transition-all"
              >
                <Edit2 size={10} />
                Edit Status
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-slate-800 shadow-2xl relative flex flex-col space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              {editingAircraft ? 'Update Aircraft Details' : 'Register New Fleet Aircraft'}
            </h3>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs items-center">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Tail Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. N777AD"
                  value={registrationNo}
                  onChange={e => setRegistrationNo(e.target.value)}
                  disabled={Boolean(editingAircraft)}
                  title={editingAircraft ? 'The backend does not allow registration number changes.' : undefined}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none font-mono focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Aircraft Model</label>
                <input
                  type="text"
                  placeholder="e.g. Boeing 777-300ER"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={4}
                    max={500}
                    value={seatCapacity}
                    onChange={e => setSeatCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  >
                    <option value="Active" className="bg-slate-900">Active</option>
                    <option value="Maintenance" className="bg-slate-900">Maintenance</option>
                    <option value="Retired" className="bg-slate-900">Retired</option>
                  </select>
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
                {editingAircraft ? 'Save Changes' : 'Register Fleet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default AircraftPage;
