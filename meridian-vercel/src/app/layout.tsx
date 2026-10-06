import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: { default: 'Meridian · Healthcare & Inventory', template: '%s · Meridian' },
  description: 'Meridian — hospital healthcare and pharmacy inventory management system',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};
export const viewport: Viewport = { themeColor: '#005944' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
