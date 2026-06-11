'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { getConfig, updateConfig, getMyProfile, updateMyNotifyPrefs } from '@/lib/api';
import { Save, Building2, CreditCard, FileText, Bell } from 'lucide-react';

const ALL_EVENTS: { key: string; label: string; desc: string }[] = [
  { key: 'sale',        label: 'Sales',          desc: 'New invoice created' },
  { key: 'purchase',    label: 'Purchases',       desc: 'New purchase entry recorded' },
  { key: 'quarry',      label: 'Quarry',          desc: 'Production entry logged' },
  { key: 'maintenance', label: 'Maintenance',     desc: 'Maintenance job added' },
  { key: 'wages',       label: 'Wages',           desc: 'Attendance / wages recorded' },
  { key: 'vehicle',     label: 'Vehicles',        desc: 'Vehicle added or updated' },
  { key: 'party',       label: 'Parties',         desc: 'New party added to directory' },
  { key: 'weighbridge', label: 'Weighbridge',     desc: 'Weigh ticket created' },
  { key: 'ledger',      label: 'Payments',        desc: 'Payment / receipt recorded' },
];

export default function SettingsPage() {
  useEffect(() => { log.page('Settings'); }, []);
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig });
  const { data: myProfile } = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const [notifyEvents, setNotifyEvents] = useState<string[]>([]);
  useEffect(() => {
    if (myProfile?.notify_events) setNotifyEvents(myProfile.notify_events);
    else if (myProfile) setNotifyEvents(ALL_EVENTS.map(e => e.key));
  }, [myProfile]);

  const notifyMutation = useMutation({
    mutationFn: updateMyNotifyPrefs,
    onSuccess: () => { toast.success('Notification preferences saved'); qc.invalidateQueries({ queryKey: ['my-profile'] }); },
    onError: () => toast.error('Failed to save preferences'),
  });

  const [form, setForm] = useState<any>({
    company_name: '', gstin: '', pan: '', address: '', city: '',
    state: '', pincode: '', phone: '', email: '',
    bank_name: '', bank_account: '', bank_ifsc: '', bank_branch: '',
    invoice_prefix: 'INV', quarry_invoice_prefix: 'QRY', terms_conditions: '',
  });

  useEffect(() => {
    if (config) setForm((f: any) => ({ ...f, ...config }));
  }, [config]);

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => { log.action('Settings saved'); toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['config'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const F = ({ label, name, type = 'text', placeholder = '', maxLength, required = false }: any) => (
    <div>
      <label className="label">{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[name] || ''}
        onChange={e => setForm((f: any) => ({ ...f, [name]: e.target.value }))}
        className="input"
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />
    </div>
  );

  const isAdmin = myProfile?.role === 'admin' || myProfile?.role === 'platform_admin';

  const saveAction = isAdmin ? (
    <button
      onClick={() => mutation.mutate(form)}
      disabled={mutation.isPending}
      className="btn-primary text-sm disabled:opacity-60" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <Save size={16} /> {mutation.isPending ? 'Saving…' : 'Save Settings'}
    </button>
  ) : undefined;

  return (
    <AppLayout title="Settings" subtitle="Company configuration and preferences" actions={saveAction}>
      <form onSubmit={e => { e.preventDefault(); if (isAdmin) mutation.mutate(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {isAdmin && <>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <Building2 size={16} style={{ color: '#e8c96a' }} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Company Information</h2>
              <p className="text-xs" style={{ color: 'rgba(200,212,232,0.45)' }}>Legal entity details and contact info</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}><F label="Company Name" name="company_name" required /></div>
            <F label="GSTIN" name="gstin" placeholder="22AAAAA0000A1Z5" maxLength={15} />
            <F label="PAN" name="pan" placeholder="AAAAA0000A" maxLength={10} />
            <F label="Phone" name="phone" />
            <F label="Email" name="email" type="email" />
            <div style={{ gridColumn: 'span 2' }}><F label="Address" name="address" /></div>
            <F label="City" name="city" />
            <F label="State" name="state" />
            <F label="Pincode" name="pincode" maxLength={6} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
              <CreditCard size={16} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Bank Details</h2>
              <p className="text-xs" style={{ color: 'rgba(200,212,232,0.45)' }}>Account information printed on invoices</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <F label="Bank Name" name="bank_name" placeholder="State Bank of India" />
            <F label="Account Number" name="bank_account" />
            <F label="IFSC Code" name="bank_ifsc" placeholder="SBIN0001234" maxLength={11} />
            <F label="Branch" name="bank_branch" />
          </div>
        </div>

        {/* Invoice Config */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <FileText size={16} style={{ color: '#34d399' }} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Invoice Configuration</h2>
              <p className="text-xs" style={{ color: 'rgba(200,212,232,0.45)' }}>Numbering and terms settings</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <F label="Invoice Prefix" name="invoice_prefix" placeholder="INV" maxLength={10} />
              <p className="text-xs" style={{ marginTop: 4, color: 'rgba(200,212,232,0.3)' }}>e.g. INV → INV/2526/0001</p>
            </div>
            <div>
              <F label="Quarry Invoice Prefix" name="quarry_invoice_prefix" placeholder="QRY" maxLength={10} />
              <p className="text-xs" style={{ marginTop: 4, color: 'rgba(200,212,232,0.3)' }}>e.g. QRY → QRY/2526/0001</p>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="label">Terms &amp; Conditions (printed on invoice)</label>
            <textarea
              value={form.terms_conditions || ''}
              onChange={e => setForm((f: any) => ({ ...f, terms_conditions: e.target.value }))}
              className="input"
              rows={3}
              placeholder="E.g. Goods once sold will not be taken back. Subject to local jurisdiction."
            />
          </div>
        </div>
        </>}

        {/* Notification Preferences */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,144,24,0.15)', border: '1px solid rgba(200,144,24,0.25)' }}>
                <Bell size={16} style={{ color: '#d4a828' }} />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Notification Preferences</h2>
                <p className="text-xs" style={{ color: 'rgba(200,212,232,0.45)' }}>Choose which events trigger in-app and push notifications for you</p>
              </div>
            </div>
            <button
              onClick={() => notifyMutation.mutate(notifyEvents)}
              disabled={notifyMutation.isPending}
              className="btn-primary text-sm disabled:opacity-60"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
            >
              <Save size={14} /> {notifyMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {ALL_EVENTS.map(ev => {
              const on = notifyEvents.includes(ev.key);
              return (
                <button
                  key={ev.key}
                  onClick={() => setNotifyEvents(prev =>
                    prev.includes(ev.key) ? prev.filter(e => e !== ev.key) : [...prev, ev.key]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    border: on ? '1px solid rgba(200,144,24,0.35)' : '1px solid rgba(255,255,255,0.06)',
                    background: on ? 'rgba(200,144,24,0.08)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Toggle pill */}
                  <div style={{
                    width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative',
                    background: on ? '#c89018' : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: on ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: on ? '#e8c040' : 'rgba(200,212,232,0.7)', lineHeight: 1.2 }}>{ev.label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(200,212,232,0.35)', marginTop: 2 }}>{ev.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => setNotifyEvents(ALL_EVENTS.map(e => e.key))} className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Enable all</button>
            <button onClick={() => setNotifyEvents([])} className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Disable all</button>
          </div>
        </div>

        {/* GST Info panel */}
        <div className="card-gold" style={{ padding: 20 }}>
          <h3 className="font-semibold text-sm" style={{ marginBottom: 16, color: '#c9a84c' }}>GST Rate Reference — Stone Crushing Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
            {[
              { item: 'M-Sand, P-Sand', hsn: '25171010', gst: '5%' },
              { item: '20mm, 40mm Aggregates', hsn: '25171010', gst: '5%' },
              { item: 'Dust / Stone Dust', hsn: '25171010', gst: '5%' },
              { item: 'GSB / WMM', hsn: '25171010', gst: '5%' },
              { item: 'Boulder / Bollar', hsn: '25171010', gst: '5%' },
              { item: 'Transport (if billed)', hsn: '996511', gst: '12%' },
            ].map(r => (
              <div key={r.item} className="card" style={{ padding: 12 }}>
                <p className="font-medium text-white">{r.item}</p>
                <p className="font-mono" style={{ color: 'rgba(200,212,232,0.4)' }}>HSN: {r.hsn}</p>
                <p className="font-bold" style={{ marginTop: 2, color: '#e8c96a' }}>GST: {r.gst}</p>
              </div>
            ))}
          </div>
        </div>

      </form>
    </AppLayout>
  );
}
