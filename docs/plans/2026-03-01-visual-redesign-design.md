# Visual Redesign — Design Document

**Date:** 2026-03-01
**Scope:** Full UI visual redesign (no feature changes)
**Approach:** Design system first — redefine CSS tokens, then apply everywhere

---

## Context

The current UI is a default shadcn/Tailwind boilerplate. The goal is a distinctive, minimalist-with-style aesthetic suited to a literary writing app that will eventually support AI features (à la NovelCrafter).

---

## Design Principles

- **Minimal but with character** — whitespace-first, no visual clutter, but every element has intentional style
- **Literary warmth** — warm tones over cold blues/grays; feels like a writer's studio, not a SaaS dashboard
- **AI-ready** — layout and color system flexible enough to accommodate future AI panels/sidebars
- **Dual mode** — dark and light modes with the same identity, just different palette values

---

## Section 1: Color Palette

Replace the current cold white + generic purple with a warm amber-accented palette.

### Light Mode

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `36 20% 97%` | Warm cream, not pure white |
| `--foreground` | `25 15% 12%` | Warm near-black (not blue-black) |
| `--card` | `36 15% 94%` | Slightly darker than background |
| `--card-foreground` | `25 15% 12%` | Same as foreground |
| `--primary` | `33 90% 48%` | Amber/gold — the signature accent |
| `--primary-foreground` | `25 15% 8%` | Dark text on amber |
| `--secondary` | `36 10% 90%` | Subtle warm gray |
| `--secondary-foreground` | `25 15% 20%` | |
| `--muted` | `36 10% 88%` | |
| `--muted-foreground` | `25 10% 45%` | |
| `--accent` | `33 60% 92%` | Soft amber tint for hover states |
| `--accent-foreground` | `25 15% 12%` | |
| `--border` | `36 12% 86%` | Subtle warm border |
| `--input` | `36 12% 86%` | |
| `--ring` | `33 90% 48%` | Amber focus ring |
| `--destructive` | `0 84% 60%` | |
| `--destructive-foreground` | `0 0% 98%` | |

### Dark Mode

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `25 12% 9%` | Warm charcoal, not cold blue-black |
| `--foreground` | `36 20% 92%` | Warm off-white |
| `--card` | `25 10% 13%` | |
| `--card-foreground` | `36 20% 92%` | |
| `--primary` | `33 85% 55%` | Amber slightly brighter on dark |
| `--primary-foreground` | `25 15% 8%` | |
| `--secondary` | `25 8% 17%` | |
| `--secondary-foreground` | `36 20% 92%` | |
| `--muted` | `25 8% 17%` | |
| `--muted-foreground` | `36 10% 55%` | |
| `--accent` | `25 8% 17%` | |
| `--accent-foreground` | `36 20% 92%` | |
| `--border` | `25 8% 20%` | |
| `--input` | `25 8% 20%` | |
| `--ring` | `33 85% 55%` | |
| `--destructive` | `0 62% 30%` | |
| `--destructive-foreground` | `0 0% 98%` | |

---

## Section 2: Typography

Replace system font fallbacks with real Google Fonts.

| Role | Font | Tailwind class | Used for |
|------|------|---------------|---------|
| Headings | Playfair Display | `font-headline` | Project names, chapter titles, h1–h3 |
| UI / Body | Inter | `font-body` | Navigation, buttons, labels, body text |
| Editor prose | Lora | `font-serif` | Scene editor text content only |

### Font scale examples

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Project name | Playfair Display | 2xl | 500 |
| Section heading | Playfair Display | xl | 500 |
| Navigation item | Inter | sm | 400 |
| Button label | Inter | sm | 500 |
| Editor text | Lora | base/lg | 400 |

### Implementation

Load via `next/font/google` in `layout.tsx`, expose as CSS variables, wire into Tailwind config (already has the right `fontFamily` structure).

---

## Section 3: Spacing, Radius & Ambiance

### Border radius

```
--radius: 0.375rem  (reduced from 0.5rem)
```

Slightly less rounded = more editorial, less generic app feel.

### Spacing philosophy

- More internal padding in components — elements breathe
- Visual separation by whitespace, not heavy borders
- Consistent use of Tailwind spacing scale (no magic numbers)

### Shadows

Warm-tinted shadows instead of neutral gray:

```css
/* Light mode */
box-shadow: 0 2px 8px hsl(25 12% 9% / 0.08);

/* Dark mode */
box-shadow: 0 2px 8px hsl(25 12% 4% / 0.4);
```

### Interactive states

- Hover transitions: 150ms ease
- Active/selected: amber accent as indicator
- No flash or jarring color jumps

### Sidebar / navigation

- Background slightly distinct from main background (not identical, not high contrast)
- Subtle right border
- Feel: writer's studio panel, not a utility sidebar

---

## What This Is NOT

- No layout changes
- No new features
- No component library swap
- No changes to data layer or business logic

---

## Success Criteria

- The app no longer looks like a shadcn boilerplate
- Dark and light modes both feel intentional and cohesive
- Typography hierarchy is immediately readable
- The amber accent is consistently applied as the single action color
- All existing functionality works identically
