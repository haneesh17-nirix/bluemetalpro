'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import { getVehicles, createVehicle } from '@/lib/api';
import api from '@/lib/api';
import { Plus, X, Truck } from 'lucide-react';

type VehicleStatus = 'active' | 'maintenance' | 'retired';

const statusStyles: Record<VehicleStatus, string> = {
  active: 'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-100 text-gray-500',
};

const emptyForm = { registration_number: '', vehicle_type: '', owner_name: '', owner_phone: '', capacity_mt: '', notes: '' };

export default function VehiclesPage() {
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
    onSuccess: () => {
      toast.success(editVehicle ? 'Vehicle updated' : 'Vehicle added');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setShowForm(false);
      setEditVehicle(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to save vehicle'),
  });

  const openEdit = (v: any) => {
    setEditVehicle(v);
    setForm({ ...emptyForm, ...v, capacity_mt: String(v.capacity_mt || '') });
    setShowForm(true);
  };

  const active = (vehicles as any[]).filter((v: any) => v.status === 'active').length;
  const inMaint = (vehicles as any[]).filter((v: any) => v.status === 'maintenance').length;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1a3c5e]">Vehicles</h1>
          <button onClick={() => { setEditVehicle(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#1a3c5e] text-white px-4 py-2 rounded-lg hover:bg-[#2563a8] transition-colors text-sm font-medium">
            <Plus size={16} /> Add Vehicle
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-5 mb-6">
          {[
            { label: 'Total', value: (vehicles as any[]).length, color: 'bg-blue-500' },
            { label: 'Active', value: active, color: 'bg-green-500' },
            { label: 'In Maintenance', value: inMaint, color: 'bg-amber-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm px-6 py-4 flex items-center gap-4">
              <div className={`${s.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                <Truck size={18} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Vehicles grid */}
        <div className="grid grid-cols-3 gap-4">
          {(vehicles as any[]).map((v: any) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-[#1a3c5e] text-white text-sm font-bold px-3 py-1 rounded-lg">
                  {v.registration_number}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[v.status as VehicleStatus]}`}>{v.status}</span>
              </div>
              <p className="font-medium text-gray-700">{v.vehicle_type || 'Unknown type'}</p>
              <p className="text-sm text-gray-500 mt-1">{v.owner_name || '—'}</p>
              {v.owner_phone && <p className="text-xs text-gray-400">{v.owner_phone}</p>}
              {v.capacity_mt && <p className="text-xs text-blue-600 mt-2 font-medium">{v.capacity_mt} MT capacity</p>}
              {v.notes && <p className="text-xs text-gray-400 mt-1 truncate">{v.notes}</p>}
              <button onClick={() => openEdit(v)} className="mt-3 text-xs text-[#1a3c5e] hover:underline font-medium">Edit</button>
            </div>
          ))}
        </div>
        {!(vehicles as any[]).length && (
          <div className="text-center py-16 text-gray-400">
            <Truck size={40} className="mx-auto mb-2 opacity-30" />
            <p>No vehicles added yet</p>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-[#1a3c5e]">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
                <button onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, capacity_mt: Number(form.capacity_mt) || null }); }} className="p-6">
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
                      <select value={(form as any).status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
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
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-[#1a3c5e] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                    {mutation.isPending ? 'Saving…' : editVehicle ? 'Update' : 'Add Vehicle'}
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
