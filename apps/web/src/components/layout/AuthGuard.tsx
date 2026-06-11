'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_PATHS = ['/login', '/select-tenant', '/select-crusher'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    if (pathname.startsWith('/platform')) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.platform_admin) {
          router.replace('/dashboard');
        }
      } catch {
        router.replace('/dashboard');
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
