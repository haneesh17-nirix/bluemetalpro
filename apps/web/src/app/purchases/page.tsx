'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
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
      toast.success('Purchase recorded');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
    },
    onError: () => toast.error('Failed to record purchase'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-[#1a3c5e]">New Purchase Bill</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
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
              }} className="input">
                <option value="">Select supplier…</option>
                {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vehicle</label>
              <select value={form.vehicle_id} onChange={e => {
                const v = (vehicles as any[]).find((x: any) => x.id === e.target.value);
                setForm(f => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number || '' }));
              }} className="input">
                <option value="">None</option>
                {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-gray-700">Items</p>
              <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
                className="text-xs text-[#1a3c5e] font-medium hover:underline">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                  <div className="col-span-4">
                    <label className="label">Product</label>
                    <select value={item.product_id} onChange={e => {
                      const p = (products as any[]).find((x: any) => x.id === e.target.value);
                      updateItem(i, 'product_id', e.target.value);
                      if (p) { updateItem(i, 'gst_rate', String(p.gst_rate)); updateItem(i, 'unit', p.unit); }
                    }} className="input">
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
                    <select value={item.gst_rate} onChange={e => updateItem(i, 'gst_rate', e.target.value)} className="input">
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 text-right">
                    <label className="label">Amt</label>
                    <p className="text-xs font-semibold text-gray-700 py-2">
                      ₹{(Number(item.quantity) * Number(item.rate)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#1a3c5e] text-white rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div><p className="opacity-60">Subtotal</p><p className="font-bold">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div><p className="opacity-60">GST</p><p className="font-bold">₹{gstTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div><p className="opacity-60">Grand Total</p><p className="font-bold text-lg">₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount Paid (₹)</label>
              <input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} className="input" min="0" />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} className="input">
                {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Optional remarks" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-600">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-[#2563a8]">
              {mutation.isPending ? 'Saving…' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:3px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:7px 10px; font-size:.875rem; outline:none; background:#fff; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}

export default function PurchasesPage() {
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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3c5e]">Purchases</h1>
            <p className="text-sm text-gray-500 mt-0.5">Raw material and supply bills</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2563a8]">
            <Plus size={16} /> New Purchase
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Purchases', value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-[#1a3c5e]' },
            { label: 'Amount Paid', value: `₹${totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-green-600' },
            { label: 'Balance Due', value: `₹${totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-red-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3 items-end">
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Bill No.', 'Date', 'Supplier', 'Vehicle', 'Grand Total', 'Paid', 'Balance', 'Mode'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : !(purchases as any[]).length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center py-16 text-gray-300">
                      <Package size={40} className="mb-2" />
                      <p className="text-sm">No purchases in this period</p>
                    </div>
                  </td>
                </tr>
              ) : (purchases as any[]).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1a3c5e]">{p.bill_number}</td>
                  <td className="px-4 py-3 text-gray-600">{dayjs(p.purchase_date).format('DD/MM/YYYY')}</td>
                  <td className="px-4 py-3">{p.party_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.vehicle_number || '—'}</td>
                  <td className="px-4 py-3 font-semibold">₹{Number(p.grand_total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-green-600">₹{Number(p.amount_paid).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className={`px-4 py-3 font-medium ${Number(p.balance_due) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    ₹{Number(p.balance_due).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs uppercase font-medium">{p.payment_mode}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {showNew && <NewPurchaseModal onClose={() => setShowNew(false)} />}
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:3px; }
        .input { border:1px solid #d1d5db; border-radius:8px; padding:7px 10px; font-size:.875rem; outline:none; background:#fff; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}
