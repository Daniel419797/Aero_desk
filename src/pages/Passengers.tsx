import React, { useState } from 'react';
import { useDatabase, Passenger } from '../context/DatabaseContext';
import { Search, Plus, Edit2, ShieldAlert, History, UserCheck, UserX } from 'lucide-react';

export const Passengers: React.FC = () => {
  const { state, registerPassenger, updatePassenger } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [selectedHistoryPassenger, setSelectedHistoryPassenger] = useState<Passenger | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [nationality, setNationality] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Search
  const filteredPassengers = state.passengers.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) ||
      p.passport_no.toLowerCase().includes(term) ||
      p.phone.toLowerCase().includes(term)
    );
  });

  const openRegisterModal = () => {
    setEditingPassenger(null);
    setFullName('');
    setPassportNo('');
    setDob('');
    setGender('Male');
    setNationality('');
    setPhone('');
    setEmail('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Passenger) => {
    setEditingPassenger(p);
    setFullName(p.full_name);
    setPassportNo(p.passport_no);
    setDob(p.dob);
    setGender(p.gender);
    setNationality(p.nationality);
    setPhone(p.phone);
    setEmail(p.email);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !passportNo || !dob || !nationality || !phone || !email) {
      setErrorMsg('All fields are required.');
      return;
    }

    const passengerData = {
      full_name: fullName,
      passport_no: passportNo.toUpperCase().trim(),
      dob,
      gender,
      nationality,
      phone,
      email,
    };

    if (editingPassenger) {
      const res = await updatePassenger(editingPassenger.passenger_id, passengerData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update passenger.');
      } else {
        setIsModalOpen(false);
      }
    } else {
      const res = await registerPassenger(passengerData);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to register passenger.');
      } else {
        setIsModalOpen(false);
      }
    }
  };

  const toggleDeactivate = async (p: Passenger) => {
    const res = await updatePassenger(p.passenger_id, { is_active: !p.is_active });
    if (!res.success) setErrorMsg(res.error || 'Failed to update passenger status.');
  };

  // Get passenger travel history
  const getTravelHistory = (passengerId: number) => {
    const history = state.bookings
      .filter(b => b.passenger_id === passengerId)
      .map(b => {
        const flight = state.flights.find(f => f.flight_id === b.flight_id);
        const sched = state.flight_schedules.find(sc => sc.flight_id === b.flight_id);
        const ticket = state.tickets.find(t => t.booking_id === b.booking_id);
        const payment = state.payments.find(p => p.booking_id === b.booking_id);
        const boarding = state.boarding_records.find(br => br.booking_id === b.booking_id);

        return {
          booking_id: b.booking_id,
          flight_no: flight?.flight_no || 'Unknown',
          origin: state.airports.find(ap => ap.airport_id === flight?.origin_airport_id)?.iata_code || '???',
          dest: state.airports.find(ap => ap.airport_id === flight?.dest_airport_id)?.iata_code || '???',
          dep_time: sched?.dep_datetime || '',
          pnr: b.pnr,
          ticket_no: ticket?.ticket_no || 'N/A',
          fare: ticket?.fare_amount || 0,
          payment_status: payment?.status || 'Pending',
          booking_status: b.status,
          boarding_status: boarding?.status || 'Not Boarded'
        };
      });
    return history;
  };

  const travelHistory = selectedHistoryPassenger ? getTravelHistory(selectedHistoryPassenger.passenger_id) : [];

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500/50">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search name, passport, phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
          />
        </div>
        <button
          onClick={openRegisterModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          <Plus size={16} />
          Register Passenger
        </button>
      </div>

      {/* Passengers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPassengers.map(p => (
          <div
            key={p.passenger_id}
            className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between h-[230px] transition-all relative ${
              p.is_active ? 'border-slate-800/80 hover:border-slate-700' : 'border-red-900/20 opacity-60'
            }`}
          >
            {/* Status dot */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/20 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{p.is_active ? 'Active' : 'Deactivated'}</span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-200 leading-tight pr-16">{p.full_name}</h3>
              <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Passport: {p.passport_no}</p>

              {/* Grid of contact details */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4 text-xs text-slate-400">
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Nationality</span>
                  <span className="truncate block mt-0.5">{p.nationality}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Date of Birth</span>
                  <span className="truncate block mt-0.5">{p.dob}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Email</span>
                  <span className="truncate block mt-0.5" title={p.email}>{p.email}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Phone</span>
                  <span className="truncate block mt-0.5">{p.phone}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-850">
              <button
                onClick={() => openEditModal(p)}
                className="flex-1 py-1.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 size={12} />
                Edit Profile
              </button>
              <button
                onClick={() => setSelectedHistoryPassenger(p)}
                className="flex-1 py-1.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <History size={12} />
                History
              </button>
              <button
                onClick={() => toggleDeactivate(p)}
                disabled={!p.is_active}
                className={`py-1.5 px-2.5 rounded-lg border transition-all ${
                  p.is_active
                    ? 'border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900/10'
                    : 'border-emerald-900/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/10'
                }`}
                title={p.is_active ? 'Deactivate profile' : 'Reactivation is not supported by the backend'}
              >
                {p.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Travel History Panel Modal */}
      {selectedHistoryPassenger && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel max-w-3xl w-full p-6 rounded-2xl border border-slate-800 shadow-2xl relative flex flex-col max-h-[85vh]">
            <h3 className="text-base font-bold text-white mb-1">Travel History</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedHistoryPassenger.full_name} ({selectedHistoryPassenger.passport_no})</p>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {travelHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">No flights booked or travel logs found.</div>
              ) : (
                <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Flight</th>
                        <th className="p-3">Route</th>
                        <th className="p-3">PNR</th>
                        <th className="p-3">Ticket</th>
                        <th className="p-3 text-right">Fare Paid</th>
                        <th className="p-3">Booking</th>
                        <th className="p-3">Boarding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {travelHistory.map(h => (
                        <tr key={h.booking_id} className="hover:bg-slate-900/20 text-slate-300">
                          <td className="p-3 font-semibold text-slate-100">{h.flight_no}</td>
                          <td className="p-3">{h.origin} → {h.dest}</td>
                          <td className="p-3 font-mono">{h.pnr}</td>
                          <td className="p-3 font-mono">{h.ticket_no}</td>
                          <td className="p-3 text-right">${h.fare}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              h.booking_status === 'Confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                              h.booking_status === 'Cancelled' ? 'bg-red-950 text-red-400 border border-red-900/30' :
                              'bg-amber-950 text-amber-400 border border-amber-900/30'
                            }`}>
                              {h.booking_status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              h.boarding_status === 'Boarded' ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
                              h.boarding_status === 'No-Show' ? 'bg-red-950 text-red-400 border border-red-900/30' :
                              'bg-slate-950 text-slate-400 border border-slate-850'
                            }`}>
                              {h.boarding_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedHistoryPassenger(null)}
              className="mt-6 w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Close History
            </button>
          </div>
        </div>
      )}

      {/* Register/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl relative flex flex-col space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              {editingPassenger ? 'Edit Passenger Profile' : 'Register New Passenger'}
            </h3>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs items-center">
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Passport / NIN</label>
                  <input
                    type="text"
                    placeholder="e.g. P-US123456"
                    value={passportNo}
                    onChange={e => setPassportNo(e.target.value)}
                    disabled={Boolean(editingPassenger)}
                    title={editingPassenger ? 'The backend does not allow passport number changes.' : undefined}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  >
                    <option value="Male" className="bg-slate-900">Male</option>
                    <option value="Female" className="bg-slate-900">Female</option>
                    <option value="Other" className="bg-slate-900">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Nationality</label>
                  <input
                    type="text"
                    placeholder="e.g. United States"
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 555 123 4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500/50"
                  required
                />
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
                {editingPassenger ? 'Save Changes' : 'Register Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Passengers;
