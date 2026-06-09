'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { getConfig, updateConfig } from '@/lib/api';
import { Save, Building2 } from 'lucide-react';

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
      className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
    >
      <Save size={16} /> {mutation.isPending ? 'Saving…' : 'Save Settings'}
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Settings" subtitle="Company configuration and preferences" actions={saveAction} />
        <main className="flex-1 overflow-y-auto p-6">

          <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">

            {/* Company Info */}
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
                <Building2 size={18} className="text-[#c9a84c]" /> Company Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><F label="Company Name" name="company_name" required /></div>
                <F label="GSTIN" name="gstin" placeholder="22AAAAA0000A1Z5" maxLength={15} />
                <F label="PAN" name="pan" placeholder="AAAAA0000A" maxLength={10} />
                <F label="Phone" name="phone" />
                <F label="Email" name="email" type="email" />
                <div className="col-span-2"><F label="Address" name="address" /></div>
                <F label="City" name="city" />
                <F label="State" name="state" />
                <F label="Pincode" name="pincode" maxLength={6} />
              </div>
            </div>

            {/* Bank Details */}
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5">Bank Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <F label="Bank Name" name="bank_name" placeholder="State Bank of India" />
                <F label="Account Number" name="bank_account" />
                <F label="IFSC Code" name="bank_ifsc" placeholder="SBIN0001234" maxLength={11} />
                <F label="Branch" name="bank_branch" />
              </div>
            </div>

            {/* Invoice Config */}
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5">Invoice Configuration</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <F label="Invoice Prefix" name="invoice_prefix" placeholder="INV" maxLength={10} />
                  <p className="text-xs text-white/30 mt-1">e.g. INV → INV/2526/0001</p>
                </div>
                <div>
                  <F label="Quarry Invoice Prefix" name="quarry_invoice_prefix" placeholder="QRY" maxLength={10} />
                  <p className="text-xs text-white/30 mt-1">e.g. QRY → QRY/2526/0001</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Terms & Conditions (printed on invoice)</label>
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
              <div className="grid grid-cols-3 gap-3 text-xs">
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
                    <p className="text-white/40 font-mono">HSN: {r.hsn}</p>
                    <p className="text-[#c9a84c] font-bold mt-0.5">GST: {r.gst}</p>
                  </div>
                ))}
              </div>
            </div>

          </form>

        </main>
      </div>
    </div>
  );
}
