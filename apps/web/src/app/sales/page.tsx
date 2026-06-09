'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSales, createSale, getParties, getProducts, getVehicles, downloadInvoice } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
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
    onSuccess: () => { toast.success('Sale created!'); qc.invalidateQueries({ queryKey: ['sales'] }); setShowForm(false); },
    onError: () => toast.error('Failed to create sale'),
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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">Sales</h1>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors">
            <Plus size={18} /> New Sale
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1a3c5e] text-white">
              <tr>
                {['Invoice', 'Date', 'Party', 'Vehicle', 'Amount', 'Received', 'Balance', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sales as any[]).map((s: any, i: number) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium text-[#1a3c5e]">{s.invoice_number}</td>
                  <td className="px-4 py-3">{dayjs(s.sale_date).format('DD/MM/YYYY')}</td>
                  <td className="px-4 py-3">{s.party_name || 'CASH'}</td>
                  <td className="px-4 py-3">{s.vehicle_number || '-'}</td>
                  <td className="px-4 py-3 font-medium">₹{Number(s.grand_total).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-green-600">₹{Number(s.amount_received).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-red-600">₹{Number(s.balance_due).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDownload(s.id, s.invoice_number)} className="text-gray-400 hover:text-[#1a3c5e]">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(sales as any[]).length && <p className="text-center text-gray-400 py-8">No sales found</p>}
        </div>

        {/* New Sale Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-[#1a3c5e]">New Sale Invoice</h2>
                <button onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Invoice Type</label>
                    <select value={form.invoice_type} onChange={e => setForm((f: any) => ({ ...f, invoice_type: e.target.value }))} className="input">
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
                    <select value={form.is_same_state ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_same_state: e.target.value === 'yes' }))} className="input">
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
                    }} className="input">
                      <option value="">-- CASH / Select Party --</option>
                      {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Vehicle</label>
                    <select value={form.vehicle_id || ''} onChange={e => {
                      const v = (vehicles as any[]).find((v: any) => v.id === e.target.value);
                      setForm((f: any) => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number }));
                    }} className="input">
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-[#1a3c5e]">Items</label>
                    <button type="button" onClick={addItem} className="text-sm text-[#1a3c5e] font-medium hover:underline flex items-center gap-1">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          {['Product', 'Unit', 'Qty', 'Rate', 'GST%', 'Amount', ''].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1.5">
                              <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="input-sm w-40">
                                <option value="">Select</option>
                                {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-gray-500 text-xs">{item.unit}</td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} className="input-sm w-20" min="0" step="0.001" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={item.rate || ''} onChange={e => updateItem(idx, 'rate', Number(e.target.value))} className="input-sm w-24" min="0" />
                            </td>
                            <td className="px-2 py-1.5 text-gray-500 text-xs">{item.gst_rate}%</td>
                            <td className="px-2 py-1.5 font-medium text-right">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5">
                              {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex justify-end space-y-1 text-sm">
                    <div className="text-right space-y-1 min-w-48">
                      <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">GST:</span><span>₹{totalGst.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between font-bold text-[#1a3c5e]"><span>Total:</span><span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Payment Mode</label>
                    <select value={form.payment_mode} onChange={e => setForm((f: any) => ({ ...f, payment_mode: e.target.value }))} className="input">
                      {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>)}
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

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium hover:bg-[#2563a8] disabled:opacity-60">
                    {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #4b5563; margin-bottom: 4px; }
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 0.875rem; outline: none; }
        .input:focus { ring: 2px; ring-color: #1a3c5e; border-color: transparent; }
        .input-sm { border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; font-size: 0.8rem; outline: none; }
      `}</style>
    </div>
  );
}
