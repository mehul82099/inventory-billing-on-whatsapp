import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sri Balaji Mobile Billing & Inventory',
  description: 'AI-Powered Mobile Accessories Billing, Inventory & WhatsApp Invoicing',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MobileBilling',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
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
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration skipped or failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
