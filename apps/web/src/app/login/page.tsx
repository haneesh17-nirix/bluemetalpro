'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login, selectCrusher, selectTenant } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, Shield, TrendingUp, Cpu, Globe } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

const features = [
  { icon: Shield,     label: 'Secure & Compliant',  sub: 'GST-ready, role-based access' },
  { icon: TrendingUp, label: 'Live Analytics',       sub: 'Real-time dashboards & KPIs' },
  { icon: Cpu,        label: 'Smart Operations',     sub: 'Weighbridge & maintenance' },
  { icon: Globe,      label: 'Multi-Plant',          sub: 'All units in one platform' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setTenant, setCrusher } = useCrusher();
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
        return;
      }

      if (!data.temp_token) throw new Error('Unexpected login response');

      localStorage.setItem('token', data.temp_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const tenants: any[] = data.tenants ?? [];
      if (tenants.length === 0) throw new Error('No company access found for this account');

      if (tenants.length > 1) {
        localStorage.setItem('tenants_list', JSON.stringify(tenants));
        router.push('/select-tenant');
        return;
      }

      // Single tenant — auto-select it
      const tenantData = await selectTenant(tenants[0].id);
      localStorage.setItem('token', tenantData.temp_token);
      setTenant(tenantData.tenant);

      const crushers: any[] = (tenantData.crushers ?? []).filter(
        (c: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === c.id) === i
      );

      if (crushers.length === 1) {
        const sel = await selectCrusher(crushers[0].id);
        localStorage.setItem('token', sel.token);
        localStorage.setItem('user', JSON.stringify(sel.user));
        setCrusher(sel.crusher);
        log.action('Login successful', { role: sel.user?.role });
        router.push('/dashboard');
      } else {
        localStorage.setItem('crushers_list', JSON.stringify(crushers));
        router.push('/select-crusher');
      }
    } catch (err: any) {
      log.error('Login failed', { message: err?.message });
      toast.error(err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .lp-root {
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          position: relative;
          overflow: hidden;
          background: #06091080;
        }
        /* Full-bleed grid texture */
        .lp-root::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            linear-gradient(135deg, #06090f 0%, #0b1220 45%, #080e1c 100%);
        }
        .lp-root::after {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(184,149,62,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(184,149,62,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        /* Ambient blobs */
        .lp-blob-tl {
          position: fixed; z-index: 0; pointer-events: none;
          width: 700px; height: 700px; border-radius: 50%;
          top: -200px; left: -200px;
          background: radial-gradient(circle, rgba(37,99,168,0.14) 0%, transparent 65%);
        }
        .lp-blob-br {
          position: fixed; z-index: 0; pointer-events: none;
          width: 600px; height: 600px; border-radius: 50%;
          bottom: -150px; right: -100px;
          background: radial-gradient(circle, rgba(184,149,62,0.10) 0%, transparent 65%);
        }

        /* ── Left branding panel ── */
        .lp-left {
          position: relative; z-index: 1;
          width: 48%; min-width: 440px; flex-shrink: 0;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 56px 52px;
          border-right: 1px solid rgba(184,149,62,0.08);
        }
        .lp-brand { display: flex; flex-direction: column; align-items: center; gap: 32px; }
        .lp-logo-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .lp-wordmark { display: flex; flex-direction: column; gap: 4px; }
        .lp-wordmark-name {
          font-size: 40px; font-weight: 900; color: #fff;
          letter-spacing: -0.03em; line-height: 1; text-align: center;
        }
        .lp-wordmark-tag {
          font-size: 13px; font-weight: 700; letter-spacing: 0.22em; text-align: center;
          background: linear-gradient(135deg, #b8953e, #d4aa52);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .lp-hero { display: flex; flex-direction: column; gap: 12px; }
        .lp-hero-heading {
          font-size: 48px; font-weight: 900; color: #fff;
          letter-spacing: -0.04em; line-height: 1.05;
        }
        .lp-hero-heading span {
          background: linear-gradient(135deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .lp-hero-sub {
          font-size: 15px; color: rgba(200,212,232,0.5);
          font-weight: 400; line-height: 1.6; max-width: 380px;
        }
        .lp-features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lp-feat {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border-radius: 14px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s;
        }
        .lp-feat:hover { border-color: rgba(184,149,62,0.2); }
        .lp-feat-icon {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(184,149,62,0.15) 0%, rgba(184,149,62,0.06) 100%);
          border: 1px solid rgba(184,149,62,0.18);
        }
        .lp-feat-text { display: flex; flex-direction: column; gap: 2px; }
        .lp-feat-label { font-size: 12px; font-weight: 700; color: rgba(220,232,248,0.9); }
        .lp-feat-sub { font-size: 11px; color: rgba(180,200,228,0.4); line-height: 1.4; }
        .lp-footer {
          font-size: 11px; color: rgba(180,200,228,0.2); font-weight: 500;
        }

        /* ── Right form panel ── */
        .lp-right {
          position: relative; z-index: 1;
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 32px 24px;
        }
        .lp-card {
          width: 100%; max-width: 400px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 2px solid transparent;
          box-shadow:
            0 0 0 1px #7a5010,
            0 0 0 2px #4a2e06,
            0 0 0 3px #a07020,
            0 0 0 4px #6a4008,
            0 0 20px rgba(130,90,15,0.28),
            0 32px 80px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 36px 32px;
        }
        .lp-card-header { margin-bottom: 28px; }
        .lp-card-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          padding: '3px 10px'; border-radius: 20px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          color: #c9a84c;
          background: rgba(184,149,62,0.08);
          border: 1px solid rgba(184,149,62,0.2);
          margin-bottom: 16px;
        }
        .lp-card-title {
          font-size: 26px; font-weight: 800; color: #fff;
          letter-spacing: -0.03em; line-height: 1; margin: 0 0 8px;
        }
        .lp-card-sub {
          font-size: 13px; color: rgba(180,200,228,0.45); font-weight: 400;
        }
        .lp-label {
          display: block; font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; color: rgba(170,190,220,0.5);
          text-transform: uppercase; margin-bottom: 6px;
        }
        .lp-input-wrap { position: relative; }
        .lp-input-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); pointer-events: none;
          transition: color 0.18s;
        }
        .lp-input {
          width: 100%; border-radius: 12px;
          font-size: 14px; color: #dde6f4; outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
          box-sizing: border-box;
        }
        .lp-eye {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; padding: 0;
          cursor: pointer; display: flex; align-items: center;
          transition: color 0.18s;
        }
        .lp-btn {
          width: 100%; padding: 13px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 700; letter-spacing: 0.04em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; transition: all 0.2s;
          border: 1px solid rgba(120,80,15,0.7);
          background: linear-gradient(160deg, #6a4808 0%, #8a5e12 35%, #7a5010 65%, #5a3808 100%);
          color: #d4a838;
          box-shadow:
            inset 0 1px 0 rgba(180,130,30,0.22),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 4px 16px rgba(0,0,0,0.4),
            0 1px 0 rgba(184,149,62,0.1);
        }
        .lp-btn:disabled {
          background: linear-gradient(160deg, #3a2008, #4a2e0a);
          color: rgba(180,132,28,0.4); cursor: not-allowed; box-shadow: none;
        }
        .lp-btn:not(:disabled):hover {
          background: linear-gradient(160deg, #7a5610 0%, #9a6a18 35%, #8a5e14 65%, #6a4210 100%);
          box-shadow:
            inset 0 1px 0 rgba(200,150,40,0.3),
            inset 0 -1px 0 rgba(0,0,0,0.4),
            0 6px 20px rgba(0,0,0,0.45),
            0 0 20px rgba(184,149,62,0.12);
        }
        .lp-divider {
          margin-top: 20px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          text-align: center;
          font-size: 11px; color: rgba(150,170,210,0.22);
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .lp-root { flex-direction: column; }
          .lp-left {
            width: 100% !important; min-width: unset !important;
            padding: 32px 24px 24px !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(184,149,62,0.08);
          }
          .lp-hero { display: none !important; }
          .lp-features { display: none !important; }
          .lp-footer { display: none !important; }
          .lp-hero-heading { font-size: 32px !important; }
          .lp-right { padding: 24px 16px 40px !important; }
          .lp-card { padding: 28px 22px !important; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-blob-tl" />
        <div className="lp-blob-br" />

        {/* ── Left branding panel ── */}
        <div className="lp-left">
          <div className="lp-brand">
            <div className="lp-logo-wrap">
              <div style={{ filter: 'drop-shadow(0 8px 32px rgba(160,112,20,0.6))' }}>
                <LogoIcon size={120} />
              </div>
              <div className="lp-wordmark">
                <span className="lp-wordmark-name">BlueMetal Pro</span>
                <span className="lp-wordmark-tag">QUARRY ERP</span>
              </div>
            </div>
          </div>

          <div className="lp-features">
            {features.map(f => (
              <div className="lp-feat" key={f.label}>
                <div className="lp-feat-icon">
                  <f.icon size={14} style={{ color: '#c9a84c' }} />
                </div>
                <div className="lp-feat-text">
                  <span className="lp-feat-label">{f.label}</span>
                  <span className="lp-feat-sub">{f.sub}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── Right form panel ── */}
        <div className="lp-right">
          <div className="lp-card">
            <div className="lp-card-header">
              <div className="lp-card-eyebrow" style={{ padding: '3px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a84c', boxShadow: '0 0 6px rgba(201,168,76,0.8)' }} />
                Secure login
              </div>
              <h2 className="lp-card-title">Welcome back</h2>
              <p className="lp-card-sub">Sign in to your workspace</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label className="lp-label">Email address</label>
                <div className="lp-input-wrap">
                  <Mail size={14} className="lp-input-icon" style={{ color: focusedField === 'email' ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)' }} />
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="admin@company.com"
                    autoComplete="email"
                    className="lp-input"
                    style={{
                      background: focusedField === 'email' ? 'rgba(2,8,28,0.92)' : 'rgba(3,9,24,0.65)',
                      border: focusedField === 'email' ? '1px solid rgba(180,138,32,0.55)' : '1px solid rgba(255,255,255,0.07)',
                      padding: '11px 14px 11px 40px',
                      boxShadow: focusedField === 'email'
                        ? '0 0 0 3px rgba(140,100,20,0.08), 0 0 16px rgba(120,85,12,0.15)'
                        : 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="lp-label">Password</label>
                <div className="lp-input-wrap">
                  <Lock size={14} className="lp-input-icon" style={{ color: focusedField === 'password' ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="lp-input"
                    style={{
                      background: focusedField === 'password' ? 'rgba(2,8,28,0.92)' : 'rgba(3,9,24,0.65)',
                      border: focusedField === 'password' ? '1px solid rgba(180,138,32,0.55)' : '1px solid rgba(255,255,255,0.07)',
                      padding: '11px 40px 11px 40px',
                      boxShadow: focusedField === 'password'
                        ? '0 0 0 3px rgba(140,100,20,0.08), 0 0 16px rgba(120,85,12,0.15)'
                        : 'none',
                    }}
                  />
                  <button type="button" className="lp-eye" onClick={() => setShowPassword(v => !v)}
                    style={{ color: showPassword ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ paddingTop: 4 }}>
                <button type="submit" disabled={loading} className="lp-btn">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
                    : <>Sign In <ArrowRight size={15} /></>
                  }
                </button>
              </div>
            </form>

            <div className="lp-divider">
              BlueMetal Pro · Quarry & Stone Crushing ERP
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
