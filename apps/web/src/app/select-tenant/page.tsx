'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { selectTenant, selectCrusher } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { log } from '@bluemetal/shared';
import { Loader2, Building2 } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

export default function SelectTenantPage() {
  const router = useRouter();
  const { setTenant, setCrusher } = useCrusher();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    log.page('SelectTenant');
    const stored = localStorage.getItem('tenants_list');
    if (stored) setTenants(JSON.parse(stored));
    else router.push('/login');
  }, []);

  const handleSelect = async (t: any) => {
    setSelecting(t.id);
    try {
      const data = await selectTenant(t.id);
      localStorage.setItem('token', data.temp_token);
      setTenant(data.tenant);
      localStorage.removeItem('tenants_list');

      const crushers: any[] = data.crushers ?? [];
      const unique = crushers.filter((c: any, i: number, a: any[]) => a.findIndex((x: any) => x.id === c.id) === i);

      if (unique.length === 1) {
        const sel = await selectCrusher(unique[0].id);
        localStorage.setItem('token', sel.token);
        localStorage.setItem('user', JSON.stringify(sel.user));
        setCrusher(sel.crusher);
        log.action('Auto-selected single crusher', { name: unique[0].name });
        router.push('/dashboard');
      } else {
        localStorage.setItem('crushers_list', JSON.stringify(unique));
        router.push('/select-crusher');
      }
    } catch {
      setSelecting(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(160deg, #111418 0%, #161c24 50%, #111418 100%)',
    }}>
      <style>{`
        @keyframes tileIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 540 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16,
            filter: 'drop-shadow(0 6px 20px rgba(160,112,20,0.5))' }}>
            <LogoIcon size={80} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Select Company
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(180,200,230,0.45)', margin: 0 }}>
            Choose the company you want to access
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: tenants.length <= 2 ? `repeat(${tenants.length}, 1fr)` : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {tenants.map((t, i) => {
            const isSelecting = selecting === t.id;
            const isHovered = hovered === t.id;
            const isDisabled = !!selecting;
            return (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                disabled={isDisabled}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '18px 14px',
                  borderRadius: 14,
                  border: isHovered && !isDisabled
                    ? '1px solid rgba(160,118,24,0.65)'
                    : '1px solid rgba(100,72,12,0.4)',
                  background: isHovered && !isDisabled
                    ? 'linear-gradient(160deg, #122040 0%, #0e1a34 100%)'
                    : 'linear-gradient(160deg, #0d1830 0%, #0a1428 100%)',
                  boxShadow: isHovered && !isDisabled
                    ? '0 0 0 1px rgba(140,100,18,0.2), 0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(160,118,24,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled && !isSelecting ? 0.5 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'all 0.18s ease',
                  animation: `tileIn 0.3s ease ${i * 60}ms both`,
                  minHeight: 100,
                }}
              >
                {isSelecting ? (
                  <Loader2 size={20} style={{ color: '#c9a84c', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isHovered ? 'rgba(180,135,28,0.18)' : 'rgba(140,100,18,0.12)',
                    border: isHovered ? '1px solid rgba(160,118,24,0.4)' : '1px solid rgba(120,86,14,0.25)',
                    transition: 'all 0.18s ease',
                  }}>
                    {t.logo_url
                      ? <img src={t.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                      : <Building2 size={18} style={{ color: '#c9a84c' }} />
                    }
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: isHovered ? '#e8d898' : 'rgba(210,220,240,0.9)',
                    lineHeight: 1.3, transition: 'color 0.18s ease',
                  }}>
                    {t.name}
                  </div>
                  {t.crusher_count > 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(180,200,230,0.4)', marginTop: 4 }}>
                      {t.crusher_count} {t.crusher_count === 1 ? 'plant' : 'plants'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
