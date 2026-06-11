'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import {
  getQuarrySales, createQuarrySale,
  getQuarryPurchases, createQuarryPurchase,
  getProducts, getVehicles,
} from '@/lib/api';
import { Mountain, Plus, X, TrendingUp, Scale, DollarSign, ShoppingCart, ArrowUpRight } from 'lucide-react';
import dayjs from 'dayjs';

function Filters({ from, to, search, onFrom, onTo, onSearch }: {
  from: string; to: string; search: string;
  onFrom: (v: string) => void; onTo: (v: string) => void; onSearch: (v: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
      <div><label className="label">From</label><input type="date" value={from} onChange={e => onFrom(e.target.value)} className="input" style={{ width: 160 }} /></div>
      <div><label className="label">To</label><input type="date" value={to} onChange={e => onTo(e.target.value)} className="input" style={{ width: 160 }} /></div>
      <div style={{ flex: 1, minWidth: 200 }}><label className="label">Search</label><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Material, supplier or vehicle…" className="input" style={{ width: '100%' }} /></div>
    </div>
  );
}

function NewQuarrySaleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const [form, setForm] = useState({
    sale_date: dayjs().format('YYYY-MM-DD'), product_id: '', product_name: '', unit: 'MT',
    vehicle_id: '', vehicle_number: '', driver_name: '', party_name: '',
    quantity: '', rate: '', royalty_rate: '0', payment_mode: 'cash', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const mutation = useMutation({
    mutationFn: () => createQuarrySale({ ...form, quantity: Number(form.quantity), rate: Number(form.rate), royalty_rate: Number(form.royalty_rate) }),
    onSuccess: (data: any) => { log.action('Quarry sale created', { invoice: data?.invoice_number }); toast.success('Quarry sale recorded'); qc.invalidateQueries({ queryKey: ['quarry-sales'] }); onClose(); },
    onError: () => toast.error('Failed to record quarry sale'),
  });
  const handleProductChange = (id: string) => {
    const p = (products as any[]).find(x => x.id === id);
    set('product_id', id);
    if (p) { set('product_name', p.name); set('unit', p.unit || 'MT'); set('rate', String(p.base_price || '')); }
  };
  const amount = Number(form.quantity) * Number(form.rate);
  const royalty = Number(form.quantity) * Number(form.royalty_rate);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div className="card-gold" style={{ width: '100%', maxWidth: 672, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="text-xl font-bold text-white">New Quarry Sale</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 8 }}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (Number(form.quantity) <= 0 || Number(form.rate) <= 0) { toast.error('Quantity and rate must be greater than zero'); return; } mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div><label className="label">Date *</label><input required type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} className="input" /></div>
            <div><label className="label">Payment Mode *</label><select required value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} className="select">{['cash','cheque','upi','neft','rtgs','credit'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
          </div>
          <div><label className="label">Customer Name</label><input value={form.party_name} onChange={e => set('party_name', e.target.value)} className="input" placeholder="Customer / party name" /></div>
          <div><label className="label">Material *</label><select required value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="select"><option value="">Select material…</option>{(products as any[]).map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}</select></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div><label className="label">Qty ({form.unit}) *</label><input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input" placeholder="0.000" /></div>
            <div><label className="label">Rate (₹/{form.unit}) *</label><input required type="number" min="0" step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)} className="input" placeholder="0.00" /></div>
            <div><label className="label">Royalty (₹/{form.unit})</label><input type="number" min="0" step="0.01" value={form.royalty_rate} onChange={e => set('royalty_rate', e.target.value)} className="input" placeholder="0.00" /></div>
          </div>
          <div><label className="label">Vehicle</label><select value={form.vehicle_id} onChange={e => { const v = (vehicles as any[]).find(x => x.id === e.target.value); set('vehicle_id', e.target.value); if (v) set('vehicle_number', v.vehicle_number); }} className="select"><option value="">Select vehicle…</option>{(vehicles as any[]).map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}</select></div>
          <div><label className="label">Driver Name</label><input value={form.driver_name} onChange={e => set('driver_name', e.target.value)} className="input" placeholder="Driver name" /></div>
          {amount > 0 && (
            <div className="card" style={{ padding: 12, display: 'flex', gap: 20 }}>
              <div><p className="label">Amount</p><p className="font-semibold text-white">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
              {royalty > 0 && <div><p className="label">Royalty</p><p className="font-semibold text-white">₹{royalty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>}
              <div><p className="label">Grand Total</p><p className="font-bold" style={{ color: '#e8c96a' }}>₹{(amount + royalty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
            </div>
          )}
          <div><label className="label">Notes</label><input value={form.notes} onChange={e => set('notes', e.target.value)} className="input" placeholder="Optional notes" /></div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving…' : 'Record Sale'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewQuarryPurchaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    purchase_date: dayjs().format('YYYY-MM-DD'), supplier_name: '', product_name: '',
    unit: 'MT', quantity: '', rate: '', royalty_rate: '0',
    vehicle_number: '', payment_mode: 'cash', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const mutation = useMutation({
    mutationFn: () => createQuarryPurchase({ ...form, quantity: Number(form.quantity), rate: Number(form.rate), royalty_rate: Number(form.royalty_rate) }),
    onSuccess: () => { toast.success('Purchase recorded'); qc.invalidateQueries({ queryKey: ['quarry-purchases'] }); onClose(); },
    onError: () => toast.error('Failed to record purchase'),
  });
  const amount = Number(form.quantity) * Number(form.rate);
  const royalty = Number(form.quantity) * Number(form.royalty_rate);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div className="card-gold" style={{ width: '100%', maxWidth: 672, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="text-xl font-bold text-white">New Quarry Purchase</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: 8 }}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (Number(form.quantity) <= 0 || Number(form.rate) <= 0) { toast.error('Quantity and rate must be greater than zero'); return; } mutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div><label className="label">Date *</label><input required type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} className="input" /></div>
            <div><label className="label">Payment Mode *</label><select required value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)} className="select">{['cash','cheque','upi','neft','rtgs','credit'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
          </div>
          <div><label className="label">Supplier / Mine Name *</label><input required value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} className="input" placeholder="Quarry owner / mine name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div><label className="label">Material *</label><input required value={form.product_name} onChange={e => set('product_name', e.target.value)} className="input" placeholder="e.g. Blue Metal, Granite" /></div>
            <div><label className="label">Unit</label><select value={form.unit} onChange={e => set('unit', e.target.value)} className="select">{['MT','Ton','Cum','Brass','Nos'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div><label className="label">Qty ({form.unit}) *</label><input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input" placeholder="0.000" /></div>
            <div><label className="label">Rate (₹/{form.unit}) *</label><input required type="number" min="0" step="0.01" value={form.rate} onChange={e => set('rate', e.target.value)} className="input" placeholder="0.00" /></div>
            <div><label className="label">Royalty (₹/{form.unit})</label><input type="number" min="0" step="0.01" value={form.royalty_rate} onChange={e => set('royalty_rate', e.target.value)} className="input" placeholder="0.00" /></div>
          </div>
          <div><label className="label">Vehicle Number</label><input value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value)} className="input" placeholder="e.g. TN 39 AB 1234" /></div>
          {amount > 0 && (
            <div className="card" style={{ padding: 12, display: 'flex', gap: 20 }}>
              <div><p className="label">Amount</p><p className="font-semibold text-white">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
              {royalty > 0 && <div><p className="label">Royalty</p><p className="font-semibold text-white">₹{royalty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>}
              <div><p className="label">Grand Total</p><p className="font-bold" style={{ color: '#e8c96a' }}>₹{(amount + royalty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
            </div>
          )}
          <div><label className="label">Notes</label><input value={form.notes} onChange={e => set('notes', e.target.value)} className="input" placeholder="Optional notes" /></div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving…' : 'Record Purchase'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuarryPage() {
  useEffect(() => { log.page('Quarry'); }, []);
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales');
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: sales = [], isLoading: salesLoading } = useQuery({ queryKey: ['quarry-sales', from, to], queryFn: () => getQuarrySales({ from, to }) });
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({ queryKey: ['quarry-purchases', from, to], queryFn: () => getQuarryPurchases({ from, to }) });

  const filteredSales = (sales as any[]).filter((s: any) => !search || s.product_name?.toLowerCase().includes(search.toLowerCase()) || s.vehicle_number?.toLowerCase().includes(search.toLowerCase()) || s.party_name?.toLowerCase().includes(search.toLowerCase()));
  const filteredPurchases = (purchases as any[]).filter((p: any) => !search || p.product_name?.toLowerCase().includes(search.toLowerCase()) || p.supplier_name?.toLowerCase().includes(search.toLowerCase()) || p.vehicle_number?.toLowerCase().includes(search.toLowerCase()));

  const salesAmount = filteredSales.reduce((s: number, r: any) => s + Number(r.grand_total || r.amount || 0), 0);
  const salesQty = filteredSales.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);
  const purchaseAmount = filteredPurchases.reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
  const purchaseQty = filteredPurchases.reduce((s: number, r: any) => s + Number(r.quantity || 0), 0);

  const stats = [
    { label: 'Sales Revenue', value: `₹${salesAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: `${filteredSales.length} entries`, icon: ArrowUpRight, color: '#34d399' },
    { label: 'Purchase Cost', value: `₹${purchaseAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: `${filteredPurchases.length} entries`, icon: ShoppingCart, color: '#f87171' },
    { label: 'Net Margin', value: `₹${(salesAmount - purchaseAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: salesAmount > 0 ? `${(((salesAmount - purchaseAmount) / salesAmount) * 100).toFixed(1)}% margin` : '—', icon: TrendingUp, color: '#e8c96a' },
    { label: tab === 'sales' ? 'Qty Sold' : 'Qty Purchased', value: `${(tab === 'sales' ? salesQty : purchaseQty).toFixed(2)} MT`, icon: Scale, color: '#a78bfa' },
  ];

  const isLoading = tab === 'sales' ? salesLoading : purchasesLoading;

  return (
    <AppLayout
      title="Quarry"
      subtitle="Sales to customers · Purchases from mines"
      actions={
        <button onClick={() => setShowNew(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> {tab === 'sales' ? 'New Sale' : 'New Purchase'}
        </button>
      }
    >
      <StatsRow stats={stats} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, width: 'fit-content', border: '1px solid rgba(26,53,112,0.3)' }}>
        {([['sales', 'Sales (to customers)', 'ArrowUpRight'] as const, ['purchases', 'Purchases (from mines)', 'ShoppingCart'] as const]).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setShowNew(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: tab === key ? 'rgba(184,149,62,0.12)' : 'transparent', color: tab === key ? '#e8c96a' : 'rgba(200,212,232,0.5)', boxShadow: tab === key ? '0 0 0 1px rgba(184,149,62,0.25)' : 'none' }}>
            {key === 'sales' ? <ArrowUpRight size={13} /> : <ShoppingCart size={13} />}
            {label}
          </button>
        ))}
      </div>

      <Filters from={from} to={to} search={search} onFrom={setFrom} onTo={setTo} onSearch={setSearch} />

      {tab === 'sales' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="text-sm" style={{ width: '100%' }}>
              <thead><tr>{['Date','Invoice','Customer','Material','Vehicle','Qty','Rate','Grand Total','Mode'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={9} className="text-center" style={{ padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>Loading…</td></tr>
                  : !filteredSales.length ? <tr><td colSpan={9} className="text-center" style={{ padding: '56px 0', color: 'rgba(255,255,255,0.3)' }}><Mountain size={36} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} /><p className="text-sm">No quarry sales in this period</p></td></tr>
                  : filteredSales.map((s: any) => (
                    <tr key={s.id}>
                      <td>{dayjs(s.sale_date).format('DD MMM YYYY')}</td>
                      <td style={{ color: '#c9a84c', fontWeight: 600, fontSize: 11 }}>{s.invoice_number || '—'}</td>
                      <td style={{ color: 'rgba(200,212,232,0.7)' }}>{s.party_name || '—'}</td>
                      <td className="font-medium text-white">{s.product_name}</td>
                      <td>{s.vehicle_number || '—'}</td>
                      <td>{Number(s.quantity).toFixed(2)} {s.unit}</td>
                      <td>₹{Number(s.rate).toLocaleString('en-IN')}</td>
                      <td className="font-semibold text-white">₹{Number(s.grand_total || s.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td><span className="badge-gray uppercase">{s.payment_mode}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="text-sm" style={{ width: '100%' }}>
              <thead><tr>{['Date','Supplier','Material','Vehicle','Qty','Rate','Royalty','Grand Total','Mode'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={9} className="text-center" style={{ padding: '48px 0', color: 'rgba(255,255,255,0.4)' }}>Loading…</td></tr>
                  : !filteredPurchases.length ? <tr><td colSpan={9} className="text-center" style={{ padding: '56px 0', color: 'rgba(255,255,255,0.3)' }}><ShoppingCart size={36} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} /><p className="text-sm">No quarry purchases in this period</p></td></tr>
                  : filteredPurchases.map((p: any) => (
                    <tr key={p.id}>
                      <td>{dayjs(p.purchase_date).format('DD MMM YYYY')}</td>
                      <td className="font-medium text-white">{p.supplier_name}</td>
                      <td style={{ color: 'rgba(200,212,232,0.8)' }}>{p.product_name}</td>
                      <td>{p.vehicle_number || '—'}</td>
                      <td>{Number(p.quantity).toFixed(2)} {p.unit}</td>
                      <td>₹{Number(p.rate).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'rgba(200,212,232,0.5)' }}>{Number(p.royalty_rate) > 0 ? `₹${Number(p.royalty_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</td>
                      <td className="font-semibold text-white">₹{Number(p.grand_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td><span className="badge-gray uppercase">{p.payment_mode}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && tab === 'sales' && <NewQuarrySaleModal onClose={() => setShowNew(false)} />}
      {showNew && tab === 'purchases' && <NewQuarryPurchaseModal onClose={() => setShowNew(false)} />}
    </AppLayout>
  );
}
