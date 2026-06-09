'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { log } from '@bluemetal/shared';
import { getItemWiseReport, getPartyWiseReport, getGstSummary, getMonthlyTrend } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import dayjs from 'dayjs';

type ReportTab = 'item-wise' | 'party-wise' | 'gst' | 'trend';

export default function ReportsPage() {
  useEffect(() => { log.page('Reports'); }, []);
  const [tab, setTab] = useState<ReportTab>('item-wise');
  const [range, setRange] = useState({ from: dayjs().format('YYYY-MM-01'), to: dayjs().format('YYYY-MM-DD') });

  const { data: itemWise = [] } = useQuery({ queryKey: ['report-item', range], queryFn: () => getItemWiseReport(range), enabled: tab === 'item-wise' });
  const { data: partyWise = [] } = useQuery({ queryKey: ['report-party', range], queryFn: () => getPartyWiseReport(range), enabled: tab === 'party-wise' });
  const { data: gst = [] } = useQuery({ queryKey: ['report-gst', range], queryFn: () => getGstSummary(range), enabled: tab === 'gst' });
  const { data: trend = [] } = useQuery({ queryKey: ['report-trend'], queryFn: getMonthlyTrend, enabled: tab === 'trend' });

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'item-wise', label: 'Item-wise Sales' },
    { key: 'party-wise', label: 'Party-wise' },
    { key: 'gst', label: 'GST Summary' },
    { key: 'trend', label: 'Monthly Trend' },
  ];

  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const fmtQty = (v: number) => `${Number(v || 0).toFixed(2)} MT`;

  const dateActions = (
    <div className="flex items-center gap-3">
      <input
        type="date"
        value={range.from}
        onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
        className="input text-sm"
      />
      <span className="text-white/40 text-sm">to</span>
      <input
        type="date"
        value={range.to}
        onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
        className="input text-sm"
      />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Reports" subtitle="Business analytics and insights" actions={dateActions} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-surface-card border border-surface-border w-fit mb-6">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'btn-primary' : 'text-white/50 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Item-wise */}
          {tab === 'item-wise' && (
            <div className="space-y-6">
              <div className="card p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={itemWise as any[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="product_name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} />
                    <Tooltip
                      formatter={(v: any) => fmt(v)}
                      contentStyle={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    />
                    <defs>
                      <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e8c96a" />
                        <stop offset="100%" stopColor="#9a7a2e" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="total_amount" name="Amount" fill="url(#goldBar)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-wrapper">
                <table className="w-full text-sm">
                  <thead>
                    <tr>{['Product', 'HSN', 'Unit', 'Qty', 'Amount', 'CGST', 'SGST', 'IGST', 'Total (with GST)', 'Invoices'].map(h => (
                      <th key={h}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(itemWise as any[]).map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="font-medium text-white">{r.product_name}</td>
                        <td className="text-white/50">{r.hsn_code}</td>
                        <td>{r.unit}</td>
                        <td>{fmtQty(r.total_quantity)}</td>
                        <td>{fmt(r.total_amount)}</td>
                        <td>{fmt(r.total_cgst)}</td>
                        <td>{fmt(r.total_sgst)}</td>
                        <td>{fmt(r.total_igst)}</td>
                        <td className="font-semibold text-[#c9a84c]">{fmt(r.total_with_gst)}</td>
                        <td>{r.num_invoices}</td>
                      </tr>
                    ))}
                    {(itemWise as any[]).length > 0 && (
                      <tr className="bg-[#c9a84c]/10 font-bold text-[#c9a84c]">
                        <td colSpan={4}>TOTAL</td>
                        <td>{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_amount), 0))}</td>
                        <td>{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_cgst), 0))}</td>
                        <td>{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_sgst), 0))}</td>
                        <td>{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_igst), 0))}</td>
                        <td>{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_with_gst), 0))}</td>
                        <td>{(itemWise as any[]).reduce((s: number, r: any) => s + Number(r.num_invoices), 0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Party-wise */}
          {tab === 'party-wise' && (
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>{['Party', 'GSTIN', 'Invoices', 'Total Sales', 'Received', 'Pending'].map(h => (
                    <th key={h}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(partyWise as any[]).map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium text-white">{r.party_name}</td>
                      <td className="text-white/50">{r.gstin || '-'}</td>
                      <td>{r.invoice_count}</td>
                      <td>{fmt(r.total_sales)}</td>
                      <td className="text-emerald-400">{fmt(r.total_received)}</td>
                      <td className="text-red-400">{fmt(r.total_pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GST Summary */}
          {tab === 'gst' && (
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>{['Month', 'Type', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total'].map(h => (
                    <th key={h}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(gst as any[]).map((r: any, i: number) => (
                    <tr key={i}>
                      <td>{dayjs(r.month).format('MMM YYYY')}</td>
                      <td className="capitalize">{r.invoice_type?.replace('_', ' ')}</td>
                      <td>{r.invoice_count}</td>
                      <td>{fmt(r.taxable_amount)}</td>
                      <td>{fmt(r.cgst)}</td>
                      <td>{fmt(r.sgst)}</td>
                      <td>{fmt(r.igst)}</td>
                      <td className="font-medium">{fmt(r.total_tax)}</td>
                      <td className="font-bold text-[#c9a84c]">{fmt(r.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Trend */}
          {tab === 'trend' && (
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5">Monthly Sales Trend</h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trend as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} />
                  <Tooltip
                    formatter={(v: any) => fmt(v)}
                    contentStyle={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Line type="monotone" dataKey="total_sales" name="Sales" stroke="#c9a84c" strokeWidth={2} dot={{ r: 4, fill: '#c9a84c' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
