'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getUsers, createUser, updateUser } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';

type UserRole = 'admin' | 'sales_operator' | 'accounts' | 'report_viewer' | 'vehicle_manager' | 'quarry_operator';

const roleConfig: Record<UserRole, { label: string; color: string; permissions: string[] }> = {
  admin: {
    label: 'Admin',
    color: 'bg-red-100 text-red-700',
    permissions: ['Full access to all modules', 'User management', 'Company config', 'Delete / cancel records'],
  },
  sales_operator: {
    label: 'Sales Operator',
    color: 'bg-blue-100 text-blue-700',
    permissions: ['Create sales invoices', 'Add vehicles', 'Manage customers', 'Record receipts'],
  },
  accounts: {
    label: 'Accounts',
    color: 'bg-purple-100 text-purple-700',
    permissions: ['Sales & purchases', 'Ledger & receipts', 'Wages & payroll', 'All reports'],
  },
  report_viewer: {
    label: 'Report Viewer',
    color: 'bg-green-100 text-green-700',
    permissions: ['View all reports', 'View sales list', 'No create/edit access'],
  },
  vehicle_manager: {
    label: 'Vehicle Manager',
    color: 'bg-amber-100 text-amber-700',
    permissions: ['Add & edit vehicles', 'Maintenance records', 'Asset management'],
  },
  quarry_operator: {
    label: 'Quarry Operator',
    color: 'bg-orange-100 text-orange-700',
    permissions: ['Quarry sales entry only', 'View quarry reports'],
  },
};

const emptyForm = { name: '', email: '', phone: '', role: 'sales_operator' as UserRole, password: '', is_active: true };

export default function UsersPage() {
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
    onSuccess: () => {
      toast.success(editUser ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setEditUser(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save user'),
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

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">User Management</h1>
          <button onClick={() => { setEditUser(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors text-sm font-medium">
            <Plus size={16} /> Add User
          </button>
        </div>

        {/* Role reference cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {roleGroups.map(([role, cfg]) => (
            <div key={role} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-[#1a3c5e]" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{(users as any[]).filter((u: any) => u.role === role && u.is_active).length} active</span>
              </div>
              <ul className="space-y-0.5">
                {cfg.permissions.map(p => (
                  <li key={p} className="text-xs text-gray-500 flex gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a3c5e] text-white">
              <tr>
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users as any[]).map((u: any, i: number) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig[u.role as UserRole]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {roleConfig[u.role as UserRole]?.label || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActiveMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-xs text-[#1a3c5e] hover:underline font-medium">Edit</button>
                      <button onClick={() => setResetModal({ user: u, password: '' })} className="text-xs text-amber-600 hover:underline font-medium">Reset pwd</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(users as any[]).length && <p className="text-center text-gray-400 py-10">No users found</p>}
        </div>

        {/* Add/Edit User modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-[#1a3c5e]">{editUser ? 'Edit User' : 'Add User'}</h2>
                <button onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="p-6">
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
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="input">
                      {roleGroups.map(([r, cfg]) => <option key={r} value={r}>{cfg.label}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
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
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(s => !s)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                  {editUser && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                      <label htmlFor="is_active" className="text-sm text-gray-700">Active (can log in)</label>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {saveMutation.isPending ? 'Saving…' : editUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset password modal */}
        {resetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-[#1a3c5e] mb-1">Reset Password</h2>
              <p className="text-sm text-gray-500 mb-4">Set a new password for <strong>{resetModal.user.name}</strong></p>
              <div className="relative mb-4">
                <input type={showPassword ? 'text' : 'password'} value={resetModal.password}
                  onChange={e => setResetModal(m => m ? { ...m, password: e.target.value } : m)}
                  className="input pr-10" minLength={8} placeholder="New password (min 8 chars)" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResetModal(null)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={() => resetPasswordMutation.mutate({ id: resetModal.user.id, password: resetModal.password })}
                  disabled={resetPasswordMutation.isPending || resetModal.password.length < 8}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:4px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:.875rem; outline:none; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}
