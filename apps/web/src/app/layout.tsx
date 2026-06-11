'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { CrusherProvider } from '@/contexts/CrusherContext';
import AuthGuard from '@/components/layout/AuthGuard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <title>BlueMetal Pro</title>
        <meta name="description" content="Quarry & Stone Crushing ERP" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0e2544" />
        <link rel="icon" href="/logo-icon.png" type="image/png" />
        {/* Preconnect for Google Fonts speed */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="h-full">
        <QueryClientProvider client={queryClient}>
          <CrusherProvider>
            <AuthGuard>
            {children}
            </AuthGuard>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#111e32',
                  color: '#f0f4ff',
                  border: '1px solid rgba(26,53,112,0.7)',
                  fontSize: '14px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                },
                success: { iconTheme: { primary: '#e8c96a', secondary: '#1a3460' } },
                error:   { iconTheme: { primary: '#f87171', secondary: '#1a3460' } },
              }}
            />
          </CrusherProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
