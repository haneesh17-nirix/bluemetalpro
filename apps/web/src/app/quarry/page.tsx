'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
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
    onSuccess: (data: any) => {
      log.action('Quarry sale created', { invoice: data?.invoice_number });
      toast.success('Quarry sale recorded');
      qc.invalidateQueries({ queryKey: ['quarry-sales'] });
      onClose();
    },
    onError: () => { log.error('Quarry sale creation failed'); toast.error('Failed to record quarry sale'); },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-gold w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Quarry Entry</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input required type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Payment Mode *</label>
              <select required value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} className="select">
                {['cash', 'cheque', 'upi', 'neft', 'rtgs', 'credit'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Material *</label>
            <select required value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="select">
              <option value="">Select material…</option>
              {(products as any[]).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vehicle</label>
            <select value={form.vehicle_id} onChange={e => handleVehicleChange(e.target.value)} className="select">
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
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm font-medium text-amber-300">
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
          <div className="flex gap-3 mt-6 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuarryPage() {
  useEffect(() => { log.page('Quarry'); }, []);
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Quarry"
          subtitle="Stone extraction and internal transfers"
          actions={
            <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Entry
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Sales', value: filtered.length.toString(), unit: 'entries' },
              { label: 'Total Quantity', value: totalQty.toFixed(2), unit: 'MT' },
              { label: 'Total Amount', value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, unit: '' },
            ].map(c => (
              <div key={c.label} className="card p-5">
                <p className="text-xs text-white/50 uppercase font-medium mb-1">{c.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
                {c.unit && <p className="text-xs text-white/40 mt-0.5">{c.unit}</p>}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-40" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-40" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="label">Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Material or vehicle…" className="input w-full" />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Date', 'Material', 'Vehicle', 'Quantity', 'Rate', 'Amount', 'Mode'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-white/40">Loading…</td></tr>
                  ) : !filtered.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-white/30">
                        <Mountain size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No quarry sales in this period</p>
                      </td>
                    </tr>
                  ) : filtered.map((s: any) => (
                    <tr key={s.id}>
                      <td>{dayjs(s.sale_date).format('DD MMM YYYY')}</td>
                      <td className="font-medium text-white">{s.product_name}</td>
                      <td>{s.vehicle_number || '—'}</td>
                      <td>{Number(s.quantity).toFixed(2)} {s.unit}</td>
                      <td>₹{Number(s.rate).toLocaleString('en-IN')}</td>
                      <td className="font-semibold text-white">₹{Number(s.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td>
                        <span className="badge-gray uppercase">{s.payment_mode}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      {showNew && <NewQuarrySaleModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
