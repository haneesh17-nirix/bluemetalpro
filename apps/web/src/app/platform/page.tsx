'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Building2, Users, Plus, X, ChevronRight, ToggleLeft, ToggleRight,
  LogOut, Shield, Loader2, TrendingUp, IndianRupee, MapPin, CheckCircle,
  UserPlus, Trash2, AlertCircle,
} from 'lucide-react';
import {
  getPlatformOverview, getPlatformUsers, platformCreateCrusher,
  getPlatformCrusherUsers, platformAddUserToCrusher, platformRemoveUserFromCrusher,
  platformSetCrusherStatus, platformCreateUser,
} from '@/lib/api';

const ROLES = ['admin', 'operations', 'report_viewer'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', operations: 'Operations', report_viewer: 'Reports',
  platform_admin: 'Platform Admin',
};
const ROLE_COLORS: Record<string, string> = {
  admin: '#c9a84c', operations: '#4caf8c', report_viewer: '#9c88d4',
  platform_admin: '#e0bc60',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type Crusher = {
  id: string; name: string; legal_name: string; city: string; state: string;
  gstin: string; phone: string; email: string; is_active: boolean;
  user_count: number; sale_count: number; total_revenue: number; created_at: string;
};
type PlatformUser = {
  id: string; name: string; email: string; role: string; is_active: boolean;
  crusher_access: { crusher_id: string; crusher_name: string; role: string }[];
};

// ── Create Crusher Modal ──────────────────────────────────────────────────
function CreateCrusherModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<'details' | 'admin'>('details');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', legal_name: '', gstin: '', city: '', state: 'Tamil Nadu',
    address: '', pincode: '', phone: '', email: '',
    bank_name: '', bank_account: '', bank_ifsc: '', invoice_prefix: '', quarry_invoice_prefix: '',
    admin_name: '', admin_email: '', admin_password: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) return toast.error('Crusher name is required');
    setSaving(true);
    try {
      await platformCreateCrusher(form);
      toast.success(`${form.name} created successfully`);
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to create crusher');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, placeholder?: string, half?: boolean) => (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label className="label">{label}</label>
      <input className="input" placeholder={placeholder || label}
        value={(form as any)[key]} onChange={e => set(key, e.target.value)} />
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8edf5', margin: 0 }}>New Crusher Unit</h2>
            <p style={{ fontSize: 12, color: 'rgba(200,212,232,0.5)', margin: '4px 0 0' }}>
              {step === 'details' ? 'Step 1 of 2 — Unit details' : 'Step 2 of 2 — Admin account'}
            </p>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['details', 'admin'] as const).map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: step === s || (s === 'details') ? '#c9a84c' : 'rgba(255,255,255,0.12)',
              opacity: step === 'admin' && s === 'details' ? 1 : step === s ? 1 : 0.3,
            }} />
          ))}
        </div>

        {step === 'details' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('Crusher Name *', 'name', 'e.g. BlueMetal Quarry Unit 3')}
            {field('Legal Name', 'legal_name', 'As per GST registration', true)}
            {field('GSTIN', 'gstin', '33AAAAA0000A1Z5', true)}
            {field('City', 'city', 'Hosur', true)}
            {field('State', 'state', 'Tamil Nadu', true)}
            {field('Address', 'address')}
            {field('Pincode', 'pincode', '635109', true)}
            {field('Phone', 'phone', '9876543210', true)}
            {field('Email', 'email', 'unit@bluemetal.in')}
            {field('Bank Name', 'bank_name', 'State Bank of India', true)}
            {field('Account Number', 'bank_account', '', true)}
            {field('IFSC Code', 'bank_ifsc', 'SBIN0005612', true)}
            {field('Invoice Prefix', 'invoice_prefix', 'INV', true)}
            {field('Quarry Invoice Prefix', 'quarry_invoice_prefix', 'QRY', true)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 12, borderRadius: 10,
              background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.2)',
            }}>
              <p style={{ fontSize: 12, color: 'rgba(200,212,232,0.7)', margin: 0 }}>
                Optionally create the first admin user for this crusher. You can skip this and add users later.
              </p>
            </div>
            <div>
              <label className="label">Admin Full Name</label>
              <input className="input" placeholder="e.g. Ramesh Kumar"
                value={form.admin_name} onChange={e => set('admin_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Admin Email</label>
              <input className="input" type="email" placeholder="admin@unit3.in"
                value={form.admin_email} onChange={e => set('admin_email', e.target.value)} />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <input className="input" type="text" placeholder="Will be asked to change on first login"
                value={form.admin_password} onChange={e => set('admin_password', e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          {step === 'admin' && (
            <button className="btn-secondary" onClick={() => setStep('details')}>Back</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          {step === 'details' ? (
            <button className="btn-primary" onClick={() => { if (form.name) setStep('admin'); else toast.error('Crusher name is required'); }}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
              Create Crusher
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add User to Crusher Modal ─────────────────────────────────────────────
function AddUserModal({ crusher, allUsers, onClose, onAdded }: {
  crusher: Crusher; allUsers: PlatformUser[];
  onClose: () => void; onAdded: () => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('operations');
  const [newForm, setNewForm] = useState({ name: '', email: '', password: '', role: 'operations' });

  const save = async () => {
    setSaving(true);
    try {
      if (mode === 'existing') {
        if (!selectedUser) return toast.error('Select a user');
        await platformAddUserToCrusher(crusher.id, { user_id: selectedUser, role });
      } else {
        if (!newForm.name || !newForm.email || !newForm.password) return toast.error('All fields required');
        await platformCreateUser({ ...newForm, crusher_id: crusher.id, crusher_role: newForm.role });
      }
      toast.success('User added successfully');
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 460, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8edf5', margin: 0 }}>Add User to {crusher.name}</h3>
          <button className="btn-ghost" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['existing', 'new'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: mode === m ? 'rgba(184,149,62,0.2)' : 'rgba(255,255,255,0.05)',
              color: mode === m ? '#c9a84c' : 'rgba(200,212,232,0.6)',
            }}>
              {m === 'existing' ? 'Existing user' : 'Create new user'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'existing' ? (
            <>
              <div>
                <label className="label">Select User</label>
                <select className="select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                  <option value="">— choose user —</option>
                  {allUsers.filter(u => !u.crusher_access.find(a => a.crusher_id === crusher.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Role in this crusher</label>
                <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Ramesh Kumar"
                  value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="user@company.in"
                  value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="text"
                  value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="select" value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={13} />}
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Crusher Detail Panel ──────────────────────────────────────────────────
function CrusherDetail({ crusher, allUsers, onBack, onRefresh }: {
  crusher: Crusher; allUsers: PlatformUser[];
  onBack: () => void; onRefresh: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    getPlatformCrusherUsers(crusher.id).then(setUsers).finally(() => setLoading(false));
  }, [crusher.id]);

  const removeUser = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from ${crusher.name}?`)) return;
    await platformRemoveUserFromCrusher(crusher.id, userId);
    setUsers(us => us.filter(u => u.id !== userId));
    toast.success('Access revoked');
  };

  const toggleStatus = async () => {
    await platformSetCrusherStatus(crusher.id, !crusher.is_active);
    toast.success(crusher.is_active ? 'Crusher deactivated' : 'Crusher activated');
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: '6px 10px' }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8edf5', margin: 0 }}>{crusher.name}</h2>
        <span style={{
          marginLeft: 4, padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: crusher.is_active ? 'rgba(76,175,140,0.15)' : 'rgba(220,70,70,0.15)',
          color: crusher.is_active ? '#4caf8c' : '#e05555',
        }}>{crusher.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      {/* Crusher info card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 20 }}>
          {[
            { label: 'Total Revenue', value: fmt(crusher.total_revenue), icon: <IndianRupee size={18} color="#c9a84c" /> },
            { label: 'Total Sales', value: crusher.sale_count.toString(), icon: <TrendingUp size={18} color="#4caf8c" /> },
            { label: 'Active Users', value: crusher.user_count.toString(), icon: <Users size={18} color="#6c9ddc" /> },
            { label: 'Location', value: crusher.city || '—', icon: <MapPin size={18} color="#9c88d4" /> },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#e8edf5' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.5)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {crusher.gstin && <div><span style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>GSTIN</span><br /><span style={{ fontSize: 13, color: '#c8d4e8' }}>{crusher.gstin}</span></div>}
          {crusher.phone && <div><span style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>Phone</span><br /><span style={{ fontSize: 13, color: '#c8d4e8' }}>{crusher.phone}</span></div>}
          {crusher.email && <div><span style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>Email</span><br /><span style={{ fontSize: 13, color: '#c8d4e8' }}>{crusher.email}</span></div>}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={toggleStatus} style={{ fontSize: 12 }}>
            {crusher.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {crusher.is_active ? 'Deactivate Crusher' : 'Activate Crusher'}
          </button>
        </div>
      </div>

      {/* Users */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#c8d4e8', margin: 0 }}>Users</h3>
          <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowAddUser(true)}>
            <UserPlus size={13} /> Add User
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(200,212,232,0.4)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'rgba(200,212,232,0.4)', fontSize: 13 }}>
            No users yet — add the first user to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${ROLE_COLORS[u.role] || '#6c9ddc'}22`,
                  border: `1px solid ${ROLE_COLORS[u.role] || '#6c9ddc'}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: ROLE_COLORS[u.role] || '#6c9ddc',
                  flexShrink: 0,
                }}>
                  {u.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e8edf5' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.5)' }}>{u.email}</div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: `${ROLE_COLORS[u.role] || '#6c9ddc'}18`,
                  color: ROLE_COLORS[u.role] || '#6c9ddc',
                }}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
                <button className="btn-ghost" style={{ color: '#e05555', padding: '5px 8px' }}
                  onClick={() => removeUser(u.id, u.name)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddUser && (
        <AddUserModal crusher={crusher} allUsers={allUsers} onClose={() => setShowAddUser(false)}
          onAdded={() => {
            getPlatformCrusherUsers(crusher.id).then(setUsers);
            onRefresh();
          }} />
      )}
    </div>
  );
}

// ── Main Platform Page ────────────────────────────────────────────────────
export default function PlatformPage() {
  const router = useRouter();
  const [crushers, setCrushers] = useState<Crusher[]>([]);
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrusher, setSelectedCrusher] = useState<Crusher | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'crushers' | 'users'>('crushers');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'platform_admin') { router.replace('/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([getPlatformOverview(), getPlatformUsers()]);
      setCrushers(c);
      setAllUsers(u);
    } catch {
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const totalRevenue = crushers.reduce((s, c) => s + Number(c.total_revenue), 0);
  const totalSales = crushers.reduce((s, c) => s + Number(c.sale_count), 0);
  const activeCount = crushers.filter(c => c.is_active).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(175deg, #060f20 0%, #0c1f3d 50%, #060f20 100%)',
      color: '#e8edf5',
    }}>
      {/* Top bar */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        background: 'rgba(12,31,61,0.95)',
        borderBottom: '1px solid rgba(42,69,112,0.6)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7a5e22 0%, #c9a84c 55%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={16} color="#0c1f3d" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8edf5', lineHeight: 1.2 }}>BlueMetal Pro</div>
            <div style={{ fontSize: 10, color: '#c9a84c', fontWeight: 600, letterSpacing: '0.08em' }}>PLATFORM ADMIN</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={logout} style={{ gap: 6 }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Page content */}
      <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
        {selectedCrusher ? (
          <CrusherDetail
            crusher={selectedCrusher} allUsers={allUsers}
            onBack={() => { setSelectedCrusher(null); load(); }}
            onRefresh={load}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#e8edf5' }}>Platform Dashboard</h1>
                <p style={{ fontSize: 13, color: 'rgba(200,212,232,0.5)', margin: '4px 0 0' }}>
                  Manage all crusher units and users from one place
                </p>
              </div>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> New Crusher
              </button>
            </div>

            {/* KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Crushers', value: crushers.length, sub: `${activeCount} active`, color: '#c9a84c' },
                { label: 'Platform Revenue', value: fmt(totalRevenue), sub: 'all units combined', color: '#4caf8c' },
                { label: 'Total Sales', value: totalSales, sub: 'across all units', color: '#6c9ddc' },
                { label: 'Total Users', value: allUsers.filter(u => u.role !== 'platform_admin').length, sub: 'across platform', color: '#9c88d4' },
              ].map(k => (
                <div key={k.label} className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.4)', marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {(['crushers', 'users'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: tab === t ? 'rgba(184,149,62,0.15)' : 'transparent',
                  color: tab === t ? '#c9a84c' : 'rgba(200,212,232,0.55)',
                  borderBottom: tab === t ? '2px solid #c9a84c' : '2px solid transparent',
                }}>
                  {t === 'crushers' ? <><Building2 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />Crusher Units</> : <><Users size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />All Users</>}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'rgba(200,212,232,0.4)' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : tab === 'crushers' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {crushers.map(c => (
                  <div key={c.id} className="card" style={{ padding: 22, cursor: 'pointer' }}
                    onClick={() => setSelectedCrusher(c)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: 'linear-gradient(135deg, #7a5e22 0%, #c9a84c55 100%)',
                          border: '1px solid rgba(184,149,62,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Building2 size={18} color="#c9a84c" />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8edf5' }}>{c.name}</div>
                          {c.city && <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)' }}>{c.city}, {c.state}</div>}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: c.is_active ? 'rgba(76,175,140,0.15)' : 'rgba(220,70,70,0.15)',
                        color: c.is_active ? '#4caf8c' : '#e05555',
                      }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c' }}>{fmt(c.total_revenue).replace('₹', '').replace(',00,000', 'L')}</div>
                        <div style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>Revenue</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#4caf8c' }}>{c.sale_count}</div>
                        <div style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>Sales</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#6c9ddc' }}>{c.user_count}</div>
                        <div style={{ fontSize: 10, color: 'rgba(200,212,232,0.4)' }}>Users</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {c.gstin && <span style={{ fontSize: 10, color: 'rgba(200,212,232,0.35)', fontFamily: 'monospace' }}>{c.gstin}</span>}
                      <span style={{ fontSize: 11, color: '#c9a84c', marginLeft: 'auto' }}>
                        Manage <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Users tab */
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['User', 'Role', 'Crusher Access', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(200,212,232,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.filter(u => u.role !== 'platform_admin').map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8edf5' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(200,212,232,0.45)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                            background: `${ROLE_COLORS[u.role] || '#6c9ddc'}18`,
                            color: ROLE_COLORS[u.role] || '#6c9ddc',
                          }}>{ROLE_LABELS[u.role] || u.role}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {u.crusher_access.length === 0 ? (
                              <span style={{ fontSize: 11, color: 'rgba(200,212,232,0.35)' }}>No access</span>
                            ) : u.crusher_access.map(a => (
                              <span key={a.crusher_id} style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                background: 'rgba(255,255,255,0.06)', color: 'rgba(200,212,232,0.7)',
                              }}>
                                {a.crusher_name} · {ROLE_LABELS[a.role] || a.role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: u.is_active ? 'rgba(76,175,140,0.15)' : 'rgba(220,70,70,0.15)',
                            color: u.is_active ? '#4caf8c' : '#e05555',
                          }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateCrusherModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
