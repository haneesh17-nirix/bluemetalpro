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
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}
    >
      {stats.map((s, i) => (
        <div key={i} className="card flex items-center gap-4 px-5 py-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${s.color}20`, border: `1px solid ${s.color}35` }}
          >
            <s.icon size={18} style={{ color: s.color }} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{s.value}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(200,212,232,0.6)' }}>
              {s.label}
            </p>
            {s.sub && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(200,212,232,0.35)' }}>
                {s.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
