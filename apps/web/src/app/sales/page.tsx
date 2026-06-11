'use client';
import { useState, useEffect, useMemo } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSales, createSale, cancelSale, getParties, getProducts, getVehicles, downloadInvoice } from '@/lib/api';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import {
  Plus, Download, X, Trash2, Search, FileText,
  TrendingUp, IndianRupee, CheckCircle2, AlertCircle,
  ChevronDown,
} from 'lucide-react';
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

const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') return <span className="badge-gem">Confirmed</span>;
  if (status === 'cancelled') return <span className="badge-red">Cancelled</span>;
  return <span className="badge-gray">{status}</span>;
}

function PayBadge({ mode }: { mode: string }) {
  const map: Record<string, string> = {
    cash: 'badge-gem', credit: 'badge-gray', upi: 'badge-blue',
    cheque: 'badge-gold', neft: 'badge-blue', rtgs: 'badge-blue',
  };
  return <span className={map[mode] || 'badge-gray'}>{(mode || 'credit').toUpperCase()}</span>;
}

export default function SalesPage() {
  useEffect(() => { log.page('Sales'); }, []);
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    from: dayjs().format('YYYY-MM-01'),
    to:   dayjs().format('YYYY-MM-DD'),
  });

  const [form, setForm] = useState<any>({
    invoice_type: 'tax_invoice',
    sale_date: dayjs().format('YYYY-MM-DD'),
    items: [],
    is_same_state: true,
    amount_received: 0,
    payment_mode: 'credit',
  });
  const [items, setItems] = useState<SaleItem[]>([
    { product_id: '', product_name: '', hsn_code: '', unit: 'MT', quantity: 0, rate: 0, gst_rate: 5 },
  ]);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', filters],
    queryFn: () => getSales(filters),
  });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties({ type: 'customer' }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  // ── Mutations ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (data: any) => {
      log.action('Sale created', { invoice: data?.invoice_number, party: form?.party_name });
      toast.success(`Invoice ${data?.invoice_number} created`);
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowForm(false);
      resetForm();
    },
    onError: () => { log.error('Sale creation failed'); toast.error('Failed to create sale'); },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSale,
    onSuccess: () => {
      toast.success('Sale cancelled');
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setCancelId(null);
    },
    onError: () => toast.error('Failed to cancel sale'),
  });

  const resetForm = () => {
    setForm({ invoice_type: 'tax_invoice', sale_date: dayjs().format('YYYY-MM-DD'), items: [], is_same_state: true, amount_received: 0, payment_mode: 'credit' });
    setItems([{ product_id: '', product_name: '', hsn_code: '', unit: 'MT', quantity: 0, rate: 0, gst_rate: 5 }]);
  };

  // ── Client-side filter / search ─────────────────────────
  const filtered = useMemo(() => {
    let rows = sales as any[];
    if (statusFilter !== 'all') rows = rows.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s =>
        s.invoice_number?.toLowerCase().includes(q) ||
        s.party_name?.toLowerCase().includes(q) ||
        s.vehicle_number?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [sales, statusFilter, search]);

  // ── Period summary stats ────────────────────────────────
  const confirmed = (sales as any[]).filter(s => s.status === 'confirmed');
  const totalRevenue  = confirmed.reduce((s, r) => s + Number(r.grand_total || 0), 0);
  const totalReceived = confirmed.reduce((s, r) => s + Number(r.amount_received || 0), 0);
  const totalPending  = confirmed.reduce((s, r) => s + Number(r.balance_due || 0), 0);

  // ── Form helpers ────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length || !items[0].product_id) return toast.error('Add at least one item');
    if (items.some(item => item.quantity <= 0 || item.rate <= 0)) return toast.error('All items must have quantity and rate greater than 0');
    createMutation.mutate({ ...form, items });
  };

  const addItem    = () => setItems(i => [...i, { product_id: '', product_name: '', hsn_code: '', unit: 'MT', quantity: 0, rate: 0, gst_rate: 5 }]);
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

  const subtotal  = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const totalGst  = items.reduce((s, i) => s + i.quantity * i.rate * i.gst_rate / 100, 0);
  const grandTotal = subtotal + totalGst;

  const handleDownload = async (saleId: string, invoiceNumber: string) => {
    try {
      const blob = await downloadInvoice(saleId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download invoice'); }
  };

  return (
    <AppLayout
      title="Sales"
      subtitle="Invoices & customer orders"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> New Sale
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Period summary strip ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Revenue',    value: inr(totalRevenue),  icon: TrendingUp,    color: '#4a90d9' },
              { label: 'Collected',  value: inr(totalReceived), icon: CheckCircle2,  color: '#4ade80' },
              { label: 'Outstanding', value: inr(totalPending), icon: AlertCircle,   color: totalPending > 0 ? '#f87171' : '#4ade80' },
            ].map(s => (
              <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 11, marginTop: 4, color: 'rgba(200,212,232,0.55)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filters row ─────────────────────────── */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label">From</label>
              <input type="date" value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                className="input" style={{ width: 160 }} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                className="input" style={{ width: 160 }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="label">Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(200,212,232,0.3)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Invoice, party, vehicle…"
                  className="input" style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <div style={{ position: 'relative' }}>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select" style={{ paddingRight: 32, appearance: 'none' }}>
                  <option value="all">All</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
              </div>
            </div>
            {(search || statusFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="btn-ghost text-xs" style={{ padding: '8px 12px', alignSelf: 'flex-end' }}>
                Clear
              </button>
            )}
          </div>

          {/* ── Sales Table ─────────────────────────── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table className="text-sm" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['Invoice', 'Date', 'Party', 'Vehicle', 'Amount', 'Received', 'Balance', 'Mode', 'Status', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any) => (
                    <tr key={s.id} style={s.status === 'cancelled' ? { opacity: 0.5 } : {}}>
                      <td className="font-mono text-xs text-white">{s.invoice_number}</td>
                      <td className="whitespace-nowrap">{dayjs(s.sale_date).format('DD/MM/YY')}</td>
                      <td className="truncate" style={{ maxWidth: 140 }}>{s.party_name || 'Cash'}</td>
                      <td style={{ color: 'rgba(255,255,255,0.5)' }}>{s.vehicle_number || '—'}</td>
                      <td className="font-semibold text-white whitespace-nowrap">{inr(Number(s.grand_total))}</td>
                      <td className="text-emerald-400 whitespace-nowrap">{inr(Number(s.amount_received))}</td>
                      <td className={Number(s.balance_due) > 0 ? 'text-red-400 whitespace-nowrap' : undefined} style={Number(s.balance_due) > 0 ? {} : { color: 'rgba(255,255,255,0.3)' }}>
                        {inr(Number(s.balance_due))}
                      </td>
                      <td><PayBadge mode={s.payment_mode || 'credit'} /></td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => handleDownload(s.id, s.invoice_number)}
                            title="Download PDF"
                            className="btn-ghost" style={{ padding: 6, color: 'rgba(255,255,255,0.4)' }}>
                            <Download size={14} />
                          </button>
                          {s.status === 'confirmed' && (
                            <button
                              onClick={() => setCancelId(s.id)}
                              title="Cancel sale"
                              className="btn-ghost" style={{ padding: 6, color: 'rgba(255,255,255,0.25)' }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, paddingBottom: 64, gap: 12 }}>
                  <FileText size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {search || statusFilter !== 'all' ? 'No sales match your filters' : 'No sales in this period'}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <button onClick={() => setShowForm(true)}
                      className="btn-primary text-xs" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Plus size={13} /> Create first invoice
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer count */}
            {filtered.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
                <span>{inr(filtered.reduce((s, r: any) => s + (r.status === 'confirmed' ? Number(r.grand_total || 0) : 0), 0))} total</span>
              </div>
            )}
          </div>
        </div>

      {/* ── Cancel Confirmation Dialog ──────────────────── */}
      {cancelId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 384, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Cancel Sale?</h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>This action cannot be undone. The invoice will be marked as cancelled.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelId(null)} className="btn-ghost">Keep</button>
              <button
                onClick={() => cancelMutation.mutate(cancelId!)}
                disabled={cancelMutation.isPending}
                className="btn-primary"
                style={{ background: '#dc2626', opacity: cancelMutation.isPending ? 0.6 : 1 }}>
                {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Sale Modal ──────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div className="card-gold" style={{ width: '100%', maxWidth: 896, maxHeight: '92vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 className="font-bold text-white" style={{ fontSize: 20 }}>New Sale Invoice</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Fill in the details below</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost" style={{ padding: 8 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Row 1: type / date / GST type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Invoice Type</label>
                  <select value={form.invoice_type}
                    onChange={e => setForm((f: any) => ({ ...f, invoice_type: e.target.value }))}
                    className="select">
                    <option value="tax_invoice">Tax Invoice</option>
                    <option value="delivery_challan">Delivery Challan</option>
                    <option value="bill_of_supply">Bill of Supply</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sale Date</label>
                  <input type="date" value={form.sale_date}
                    onChange={e => setForm((f: any) => ({ ...f, sale_date: e.target.value }))}
                    className="input" required />
                </div>
                <div>
                  <label className="label">GST Type</label>
                  <select value={form.is_same_state ? 'yes' : 'no'}
                    onChange={e => setForm((f: any) => ({ ...f, is_same_state: e.target.value === 'yes' }))}
                    className="select">
                    <option value="yes">Intra-state (CGST + SGST)</option>
                    <option value="no">Inter-state (IGST)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: customer / vehicle */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Customer</label>
                  <select value={form.party_id || ''}
                    onChange={e => {
                      const p = (parties as any[]).find((p: any) => p.id === e.target.value);
                      setForm((f: any) => ({ ...f, party_id: e.target.value, party_name: p?.name, party_gstin: p?.gstin, party_address: `${p?.address || ''}, ${p?.city || ''}` }));
                    }} className="select">
                    <option value="">— Cash / Walk-in —</option>
                    {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Vehicle</label>
                  <select value={form.vehicle_id || ''}
                    onChange={e => {
                      const v = (vehicles as any[]).find((v: any) => v.id === e.target.value);
                      setForm((f: any) => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number }));
                    }} className="select">
                    <option value="">— Select Vehicle —</option>
                    {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: driver / D.O. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Driver Name</label>
                  <input type="text" value={form.driver_name || ''}
                    onChange={e => setForm((f: any) => ({ ...f, driver_name: e.target.value }))}
                    className="input" placeholder="Optional" />
                </div>
                <div>
                  <label className="label">D.O. Number</label>
                  <input type="text" value={form.do_number || ''}
                    onChange={e => setForm((f: any) => ({ ...f, do_number: e.target.value }))}
                    className="input" placeholder="Delivery order ref" />
                </div>
              </div>

              {/* Items table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="text-sm font-semibold text-white">Line Items</label>
                  <button type="button" onClick={addItem}
                    className="btn-ghost text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}>
                    <Plus size={13} /> Add Row
                  </button>
                </div>
                <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <table className="text-sm" style={{ width: '100%' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <tr>
                        {['Product', 'Unit', 'Qty', 'Rate (₹)', 'GST%', 'Amount', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium" style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <td style={{ padding: '8px' }}>
                            <select value={item.product_id}
                              onChange={e => updateItem(idx, 'product_id', e.target.value)}
                              className="select text-xs" style={{ width: 160, paddingTop: 6, paddingBottom: 6 }}>
                              <option value="">Select…</option>
                              {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="text-xs" style={{ padding: '8px', color: 'rgba(255,255,255,0.5)' }}>{item.unit || '—'}</td>
                          <td style={{ padding: '8px' }}>
                            <input type="number" value={item.quantity || ''}
                              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                              className="input text-sm" style={{ width: 80, paddingTop: 6, paddingBottom: 6 }} min="0" step="0.001" />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input type="number" value={item.rate || ''}
                              onChange={e => updateItem(idx, 'rate', Number(e.target.value))}
                              className="input text-sm" style={{ width: 96, paddingTop: 6, paddingBottom: 6 }} min="0" />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span className="badge-gray text-xs">{item.gst_rate}%</span>
                          </td>
                          <td className="font-semibold text-white text-right whitespace-nowrap" style={{ padding: '8px' }}>
                            {inr(item.quantity * item.rate)}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)}
                                style={{ color: 'rgba(248,113,113,0.6)' }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="text-sm" style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', padding: '12px 20px', minWidth: 208, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Subtotal</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{inr(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>GST</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{inr(totalGst)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, fontWeight: 700 }}>
                      <span className="text-white">Grand Total</span>
                      <span className="text-gold-light">{inr(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: payment */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Payment Mode</label>
                  <select value={form.payment_mode}
                    onChange={e => setForm((f: any) => ({ ...f, payment_mode: e.target.value }))}
                    className="select">
                    {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Amount Received (₹)</label>
                  <input type="number" value={form.amount_received}
                    onChange={e => setForm((f: any) => ({ ...f, amount_received: Number(e.target.value) }))}
                    className="input" min="0" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input type="text" value={form.notes || ''}
                    onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                    className="input" placeholder="Optional note" />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="btn-ghost">Cancel</button>
                <button type="submit" disabled={createMutation.isPending}
                  className="btn-primary"
                  style={{ minWidth: 128, opacity: createMutation.isPending ? 0.6 : 1 }}>
                  {createMutation.isPending ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
