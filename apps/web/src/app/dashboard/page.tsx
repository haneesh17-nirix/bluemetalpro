'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getUpcomingMaintenance, getMonthlyTrend } from '@/lib/api';
import { log } from '@bluemetal/shared';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, AlertTriangle,
  IndianRupee, Package, Truck, Wrench, ArrowUpRight,
  FileText, Minus,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';
import { useCrusher } from '@/contexts/CrusherContext';
import dayjs from 'dayjs';

const inr = (n: number) =>
  n >= 10_00_000
    ? `₹${(n / 10_00_000).toFixed(2)}L`
    : n >= 1_000
    ? `₹${(n / 1_000).toFixed(1)}K`
    : `₹${n.toLocaleString('en-IN')}`;

const full = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

// ── Tooltip ─────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-4 py-3 text-xs shadow-xl">
      <p className="text-white/50 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {full(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Delta badge ──────────────────────────────────────────
function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev || prev === 0) return null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: pct === 0 ? 'rgba(255,255,255,0.06)' : up ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
        color: pct === 0 ? 'rgba(255,255,255,0.4)' : up ? '#34d399' : '#f87171',
      }}
    >
      <Icon size={10} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── Payment-mode chip ────────────────────────────────────
function PayBadge({ mode }: { mode: string }) {
  const map: Record<string, string> = {
    cash: 'badge-gem', credit: 'badge-gray', upi: 'badge-blue',
    cheque: 'badge-gold', neft: 'badge-blue', rtgs: 'badge-blue',
  };
  return <span className={map[mode] || 'badge-gray'}>{mode.toUpperCase()}</span>;
}

export default function DashboardPage() {
  useEffect(() => { log.page('Dashboard'); }, []);
  const { crusher } = useCrusher();

  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: maintenance } = useQuery({ queryKey: ['upcoming-maintenance'], queryFn: getUpcomingMaintenance });
  const { data: trend = [] } = useQuery({ queryKey: ['monthly-trend'], queryFn: getMonthlyTrend });

  const todaySales  = Number(data?.today_sales?.total  || 0);
  const todayCount  = Number(data?.today_sales?.count  || 0);
  const yesterdaySales = Number(data?.yesterday_sales?.total || 0);
  const pending     = Number(data?.total_pending?.total || 0);
  const monthSales  = Number(data?.month_sales?.total  || 0);
  const monthPurchases = Number(data?.month_purchases?.total || 0);

  const kpis = [
    {
      label: "Today's Sales",
      value: inr(todaySales),
      sub: `${todayCount} invoices`,
      icon: ShoppingCart,
      grad: 'linear-gradient(135deg, #1e4976, #2563a8)',
      glow: 'rgba(37,99,168,0.35)',
      delta: <Delta now={todaySales} prev={yesterdaySales} />,
    },
    {
      label: 'Month Revenue',
      value: inr(monthSales),
      sub: `${data?.month_sales?.count || 0} invoices`,
      icon: TrendingUp,
      grad: 'linear-gradient(135deg, #7a5e22, #c9a84c)',
      glow: 'rgba(184,149,62,0.35)',
      delta: null,
    },
    {
      label: 'Purchases (Month)',
      value: inr(monthPurchases),
      sub: 'Total procurement',
      icon: Package,
      grad: 'linear-gradient(135deg, #1f5c3b, #3da066)',
      glow: 'rgba(46,125,82,0.35)',
      delta: null,
    },
    {
      label: 'Total Receivables',
      value: inr(pending),
      sub: 'Outstanding balance',
      icon: AlertTriangle,
      grad: pending > 0 ? 'linear-gradient(135deg, #7f1d1d, #ef4444)' : 'linear-gradient(135deg, #1f5c3b, #3da066)',
      glow: pending > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(46,125,82,0.35)',
      delta: null,
    },
  ];

  const quickActions = [
    { label: 'New Sale',     href: '/sales',       icon: ShoppingCart, color: '#2563a8' },
    { label: 'Add Vehicle',  href: '/vehicles',    icon: Truck,        color: '#2e7d52' },
    { label: 'New Purchase', href: '/purchases',   icon: Package,      color: '#8a6a28' },
    { label: 'Maintenance',  href: '/maintenance', icon: Wrench,       color: '#7f1d1d' },
  ];

  return (
    <AppLayout
      title="Dashboard"
      subtitle={crusher ? (crusher.legal_name || crusher.name) + (crusher.city ? ' · ' + crusher.city : '') : 'Loading...'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── KPI Cards ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {kpis.map((k, i) => (
              <div key={k.label} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="stat-icon" style={{ background: k.grad, boxShadow: `0 6px 20px ${k.glow}` }}>
                  <k.icon size={20} className="text-white" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {isLoading
                    ? <div className="skeleton h-6 w-24 mb-1" />
                    : <p className="text-xl font-bold text-white leading-none">{k.value}</p>
                  }
                  <p className="text-xs font-medium text-white/70 mt-1">{k.label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <p className="text-[11px] text-white/40">{k.sub}</p>
                    {!isLoading && k.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Crusher info strip ────────────────────── */}
          {crusher && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(184,149,62,0.08) 0%, rgba(184,149,62,0.03) 100%)',
              border: '1px solid rgba(184,149,62,0.18)',
              borderRadius: 14,
              padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }} className="text-sm">
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px 24px' }}>
                {crusher.gstin && (
                  <span className="text-white/50">
                    GSTIN: <span className="text-white/80 font-mono tracking-wide">{crusher.gstin}</span>
                  </span>
                )}
                {crusher.city && (
                  <span className="text-white/50">
                    Location: <span className="text-white/80">{[crusher.city, crusher.state].filter(Boolean).join(', ')}</span>
                  </span>
                )}
                {crusher.phone && (
                  <span className="text-white/50">
                    Phone: <span className="text-white/80">{crusher.phone}</span>
                  </span>
                )}
              </div>
              <Link href="/settings" className="btn-ghost text-xs py-1 px-3 flex-shrink-0">
                Settings <ArrowUpRight size={12} />
              </Link>
            </div>
          )}

          {/* ── Monthly Trend + Top Products ─────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

            {/* Area chart — 12-month trend */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Monthly Revenue</h2>
                  <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', marginTop: 3 }}>Last 12 months · confirmed sales</p>
                </div>
                <Link href="/reports" className="btn-ghost text-xs py-1 px-3">Full report <ArrowUpRight size={12} /></Link>
              </div>
              <div className="panel-body">
              {isLoading ? (
                <div className="skeleton h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend as any[]} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#c9a84c" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                    <Area
                      type="monotone" dataKey="total_sales" name="Revenue"
                      stroke="#c9a84c" strokeWidth={2}
                      fill="url(#areaGold)" dot={false} activeDot={{ r: 4, fill: '#c9a84c' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              </div>
            </div>

            {/* Top Products bar — right panel */}
            <div className="card" style={{ overflow: 'hidden' }} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Top Products</h2>
                  <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', marginTop: 3 }}>Revenue — last 30 days</p>
                </div>
              </div>
              <div className="panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {isLoading ? (
                <div className="skeleton flex-1 w-full" />
              ) : (data?.top_products?.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.top_products} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#7a5e22" />
                        <stop offset="100%" stopColor="#c9a84c" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80}
                      tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey="amount" name="Revenue" radius={[0, 6, 6, 0]} fill="url(#goldH)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className="text-white/30 text-sm">No data yet</p>
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* ── Recent Sales + Maintenance ────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

            {/* Recent sales */}
            <div className="card" style={{ overflow: 'hidden' }} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Recent Sales</h2>
                  <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', marginTop: 3 }}>Last 6 confirmed invoices</p>
                </div>
                <Link href="/sales" className="btn-ghost text-xs py-1 px-3">All sales <ArrowUpRight size={12} /></Link>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
                </div>
              ) : data?.recent_sales?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-white/40 border-b border-white/8">
                        <th className="pb-2 font-medium pr-4">Invoice</th>
                        <th className="pb-2 font-medium pr-4">Party</th>
                        <th className="pb-2 font-medium pr-4">Date</th>
                        <th className="pb-2 font-medium pr-4 text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(data.recent_sales as any[]).map((s: any) => (
                        <tr key={s.id} className="hover:bg-white/3 transition-colors">
                          <td className="py-2.5 pr-4">
                            <span className="font-mono text-xs text-white/80">{s.invoice_number}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-white/70 max-w-[120px] truncate">{s.party_name}</td>
                          <td className="py-2.5 pr-4 text-white/40 text-xs whitespace-nowrap">
                            {dayjs(s.sale_date).format('DD MMM')}
                          </td>
                          <td className="py-2.5 pr-4 text-right font-semibold text-white">
                            {inr(Number(s.grand_total))}
                          </td>
                          <td className="py-2.5 text-right">
                            <PayBadge mode={s.payment_mode || 'credit'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                  <FileText size={28} className="text-white/15" />
                  <p className="text-white/30 text-sm">No sales recorded yet</p>
                </div>
              )}
              </div>
            </div>

            {/* Upcoming Maintenance */}
            <div className="card" style={{ overflow: 'hidden' }} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Maintenance Due</h2>
                  <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', marginTop: 3 }}>This week</p>
                </div>
                <Link href="/maintenance" className="btn-ghost text-xs py-1 px-3">All <ArrowUpRight size={12} /></Link>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {maintenance?.length ? maintenance.map((m: any) => (
                  <div key={m.id}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="font-medium text-sm text-white truncate">{m.asset_name}</p>
                      <p className="text-xs text-white/50 truncate">{m.title}</p>
                    </div>
                    <div style={{ marginLeft: 12, textAlign: 'right', flexShrink: 0 }}>
                      <span className={m.asset_type === 'vehicle' ? 'badge-blue' : 'badge-gray'}>
                        {m.asset_type}
                      </span>
                      <p className="text-[11px] text-white/40 mt-1">
                        {dayjs(m.scheduled_date).format('DD MMM')}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
                    <Wrench size={28} className="text-white/15" />
                    <p className="text-white/30 text-sm">No upcoming maintenance</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ─────────────────────────── */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="panel-header">
              <h2 className="panel-title">Quick Actions</h2>
            </div>
            <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {quickActions.map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-surface-border hover:border-gold/30 hover:bg-surface-hover transition-all duration-150 group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}25`, border: `1px solid ${a.color}40` }}>
                    <a.icon size={16} style={{ color: a.color }} />
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">{a.label}</span>
                </Link>
              ))}
            </div>
            </div>
          </div>

      </div>
    </AppLayout>
  );
}
