import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UMKM Storefront',
  description: 'Multi-tenant store for customer shopping',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
