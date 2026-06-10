'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import TabBar from '@/components/ui/TabBar';
import { getAssets, getMaintenanceRecords } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Wrench, Truck, AlertTriangle, CheckCircle2, CalendarClock, Package } from 'lucide-react';
import dayjs from 'dayjs';

type AssetType = 'machinery' | 'vehicle';
type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const statusBadge: Record<MaintenanceStatus, string> = {
  scheduled: 'badge-gold',
  in_progress: 'badge-blue',
  completed: 'badge-gem',
  cancelled: 'badge-gray',
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
  useEffect(() => { log.page('Maintenance'); }, []);
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
      if (editRecord) { log.action('Maintenance record updated'); } else { log.action('Maintenance record created'); }
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

  const pageActions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => setShowAssetForm(true)} className="btn-secondary text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Plus size={16} /> Add Asset
      </button>
      <button
        onClick={() => { setEditRecord(null); setRecordForm(emptyRecord); setShowRecordForm(true); }}
        className="btn-primary text-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <Plus size={16} /> Schedule
      </button>
    </div>
  );

  const completed = (records as any[]).filter((r: any) => r.status === 'completed').length;
  const overdue = (records as any[]).filter((r: any) =>
    r.status !== 'completed' && r.status !== 'cancelled' &&
    r.scheduled_date && dayjs(r.scheduled_date).isBefore(dayjs())
  ).length;

  const maintStats = [
    { label: 'Total Assets', value: String((assets as any[]).length), icon: Package, color: '#60a5fa' },
    { label: 'Due This Week', value: String(upcoming.length), sub: 'Needs attention', icon: CalendarClock, color: '#fbbf24' },
    { label: 'Overdue', value: String(overdue), sub: 'Past scheduled date', icon: AlertTriangle, color: '#f87171' },
    { label: 'Completed', value: String(completed), sub: 'This dataset', icon: CheckCircle2, color: '#34d399' },
  ];

  return (
    <AppLayout title="Maintenance" subtitle="Asset and vehicle maintenance scheduling" actions={pageActions}>
      <StatsRow stats={maintStats} />

      {/* Upcoming alert */}
      {upcoming.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', padding: 16 }}>
          <AlertTriangle size={20} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="font-semibold text-amber-300 text-sm">{upcoming.length} maintenance task{upcoming.length > 1 ? 's' : ''} due within 7 days</p>
            <p className="text-xs text-amber-400/80 mt-0.5">{upcoming.map((r: any) => r.asset_name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabs + Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <TabBar
          tabs={[{ key: 'records', label: 'Maintenance Records' }, { key: 'assets', label: 'Assets' }]}
          active={tab}
          onChange={k => setTab(k as 'records' | 'assets')}
        />

        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 8, background: '#111e35', border: '1px solid #1f3659' }}>
          {[['', 'All'], ['machinery', 'Machinery'], ['vehicle', 'Vehicle']].map(([v, l]) => (
            <button key={v} onClick={() => setAssetTypeFilter(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${assetTypeFilter === v ? 'bg-[#162c52] text-[#e8c96a]' : 'text-white/50 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

            {tab === 'records' && (
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm">
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
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Asset', 'Type', 'Title', 'Scheduled', 'Cost', 'Vendor', 'Status', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(records as any[]).map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.asset_type === 'vehicle'
                            ? <Truck size={14} className="text-blue-400" />
                            : <Wrench size={14} className="text-purple-400" />}
                          <span className="font-medium text-white">{r.asset_name}</span>
                        </div>
                        {r.model && <p className="text-xs text-white/40 ml-5">{r.model}</p>}
                      </td>
                      <td className="capitalize text-white/60">{r.asset_type}</td>
                      <td>
                        <p className="font-medium text-white">{r.title}</p>
                        {r.description && <p className="text-xs text-white/40 truncate max-w-32">{r.description}</p>}
                      </td>
                      <td className="text-white/60">
                        {r.scheduled_date ? dayjs(r.scheduled_date).format('DD/MM/YYYY') : '—'}
                        {r.next_service_date && <p className="text-xs text-blue-400">Next: {dayjs(r.next_service_date).format('DD/MM/YY')}</p>}
                      </td>
                      <td>{r.cost > 0 ? `₹${Number(r.cost).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="text-white/60">{r.vendor_name || '—'}</td>
                      <td>
                        <span className={`capitalize ${statusBadge[r.status as MaintenanceStatus] || 'badge-gray'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {r.status === 'scheduled' && (
                            <button onClick={() => updateStatus(r.id, 'in_progress')} className="text-xs text-blue-400 hover:underline">Start</button>
                          )}
                          {r.status === 'in_progress' && (
                            <button onClick={() => updateStatus(r.id, 'completed')} className="text-xs text-emerald-400 hover:underline">Complete</button>
                          )}
                          <button onClick={() => openEdit(r)} className="text-xs text-white/50 hover:text-white hover:underline">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(records as any[]).length && <p className="text-center text-white/30 py-10">No maintenance records</p>}
            </div>
          )}

          {/* Assets table */}
          {tab === 'assets' && (
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Asset Name', 'Type', 'Model', 'Serial No.', 'Purchase Date', 'Purchase Cost'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(assets as any[]).map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.asset_type === 'vehicle'
                            ? <Truck size={14} className="text-blue-400" />
                            : <Wrench size={14} className="text-purple-400" />}
                          <span className="font-medium text-white">{a.name}</span>
                        </div>
                      </td>
                      <td className="capitalize text-white/60">{a.asset_type}</td>
                      <td>{a.model || '—'}</td>
                      <td className="font-mono text-xs">{a.serial_number || '—'}</td>
                      <td>{a.purchase_date ? dayjs(a.purchase_date).format('DD/MM/YYYY') : '—'}</td>
                      <td>{a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString('en-IN')}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(assets as any[]).length && <p className="text-center text-white/30 py-10">No assets found</p>}
            </div>
          )}

      {/* Add Record modal */}
      {showRecordForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-gold w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="text-lg font-bold text-white">{editRecord ? 'Update Record' : 'New Maintenance Record'}</h2>
              <button onClick={() => setShowRecordForm(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); recordMutation.mutate({ ...recordForm, cost: Number(recordForm.cost) || 0 }); }} className="space-y-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Asset Type</label>
                  <select value={recordForm.asset_type} onChange={e => setRecordForm(f => ({ ...f, asset_type: e.target.value as AssetType, asset_id: '' }))} className="select">
                    <option value="machinery">Machinery</option>
                    <option value="vehicle">Vehicle</option>
                  </select>
                </div>
                <div>
                  <label className="label">Asset *</label>
                  <select required value={recordForm.asset_id} onChange={e => setRecordForm(f => ({ ...f, asset_id: e.target.value }))} className="select">
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                <button type="button" onClick={() => setShowRecordForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={recordMutation.isPending} className="btn-primary disabled:opacity-60">
                  {recordMutation.isPending ? 'Saving…' : editRecord ? 'Update' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset modal */}
      {showAssetForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-gold w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="text-lg font-bold text-white">Add Asset</h2>
              <button onClick={() => setShowAssetForm(false)} className="text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); assetMutation.mutate({ ...assetForm, purchase_cost: Number(assetForm.purchase_cost) || 0 }); }} className="space-y-4">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="label">Asset Type</label>
                  <select value={assetForm.asset_type} onChange={e => setAssetForm(f => ({ ...f, asset_type: e.target.value as AssetType }))} className="select">
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                <button type="button" onClick={() => setShowAssetForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={assetMutation.isPending} className="btn-primary disabled:opacity-60">
                  {assetMutation.isPending ? 'Saving…' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
