'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login, selectCrusher, getCrushers } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

const features = [
  'GST invoicing & filing',
  'Multi-plant operations',
  'Live weighbridge',
  'Real-time dashboards',
  'Payroll & attendance',
  'Ledger & party mgmt',
  'Maintenance alerts',
  'Vehicle fleet tracking',
];

export default function LoginPage() {
  const router = useRouter();
  const { setCrusher } = useCrusher();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const inputStyle = (field: string, hasRightIcon = false): React.CSSProperties => ({
    width: '100%',
    background: focusedField === field
      ? 'rgba(2, 8, 28, 0.92)'
      : 'rgba(3, 9, 24, 0.80)',
    border: focusedField === field
      ? '1px solid rgba(180,138,32,0.6)'
      : '1px solid rgba(90,120,180,0.18)',
    borderRadius: 10,
    padding: `11px ${hasRightIcon ? '40px' : '14px'} 11px 40px`,
    fontSize: 14,
    color: '#dde6f4',
    outline: 'none',
    boxShadow: focusedField === field
      ? '0 0 0 2px rgba(140,100,20,0.12), 0 0 14px rgba(120,85,12,0.18), inset 0 0 18px rgba(10,30,80,0.3)'
      : 'inset 0 0 12px rgba(5,18,55,0.4)',
    transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
  });

  return (
    <div className="login-page" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: 'linear-gradient(175deg, #111418 0%, #161c24 50%, #111418 100%)',
    }}>
      <style>{`
        @media (max-width: 767px) {
          .login-page        { flex-direction: column !important; }
          .login-left        { width: 100% !important; min-width: unset !important;
                               padding: 28px 24px 20px !important; flex-shrink: 0 !important;
                               justify-content: flex-start !important; align-items: center !important; }
          .login-blobs       { display: none !important; }
          .login-branding    { gap: 12px !important; }
          .login-branding-logo { filter: drop-shadow(0 6px 18px rgba(160,112,20,0.5)) !important; }
          .login-features    { display: none !important; }
          .login-stats       { display: none !important; }
          .login-right       { padding: 12px 16px 32px !important; align-items: flex-start !important; }
          .login-title       { font-size: 26px !important; }
          .login-subtitle    { font-size: 11px !important; }
        }
        @media (min-width: 768px) {
          .login-mobile-logo { display: none !important; }
        }
      `}</style>

      {/* ── Left branding panel ── */}
      <div className="login-left" style={{
        width: '46%', minWidth: '420px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div className="login-blobs" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', top: -80, left: -160, background: 'radial-gradient(circle, rgba(37,99,168,0.22) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', bottom: -60, right: -80, background: 'radial-gradient(circle, rgba(184,149,62,0.14) 0%, transparent 65%)' }} />
        </div>

        {/* Logo + branding */}
        <div className="login-branding" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div className="login-branding-logo" style={{ filter: 'drop-shadow(0 8px 28px rgba(160,112,20,0.55))' }}>
            <LogoIcon size={148} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p className="login-title" style={{ fontWeight: 900, fontSize: 34, color: '#fff', lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>BlueMetal Pro</p>
            <p className="login-subtitle" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', marginTop: 8, background: 'linear-gradient(135deg, #b8953e, #d4aa52, #b8953e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUSINESS INTELLIGENCE</p>
          </div>
        </div>

        {/* Features + stats */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="login-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', alignSelf: 'center' }}>
            {features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(220,230,245,0.92)' }}>{f}</span>
              </div>
            ))}
          </div>
          <div className="login-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            borderRadius: 20,
            padding: '32px 28px',
            background: 'linear-gradient(175deg, #050f28 0%, #03091c 55%, #020814 100%)',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
            outline: '2px solid transparent',
            boxShadow: [
              /* rugged matte gold outer ring — half thickness */
              '0 0 0 1.5px #6a4808',
              '0 0 0 2px #3e2604',
              '0 0 0 2.8px #8a5e12',
              '0 0 0 3.5px #4a3008',
              /* ambient glow */
              '0 0 16px rgba(100,68,10,0.35)',
              '0 28px 60px rgba(0,0,0,0.6)',
              'inset 0 1px 0 rgba(80,120,200,0.08)',
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
                  <input type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    style={inputStyle('password', true)} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: showPassword ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.32)', transition: 'color 0.18s', display: 'flex', alignItems: 'center' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
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
