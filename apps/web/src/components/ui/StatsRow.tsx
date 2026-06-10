import { ElementType } from 'react';

interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  color: string;
}

export default function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 16 }}>
      {stats.map((s, i) => (
        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${s.color}18`, border: `1px solid ${s.color}30`,
          }}>
            <s.icon size={18} style={{ color: s.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: 'rgba(200,212,232,0.6)' }}>{s.label}</p>
            {s.sub && <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(200,212,232,0.35)' }}>{s.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
