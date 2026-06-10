import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Icon size={28} style={{ color: 'rgba(200,212,232,0.25)' }} />
      </div>
      <p className="text-base font-semibold text-white/70">{title}</p>
      {description && (
        <p className="text-sm text-white/35 text-center max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
