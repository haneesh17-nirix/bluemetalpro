interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (k: string) => void;
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl w-fit"
      style={{ background: '#111e35', border: '1px solid #1f3659' }}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={
            active === t.key
              ? {
                  background: '#162c52',
                  color: '#e8c96a',
                  border: '1px solid rgba(201,168,76,0.25)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }
              : { color: 'rgba(200,212,232,0.55)', border: '1px solid transparent' }
          }
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: active === t.key ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
                color: active === t.key ? '#e8c96a' : 'rgba(200,212,232,0.5)',
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
