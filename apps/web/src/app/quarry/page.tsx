'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getQuarrySales, createQuarrySale, getProducts, getVehicles } from '@/lib/api';
import { Mountain, Plus, X } from 'lucide-react';
import dayjs from 'dayjs';

function NewQuarrySaleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const [form, setForm] = useState({
    sale_date: dayjs().format('YYYY-MM-DD'),
    product_id: '', product_name: '', unit: 'MT',
    vehicle_id: '', vehicle_number: '', driver_name: '',
    quantity: '', rate: '', payment_mode: 'cash', notes: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => createQuarrySale({
      ...form,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
    }),
    onSuccess: () => {
      toast.success('Quarry sale recorded');
      qc.invalidateQueries({ queryKey: ['quarry-sales'] });
      onClose();
    },
    onError: () => toast.error('Failed to record quarry sale'),
  });

  const handleProductChange = (id: string) => {
    const p = (products as any[]).find(x => x.id === id);
    set('product_id', id);
    if (p) { set('product_name', p.name); set('unit', p.unit || 'MT'); set('rate', String(p.base_price || '')); }
  };

  const handleVehicleChange = (id: string) => {
    const v = (vehicles as any[]).find(x => x.id === id);
    set('vehicle_id', id);
    if (v) set('vehicle_number', v.vehicle_number);
  };

  const amount = Number(form.quantity) * Number(form.rate);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-[#1a3c5e] text-lg">New Quarry Sale</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input required type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Payment Mode *</label>
              <select required value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} className="input">
                {['cash', 'cheque', 'upi', 'neft', 'rtgs', 'credit'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Material *</label>
            <select required value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="input">
              <option value="">Select material…</option>
              {(products as any[]).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vehicle</label>
            <select value={form.vehicle_id} onChange={e => handleVehicleChange(e.target.value)} className="input">
              <option value="">Select vehicle…</option>
              {(vehicles as any[]).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity ({form.unit}) *</label>
              <input required type="number" min="0" step="0.01" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Rate (₹/{form.unit}) *</label>
              <input required type="number" min="0" step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)} className="input" placeholder="0.00" />
            </div>
          </div>
          {amount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm font-medium text-amber-800">
              Total: ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          )}
          <div>
            <label className="label">Driver Name</label>
            <input value={form.driver_name} onChange={e => set('driver_name', e.target.value)} className="input" placeholder="Driver name" />
          </div>
          <div>
            <label className="label">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} className="input" placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-600">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-amber-700">
              {mutation.isPending ? 'Saving…' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:3px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:7px 10px; font-size:.875rem; outline:none; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}

export default function QuarryPage() {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['quarry-sales', from, to],
    queryFn: () => getQuarrySales({ from, to }),
  });

  const filtered = (sales as any[]).filter((s: any) =>
    !search ||
    s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicle_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
  const totalQty = filtered.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3c5e]">Quarry Sales</h1>
            <p className="text-sm text-gray-500 mt-0.5">Direct stone/material dispatch records</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700">
            <Plus size={16} /> New Sale
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Sales', value: filtered.length.toString(), unit: 'entries' },
            { label: 'Total Quantity', value: totalQty.toFixed(2), unit: 'MT' },
            { label: 'Total Amount', value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, unit: '' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-[#1a3c5e] mt-1">{c.value}</p>
              {c.unit && <p className="text-xs text-gray-400">{c.unit}</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a3c5e]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a3c5e]" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Material or vehicle…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a3c5e]" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Material', 'Vehicle', 'Quantity', 'Rate', 'Amount', 'Mode'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-300">
                    <Mountain size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No quarry sales in this period</p>
                  </td>
                </tr>
              ) : filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{dayjs(s.sale_date).format('DD MMM YYYY')}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.product_name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{Number(s.quantity).toFixed(2)} {s.unit}</td>
                  <td className="px-4 py-3 text-gray-600">₹{Number(s.rate).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(s.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium uppercase">{s.payment_mode}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {showNew && <NewQuarrySaleModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
