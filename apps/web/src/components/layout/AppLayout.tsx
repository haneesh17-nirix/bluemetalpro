'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function AppLayout({ title, subtitle, actions, children, noPadding }: AppLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    if (user?.role === 'platform_admin') {
      router.replace('/platform');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title={title} subtitle={subtitle} actions={actions} />
        <main
          style={{ flex: 1, overflowY: 'auto', padding: noPadding ? 0 : '24px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
