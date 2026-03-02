---
name: Export & Import
overview: Allow writers to export their projects as JSON (backup/restore) and as Markdown (portability), and import from JSON backup.
todos:
  - id: 1
    content: "Define ExportService in application layer with exportProjectJson, importProjectJson, exportProjectMarkdown"
    status: pending
    dependencies: []
  - id: 2
    content: "Add exportProject/importProject methods to ProjectRepository interface"
    status: pending
    dependencies: []
  - id: 3
    content: "Implement export/import in LocalProjectRepository"
    status: pending
    dependencies: [1, 2]
  - id: 4
    content: "Build ExportImportPanel component"
    status: pending
    dependencies: [3]
  - id: 5
    content: "Integrate panel into workspace project detail page"
    status: pending
    dependencies: [4]
  - id: 6
    content: "Write tests for ExportService"
    status: pending
    dependencies: [1]
---

# Export & Import — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let writers download their project as a JSON backup or Markdown manuscript, and restore from a JSON file.

**Architecture:** New `ExportService` in `src/application/export/`. Repository interface gets `exportProject` and `importProject`. UI panel added to project detail page. No new storage keys.

**Tech Stack:** Next.js 15, TypeScript, Zod, localStorage, browser File API (download via `<a>` blob, upload via `<input type="file">`)

---

## Overview

Writers using a local-first app need two safety nets:
1. **JSON backup/restore** — full fidelity, includes scenes, chapters, bible, sessions
2. **Markdown export** — human-readable, portable, chapters as headings + scene content

Import validates the JSON with Zod before writing to storage to prevent corruption.

---

## Architecture / Data Model

No new domain entities. New operations only.

**Export format (JSON):**
```ts
{
  version: 1,
  exportedAt: ISO string,
  project: WritingProject,          // from ainkwell.projects.v1
  bible: BibleData,                 // from ainkwell:projects:{id}:bible:v1
  sessions: WritingSessionData,     // from ainkwell:projects:{id}:sessions:v1
}
```

**Markdown format:**
```markdown
# Project Title

## Chapter 1: Chapter Name

### Scene Title

Scene content here...

---

### Scene Title 2

...
```

---

## Implementation Steps

### Task 1: ProjectRepository interface — add export/import methods

**Files:**
- Modify: `src/domain/project/project-repository.ts`

**Step 1: Read the file**
Read `src/domain/project/project-repository.ts` to understand the current interface.

**Step 2: Write the failing test**

File: `src/test/export/export-service.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '@/application/export/export-service';
import type { ProjectRepository } from '@/domain/project/project-repository';

describe('ExportService', () => {
  let mockRepository: ProjectRepository;

  beforeEach(() => {
    mockRepository = {
      exportProject: vi.fn(),
      importProject: vi.fn(),
    } as unknown as ProjectRepository;
  });

  it('calls exportProject with project id', async () => {
    vi.mocked(mockRepository.exportProject).mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      project: { id: 'p1', title: 'My Novel' } as any,
      bible: null,
      sessions: null,
    });

    const service = new ExportService(mockRepository);
    const result = await service.exportProjectJson('p1');
    expect(mockRepository.exportProject).toHaveBeenCalledWith('p1');
    expect(result.project.id).toBe('p1');
  });
});
```

**Step 3: Run test — expect FAIL** (`ExportService` does not exist yet)
```bash
npx vitest run src/test/export/export-service.test.ts
```

**Step 4: Add ProjectExport type and methods to ProjectRepository interface**

In `src/domain/project/project-repository.ts`, add:
```ts
export type ProjectExport = {
  version: 1;
  exportedAt: string;
  project: WritingProject;
  bible: unknown | null;
  sessions: unknown | null;
};

// Add to ProjectRepository interface:
exportProject(projectId: string): Promise<ProjectExport>;
importProject(data: ProjectExport): Promise<void>;
```

**Step 5: Create ExportService**

File: `src/application/export/export-service.ts`
```ts
import type { ProjectRepository, ProjectExport } from '@/domain/project/project-repository';
import type { WritingProject } from '@/domain/project/project';

export class ExportService {
  constructor(private readonly repository: ProjectRepository) {}

  async exportProjectJson(projectId: string): Promise<ProjectExport> {
    return this.repository.exportProject(projectId);
  }

  async importProjectJson(data: ProjectExport): Promise<void> {
    return this.repository.importProject(data);
  }

  async exportProjectMarkdown(projectId: string): Promise<string> {
    const exported = await this.repository.exportProject(projectId);
    return buildMarkdown(exported.project);
  }
}

function buildMarkdown(project: WritingProject): string {
  const lines: string[] = [`# ${project.title}`, ''];

  for (const chapterId of project.chapterOrder) {
    const chapter = project.chapters[chapterId];
    if (!chapter) continue;
    lines.push(`## ${chapter.title}`, '');

    for (const sceneId of chapter.sceneOrder) {
      const scene = project.scenes[sceneId];
      if (!scene) continue;
      lines.push(`### ${scene.title}`, '', scene.content.trim(), '', '---', '');
    }
  }

  return lines.join('\n');
}
```

**Step 6: Run test — expect PASS**
```bash
npx vitest run src/test/export/export-service.test.ts
```

**Step 7: Commit**
```bash
git add src/domain/project/project-repository.ts src/application/export/export-service.ts src/test/export/export-service.test.ts
git commit -m "✨ feat: add ExportService and ProjectExport type to domain"
```

---

### Task 2: Implement export/import in LocalProjectRepository

**Files:**
- Modify: `src/data/project/local-project-repository.ts`

**Step 1: Read current implementation**
Read `src/data/project/local-project-repository.ts`.

**Step 2: Add exportProject implementation**

```ts
async exportProject(projectId: string): Promise<ProjectExport> {
  const projects = this.readProjects();
  const project = projects[projectId];
  if (!project) throw new Error(`Project ${projectId} not found`);

  const bibleKey = `ainkwell:projects:${projectId}:bible:v1`;
  const sessionsKey = `ainkwell:projects:${projectId}:sessions:v1`;

  const bibleRaw = this.storage.getItem(bibleKey);
  const sessionsRaw = this.storage.getItem(sessionsKey);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    bible: bibleRaw ? JSON.parse(bibleRaw) : null,
    sessions: sessionsRaw ? JSON.parse(sessionsRaw) : null,
  };
}

async importProject(data: ProjectExport): Promise<void> {
  const parsed = projectExportSchema.parse(data);
  const projects = this.readProjects();

  const newId = crypto.randomUUID();
  const importedProject = {
    ...parsed.project,
    id: newId,
    title: `${parsed.project.title} (imported)`,
  };

  projects[newId] = importedProject;
  this.writeProjects(projects);

  if (parsed.bible) {
    this.storage.setItem(`ainkwell:projects:${newId}:bible:v1`, JSON.stringify(parsed.bible));
  }
  if (parsed.sessions) {
    this.storage.setItem(`ainkwell:projects:${newId}:sessions:v1`, JSON.stringify(parsed.sessions));
  }
}
```

Add Zod validation schema in domain:
```ts
export const projectExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  project: writingProjectSchema,
  bible: z.unknown().nullable(),
  sessions: z.unknown().nullable(),
});
```

**Step 3: Run full tests**
```bash
npm run test:ci
```

**Step 4: Commit**
```bash
git add src/data/project/local-project-repository.ts src/domain/project/project-repository.ts
git commit -m "✨ feat: implement exportProject and importProject in LocalProjectRepository"
```

---

### Task 3: Build ExportImportPanel component

**Files:**
- Create: `src/components/workspace/export-import-panel.tsx`
- Modify: `src/app/workspace/[projectId]/page.tsx`

**Step 1: Read the project detail page**
Read `src/app/workspace/[projectId]/page.tsx` to find where to add the panel.

**Step 2: Write the component**

```tsx
'use client';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ExportService } from '@/application/export/export-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import type { ProjectExport } from '@/domain/project/project-repository';

type Props = { projectId: string; projectTitle: string };

export function ExportImportPanel({ projectId, projectTitle }: Props): ReactElement {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const service = new ExportService(new LocalProjectRepository());

  async function handleExportJson(): Promise<void> {
    const data = await service.exportProjectJson(projectId);
    downloadFile(JSON.stringify(data, null, 2), `${slugify(projectTitle)}-backup.json`, 'application/json');
  }

  async function handleExportMarkdown(): Promise<void> {
    const markdown = await service.exportProjectMarkdown(projectId);
    downloadFile(markdown, `${slugify(projectTitle)}.md`, 'text/markdown');
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const data: ProjectExport = JSON.parse(text);
      await service.importProjectJson(data);
      window.location.reload();
    } catch {
      setError('Invalid backup file. Make sure it is a valid Ainkwell JSON export.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Export & Import</p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted" onClick={handleExportJson} type="button">
          Export JSON backup
        </button>
        <button className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted" onClick={handleExportMarkdown} type="button">
          Export Markdown
        </button>
        <button className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => fileInputRef.current?.click()} type="button">
          {importing ? 'Importing…' : 'Import JSON backup'}
        </button>
        <input accept=".json" className="hidden" onChange={handleImport} ref={fileInputRef} type="file" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
```

**Step 3: Add to project detail page**
Import and place `<ExportImportPanel projectId={projectId} projectTitle={project.title} />` below the project stats section.

**Step 4: Run tests**
```bash
npm run test:ci
```

**Step 5: Commit**
```bash
git add src/components/workspace/export-import-panel.tsx src/app/workspace/[projectId]/page.tsx
git commit -m "✨ feat: add ExportImportPanel to project detail page"
```

---

## Files Summary

| Action | Path |
|--------|------|
| Modify | `src/domain/project/project-repository.ts` |
| Create | `src/application/export/export-service.ts` |
| Modify | `src/data/project/local-project-repository.ts` |
| Create | `src/components/workspace/export-import-panel.tsx` |
| Modify | `src/app/workspace/[projectId]/page.tsx` |
| Create | `src/test/export/export-service.test.ts` |

---

## Testing

- Unit: `ExportService.exportProjectJson` calls repository correctly
- Unit: `ExportService.exportProjectMarkdown` produces correct Markdown structure
- Unit: `importProject` validates schema and rejects invalid data
- Manual: export JSON, clear project, import JSON, verify data restored
- Manual: export Markdown, verify chapter/scene structure
