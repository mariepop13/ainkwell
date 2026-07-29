# Ainkwell

Ainkwell is a local-first writing workspace built with Next.js 15, TypeScript, and Tailwind CSS. It supports planning, drafting, story reference material, writing goals, and project exports without requiring an account or cloud database.

## Features

- Local project, chapter, and scene management
- Outline canvas with scene ordering and inline editing
- Story bible with entities, relationships, tags, and scene links
- Writing goals, session tracking, and manuscript views
- JSON backups and Markdown manuscript exports
- Optional OpenRouter model selection and AI-assisted scene drafts
- Dark and light themes
- Vitest, Testing Library, ESLint, TypeScript, and GitHub Actions quality checks

## Local-first behavior and data safety

Ainkwell stores application data in the browser's `localStorage`. The main project key is `ainkwell.projects.v1`, with separate keys for story bible data, writing sessions, AI settings, and theme preferences.

No cloud account or server-side database is required. This also means browser storage is the primary copy of your work. Clearing site data, using a temporary browser profile, or losing access to the browser profile can permanently remove local projects. Export a JSON backup from each project's workspace regularly and store important backups outside the browser.

The OpenRouter API key is also stored in local browser storage. When an AI draft is requested, Ainkwell sends the scene outline, selected story context, model selection, and API key directly from the browser to OpenRouter. Core writing and planning features do not require OpenRouter.

## Getting started

### Prerequisites

- Node.js 20.x
- npm

The GitHub Actions workflows use the latest available Node.js 20.x release.

### Install and run

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/mariepop13/ainkwell.git
   cd ainkwell
   ```

2. Install the exact dependency versions from `package-lock.json`:

   ```bash
   npm ci
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), then go to `/workspace`.

### Environment file

Normal local development does not require environment variables. The repository includes `.env.local.example`, which currently documents an `OPENROUTER_TEST_KEY` placeholder for testing with a real key.

To create a local copy on macOS, Linux, WSL, or Git Bash:

```bash
cp .env.local.example .env.local
```

In PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Do not commit `.env.local` or real API keys. The application itself accepts and stores an OpenRouter key through the AI Settings interface.

## Quality checks

Run the repository quality commands before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

The combined CI-oriented command runs linting, type checking, and the test suite without coverage:

```bash
npm run test:ci
```

Coverage is available separately:

```bash
npm run test:coverage
```

Review all dependency advisories and the production dependency subset:

```bash
npm audit
npm audit --omit=dev
```

GitHub Actions runs:

- Lint in a dedicated required job
- Type checking and coverage tests in the test job
- A production build in the build job
- Dependency Review for pull requests to `main` and `develop`, failing on newly introduced high-severity vulnerabilities

### PowerShell and POSIX shells

The Vitest and production build scripts use POSIX-style inline environment variables. On Windows, run those scripts from Git Bash or WSL, or use their PowerShell equivalents.

Run the test suite once in PowerShell:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
npx vitest run
$env:NODE_OPTIONS=$null
```

Run a production build in PowerShell:

```powershell
$env:NODE_ENV='production'
npx next build
$env:NODE_ENV=$null
```

To reproduce `npm run test:ci` in PowerShell:

```powershell
npm run lint
npm run typecheck
$env:NODE_OPTIONS='--max-old-space-size=4096'
npx vitest run --reporter=verbose --no-coverage
$env:NODE_OPTIONS=$null
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server after a build. |
| `npm run lint` | Run ESLint. |
| `npm run lint:fix` | Apply ESLint fixes where available. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the test suite once. |
| `npm run test:watch` | Run Vitest explicitly in watch mode. |
| `npm run test:coverage` | Run tests and collect coverage. |
| `npm run test:ui` | Open the Vitest UI. |
| `npm run test:ci` | Run lint, typecheck, and tests once without coverage. |

## Project structure

```text
src/
├── app/             # Next.js App Router pages and layouts
├── application/     # Use cases and application services
├── components/      # React components grouped by feature
├── context/         # Shared React contexts
├── data/            # Local repository implementations
├── domain/          # Types, schemas, and repository contracts
├── hooks/           # Reusable state and runtime hooks
├── lib/             # Shared browser and development utilities
└── test/            # Vitest and Testing Library tests

docs/
└── plans/           # Implementation plans and architectural history
```

The application follows the existing layered flow:

```text
domain -> application -> data -> components -> app
```

Domain boundaries are validated with Zod. Data repositories persist to `localStorage`, and UI components compose behavior through application services.

## Contributing

1. Create a `feature/*` or `bugfix/*` branch from `develop`.
2. Keep changes focused and update documentation when commands or behavior change.
3. Install dependencies with `npm ci`.
4. Run `npm run test:ci` and `npm run build`, using the PowerShell equivalents above when needed.
5. Follow the repository's Gitmoji commit convention.
6. Open a pull request targeting `develop`.

## License

No license file is currently included in the repository, so Ainkwell does not yet declare an open-source license.
