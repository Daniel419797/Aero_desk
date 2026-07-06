import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDatabase, Staff } from '../context/DatabaseContext';
import {
  Activity,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Menu,
  Plane,
  RefreshCw,
  Shield,
  Ticket,
  TrendingUp,
  User,
  Users,
  UserCog,
  X,
  XCircle,
  LogOut,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  allowedRoles: Staff['role'][];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', name: 'Ops Dashboard', icon: LayoutDashboard, allowedRoles: ['Super Admin', 'Reservation Agent', 'Ground Staff', 'Operations Manager', 'Finance Officer'] },
  { id: 'passengers', name: 'Passengers', icon: Users, allowedRoles: ['Super Admin', 'Reservation Agent'] },
  { id: 'airports', name: 'Airport Hubs', icon: MapPin, allowedRoles: ['Super Admin', 'Operations Manager'] },
  { id: 'aircraft', name: 'Fleet Manager', icon: Plane, allowedRoles: ['Super Admin', 'Operations Manager'] },
  { id: 'flights', name: 'Flight Planner', icon: Plane, allowedRoles: ['Super Admin', 'Operations Manager'] },
  { id: 'schedules', name: 'Flight Schedules', icon: Calendar, allowedRoles: ['Super Admin', 'Operations Manager'] },
  { id: 'bookings', name: 'Seat Booking', icon: Ticket, allowedRoles: ['Super Admin', 'Reservation Agent'] },
  { id: 'payments', name: 'Payments', icon: CreditCard, allowedRoles: ['Super Admin', 'Reservation Agent', 'Finance Officer'] },
  { id: 'boarding', name: 'Boarding Deck', icon: CheckSquare, allowedRoles: ['Super Admin', 'Ground Staff'] },
  { id: 'manifest', name: 'Flight Manifest', icon: ClipboardList, allowedRoles: ['Super Admin', 'Ground Staff', 'Finance Officer'] },
  { id: 'cancellations', name: 'Cancellations', icon: XCircle, allowedRoles: ['Super Admin', 'Reservation Agent'] },
  { id: 'flight-status', name: 'FIDS Monitor', icon: Activity, allowedRoles: ['Super Admin', 'Operations Manager', 'Ground Staff'] },
  { id: 'reports', name: 'Financials & Reports', icon: TrendingUp, allowedRoles: ['Super Admin', 'Reservation Agent', 'Finance Officer'] },
  { id: 'staff', name: 'Staff Management', icon: UserCog, allowedRoles: ['Super Admin'] },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { currentRole, refreshData, logout, currentStaff, isLoading, apiError, dataWarnings } = useDatabase();
  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname.substring(1) || 'dashboard';
  const moduleTitle = sidebarItems.find(item => item.id === currentTab)?.name || 'Dashboard';

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [location.pathname]);

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleNavigate = (id: string) => {
    navigate(`/${id}`);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-950">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 md:relative md:translate-x-0 ${
          isSidebarOpen ? 'w-[248px] translate-x-0' : 'w-[72px] -translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex min-w-0 items-center overflow-hidden"
            aria-label="Go to dashboard"
          >
            <img
              src={isSidebarOpen ? '/aerodesk-logo.png' : '/aerodesk-mark.png'}
              alt="AeroDesk"
              className={isSidebarOpen ? 'h-9 w-[176px] object-contain object-left' : 'h-9 w-9 object-contain'}
            />
          </button>
          {isSidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-2 hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:inline-flex"
              aria-label="Collapse navigation"
            >
              <ChevronLeft size={17} />
            </button>
          )}
        </div>

        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mx-auto mt-3 hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:inline-flex"
            aria-label="Expand navigation"
          >
            <Menu size={18} />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-2.5" aria-label="Primary navigation">
          <div className="space-y-0.5">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isAllowed = item.allowedRoles.includes(currentRole);
              const isActive = currentTab === item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  title={!isSidebarOpen ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex h-8 w-full items-center gap-2.5 rounded-[5px] px-2.5 text-left text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : isAllowed
                        ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        : 'text-slate-400 hover:bg-slate-50'
                  } ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                >
                  {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600" />}
                  <Icon size={14} strokeWidth={1.8} className="shrink-0" />
                  {isSidebarOpen && <span className="truncate">{item.name}</span>}
                  {!isAllowed && isSidebarOpen && (
                    <span className="ml-auto text-[9px] font-medium text-slate-400">Locked</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isLoading}
              title={!isSidebarOpen ? 'Refresh backend data' : undefined}
              className={`flex h-8 w-full items-center gap-2 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50 ${
                isSidebarOpen ? 'justify-start px-3' : 'justify-center'
              }`}
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              {isSidebarOpen && 'Refresh backend data'}
            </button>
            <button
              type="button"
              onClick={logout}
              title={!isSidebarOpen ? 'Sign out' : undefined}
              className={`flex h-8 w-full items-center gap-2 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-950 ${
                isSidebarOpen ? 'justify-start px-3' : 'justify-center'
              }`}
            >
              <LogOut size={13} />
              {isSidebarOpen && 'Sign out'}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[72px] shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(open => !open)}
            className="mr-3 inline-flex rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 md:hidden"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <h2 className="truncate text-lg font-semibold tracking-tight text-slate-950">{moduleTitle}</h2>

          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <span>Role</span>
              <span className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800">
                {currentRole}
              </span>
            </div>

            <div className="hidden h-7 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600">
                <User size={16} />
              </div>
              <div className="hidden leading-tight lg:block">
                <div className="text-xs font-semibold text-slate-900">{currentStaff?.full_name || 'AeroDesk User'}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                  <Shield size={10} className="text-blue-600" />
                  {currentRole}
                </div>
              </div>
            </div>
          </div>
        </header>

        {apiError && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
            {apiError}
          </div>
        )}

        {dataWarnings.length > 0 && (
          <details className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            <summary className="cursor-pointer text-center font-medium">
              Some live data could not be loaded ({dataWarnings.length})
            </summary>
            <ul className="mx-auto mt-2 max-w-4xl list-disc space-y-1 pl-5">
              {dataWarnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          </details>
        )}

        <main className="flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
