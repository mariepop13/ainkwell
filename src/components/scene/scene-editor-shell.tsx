'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useCallback, useContext, useMemo } from 'react';

import { BibleService } from '@/application/bible/bible-service';
import { createBibleService as createDefaultBibleService } from '@/application/bible/create-bible-service';
import {
  SceneEditorService,
  type SceneEditorServicePort,
} from '@/application/scene/scene-editor-service';
import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { CodexContextPanel } from '@/components/scene/codex-context-panel';
import { SceneBeatPanel } from '@/components/scene/scene-beat-panel';
import { SceneToolbar } from '@/components/scene/scene-toolbar';
import { SessionTimer } from '@/components/writing-session/session-timer';
import { WritingSessionContext } from '@/context/writing-session-context';

import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import type { BibleEntity } from '@/domain/bible/types';
import { useCodexContext } from '@/hooks/use-codex-context';
import { useSceneEditor, type UseSceneEditorResult } from '@/hooks/use-scene-editor';
import { useWritingSession } from '@/hooks/use-writing-session';

type SceneEditorShellProps = {
  projectId: string;
  sceneId: string;
  service?: SceneEditorServicePort;
  writingService?: WritingSessionService;
  bibleService?: BibleService;
};

const createSceneEditorService = (): SceneEditorServicePort =>
  new SceneEditorService(new LocalProjectRepository());

const createWritingSessionService = (): WritingSessionService =>
  new WritingSessionService(new LocalWritingSessionRepository());

const createBibleService = (): BibleService => createDefaultBibleService();

function useShellServices(props: Pick<SceneEditorShellProps, 'service' | 'writingService' | 'bibleService'>) {
  const service = useMemo(() => props.service ?? createSceneEditorService(), [props.service]);
  const writingService = useMemo(
    () => props.writingService ?? createWritingSessionService(),
    [props.writingService],
  );
  const bibleService = useMemo(() => props.bibleService ?? createBibleService(), [props.bibleService]);
  return { service, writingService, bibleService };
}

type SceneStateViewProps = {
  projectId: string;
  sceneId: string;
  loadState: UseSceneEditorResult['loadState'];
  saveError: string | null;
};

const getLoadingSceneView = (): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
    <p className="text-muted-foreground">Loading scene...</p>
  </main>
);

const getProjectNotFoundView = (projectId: string): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Project not found</h1>
      <p className="text-muted-foreground">
        The project <code>{projectId}</code> does not exist.
      </p>
      <Link href="/" className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
        Back to home
      </Link>
    </div>
  </main>
);

const getSceneNotFoundView = (props: Pick<SceneStateViewProps, 'projectId' | 'sceneId'>): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Scene not found</h1>
      <p className="text-muted-foreground">
        The scene <code>{props.sceneId}</code> was not found in this project.
      </p>
      <Link
        href={`/workspace/${props.projectId}`}
        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
      >
        Back to workspace
      </Link>
    </div>
  </main>
);

const getSceneLoadErrorView = (
  props: Pick<SceneStateViewProps, 'projectId' | 'saveError'>,
): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Unable to load scene</h1>
      <p className="text-muted-foreground">{props.saveError ?? 'An unexpected error occurred.'}</p>
      <Link
        href={`/workspace/${props.projectId}`}
        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
      >
        Back to workspace
      </Link>
    </div>
  </main>
);

const getSceneNotLoadedView = (): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
    <p className="text-muted-foreground">Scene not found</p>
  </main>
);

const getSceneStateView = (props: SceneStateViewProps): ReactElement | null => {
  if (props.loadState === 'loading') {
    return getLoadingSceneView();
  }

  if (props.loadState === 'project-not-found') {
    return getProjectNotFoundView(props.projectId);
  }

  if (props.loadState === 'scene-not-found') {
    return getSceneNotFoundView(props);
  }

  if (props.loadState === 'error') {
    return getSceneLoadErrorView(props);
  }

  return null;
};

type SceneEditorNavigationProps = {
  projectId: string;
  previousSceneId: string | null;
  nextSceneId: string | null;
};

function SceneEditorNavigation(props: SceneEditorNavigationProps): ReactElement {
  return (
    <nav className="flex items-center justify-between">
      {props.previousSceneId ? (
        <Link
          href={`/workspace/${props.projectId}/scene/${props.previousSceneId}`}
          className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
        >
          Previous
        </Link>
      ) : (
        <button type="button" disabled className="inline-flex rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Previous
        </button>
      )}

      <Link href={`/workspace/${props.projectId}`} className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
        Back to workspace
      </Link>

      {props.nextSceneId ? (
        <Link
          href={`/workspace/${props.projectId}/scene/${props.nextSceneId}`}
          className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
        >
          Next
        </Link>
      ) : (
        <button type="button" disabled className="inline-flex rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Next
        </button>
      )}
    </nav>
  );
}

type SceneContentSectionProps = {
  content: string;
  onContentChange: (value: string) => void;
  matchedEntities: BibleEntity[];
  synopsis: string;
  beats: import('@/domain/scene/schemas').SceneBeat[];
  onSynopsisChange: (value: string) => void;
  onBeatsChange: (beats: import('@/domain/scene/schemas').SceneBeat[]) => void;
};

function SceneContentSection({
  content,
  onContentChange,
  matchedEntities,
  synopsis,
  beats,
  onSynopsisChange,
  onBeatsChange,
}: SceneContentSectionProps): ReactElement {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground">
      <SceneBeatPanel
        synopsis={synopsis}
        beats={beats}
        onSynopsisChange={onSynopsisChange}
        onBeatsChange={onBeatsChange}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col p-4">
          <label htmlFor="scene-content" className="mb-2 block text-sm font-medium">
            Markdown content
          </label>
          <textarea
            id="scene-content"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            className="min-h-[60vh] flex-1 w-full resize-y rounded-md border bg-background p-3 font-mono text-sm"
          />
        </div>
        <CodexContextPanel entities={matchedEntities} />
      </div>
    </section>
  );
}

type SceneEditorLoadedViewProps = {
  projectId: string;
  sceneEditor: UseSceneEditorResult;
  isSessionRunning: boolean;
  sessionElapsedSeconds: number;
  onSessionStart: () => void;
  onSessionStop: () => Promise<void>;
  bibleService: BibleService;
};

function SceneEditorLoadedView(props: SceneEditorLoadedViewProps): ReactElement {
  const { matchedEntities } = useCodexContext({
    projectId: props.projectId,
    content: props.sceneEditor.content,
    service: props.bibleService,
  });

  if (!props.sceneEditor.scene) return getSceneNotLoadedView();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <SceneToolbar
        title={props.sceneEditor.scene.title}
        status={props.sceneEditor.status}
        wordCount={props.sceneEditor.wordCount}
        isDirty={props.sceneEditor.isDirty}
        isSaving={props.sceneEditor.isSaving}
        lastSavedAt={props.sceneEditor.lastSavedAt}
        saveError={props.sceneEditor.saveError}
        onStatusChange={props.sceneEditor.setStatus}
        onRetrySave={props.sceneEditor.retrySave}
      />

      <SessionTimer
        isRunning={props.isSessionRunning}
        elapsedSeconds={props.sessionElapsedSeconds}
        onStart={props.onSessionStart}
        onStop={props.onSessionStop}
      />

      <SceneContentSection
        content={props.sceneEditor.content}
        onContentChange={props.sceneEditor.setContent}
        matchedEntities={matchedEntities}
        synopsis={props.sceneEditor.synopsis}
        beats={props.sceneEditor.beats}
        onSynopsisChange={props.sceneEditor.setSynopsis}
        onBeatsChange={props.sceneEditor.setBeats}
      />

      <SceneEditorNavigation
        projectId={props.projectId}
        previousSceneId={props.sceneEditor.previousSceneId}
        nextSceneId={props.sceneEditor.nextSceneId}
      />
    </main>
  );
}

export function SceneEditorShell(props: SceneEditorShellProps): ReactElement {
  const { service, writingService, bibleService } = useShellServices(props);
  const contextSession = useContext(WritingSessionContext);
  const localSession = useWritingSession({ projectId: props.projectId, service: writingService });
  const writingSession = contextSession ?? localSession;

  const handleSessionStop = useCallback(async (): Promise<void> => {
    await writingSession.stopSession();
  }, [writingSession]);

  const sceneEditor = useSceneEditor({
    projectId: props.projectId,
    sceneId: props.sceneId,
    service,
    onWordsSaved: writingSession.onWordsSaved,
  });
  const stateView = getSceneStateView({
    projectId: props.projectId,
    sceneId: props.sceneId,
    loadState: sceneEditor.loadState,
    saveError: sceneEditor.saveError,
  });

  if (stateView) {
    return stateView;
  }

  return (
    <SceneEditorLoadedView
      projectId={props.projectId}
      sceneEditor={sceneEditor}
      isSessionRunning={writingSession.isRunning}
      sessionElapsedSeconds={writingSession.elapsedSeconds}
      onSessionStart={writingSession.startSession}
      onSessionStop={handleSessionStop}
      bibleService={bibleService}
    />
  );
}
