'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getParties, createParty } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Users, TrendingUp, TrendingDown } from 'lucide-react';

type PartyType = 'customer' | 'supplier' | 'both';

const typeColors: Record<PartyType, string> = {
  customer: 'bg-blue-100 text-blue-700',
  supplier: 'bg-purple-100 text-purple-700',
  both: 'bg-green-100 text-green-700',
};

const emptyForm = {
  name: '', type: 'customer' as PartyType, gstin: '', pan: '',
  phone: '', email: '', address: '', city: '', state: '', pincode: '',
  credit_limit: '', opening_balance: '',
};

export default function PartiesPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editParty, setEditParty] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: parties = [] } = useQuery({
    queryKey: ['parties', typeFilter, search],
    queryFn: () => getParties({ type: typeFilter || undefined, search: search || undefined }),
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['party-balances'],
    queryFn: () => api.get('/ledger/balances').then(r => r.data),
  });

  const balanceMap = Object.fromEntries((balances as any[]).map((b: any) => [b.id, b.total_balance]));

  const createMutation = useMutation({
    mutationFn: (data: any) => editParty ? api.put(`/parties/${editParty.id}`, data).then(r => r.data) : createParty(data),
    onSuccess: () => {
      toast.success(editParty ? 'Party updated' : 'Party added');
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.invalidateQueries({ queryKey: ['party-balances'] });
      setShowForm(false);
      setEditParty(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to save party'),
  });

  const openEdit = (party: any) => {
    setEditParty(party);
    setForm({ ...emptyForm, ...party, credit_limit: String(party.credit_limit || ''), opening_balance: String(party.opening_balance || '') });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, credit_limit: Number(form.credit_limit) || 0, opening_balance: Number(form.opening_balance) || 0 });
  };

  const totalReceivable = (parties as any[]).filter((p: any) => p.type !== 'supplier').reduce((s, p) => s + Math.max(0, Number(balanceMap[p.id] || 0)), 0);
  const totalPayable = (parties as any[]).filter((p: any) => p.type !== 'customer').reduce((s, p) => s + Math.max(0, -Number(balanceMap[p.id] || 0)), 0);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">Parties</h1>
          <button onClick={() => { setEditParty(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors">
            <Plus size={18} /> Add Party
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="bg-blue-500 w-11 h-11 rounded-lg flex items-center justify-center">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(parties as any[]).length}</p>
              <p className="text-sm text-gray-500">Total Parties</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="bg-green-500 w-11 h-11 rounded-lg flex items-center justify-center">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{totalReceivable.toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-500">Total Receivable</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="bg-red-500 w-11 h-11 rounded-lg flex items-center justify-center">
              <TrendingDown size={22} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{totalPayable.toLocaleString('en-IN')}</p>
              <p className="text-sm text-gray-500">Total Payable</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input type="text" placeholder="Search by name or phone…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-[#1a3c5e] outline-none" />
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[['', 'All'], ['customer', 'Customers'], ['supplier', 'Suppliers'], ['both', 'Both']].map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === v ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a3c5e] text-white">
              <tr>
                {['Name', 'Type', 'Phone', 'GSTIN', 'City', 'Balance', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(parties as any[]).map((p: any, i: number) => {
                const bal = Number(balanceMap[p.id] || 0);
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[p.type as PartyType]}`}>{p.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.gstin || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${bal > 0 ? 'text-red-600' : bal < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {bal === 0 ? 'Settled' : `₹${Math.abs(bal).toLocaleString('en-IN')} ${bal > 0 ? 'Dr' : 'Cr'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(p)} className="text-[#1a3c5e] hover:underline text-xs font-medium">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!(parties as any[]).length && <p className="text-center text-gray-400 py-10">No parties found</p>}
        </div>

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-[#1a3c5e]">{editParty ? 'Edit Party' : 'Add Party'}</h2>
                <button onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Party Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Customer / Supplier name" />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PartyType }))} className="input">
                      <option value="customer">Customer</option>
                      <option value="supplier">Supplier</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="Mobile number" />
                  </div>
                  <div>
                    <label className="label">GSTIN</label>
                    <input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} className="input" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  </div>
                  <div>
                    <label className="label">PAN</label>
                    <input value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} className="input" placeholder="AAAAA0000A" maxLength={10} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} className="input" maxLength={6} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" rows={2} />
                  </div>
                  <div>
                    <label className="label">Credit Limit (₹)</label>
                    <input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} className="input" min="0" />
                  </div>
                  {!editParty && (
                    <div>
                      <label className="label">Opening Balance (₹)</label>
                      <input type="number" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} className="input" placeholder="+ receivable / - payable" />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium hover:bg-[#2563a8] disabled:opacity-60">
                    {createMutation.isPending ? 'Saving…' : editParty ? 'Update Party' : 'Add Party'}
                  </button>
                </div>
              </form>
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
