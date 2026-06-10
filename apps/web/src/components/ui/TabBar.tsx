interface Tab { key: string; label: string; count?: number; }
interface Props { tabs: Tab[]; active: string; onChange: (k: string) => void; }

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div style={{
      display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12,
      background: 'rgba(6,15,32,0.6)', border: '1px solid rgba(30,52,88,0.8)',
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 9,
          fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
          ...(active === t.key
            ? { background: 'linear-gradient(160deg, #172d54, #142849)', color: '#d4aa52', border: '1px solid rgba(184,149,62,0.25)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
            : { background: 'transparent', color: 'rgba(200,212,232,0.55)', border: '1px solid transparent' }
          ),
        }}>
          {t.label}
          {t.count !== undefined && (
            <span style={{
              padding: '2px 6px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: active === t.key ? 'rgba(184,149,62,0.2)' : 'rgba(255,255,255,0.08)',
              color: active === t.key ? '#c9a84c' : 'rgba(200,212,232,0.5)',
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
