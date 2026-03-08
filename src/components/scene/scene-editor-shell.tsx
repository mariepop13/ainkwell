'use client';

import Link from 'next/link';
import { memo, useCallback, useMemo, type ReactElement } from 'react';

import { AiSettingsService } from '@/application/ai/ai-settings-service';
import { SceneDraftService } from '@/application/ai/scene-draft-service';
import { BibleService } from '@/application/bible/bible-service';
import { createBibleService as createDefaultBibleService } from '@/application/bible/create-bible-service';
import {
  SceneEditorService,
  type SceneEditorServicePort,
} from '@/application/scene/scene-editor-service';
import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { CodexContextPanel } from '@/components/scene/codex-context-panel';
import { GenerateDraftButton } from '@/components/scene/generate-draft-button';
import { SceneBeatPanel } from '@/components/scene/scene-beat-panel';
import { SceneToolbar } from '@/components/scene/scene-toolbar';
import { SessionTimer } from '@/components/writing-session/session-timer';
import { useWritingSessionActions, useWritingSessionTimer } from '@/context/writing-session-context';
import { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import type { BibleEntity } from '@/domain/bible/types';
import type { SceneBeat } from '@/domain/scene/schemas';
import { useCodexContext } from '@/hooks/use-codex-context';
import { useSceneDraft } from '@/hooks/use-scene-draft';
import { useSceneEditor, type UseSceneEditorResult } from '@/hooks/use-scene-editor';
import { useWritingSession } from '@/hooks/use-writing-session';

type SceneEditorShellProps = {
  projectId: string;
  sceneId: string;
  language?: string;
  service?: SceneEditorServicePort;
  writingService?: WritingSessionService;
  bibleService?: BibleService;
  draftService?: SceneDraftService;
};

const createSceneEditorService = (): SceneEditorServicePort =>
  new SceneEditorService(new LocalProjectRepository());

const createWritingSessionService = (): WritingSessionService =>
  new WritingSessionService(new LocalWritingSessionRepository());

const createBibleService = (): BibleService => createDefaultBibleService();

const createDraftService = (): SceneDraftService =>
  new SceneDraftService(new AiSettingsService(new LocalAiSettingsRepository()));

function useShellServices(props: Pick<SceneEditorShellProps, 'service' | 'writingService' | 'bibleService' | 'draftService'>) {
  const service = useMemo(() => props.service ?? createSceneEditorService(), [props.service]);
  const writingService = useMemo(
    () => props.writingService ?? createWritingSessionService(),
    [props.writingService],
  );
  const bibleService = useMemo(() => props.bibleService ?? createBibleService(), [props.bibleService]);
  const draftService = useMemo(() => props.draftService ?? createDraftService(), [props.draftService]);
  return { service, writingService, bibleService, draftService };
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

const SceneEditorNavigation = memo(function SceneEditorNavigation(props: SceneEditorNavigationProps): ReactElement {
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
});

type SceneContentSectionProps = {
  content: string;
  onContentChange: (value: string) => void;
  matchedEntities: BibleEntity[];
  synopsis: string;
  beats: SceneBeat[];
  onSynopsisChange: (value: string) => void;
  onBeatsChange: (beats: SceneBeat[]) => void;
  isGenerating: boolean;
  generateError: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onClearGenerateError: () => void;
};

const SceneContentSection = memo(function SceneContentSection({
  content,
  onContentChange,
  matchedEntities,
  synopsis,
  beats,
  onSynopsisChange,
  onBeatsChange,
  isGenerating,
  generateError,
  canGenerate,
  onGenerate,
  onClearGenerateError,
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
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="scene-content" className="block text-sm font-medium">
              Markdown content
            </label>
            <GenerateDraftButton
              isGenerating={isGenerating}
              generateError={generateError}
              canGenerate={canGenerate}
              onGenerate={onGenerate}
              onClearError={onClearGenerateError}
            />
          </div>
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
});

type SessionTimerConnectorProps = {
  onStart: () => void;
  onStop: () => Promise<void>;
  fallbackIsRunning: boolean;
  fallbackElapsedSeconds: number;
};

function SessionTimerConnector({ onStart, onStop, fallbackIsRunning, fallbackElapsedSeconds }: SessionTimerConnectorProps): ReactElement {
  const contextTimer = useWritingSessionTimer();
  return (
    <SessionTimer
      isRunning={contextTimer?.isRunning ?? fallbackIsRunning}
      elapsedSeconds={contextTimer?.elapsedSeconds ?? fallbackElapsedSeconds}
      onStart={onStart}
      onStop={onStop}
    />
  );
}

type SceneEditorLoadedViewProps = {
  projectId: string;
  language: string;
  sceneEditor: UseSceneEditorResult;
  onSessionStart: () => void;
  onSessionStop: () => Promise<void>;
  bibleService: BibleService;
  draftService: SceneDraftService;
  fallbackIsRunning: boolean;
  fallbackElapsedSeconds: number;
};

const SceneEditorLoadedView = memo(function SceneEditorLoadedView(props: SceneEditorLoadedViewProps): ReactElement {
  const { matchedEntities } = useCodexContext({
    projectId: props.projectId,
    content: props.sceneEditor.content,
    service: props.bibleService,
  });

  const { isGenerating, generateError, canGenerate, generate, clearError } = useSceneDraft({
    scene: props.sceneEditor.scene,
    synopsis: props.sceneEditor.synopsis,
    beats: props.sceneEditor.beats,
    entities: matchedEntities,
    language: props.language,
    service: props.draftService,
    onDraftReady: props.sceneEditor.setContent,
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

      <SessionTimerConnector
        onStart={props.onSessionStart}
        onStop={props.onSessionStop}
        fallbackIsRunning={props.fallbackIsRunning}
        fallbackElapsedSeconds={props.fallbackElapsedSeconds}
      />

      <SceneContentSection
        content={props.sceneEditor.content}
        onContentChange={props.sceneEditor.setContent}
        matchedEntities={matchedEntities}
        synopsis={props.sceneEditor.synopsis}
        beats={props.sceneEditor.beats}
        onSynopsisChange={props.sceneEditor.setSynopsis}
        onBeatsChange={props.sceneEditor.setBeats}
        isGenerating={isGenerating}
        generateError={generateError}
        canGenerate={canGenerate}
        onGenerate={() => void generate()}
        onClearGenerateError={clearError}
      />

      <SceneEditorNavigation
        projectId={props.projectId}
        previousSceneId={props.sceneEditor.previousSceneId}
        nextSceneId={props.sceneEditor.nextSceneId}
      />
    </main>
  );
});

export function SceneEditorShell(props: SceneEditorShellProps): ReactElement {
  const { service, writingService, bibleService, draftService } = useShellServices(props);
  const contextActions = useWritingSessionActions();
  const localSession = useWritingSession({ projectId: props.projectId, service: writingService });

  const startSession = contextActions?.startSession ?? localSession.startSession;
  const stopSession = contextActions?.stopSession ?? localSession.stopSession;
  const onWordsSaved = contextActions?.onWordsSaved ?? localSession.onWordsSaved;

  const handleSessionStop = useCallback(async (): Promise<void> => {
    await stopSession();
  }, [stopSession]);

  const sceneEditor = useSceneEditor({
    projectId: props.projectId,
    sceneId: props.sceneId,
    service,
    onWordsSaved,
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
      language={props.language ?? 'en'}
      sceneEditor={sceneEditor}
      onSessionStart={startSession}
      onSessionStop={handleSessionStop}
      bibleService={bibleService}
      draftService={draftService}
      fallbackIsRunning={localSession.isRunning}
      fallbackElapsedSeconds={localSession.elapsedSeconds}
    />
  );
}
