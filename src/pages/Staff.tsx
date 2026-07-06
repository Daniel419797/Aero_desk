import React, { useMemo, useState } from 'react';
import { Plus, Search, ShieldAlert, UserCog } from 'lucide-react';
import { type Staff as StaffMember, useDatabase } from '../context/DatabaseContext';

const ROLES: StaffMember['role'][] = ['Super Admin', 'Operations Manager', 'Reservation Agent', 'Ground Staff', 'Finance Officer'];

export const Staff: React.FC = () => {
  const { state, currentStaff, addStaff, updateStaff } = useDatabase();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('Reservation Agent');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.staff.filter(member => !term
      || member.full_name.toLowerCase().includes(term)
      || member.email.toLowerCase().includes(term)
      || member.role.toLowerCase().includes(term));
  }, [search, state.staff]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError('Name and email are required. Password must contain at least 8 characters.');
      return;
    }
    const result = await addStaff({ full_name: fullName.trim(), email: email.trim(), role, password });
    if (!result.success) {
      setError(result.error || 'Unable to create staff account.');
      return;
    }
    setFullName(''); setEmail(''); setPassword(''); setRole('Reservation Agent'); setCreateOpen(false);
  };

  const changeRole = async (member: StaffMember, nextRole: StaffMember['role']) => {
    setBusyId(member.staff_id); setError('');
    const result = await updateStaff(member.staff_id, { role: nextRole });
    if (!result.success) setError(result.error || 'Unable to update staff role.');
    setBusyId(null);
  };

  const toggleStatus = async (member: StaffMember) => {
    if (member.staff_id === currentStaff?.staff_id) {
      setError('You cannot deactivate your own active session.');
      return;
    }
    setBusyId(member.staff_id); setError('');
    const result = await updateStaff(member.staff_id, { is_active: !member.is_active });
    if (!result.success) setError(result.error || 'Unable to update staff status.');
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div><h1 className="text-xl font-semibold text-slate-950">Staff management</h1><p className="mt-1 text-xs text-slate-500">Create accounts and maintain backend-enforced roles.</p></div>
        <button type="button" onClick={() => { setCreateOpen(true); setError(''); }} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"><Plus size={15} />Add staff member</button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700" role="alert"><ShieldAlert size={16} />{error}</div>}

      <div className="flex max-w-sm items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-500 focus-within:border-blue-500"><Search size={16} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search staff..." className="ml-2 w-full border-0 bg-transparent text-xs text-slate-900 outline-none" /></div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-4">Staff member</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{filteredStaff.map(member => (
            <tr key={member.staff_id}>
              <td className="p-4 font-semibold text-slate-900">{member.full_name}{member.staff_id === currentStaff?.staff_id && <span className="ml-2 text-[9px] font-medium uppercase text-blue-600">You</span>}</td>
              <td className="p-4 text-slate-600">{member.email}</td>
              <td className="p-4"><select value={member.role} disabled={busyId === member.staff_id} onChange={event => void changeRole(member, event.target.value as StaffMember['role'])} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 disabled:opacity-50">{ROLES.map(item => <option key={item}>{item}</option>)}</select></td>
              <td className="p-4"><span className={`rounded px-2 py-1 text-[9px] font-semibold uppercase ${member.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{member.is_active ? 'Active' : 'Inactive'}</span></td>
              <td className="p-4 text-right"><button type="button" disabled={busyId === member.staff_id || member.staff_id === currentStaff?.staff_id} onClick={() => void toggleStatus(member)} className="rounded-md border border-slate-300 px-3 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">{member.is_active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}{filteredStaff.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No staff members match this search.</td></tr>}</tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="staff-create-heading">
          <form onSubmit={handleCreate} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="staff-create-heading" className="flex items-center gap-2 text-base font-semibold text-slate-950"><UserCog size={18} className="text-blue-600" />Create staff account</h2>
            {error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</div>}
            <label className="block text-xs font-medium text-slate-700">Full name<input required value={fullName} onChange={event => setFullName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            <label className="block text-xs font-medium text-slate-700">Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            <label className="block text-xs font-medium text-slate-700">Role<select value={role} onChange={event => setRole(event.target.value as StaffMember['role'])} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none">{ROLES.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-700">Temporary password<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-xs text-slate-700">Cancel</button><button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700">Create account</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Staff;
