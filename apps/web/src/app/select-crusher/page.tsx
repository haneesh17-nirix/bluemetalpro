'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { selectCrusher } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { log } from '@bluemetal/shared';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

export default function SelectCrusherPage() {
  const router = useRouter();
  const { setCrusher } = useCrusher();
  const [crushers, setCrushers] = useState<any[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    log.page('SelectCrusher');
    const stored = localStorage.getItem('crushers_list');
    if (stored) setCrushers(JSON.parse(stored));
    else router.push('/login');
  }, []);

  const handleSelect = async (c: any) => {
    setSelecting(c.id);
    try {
      const data = await selectCrusher(c.id);
      localStorage.removeItem('temp_token');
      localStorage.setItem('token', data.token);
      document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.removeItem('crushers_list');
      setCrusher(data.crusher);
      log.action('Crusher selected', { name: c.name });
      router.push('/dashboard');
    } catch (err) {
      log.error('Crusher selection failed', err instanceof Error ? err.message : String(err));
      toast.error('Failed to select plant. Please try again.');
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
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16,
            filter: 'drop-shadow(0 6px 20px rgba(160,112,20,0.5))' }}>
            <LogoIcon size={80} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Select Plant
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(180,200,230,0.45)', margin: 0 }}>
            Choose the crushing plant to manage
          </p>
        </div>

        {/* Crusher tiles grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: crushers.length <= 2 ? `repeat(${crushers.length}, 1fr)` : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {crushers.map((c, i) => {
            const isSelecting = selecting === c.id;
            const isHovered = hovered === c.id;
            const isDisabled = !!selecting;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                disabled={isDisabled}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '14px 10px',
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
                  gap: 8,
                  transition: 'all 0.18s ease',
                  animation: `tileIn 0.3s ease ${i * 60}ms both`,
                  minHeight: 80,
                }}
              >
                {isSelecting ? (
                  <Loader2 size={18} style={{ color: '#c9a84c', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: isHovered
                      ? 'rgba(180,135,28,0.18)'
                      : 'rgba(140,100,18,0.12)',
                    border: isHovered
                      ? '1px solid rgba(160,118,24,0.4)'
                      : '1px solid rgba(120,86,14,0.25)',
                    transition: 'all 0.18s ease',
                  }}>
                    {c.logo_url
                      ? <img src={c.logo_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 6 }} />
                      : <span style={{ fontSize: 14, fontWeight: 800, color: '#c9a84c', lineHeight: 1 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                    }
                  </div>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isHovered ? '#e8d898' : 'rgba(210,220,240,0.85)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                  transition: 'color 0.18s ease',
                }}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
