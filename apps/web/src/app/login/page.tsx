'use client';
import { useState } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login, selectCrusher } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);

      // ── New two-step flow: { temp_token, user, crushers[] } ──
      if (data.temp_token && Array.isArray(data.crushers)) {
        localStorage.setItem('token', data.temp_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (data.crushers.length === 1) {
          const sel = await selectCrusher(data.crushers[0].id);
          localStorage.setItem('token', sel.token);
          localStorage.setItem('user', JSON.stringify(sel.user));
          setCrusher(sel.crusher);
          log.action('Login successful', { role: sel.user?.role, crusher: data.crushers[0].name });
          router.push('/dashboard');
        } else {
          localStorage.setItem('crushers_list', JSON.stringify(data.crushers));
          log.action('Login — crusher selection required', { count: data.crushers.length });
          router.push('/select-crusher');
        }

      // ── Legacy single-step flow: { token, user } ──
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        log.action('Login successful (legacy)', { role: data.user?.role });
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
    <div
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(175deg, #060f20 0%, #0c1f3d 50%, #060f20 100%)',
      }}
    >
      {/* ── Left panel — branding ──────────────────── */}
      <div className="hidden lg:flex flex-col w-[46%] p-12 relative overflow-hidden">

        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              top: '-100px', left: '-150px',
              background: 'radial-gradient(circle, rgba(37,99,168,0.2) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              bottom: '-80px', right: '-100px',
              background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%)',
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4 mb-16">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)',
              color: '#0c1f3d',
              boxShadow: '0 6px 20px rgba(201,168,76,0.35)',
            }}
          >
            B
          </div>
          <div>
            <p className="font-bold text-xl text-white leading-none">BlueMetal Pro</p>
            <p
              className="text-xs font-semibold tracking-widest mt-0.5"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0d878)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              QUARRY ERP
            </p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Stone Crushing<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #c9a84c 0%, #f0d878 50%, #c9a84c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Business Intelligence
            </span>
          </h2>
          <p className="text-base mb-10 leading-relaxed" style={{ color: 'rgba(200,212,232,0.65)', maxWidth: '340px' }}>
            Complete ERP built for quarry operations — from weighbridge to GST filing.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle size={16} style={{ color: '#e8c96a', flexShrink: 0 }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(200,212,232,0.8)' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-12">
          {[
            { label: 'Modules', value: '12+' },
            { label: 'GST Ready', value: '100%' },
            { label: 'Real-time', value: 'Live' },
          ].map(s => (
            <div
              key={s.label}
              className="text-center p-4 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <p className="text-xl font-extrabold" style={{ color: '#e8c96a' }}>{s.value}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(200,212,232,0.55)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ───────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl mb-4"
              style={{
                background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)',
                color: '#0c1f3d',
                boxShadow: '0 8px 24px rgba(201,168,76,0.4)',
              }}
            >
              B
            </div>
            <h1 className="text-2xl font-bold text-white">BlueMetal Pro</h1>
            <p className="text-xs mt-1 font-semibold tracking-widest" style={{ color: 'rgba(201,168,76,0.8)' }}>
              QUARRY ERP
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: '#162c52',
              border: '1px solid rgba(201,168,76,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08)',
            }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(200,212,232,0.55)' }}>
                Sign in to your workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(200,212,232,0.4)' }}
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input pl-10"
                    placeholder="admin@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(200,212,232,0.4)' }}
                  />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input pl-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2" style={{ padding: '12px' }}>
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="gold-divider mt-8 mb-5" />
            <p className="text-center text-xs" style={{ color: 'rgba(200,212,232,0.35)' }}>
              BlueMetal Pro · Quarry & Stone Crushing ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
