'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>BlueMetal Pro</title>
        <meta name="description" content="Quarry & Stone Crushing ERP" />
        <link rel="icon" href="/logo-icon.png" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#152e52',
                color: '#fff',
                border: '1px solid #263d5e',
                fontSize: '14px',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#c9a84c', secondary: '#152e52' } },
              error:   { iconTheme: { primary: '#f87171', secondary: '#152e52' } },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
