'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getUsers, createUser, updateUser } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';

type UserRole = 'admin' | 'sales_operator' | 'accounts' | 'report_viewer' | 'vehicle_manager' | 'quarry_operator';

const roleConfig: Record<UserRole, { label: string; badge: string; permissions: string[] }> = {
  admin: {
    label: 'Admin',
    badge: 'badge-red',
    permissions: ['Full access to all modules', 'User management', 'Company config', 'Delete / cancel records'],
  },
  sales_operator: {
    label: 'Sales Operator',
    badge: 'badge-blue',
    permissions: ['Create sales invoices', 'Add vehicles', 'Manage customers', 'Record receipts'],
  },
  accounts: {
    label: 'Accounts',
    badge: 'badge-gold',
    permissions: ['Sales & purchases', 'Ledger & receipts', 'Wages & payroll', 'All reports'],
  },
  report_viewer: {
    label: 'Report Viewer',
    badge: 'badge-gem',
    permissions: ['View all reports', 'View sales list', 'No create/edit access'],
  },
  vehicle_manager: {
    label: 'Vehicle Manager',
    badge: 'badge-gold',
    permissions: ['Add & edit vehicles', 'Maintenance records', 'Asset management'],
  },
  quarry_operator: {
    label: 'Quarry Operator',
    badge: 'badge-gray',
    permissions: ['Quarry sales entry only', 'View quarry reports'],
  },
};

const emptyForm = { name: '', email: '', phone: '', role: 'sales_operator' as UserRole, password: '', is_active: true };

export default function UsersPage() {
  useEffect(() => { log.page('Users'); }, []);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [resetModal, setResetModal] = useState<{ user: any; password: string } | null>(null);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editUser ? updateUser(editUser.id, data) : createUser(data),
    onSuccess: (data: any) => {
      log.action('User created', { email: data?.email, role: data?.role });
      toast.success(editUser ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditUser(null);
      setForm(emptyForm);
    },
    onError: (err: any) => { log.error('User creation failed'); toast.error(err.response?.data?.error || 'Failed to save user'); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.put(`/users/${id}`, { is_active }).then(r => r.data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }).then(r => r.data),
    onSuccess: () => { toast.success('Password reset'); setResetModal(null); },
    onError: () => toast.error('Failed to reset password'),
  });

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, phone: user.phone || '', role: user.role, password: '', is_active: user.is_active });
    setShowForm(true);
  };

  const roleGroups = Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][];

  const pageActions = (
    <button
      onClick={() => { setEditUser(null); setForm(emptyForm); setShowForm(true); }}
      className="btn-primary flex items-center gap-2 text-sm"
    >
      <Plus size={16} /> Add User
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Users" subtitle="Team accounts and access control" actions={pageActions} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Role reference cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {roleGroups.map(([role, cfg]) => (
              <div key={role} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={15} className="text-[#c9a84c]" />
                  <span className={cfg.badge}>{cfg.label}</span>
                  <span className="text-xs text-white/30 ml-auto">
                    {(users as any[]).filter((u: any) => u.role === role && u.is_active).length} active
                  </span>
                </div>
                <ul className="space-y-1">
                  {cfg.permissions.map(p => (
                    <li key={p} className="text-xs text-white/50 flex gap-1.5">
                      <span className="text-emerald-400 mt-0.5">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Users table */}
          <div className="table-wrapper">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Name', 'Email', 'Phone', 'Role', 'Status', 'Created', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users as any[]).map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium text-white">{u.name}</td>
                    <td className="text-white/60">{u.email}</td>
                    <td className="text-white/50">{u.phone || '—'}</td>
                    <td>
                      <span className={roleConfig[u.role as UserRole]?.badge || 'badge-gray'}>
                        {roleConfig[u.role as UserRole]?.label || u.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${u.is_active ? 'badge-gem' : 'badge-red'}`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-white/40 text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(u)} className="text-xs text-[#c9a84c] hover:underline font-medium">Edit</button>
                        <button onClick={() => setResetModal({ user: u, password: '' })} className="text-xs text-white/50 hover:text-white hover:underline font-medium">Reset pwd</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(users as any[]).length && <p className="text-center text-white/30 py-10">No users found</p>}
          </div>

        </main>
      </div>

      {/* Add/Edit User modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" disabled={!!editUser} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="select">
                    {roleGroups.map(([r, cfg]) => <option key={r} value={r}>{cfg.label}</option>)}
                  </select>
                  <p className="text-xs text-white/30 mt-1">
                    {roleConfig[form.role]?.permissions.slice(0, 2).join(' · ')}
                  </p>
                </div>
                {!editUser && (
                  <div>
                    <label className="label">Password *</label>
                    <div className="relative">
                      <input required type={showPassword ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="input pr-10" minLength={8} placeholder="Min 8 characters" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShowPassword(s => !s)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
                {editUser && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    <label htmlFor="is_active" className="text-sm text-white/70">Active (can log in)</label>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-60">
                  {saveMutation.isPending ? 'Saving…' : editUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white mb-1">Reset Password</h2>
            <p className="text-sm text-white/50 mb-4">Set a new password for <strong className="text-white">{resetModal.user.name}</strong></p>
            <div className="relative mb-4">
              <input type={showPassword ? 'text' : 'password'} value={resetModal.password}
                onChange={e => setResetModal(m => m ? { ...m, password: e.target.value } : m)}
                className="input pr-10" minLength={8} placeholder="New password (min 8 chars)" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" onClick={() => setShowPassword(s => !s)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resetModal.user.id, password: resetModal.password })}
                disabled={resetPasswordMutation.isPending || resetModal.password.length < 8}
                className="btn-primary flex-1 disabled:opacity-60"
              >
                {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
