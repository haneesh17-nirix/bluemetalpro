'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import {
  Scale, RefreshCw, CheckCircle, AlertTriangle, Wifi, WifiOff,
  Plus, X, Settings2, Cpu, Globe, MonitorSpeaker, ChevronDown,
  Copy, Eye, EyeOff, Trash2, ToggleLeft, ToggleRight,
  ArrowDownToLine, ArrowUpFromLine, Layers, Zap, Filter,
} from 'lucide-react';
import dayjs from 'dayjs';

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const S = {
  bg:      '#0f1117',
  surface: '#161b27',
  card:    '#1c2333',
  border:  'rgba(255,255,255,0.07)',
  borderG: 'rgba(34,160,90,0.30)',
  text:    '#e2e8f0',
  muted:   '#64748b',
  green:   '#22a05a',
  greenT:  'rgba(34,160,90,0.12)',
  greenB:  'rgba(34,160,90,0.25)',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  stable:   { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: 'Stable'   },
  unstable: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Unstable' },
  overload: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Overload' },
  underload:{ color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Underload'},
  zero:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: 'Zero'     },
  error:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Error'    },
  unknown:  { color: '#475569', bg: 'rgba(71,85,105,0.10)',   label: 'Unknown'  },
};

const CONN_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  serial: { icon: <Cpu size={12} />,          label: 'RS-232/485', color: S.amber },
  ip:     { icon: <Wifi size={12} />,         label: 'TCP / IP',   color: S.blue  },
  cloud:  { icon: <Globe size={12} />,        label: 'Cloud',      color: S.green },
};

const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const PARITY_OPTS = ['none', 'even', 'odd', 'mark', 'space'];
const DATA_BITS   = [5, 6, 7, 8];
const STOP_BITS   = [1, 1.5, 2];

function DarkCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, ...style }}>
      {children}
    </div>
  );
}

function Badge({ meta }: { meta: { color: string; bg: string; label: string } }) {
  return (
    <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}>
      {meta.label}
    </span>
  );
}

// ─── Live Weight Card ─────────────────────────────────────────────────────────
function LiveWeightCard({ weighbridge, onCapture }: { weighbridge: any; onCapture?: (kg: number) => void }) {
  const [live, setLive] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WEIGHBRIDGE_WS_URL || 'ws://localhost:8765';
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
      ws.onopen  = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (e) => {
        try { const m = JSON.parse(e.data); if (m.type === 'weight') setLive(m.data); } catch {}
      };
    } catch { setWsConnected(false); }
    return () => ws?.close();
  }, []);

  const { data: cloudLive } = useQuery({
    queryKey: ['wb-live', weighbridge.id],
    queryFn: () => api.get(`/weighbridge/${weighbridge.id}/live`).then(r => r.data),
    refetchInterval: wsConnected ? false : 3000,
    enabled: !wsConnected,
  });

  const weight   = live || cloudLive;
  const kg       = Number(weight?.weight_kg || weighbridge.weight_kg || 0);
  const mt       = (kg / 1000).toFixed(3);
  const status   = weight?.status || weighbridge.live_status || 'unknown';
  const smeta    = STATUS_META[status] || STATUS_META.unknown;
  const connMeta = CONN_META[weighbridge.type] || CONN_META.serial;
  const capPct   = weighbridge.max_capacity_kg ? Math.min(100, (kg / weighbridge.max_capacity_kg) * 100) : 0;

  return (
    <DarkCard style={{ overflow: 'hidden' }}>
      {/* colour top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${smeta.color}, transparent)` }} />

      <div style={{ padding: '16px 20px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <p style={{ color: S.text, fontWeight: 700, fontSize: 15, margin: 0 }}>{weighbridge.name}</p>
            {weighbridge.location_label && (
              <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>{weighbridge.location_label}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ background: connMeta.color + '22', color: connMeta.color, border: `1px solid ${connMeta.color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {connMeta.icon}{connMeta.label}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: wsConnected ? S.green : S.muted }}>
              {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {wsConnected ? 'Live' : 'Poll'}
            </span>
          </div>
        </div>

        {/* Big weight */}
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 56, fontWeight: 800, color: smeta.color, lineHeight: 1, letterSpacing: '-2px' }}>
            {kg.toLocaleString('en-IN')}
          </div>
          <div style={{ color: S.muted, fontSize: 14, marginTop: 6 }}>
            kg &nbsp;·&nbsp; <span style={{ color: S.text, fontWeight: 600 }}>{mt}</span> MT
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: smeta.bg, border: `1px solid ${smeta.color}44`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: smeta.color }}>
            {status === 'stable' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {smeta.label}
          </div>
        </div>

        {/* Capacity bar */}
        {weighbridge.max_capacity_kg > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.muted, marginBottom: 4 }}>
              <span>Capacity</span>
              <span>{capPct.toFixed(1)}% of {(weighbridge.max_capacity_kg / 1000).toFixed(0)} MT</span>
            </div>
            <div style={{ height: 4, background: S.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${capPct}%`, height: '100%', background: capPct > 90 ? S.red : capPct > 70 ? S.amber : S.green, borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {weight?.vehicle_number && (
          <p style={{ textAlign: 'center', fontSize: 12, color: S.muted, marginBottom: 8 }}>
            Vehicle: <span style={{ color: S.text, fontWeight: 600 }}>{weight.vehicle_number}</span>
          </p>
        )}
        {weight?.captured_at && (
          <p style={{ textAlign: 'center', fontSize: 11, color: S.muted }}>
            {dayjs(weight.captured_at).format('HH:mm:ss')}
          </p>
        )}

        {onCapture && (
          <button
            onClick={() => onCapture(kg)}
            disabled={status !== 'stable' || kg === 0}
            style={{ width: '100%', marginTop: 14, background: status === 'stable' && kg > 0 ? S.greenT : 'transparent', border: `1px solid ${status === 'stable' && kg > 0 ? S.greenB : S.border}`, borderRadius: 8, color: status === 'stable' && kg > 0 ? S.green : S.muted, fontWeight: 600, fontSize: 13, padding: '8px 0', cursor: status === 'stable' && kg > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          >
            <Zap size={13} /> Capture Live Weight
          </button>
        )}
      </div>
    </DarkCard>
  );
}

// ─── Add Scale Wizard ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', type: 'serial' as 'serial' | 'ip' | 'cloud',
  com_port: 'COM1', baud_rate: 9600, data_bits: 8, stop_bits: 1, parity: 'none',
  ip_address: '', ip_port: 4001,
  max_capacity_kg: 60000, location_label: '',
};

function AddScaleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState<1 | 2>(1);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/weighbridge', data).then(r => r.data),
    onSuccess: () => { toast.success('Scale added!'); onSuccess(); onClose(); },
    onError: () => toast.error('Failed to add scale'),
  });

  const TYPE_OPTS = [
    { value: 'serial', label: 'Serial (RS-232 / RS-485)', desc: 'Direct COM port connection via USB-Serial adapter or RS-485 gateway', icon: <Cpu size={20} />, color: S.amber },
    { value: 'ip',     label: 'TCP / IP',                  desc: 'Scale controller on a LAN or a serial-over-Ethernet converter',       icon: <Wifi size={20} />, color: S.blue  },
    { value: 'cloud',  label: 'Cloud / Edge Agent',         desc: 'Edge device pushes weight via HTTPS — use the generated API key',      icon: <Globe size={20} />, color: S.green },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, width: '100%', maxWidth: 560, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: S.greenT, border: `1px solid ${S.greenB}`, borderRadius: 8, padding: 6, display: 'flex' }}>
              <MonitorSpeaker size={16} style={{ color: S.green }} />
            </div>
            <div>
              <p style={{ color: S.text, fontWeight: 700, margin: 0 }}>Add Weighbridge Scale</p>
              <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <p style={{ color: S.muted, fontSize: 13, marginBottom: 16 }}>Select the connection interface your weighbridge controller uses.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TYPE_OPTS.map(opt => (
                  <button key={opt.value} onClick={() => set('type', opt.value)}
                    style={{ background: form.type === opt.value ? `rgba(${opt.value === 'serial' ? '245,158,11' : opt.value === 'ip' ? '59,130,246' : '34,160,90'},0.10)` : S.card, border: `2px solid ${form.type === opt.value ? opt.color : S.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', transition: 'all 0.15s' }}>
                    <span style={{ color: opt.color }}>{opt.icon}</span>
                    <div>
                      <p style={{ color: S.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{opt.label}</p>
                      <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>{opt.desc}</p>
                    </div>
                    {form.type === opt.value && <CheckCircle size={16} style={{ color: opt.color, marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Scale Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Main Weighbridge" />
                </div>
                <div>
                  <label style={labelStyle}>Location Label</label>
                  <input style={inputStyle} value={form.location_label} onChange={e => set('location_label', e.target.value)} placeholder="e.g. Entry Gate" />
                </div>
                <div>
                  <label style={labelStyle}>Max Capacity (kg)</label>
                  <input style={inputStyle} type="number" value={form.max_capacity_kg} onChange={e => set('max_capacity_kg', Number(e.target.value))} />
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => form.name.trim() && setStep(2)} disabled={!form.name.trim()}
                  style={{ background: form.name.trim() ? S.green : S.border, color: form.name.trim() ? '#fff' : S.muted, border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
                  Next: Configure Connection →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ color: S.muted, fontSize: 13, marginBottom: 16 }}>
                {form.type === 'serial' && 'Configure the serial port parameters to match your indicator/controller.'}
                {form.type === 'ip'     && 'Enter the IP address and port of your scale controller or converter.'}
                {form.type === 'cloud'  && 'An API key will be generated. Use it in the edge agent configuration.'}
              </p>

              {form.type === 'serial' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>COM Port</label>
                    <input style={inputStyle} value={form.com_port} onChange={e => set('com_port', e.target.value)} placeholder="COM1 or /dev/ttyUSB0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Baud Rate</label>
                    <select style={inputStyle} value={form.baud_rate} onChange={e => set('baud_rate', Number(e.target.value))}>
                      {BAUD_RATES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Data Bits</label>
                    <select style={inputStyle} value={form.data_bits} onChange={e => set('data_bits', Number(e.target.value))}>
                      {DATA_BITS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Stop Bits</label>
                    <select style={inputStyle} value={form.stop_bits} onChange={e => set('stop_bits', Number(e.target.value))}>
                      {STOP_BITS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Parity</label>
                    <select style={inputStyle} value={form.parity} onChange={e => set('parity', e.target.value)}>
                      {PARITY_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.type === 'ip' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>IP Address</label>
                    <input style={inputStyle} value={form.ip_address} onChange={e => set('ip_address', e.target.value)} placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <label style={labelStyle}>Port</label>
                    <input style={inputStyle} type="number" value={form.ip_port} onChange={e => set('ip_port', Number(e.target.value))} placeholder="4001" />
                  </div>
                </div>
              )}

              {form.type === 'cloud' && (
                <div style={{ background: S.greenT, border: `1px solid ${S.greenB}`, borderRadius: 10, padding: 16 }}>
                  <p style={{ color: S.green, fontWeight: 600, fontSize: 13, margin: '0 0 6px' }}>Edge Agent Setup</p>
                  <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>
                    After saving, copy the generated API key and configure it in your edge agent. The agent pushes weight readings via HTTPS POST to the ingest endpoint.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 10, padding: '10px 20px', color: S.muted, cursor: 'pointer', fontWeight: 600 }}>
                  ← Back
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(form)}
                  style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}>
                  {mutation.isPending ? 'Saving…' : 'Save Scale'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Form ──────────────────────────────────────────────────────────────
function NewTicketForm({ weighbridges }: { weighbridges: any[] }) {
  const qc = useQueryClient();
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.get('/vehicles').then(r => r.data) });
  const { data: parties  = [] } = useQuery({ queryKey: ['parties'],  queryFn: () => api.get('/parties', { params: { type: 'customer' } }).then(r => r.data) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) });

  const [form, setForm] = useState({
    weighbridge_id: '', vehicle_id: '', vehicle_number: '',
    party_id: '', party_name: '', product_id: '', product_name: '',
    gross_weight_kg: '', tare_weight_kg: '', notes: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const captureGross = useCallback((kg: number) => { set('gross_weight_kg', String(kg)); toast.success(`Captured ${kg.toLocaleString()} kg`); }, []);
  const captureTare  = useCallback((kg: number) => { set('tare_weight_kg',  String(kg)); toast.success(`Tare: ${kg.toLocaleString()} kg`); }, []);

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/weighbridge/tickets', data).then(r => r.data),
    onSuccess: (t) => {
      toast.success(`${t.ticket_number} — Net: ${t.net_weight_mt} MT`);
      qc.invalidateQueries({ queryKey: ['wb-tickets'] });
      setForm(f => ({ ...f, gross_weight_kg: '', tare_weight_kg: '', notes: '' }));
    },
    onError: () => toast.error('Failed to create ticket'),
  });

  const net = Math.max(0, Number(form.gross_weight_kg) - Number(form.tare_weight_kg || 0));

  return (
    <DarkCard>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Scale size={16} style={{ color: S.green }} />
        <span style={{ color: S.text, fontWeight: 700, fontSize: 15 }}>New Weigh Ticket</span>
      </div>
      <div style={{ padding: 22 }}>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, gross_weight_kg: Number(form.gross_weight_kg), tare_weight_kg: Number(form.tare_weight_kg || 0) }); }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Weighbridge *</label>
            <select required style={inputStyle} value={form.weighbridge_id} onChange={e => set('weighbridge_id', e.target.value)}>
              <option value="">Select scale…</option>
              {weighbridges.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Vehicle</label>
            <select style={inputStyle} value={form.vehicle_id} onChange={e => {
              const v = (vehicles as any[]).find((x: any) => x.id === e.target.value);
              setForm(f => ({ ...f, vehicle_id: e.target.value, vehicle_number: v?.registration_number || '' }));
            }}>
              <option value="">Select vehicle…</option>
              {(vehicles as any[]).map((v: any) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Customer</label>
            <select style={inputStyle} value={form.party_id} onChange={e => {
              const p = (parties as any[]).find((x: any) => x.id === e.target.value);
              setForm(f => ({ ...f, party_id: e.target.value, party_name: p?.name || '' }));
            }}>
              <option value="">CASH</option>
              {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Product</label>
            <select style={inputStyle} value={form.product_id} onChange={e => {
              const p = (products as any[]).find((x: any) => x.id === e.target.value);
              setForm(f => ({ ...f, product_id: e.target.value, product_name: p?.name || '' }));
            }}>
              <option value="">Select product…</option>
              {(products as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Gross weight */}
          <div>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowDownToLine size={11} style={{ color: S.green }} /> Gross Weight (kg) *</span>
            </label>
            <input required type="number" style={inputStyle} value={form.gross_weight_kg}
              onChange={e => set('gross_weight_kg', e.target.value)} placeholder="e.g. 32000" min="0" />
            {form.weighbridge_id && (
              <button type="button" onClick={() => {}} style={{ marginTop: 4, fontSize: 11, color: S.green, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ↑ Capture from scale
              </button>
            )}
          </div>

          {/* Tare weight */}
          <div>
            <label style={labelStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUpFromLine size={11} style={{ color: S.amber }} /> Tare Weight (kg)</span>
            </label>
            <input type="number" style={inputStyle} value={form.tare_weight_kg}
              onChange={e => set('tare_weight_kg', e.target.value)} placeholder="0 = first weighing" min="0" />
          </div>

          {/* Net preview */}
          {Number(form.gross_weight_kg) > 0 && (
            <div style={{ gridColumn: '1 / -1', background: S.greenT, border: `1px solid ${S.greenB}`, borderRadius: 12, padding: '14px 20px', textAlign: 'center' }}>
              <p style={{ color: S.muted, fontSize: 12, margin: '0 0 4px' }}>Net Weight</p>
              <p style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 800, color: S.green, margin: 0, letterSpacing: '-1px' }}>{net.toLocaleString('en-IN')} <span style={{ fontSize: 18 }}>kg</span></p>
              <p style={{ color: S.muted, fontSize: 14, margin: '4px 0 0' }}>{(net / 1000).toFixed(3)} MT</p>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={mutation.isPending}
              style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}>
              {mutation.isPending ? 'Creating…' : 'Create Weigh Ticket'}
            </button>
          </div>
        </form>
      </div>
    </DarkCard>
  );
}

// ─── Tickets Table ────────────────────────────────────────────────────────────
function TicketsTable() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['wb-tickets'],
    queryFn: () => api.get('/weighbridge/tickets', { params: { limit: 50 } }).then(r => r.data),
  });

  return (
    <DarkCard>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} style={{ color: S.green }} />
          <span style={{ color: S.text, fontWeight: 700, fontSize: 15 }}>Weigh Tickets</span>
          <span style={{ background: S.greenT, color: S.green, border: `1px solid ${S.greenB}`, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{(tickets as any[]).length}</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
              {['Ticket', 'Vehicle', 'Customer', 'Product', 'Gross', 'Tare', 'Net', 'Time', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: S.muted, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tickets as any[]).map((t: any) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${S.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.green, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.ticket_number}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.text }}>{t.vehicle_number || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.text }}>{t.party_name || 'CASH'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.muted }}>{t.product_name || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.muted, fontFamily: 'monospace' }}>{Number(t.gross_weight_kg).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.muted, fontFamily: 'monospace' }}>{Number(t.tare_weight_kg).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: S.text, fontFamily: 'monospace', fontWeight: 700 }}>{Number(t.net_weight_mt).toFixed(3)} MT</td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: S.muted, whiteSpace: 'nowrap' }}>{dayjs(t.created_at).format('DD/MM HH:mm')}</td>
                <td style={{ padding: '10px 16px' }}>
                  {t.sale_id
                    ? <span style={{ fontSize: 11, color: S.green, fontWeight: 600 }}>Linked</span>
                    : <span style={{ fontSize: 11, color: S.muted }}>—</span>}
                </td>
              </tr>
            ))}
            {!(tickets as any[]).length && !isLoading && (
              <tr><td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: S.muted, fontSize: 13 }}>No tickets yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DarkCard>
  );
}

// ─── API Key display ──────────────────────────────────────────────────────────
function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [show, setShow] = useState(false);
  const copy = () => { navigator.clipboard.writeText(apiKey); toast.success('Copied!'); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: '6px 10px' }}>
      <code style={{ fontSize: 11, color: show ? S.text : S.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
        {show ? apiKey : '●'.repeat(Math.min(apiKey.length, 32))}
      </code>
      <button onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 2, display: 'flex' }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 2, display: 'flex' }}>
        <Copy size={13} />
      </button>
    </div>
  );
}

// ─── Scale Config Card (compact) ─────────────────────────────────────────────
function ScaleConfigCard({ wb, onDelete }: { wb: any; onDelete: () => void }) {
  const connMeta = CONN_META[wb.type] || CONN_META.serial;
  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ color: S.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{wb.name}</p>
          {wb.location_label && <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>{wb.location_label}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ background: connMeta.color + '22', color: connMeta.color, border: `1px solid ${connMeta.color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            {connMeta.icon}{connMeta.label}
          </span>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: 2, display: 'flex' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {wb.type === 'serial' && (
        <p style={{ color: S.muted, fontSize: 11, margin: '0 0 8px' }}>
          {wb.com_port} · {wb.baud_rate} baud · {wb.data_bits}-{wb.stop_bits}-{wb.parity?.[0]?.toUpperCase() || 'N'}
        </p>
      )}
      {wb.type === 'ip' && (
        <p style={{ color: S.muted, fontSize: 11, margin: '0 0 8px' }}>{wb.ip_address}:{wb.ip_port}</p>
      )}
      {wb.api_key && (
        <div>
          <p style={{ color: S.muted, fontSize: 11, marginBottom: 4 }}>API Key (edge agent)</p>
          <ApiKeyDisplay apiKey={wb.api_key} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0f1117', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' };

export default function WeighbridgePage() {
  useEffect(() => { log.page('Weighbridge'); }, []);

  const qc = useQueryClient();
  const [showAdd, setShowAdd]     = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'tickets' | 'config'>('live');

  const { data: weighbridges = [] } = useQuery({
    queryKey: ['weighbridges'],
    queryFn: () => api.get('/weighbridge').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/weighbridge/${id}`),
    onSuccess: () => { toast.success('Scale removed'); qc.invalidateQueries({ queryKey: ['weighbridges'] }); },
    onError: () => toast.error('Failed to remove scale'),
  });

  const tabs = [
    { key: 'live',    label: 'Live Scales',    icon: <Zap size={14} />         },
    { key: 'tickets', label: 'Weigh Tickets',  icon: <Scale size={14} />       },
    { key: 'config',  label: 'Configuration',  icon: <Settings2 size={14} />   },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: S.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: S.greenT, border: `1px solid ${S.greenB}`, borderRadius: 10, padding: 8, display: 'flex' }}>
              <MonitorSpeaker size={20} style={{ color: S.green }} />
            </div>
            <div>
              <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, margin: 0 }}>Weighbridge</h1>
              <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>
                {(weighbridges as any[]).length} scale{(weighbridges as any[]).length !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={14} /> Add Scale
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: activeTab === t.key ? S.green : 'none',
                color:      activeTab === t.key ? '#fff'  : S.muted }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Live tab */}
        {activeTab === 'live' && (
          <>
            {(weighbridges as any[]).length === 0 ? (
              <DarkCard style={{ padding: 40, textAlign: 'center' }}>
                <MonitorSpeaker size={40} style={{ color: S.muted, margin: '0 auto 16px' }} />
                <p style={{ color: S.text, fontWeight: 600, margin: '0 0 6px' }}>No scales configured</p>
                <p style={{ color: S.muted, fontSize: 13, margin: '0 0 20px' }}>Add your first weighbridge scale to start capturing weight data.</p>
                <button onClick={() => setShowAdd(true)}
                  style={{ background: S.green, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}>
                  Add Scale
                </button>
              </DarkCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {(weighbridges as any[]).map((wb: any) => (
                  <LiveWeightCard key={wb.id} weighbridge={wb} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tickets tab */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>
            <NewTicketForm weighbridges={weighbridges as any[]} />
            <TicketsTable />
          </div>
        )}

        {/* Config tab */}
        {activeTab === 'config' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
              {(weighbridges as any[]).map((wb: any) => (
                <ScaleConfigCard key={wb.id} wb={wb} onDelete={() => {
                  if (confirm(`Remove "${wb.name}"?`)) deleteMutation.mutate(wb.id);
                }} />
              ))}
            </div>
            {(weighbridges as any[]).length === 0 && (
              <p style={{ color: S.muted, fontSize: 14, textAlign: 'center', padding: 40 }}>No scales yet — click "Add Scale".</p>
            )}
            <DarkCard style={{ padding: 20 }}>
              <p style={{ color: S.green, fontWeight: 700, fontSize: 13, margin: '0 0 10px' }}>Edge Agent Setup</p>
              <p style={{ color: S.muted, fontSize: 12, margin: '0 0 12px' }}>
                The edge agent runs on a PC physically connected to your weighbridge indicator (serial or RS-485).
                It reads the weight string, parses it, and pushes to the cloud ingest endpoint every poll interval.
              </p>
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 12, color: '#86efac' }}>
                <p style={{ margin: '0 0 4px', color: S.muted }}># edge-agent.env</p>
                <p style={{ margin: '0 0 4px' }}>WEIGHBRIDGE_API_URL=<span style={{ color: S.text }}>https://api.yourplant.com/weighbridge/ingest</span></p>
                <p style={{ margin: '0 0 4px' }}>WEIGHBRIDGE_ID=<span style={{ color: S.text }}>&lt;scale id&gt;</span></p>
                <p style={{ margin: 0 }}>WEIGHBRIDGE_API_KEY=<span style={{ color: S.text }}>&lt;api key from above&gt;</span></p>
              </div>
            </DarkCard>
          </div>
        )}
      </main>

      {showAdd && (
        <AddScaleModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['weighbridges'] })}
        />
      )}
    </div>
  );
}
