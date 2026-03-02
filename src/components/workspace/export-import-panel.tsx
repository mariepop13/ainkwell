'use client';
import type { ReactElement } from 'react';

import { ExportService } from '@/application/export/export-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';

type Props = { projectId: string; projectTitle: string };

export function ExportImportPanel({ projectId, projectTitle }: Props): ReactElement {
  const service = new ExportService(new LocalProjectRepository());

  async function handleExportJson(): Promise<void> {
    const data = await service.exportProjectJson(projectId);
    downloadFile(JSON.stringify(data, null, 2), `${slugify(projectTitle)}-backup.json`, 'application/json');
  }

  async function handleExportMarkdown(): Promise<void> {
    const markdown = await service.exportProjectMarkdown(projectId);
    downloadFile(markdown, `${slugify(projectTitle)}.md`, 'text/markdown');
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="text-2xl font-headline font-semibold">Export</h2>
      <p className="text-sm text-muted-foreground">
        Download a full JSON backup or a Markdown manuscript of this project.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={handleExportJson}
          type="button"
        >
          Export JSON backup
        </button>
        <button
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={handleExportMarkdown}
          type="button"
        >
          Export Markdown
        </button>
      </div>
    </section>
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
