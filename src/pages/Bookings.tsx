import React, { useEffect, useState } from 'react';
import { useDatabase, Seat } from '../context/DatabaseContext';
import { SeatMap } from '../components/SeatMap';
import { Search, ShieldAlert, ArrowRight, CheckCircle2, DollarSign } from 'lucide-react';

export const Bookings: React.FC = () => {
  const { state, createBooking, loadFlightSeats } = useDatabase();
  const [step, setStep] = useState(1);

  // Selection states
  const [selectedPassengerId, setSelectedPassengerId] = useState<number | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  
  // Search states
  const [searchPassenger, setSearchPassenger] = useState('');
  const [searchFlight, setSearchFlight] = useState('');

  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!selectedFlightId) return;
    setSelectedSeat(null);
    void loadFlightSeats(selectedFlightId);
  }, [selectedFlightId, loadFlightSeats]);

  // 1. Filtered Passengers list
  const filteredPassengers = state.passengers.filter(p => {
    if (!p.is_active) return false;
    const term = searchPassenger.toLowerCase();
    return p.full_name.toLowerCase().includes(term) || p.passport_no.toLowerCase().includes(term);
  });

  // 2. Filtered Flights list (Only show Scheduled or Boarding)
  const filteredFlights = state.flights.filter(f => {
    if (f.status !== 'Scheduled' && f.status !== 'Boarding') return false;
    const term = searchFlight.toLowerCase();
    const origin = state.airports.find(ap => ap.airport_id === f.origin_airport_id);
    const dest = state.airports.find(ap => ap.airport_id === f.dest_airport_id);
    return (
      f.flight_no.toLowerCase().includes(term) ||
      origin?.iata_code.toLowerCase().includes(term) ||
      dest?.iata_code.toLowerCase().includes(term)
    );
  });

  // 3. Seats on selected flight
  const flightSeats = selectedFlightId 
    ? state.seats.filter(s => s.flight_id === selectedFlightId) 
    : [];

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1 && !selectedPassengerId) {
      setErrorMsg('Please select a passenger first.');
      return;
    }
    if (step === 2 && !selectedFlightId) {
      setErrorMsg('Please select a flight first.');
      return;
    }
    if (step === 3 && !selectedSeat) {
      setErrorMsg('Please select an available seat.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleCreateBooking = async () => {
    setErrorMsg('');
    if (!selectedPassengerId || !selectedFlightId || !selectedSeat) return;

    const res = await createBooking(selectedPassengerId, selectedFlightId, selectedSeat.seat_id);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create booking.');
    } else {
      setCreatedBooking(res.booking);
      setStep(5); // Success step
    }
  };

  const handleResetWizard = () => {
    setSelectedPassengerId(null);
    setSelectedFlightId(null);
    setSelectedSeat(null);
    setSearchPassenger('');
    setSearchFlight('');
    setCreatedBooking(null);
    setErrorMsg('');
    setStep(1);
  };

  // Calculations for preview
  const passenger = state.passengers.find(p => p.passenger_id === selectedPassengerId);
  const flight = state.flights.find(f => f.flight_id === selectedFlightId);
  const multiplierMap = { 'Economy': 1.0, 'Business': 1.8, 'First Class': 2.8 };
  const baseFare = flight?.base_fare || 0;
  const multiplier = selectedSeat ? multiplierMap[selectedSeat.travel_class] : 1.0;
  const totalFare = baseFare * multiplier;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header Progress */}
      {step < 5 && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono">1</span>
            Passenger
          </div>
          <ArrowRight size={14} className="text-slate-700" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono">2</span>
            Flight
          </div>
          <ArrowRight size={14} className="text-slate-700" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-400' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono">3</span>
            Seat Allocation
          </div>
          <ArrowRight size={14} className="text-slate-700" />
          <div className={`flex items-center gap-2 ${step >= 4 ? 'text-blue-400' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono">4</span>
            Verify
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-3.5 flex gap-2 text-red-400 text-xs items-center max-w-lg mx-auto">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Select Passenger */}
      {step === 1 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 1: Select Passenger</h3>
          <div className="relative w-full max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search name, passport..."
              value={searchPassenger}
              onChange={e => setSearchPassenger(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {filteredPassengers.map(p => (
              <button
                key={p.passenger_id}
                onClick={() => setSelectedPassengerId(p.passenger_id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                  selectedPassengerId === p.passenger_id
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{p.full_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{p.passport_no}</span>
                </div>
                <span className="text-[10px] text-slate-400">{p.email}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-850">
            <button
              onClick={handleNextStep}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:shadow-indigo-500/15"
            >
              Choose Flight <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Flight */}
      {step === 2 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 2: Select Flight Route</h3>
          <div className="relative w-full max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search flight no, airport..."
              value={searchFlight}
              onChange={e => setSearchFlight(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-200 ml-2 w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {filteredFlights.map(f => {
              const orig = state.airports.find(ap => ap.airport_id === f.origin_airport_id);
              const dest = state.airports.find(ap => ap.airport_id === f.dest_airport_id);
              const sched = state.flight_schedules.find(sc => sc.flight_id === f.flight_id);
              const ac = state.aircraft.find(c => c.aircraft_id === f.aircraft_id);
              const bookingsCount = state.bookings.filter(b => b.flight_id === f.flight_id && b.status !== 'Cancelled').length;

              return (
                <button
                  key={f.flight_id}
                  onClick={() => setSelectedFlightId(f.flight_id)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between h-32 transition-all ${
                    selectedFlightId === f.flight_id
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'
                  }`}
                >
                  <div className="w-full flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">{f.flight_no}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{orig?.iata_code} → {dest?.iata_code}</span>
                    </div>
                    <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">
                      {f.status}
                    </span>
                  </div>
                  
                  <div className="w-full flex justify-between items-end mt-4">
                    <span className="text-[10px] text-slate-500">
                      {sched ? new Date(sched.dep_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Seats booked: {bookingsCount}/{ac?.seat_capacity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-850">
            <button
              onClick={handlePrevStep}
              className="px-5 py-2 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl"
            >
              Back
            </button>
            <button
              onClick={handleNextStep}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:shadow-indigo-500/15"
            >
              Allocate Seat <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Seat Allocation */}
      {step === 3 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 3: Select Cabin Seat</h3>
            {selectedSeat && (
              <span className="text-xs font-bold text-blue-400">
                Selected Seat: {selectedSeat.seat_number} ({selectedSeat.travel_class})
              </span>
            )}
          </div>

          <SeatMap
            seats={flightSeats}
            selectedSeatId={selectedSeat?.seat_id || null}
            onSelectSeat={handleSeatSelect}
          />

          <div className="flex justify-between pt-4 border-t border-slate-850">
            <button
              onClick={handlePrevStep}
              className="px-5 py-2 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl"
            >
              Back
            </button>
            <button
              onClick={handleNextStep}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:shadow-indigo-500/15"
            >
              Review Booking <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Confirm */}
      {step === 4 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 4: Verify Booking details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/30 p-5 rounded-xl border border-slate-850 text-xs">
            {/* Passenger details */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Passenger Info</span>
              <div className="text-slate-200 font-semibold text-sm">{passenger?.full_name}</div>
              <div className="text-slate-400">Passport: {passenger?.passport_no}</div>
              <div className="text-slate-400">Email: {passenger?.email}</div>
            </div>

            {/* Flight details */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Flight Info</span>
              <div className="text-slate-200 font-semibold text-sm">
                Flight {flight?.flight_no} ({selectedSeat?.seat_number})
              </div>
              <div className="text-slate-400">Travel Class: {selectedSeat?.travel_class}</div>
              <div className="text-slate-400">Base Fare: ${baseFare}</div>
            </div>
          </div>

          {/* Pricing multiplier card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Dynamic Fare Calculations</span>
              <span className="text-xs text-slate-400">
                Base ${baseFare} × {selectedSeat?.travel_class} Multiplier ({multiplier}x)
              </span>
            </div>
            <div className="flex items-center text-emerald-400 font-bold text-xl">
              <DollarSign size={20} />
              {totalFare}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-850">
            <button
              onClick={handlePrevStep}
              className="px-5 py-2 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-xl"
            >
              Back
            </button>
            <button
              onClick={handleCreateBooking}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl hover:shadow-emerald-500/15"
            >
              Confirm Reservation
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Success screen */}
      {step === 5 && createdBooking && (
        <div className="glass-panel p-8 rounded-2xl border border-emerald-500/20 text-center shadow-2xl space-y-6 max-w-md mx-auto">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/20 animate-bounce">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-400">Reservation Pending Payment</h1>
            <p className="text-xs text-slate-400 mt-2">
              Seat {selectedSeat?.seat_number} on Flight {flight?.flight_no} has been reserved.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Passenger</span>
              <span className="text-slate-300 font-medium">{passenger?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold uppercase text-[9px]">PNR Reference</span>
              <span className="text-slate-200 font-mono font-bold tracking-widest">{createdBooking.pnr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Seat Assigned</span>
              <span className="text-slate-300 font-mono">{selectedSeat?.seat_number}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Amount Due</span>
              <span className="text-emerald-400 font-bold">${totalFare}</span>
            </div>
          </div>

          <button
            onClick={handleResetWizard}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg"
          >
            Create Another Booking
          </button>
        </div>
      )}
    </div>
  );
};
export default Bookings;
