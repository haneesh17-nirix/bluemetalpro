'use client';
import { useState, useEffect } from 'react';
import { log } from '@bluemetal/shared';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { login, selectCrusher, getCrushers } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { Lock, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

type VaultPhase = 'locked' | 'unlocking' | 'swinging' | 'open';

const features = [
  'GST-ready tax invoices',
  'Multi-crusher operations',
  'Live weighbridge integration',
  'Real-time reports & analytics',
  'Payroll & attendance tracking',
];

function VaultFace({ phase }: { phase: VaultPhase }) {
  const S = 300;
  const cx = S / 2;
  const bolts = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);
  const retracted = phase === 'unlocking' || phase === 'swinging';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="vbg" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#1a3060" />
            <stop offset="55%" stopColor="#0d1e3c" />
            <stop offset="100%" stopColor="#060e1c" />
          </radialGradient>
          <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#8a6018" />
            <stop offset="28%"  stopColor="#6a4808" />
            <stop offset="55%"  stopColor="#9a7020" />
            <stop offset="78%"  stopColor="#5a3808" />
            <stop offset="100%" stopColor="#806010" />
          </linearGradient>
          <linearGradient id="gbolt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#a07828" />
            <stop offset="50%"  stopColor="#7a5810" />
            <stop offset="100%" stopColor="#5a3808" />
          </linearGradient>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="rgba(180,130,30,0.5)" />
            <stop offset="100%" stopColor="rgba(180,130,30,0)" />
          </radialGradient>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Main disc */}
        <circle cx={cx} cy={cx} r={148} fill="url(#vbg)" />

        {/* Outer scratched rim - two rings for depth */}
        <circle cx={cx} cy={cx} r={147} fill="none" stroke="rgba(60,40,8,0.9)" strokeWidth={5} />
        <circle cx={cx} cy={cx} r={147} fill="none" stroke="url(#gm)" strokeWidth={3} />
        <circle cx={cx} cy={cx} r={142} fill="none" stroke="rgba(100,70,10,0.25)" strokeWidth={1} />

        {/* Bolt track groove */}
        <circle cx={cx} cy={cx} r={118} fill="none" stroke="rgba(60,40,8,0.6)" strokeWidth={3.5} />
        <circle cx={cx} cy={cx} r={118} fill="none" stroke="rgba(120,85,18,0.3)" strokeWidth={1.5} />

        {/* 8 locking bolts */}
        {bolts.map((angle, i) => {
          const bx1 = cx + Math.cos(angle) * 120;
          const by1 = cx + Math.sin(angle) * 120;
          const bx2 = cx + Math.cos(angle) * 144;
          const by2 = cx + Math.sin(angle) * 144;
          return (
            <line key={i}
              x1={bx1} y1={by1} x2={bx2} y2={by2}
              stroke="url(#gbolt)" strokeWidth={9} strokeLinecap="round"
              filter={retracted ? undefined : 'url(#goldGlow)'}
              style={{
                transformOrigin: `${bx1}px ${by1}px`,
                transform: retracted ? 'scaleX(0.05)' : 'scaleX(1)',
                transition: `transform 0.45s cubic-bezier(0.4,0,0.6,1) ${i * 55}ms`,
                opacity: retracted ? 0.1 : 1,
              }}
            />
          );
        })}

        {/* Panel detail rings */}
        <circle cx={cx} cy={cx} r={98}  fill="none" stroke="rgba(100,70,12,0.22)" strokeWidth={1.5} />
        <circle cx={cx} cy={cx} r={90}  fill="none" stroke="rgba(80,55,10,0.15)"  strokeWidth={1} />

        {/* Decorative radial lines between track and mid-ring */}
        {bolts.map((angle, i) => {
          const mx = (cx + Math.cos(angle) * 100);
          const my = (cx + Math.sin(angle) * 100);
          const nx = (cx + Math.cos(angle) * 115);
          const ny = (cx + Math.sin(angle) * 115);
          return <line key={i} x1={mx} y1={my} x2={nx} y2={ny}
            stroke="rgba(140,100,22,0.28)" strokeWidth={1} />;
        })}

        {/* Central locking wheel */}
        <circle cx={cx} cy={cx} r={52} fill="#071428" stroke="url(#gm)" strokeWidth={3} />
        <circle cx={cx} cy={cx} r={48} fill="none" stroke="rgba(100,70,12,0.3)" strokeWidth={1} />

        {/* Wheel spokes — spin on unlock */}
        <g style={{
          transformOrigin: `${cx}px ${cx}px`,
          transform: retracted ? 'rotate(300deg)' : 'rotate(0deg)',
          transition: 'transform 1.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const r = (deg * Math.PI) / 180;
            return (
              <line key={i}
                x1={cx + Math.cos(r) * 13} y1={cx + Math.sin(r) * 13}
                x2={cx + Math.cos(r) * 44} y2={cx + Math.sin(r) * 44}
                stroke="url(#gm)" strokeWidth={2.5} strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Hub glow when unlocking */}
        {retracted && (
          <circle cx={cx} cy={cx} r={52} fill="url(#hubGlow)" />
        )}

        {/* Center hub */}
        <circle cx={cx} cy={cx} r={13} fill="#0a1830" stroke="url(#gm)" strokeWidth={2} />
        <circle cx={cx} cy={cx} r={5.5} fill="url(#gm)" />

        {/* Scan lines — decorative horizontal hatching */}
        {[-60, -40, -20, 0, 20, 40, 60].map((dy, i) => (
          <line key={i}
            x1={cx - 85} y1={cx + dy} x2={cx + 85} y2={cx + dy}
            stroke="rgba(26,50,100,0.18)" strokeWidth={0.5}
            clipPath={`circle(${85}px at ${cx}px ${cx}px)`}
          />
        ))}
      </svg>

      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.3em',
        color: retracted ? '#c9a84c' : 'rgba(140,100,25,0.45)',
        transition: 'color 0.4s',
        textTransform: 'uppercase',
      }}>
        {phase === 'locked' ? 'SECURE VAULT' : 'UNLOCKING…'}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setCrusher } = useCrusher();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [phase, setPhase] = useState<VaultPhase>('locked');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`).catch(() => {});
    const t1 = setTimeout(() => setPhase('unlocking'), 500);
    const t2 = setTimeout(() => setPhase('swinging'), 2000);
    const t3 = setTimeout(() => setPhase('open'), 2950);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
        } catch {
          // Crusher fetch failed — proceed to dashboard
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

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: 'rgba(4, 10, 22, 0.85)',
    border: focusedField === field
      ? '1px solid rgba(170,128,28,0.75)'
      : '1px solid rgba(110,78,14,0.45)',
    borderRadius: 10,
    padding: '11px 14px 11px 40px',
    fontSize: 14,
    color: '#dde6f4',
    outline: 'none',
    boxShadow: focusedField === field
      ? '0 0 0 1px rgba(160,118,24,0.35), 0 0 10px rgba(140,100,18,0.12), inset 0 1px 0 rgba(160,118,24,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: 'linear-gradient(175deg, #111418 0%, #161c24 50%, #111418 100%)',
    }}>
      <style>{`
        @keyframes vaultSwing {
          0%   { transform: perspective(1400px) rotateY(0deg);    opacity: 1; }
          70%  { transform: perspective(1400px) rotateY(-88deg);  opacity: 0.6; }
          100% { transform: perspective(1400px) rotateY(-108deg); opacity: 0; }
        }
        @keyframes formReveal {
          from { opacity: 0; transform: translateX(16px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
        @keyframes vaultGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(140,100,18,0.18), 0 0 0 1px rgba(140,100,18,0.35); }
          50%       { box-shadow: 0 0 28px rgba(160,118,24,0.28), 0 0 0 1px rgba(160,118,24,0.5); }
        }
      `}</style>

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

        {/* Logo + branding — centred upper block */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 20,
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
        </div>

        {/* Features + stats — bottom block */}
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
      </div>

      {/* ── Right panel — vault + form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Vault door overlay */}
        {phase !== 'open' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(160deg, #091526 0%, #0b1d38 50%, #06101e 100%)',
            transformOrigin: 'left center',
            animation: phase === 'swinging'
              ? 'vaultSwing 0.95s cubic-bezier(0.55,0,0.4,1) forwards'
              : undefined,
            zIndex: 20,
          }}>
            <VaultFace phase={phase} />
          </div>
        )}

        {/* Login form */}
        <div style={{
          width: '100%', maxWidth: 400,
          animation: phase === 'open' ? 'formReveal 0.55s cubic-bezier(0.2,0,0.2,1) forwards' : undefined,
          opacity: phase === 'open' ? 1 : 0,
        }}>
          <div style={{
            borderRadius: 20,
            padding: '32px 28px',
            background: 'linear-gradient(175deg, #0f2048 0%, #0a1830 55%, #071228 100%)',
            border: '1.5px solid rgba(130,92,16,0.55)',
            boxShadow: [
              '0 0 0 1px rgba(110,76,12,0.18)',
              '0 0 28px rgba(120,86,14,0.18)',
              '0 24px 64px rgba(0,0,0,0.65)',
              'inset 0 1px 0 rgba(160,118,24,0.12)',
              'inset 0 -1px 0 rgba(0,0,20,0.5)',
            ].join(', '),
            animation: phase === 'open' ? 'vaultGlow 3s ease-in-out 0.6s infinite' : undefined,
          }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
                color: '#e8edf8', margin: 0,
              }}>Welcome back</h2>
              <p style={{ fontSize: 12, marginTop: 6, color: 'rgba(180,200,230,0.5)', fontWeight: 500 }}>
                Sign in to your workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', color: 'rgba(180,200,230,0.6)',
                  marginBottom: 7, textTransform: 'uppercase',
                }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: focusedField === 'email' ? 'rgba(180,132,28,0.7)' : 'rgba(160,180,220,0.35)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('email')}
                    placeholder="admin@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', color: 'rgba(180,200,230,0.6)',
                  marginBottom: 7, textTransform: 'uppercase',
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{
                    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: focusedField === 'password' ? 'rgba(180,132,28,0.7)' : 'rgba(160,180,220,0.35)',
                    transition: 'color 0.2s',
                  }} />
                  <input
                    type="password" required value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('password')}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit button — matte unpolished gold */}
              <div style={{ marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: '1px solid rgba(110,76,12,0.7)',
                    background: loading
                      ? 'linear-gradient(160deg, #4a3008 0%, #5a3a0a 100%)'
                      : 'linear-gradient(160deg, #6a4808 0%, #8a5e12 35%, #7a5010 65%, #5a3808 100%)',
                    color: loading ? 'rgba(180,132,28,0.5)' : '#d4a838',
                    fontSize: 14, fontWeight: 700, letterSpacing: '0.06em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : [
                      'inset 0 1px 0 rgba(180,130,30,0.25)',
                      'inset 0 -1px 0 rgba(0,0,0,0.4)',
                      '0 2px 8px rgba(0,0,0,0.4)',
                    ].join(', '),
                    transition: 'all 0.2s',
                  }}
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in…</>
                    : <>Sign In <ArrowRight size={15} /></>}
                </button>

                {loading && (
                  <div style={{
                    height: 2, borderRadius: 1, marginTop: 8,
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: '60%', borderRadius: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(200,155,30,0.6), transparent)',
                      animation: 'shimmer 1.2s infinite',
                    }} />
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: 28, paddingTop: 18,
              borderTop: '1px solid rgba(110,76,12,0.25)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: 'rgba(160,180,220,0.28)', letterSpacing: '0.08em' }}>
                BlueMetal Pro · Quarry & Stone Crushing ERP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
