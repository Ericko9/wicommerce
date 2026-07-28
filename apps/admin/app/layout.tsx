import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UCP Admin Panel',
  description: 'Tenant & Platform Management Dashboard',
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
