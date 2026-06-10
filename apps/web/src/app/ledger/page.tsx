'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import { getLedgerBalances, getPartyLedger, createReceipt, getParties } from '@/lib/api';
import { DollarSign, TrendingUp, TrendingDown, Plus, X, ArrowRight, Users } from 'lucide-react';
import dayjs from 'dayjs';

function ReceiptModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties() });
  const [form, setForm] = useState({
    party_id: '', txn_date: dayjs().format('YYYY-MM-DD'),
    amount: '', payment_mode: 'cash', cheque_number: '', bank_name: '', reference_id: '', narration: '',
  });

  const mutation = useMutation({
    mutationFn: () => createReceipt({ ...form, amount: Number(form.amount) }),
    onSuccess: (data: any) => {
      log.action('Receipt recorded', { amount: data?.amount, mode: data?.payment_mode });
      toast.success('Receipt recorded');
      qc.invalidateQueries({ queryKey: ['ledger-balances'] });
      onClose();
    },
    onError: () => toast.error('Failed to record receipt'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card-gold w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Record Receipt</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div>
            <label className="label">Party (Customer) *</label>
            <select required value={form.party_id} onChange={e => setForm(f => ({ ...f, party_id: e.target.value }))} className="select">
              <option value="">Select party…</option>
              {(parties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input required type="date" value={form.txn_date} onChange={e => setForm(f => ({ ...f, txn_date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="label">Payment Mode *</label>
            <select required value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} className="select">
              {['cash', 'cheque', 'upi', 'neft', 'rtgs', 'credit'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          {form.payment_mode === 'cheque' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cheque No.</label>
                <input value={form.cheque_number} onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))} className="input" placeholder="123456" />
              </div>
              <div>
                <label className="label">Bank</label>
                <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} className="input" placeholder="Bank name" />
              </div>
            </div>
          )}
          <div>
            <label className="label">Linked Invoice No. (optional)</label>
            <input value={form.reference_id} onChange={e => setForm(f => ({ ...f, reference_id: e.target.value }))} className="input" placeholder="Sale ID to mark as paid" />
          </div>
          <div>
            <label className="label">Narration</label>
            <input value={form.narration} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} className="input" placeholder="Payment details" />
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : 'Record Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PartyLedgerDrawer({ partyId, partyName, onClose }: { partyId: string; partyName: string; onClose: () => void }) {
  const [from, setFrom] = useState(dayjs().subtract(90, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: txns = [] } = useQuery({
    queryKey: ['party-ledger', partyId, from, to],
    queryFn: () => getPartyLedger(partyId, { from, to }),
    enabled: !!partyId,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end">
      <div className="w-full max-w-lg bg-[#0e2544] border-l border-[#263d5e] h-full shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-[#263d5e]">
          <div>
            <h2 className="font-bold text-white text-lg">{partyName}</h2>
            <p className="text-sm text-white/50">Transaction history</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>
        <div className="flex gap-3 p-4 border-b border-[#263d5e]">
          <div>
            <label className="label">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-36" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-36" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!(txns as any[]).length ? (
            <p className="text-center text-white/30 py-10 text-sm">No transactions in this period</p>
          ) : (txns as any[]).map((t: any) => (
            <div key={t.id} className="card flex items-center justify-between p-3">
              <div>
                <p className="text-xs font-semibold uppercase text-white/40">{t.txn_type}</p>
                <p className="text-sm font-medium text-white">{t.narration || `${t.payment_mode?.toUpperCase()} payment`}</p>
                <p className="text-xs text-white/30">{dayjs(t.txn_date).format('DD MMM YYYY')}</p>
              </div>
              <p className={`text-base font-bold ${t.txn_type === 'receipt' ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.txn_type === 'receipt' ? '+' : '−'}₹{Number(t.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  useEffect(() => { log.page('Ledger'); }, []);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedParty, setSelectedParty] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['ledger-balances'],
    queryFn: getLedgerBalances,
  });

  const totalReceivable = (balances as any[]).filter(b => Number(b.total_balance) > 0).reduce((s, b) => s + Number(b.total_balance), 0);
  const totalPayable = (balances as any[]).filter(b => Number(b.total_balance) < 0).reduce((s, b) => s + Math.abs(Number(b.total_balance)), 0);

  const filtered = (balances as any[]).filter((b: any) =>
    !search || b.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  const settledCount = (balances as any[]).filter(b => Number(b.total_balance) === 0).length;

  const stats = [
    { label: 'Total Receivable', value: `₹${totalReceivable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: '#34d399' },
    { label: 'Total Payable', value: `₹${totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: '#f87171' },
    { label: 'Net Position', value: `₹${(totalReceivable - totalPayable).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: totalReceivable >= totalPayable ? 'Net receivable' : 'Net payable', icon: DollarSign, color: '#e8c96a' },
    { label: 'Parties', value: String((balances as any[]).length), sub: `${settledCount} settled`, icon: Users, color: '#60a5fa' },
  ];

  return (
    <AppLayout
      title="Ledger"
      subtitle="Party balances and transaction history"
      actions={
        <button onClick={() => setShowReceipt(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Receipt
        </button>
      }
    >
      <StatsRow stats={stats} />

      {/* Search */}
      <div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search party…"
          className="input w-full max-w-sm"
        />
      </div>

      {/* Party balances table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Party', 'Type', 'Total Sales', 'Total Received', 'Balance', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">Loading…</td></tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-white/20">
                    <DollarSign size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No party balances yet</p>
                  </td>
                </tr>
              ) : filtered.map((b: any) => {
                const bal = Number(b.total_balance || 0);
                const initials = b.party_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
                return (
                  <tr key={b.party_id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium" style={{ color: '#c8d4e8' }}>{b.party_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={
                        b.party_type === 'customer' ? 'badge-blue' :
                        b.party_type === 'supplier' ? 'badge-gem' : 'badge-gold'
                      }>{b.party_type}</span>
                    </td>
                    <td style={{ color: 'rgba(200,212,232,0.7)' }}>₹{Number(b.total_sales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td style={{ color: '#34d399' }}>₹{Number(b.total_received || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td>
                      {bal === 0 ? (
                        <span className="badge-gray">Settled</span>
                      ) : bal > 0 ? (
                        <span className="badge-red">
                          ₹{Math.abs(bal).toLocaleString('en-IN', { maximumFractionDigits: 0 })} DR
                        </span>
                      ) : (
                        <span className="badge-gem">
                          ₹{Math.abs(bal).toLocaleString('en-IN', { maximumFractionDigits: 0 })} CR
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedParty({ id: b.party_id, name: b.party_name })}
                        className="btn-ghost text-xs px-2 py-1 flex items-center gap-1"
                      >
                        View <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showReceipt && <ReceiptModal onClose={() => setShowReceipt(false)} />}
      {selectedParty && (
        <PartyLedgerDrawer
          partyId={selectedParty.id}
          partyName={selectedParty.name}
          onClose={() => setSelectedParty(null)}
        />
      )}
    </AppLayout>
  );
}
