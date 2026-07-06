import React, { useEffect, useState, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Printer, FileText, Download } from 'lucide-react';

export const Manifest: React.FC = () => {
  const { state, getFlightManifest, loadManifest } = useDatabase();
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [filterBoardingStatus, setFilterBoardingStatus] = useState('All');
  
  const manifestPrintRef = useRef<HTMLDivElement>(null);

  const activeFlights = state.flights.filter(f => f.status !== 'Cancelled');

  useEffect(() => {
    if (selectedFlightId === null && activeFlights.length > 0) {
      setSelectedFlightId(activeFlights[0].flight_id);
    }
  }, [activeFlights, selectedFlightId]);

  useEffect(() => {
    if (selectedFlightId !== null) void loadManifest(selectedFlightId);
  }, [selectedFlightId, loadManifest]);
  const selectedFlight = state.flights.find(f => f.flight_id === selectedFlightId);
  const selectedAircraft = state.aircraft.find(ac => ac.aircraft_id === selectedFlight?.aircraft_id);
  const originAirport = state.airports.find(ap => ap.airport_id === selectedFlight?.origin_airport_id);
  const destAirport = state.airports.find(ap => ap.airport_id === selectedFlight?.dest_airport_id);
  const flightSchedule = state.flight_schedules.find(sc => sc.flight_id === selectedFlightId);

  // Get manifest using our DB Context View helper
  const manifestData = selectedFlightId ? getFlightManifest(selectedFlightId) : [];

  // Filter local manifest items by boarding status
  const filteredManifest = manifestData.filter(item => {
    if (filterBoardingStatus === 'All') return true;
    return item.boarding_status === filterBoardingStatus;
  });

  const handlePrint = () => {
    // Print friendly style
    const printContent = manifestPrintRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Flight Manifest - ${selectedFlight?.flight_no || ''}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #000; background-color: #fff; }
                h1 { margin-bottom: 5px; font-size: 22px; }
                .meta { margin-bottom: 20px; font-size: 12px; color: #555; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .footer { margin-top: 30px; font-size: 10px; text-align: right; color: #888; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportCSV = () => {
    if (!selectedFlight) return;
    
    // Generate CSV string
    const headers = ['Seat', 'Passenger Name', 'Passport/NIN', 'Class', 'Ticket No', 'Booking Status', 'Boarding Status', 'Boarded At'];
    const rows = filteredManifest.map(item => [
      item.seat_number,
      item.passenger_name,
      item.passport_no,
      item.travel_class,
      item.ticket_no,
      item.booking_status,
      item.boarding_status,
      item.boarded_at || '—'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `manifest_${selectedFlight.flight_no}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBoardingBadge = (status: string) => {
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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Select Manifest Flight</label>
            <select
              value={selectedFlightId || ''}
              onChange={e => setSelectedFlightId(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer focus:border-blue-500/50"
            >
              <option value="" disabled>Select Flight...</option>
              {activeFlights.map(f => (
                <option key={f.flight_id} value={f.flight_id}>{f.flight_no} - {state.airports.find(ap => ap.airport_id === f.origin_airport_id)?.iata_code} → {state.airports.find(ap => ap.airport_id === f.dest_airport_id)?.iata_code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Boarding Status Filter</label>
            <select
              value={filterBoardingStatus}
              onChange={e => setFilterBoardingStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50"
            >
              <option value="All" className="bg-slate-900">All Passengers</option>
              <option value="Boarded" className="bg-slate-900">Boarded Only</option>
              <option value="Not Boarded" className="bg-slate-900">Not Boarded</option>
              <option value="No-Show" className="bg-slate-900">No-Show Only</option>
            </select>
          </div>
        </div>

        {selectedFlightId && (
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Printer size={15} />
              Print Manifest
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Manifest Presentation Paper Document */}
      {selectedFlightId && selectedFlight ? (
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative">
          {/* Print container wrapping element */}
          <div ref={manifestPrintRef}>
            {/* Header info */}
            <div className="border-b border-slate-800 pb-6 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
                    <FileText className="text-blue-500" size={20} />
                    PASSENGER MANIFEST
                  </h1>
                  <p className="text-slate-500 text-xs mt-1 font-mono uppercase">
                    AERODESK DIGITAL FLIGHT LOG VIEW • SECURITY RECORD
                  </p>
                </div>
                <div className="text-left md:text-right font-mono text-xs text-slate-400">
                  <div><strong>Flight:</strong> {selectedFlight.flight_no}</div>
                  <div><strong>Aircraft:</strong> {selectedAircraft?.registration_no} ({selectedAircraft?.model})</div>
                </div>
              </div>

              {/* Grid of travel meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-xs text-slate-400">
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Origin Hub</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{originAirport?.iata_code} - {originAirport?.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Destination Hub</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{destAirport?.iata_code} - {destAirport?.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Scheduled Departure</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">
                    {flightSchedule ? new Date(flightSchedule.dep_datetime).toLocaleString() : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase block">Terminal & Gate</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">
                    {flightSchedule ? `Terminal ${flightSchedule.terminal} • Gate ${flightSchedule.gate}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Manifest List Table */}
            <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="bg-slate-900 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-850">
                  <tr>
                    <th className="p-3">Seat</th>
                    <th className="p-3">Passenger Profile</th>
                    <th className="p-3">Passport / NIN</th>
                    <th className="p-3 font-mono">Ticket ID</th>
                    <th className="p-3">Booking Status</th>
                    <th className="p-3">Boarding Status</th>
                    <th className="p-3">Boarded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredManifest.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No passenger records matched selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredManifest.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 text-slate-300">
                        <td className="p-3 font-bold text-white font-mono">{item.seat_number}</td>
                        <td className="p-3 font-semibold text-slate-200">
                          {item.passenger_name}
                          <span className="text-[10px] text-slate-500 block font-normal">{item.travel_class}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{item.passport_no}</td>
                        <td className="p-3 font-mono text-slate-400">{item.ticket_no}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.booking_status === 'Confirmed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' : 'bg-red-950/40 text-red-400 border border-red-900/20'
                          }`}>
                            {item.booking_status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getBoardingBadge(item.boarding_status)}`}>
                            {item.boarding_status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.boarded_at ? new Date(item.boarded_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Print signature footer */}
            <div className="mt-8 flex justify-between items-end border-t border-slate-850 pt-6 text-[10px] text-slate-500 font-mono uppercase">
              <div>
                Report generated: {new Date().toLocaleString()}
              </div>
              <div className="text-right">
                Manifest reference: Flight {selectedFlight.flight_no} / ID {selectedFlight.flight_id}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 text-center text-slate-500 text-xs">
          Please select a flight to query manifest data.
        </div>
      )}
    </div>
  );
};
export default Manifest;
