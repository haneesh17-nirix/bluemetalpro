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

  useEffect(() => {
    // Pre-warm the backend connection while user fills form
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.platform_admin && data.token) {
        // Platform admin bypasses crusher selection
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
        // Legacy single-step auth (backend pre-v2): auto-select first accessible crusher
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
        } catch {
          // Crusher fetch failed — proceed to dashboard, crusher context will be null
        }
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: 'linear-gradient(175deg, #111418 0%, #161c24 50%, #111418 100%)',
    }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: '46%',
        minWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', width: 560, height: 560, borderRadius: '50%',
            top: -80, left: -160,
            background: 'radial-gradient(circle, rgba(37,99,168,0.22) 0%, transparent 65%)',
          }} />
          <div style={{
            position: 'absolute', width: 440, height: 440, borderRadius: '50%',
            bottom: -60, right: -80,
            background: 'radial-gradient(circle, rgba(184,149,62,0.14) 0%, transparent 65%)',
          }} />
        </div>

        {/* ── UPPER-MIDDLE: Logo + branding + features ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 24,
        }}>
          <div style={{ filter: 'drop-shadow(0 8px 28px rgba(160,112,20,0.55))' }}>
            <LogoIcon size={148} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontWeight: 900, fontSize: 34, color: '#fff',
              lineHeight: 1, margin: 0, letterSpacing: '-0.02em',
            }}>BlueMetal Pro</p>
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', marginTop: 8,
              background: 'linear-gradient(135deg, #b8953e, #d4aa52, #b8953e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>BUSINESS INTELLIGENCE</p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'inline-flex', flexDirection: 'column', gap: 10 }}>
            {features.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={15} style={{ color: '#c9a84c', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(200,212,232,0.8)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── BOTTOM: Stats ── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[{ label: 'Modules', value: '12+' }, { label: 'GST Ready', value: '100%' }, { label: 'Real-time', value: 'Live' }].map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '14px 12px', borderRadius: 16,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#c9a84c' }}>{s.value}</p>
              <p style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: 'rgba(200,212,232,0.5)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Card */}
          <div style={{
            borderRadius: 24, padding: 32,
            background: '#1a3570',
            border: '1px solid rgba(184,149,62,0.25)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,149,62,0.08)',
          }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Welcome back</h2>
              <p style={{ fontSize: 13, marginTop: 6, fontWeight: 500, color: 'rgba(200,212,232,0.55)' }}>
                Sign in to your workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: 'rgba(200,212,232,0.4)',
                  }} />
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input" style={{ paddingLeft: 40 }}
                    placeholder="admin@company.com" autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: 'rgba(200,212,232,0.4)',
                  }} />
                  <input
                    type="password" required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input" style={{ paddingLeft: 40 }}
                    placeholder="••••••••" autoComplete="current-password"
                  />
                </div>
              </div>

              <div>
                <button type="submit" disabled={loading} className="btn-primary w-full" style={{ padding: '12px', marginTop: 4 }}>
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                    : <>Sign In <ArrowRight size={16} /></>}
                </button>
                {loading && (
                  <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 8 }}>
                    <div style={{
                      height: '100%', width: '60%', borderRadius: 1,
                      background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
                      animation: 'shimmer 1.2s infinite',
                      backgroundSize: '200% 100%',
                    }} />
                  </div>
                )}
              </div>
            </form>

            <div className="gold-divider" style={{ margin: '28px 0 20px' }} />
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(200,212,232,0.35)' }}>
              BlueMetal Pro · Quarry & Stone Crushing ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
