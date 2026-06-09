'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSales, createSale, getParties, getProducts, getVehicles, downloadInvoice } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { Plus, Download, X, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';

interface SaleItem {
  product_id: string;
  product_name: string;
  hsn_code: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_rate: number;
}

export default function SalesPage() {
  useEffect(() => { log.page('Sales'); }, []);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ from: dayjs().format('YYYY-MM-01'), to: dayjs().format('YYYY-MM-DD') });
  const [form, setForm] = useState<any>({ invoice_type: 'tax_invoice', sale_date: dayjs().format('YYYY-MM-DD'), items: [], is_same_state: true, amount_received: 0, payment_mode: 'credit' });
  const [items, setItems] = useState<SaleItem[]>([{ product_id: '', product_name: '', hsn_code: '', unit: 'MT', quantity: 0, rate: 0, gst_rate: 5 }]);

  const { data: sales = [] } = useQuery({ queryKey: ['sales', filters], queryFn: () => getSales(filters) });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties({ type: 'customer' }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (data: any) => { log.action('Sale created', { invoice: data?.invoice_number, party: form?.party_name }); toast.success('Sale created!'); qc.invalidateQueries({ queryKey: ['sales'] }); setShowForm(false); },
    onError: () => { log.error('Sale creation failed'); toast.error('Failed to create sale'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length || !items[0].product_id) return toast.error('Add at least one item');
    createMutation.mutate({ ...form, items });
  };

  const addItem = () => setItems(i => [...i, { product_id: '', product_name: '', hsn_code: '', unit: 'MT', quantity: 0, rate: 0, gst_rate: 5 }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_id') {
        const p = (products as any[]).find((p: any) => p.id === value);
        return p ? { ...item, product_id: p.id, product_name: p.name, hsn_code: p.hsn_code || '', unit: p.unit, gst_rate: p.gst_rate, rate: p.default_sale_price || 0 } : item;
      }
      return { ...item, [field]: value };
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const totalGst = items.reduce((s, i) => s + i.quantity * i.rate * i.gst_rate / 100, 0);
  const grandTotal = subtotal + totalGst;

  const handleDownload = async (saleId: string, invoiceNumber: string) => {
    const blob = await downloadInvoice(saleId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${invoiceNumber}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title="Sales"
          subtitle="Manage invoices and customer orders"
          actions={
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Sale
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="card p-4 mb-5 flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">From</label>
              <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input w-40" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input w-40" />
            </div>
          </div>

          {/* Sales Table */}
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Invoice', 'Date', 'Party', 'Vehicle', 'Amount', 'Received', 'Balance', 'Status', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sales as any[]).map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-medium text-white">{s.invoice_number}</td>
                      <td>{dayjs(s.sale_date).format('DD/MM/YYYY')}</td>
                      <td>{s.party_name || 'CASH'}</td>
                      <td>{s.vehicle_number || '—'}</td>
                      <td className="font-medium text-white">₹{Number(s.grand_total).toLocaleString('en-IN')}</td>
                      <td className="text-emerald-400">₹{Number(s.amount_received).toLocaleString('en-IN')}</td>
                      <td className="text-red-400">₹{Number(s.balance_due).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={s.status === 'confirmed' ? 'badge-gem' : 'badge-red'}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDownload(s.id, s.invoice_number)} className="btn-ghost p-1.5 text-white/40 hover:text-white">
                          <Download size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(sales as any[]).length && (
                <p className="text-center text-white/40 py-10 text-sm">No sales found</p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New Sale Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">New Sale Invoice</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Invoice Type</label>
                  <select value={form.invoice_type} onChange={e => setForm((f: any) => ({ ...f, invoice_type: e.target.value }))} className="select">
                    <option value="tax_invoice">Tax Invoice</option>
                    <option value="delivery_challan">Delivery Challan</option>
                    <option value="bill_of_supply">Bill of Supply</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sale Date</label>
                  <input type="date" value={form.sale_date} onChange={e => setForm((f: any) => ({ ...f, sale_date: e.target.value }))} className="input" required />
                </div>
                <div>
                  <label className="label">Same State (CGST+SGST)?</label>
                  <select value={form.is_same_state ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_same_state: e.target.value === 'yes' }))} className="select">
                    <option value="yes">Yes (Intra-state)</option>
                    <option value="no">No (Inter-state / IGST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Customer</label>
                  <select value={form.party_id || ''} onChange={e => {
                    const p = (parties as any[]).find((p: any) => p.id === e.target.value);
                    setForm((f: any) => ({ ...f, party_id: e.target.value, party_name: p?.name, party_gstin: p?.gstin, party_address: `${p?.address || ''}, ${p?.city || ''}` }));
                  }} className="select">
                    <option value="">-- CASH / Select Party --</option>
                    {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Vehicle</label>
                  <select value={form.vehicle_id || ''} onChange={e => {
                    const v = (vehicles as any[]).find((v: any) => v.id === e.target.value);
                    setForm((f: any) => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number }));
                  }} className="select">
                    <option value="">-- Select Vehicle --</option>
                    {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Driver Name</label>
                  <input type="text" value={form.driver_name || ''} onChange={e => setForm((f: any) => ({ ...f, driver_name: e.target.value }))} className="input" placeholder="Driver name" />
                </div>
                <div>
                  <label className="label">D.O. Number</label>
                  <input type="text" value={form.do_number || ''} onChange={e => setForm((f: any) => ({ ...f, do_number: e.target.value }))} className="input" placeholder="Delivery order" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-white">Items</label>
                  <button type="button" onClick={addItem} className="btn-ghost text-sm flex items-center gap-1 px-3 py-1.5">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="rounded-lg overflow-hidden border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        {['Product', 'Unit', 'Qty', 'Rate', 'GST%', 'Amount', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-white/50 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-t border-white/10">
                          <td className="px-2 py-1.5">
                            <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="select w-40">
                              <option value="">Select</option>
                              {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-white/50 text-xs">{item.unit}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="input w-20 py-1.5 text-sm" min="0" step="0.001" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.rate || ''} onChange={e => updateItem(idx, 'rate', Number(e.target.value))} className="input w-24 py-1.5 text-sm" min="0" />
                          </td>
                          <td className="px-2 py-1.5 text-white/50 text-xs">{item.gst_rate}%</td>
                          <td className="px-2 py-1.5 font-medium text-white text-right">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1.5">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="text-right space-y-1 text-sm min-w-48">
                    <div className="flex justify-between gap-8">
                      <span className="text-white/50">Subtotal:</span>
                      <span className="text-white/70">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-white/50">GST:</span>
                      <span className="text-white/70">₹{totalGst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-8 font-bold">
                      <span className="text-white">Total:</span>
                      <span className="text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Payment Mode</label>
                  <select value={form.payment_mode} onChange={e => setForm((f: any) => ({ ...f, payment_mode: e.target.value }))} className="select">
                    {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount Received</label>
                  <input type="number" value={form.amount_received} onChange={e => setForm((f: any) => ({ ...f, amount_received: Number(e.target.value) }))} className="input" min="0" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input type="text" value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="input" />
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-60">
                  {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
