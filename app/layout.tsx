import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Focus Teleprompter — Adaptive AI Teleprompter',
  description: "Don't make humans follow the teleprompter. Make the teleprompter follow humans. Adaptive mobile teleprompter with voice tracking, auto-pacing, and smart chunking.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-blue-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
