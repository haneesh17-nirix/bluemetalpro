'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getItemWiseReport, getPartyWiseReport, getGstSummary, getMonthlyTrend } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import dayjs from 'dayjs';

type ReportTab = 'item-wise' | 'party-wise' | 'gst' | 'trend';

export default function ReportsPage() {
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

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#1a3c5e] mb-6">Reports</h1>

        {/* Date range */}
        <div className="flex gap-3 mb-5">
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Item-wise */}
        {tab === 'item-wise' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={itemWise as any[]}>
                  <XAxis dataKey="product_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Bar dataKey="total_amount" name="Amount" fill="#1a3c5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1a3c5e] text-white">
                  <tr>{['Product', 'HSN', 'Unit', 'Qty', 'Amount', 'CGST', 'SGST', 'IGST', 'Total (with GST)', 'Invoices'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(itemWise as any[]).map((r: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2.5 font-medium">{r.product_name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{r.hsn_code}</td>
                      <td className="px-4 py-2.5">{r.unit}</td>
                      <td className="px-4 py-2.5">{fmtQty(r.total_quantity)}</td>
                      <td className="px-4 py-2.5">{fmt(r.total_amount)}</td>
                      <td className="px-4 py-2.5">{fmt(r.total_cgst)}</td>
                      <td className="px-4 py-2.5">{fmt(r.total_sgst)}</td>
                      <td className="px-4 py-2.5">{fmt(r.total_igst)}</td>
                      <td className="px-4 py-2.5 font-semibold">{fmt(r.total_with_gst)}</td>
                      <td className="px-4 py-2.5">{r.num_invoices}</td>
                    </tr>
                  ))}
                  {(itemWise as any[]).length > 0 && (
                    <tr className="bg-[#1a3c5e] text-white font-bold">
                      <td className="px-4 py-2.5" colSpan={4}>TOTAL</td>
                      <td className="px-4 py-2.5">{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_amount), 0))}</td>
                      <td className="px-4 py-2.5">{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_cgst), 0))}</td>
                      <td className="px-4 py-2.5">{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_sgst), 0))}</td>
                      <td className="px-4 py-2.5">{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_igst), 0))}</td>
                      <td className="px-4 py-2.5">{fmt((itemWise as any[]).reduce((s: number, r: any) => s + Number(r.total_with_gst), 0))}</td>
                      <td className="px-4 py-2.5">{(itemWise as any[]).reduce((s: number, r: any) => s + Number(r.num_invoices), 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Party-wise */}
        {tab === 'party-wise' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3c5e] text-white">
                <tr>{['Party', 'GSTIN', 'Invoices', 'Total Sales', 'Received', 'Pending'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(partyWise as any[]).map((r: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium">{r.party_name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.gstin || '-'}</td>
                    <td className="px-4 py-2.5">{r.invoice_count}</td>
                    <td className="px-4 py-2.5">{fmt(r.total_sales)}</td>
                    <td className="px-4 py-2.5 text-green-600">{fmt(r.total_received)}</td>
                    <td className="px-4 py-2.5 text-red-600">{fmt(r.total_pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* GST Summary */}
        {tab === 'gst' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3c5e] text-white">
                <tr>{['Month', 'Type', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {(gst as any[]).map((r: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2.5">{dayjs(r.month).format('MMM YYYY')}</td>
                    <td className="px-4 py-2.5 capitalize">{r.invoice_type?.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5">{r.invoice_count}</td>
                    <td className="px-4 py-2.5">{fmt(r.taxable_amount)}</td>
                    <td className="px-4 py-2.5">{fmt(r.cgst)}</td>
                    <td className="px-4 py-2.5">{fmt(r.sgst)}</td>
                    <td className="px-4 py-2.5">{fmt(r.igst)}</td>
                    <td className="px-4 py-2.5 font-medium">{fmt(r.total_tax)}</td>
                    <td className="px-4 py-2.5 font-bold">{fmt(r.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Trend */}
        {tab === 'trend' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1a3c5e] mb-4">Monthly Sales Trend</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trend as any[]}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Line type="monotone" dataKey="total_sales" name="Sales" stroke="#1a3c5e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
