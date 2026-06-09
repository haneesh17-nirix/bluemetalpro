'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getLedgerBalances, getPartyLedger, createReceipt, getParties } from '@/lib/api';
import { DollarSign, TrendingUp, TrendingDown, Plus, X, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';

type TxnType = 'receipt' | 'payment';

function ReceiptModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties() });
  const [form, setForm] = useState({
    party_id: '', txn_date: dayjs().format('YYYY-MM-DD'),
    amount: '', payment_mode: 'cash', cheque_number: '', bank_name: '', reference_id: '', narration: '',
  });

  const mutation = useMutation({
    mutationFn: () => createReceipt({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      toast.success('Receipt recorded');
      qc.invalidateQueries({ queryKey: ['ledger-balances'] });
      onClose();
    },
    onError: () => toast.error('Failed to record receipt'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-[#1a3c5e]">Record Receipt</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div>
            <label className="label">Party (Customer) *</label>
            <select required value={form.party_id} onChange={e => setForm(f => ({ ...f, party_id: e.target.value }))} className="input">
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
            <select required value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} className="input">
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
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-600">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-green-700">
              {mutation.isPending ? 'Saving…' : 'Record Receipt'}
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:3px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:7px 10px; font-size:.875rem; outline:none; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
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
    <div className="fixed inset-0 bg-black/50 z-40 flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="font-bold text-[#1a3c5e] text-lg">{partyName}</h2>
            <p className="text-sm text-gray-500">Transaction history</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex gap-3 p-4 border-b">
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
            <p className="text-center text-gray-400 py-10 text-sm">No transactions in this period</p>
          ) : (txns as any[]).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">{t.txn_type}</p>
                <p className="text-sm font-medium text-gray-800">{t.narration || `${t.payment_mode?.toUpperCase()} payment`}</p>
                <p className="text-xs text-gray-400">{dayjs(t.txn_date).format('DD MMM YYYY')}</p>
              </div>
              <p className={`text-base font-bold ${t.txn_type === 'receipt' ? 'text-green-600' : 'text-red-600'}`}>
                {t.txn_type === 'receipt' ? '+' : '−'}₹{Number(t.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
        <style jsx global>{`
          .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:3px; }
          .input { border:1px solid #d1d5db; border-radius:8px; padding:6px 10px; font-size:.875rem; outline:none; }
          .input:focus { border-color:#1a3c5e; }
        `}</style>
      </div>
    </div>
  );
}

export default function LedgerPage() {
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

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3c5e]">Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">Party balances and receipt recording</p>
          </div>
          <button onClick={() => setShowReceipt(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700">
            <Plus size={16} /> Record Receipt
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl"><TrendingUp size={22} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Receivable</p>
              <p className="text-2xl font-bold text-green-600">₹{totalReceivable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl"><TrendingDown size={22} className="text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Payable</p>
              <p className="text-2xl font-bold text-red-500">₹{totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party…"
            className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a3c5e]" />
        </div>

        {/* Party balances table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Party', 'Type', 'Total Sales', 'Total Received', 'Balance', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-300">
                    <DollarSign size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No party balances yet</p>
                  </td>
                </tr>
              ) : filtered.map((b: any) => {
                const bal = Number(b.total_balance || 0);
                return (
                  <tr key={b.party_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.party_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium capitalize">{b.party_type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">₹{Number(b.total_sales || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-gray-600">₹{Number(b.total_received || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 font-bold text-base ${bal > 0 ? 'text-green-600' : bal < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {bal > 0 ? '+' : ''}₹{Math.abs(bal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      {bal > 0 && <span className="ml-1 text-xs font-normal text-green-500">DR</span>}
                      {bal < 0 && <span className="ml-1 text-xs font-normal text-red-400">CR</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedParty({ id: b.party_id, name: b.party_name })}
                        className="flex items-center gap-1 text-xs text-[#1a3c5e] font-medium hover:underline">
                        View <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {showReceipt && <ReceiptModal onClose={() => setShowReceipt(false)} />}
      {selectedParty && (
        <PartyLedgerDrawer
          partyId={selectedParty.id}
          partyName={selectedParty.name}
          onClose={() => setSelectedParty(null)}
        />
      )}
    </div>
  );
}
