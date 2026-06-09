'use client';
import { useState } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { login, selectCrusher } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

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
    } catch {
      log.error('Login failed');
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(160deg, #071530 0%, #0e2544 50%, #071530 100%)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        {/* Background network pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 35%, #2563a8 0%, transparent 55%), radial-gradient(circle at 75% 65%, #c9a84c 0%, transparent 55%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <Image src="/logo-icon.png" alt="BlueMetal Pro" width={56} height={56} className="rounded-2xl" unoptimized />
          <span className="text-xl font-bold text-white">BlueMetal Pro</span>
        </div>

        {/* Center graphic */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="BlueMetal Pro" width={320} height={200} className="mb-8 drop-shadow-2xl" unoptimized />
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Stone Crushing<br />
            <span style={{ background: 'linear-gradient(135deg, #9a7a2e, #e8c96a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Business Intelligence
            </span>
          </h2>
          <p className="text-white/50 text-sm max-w-xs leading-relaxed">
            Complete ERP for quarry operations — sales, procurement, weighbridge, payroll, and real-time reports.
          </p>
        </div>

        {/* Footer stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Modules', value: '12+' },
            { label: 'GST Ready', value: '100%' },
            { label: 'Real-time', value: 'Live' },
          ].map(s => (
            <div key={s.label} className="text-center p-4 rounded-xl border border-white/10 bg-white/5">
              <p className="text-xl font-bold text-gold-light">{s.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Image src="/logo-icon.png" alt="BlueMetal Pro" width={72} height={72} className="rounded-2xl mb-4 shadow-glow" unoptimized />
            <h1 className="text-2xl font-bold text-white">BlueMetal Pro</h1>
          </div>

          {/* Card */}
          <div className="card-gold p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-white/50 text-sm mt-1">Sign in to your workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input pl-10"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="gold-divider mt-6" />
            <p className="text-center text-xs text-white/30">
              BlueMetal Pro · Quarry & Stone Crushing ERP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
