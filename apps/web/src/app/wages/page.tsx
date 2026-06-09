'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getWorkers, getAttendance, submitAttendance } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Save, Calculator } from 'lucide-react';
import dayjs from 'dayjs';

type WageType = 'daily' | 'monthly' | 'piece_rate' | 'hourly';
type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  half_day: 'bg-amber-100 text-amber-700 border-amber-200',
  leave: 'bg-gray-100 text-gray-600 border-gray-200',
};

const emptyWorker = { name: '', phone: '', designation: '', wage_type: 'daily' as WageType, wage_rate: '', joining_date: '', aadhaar: '' };

export default function WagesPage() {
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

  // Sync loaded attendance into local state
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
    onSuccess: () => { toast.success('Attendance saved'); refetchAttendance(); },
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

  // Attendance summary
  const summary = {
    present: (workers as any[]).filter(w => getStatus(w.id) === 'present').length,
    absent: (workers as any[]).filter(w => getStatus(w.id) === 'absent').length,
    half_day: (workers as any[]).filter(w => getStatus(w.id) === 'half_day').length,
    leave: (workers as any[]).filter(w => getStatus(w.id) === 'leave').length,
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">Wages & Attendance</h1>
          {tab === 'workers' && (
            <button onClick={() => { setEditWorker(null); setWorkerForm(emptyWorker); setShowWorkerForm(true); }}
              className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors text-sm font-medium">
              <Plus size={16} /> Add Worker
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {[['attendance', 'Daily Attendance'], ['workers', 'Workers'], ['payroll', 'Payroll Calculator']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── ATTENDANCE TAB ── */}
        {tab === 'attendance' && (
          <>
            <div className="flex items-center gap-4 mb-5">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a3c5e]" />
              <div className="flex gap-3 text-sm">
                {Object.entries(summary).map(([s, n]) => (
                  <span key={s} className={`px-3 py-1 rounded-full border capitalize font-medium ${statusColors[s as AttendanceStatus]}`}>{n} {s.replace('_', ' ')}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-[#1a3c5e] text-white">
                  <tr>
                    {['Worker', 'Designation', 'Wage', 'Status', 'Advance (₹)'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(workers as any[]).map((w: any, i: number) => {
                    const status = getStatus(w.id);
                    return (
                      <tr key={w.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-medium">{w.name}</td>
                        <td className="px-4 py-3 text-gray-600">{w.designation || '—'}</td>
                        <td className="px-4 py-3">₹{Number(w.wage_rate).toLocaleString('en-IN')}/{w.wage_type === 'daily' ? 'day' : 'mo'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {(['present', 'absent', 'half_day', 'leave'] as AttendanceStatus[]).map(s => (
                              <button key={s} onClick={() => setLocalStatus(ls => ({ ...ls, [w.id]: s }))}
                                className={`px-2 py-1 rounded text-xs font-medium border transition-colors capitalize ${status === s ? statusColors[s] : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                                {s.replace('_', '½').replace('half_day', 'Half')}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" value={localAdvance[w.id] || ''}
                            onChange={e => setLocalAdvance(la => ({ ...la, [w.id]: e.target.value }))}
                            className="w-24 border rounded px-2 py-1 text-sm outline-none focus:border-[#1a3c5e]" min="0" placeholder="0" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!(workers as any[]).length && <p className="text-center text-gray-400 py-8">No workers found. Add workers first.</p>}
            </div>

            {(workers as any[]).length > 0 && (
              <div className="flex justify-end">
                <button onClick={handleSaveAttendance} disabled={saveMutation.isPending}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-60 transition-colors">
                  <Save size={16} /> {saveMutation.isPending ? 'Saving…' : 'Save Attendance'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── WORKERS TAB ── */}
        {tab === 'workers' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3c5e] text-white">
                <tr>
                  {['Name', 'Designation', 'Wage Type', 'Wage Rate', 'Phone', 'Joined', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(workers as any[]).map((w: any, i: number) => (
                  <tr key={w.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium">{w.name}</td>
                    <td className="px-4 py-3 text-gray-600">{w.designation || '—'}</td>
                    <td className="px-4 py-3 capitalize">{w.wage_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 font-medium">₹{Number(w.wage_rate).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">{w.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{w.joining_date ? dayjs(w.joining_date).format('DD/MM/YYYY') : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditWorker(w); setWorkerForm({ ...emptyWorker, ...w, wage_rate: String(w.wage_rate) }); setShowWorkerForm(true); }}
                        className="text-xs text-[#1a3c5e] hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(workers as any[]).length && <p className="text-center text-gray-400 py-10">No workers added yet</p>}
          </div>
        )}

        {/* ── PAYROLL TAB ── */}
        {tab === 'payroll' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-[#1a3c5e] mb-4 flex items-center gap-2"><Calculator size={18} /> Calculate Wages</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Worker</label>
                  <select value={payrollWorker} onChange={e => { setPayrollWorker(e.target.value); setPayrollResult(null); }} className="input">
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
                <button onClick={calculatePayroll} className="w-full bg-[#1a3c5e] text-white py-2.5 rounded-lg font-medium hover:bg-[#2563a8] transition-colors">
                  Calculate
                </button>
              </div>
            </div>

            {payrollResult && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="font-semibold text-[#1a3c5e] mb-4">Payroll Summary — {payrollResult.worker?.name}</h2>
                <div className="space-y-2 text-sm">
                  {[
                    ['Wage Type', payrollResult.worker?.wage_type],
                    ['Wage Rate', `₹${Number(payrollResult.worker?.wage_rate).toLocaleString('en-IN')}`],
                    ['Days Worked', `${payrollResult.days_worked} days`],
                    ['Overtime Hours', `${payrollResult.overtime_hours} hrs`],
                    ['Gross Wages', `₹${Number(payrollResult.gross_wages).toLocaleString('en-IN')}`],
                    ['Advance Deducted', `₹${Number(payrollResult.advance_deducted).toLocaleString('en-IN')}`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-medium capitalize">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 bg-[#1a3c5e] text-white rounded-lg px-3">
                    <span className="font-bold">Net Wages</span>
                    <span className="font-bold text-lg">₹{Number(payrollResult.net_wages).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button onClick={processPayment} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors">
                  Process Payment
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Worker modal */}
        {showWorkerForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-[#1a3c5e]">{editWorker ? 'Edit Worker' : 'Add Worker'}</h2>
                <button onClick={() => setShowWorkerForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); workerMutation.mutate({ ...workerForm, wage_rate: Number(workerForm.wage_rate) }); }} className="p-6">
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
                    <select value={workerForm.wage_type} onChange={e => setWorkerForm(f => ({ ...f, wage_type: e.target.value as WageType }))} className="input">
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
                  <button type="button" onClick={() => setShowWorkerForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={workerMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {workerMutation.isPending ? 'Saving…' : editWorker ? 'Update Worker' : 'Add Worker'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#4b5563; margin-bottom:4px; }
        .input { width:100%; border:1px solid #d1d5db; border-radius:8px; padding:8px 12px; font-size:.875rem; outline:none; }
        .input:focus { border-color:#1a3c5e; }
      `}</style>
    </div>
  );
}
