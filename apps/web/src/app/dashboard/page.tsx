'use client';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getUpcomingMaintenance } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, AlertTriangle, IndianRupee } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardPage() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: maintenance } = useQuery({ queryKey: ['upcoming-maintenance'], queryFn: getUpcomingMaintenance });

  const kpis = [
    { label: "Today's Sales", value: `₹${Number(data?.today_sales?.total || 0).toLocaleString('en-IN')}`, sub: `${data?.today_sales?.count || 0} invoices`, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Collected Today', value: `₹${Number(data?.today_sales?.total || 0).toLocaleString('en-IN')}`, sub: 'Receipts', icon: IndianRupee, color: 'bg-green-500' },
    { label: 'Total Pending', value: `₹${Number(data?.total_pending?.total || 0).toLocaleString('en-IN')}`, sub: 'Receivables', icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Maintenance Alerts', value: String(maintenance?.length || 0), sub: 'Due this week', icon: AlertTriangle, color: 'bg-red-500' },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#1a3c5e] mb-6">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {kpis.map(k => (
            <div key={k.label} className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
              <div className={`${k.color} w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <k.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-xs text-gray-400">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top Products */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#1a3c5e] mb-4">Top Products (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.top_products || []}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="#1a3c5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#1a3c5e] mb-4">Upcoming Maintenance</h2>
            {maintenance?.length ? (
              <div className="space-y-3">
                {maintenance.map((m: any) => (
                  <div key={m.id} className="flex items-start justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <p className="font-medium text-sm">{m.asset_name}</p>
                      <p className="text-xs text-gray-600">{m.title}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.asset_type === 'vehicle' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {m.asset_type}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{new Date(m.scheduled_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No upcoming maintenance</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
