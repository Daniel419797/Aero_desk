import React, { useState } from 'react';
import { LoaderCircle, LockKeyhole, Plane, ShieldAlert } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

export const Login: React.FC = () => {
  const { login, isLoading, apiError } = useDatabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const result = await login(email.trim(), password);
    if (!result.success) setError(result.error || 'Sign in failed.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/30">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Plane size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AeroDesk</h1>
            <p className="mt-0.5 text-xs text-slate-400">Airline operations portal</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold">Staff sign in</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use the staff credentials provisioned by your AeroDesk administrator.
          </p>
        </div>

        {(error || apiError) && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700" role="alert">
            <ShieldAlert className="mt-0.5 shrink-0" size={15} />
            <span>{error || apiError}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-300">Email address</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none transition focus:border-blue-500"
              placeholder="you@aerodesk.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-300">Password</span>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3 text-slate-500" size={17} />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading && <LoaderCircle className="animate-spin" size={17} />}
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
          Access is controlled by the role attached to your backend staff account.
        </p>
      </div>
    </main>
  );
};

export default Login;
