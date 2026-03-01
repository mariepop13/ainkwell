'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { BibleEditor } from '@/components/bible/bible-editor';
import {
  type BiblePageController,
  useBiblePageController,
} from '@/components/bible/bible-page-controller';
import { BibleList } from '@/components/bible/bible-list';
import { RelationshipEditor } from '@/components/bible/relationship-editor';
import { SceneLinks } from '@/components/bible/scene-links';
import type { WritingProject } from '@/domain/project/types';

interface BiblePageClientProps {
  projectId: string;
}

function CenteredMessage({
  title,
  description,
  tone = 'muted',
}: {
  title: string;
  description: string;
  tone?: 'muted' | 'destructive';
}): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-2xl font-headline font-semibold">{title}</h1>
      <p className={`text-sm ${tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`}>
        {description}
      </p>
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

function BiblePageHeader({ project }: { project: WritingProject }): ReactElement {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Link href="/workspace" className="hover:underline">
          Workspace
        </Link>
        <span>/</span>
        <Link href={`/workspace/${project.id}`} className="hover:underline">
          {project.title}
        </Link>
        <span>/</span>
        <span>Story Bible</span>
      </div>
      <h1 className="text-3xl font-headline font-bold">Story Bible</h1>
      <p className="text-sm text-muted-foreground">Project: {project.title}</p>
    </header>
  );
}

function BiblePanels({
  controller,
  project,
}: {
  controller: BiblePageController;
  project: WritingProject;
}): ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <BibleList
        entities={controller.data.entities}
        selectedEntityId={controller.activeSelectedEntityId}
        searchValue={controller.searchValue}
        categoryFilter={controller.categoryFilter}
        allTags={controller.data.allTags}
        activeTagFilter={controller.tagFilter}
        onSearchChange={controller.setSearchValue}
        onCategoryFilterChange={controller.setCategoryFilter}
        onTagFilterChange={controller.setTagFilter}
        onSelectEntity={controller.onSelectEntity}
        onCreateEntity={controller.onCreateEntity}
      />
      <BibleEditorsColumn controller={controller} project={project} />
    </div>
  );
}

function BibleEditorsColumn({
  controller,
  project,
}: {
  controller: BiblePageController;
  project: WritingProject;
}): ReactElement {
  return (
    <div className="space-y-4">
      <BibleEditor
        key={controller.activeSelectedEntityId ?? 'new-entity'}
        projectId={project.id}
        selectedEntity={controller.selectedEntity}
        errorMessage={controller.entityError}
        suggestedTags={controller.data.allTags}
        onSave={controller.onSaveEntity}
        onDelete={controller.onDeleteEntity}
      />
      <RelationshipEditor
        projectId={project.id}
        entities={controller.data.entities}
        relationships={controller.data.relationships}
        selectedEntityId={controller.activeSelectedEntityId}
        errorMessage={controller.relationshipError}
        onSave={controller.onSaveRelationship}
        onDelete={controller.onDeleteRelationship}
      />
      <SceneLinks
        projectId={project.id}
        entities={controller.data.entities}
        scenes={controller.data.scenes}
        sceneLinks={controller.data.sceneLinks}
        selectedEntityId={controller.activeSelectedEntityId}
        errorMessage={controller.sceneLinkError}
        onSave={controller.onSaveSceneLink}
        onDelete={controller.onDeleteSceneLink}
      />
    </div>
  );
}

function renderProjectAccessState(controller: BiblePageController): ReactElement | null {
  if (controller.projectAccess.state === 'invalid') {
    return (
      <CenteredMessage
        title="Invalid project id"
        description="The Story Bible route requires a valid project identifier."
      />
    );
  }

  if (controller.projectAccess.state === 'loading') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p>Loading project...</p>
      </main>
    );
  }

  if (controller.projectAccess.state === 'not-found') {
    return <CenteredMessage title="Project not found" description="This project does not exist in local storage." />;
  }

  if (controller.projectAccess.state === 'error') {
    return (
      <CenteredMessage
        title="Unable to open Story Bible"
        description={controller.projectAccess.errorMessage ?? 'Unable to open this project Story Bible.'}
        tone="destructive"
      />
    );
  }

  if (!controller.project || !controller.bibleService) {
    return <LoadingStoryBibleMessage />;
  }

  return null;
}

function BiblePageContent({
  controller,
  project,
}: {
  controller: BiblePageController;
  project: WritingProject;
}): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <BiblePageHeader project={project} />
      <BiblePanels controller={controller} project={project} />
    </main>
  );
}

function LoadingStoryBibleMessage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
      <p>Loading Story Bible...</p>
    </main>
  );
}

export function BiblePageClient({ projectId }: BiblePageClientProps): ReactElement {
  const controller = useBiblePageController(projectId);
  const accessState = renderProjectAccessState(controller);

  if (accessState) {
    return accessState;
  }

  if (!controller.project) {
    return <LoadingStoryBibleMessage />;
  }

  return <BiblePageContent controller={controller} project={controller.project} />;
}
