'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getUpcomingMaintenance } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, ShoppingCart, AlertTriangle, IndianRupee,
  Package, Truck, Wrench, ArrowUpRight,
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import Link from 'next/link';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-4 py-3 text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="font-semibold text-gold-light">{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: maintenance } = useQuery({ queryKey: ['upcoming-maintenance'], queryFn: getUpcomingMaintenance });

  const kpis = [
    {
      label: "Today's Sales",
      value: fmt(Number(data?.today_sales?.total || 0)),
      sub: `${data?.today_sales?.count || 0} invoices`,
      icon: ShoppingCart,
      grad: 'linear-gradient(135deg, #1e4976, #2563a8)',
      glow: 'rgba(37,99,168,0.35)',
    },
    {
      label: 'Total Receivables',
      value: fmt(Number(data?.total_pending?.total || 0)),
      sub: 'Outstanding balance',
      icon: TrendingUp,
      grad: 'linear-gradient(135deg, #9a7a2e, #e8c96a)',
      glow: 'rgba(201,168,76,0.35)',
    },
    {
      label: 'Purchases (Month)',
      value: fmt(Number(data?.month_purchases || 0)),
      sub: 'Total procurement',
      icon: Package,
      grad: 'linear-gradient(135deg, #1f5c3b, #3da066)',
      glow: 'rgba(46,125,82,0.35)',
    },
    {
      label: 'Maintenance Alerts',
      value: String(maintenance?.length || 0),
      sub: 'Due this week',
      icon: AlertTriangle,
      grad: 'linear-gradient(135deg, #7f1d1d, #ef4444)',
      glow: 'rgba(239,68,68,0.3)',
    },
  ];

  const quickActions = [
    { label: 'New Sale', href: '/sales/new', icon: ShoppingCart, color: '#2563a8' },
    { label: 'Add Vehicle', href: '/vehicles/new', icon: Truck, color: '#2e7d52' },
    { label: 'New Purchase', href: '/purchases/new', icon: Package, color: '#9a7a2e' },
    { label: 'Maintenance', href: '/maintenance/new', icon: Wrench, color: '#7f1d1d' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Dashboard" subtitle="Welcome back — here's your business at a glance" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={k.label} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="stat-icon" style={{ background: k.grad, boxShadow: `0 6px 20px ${k.glow}` }}>
                  <k.icon size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  {isLoading
                    ? <div className="skeleton h-6 w-24 mb-1" />
                    : <p className="text-xl font-bold text-white leading-none">{k.value}</p>
                  }
                  <p className="text-xs font-medium text-white/70 mt-1">{k.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + Maintenance row */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

            {/* Top Products Chart */}
            <div className="card p-5 xl:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Top Products</h2>
                  <p className="text-xs text-white/40 mt-0.5">Revenue — last 30 days</p>
                </div>
                <Link href="/reports" className="btn-ghost text-xs py-1 px-3">
                  View reports <ArrowUpRight size={12} />
                </Link>
              </div>
              {isLoading ? (
                <div className="skeleton h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.top_products || []} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}
                      fill="url(#goldGrad)" />
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8c96a" />
                        <stop offset="100%" stopColor="#9a7a2e" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Upcoming Maintenance */}
            <div className="card p-5 xl:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">Maintenance Due</h2>
                  <p className="text-xs text-white/40 mt-0.5">This week</p>
                </div>
                <Link href="/maintenance" className="btn-ghost text-xs py-1 px-3">
                  All <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {maintenance?.length ? maintenance.map((m: any) => (
                  <div key={m.id} className="flex items-start justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-white truncate">{m.asset_name}</p>
                      <p className="text-xs text-white/50 truncate">{m.title}</p>
                    </div>
                    <div className="ml-3 text-right flex-shrink-0">
                      <span className={m.asset_type === 'vehicle' ? 'badge-blue' : 'badge-gray'}>
                        {m.asset_type}
                      </span>
                      <p className="text-[11px] text-white/40 mt-1">
                        {new Date(m.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="flex-1 flex items-center justify-center py-8">
                    <p className="text-white/30 text-sm">No upcoming maintenance</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        </main>
      </div>
    </div>
  );
}
