---
name: Writing Goals & Sessions
overview: Track writing sessions with a live timer, set daily word count goals, visualize progress with streaks and a weekly chart, and integrate the session timer into the scene editor.
status: done
merged: "2026-02-28"
pr: 7
todos:
  - id: 1
    content: "Define WritingSession and DailyGoal domain types with Zod schemas"
    status: done
    dependencies: []
  - id: 2
    content: "Define WritingSessionRepository interface"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement LocalWritingSessionRepository persisting to localStorage"
    status: done
    dependencies: [2]
  - id: 4
    content: "Implement WritingSessionService with start/end session, goal, and dashboard logic"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build useWritingSession hook with live timer and word delta tracking"
    status: done
    dependencies: [4]
  - id: 6
    content: "Build writing session UI components (timer, goal form, progress, chart, history)"
    status: done
    dependencies: [5]
  - id: 7
    content: "Add /workspace/[projectId]/goals page route"
    status: done
    dependencies: [6]
  - id: 8
    content: "Integrate session timer into scene editor shell"
    status: done
    dependencies: [5]
  - id: 9
    content: "Write tests for domain, service, repository, hook, and goals page"
    status: done
    dependencies: [7]
---

# Writing Goals & Sessions — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #7).

**Goal:** Writers can start/stop timed writing sessions, set a daily word count goal, and see their progress through streaks, a weekly chart, and session history — all persisted locally.

## Architecture

New vertical slice following the layered architecture:
- `domain/writing-session/` — `WritingSession`, `DailyGoal`, `SessionsDashboard` types + `WritingSessionRepository` interface
- `data/writing-session/local-writing-session-repository.ts` — localStorage at `ainkwell:projects:{id}:sessions:v1`
- `application/writing-session/writing-session-service.ts` — business logic: streak calculation, weekly summary, dashboard aggregation
- `hooks/use-writing-session.ts` + `use-writing-session-runtime.ts` — live timer with 1-second tick interval
- `components/writing-session/` — UI components
- `app/workspace/[projectId]/goals/page.tsx` — goals page

## Files Changed

| Action | Path |
|--------|------|
| Create | `src/domain/writing-session/` (types, repository interface) |
| Create | `src/data/writing-session/local-writing-session-repository.ts` |
| Create | `src/application/writing-session/writing-session-service.ts` |
| Create | `src/hooks/use-writing-session.ts` |
| Create | `src/hooks/use-writing-session-runtime.ts` |
| Create | `src/components/writing-session/goals-page-client.tsx` |
| Create | `src/components/writing-session/session-timer.tsx` |
| Create | `src/components/writing-session/daily-goal-form.tsx` |
| Create | `src/components/writing-session/daily-progress.tsx` |
| Create | `src/components/writing-session/weekly-chart.tsx` |
| Create | `src/components/writing-session/session-history.tsx` |
| Create | `src/app/workspace/[projectId]/goals/page.tsx` |
| Modify | `src/hooks/use-scene-editor.ts` |
| Modify | `src/hooks/use-scene-editor-runtime.ts` |
| Modify | `src/components/scene/scene-editor-shell.tsx` |
| Modify | `src/app/workspace/[projectId]/page.tsx` |
| Create | `src/test/writing-session/` (4 test files) |

## Key Decisions

- **Runtime refs isolation** (`use-writing-session-runtime.ts`): separates mutable refs (sessionId, intervalId, elapsed) from view state to prevent stale closure bugs in the tick interval — mirrors the pattern from `use-scene-editor-runtime.ts`
- **Word delta tracking**: `onWordsSaved` callback added to `useSceneEditor`; when autosave fires, the word count delta is reported to the session hook
- **Streak calculation**: consecutive days with at least 1 session, with gap detection — stored in `SessionsDashboard` returned by `WritingSessionService.getDashboard()`
- **SSR safety**: repository uses a no-op storage fallback when `window` is undefined

## Storage Key

`ainkwell:projects:{projectId}:sessions:v1` — stores `{ sessions: WritingSession[], dailyGoal: number | null }`
