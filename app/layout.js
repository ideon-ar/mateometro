import './globals.css';
import { Background } from '@/components/Art';
import { PrefsProvider, noFlashScript } from '@/lib/prefs';

export const metadata = {
  title: 'mateometro',
  description: 'Quién se demora más devolviendo el mate 🧉',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0e0d' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Geist:wght@400..700&family=Geist+Mono:wght@300..500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PrefsProvider>
          <Background />
          {children}
        </PrefsProvider>
      </body>
    </html>
  );
}
