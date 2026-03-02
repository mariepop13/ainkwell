---
name: OSS Local-First (No Firebase)
overview: Strip Firebase from the Next.js starter and replace with a pure local-first baseline using localStorage — zero cloud dependency, zero account required.
status: done
merged: "2026-02-25"
pr: 1
todos:
  - id: 1
    content: "Remove Firebase runtime and dependency from package.json"
    status: done
    dependencies: []
  - id: 2
    content: "Delete Firebase client provider and config files"
    status: done
    dependencies: [1]
  - id: 3
    content: "Update layout.tsx and page.tsx to remove Firebase references"
    status: done
    dependencies: [2]
  - id: 4
    content: "Update .gitignore and .env.example for local-first setup"
    status: done
    dependencies: []
  - id: 5
    content: "Update README to document local-first OSS baseline"
    status: done
    dependencies: []
---

# OSS Local-First (No Firebase) — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #1).

**Goal:** Start from a Firebase-based Next.js starter and strip it down to a clean local-first OSS baseline. No cloud, no account, no environment variables required to run.

## Context

The project started from a Next.js + Firebase starter template. Firebase was entirely replaced by `localStorage` as the persistence layer. This was the foundational decision that makes Ainkwell local-first by default.

## Files Changed

| Action | Path |
|--------|------|
| Delete | `src/firebase/client-provider.tsx` |
| Modify | `package.json` — remove firebase dependency |
| Modify | `package-lock.json` — ~980 lines removed |
| Modify | `src/app/layout.tsx` |
| Modify | `src/app/page.tsx` |
| Modify | `.env.example` |
| Modify | `.gitignore` |
| Modify | `README.md` |

## Key Decision

**localStorage over Firebase** — The app is designed for writers who want full ownership of their data. No account, no internet, no vendor lock-in. All data lives in the browser's localStorage. This decision shaped the entire architecture: all repositories are `Local*Repository` implementations, all pages are `'use client'` components.
