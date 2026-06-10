'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import { getParties, createParty } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Users, TrendingUp, TrendingDown, Building2 } from 'lucide-react';

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

  const customerCount = (parties as any[]).filter((p: any) => p.type === 'customer' || p.type === 'both').length;
  const supplierCount = (parties as any[]).filter((p: any) => p.type === 'supplier' || p.type === 'both').length;

  const stats = [
    { label: 'Total Customers', value: String(customerCount), icon: Users, color: '#60a5fa' },
    { label: 'Total Suppliers', value: String(supplierCount), icon: Building2, color: '#a78bfa' },
    { label: 'Total Receivable', value: `₹${totalReceivable.toLocaleString('en-IN')}`, icon: TrendingUp, color: '#34d399' },
    { label: 'Total Payable', value: `₹${totalPayable.toLocaleString('en-IN')}`, icon: TrendingDown, color: '#f87171' },
  ];

  return (
    <AppLayout
      title="Parties"
      subtitle="Customers, suppliers, and business contacts"
      actions={
        <button
          onClick={() => { setEditParty(null); setForm(emptyForm); setShowForm(true); }}
          className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> New Party
        </button>
      }
    >
      <StatsRow stats={stats} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input" style={{ width: 256 }}
        />
        <div style={{ display: 'flex', gap: 4, background: 'rgba(14,37,68,0.6)', border: '1px solid #263d5e', padding: 4, borderRadius: 8 }}>
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
      <div className="card" style={{ overflow: 'hidden' }}>
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
                const initials = p.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, background: 'rgba(201,168,76,0.15)', color: '#e8c96a', border: '1px solid rgba(201,168,76,0.25)' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: '#c8d4e8' }}>{p.name}</p>
                          {p.email && <p className="text-xs" style={{ color: 'rgba(200,212,232,0.4)' }}>{p.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${typeBadge[p.type as PartyType]} capitalize`}>{p.type}</span>
                    </td>
                    <td style={{ color: 'rgba(200,212,232,0.7)' }}>{p.phone || '—'}</td>
                    <td>
                      {p.gstin ? (
                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(200,212,232,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {p.gstin}
                        </span>
                      ) : <span style={{ color: 'rgba(200,212,232,0.3)' }}>—</span>}
                    </td>
                    <td style={{ color: 'rgba(200,212,232,0.7)' }}>{p.city || '—'}</td>
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
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-gold w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 className="text-xl font-bold text-white">{editParty ? 'Edit Party' : 'New Party'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
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
                <div style={{ gridColumn: 'span 2' }}>
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
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Saving…' : editParty ? 'Update Party' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
