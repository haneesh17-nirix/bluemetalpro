'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getAssets, getMaintenanceRecords } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Wrench, Truck, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

type AssetType = 'machinery' | 'vehicle';
type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const statusStyles: Record<MaintenanceStatus, string> = {
  scheduled: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const emptyRecord = {
  asset_id: '', asset_type: 'machinery' as AssetType,
  title: '', description: '', scheduled_date: '',
  cost: '', vendor_name: '', vendor_phone: '', parts_replaced: '', next_service_date: '',
};

const emptyAsset = {
  asset_type: 'machinery' as AssetType, name: '', model: '',
  serial_number: '', purchase_date: '', purchase_cost: '', vehicle_id: '', notes: '',
};

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'records' | 'assets'>('records');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [recordForm, setRecordForm] = useState(emptyRecord);
  const [assetForm, setAssetForm] = useState(emptyAsset);

  const { data: assets = [] } = useQuery({ queryKey: ['assets', assetTypeFilter], queryFn: () => getAssets({ asset_type: assetTypeFilter || undefined }) });
  const { data: records = [] } = useQuery({
    queryKey: ['maintenance', assetTypeFilter, statusFilter],
    queryFn: () => getMaintenanceRecords({ asset_type: assetTypeFilter || undefined, status: statusFilter || undefined }),
  });

  const upcoming = (records as any[]).filter((r: any) =>
    r.status !== 'completed' && r.status !== 'cancelled' &&
    dayjs(r.scheduled_date).diff(dayjs(), 'day') <= 7
  );

  const recordMutation = useMutation({
    mutationFn: (data: any) =>
      editRecord
        ? api.patch(`/maintenance/records/${editRecord.id}`, data).then(r => r.data)
        : api.post('/maintenance/records', data).then(r => r.data),
    onSuccess: () => {
      toast.success(editRecord ? 'Record updated' : 'Maintenance record added');
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      setShowRecordForm(false);
      setEditRecord(null);
      setRecordForm(emptyRecord);
    },
    onError: () => toast.error('Failed to save'),
  });

  const assetMutation = useMutation({
    mutationFn: (data: any) => api.post('/maintenance/assets', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Asset added');
      qc.invalidateQueries({ queryKey: ['assets'] });
      setShowAssetForm(false);
      setAssetForm(emptyAsset);
    },
    onError: () => toast.error('Failed to add asset'),
  });

  const openEdit = (record: any) => {
    setEditRecord(record);
    setRecordForm({ ...emptyRecord, ...record, cost: String(record.cost || '') });
    setShowRecordForm(true);
  };

  const updateStatus = (id: string, status: string) => {
    api.patch(`/maintenance/records/${id}`, {
      status,
      completed_date: status === 'completed' ? dayjs().format('YYYY-MM-DD') : undefined,
    }).then(() => {
      toast.success(`Marked as ${status.replace('_', ' ')}`);
      qc.invalidateQueries({ queryKey: ['maintenance'] });
    }).catch(() => toast.error('Failed'));
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">Maintenance</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2 border border-[#1a3c5e] text-[#1a3c5e] px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
              <Plus size={16} /> Add Asset
            </button>
            <button onClick={() => { setEditRecord(null); setRecordForm(emptyRecord); setShowRecordForm(true); }}
              className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors text-sm font-medium">
              <Plus size={16} /> Add Record
            </button>
          </div>
        </div>

        {/* Upcoming alert */}
        {upcoming.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">{upcoming.length} maintenance task{upcoming.length > 1 ? 's' : ''} due within 7 days</p>
              <p className="text-xs text-amber-700 mt-0.5">{upcoming.map((r: any) => r.asset_name).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
          {[['records', 'Maintenance Records'], ['assets', 'Assets']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[['', 'All'], ['machinery', 'Machinery'], ['vehicle', 'Vehicle']].map(([v, l]) => (
              <button key={v} onClick={() => setAssetTypeFilter(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${assetTypeFilter === v ? 'bg-white text-[#1a3c5e] shadow-sm' : 'text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'records' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>

        {/* Records table */}
        {tab === 'records' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3c5e] text-white">
                <tr>
                  {['Asset', 'Type', 'Title', 'Scheduled', 'Cost', 'Vendor', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(records as any[]).map((r: any, i: number) => (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.asset_type === 'vehicle' ? <Truck size={14} className="text-blue-500" /> : <Wrench size={14} className="text-purple-500" />}
                        <span className="font-medium">{r.asset_name}</span>
                      </div>
                      {r.model && <p className="text-xs text-gray-400 ml-5">{r.model}</p>}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{r.asset_type}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.title}</p>
                      {r.description && <p className="text-xs text-gray-400 truncate max-w-32">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.scheduled_date ? dayjs(r.scheduled_date).format('DD/MM/YYYY') : '—'}
                      {r.next_service_date && <p className="text-xs text-blue-500">Next: {dayjs(r.next_service_date).format('DD/MM/YY')}</p>}
                    </td>
                    <td className="px-4 py-3">{r.cost > 0 ? `₹${Number(r.cost).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.vendor_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[r.status as MaintenanceStatus]}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.status === 'scheduled' && (
                          <button onClick={() => updateStatus(r.id, 'in_progress')} className="text-xs text-blue-600 hover:underline">Start</button>
                        )}
                        {r.status === 'in_progress' && (
                          <button onClick={() => updateStatus(r.id, 'completed')} className="text-xs text-green-600 hover:underline">Complete</button>
                        )}
                        <button onClick={() => openEdit(r)} className="text-xs text-gray-500 hover:underline">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(records as any[]).length && <p className="text-center text-gray-400 py-10">No maintenance records</p>}
          </div>
        )}

        {/* Assets table */}
        {tab === 'assets' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1a3c5e] text-white">
                <tr>
                  {['Asset Name', 'Type', 'Model', 'Serial No.', 'Purchase Date', 'Purchase Cost'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(assets as any[]).map((a: any, i: number) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.asset_type === 'vehicle' ? <Truck size={14} className="text-blue-500" /> : <Wrench size={14} className="text-purple-500" />}
                        <span className="font-medium">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{a.asset_type}</td>
                    <td className="px-4 py-3">{a.model || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.serial_number || '—'}</td>
                    <td className="px-4 py-3">{a.purchase_date ? dayjs(a.purchase_date).format('DD/MM/YYYY') : '—'}</td>
                    <td className="px-4 py-3">{a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString('en-IN')}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(assets as any[]).length && <p className="text-center text-gray-400 py-10">No assets found</p>}
          </div>
        )}

        {/* Add Record modal */}
        {showRecordForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-[#1a3c5e]">{editRecord ? 'Update Record' : 'New Maintenance Record'}</h2>
                <button onClick={() => setShowRecordForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); recordMutation.mutate({ ...recordForm, cost: Number(recordForm.cost) || 0 }); }} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Asset Type</label>
                    <select value={recordForm.asset_type} onChange={e => setRecordForm(f => ({ ...f, asset_type: e.target.value as AssetType, asset_id: '' }))} className="input">
                      <option value="machinery">Machinery</option>
                      <option value="vehicle">Vehicle</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Asset *</label>
                    <select required value={recordForm.asset_id} onChange={e => setRecordForm(f => ({ ...f, asset_id: e.target.value }))} className="input">
                      <option value="">Select asset…</option>
                      {(assets as any[]).filter((a: any) => !recordForm.asset_type || a.asset_type === recordForm.asset_type)
                        .map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Title *</label>
                  <input required value={recordForm.title} onChange={e => setRecordForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Engine oil change" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={recordForm.description} onChange={e => setRecordForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Scheduled Date</label>
                    <input type="date" value={recordForm.scheduled_date} onChange={e => setRecordForm(f => ({ ...f, scheduled_date: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Cost (₹)</label>
                    <input type="number" value={recordForm.cost} onChange={e => setRecordForm(f => ({ ...f, cost: e.target.value }))} className="input" min="0" />
                  </div>
                  <div>
                    <label className="label">Vendor Name</label>
                    <input value={recordForm.vendor_name} onChange={e => setRecordForm(f => ({ ...f, vendor_name: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Vendor Phone</label>
                    <input value={recordForm.vendor_phone} onChange={e => setRecordForm(f => ({ ...f, vendor_phone: e.target.value }))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Parts Replaced</label>
                  <input value={recordForm.parts_replaced} onChange={e => setRecordForm(f => ({ ...f, parts_replaced: e.target.value }))} className="input" placeholder="e.g. Oil filter, air filter" />
                </div>
                <div>
                  <label className="label">Next Service Date</label>
                  <input type="date" value={recordForm.next_service_date} onChange={e => setRecordForm(f => ({ ...f, next_service_date: e.target.value }))} className="input" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowRecordForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={recordMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {recordMutation.isPending ? 'Saving…' : editRecord ? 'Update' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Asset modal */}
        {showAssetForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-[#1a3c5e]">Add Asset</h2>
                <button onClick={() => setShowAssetForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); assetMutation.mutate({ ...assetForm, purchase_cost: Number(assetForm.purchase_cost) || 0 }); }} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Asset Type</label>
                    <select value={assetForm.asset_type} onChange={e => setAssetForm(f => ({ ...f, asset_type: e.target.value as AssetType }))} className="input">
                      <option value="machinery">Machinery</option>
                      <option value="vehicle">Vehicle</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Name *</label>
                    <input required value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. Jaw Crusher, JCB" />
                  </div>
                  <div>
                    <label className="label">Model</label>
                    <input value={assetForm.model} onChange={e => setAssetForm(f => ({ ...f, model: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Serial Number</label>
                    <input value={assetForm.serial_number} onChange={e => setAssetForm(f => ({ ...f, serial_number: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Purchase Date</label>
                    <input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm(f => ({ ...f, purchase_date: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Purchase Cost (₹)</label>
                    <input type="number" value={assetForm.purchase_cost} onChange={e => setAssetForm(f => ({ ...f, purchase_cost: e.target.value }))} className="input" min="0" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAssetForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={assetMutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {assetMutation.isPending ? 'Saving…' : 'Add Asset'}
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
