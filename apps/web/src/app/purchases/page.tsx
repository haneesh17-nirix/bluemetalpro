'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getPurchases, createPurchase, getParties, getProducts, getVehicles } from '@/lib/api';
import { Plus, X, Package } from 'lucide-react';
import dayjs from 'dayjs';

const emptyItem = () => ({ product_id: '', product_name: '', unit: 'MT', quantity: '', rate: '', gst_rate: 5 });

function NewPurchaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: parties = [] } = useQuery({ queryKey: ['parties-supplier'], queryFn: () => getParties({ type: 'supplier' }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const [form, setForm] = useState({
    bill_number: '', purchase_date: dayjs().format('YYYY-MM-DD'),
    party_id: '', party_name: '',
    vehicle_id: '', vehicle_number: '',
    amount_paid: '0', payment_mode: 'credit', notes: '',
  });
  const [items, setItems] = useState([emptyItem()]);

  const updateItem = (i: number, field: string, value: string) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0);
  const gstTotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0) * Number(i.gst_rate) / 100, 0);
  const grandTotal = subtotal + gstTotal;

  const mutation = useMutation({
    mutationFn: () => createPurchase({
      ...form,
      amount_paid: Number(form.amount_paid),
      items: items.map(i => ({
        ...i,
        product_name: (products as any[]).find((p: any) => p.id === i.product_id)?.name || i.product_name,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        gst_rate: Number(i.gst_rate),
      })),
    }),
    onSuccess: () => {
      log.action('Purchase created', { party: form?.party_name });
      toast.success('Purchase recorded');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
    },
    onError: () => { log.error('Purchase creation failed'); toast.error('Failed to record purchase'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-gold w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Purchase Bill</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bill / Invoice No. *</label>
              <input required value={form.bill_number} onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} className="input" placeholder="e.g. SUP/2526/001" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input required type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Supplier *</label>
              <select required value={form.party_id} onChange={e => {
                const p = (parties as any[]).find((x: any) => x.id === e.target.value);
                setForm(f => ({ ...f, party_id: e.target.value, party_name: p?.name || '' }));
              }} className="select">
                <option value="">Select supplier…</option>
                {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vehicle</label>
              <select value={form.vehicle_id} onChange={e => {
                const v = (vehicles as any[]).find((x: any) => x.id === e.target.value);
                setForm(f => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number || '' }));
              }} className="select">
                <option value="">None</option>
                {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-white">Items</p>
              <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
                className="btn-ghost text-xs px-3 py-1.5">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-white/5 border border-white/10 p-3 rounded-lg">
                  <div className="col-span-4">
                    <label className="label">Product</label>
                    <select value={item.product_id} onChange={e => {
                      const p = (products as any[]).find((x: any) => x.id === e.target.value);
                      updateItem(i, 'product_id', e.target.value);
                      if (p) { updateItem(i, 'gst_rate', String(p.gst_rate)); updateItem(i, 'unit', p.unit); }
                    }} className="select">
                      <option value="">Select…</option>
                      {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Qty ({item.unit})</label>
                    <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="input" min="0" step="0.001" placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Rate (₹)</label>
                    <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} className="input" min="0" step="0.01" placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">GST %</label>
                    <select value={item.gst_rate} onChange={e => updateItem(i, 'gst_rate', e.target.value)} className="select">
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 text-right">
                    <label className="label">Amt</label>
                    <p className="text-xs font-semibold text-white/70 py-2">
                      ₹{(Number(item.quantity) * Number(item.rate)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div><p className="text-white/50 mb-1">Subtotal</p><p className="font-bold text-white">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div><p className="text-white/50 mb-1">GST</p><p className="font-bold text-white">₹{gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div><p className="text-white/50 mb-1">Grand Total</p><p className="font-bold text-lg text-white">₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} className="input" min="0" />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} className="select">
                {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Optional remarks" />
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-60">
              {mutation.isPending ? 'Saving…' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  useEffect(() => { log.page('Purchases'); }, []);
  const [showNew, setShowNew] = useState(false);
  const [from, setFrom] = useState(dayjs().format('YYYY-MM-01'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases', from, to],
    queryFn: () => getPurchases({ from, to }),
  });

  const totalAmount = (purchases as any[]).reduce((s, p) => s + Number(p.grand_total || 0), 0);
  const totalPaid = (purchases as any[]).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
  const totalDue = totalAmount - totalPaid;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Purchases"
          subtitle="Track procurement and supplier orders"
          actions={
            <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Purchase
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Purchases', value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-white' },
              { label: 'Amount Paid', value: `₹${totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
              { label: 'Balance Due', value: `₹${totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-red-400' },
            ].map(c => (
              <div key={c.label} className="card p-4">
                <p className="text-xs text-white/50 uppercase font-medium mb-1">{c.label}</p>
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card p-4 mb-5 flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-40" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-40" />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Bill No.', 'Date', 'Supplier', 'Vehicle', 'Grand Total', 'Paid', 'Balance', 'Mode'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-white/40">Loading…</td></tr>
                  ) : !(purchases as any[]).length ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center py-16 text-white/30">
                          <Package size={40} className="mb-2" />
                          <p className="text-sm">No purchases in this period</p>
                        </div>
                      </td>
                    </tr>
                  ) : (purchases as any[]).map((p: any) => (
                    <tr key={p.id}>
                      <td className="font-medium text-white">{p.bill_number}</td>
                      <td>{dayjs(p.purchase_date).format('DD/MM/YYYY')}</td>
                      <td>{p.party_name || '—'}</td>
                      <td>{p.vehicle_number || '—'}</td>
                      <td className="font-semibold text-white">₹{Number(p.grand_total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="text-emerald-400">₹{Number(p.amount_paid).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className={Number(p.balance_due) > 0 ? 'text-red-400 font-medium' : 'text-white/40'}>
                        ₹{Number(p.balance_due).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge-gray uppercase">{p.payment_mode}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      {showNew && <NewPurchaseModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
