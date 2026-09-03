import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://glassweb.cae1.chatgpt.site';
const title = 'GlassWeb — understand any website without reading code';
const description =
  'Click anything on a website. GlassWeb explains what happened, where the data went, and what AI might miss — in plain English.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: 'GlassWeb',
  openGraph: {
    type: 'website',
    siteName: 'GlassWeb',
    title,
    description,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'GlassWeb — See the system behind the screen.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
