'use client';
import { Bell } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{
        borderBottom: '1px solid #1f3659',
        background: 'rgba(9,22,40,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white leading-none tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(200,212,232,0.55)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #2a4570' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
        >
          <Bell size={16} style={{ color: 'rgba(200,212,232,0.7)' }} />
          {/* Dot indicator */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
            style={{ background: '#e8c96a', borderColor: '#091628' }}
          />
        </button>

        {/* Page-level action buttons (e.g. "New Sale") */}
        {actions}
      </div>
    </header>
  );
}
