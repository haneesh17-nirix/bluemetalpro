'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import StatsRow from '@/components/ui/StatsRow';
import { getVehicles, createVehicle } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Truck, CheckCircle2, Wrench, Archive } from 'lucide-react';

type VehicleStatus = 'active' | 'maintenance' | 'retired';

const statusBadge: Record<VehicleStatus, string> = {
  active: 'badge-gem',
  maintenance: 'badge-gold',
  retired: 'badge-gray',
};

const emptyForm = { registration_number: '', vehicle_type: '', owner_name: '', owner_phone: '', capacity_mt: '', notes: '' };

export default function VehiclesPage() {
  useEffect(() => { log.page('Vehicles'); }, []);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      editVehicle
        ? api.put(`/vehicles/${editVehicle.id}`, data).then(r => r.data)
        : createVehicle(data),
    onSuccess: (data: any) => {
      log.action('Vehicle added', { number: data?.vehicle_number });
      toast.success(editVehicle ? 'Vehicle updated' : 'Vehicle added');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      setEditVehicle(null);
      setForm(emptyForm);
    },
    onError: () => { log.error('Vehicle creation failed'); toast.error('Failed to save vehicle'); },
  });

  const openEdit = (v: any) => {
    setEditVehicle(v);
    setForm({ ...emptyForm, ...v, capacity_mt: String(v.capacity_mt || '') });
    setShowForm(true);
  };

  const active = (vehicles as any[]).filter((v: any) => v.status === 'active').length;
  const inMaint = (vehicles as any[]).filter((v: any) => v.status === 'maintenance').length;

  const retired = (vehicles as any[]).filter((v: any) => v.status === 'retired').length;

  const stats = [
    { label: 'Total Vehicles', value: String((vehicles as any[]).length), icon: Truck, color: '#60a5fa' },
    { label: 'Active', value: String(active), sub: 'In service', icon: CheckCircle2, color: '#34d399' },
    { label: 'Under Maintenance', value: String(inMaint), sub: 'Being serviced', icon: Wrench, color: '#fbbf24' },
    { label: 'Retired / Inactive', value: String(retired), icon: Archive, color: 'rgba(200,212,232,0.5)' },
  ];

  return (
    <AppLayout
      title="Vehicles"
      subtitle="Fleet management and status tracking"
      actions={
        <button
          onClick={() => { setEditVehicle(null); setForm(emptyForm); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      }
    >
      <StatsRow stats={stats} />

      {/* Vehicles grid */}
      {(vehicles as any[]).length ? (
        <div className="grid grid-cols-3 gap-4">
          {(vehicles as any[]).map((v: any) => (
            <div key={v.id} className="card p-5" style={{ borderLeft: v.status === 'active' ? '3px solid #34d399' : v.status === 'maintenance' ? '3px solid #fbbf24' : '3px solid rgba(255,255,255,0.1)' }}>
              <div className="flex justify-between items-start mb-3">
                <div
                  className="text-sm font-bold px-3 py-1 rounded-lg"
                  style={{ background: '#1e3a5f', border: '1px solid #263d5e', color: '#c8d4e8' }}
                >
                  {v.registration_number}
                </div>
                <span className={`${statusBadge[v.status as VehicleStatus]} capitalize`}>{v.status}</span>
              </div>
              <p className="font-semibold text-white mt-2">{v.vehicle_type || 'Unknown type'}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(200,212,232,0.6)' }}>{v.owner_name || '—'}</p>
              {v.owner_phone && <p className="text-xs mt-0.5" style={{ color: 'rgba(200,212,232,0.4)' }}>{v.owner_phone}</p>}
              {v.capacity_mt && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                    {v.capacity_mt} MT
                  </span>
                </div>
              )}
              {v.notes && <p className="text-xs mt-2 truncate" style={{ color: 'rgba(200,212,232,0.3)' }}>{v.notes}</p>}
              <button onClick={() => openEdit(v)} className="btn-ghost text-xs px-2 py-1 mt-3 w-full text-center">Edit Details</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Truck size={28} style={{ color: 'rgba(200,212,232,0.25)' }} />
          </div>
          <p className="text-base font-semibold text-white/70">No vehicles added yet</p>
          <p className="text-sm text-white/35">Add your fleet vehicles to start tracking</p>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-gold w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, capacity_mt: Number(form.capacity_mt) || null }); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Registration Number *</label>
                  <input required value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value.toUpperCase() }))} className="input" placeholder="TN 38 AB 1234" />
                </div>
                <div>
                  <label className="label">Vehicle Type</label>
                  <input value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))} className="input" placeholder="Tipper, Tractor, JCB…" />
                </div>
                <div>
                  <label className="label">Capacity (MT)</label>
                  <input type="number" value={form.capacity_mt} onChange={e => setForm(f => ({ ...f, capacity_mt: e.target.value }))} className="input" min="0" step="0.1" />
                </div>
                <div>
                  <label className="label">Owner Name</label>
                  <input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Owner Phone</label>
                  <input value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} className="input" />
                </div>
                {editVehicle && (
                  <div>
                    <label className="label">Status</label>
                    <select value={(form as any).status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="select">
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" />
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="btn-primary">
                  {mutation.isPending ? 'Saving…' : editVehicle ? 'Update' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
