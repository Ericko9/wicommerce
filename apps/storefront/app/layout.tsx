import './globals.css';
import React from 'react';
import { ReactQueryProvider } from '../providers/query-provider';
import { StorefrontHeader } from '../components/header';
import { StorefrontFooter } from '../components/footer';

export const metadata = {
  title: 'Storefront - Toko UMKM Online',
  description: 'Belanja produk berkualitas langsung dari toko UMKM terpercaya.',
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
      <body className="flex flex-col min-h-screen">
        <ReactQueryProvider>
          <StorefrontHeader />
          <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">{children}</main>
          <StorefrontFooter />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
