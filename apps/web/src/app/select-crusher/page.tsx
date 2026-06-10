'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { selectCrusher } from '@/lib/api';
import { useCrusher } from '@/contexts/CrusherContext';
import { log } from '@bluemetal/shared';
import { Factory, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import LogoIcon from '@/components/ui/LogoIcon';

export default function SelectCrusherPage() {
  const router = useRouter();
  const { setCrusher } = useCrusher();
  const [crushers, setCrushers] = useState<any[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);

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
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.removeItem('crushers_list');
      setCrusher(data.crusher);
      log.action('Crusher selected', { name: c.name });
      router.push('/dashboard');
    } catch (err) {
      setSelecting(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #111418 0%, #161c24 50%, #111418 100%)' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4"
            style={{ filter: 'drop-shadow(0 6px 18px rgba(180,140,20,0.5))' }}>
            <LogoIcon size={100} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Select Your Plant</h1>
          <p className="text-white/50 text-sm">Choose the crushing plant you want to manage</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {crushers.map((c) => (
            <button key={c.id} onClick={() => handleSelect(c)} disabled={!!selecting}
              className="w-full card-gold flex items-center gap-4 p-5 text-left transition-all hover:scale-[1.01] disabled:opacity-50">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.name} className="w-10 h-10 object-contain rounded-lg" />
                  : <span className="text-gold text-lg font-bold">{c.name.charAt(0)}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base truncate">{c.name}</p>
                {(c.city || c.state) && (
                  <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {[c.city, c.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {c.gstin && <p className="text-white/30 text-xs mt-0.5">GSTIN: {c.gstin}</p>}
                <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1.5"
                  style={{ background: 'rgba(37,99,168,0.2)', color: '#93c5fd' }}>
                  {c.role || 'member'}
                </span>
              </div>
              <div className="flex-shrink-0">
                {selecting === c.id
                  ? <Loader2 size={18} className="animate-spin text-gold" />
                  : <ChevronRight size={18} className="text-white/30" />
                }
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
