import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

interface ForbiddenViewProps {
  requiredRole: string;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({ requiredRole }) => {
  const { currentRole, logout } = useDatabase();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-red-500/20 text-center shadow-2xl relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20 animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <h1 className="text-2xl font-bold text-red-400 mb-2 tracking-wide uppercase">403 Access Denied</h1>
        <p className="text-slate-400 mb-6 text-sm">
          Your current role (<strong className="text-slate-200">{currentRole}</strong>) does not have permission to access this module.
        </p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-800 text-left">
          <span className="text-xs font-semibold text-slate-500 block uppercase mb-1">Required Access</span>
          <span className="text-sm text-slate-300 font-medium">
            Requires {requiredRole} privileges or specific administrative approval.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign in with another account
          </button>
          <p className="text-slate-500 text-[11px] mt-2">
            Backend permissions are attached to the authenticated staff account.
          </p>
        </div>
      </div>
    </div>
  );
};
export default ForbiddenView;
