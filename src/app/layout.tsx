import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/toaster';
import {AuthProvider} from '@/contexts/auth-context';
import {PointerEventsGuard} from '@/components/pointer-events-guard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tracker App',
  description: 'Employee and task tracking application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <PointerEventsGuard />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
