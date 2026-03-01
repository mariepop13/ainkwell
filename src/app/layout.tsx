import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Inter, Lora, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-merriweather',
});

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
      <body suppressHydrationWarning className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
