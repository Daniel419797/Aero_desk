import React, { useState } from 'react';
import { useDatabase, Airport } from '../context/DatabaseContext';
import { Search, Plus, Edit2, ShieldAlert, Check, X, Map } from 'lucide-react';

export const Airports: React.FC = () => {
  const { state, addAirport, updateAirport } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [iataCode, setIataCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [terminals, setTerminals] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Collect unique countries for filter
  const countries = ['All', ...Array.from(new Set(state.airports.map(ap => ap.country)))];

  // Filters & Searches
  const filteredAirports = state.airports.filter(ap => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      ap.name.toLowerCase().includes(term) ||
      ap.iata_code.toLowerCase().includes(term) ||
      ap.city.toLowerCase().includes(term);

    const matchesCountry = filterCountry === 'All' || ap.country === filterCountry;

    return matchesSearch && matchesCountry;
  });

  const openAddModal = () => {
    setEditingAirport(null);
    setName('');
    setIataCode('');
    setCity('');
    setCountry('');
    setTerminals(1);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (ap: Airport) => {
    setEditingAirport(ap);
    setName(ap.name);
    setIataCode(ap.iata_code);
    setCity(ap.city);
    setCountry(ap.country);
    setTerminals(ap.terminals);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !iataCode || !city || !country || !terminals) {
      setErrorMsg('All fields are required.');
      return;
    }

    const airportData = {
      name,
      iata_code: iataCode.toUpperCase().trim(),
      city,
      country,
      terminals: Number(terminals),
    };

    if (editingAirport) {
      const res = await updateAirport(editingAirport.airport_id, airportData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update airport.');
      } else {
        setIsModalOpen(false);
      }
    } else {
      const res = await addAirport(airportData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add airport.');
      } else {
        setIsModalOpen(false);
      }
    }
  };

  const toggleDeactivate = async (ap: Airport) => {
    const res = await updateAirport(ap.airport_id, { is_active: !ap.is_active });
    if (!res.success) setErrorMsg(res.error || 'Failed to update airport status.');
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
              placeholder="Search name, IATA, city..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
            />
          </div>

          {/* Country filter */}
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50"
          >
            {countries.map(c => (
              <option key={c} value={c} className="bg-slate-900">{c === 'All' ? 'All Countries' : c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          <Plus size={16} />
          Add Airport Hub
        </button>
      </div>

      {/* Airport Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredAirports.map(ap => (
          <div
            key={ap.airport_id}
            className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between h-[210px] relative transition-all ${
              ap.is_active ? 'border-slate-800/80 hover:border-slate-700' : 'border-red-900/20 opacity-60'
            }`}
          >
            <div>
              {/* IATA and Active Indicator */}
              <div className="flex justify-between items-start">
                <span className="bg-blue-950 text-blue-400 border border-blue-900/30 px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-widest">
                  {ap.iata_code}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  ap.is_active ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' : 'bg-red-950/40 text-red-400 border border-red-900/20'
                }`}>
                  {ap.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Names */}
              <h3 className="font-bold text-sm text-slate-200 mt-4 leading-snug">{ap.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{ap.city}, {ap.country}</p>
            </div>

            {/* Terminals & Actions */}
            <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase">
                <Map size={12} className="text-slate-600" />
                {ap.terminals} Terminals
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(ap)}
                  className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all"
                  title="Edit details"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => toggleDeactivate(ap)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    ap.is_active
                      ? 'border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900/10'
                      : 'border-emerald-900/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/10'
                  }`}
                  title={ap.is_active ? 'Deactivate airport' : 'Activate airport'}
                >
                  {ap.is_active ? <X size={12} /> : <Check size={12} />}
                </button>
              </div>
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
              {editingAirport ? 'Edit Airport Hub' : 'Add New Airport'}
            </h3>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs items-center">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Airport Name</label>
                <input
                  type="text"
                  placeholder="e.g. Heathrow Airport"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">IATA Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="e.g. LHR"
                    value={iataCode}
                    onChange={e => setIataCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none font-mono uppercase tracking-widest focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Terminals</label>
                  <input
                    type="number"
                    min={1}
                    value={terminals}
                    onChange={e => setTerminals(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. London"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. United Kingdom"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
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
                {editingAirport ? 'Save Changes' : 'Add Airport'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Airports;
