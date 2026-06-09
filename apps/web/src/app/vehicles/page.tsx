'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getVehicles, createVehicle } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Truck } from 'lucide-react';

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
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
        />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Summary */}
          <div className="flex gap-5 mb-6">
            {[
              { label: 'Total', value: (vehicles as any[]).length, iconClass: 'bg-blue-500/20 text-blue-400' },
              { label: 'Active', value: active, iconClass: 'bg-emerald-500/20 text-emerald-400' },
              { label: 'In Maintenance', value: inMaint, iconClass: 'bg-amber-500/20 text-amber-400' },
            ].map(s => (
              <div key={s.label} className="card px-6 py-4 flex items-center gap-4">
                <div className={`${s.iconClass} w-10 h-10 rounded-lg flex items-center justify-center`}>
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-sm text-white/50">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Vehicles grid */}
          {(vehicles as any[]).length ? (
            <div className="grid grid-cols-3 gap-4">
              {(vehicles as any[]).map((v: any) => (
                <div key={v.id} className="card p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-[#1e3a5f] border border-[#263d5e] text-white text-sm font-bold px-3 py-1 rounded-lg">
                      {v.registration_number}
                    </div>
                    <span className={`${statusBadge[v.status as VehicleStatus]} capitalize`}>{v.status}</span>
                  </div>
                  <p className="font-medium text-white">{v.vehicle_type || 'Unknown type'}</p>
                  <p className="text-sm text-white/60 mt-1">{v.owner_name || '—'}</p>
                  {v.owner_phone && <p className="text-xs text-white/40">{v.owner_phone}</p>}
                  {v.capacity_mt && <p className="text-xs text-amber-400 mt-2 font-medium">{v.capacity_mt} MT capacity</p>}
                  {v.notes && <p className="text-xs text-white/30 mt-1 truncate">{v.notes}</p>}
                  <button onClick={() => openEdit(v)} className="btn-ghost text-xs px-2 py-1 mt-3">Edit</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/30">
              <Truck size={40} className="mx-auto mb-2 opacity-30" />
              <p>No vehicles added yet</p>
            </div>
          )}

        </main>
      </div>

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
    </div>
  );
}
