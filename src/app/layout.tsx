import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Eurodesign Pro - Plateforme B2B',
  description: 'Plateforme B2B dédiée aux professionnels du mobilier et de l\'agencement',
  icons: {
    icon: '/images/logo/Logo_E_eurodesign.ico',
    shortcut: '/images/logo/Logo_E_eurodesign.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
