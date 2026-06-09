'use client';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [search, setSearch] = useState('');

  return (
    <header className="flex items-center justify-between px-8 py-4 flex-shrink-0"
      style={{ borderBottom: '1px solid #1e4270', background: 'rgba(14,37,68,0.6)', backdropFilter: 'blur(8px)' }}>
      <div>
        <h1 className="text-xl font-bold text-white leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-white/45 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 py-2 text-xs w-52"
            placeholder="Quick search…"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-white/6 border border-surface-border hover:bg-white/10 flex items-center justify-center transition-colors">
          <Bell size={16} className="text-white/60" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-light border-2 border-brand" />
        </button>

        {/* Page actions */}
        {actions}
      </div>
    </header>
  );
}
