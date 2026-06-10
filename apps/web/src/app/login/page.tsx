'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login, selectCrusher, getCrushers } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

const features = [
  'GST-ready tax invoices',
  'Multi-crusher operations',
  'Live weighbridge integration',
  'Real-time reports & analytics',
  'Payroll & attendance tracking',
];

export default function LoginPage() {
  const router = useRouter();
  const { setCrusher } = useCrusher();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.platform_admin && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        log.action('Platform admin login', {});
        router.push('/platform');
      } else if (data.temp_token && Array.isArray(data.crushers)) {
        localStorage.setItem('token', data.temp_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.crushers.length === 1) {
          const sel = await selectCrusher(data.crushers[0].id);
          localStorage.setItem('token', sel.token);
          localStorage.setItem('user', JSON.stringify(sel.user));
          setCrusher(sel.crusher);
          log.action('Login successful', { role: sel.user?.role });
          router.push('/dashboard');
        } else {
          localStorage.setItem('crushers_list', JSON.stringify(data.crushers));
          router.push('/select-crusher');
        }
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        try {
          const crushers = await getCrushers();
          if (Array.isArray(crushers) && crushers.length > 0) {
            if (crushers.length === 1) {
              setCrusher(crushers[0]);
              localStorage.setItem('crusher', JSON.stringify(crushers[0]));
            } else {
              localStorage.setItem('crushers_list', JSON.stringify(crushers));
              router.push('/select-crusher');
              return;
            }
          }
        } catch { /* proceed */ }
        router.push('/dashboard');
      } else {
        throw new Error('Unexpected login response');
      }
    } catch (err: any) {
      log.error('Login failed', { message: err?.message });
      toast.error(err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: 'rgba(4, 10, 22, 0.85)',
    border: focusedField === field
      ? '1px solid rgba(170,128,28,0.75)'
      : '1px solid rgba(110,78,14,0.4)',
    borderRadius: 10,
    padding: '11px 14px 11px 40px',
    fontSize: 14,
    color: '#dde6f4',
    outline: 'none',
    boxShadow: focusedField === field
      ? '0 0 0 1px rgba(150,108,20,0.3), 0 0 8px rgba(130,92,16,0.1), inset 0 1px 0 rgba(150,108,20,0.06)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: 'linear-gradient(175deg, #111418 0%, #161c24 50%, #111418 100%)',
    }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: '46%', minWidth: '420px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', top: -80, left: -160, background: 'radial-gradient(circle, rgba(37,99,168,0.22) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', bottom: -60, right: -80, background: 'radial-gradient(circle, rgba(184,149,62,0.14) 0%, transparent 65%)' }} />
        </div>

        {/* Logo + branding */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ filter: 'drop-shadow(0 8px 28px rgba(160,112,20,0.55))' }}>
            <LogoIcon size={148} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 900, fontSize: 34, color: '#fff', lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>BlueMetal Pro</p>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', marginTop: 8, background: 'linear-gradient(135deg, #b8953e, #d4aa52, #b8953e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUSINESS INTELLIGENCE</p>
          </div>
        </div>

        {/* Features + stats */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'inline-flex', flexDirection: 'column', gap: 10, alignSelf: 'center' }}>
            {features.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={15} style={{ color: '#c9a84c', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(220,230,245,0.95)' }}>{f}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[{ label: 'Modules', value: '12+' }, { label: 'GST Ready', value: '100%' }, { label: 'Real-time', value: 'Live' }].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '14px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#c9a84c' }}>{s.value}</p>
                <p style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: 'rgba(200,212,232,0.5)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            borderRadius: 20,
            padding: '32px 28px',
            background: 'linear-gradient(175deg, #0f2048 0%, #0a1830 55%, #071228 100%)',
            border: '1.5px solid rgba(120,85,14,0.55)',
            boxShadow: [
              '0 0 0 1px rgba(100,70,10,0.12)',
              '0 0 28px rgba(110,78,12,0.16)',
              '0 24px 64px rgba(0,0,0,0.6)',
              'inset 0 1px 0 rgba(160,118,24,0.11)',
              'inset 0 -1px 0 rgba(0,0,20,0.5)',
            ].join(', '),
          }}>

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#e8edf8', margin: 0 }}>Welcome back</h2>
              <p style={{ fontSize: 12, marginTop: 6, color: 'rgba(180,200,230,0.45)', fontWeight: 500 }}>Sign in to your workspace</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(170,190,220,0.55)', marginBottom: 7, textTransform: 'uppercase' }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focusedField === 'email' ? 'rgba(180,132,28,0.7)' : 'rgba(150,170,210,0.32)', transition: 'color 0.18s' }} />
                  <input type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                    style={inputStyle('email')} placeholder="admin@company.com" autoComplete="email" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(170,190,220,0.55)', marginBottom: 7, textTransform: 'uppercase' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focusedField === 'password' ? 'rgba(180,132,28,0.7)' : 'rgba(150,170,210,0.32)', transition: 'color 0.18s' }} />
                  <input type="password" required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    style={inputStyle('password')} placeholder="••••••••" autoComplete="current-password" />
                </div>
              </div>

              <div style={{ marginTop: 4 }}>
                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 10,
                    border: '1px solid rgba(100,70,10,0.7)',
                    background: loading
                      ? 'linear-gradient(160deg, #4a3008, #5a3a0a)'
                      : 'linear-gradient(160deg, #6a4808 0%, #8a5e12 35%, #7a5010 65%, #5a3808 100%)',
                    color: loading ? 'rgba(180,132,28,0.5)' : '#d4a838',
                    fontSize: 14, fontWeight: 700, letterSpacing: '0.05em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: !loading ? [
                      'inset 0 1px 0 rgba(180,130,30,0.22)',
                      'inset 0 -1px 0 rgba(0,0,0,0.4)',
                      '0 2px 8px rgba(0,0,0,0.35)',
                    ].join(', ') : 'none',
                    transition: 'all 0.2s',
                  }}>
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                    : <>Sign In <ArrowRight size={15} /></>}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid rgba(100,70,10,0.22)', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'rgba(150,170,210,0.28)' }}>
                BlueMetal Pro · Quarry & Stone Crushing ERP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
