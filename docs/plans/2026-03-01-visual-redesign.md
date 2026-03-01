# Visual Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic shadcn boilerplate look with a warm, literary aesthetic — amber accent, cream/charcoal palette, Playfair Display + Inter + Lora typography, dark/light mode toggle.

**Architecture:** Pure CSS token changes + font swap + one new client component for the theme toggle. No layout, logic, or data changes. The existing Tailwind CSS variable system (shadcn-style) is already set up correctly — we only redefine values.

**Tech Stack:** Next.js 15, Tailwind CSS v3, `next/font/google`, CSS custom properties

---

## Task 1: Load Google Fonts via next/font/google

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Replace the layout with font imports**

Replace the entire content of `src/app/layout.tsx` with:

```tsx
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
```

> Note: We reuse the existing CSS variable names (`--font-inter`, `--font-space-grotesk`, `--font-merriweather`) so Tailwind config needs no changes. The variable names are misleading after this change but functionally correct — the font families are what matter.

**Step 2: Verify no TypeScript errors**

```bash
npm run typecheck
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "✨ feat: swap fonts to Playfair Display, Inter, Lora via next/font/google"
```

---

## Task 2: Redesign CSS tokens (palette + radius)

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the `:root` and `.dark` blocks**

In `src/app/globals.css`, replace the entire `@layer base { :root { ... } .dark { ... } }` block and the body/heading styles with:

```css
@layer base {
  :root {
    --font-inter: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', arial, sans-serif;
    --font-space-grotesk: 'Trebuchet MS', 'Avenir Next', 'Segoe UI', sans-serif;
    --font-merriweather: georgia, 'Times New Roman', serif;

    --background: 36 20% 97%;
    --foreground: 25 15% 12%;
    --card: 36 15% 94%;
    --card-foreground: 25 15% 12%;
    --popover: 36 20% 97%;
    --popover-foreground: 25 15% 12%;
    --primary: 33 90% 48%;
    --primary-foreground: 25 15% 8%;
    --secondary: 36 10% 90%;
    --secondary-foreground: 25 15% 20%;
    --muted: 36 10% 88%;
    --muted-foreground: 25 10% 45%;
    --accent: 33 60% 92%;
    --accent-foreground: 25 15% 12%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 36 12% 86%;
    --input: 36 12% 86%;
    --ring: 33 90% 48%;
    --radius: 0.375rem;
    --chart-1: 33 90% 48%;
    --chart-2: 160 60% 45%;
    --chart-3: 25 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }

  .dark {
    --background: 25 12% 9%;
    --foreground: 36 20% 92%;
    --card: 25 10% 13%;
    --card-foreground: 36 20% 92%;
    --popover: 25 12% 9%;
    --popover-foreground: 36 20% 92%;
    --primary: 33 85% 55%;
    --primary-foreground: 25 15% 8%;
    --secondary: 25 8% 17%;
    --secondary-foreground: 36 20% 92%;
    --muted: 25 8% 17%;
    --muted-foreground: 36 10% 55%;
    --accent: 25 8% 17%;
    --accent-foreground: 36 20% 92%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 25 8% 20%;
    --input: 25 8% 20%;
    --ring: 33 85% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-inter);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--font-space-grotesk);
  }
}
```

**Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "🎨 style: apply warm amber + literary palette and reduce border radius"
```

---

## Task 3: Add dark mode toggle

**Files:**
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create the theme toggle component**

Create `src/components/theme-toggle.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

const STORAGE_KEY = 'ainkwell:theme';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function toggleTheme(): void {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-4 right-4 z-50 rounded-full border border-border bg-card p-2 text-sm text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
```

**Step 2: Add ThemeToggle and flash-prevention script to layout**

Replace the entire content of `src/app/layout.tsx` with the following. The inline script (a static hardcoded string — no user input, no XSS risk) prevents flash of wrong theme before React hydrates, which is the standard Next.js pattern for this:

```tsx
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
  variable: '--font-space-grotesk',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-merriweather',
});

const themeScript = `(function(){var t=localStorage.getItem('ainkwell:theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark')}})()`;

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
```

**Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/components/theme-toggle.tsx src/app/layout.tsx
git commit -m "✨ feat: add dark/light mode toggle with localStorage persistence and flash prevention"
```

---

## Task 4: Quality gate

**Step 1: Run full CI check**

```bash
npm run test:ci
```

Expected: lint + typecheck + tests all pass

**Step 2: Visual verification**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- [ ] Background is warm cream (not white) in light mode
- [ ] Headings use Playfair Display (serif)
- [ ] Body text uses Inter
- [ ] Amber accent visible on buttons/primary elements
- [ ] Dark mode toggle button visible (bottom-right corner)
- [ ] Toggling dark mode: background goes warm charcoal, text goes off-white
- [ ] Refreshing the page preserves the theme choice
- [ ] No flash of wrong theme on page load

**Step 3: Push branch**

```bash
git push -u origin feature/visual-redesign
```
