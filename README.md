# Ainkwell

Base project aligned with the `mivoa` stack:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui conventions
- Firebase (client placeholders)
- Vitest + Testing Library
- GitHub Actions + CodeRabbit

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill Firebase placeholders in `.env.local`.

4. Start dev server:

```bash
npm run dev
```

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
```
