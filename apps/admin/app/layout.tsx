import './globals.css';
import React from 'react';
import { ReactQueryProvider } from '../providers/query-provider';
import { AdminAppShell } from '../components/shell/app-shell';

export const metadata = {
  title: 'UMKM Platform - Admin Panel',
  description: 'Panel Manajemen Toko UMKM Modular Commerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ReactQueryProvider>
          <AdminAppShell>{children}</AdminAppShell>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
