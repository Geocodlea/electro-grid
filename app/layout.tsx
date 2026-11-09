import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ElectroGrid MT — Localizare și Navigație Medie Tensiune',
  description:
    'Aplicație dedicată consultării și localizării echipamentelor din rețelele electrice de medie tensiune (20 kV)',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#123b57',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-grid-lightBg antialiased selection:bg-sky-200">
        {children}
      </body>
    </html>
  );
}

