'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Building2, Factory, Plus, X, LogOut, Loader2, ChevronRight,
  ToggleLeft, ToggleRight, Edit2, Users, MapPin, TrendingUp, IndianRupee,
} from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';
import {
  getPlatformTenants, platformCreateTenant, platformUpdateTenant,
  platformSetTenantStatus, getPlatformTenantCrushers, platformAddCrusherToTenant,
} from '@/lib/api';

const PLAN_COLORS: Record<string, string> = {
  standard: '#4ade80', pro: '#60a5fa', enterprise: '#c9a84c',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type Tenant = {
  id: string; name: string; legal_name: string; city: string; state: string;
  gstin: string; phone: string; email: string; plan: string; logo_url: string;
  is_active: boolean; crusher_count: number; user_count: number;
  total_revenue: number; created_at: string;
};

// ── Tenant Form Modal ─────────────────────────────────────────────────────────
function TenantModal({ tenant, onClose, onSaved }: {
  tenant?: Tenant | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!tenant;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: tenant?.name || '', legal_name: tenant?.legal_name || '',
    gstin: tenant?.gstin || '', city: tenant?.city || '',
    state: tenant?.state || 'Tamil Nadu', phone: tenant?.phone || '',
    email: tenant?.email || '', plan: tenant?.plan || 'standard',
    // First crusher fields (create only)
    crusher_name: '', crusher_city: '', crusher_gstin: '',
    crusher_invoice_prefix: 'INV', crusher_quarry_prefix: 'QRY',
    // Admin user fields (create only)
    admin_name: '', admin_email: '', admin_password: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) return toast.error('Company name is required');
    setSaving(true);
    try {
      if (isEdit) {
        await platformUpdateTenant(tenant!.id, form);
        toast.success('Tenant updated');
      } else {
        await platformCreateTenant(form);
        toast.success(`${form.name} created`);
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(170,190,220,0.55)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      <input type={type} placeholder={placeholder || label}
        value={(form as any)[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: 'rgba(3,9,24,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#dde6f4', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 580, maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(160deg, #0d1830 0%, #091420 100%)', border: '1px solid rgba(26,53,112,0.55)', borderRadius: 20, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#e8edf5', margin: 0 }}>
              {isEdit ? 'Edit Company' : 'New Company'}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(180,200,230,0.4)', margin: '4px 0 0' }}>
              {isEdit ? 'Update tenant details' : 'Provision a new crusher company'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,200,230,0.5)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>{field('Company Name', 'name')}</div>
            {field('Legal Name', 'legal_name')}
            {field('GSTIN', 'gstin')}
            {field('City', 'city')}
            {field('State', 'state')}
            {field('Phone', 'phone', 'tel')}
            {field('Email', 'email', 'email')}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(170,190,220,0.55)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan</label>
              <select value={form.plan} onChange={e => set('plan', e.target.value)}
                style={{ width: '100%', background: 'rgba(3,9,24,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#dde6f4', outline: 'none' }}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {!isEdit && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(184,149,62,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>First Plant (optional)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: 'span 2' }}>{field('Plant Name', 'crusher_name', 'text', 'e.g. Unit 1 — Hosur')}</div>
                  {field('City', 'crusher_city')}
                  {field('GSTIN', 'crusher_gstin')}
                  {field('Invoice Prefix', 'crusher_invoice_prefix', 'text', 'INV')}
                  {field('Quarry Prefix', 'crusher_quarry_prefix', 'text', 'QRY')}
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(184,149,62,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Admin Account (optional)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {field('Admin Name', 'admin_name')}
                  {field('Admin Email', 'admin_email', 'email')}
                  <div style={{ gridColumn: 'span 2' }}>{field('Password', 'admin_password', 'password')}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(180,200,230,0.6)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(120,80,15,0.7)', background: 'linear-gradient(160deg, #6a4808, #8a5e12)', color: '#d4a838', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Company')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Crusher Modal ─────────────────────────────────────────────────────────
function AddCrusherModal({ tenantId, onClose, onSaved }: {
  tenantId: string; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', legal_name: '', gstin: '', city: '', state: 'Tamil Nadu', invoice_prefix: 'INV', quarry_invoice_prefix: 'QRY' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) return toast.error('Plant name is required');
    setSaving(true);
    try {
      await platformAddCrusherToTenant(tenantId, form);
      toast.success(`${form.name} added`);
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to add plant');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 460, background: 'linear-gradient(160deg, #0d1830, #091420)', border: '1px solid rgba(26,53,112,0.55)', borderRadius: 20, padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8edf5', margin: 0 }}>Add Crushing Plant</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,200,230,0.5)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(['name','legal_name','gstin','city'] as const).map(k => (
            <div key={k}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(170,190,220,0.55)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.replace(/_/g, ' ')}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                style={{ width: '100%', background: 'rgba(3,9,24,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#dde6f4', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['invoice_prefix','quarry_invoice_prefix'] as const).map(k => (
              <div key={k}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(170,190,220,0.55)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.replace(/_/g, ' ')}</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)}
                  style={{ width: '100%', background: 'rgba(3,9,24,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 12px', fontSize: 13, color: '#dde6f4', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(180,200,230,0.6)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 10, border: '1px solid rgba(120,80,15,0.7)', background: 'linear-gradient(160deg, #6a4808, #8a5e12)', color: '#d4a838', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : 'Add Plant'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Platform Admin Page ──────────────────────────────────────────────────
export default function PlatformPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantCrushers, setTenantCrushers] = useState<any[]>([]);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [showAddCrusher, setShowAddCrusher] = useState(false);

  const logout = () => {
    ['token', 'user', 'tenant', 'crusher', 'tenants_list', 'crushers_list'].forEach(k => localStorage.removeItem(k));
    router.push('/login');
  };

  const load = async () => {
    try { setTenants(await getPlatformTenants()); }
    catch { toast.error('Failed to load tenants'); }
    finally { setLoading(false); }
  };

  const selectTenantDetail = async (t: Tenant) => {
    setSelectedTenant(t);
    try { setTenantCrushers(await getPlatformTenantCrushers(t.id)); }
    catch { setTenantCrushers([]); }
  };

  const toggleStatus = async (t: Tenant) => {
    try {
      await platformSetTenantStatus(t.id, !t.is_active);
      toast.success(t.is_active ? `${t.name} deactivated` : `${t.name} activated`);
      load();
      if (selectedTenant?.id === t.id) setSelectedTenant({ ...t, is_active: !t.is_active });
    } catch { toast.error('Failed'); }
  };

  useEffect(() => { load(); }, []);

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #07090f 0%, #0b1220 50%, #07090f 100%)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid rgba(26,53,112,0.45)', background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(20px)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ filter: 'drop-shadow(0 3px 12px rgba(160,112,20,0.45))' }}><LogoIcon size={40} /></div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>BlueMetal Pro</p>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', margin: '2px 0 0', background: 'linear-gradient(135deg, #b8953e, #d4aa52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SUPER ADMIN</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'rgba(180,200,230,0.5)', textAlign: 'right' }}>
            <div style={{ fontWeight: 600, color: '#e8edf5' }}>{user?.name || 'Super Admin'}</div>
            <div>Platform Administrator</div>
          </div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(200,212,232,0.6)', fontSize: 12, cursor: 'pointer' }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: tenant list */}
        <div style={{ width: 340, borderRight: '1px solid rgba(26,53,112,0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(26,53,112,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e8edf5', margin: 0 }}>Companies</p>
              <p style={{ fontSize: 11, color: 'rgba(180,200,230,0.4)', margin: '2px 0 0' }}>{tenants.length} tenants</p>
            </div>
            <button onClick={() => { setEditTenant(null); setShowTenantModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: '1px solid rgba(120,80,15,0.5)', background: 'rgba(184,149,62,0.08)', color: '#c9a84c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> New
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: '#c9a84c', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : tenants.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Building2 size={24} style={{ color: 'rgba(200,212,232,0.15)', display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: 'rgba(200,212,232,0.3)' }}>No companies yet</p>
              </div>
            ) : tenants.map(t => (
              <button key={t.id} onClick={() => selectTenantDetail(t)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  background: selectedTenant?.id === t.id ? 'rgba(184,149,62,0.1)' : 'transparent',
                  border: selectedTenant?.id === t.id ? '1px solid rgba(184,149,62,0.25)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(184,149,62,0.1)', border: '1px solid rgba(184,149,62,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={14} style={{ color: '#c9a84c' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: selectedTenant?.id === t.id ? '#d4aa52' : '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${PLAN_COLORS[t.plan] || '#4ade80'}18`, color: PLAN_COLORS[t.plan] || '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{t.plan}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(180,200,230,0.4)', marginTop: 2 }}>
                      {t.crusher_count} plant{t.crusher_count !== 1 ? 's' : ''} · {t.city || '—'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {t.is_active
                      ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
                      : <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(200,212,232,0.2)' }} />
                    }
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: tenant detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {!selectedTenant ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Building2 size={36} style={{ color: 'rgba(200,212,232,0.1)' }} />
              <p style={{ fontSize: 14, color: 'rgba(200,212,232,0.3)', fontWeight: 500 }}>Select a company to view details</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

              {/* Tenant header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{selectedTenant.name}</h1>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${PLAN_COLORS[selectedTenant.plan] || '#4ade80'}18`, color: PLAN_COLORS[selectedTenant.plan] || '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedTenant.plan}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: selectedTenant.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', color: selectedTenant.is_active ? '#4ade80' : 'rgba(200,212,232,0.3)', textTransform: 'uppercase' }}>
                      {selectedTenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(180,200,230,0.45)' }}>
                    {selectedTenant.legal_name && <span>{selectedTenant.legal_name}</span>}
                    {selectedTenant.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{selectedTenant.city}, {selectedTenant.state}</span>}
                    {selectedTenant.gstin && <span>GSTIN: {selectedTenant.gstin}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditTenant(selectedTenant); setShowTenantModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(200,212,232,0.7)', fontSize: 12, cursor: 'pointer' }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => toggleStatus(selectedTenant)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: `1px solid ${selectedTenant.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}`, background: selectedTenant.is_active ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)', color: selectedTenant.is_active ? '#fca5a5' : '#4ade80', fontSize: 12, cursor: 'pointer' }}>
                    {selectedTenant.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    {selectedTenant.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Plants', value: selectedTenant.crusher_count, icon: Factory, color: '#c9a84c' },
                  { label: 'Users', value: selectedTenant.user_count, icon: Users, color: '#60a5fa' },
                  { label: 'Revenue', value: fmt(selectedTenant.total_revenue || 0), icon: IndianRupee, color: '#4ade80' },
                ].map(k => (
                  <div key={k.label} style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <k.icon size={14} style={{ color: k.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(180,200,230,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Crushers section */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Factory size={14} style={{ color: '#c9a84c' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e8edf5' }}>Crushing Plants</span>
                  </div>
                  <button onClick={() => setShowAddCrusher(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(120,80,15,0.45)', background: 'rgba(184,149,62,0.07)', color: '#c9a84c', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={12} /> Add Plant
                  </button>
                </div>
                {tenantCrushers.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'rgba(200,212,232,0.3)' }}>No plants yet</div>
                ) : tenantCrushers.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(184,149,62,0.08)', border: '1px solid rgba(184,149,62,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                      <Factory size={14} style={{ color: '#c9a84c' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8edf5' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(180,200,230,0.4)', marginTop: 1 }}>
                        {c.city && `${c.city} · `}{c.gstin || 'No GSTIN'} · {c.sale_count || 0} sales
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600 }}>{fmt(c.total_revenue || 0)}</div>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', marginLeft: 14, background: c.is_active ? '#4ade80' : 'rgba(200,212,232,0.2)', boxShadow: c.is_active ? '0 0 6px rgba(74,222,128,0.6)' : 'none' }} />
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>

      {showTenantModal && (
        <TenantModal
          tenant={editTenant}
          onClose={() => { setShowTenantModal(false); setEditTenant(null); }}
          onSaved={() => { load(); if (editTenant && selectedTenant?.id === editTenant.id) getPlatformTenantCrushers(editTenant.id).then(setTenantCrushers).catch(() => {}); }}
        />
      )}

      {showAddCrusher && selectedTenant && (
        <AddCrusherModal
          tenantId={selectedTenant.id}
          onClose={() => setShowAddCrusher(false)}
          onSaved={() => { selectTenantDetail(selectedTenant); load(); }}
        />
      )}
    </div>
  );
}
