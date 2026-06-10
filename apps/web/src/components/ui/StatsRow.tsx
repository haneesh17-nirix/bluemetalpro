import { ElementType } from 'react';

interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  color: string;
}

function isCostValue(v: string) {
  return v.includes('₹') || v.toLowerCase().startsWith('rs');
}

export default function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
      {stats.map((s, i) => {
        const cost = isCostValue(s.value);
        return (
          <div key={i} className={cost ? 'cost-tile' : 'gold-tile'}
            style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cost ? 'rgba(175,130,45,0.15)' : 'rgba(210,170,65,0.12)',
              border: `1px solid ${cost ? 'rgba(155,115,38,0.3)' : 'rgba(180,140,50,0.25)'}`,
            }}>
              <s.icon size={17} style={{ color: cost ? '#c9963a' : '#dbb84e' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 18, fontWeight: 700, lineHeight: 1,
                color: cost ? '#d4a84a' : '#e8c96a',
              }}>{s.value}</p>
              <p style={{
                fontSize: 10, marginTop: 5, fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: cost ? 'rgba(205,165,70,0.55)' : 'rgba(215,175,80,0.55)',
              }}>{s.label}</p>
              {s.sub && (
                <p style={{
                  fontSize: 10, marginTop: 2,
                  color: cost ? 'rgba(190,145,55,0.42)' : 'rgba(200,165,60,0.42)',
                }}>{s.sub}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
