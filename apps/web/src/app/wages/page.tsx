'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getWorkers, getAttendance, submitAttendance } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Save, Calculator } from 'lucide-react';
import dayjs from 'dayjs';

type WageType = 'daily' | 'monthly' | 'piece_rate' | 'hourly';
type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

const statusBadge: Record<AttendanceStatus, string> = {
  present: 'badge-gem',
  absent: 'badge-red',
  half_day: 'badge-gold',
  leave: 'badge-gray',
};

const statusActiveClass: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  absent: 'bg-red-500/20 text-red-300 border-red-500/40',
  half_day: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  leave: 'bg-white/10 text-white/50 border-white/20',
};

const emptyWorker = { name: '', phone: '', designation: '', wage_type: 'daily' as WageType, wage_rate: '', joining_date: '', aadhaar: '' };

export default function WagesPage() {
  useEffect(() => { log.page('Wages'); }, []);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'attendance' | 'workers' | 'payroll'>('attendance');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editWorker, setEditWorker] = useState<any>(null);
  const [workerForm, setWorkerForm] = useState(emptyWorker);
  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatus>>({});
  const [localAdvance, setLocalAdvance] = useState<Record<string, string>>({});

  // Payroll calculator state
  const [payrollWorker, setPayrollWorker] = useState('');
  const [payPeriod, setPayPeriod] = useState({ from: dayjs().format('YYYY-MM-01'), to: dayjs().format('YYYY-MM-DD') });
  const [payrollResult, setPayrollResult] = useState<any>(null);

  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: getWorkers });
  const { data: attendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => getAttendance({ date: selectedDate }),
  });

  useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    (attendance as any[]).forEach((a: any) => { map[a.worker_id] = a.status; });
    setLocalStatus(map);
    setLocalAdvance({});
  }, [attendance]);

  const getStatus = (workerId: string): AttendanceStatus =>
    localStatus[workerId] || (attendance as any[]).find((a: any) => a.worker_id === workerId)?.status || 'present';

  const saveMutation = useMutation({
    mutationFn: submitAttendance,
    onSuccess: () => { log.action('Attendance entry saved'); toast.success('Attendance saved'); refetchAttendance(); },
    onError: () => toast.error('Failed to save attendance'),
  });

  const handleSaveAttendance = () => {
    const entries = (workers as any[]).map((w: any) => ({
      worker_id: w.id,
      status: getStatus(w.id),
      overtime_hours: 0,
      advance: Number(localAdvance[w.id] || 0),
    }));
    saveMutation.mutate({ date: selectedDate, entries });
  };

  const workerMutation = useMutation({
    mutationFn: (data: any) =>
      editWorker
        ? api.put(`/wages/workers/${editWorker.id}`, data).then(r => r.data)
        : api.post('/wages/workers', data).then(r => r.data),
    onSuccess: () => {
      toast.success(editWorker ? 'Worker updated' : 'Worker added');
      qc.invalidateQueries({ queryKey: ['workers'] });
      setShowWorkerForm(false);
      setEditWorker(null);
      setWorkerForm(emptyWorker);
    },
    onError: () => toast.error('Failed to save worker'),
  });

  const calculatePayroll = async () => {
    if (!payrollWorker) return toast.error('Select a worker');
    const res = await api.post('/wages/calculate', { worker_id: payrollWorker, from: payPeriod.from, to: payPeriod.to });
    setPayrollResult(res.data);
  };

  const processPayment = async () => {
    if (!payrollResult) return;
    await api.post('/wages/pay', {
      worker_id: payrollWorker,
      period_from: payPeriod.from,
      period_to: payPeriod.to,
      days_worked: payrollResult.days_worked,
      gross_wages: payrollResult.gross_wages,
      advances_deducted: payrollResult.advance_deducted,
      net_wages: payrollResult.net_wages,
      payment_date: dayjs().format('YYYY-MM-DD'),
      payment_mode: 'cash',
    });
    toast.success('Wage payment recorded');
    setPayrollResult(null);
  };

  const summary = {
    present: (workers as any[]).filter(w => getStatus(w.id) === 'present').length,
    absent: (workers as any[]).filter(w => getStatus(w.id) === 'absent').length,
    half_day: (workers as any[]).filter(w => getStatus(w.id) === 'half_day').length,
    leave: (workers as any[]).filter(w => getStatus(w.id) === 'leave').length,
  };

  const pageActions = tab === 'workers' ? (
    <button
      onClick={() => { setEditWorker(null); setWorkerForm(emptyWorker); setShowWorkerForm(true); }}
      className="btn-primary flex items-center gap-2 text-sm"
    >
      <Plus size={16} /> Add Worker
    </button>
  ) : tab === 'attendance' ? (
    <div className="flex items-center gap-3">
      <input
        type="date"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        className="input text-sm"
      />
      {(workers as any[]).length > 0 && (
        <button
          onClick={handleSaveAttendance}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <Save size={16} /> {saveMutation.isPending ? 'Saving…' : 'Save Attendance'}
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Wages" subtitle="Worker attendance and payroll management" actions={pageActions} />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-surface-card border border-surface-border w-fit mb-6">
            {[['attendance', 'Daily Attendance'], ['workers', 'Workers'], ['payroll', 'Payroll Calculator']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'btn-primary' : 'text-white/50 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* ATTENDANCE TAB */}
          {tab === 'attendance' && (
            <>
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                {Object.entries(summary).map(([s, n]) => (
                  <span key={s} className={`px-3 py-1 rounded-full border text-xs capitalize font-medium ${statusActiveClass[s as AttendanceStatus]}`}>
                    {n} {s.replace('_', ' ')}
                  </span>
                ))}
              </div>

              <div className="table-wrapper">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Worker', 'Designation', 'Wage', 'Status', 'Advance (₹)'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(workers as any[]).map((w: any) => {
                      const status = getStatus(w.id);
                      return (
                        <tr key={w.id}>
                          <td className="font-medium text-white">{w.name}</td>
                          <td className="text-white/60">{w.designation || '—'}</td>
                          <td>₹{Number(w.wage_rate).toLocaleString('en-IN')}/{w.wage_type === 'daily' ? 'day' : 'mo'}</td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              {(['present', 'absent', 'half_day', 'leave'] as AttendanceStatus[]).map(s => (
                                <button key={s} onClick={() => setLocalStatus(ls => ({ ...ls, [w.id]: s }))}
                                  className={`px-2 py-1 rounded text-xs font-medium border transition-all capitalize ${status === s ? statusActiveClass[s] : 'bg-transparent text-white/30 border-white/10 hover:border-white/30 hover:text-white/60'}`}>
                                  {s === 'half_day' ? 'Half' : s}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <input type="number" value={localAdvance[w.id] || ''}
                              onChange={e => setLocalAdvance(la => ({ ...la, [w.id]: e.target.value }))}
                              className="input w-24 text-sm" min="0" placeholder="0" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!(workers as any[]).length && <p className="text-center text-white/30 py-8">No workers found. Add workers first.</p>}
              </div>
            </>
          )}

          {/* WORKERS TAB */}
          {tab === 'workers' && (
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Name', 'Designation', 'Wage Type', 'Wage Rate', 'Phone', 'Joined', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(workers as any[]).map((w: any) => (
                    <tr key={w.id}>
                      <td className="font-medium text-white">{w.name}</td>
                      <td className="text-white/60">{w.designation || '—'}</td>
                      <td className="capitalize">{w.wage_type.replace('_', ' ')}</td>
                      <td className="font-medium text-[#c9a84c]">₹{Number(w.wage_rate).toLocaleString('en-IN')}</td>
                      <td>{w.phone || '—'}</td>
                      <td className="text-white/50">{w.joining_date ? dayjs(w.joining_date).format('DD/MM/YYYY') : '—'}</td>
                      <td>
                        <button onClick={() => { setEditWorker(w); setWorkerForm({ ...emptyWorker, ...w, wage_rate: String(w.wage_rate) }); setShowWorkerForm(true); }}
                          className="text-xs text-[#c9a84c] hover:underline font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(workers as any[]).length && <p className="text-center text-white/30 py-10">No workers added yet</p>}
            </div>
          )}

          {/* PAYROLL TAB */}
          {tab === 'payroll' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="card p-6">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Calculator size={18} className="text-[#c9a84c]" /> Calculate Wages
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="label">Worker</label>
                    <select value={payrollWorker} onChange={e => { setPayrollWorker(e.target.value); setPayrollResult(null); }} className="select">
                      <option value="">Select worker…</option>
                      {(workers as any[]).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">From</label>
                      <input type="date" value={payPeriod.from} onChange={e => setPayPeriod(p => ({ ...p, from: e.target.value }))} className="input" />
                    </div>
                    <div>
                      <label className="label">To</label>
                      <input type="date" value={payPeriod.to} onChange={e => setPayPeriod(p => ({ ...p, to: e.target.value }))} className="input" />
                    </div>
                  </div>
                  <button onClick={calculatePayroll} className="btn-primary w-full py-2.5">
                    Calculate
                  </button>
                </div>
              </div>

              {payrollResult && (
                <div className="card-gold p-6">
                  <h2 className="font-semibold text-white mb-4">Payroll Summary — {payrollResult.worker?.name}</h2>
                  <div className="space-y-1 text-sm">
                    {[
                      ['Wage Type', payrollResult.worker?.wage_type],
                      ['Wage Rate', `₹${Number(payrollResult.worker?.wage_rate).toLocaleString('en-IN')}`],
                      ['Days Worked', `${payrollResult.days_worked} days`],
                      ['Overtime Hours', `${payrollResult.overtime_hours} hrs`],
                      ['Gross Wages', `₹${Number(payrollResult.gross_wages).toLocaleString('en-IN')}`],
                      ['Advance Deducted', `₹${Number(payrollResult.advance_deducted).toLocaleString('en-IN')}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-white/50">{l}</span>
                        <span className="font-medium text-white capitalize">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 mt-2 bg-[#c9a84c]/15 rounded-lg px-3 border border-[#c9a84c]/30">
                      <span className="font-bold text-[#c9a84c]">Net Wages</span>
                      <span className="font-bold text-lg text-[#c9a84c]">₹{Number(payrollResult.net_wages).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button onClick={processPayment} className="btn-primary w-full mt-4 py-2.5">
                    Process Payment
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Add/Edit Worker modal */}
      {showWorkerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">{editWorker ? 'Edit Worker' : 'Add Worker'}</h2>
              <button onClick={() => setShowWorkerForm(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); workerMutation.mutate({ ...workerForm, wage_rate: Number(workerForm.wage_rate) }); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Full Name *</label>
                  <input required value={workerForm.name} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input value={workerForm.phone} onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input value={workerForm.designation} onChange={e => setWorkerForm(f => ({ ...f, designation: e.target.value }))} className="input" placeholder="Operator, Loader, Driver…" />
                </div>
                <div>
                  <label className="label">Wage Type</label>
                  <select value={workerForm.wage_type} onChange={e => setWorkerForm(f => ({ ...f, wage_type: e.target.value as WageType }))} className="select">
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                    <option value="piece_rate">Piece Rate</option>
                  </select>
                </div>
                <div>
                  <label className="label">Wage Rate (₹) *</label>
                  <input required type="number" value={workerForm.wage_rate} onChange={e => setWorkerForm(f => ({ ...f, wage_rate: e.target.value }))} className="input" min="0" />
                </div>
                <div>
                  <label className="label">Joining Date</label>
                  <input type="date" value={workerForm.joining_date} onChange={e => setWorkerForm(f => ({ ...f, joining_date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Aadhaar Number</label>
                  <input value={workerForm.aadhaar} onChange={e => setWorkerForm(f => ({ ...f, aadhaar: e.target.value }))} className="input" maxLength={12} placeholder="12-digit Aadhaar" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowWorkerForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={workerMutation.isPending} className="btn-primary disabled:opacity-60">
                  {workerMutation.isPending ? 'Saving…' : editWorker ? 'Update Worker' : 'Add Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
