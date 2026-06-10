'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { log } from '@bluemetal/shared';
import { getItemWiseReport, getPartyWiseReport, getGstSummary, getMonthlyTrend, getPlReport } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ComposedChart, Area,
} from 'recharts';
import AppLayout from '@/components/layout/AppLayout';
import TabBar from '@/components/ui/TabBar';
import dayjs from 'dayjs';

type ReportTab = 'item-wise' | 'party-wise' | 'gst' | 'trend' | 'pl';

// ── P&L helpers ───────────────────────────────────────────────────────────────
function KpiBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const isCost = value.includes('₹') || value.startsWith('Rs');
  const tileClass = isCost ? 'cost-tile' : 'gold-tile';
  const valueColor = color || (isCost ? '#d4a84a' : '#e8c96a');
  return (
    <div className={tileClass} style={{ padding: '18px 20px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: isCost ? 'rgba(200,160,65,0.55)' : 'rgba(215,175,75,0.55)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: valueColor, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: isCost ? 'rgba(185,140,50,0.45)' : 'rgba(195,155,55,0.45)', marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

function CostBar({ label, amount, pct, color }: { label: string; amount: number; pct: number; color: string }) {
  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#c8d4e8' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e8edf5' }}>{fmt(amount)} <span style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)' }}>({pct.toFixed(1)}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 6, borderRadius: 3, width: `${Math.min(pct, 100)}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  useEffect(() => { log.page('Reports'); }, []);
  const [tab, setTab] = useState<ReportTab>('item-wise');

  // Default range: current financial year (Apr 1 → today)
  const fyStart = dayjs().month() >= 3
    ? dayjs().startOf('year').month(3).format('YYYY-MM-DD')
    : dayjs().subtract(1, 'year').month(3).format('YYYY-MM-DD');
  const [range, setRange] = useState({ from: fyStart, to: dayjs().format('YYYY-MM-DD') });
  const [plRange, setPlRange] = useState({ from: fyStart, to: dayjs().format('YYYY-MM-DD') });

  const { data: itemWise = [] } = useQuery({ queryKey: ['report-item', range], queryFn: () => getItemWiseReport(range), enabled: tab === 'item-wise' });
  const { data: partyWise = [] } = useQuery({ queryKey: ['report-party', range], queryFn: () => getPartyWiseReport(range), enabled: tab === 'party-wise' });
  const { data: gst = [] } = useQuery({ queryKey: ['report-gst', range], queryFn: () => getGstSummary(range), enabled: tab === 'gst' });
  const { data: trend = [] } = useQuery({ queryKey: ['report-trend'], queryFn: getMonthlyTrend, enabled: tab === 'trend' });
  const { data: pl, isLoading: plLoading } = useQuery({ queryKey: ['report-pl', plRange], queryFn: () => getPlReport(plRange), enabled: tab === 'pl' });

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'item-wise', label: 'Item-wise Sales' },
    { key: 'party-wise', label: 'Party-wise' },
    { key: 'gst', label: 'GST Summary' },
    { key: 'trend', label: 'Monthly Trend' },
    { key: 'pl', label: 'P&L / Opex' },
  ];

  const fmt = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const fmtQty = (v: number) => `${Number(v || 0).toFixed(2)} MT`;

  const activeFrom = tab === 'pl' ? plRange.from : range.from;
  const activeTo   = tab === 'pl' ? plRange.to   : range.to;
  const setFrom = (v: string) => tab === 'pl' ? setPlRange(r => ({ ...r, from: v })) : setRange(r => ({ ...r, from: v }));
  const setTo   = (v: string) => tab === 'pl' ? setPlRange(r => ({ ...r, to: v }))   : setRange(r => ({ ...r, to: v }));

  const dateActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input type="date" value={activeFrom} onChange={e => setFrom(e.target.value)} className="input" style={{ width: 150, fontSize: 13 }} />
      <span style={{ color: 'rgba(200,212,232,0.4)', fontSize: 13 }}>to</span>
      <input type="date" value={activeTo}   onChange={e => setTo(e.target.value)}   className="input" style={{ width: 150, fontSize: 13 }} />
    </div>
  );

  const s = pl?.summary;

  return (
    <AppLayout title="Reports" subtitle="Business analytics and insights" actions={dateActions}>
      <TabBar
        tabs={tabs}
        active={tab}
        onChange={k => setTab(k as ReportTab)}
      />

          {/* Item-wise */}
          {tab === 'item-wise' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ padding: 24 }}>
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
                <table className="text-sm" style={{ width: '100%' }}>
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
                        <td className="font-semibold" style={{ color: '#c9a84c' }}>{fmt(r.total_with_gst)}</td>
                        <td>{r.num_invoices}</td>
                      </tr>
                    ))}
                    {(itemWise as any[]).length > 0 && (
                      <tr className="font-bold" style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>
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
              <table className="text-sm" style={{ width: '100%' }}>
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
                      <td style={{ color: '#34d399' }}>{fmt(r.total_received)}</td>
                      <td style={{ color: '#f87171' }}>{fmt(r.total_pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GST Summary */}
          {tab === 'gst' && (
            <div className="table-wrapper">
              <table className="text-sm" style={{ width: '100%' }}>
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
                      <td className="font-bold" style={{ color: '#c9a84c' }}>{fmt(r.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Trend */}
          {tab === 'trend' && (
            <div className="card" style={{ padding: 24 }}>
              <h2 className="font-semibold text-white" style={{ marginBottom: 20 }}>Monthly Sales Trend</h2>
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

          {/* P&L / Opex */}
          {tab === 'pl' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {plLoading && (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'rgba(200,212,232,0.4)' }}>
                  Loading P&L data…
                </div>
              )}

              {s && (
                <>
                  {/* KPI summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <KpiBox label="Total Revenue"   value={fmt(s.total_revenue)}   sub="Sales + Quarry (ex-GST)" color="#c9a84c" />
                    <KpiBox label="Total Cost"      value={fmt(s.total_cost)}      sub="Materials + Wages + Maint + Opex" color="#f87171" />
                    <KpiBox
                      label="Gross Profit"
                      value={fmt(s.gross_profit)}
                      sub={`${s.gross_margin_pct}% margin`}
                      color={s.gross_profit >= 0 ? '#34d399' : '#f87171'}
                    />
                    <KpiBox label="GST Collected"  value={fmt(s.gst_collected)}   sub="Liability to govt" color="#818cf8" />
                  </div>

                  {/* Second KPI row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <KpiBox label="Sales Revenue"   value={fmt(s.sales_revenue)}   sub="Crusher sales ex-GST" />
                    <KpiBox label="Quarry Revenue"  value={fmt(s.quarry_revenue)}  sub={`Royalty paid: ${fmt(s.royalty_paid)}`} />
                    <KpiBox label="Cash Received"   value={fmt(s.cash_received)}   sub={`Outstanding: ${fmt(s.outstanding)}`} />
                    <KpiBox label="Raw Material"    value={fmt(s.purchase_cost)}   sub="Purchases ex-GST" />
                  </div>

                  {/* Monthly chart + cost breakdown side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                    {/* Monthly P&L chart */}
                    <div className="card" style={{ padding: 24 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8edf5', marginBottom: 20 }}>Monthly Revenue vs Cost vs Profit</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={pl?.monthly || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }} tickFormatter={(v: number) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : `${(v/1000).toFixed(0)}K`} />
                          <Tooltip
                            formatter={(v: any, name: string) => [fmt(v), name]}
                            contentStyle={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                          />
                          <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="total_revenue" name="Revenue" fill="url(#revenueGrad)" stroke="#c9a84c" strokeWidth={2} />
                          <Bar dataKey="total_cost" name="Total Cost" fill="rgba(248,113,113,0.5)" radius={[3, 3, 0, 0]} />
                          <Area type="monotone" dataKey="gross_profit" name="Gross Profit" fill="url(#profitGrad)" stroke="#34d399" strokeWidth={2} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Cost breakdown */}
                    <div className="card" style={{ padding: 24 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8edf5', marginBottom: 20 }}>Cost Breakdown</h3>
                      {(pl?.cost_breakdown || []).map((c: any) => (
                        <CostBar key={c.category} label={c.category} amount={c.amount}
                          pct={Number(c.pct.toFixed(1))}
                          color={
                            c.category === 'Raw Materials'    ? '#f87171' :
                            c.category === 'Wages'            ? '#fb923c' :
                            c.category === 'Maintenance'      ? '#a78bfa' :
                                                                '#60a5fa'
                          }
                        />
                      ))}
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'rgba(200,212,232,0.6)' }}>Wages</span>
                          <span style={{ fontSize: 13, color: '#e8edf5' }}>{fmt(s.wages_cost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ fontSize: 13, color: 'rgba(200,212,232,0.6)' }}>Maintenance</span>
                          <span style={{ fontSize: 13, color: '#e8edf5' }}>{fmt(s.maintenance_cost)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ fontSize: 13, color: 'rgba(200,212,232,0.6)' }}>Opex / Overheads</span>
                          <span style={{ fontSize: 13, color: '#e8edf5' }}>{fmt(s.opex_total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly table */}
                  <div className="table-wrapper">
                    <table style={{ width: '100%' }} className="text-sm">
                      <thead>
                        <tr>
                          {['Month', 'Sales Rev', 'Quarry Rev', 'Total Rev', 'Raw Material', 'Wages', 'Maintenance', 'Opex', 'Total Cost', 'Gross Profit', 'Margin'].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(pl?.monthly || []).map((row: any, i: number) => {
                          const margin = row.total_revenue > 0
                            ? ((row.gross_profit / row.total_revenue) * 100).toFixed(1)
                            : '—';
                          return (
                            <tr key={i}>
                              <td className="font-medium text-white">{row.month}</td>
                              <td>{fmt(row.sales_revenue)}</td>
                              <td>{fmt(row.quarry_revenue)}</td>
                              <td className="font-semibold" style={{ color: '#c9a84c' }}>{fmt(row.total_revenue)}</td>
                              <td style={{ color: '#f87171' }}>{fmt(row.purchase_cost)}</td>
                              <td style={{ color: '#fb923c' }}>{fmt(row.wages)}</td>
                              <td style={{ color: '#a78bfa' }}>{fmt(row.maintenance_cost)}</td>
                              <td style={{ color: '#60a5fa' }}>{fmt(row.opex)}</td>
                              <td style={{ color: '#f87171' }}>{fmt(row.total_cost)}</td>
                              <td className="font-bold" style={{ color: Number(row.gross_profit) >= 0 ? '#34d399' : '#f87171' }}>
                                {fmt(row.gross_profit)}
                              </td>
                              <td style={{ color: Number(margin) >= 20 ? '#34d399' : Number(margin) >= 0 ? '#c9a84c' : '#f87171' }}>
                                {margin !== '—' ? `${margin}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        {(pl?.monthly || []).length > 1 && (() => {
                          const rows = pl!.monthly as any[];
                          const sum = (k: string) => rows.reduce((a: number, r: any) => a + Number(r[k] || 0), 0);
                          const totalRev = sum('total_revenue');
                          const totalCost = sum('total_cost');
                          const totalProfit = sum('gross_profit');
                          const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '—';
                          return (
                            <tr style={{ background: 'rgba(201,168,76,0.08)', fontWeight: 700, color: '#c9a84c' }}>
                              <td>TOTAL</td>
                              <td>{fmt(sum('sales_revenue'))}</td>
                              <td>{fmt(sum('quarry_revenue'))}</td>
                              <td>{fmt(totalRev)}</td>
                              <td style={{ color: '#f87171' }}>{fmt(sum('purchase_cost'))}</td>
                              <td style={{ color: '#fb923c' }}>{fmt(sum('wages'))}</td>
                              <td style={{ color: '#a78bfa' }}>{fmt(sum('maintenance_cost'))}</td>
                              <td style={{ color: '#60a5fa' }}>{fmt(sum('opex'))}</td>
                              <td style={{ color: '#f87171' }}>{fmt(totalCost)}</td>
                              <td style={{ color: totalProfit >= 0 ? '#34d399' : '#f87171' }}>{fmt(totalProfit)}</td>
                              <td style={{ color: Number(avgMargin) >= 20 ? '#34d399' : '#c9a84c' }}>{avgMargin !== '—' ? `${avgMargin}%` : '—'}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Opex entries log */}
                  {(pl?.opex_entries || []).length > 0 && (
                    <div className="card" style={{ padding: 24 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8edf5', marginBottom: 16 }}>
                        Opex / Overhead Entries
                        <span style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)', fontWeight: 400, marginLeft: 8 }}>
                          ({(pl?.opex_entries || []).length} entries · Total: {fmt(s.opex_total)})
                        </span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(pl?.opex_entries || []).map((e: any, i: number) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.04)',
                          }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', minWidth: 90 }}>
                                {dayjs(e.date).format('DD MMM YYYY')}
                              </span>
                              <span style={{ fontSize: 13, color: '#c8d4e8' }}>{e.narration}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(200,212,232,0.6)',
                                textTransform: 'uppercase',
                              }}>{e.mode}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171', minWidth: 100, textAlign: 'right' }}>{fmt(e.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

    </AppLayout>
  );
}
