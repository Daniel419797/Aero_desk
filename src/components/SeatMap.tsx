import React from 'react';
import { Seat } from '../context/DatabaseContext';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatId: number | null;
  onSelectSeat: (seat: Seat) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatId,
  onSelectSeat
}) => {
  // Group seats by rows
  const rowsMap: { [key: number]: Seat[] } = {};
  seats.forEach(seat => {
    const rowNum = parseInt(seat.seat_number.replace(/\D/g, ''));
    if (!rowsMap[rowNum]) rowsMap[rowNum] = [];
    rowsMap[rowNum].push(seat);
  });

  // Sort seats in each row alphabetically (e.g. A, B, C, D)
  Object.keys(rowsMap).forEach(rowNum => {
    rowsMap[Number(rowNum)].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
  });

  const sortedRowKeys = Object.keys(rowsMap).map(Number).sort((a, b) => a - b);

  // Styling helpers
  const getClassStyle = (travelClass: Seat['travel_class'], status: Seat['status'], isSelected: boolean) => {
    if (status === 'Occupied') {
      return 'bg-red-950/40 text-red-500 border-red-900/40 cursor-not-allowed opacity-50';
    }
    if (status === 'Reserved') {
      return 'bg-amber-950/40 text-amber-500 border-amber-900/40 cursor-not-allowed opacity-60';
    }

    // Available state styles
    if (isSelected) {
      return 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-105';
    }

    switch (travelClass) {
      case 'First Class':
        return 'border-amber-500/50 hover:bg-amber-500/10 text-amber-400 bg-amber-500/5';
      case 'Business':
        return 'border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400 bg-indigo-500/5';
      default: // Economy
        return 'border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 bg-emerald-500/5';
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 max-w-lg mx-auto shadow-inner relative">
      {/* Plane Nose Indicator */}
      <div className="w-24 h-8 bg-slate-800 rounded-t-full border-t border-x border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-8">
        Cockpit
      </div>

      {/* Row Labels & Seats Grid */}
      <div className="space-y-4 w-full">
        {sortedRowKeys.map(rowNum => {
          const rowSeats = rowsMap[rowNum];
          return (
            <div key={rowNum} className="flex items-center justify-between gap-3 w-full">
              {/* Row Number Label Left */}
              <span className="w-6 text-xs text-slate-500 font-bold text-center">
                {rowNum}
              </span>

              {/* Seats in Row */}
              <div className="flex-1 flex justify-center items-center gap-3">
                {rowSeats.map((seat, index) => {
                  const isSelected = selectedSeatId === seat.seat_id;
                  const isSeatDisabled = seat.status !== 'Available';

                  return (
                    <React.Fragment key={seat.seat_id}>
                      {/* Aisle Spacer after 2 seats */}
                      {index === 2 && (
                        <div className="w-8 flex items-center justify-center">
                          <span className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase rotate-90 select-none">
                            Aisle
                          </span>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        disabled={isSeatDisabled}
                        onClick={() => onSelectSeat(seat)}
                        className={`w-11 h-11 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all duration-200 ${getClassStyle(
                          seat.travel_class,
                          seat.status,
                          isSelected
                        )}`}
                      >
                        <span>{seat.seat_number}</span>
                        {/* Tiny seat indicator dots */}
                        <div className="w-3.5 h-1 mt-0.5 rounded-full bg-current opacity-40"></div>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Row Number Label Right */}
              <span className="w-6 text-xs text-slate-500 font-bold text-center">
                {rowNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Seat Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-8 pt-6 border-t border-slate-800/80 w-full text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-amber-500/50 bg-amber-500/5"></div>
          <span className="text-slate-400">First Class</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-indigo-500/50 bg-indigo-500/5"></div>
          <span className="text-slate-400">Business</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-emerald-500/50 bg-emerald-500/5"></div>
          <span className="text-slate-400">Economy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-600 border border-blue-500"></div>
          <span className="text-slate-400 font-semibold text-blue-400">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-950/40 border border-amber-900/40 opacity-60"></div>
          <span className="text-slate-400">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-950/40 border border-red-900/40 opacity-50"></div>
          <span className="text-slate-400">Occupied</span>
        </div>
      </div>
    </div>
  );
};
export default SeatMap;
