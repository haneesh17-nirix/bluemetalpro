'use client';
import { useState, useEffect, useRef } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { Scale, RefreshCw, CheckCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  stable: 'text-green-600 bg-green-50 border-green-200',
  unstable: 'text-amber-600 bg-amber-50 border-amber-200',
  overload: 'text-red-600 bg-red-50 border-red-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  unknown: 'text-gray-400 bg-gray-50 border-gray-200',
};

function LiveWeightDisplay({ weighbridge }: { weighbridge: any }) {
  const [live, setLive] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to local edge agent WebSocket for real-time weight
  useEffect(() => {
    const localWsUrl = process.env.NEXT_PUBLIC_WEIGHBRIDGE_WS_URL || 'ws://localhost:8765';
    try {
      const ws = new WebSocket(localWsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'weight') setLive(msg.data);
      };
    } catch {
      setWsConnected(false);
    }
    return () => wsRef.current?.close();
  }, []);

  // Fallback: poll cloud backend if no local WS
  const { data: cloudLive, refetch } = useQuery({
    queryKey: ['wb-live', weighbridge.id],
    queryFn: () => api.get(`/weighbridge/${weighbridge.id}/live`).then(r => r.data),
    refetchInterval: wsConnected ? false : 3000,
    enabled: !wsConnected,
  });

  const weight = live || cloudLive;
  const kg = Number(weight?.weight_kg || 0);
  const mt = (kg / 1000).toFixed(3);
  const status = weight?.status || 'unknown';

  return (
    <div className={`border-2 rounded-2xl p-6 transition-all ${statusColors[status] || statusColors.unknown}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p className="font-semibold text-lg">{weighbridge.name}</p>
          <p className="text-sm opacity-70">{weighbridge.location_label}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
          {wsConnected ? <><Wifi size={12} /> Live</> : <><WifiOff size={12} /> Polling</>}
        </div>
      </div>

      {/* Big weight display */}
      <div className="text-center py-6">
        <p className="text-6xl font-bold font-mono tracking-tight">
          {kg.toLocaleString('en-IN')}
        </p>
        <p className="text-xl font-medium mt-1 opacity-70">kg &nbsp;·&nbsp; {mt} MT</p>
        <div className={`mt-3 px-3 py-1 rounded-full text-sm font-medium capitalize border ${statusColors[status]}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {status === 'stable' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {status}
        </div>
      </div>

      {weight?.vehicle_number && (
        <p className="text-center text-sm font-medium">Vehicle: <span className="font-bold">{weight.vehicle_number}</span></p>
      )}
      {weight?.captured_at && (
        <p className="text-center text-xs opacity-50 mt-1">{dayjs(weight.captured_at).format('HH:mm:ss')}</p>
      )}
    </div>
  );
}

function NewTicketForm({ weighbridges }: { weighbridges: any[] }) {
  const qc = useQueryClient();
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/vehicles').then(r => r.data) });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => api.get('/parties', { params: { type: 'customer' } }).then(r => r.data) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const [form, setForm] = useState({ weighbridge_id: '', vehicle_id: '', vehicle_number: '', party_id: '', party_name: '', product_id: '', product_name: '', gross_weight_kg: '', tare_weight_kg: '', notes: '' });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/weighbridge/tickets', data).then(r => r.data),
    onSuccess: (t) => {
      toast.success(`Ticket ${t.ticket_number} created — Net: ${t.net_weight_mt} MT`);
      qc.invalidateQueries({ queryKey: ['wb-tickets'] });
      setForm(f => ({ ...f, gross_weight_kg: '', tare_weight_kg: '', notes: '' }));
    },
    onError: () => toast.error('Failed to create ticket'),
  });

  const net = Math.max(0, Number(form.gross_weight_kg) - Number(form.tare_weight_kg || 0));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-[#1a3c5e] mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Scale size={18} /> New Weigh Ticket</h2>
      <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, gross_weight_kg: Number(form.gross_weight_kg), tare_weight_kg: Number(form.tare_weight_kg || 0) }); }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

        <div>
          <label className="label">Weighbridge *</label>
          <select required value={form.weighbridge_id} onChange={e => setForm(f => ({ ...f, weighbridge_id: e.target.value }))} className="input">
            <option value="">Select weighbridge…</option>
            {weighbridges.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Vehicle</label>
          <select value={form.vehicle_id} onChange={e => {
            const v = (vehicles as any[]).find((x: any) => x.id === e.target.value);
            setForm(f => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number || '' }));
          }} className="input">
            <option value="">Select vehicle…</option>
            {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Customer</label>
          <select value={form.party_id} onChange={e => {
            const p = (parties as any[]).find((x: any) => x.id === e.target.value);
            setForm(f => ({ ...f, party_id: e.target.value, party_name: p?.name || '' }));
          }} className="input">
            <option value="">CASH</option>
            {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Product</label>
          <select value={form.product_id} onChange={e => {
            const p = (products as any[]).find((x: any) => x.id === e.target.value);
            setForm(f => ({ ...f, product_id: e.target.value, product_name: p?.name || '' }));
          }} className="input">
            <option value="">Select product…</option>
            {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Gross Weight (kg) *</label>
          <input required type="number" value={form.gross_weight_kg} onChange={e => setForm(f => ({ ...f, gross_weight_kg: e.target.value }))} className="input" placeholder="e.g. 32000" min="0" />
        </div>

        <div>
          <label className="label">Tare Weight (kg)</label>
          <input type="number" value={form.tare_weight_kg} onChange={e => setForm(f => ({ ...f, tare_weight_kg: e.target.value }))} className="input" placeholder="0 = first weighing" min="0" />
        </div>

        {(Number(form.gross_weight_kg) > 0) && (
          <div style={{ gridColumn: 'span 2', background: '#1a3c5e', color: 'white', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p className="text-sm opacity-70">Net Weight</p>
            <p className="text-3xl font-bold font-mono">{net.toLocaleString('en-IN')} kg</p>
            <p className="text-lg opacity-80">{(net / 1000).toFixed(3)} MT</p>
          </div>
        )}

        <div style={{ gridColumn: 'span 2' }}>
          <label className="label">Notes</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Optional note" />
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={mutation.isPending} className="bg-[#1a3c5e] hover:bg-[#2563a8] text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-60 transition-colors">
            {mutation.isPending ? 'Creating…' : 'Create Weigh Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function WeighbridgePage() {
  useEffect(() => { log.page('Weighbridge'); }, []);
  const { data: weighbridges = [] } = useQuery({ queryKey: ['weighbridges'], queryFn: () => api.get('/weighbridge').then(r => r.data) });
  const { data: tickets = [] } = useQuery({ queryKey: ['wb-tickets'], queryFn: () => api.get('/weighbridge/tickets').then(r => r.data) });

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32 }}>
        <h1 className="text-2xl font-bold text-[#1a3c5e] mb-6">Weighbridge</h1>

        {/* Live displays */}
        {(weighbridges as any[]).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            {(weighbridges as any[]).map((wb: any) => (
              <LiveWeightDisplay key={wb.id} weighbridge={wb} />
            ))}
          </div>
        ) : (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', gap: 12 }}>
            <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-medium text-amber-800 text-sm">No weighbridges configured</p>
              <p className="text-xs text-amber-700 mt-0.5">Go to Settings → Weighbridges to add and configure your scales.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <NewTicketForm weighbridges={weighbridges as any[]} />

          {/* Recent tickets */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1a3c5e] mb-4">Recent Tickets</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} style={{ maxHeight: 480, overflowY: 'auto' }}>
              {(tickets as any[]).map((t: any) => (
                <div key={t.id} className="bg-gray-50 rounded-lg border border-gray-100" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
                  <div>
                    <p className="font-medium text-sm text-[#1a3c5e]">{t.ticket_number}</p>
                    <p className="text-xs text-gray-500">{t.vehicle_number} · {t.party_name || 'CASH'}</p>
                    <p className="text-xs text-gray-400">{dayjs(t.created_at).format('DD/MM/YY HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{Number(t.net_weight_mt).toFixed(3)} MT</p>
                    <p className="text-xs text-gray-500">{Number(t.net_weight_kg).toLocaleString('en-IN')} kg net</p>
                    {t.sale_id && <span className="text-xs text-green-600 font-medium">Linked</span>}
                  </div>
                </div>
              ))}
              {!(tickets as any[]).length && <p className="text-center text-gray-400 py-6 text-sm">No tickets today</p>}
            </div>
          </div>
        </div>
      </main>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:4px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:.875rem; outline:none; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}
