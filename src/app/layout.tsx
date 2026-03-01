import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Inter, Lora, Playfair_Display } from 'next/font/google';
import { ThemeToggle } from '@/components/theme-toggle';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
});

const themeScript = `(function(){var storedTheme=localStorage.getItem('ainkwell:theme');var prefersDark=window.matchMedia('(prefers-color-scheme:dark)').matches;if(storedTheme==='dark'||(storedTheme!=='light'&&prefersDark)){document.documentElement.classList.add('dark')}})()`;

export const metadata: Metadata = {
  title: 'Ainkwell',
  description: 'Open-source local-first writing app starter with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfairDisplay.variable} ${lora.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="font-body antialiased">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
