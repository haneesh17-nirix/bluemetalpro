'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getParties, createParty } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Users, TrendingUp, TrendingDown } from 'lucide-react';

type PartyType = 'customer' | 'supplier' | 'both';

const typeBadge: Record<PartyType, string> = {
  customer: 'badge-blue',
  supplier: 'badge-gem',
  both: 'badge-gold',
};

const emptyForm = {
  name: '', type: 'customer' as PartyType, gstin: '', pan: '',
  phone: '', email: '', address: '', city: '', state: '', pincode: '',
  credit_limit: '', opening_balance: '',
};

export default function PartiesPage() {
  useEffect(() => { log.page('Parties'); }, []);
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
    onSuccess: (data: any) => {
      log.action('Party created', { name: data?.name, type: data?.party_type });
      toast.success(editParty ? 'Party updated' : 'Party added');
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.invalidateQueries({ queryKey: ['party-balances'] });
      setShowForm(false);
      setEditParty(null);
      setForm(emptyForm);
    },
    onError: () => { log.error('Party creation failed'); toast.error('Failed to save party'); },
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Parties"
          subtitle="Customers, suppliers, and business contacts"
          actions={
            <button
              onClick={() => { setEditParty(null); setForm(emptyForm); setShowForm(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> New Party
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            <div className="card p-5 flex items-center gap-4">
              <div className="bg-blue-500/20 w-11 h-11 rounded-lg flex items-center justify-center">
                <Users size={22} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(parties as any[]).length}</p>
                <p className="text-sm text-white/50">Total Parties</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="bg-emerald-500/20 w-11 h-11 rounded-lg flex items-center justify-center">
                <TrendingUp size={22} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₹{totalReceivable.toLocaleString('en-IN')}</p>
                <p className="text-sm text-white/50">Total Receivable</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="bg-red-500/20 w-11 h-11 rounded-lg flex items-center justify-center">
                <TrendingDown size={22} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₹{totalPayable.toLocaleString('en-IN')}</p>
                <p className="text-sm text-white/50">Total Payable</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-5">
            <input
              type="text"
              placeholder="Search by name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-64"
            />
            <div className="flex gap-1 bg-[#0e2544]/60 border border-[#263d5e] p-1 rounded-lg">
              {[['', 'All'], ['customer', 'Customers'], ['supplier', 'Suppliers'], ['both', 'Both']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === v ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Name', 'Type', 'Phone', 'GSTIN', 'City', 'Balance', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(parties as any[]).map((p: any) => {
                  const bal = Number(balanceMap[p.id] || 0);
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-white">{p.name}</p>
                        {p.email && <p className="text-xs text-white/40">{p.email}</p>}
                      </td>
                      <td>
                        <span className={`${typeBadge[p.type as PartyType]} capitalize`}>{p.type}</span>
                      </td>
                      <td className="text-white/70">{p.phone || '—'}</td>
                      <td className="font-mono text-xs text-white/60">{p.gstin || '—'}</td>
                      <td className="text-white/70">{p.city || '—'}</td>
                      <td>
                        {bal === 0 ? (
                          <span className="badge-gray">Settled</span>
                        ) : (
                          <span className={bal > 0 ? 'badge-red' : 'badge-gem'}>
                            ₹{Math.abs(bal).toLocaleString('en-IN')} {bal > 0 ? 'Dr' : 'Cr'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => openEdit(p)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!(parties as any[]).length && (
              <p className="text-center text-white/30 py-10">No parties found</p>
            )}
          </div>

        </main>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editParty ? 'Edit Party' : 'New Party'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Party Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Customer / Supplier name" />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as PartyType }))} className="select">
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
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving…' : editParty ? 'Update Party' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
