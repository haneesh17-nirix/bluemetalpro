'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppLayout from '@/components/layout/AppLayout';
import { getConfig, updateConfig } from '@/lib/api';
import { Save, Building2, CreditCard, FileText, Phone } from 'lucide-react';

export default function SettingsPage() {
  useEffect(() => { log.page('Settings'); }, []);
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig });

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

  const saveAction = (
    <button
      onClick={() => mutation.mutate(form)}
      disabled={mutation.isPending}
      className="btn-primary text-sm disabled:opacity-60" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <Save size={16} /> {mutation.isPending ? 'Saving…' : 'Save Settings'}
    </button>
  );

  return (
    <AppLayout title="Settings" subtitle="Company configuration and preferences" actions={saveAction}>
      <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Company Info */}
        <div className="card p-6">
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
        <div className="card p-6">
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
        <div className="card p-6">
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
              <p className="text-xs mt-1" style={{ color: 'rgba(200,212,232,0.3)' }}>e.g. INV → INV/2526/0001</p>
            </div>
            <div>
              <F label="Quarry Invoice Prefix" name="quarry_invoice_prefix" placeholder="QRY" maxLength={10} />
              <p className="text-xs mt-1" style={{ color: 'rgba(200,212,232,0.3)' }}>e.g. QRY → QRY/2526/0001</p>
            </div>
          </div>
          <div className="mt-4">
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

        {/* GST Info panel */}
        <div className="card-gold p-5">
          <h3 className="font-semibold text-[#c9a84c] mb-4 text-sm">GST Rate Reference — Stone Crushing Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
            {[
              { item: 'M-Sand, P-Sand', hsn: '25171010', gst: '5%' },
              { item: '20mm, 40mm Aggregates', hsn: '25171010', gst: '5%' },
              { item: 'Dust / Stone Dust', hsn: '25171010', gst: '5%' },
              { item: 'GSB / WMM', hsn: '25171010', gst: '5%' },
              { item: 'Boulder / Bollar', hsn: '25171010', gst: '5%' },
              { item: 'Transport (if billed)', hsn: '996511', gst: '12%' },
            ].map(r => (
              <div key={r.item} className="card p-3">
                <p className="font-medium text-white">{r.item}</p>
                <p className="font-mono" style={{ color: 'rgba(200,212,232,0.4)' }}>HSN: {r.hsn}</p>
                <p className="font-bold mt-0.5" style={{ color: '#e8c96a' }}>GST: {r.gst}</p>
              </div>
            ))}
          </div>
        </div>

      </form>
    </AppLayout>
  );
}
