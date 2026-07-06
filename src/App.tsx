import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ForbiddenView } from './components/ForbiddenView';
import { ErrorBoundary } from './components/ErrorBoundary';

import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Passengers = lazy(() => import('./pages/Passengers'));
const Airports = lazy(() => import('./pages/Airports'));
const Aircraft = lazy(() => import('./pages/Aircraft'));
const Flights = lazy(() => import('./pages/Flights'));
const FlightSchedules = lazy(() => import('./pages/FlightSchedules'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Payments = lazy(() => import('./pages/Payments'));
const Boarding = lazy(() => import('./pages/Boarding'));
const Manifest = lazy(() => import('./pages/Manifest'));
const Cancellations = lazy(() => import('./pages/Cancellations'));
const FlightStatus = lazy(() => import('./pages/FlightStatus'));
const Reports = lazy(() => import('./pages/Reports'));
const Staff = lazy(() => import('./pages/Staff'));

const AppContent: React.FC = () => {
  const { currentRole, isAuthenticated, isInitializing } = useDatabase();
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Connecting to AeroDesk…
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  // Role permissions checking (BR-013)
  const isTabAllowed = (tab: string, role: string): boolean => {
    if (role === 'Super Admin') return true;
    if (tab === 'dashboard') return true;

    switch (role) {
      case 'Reservation Agent':
        return ['passengers', 'bookings', 'payments', 'cancellations', 'reports'].includes(tab);
      case 'Ground Staff':
        return ['boarding', 'manifest', 'flight-status'].includes(tab);
      case 'Operations Manager':
        return ['airports', 'aircraft', 'flights', 'schedules', 'flight-status'].includes(tab);
      case 'Finance Officer':
        return ['payments', 'reports', 'manifest'].includes(tab);
      default:
        return false;
    }
  };

  const renderRouteElement = (tab: string, element: React.ReactNode) => {
    if (!isTabAllowed(tab, currentRole)) {
      // Determine what role is required
      let requiredRole = 'Super Admin';
      if (['airports', 'aircraft', 'flights', 'schedules'].includes(tab)) {
        requiredRole = 'Operations Manager';
      } else if (['boarding'].includes(tab)) {
        requiredRole = 'Ground Staff';
      } else if (['passengers', 'bookings', 'cancellations'].includes(tab)) {
        requiredRole = 'Reservation Agent';
      } else if (['manifest'].includes(tab)) {
        requiredRole = 'Ground Staff / Finance Officer';
      } else if (['payments', 'reports'].includes(tab)) {
        requiredRole = 'Reservation Agent / Finance Officer';
      }
      return <ForbiddenView requiredRole={requiredRole} />;
    }

    return element;
  };

  return (
    <DashboardLayout>
      <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Loading module…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={renderRouteElement('dashboard', <Dashboard />)} />
          <Route path="/passengers" element={renderRouteElement('passengers', <Passengers />)} />
          <Route path="/airports" element={renderRouteElement('airports', <Airports />)} />
          <Route path="/aircraft" element={renderRouteElement('aircraft', <Aircraft />)} />
          <Route path="/flights" element={renderRouteElement('flights', <Flights />)} />
          <Route path="/schedules" element={renderRouteElement('schedules', <FlightSchedules />)} />
          <Route path="/bookings" element={renderRouteElement('bookings', <Bookings />)} />
          <Route path="/payments" element={renderRouteElement('payments', <Payments />)} />
          <Route path="/boarding" element={renderRouteElement('boarding', <Boarding />)} />
          <Route path="/manifest" element={renderRouteElement('manifest', <Manifest />)} />
          <Route path="/cancellations" element={renderRouteElement('cancellations', <Cancellations />)} />
          <Route path="/flight-status" element={renderRouteElement('flight-status', <FlightStatus />)} />
          <Route path="/reports" element={renderRouteElement('reports', <Reports />)} />
          <Route path="/staff" element={renderRouteElement('staff', <Staff />)} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DatabaseProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </DatabaseProvider>
    </ErrorBoundary>
  );
};

export default App;
