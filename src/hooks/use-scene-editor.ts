import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import type { Scene, SceneStatus } from '@/domain/scene/types';

import {
  applyLoadedScene,
  applySaveFailure,
  applySaveSuccess,
  applyUnavailableScene,
  assignRef,
  clearAutosaveTimeout,
  createSavePayload,
  decrementRef,
  incrementRef,
  initialViewState,
  markDirty,
  type SceneEditorLoadState,
  type SceneRuntimeRefs,
  type SceneViewState,
  type ViewStateReplacer,
  type ViewStateSetter,
} from './use-scene-editor-runtime';

type UseSceneEditorInput = {
  projectId: string;
  sceneId: string;
  service: SceneEditorServicePort;
};

export type UseSceneEditorResult = {
  scene: Scene | null;
  content: string;
  status: SceneStatus;
  wordCount: number;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  previousSceneId: string | null;
  nextSceneId: string | null;
  loadState: SceneEditorLoadState;
  setContent: (value: string) => void;
  setStatus: (value: SceneStatus) => void;
  retrySave: () => Promise<void>;
};

const autosaveDelayInMilliseconds = 800;

function useViewState(): {
  viewState: SceneViewState;
  patchViewState: ViewStateSetter;
  replaceViewState: ViewStateReplacer;
} {
  const [viewState, setViewState] = useState<SceneViewState>(initialViewState);

  const patchViewState = useCallback((patch: Partial<SceneViewState>): void => {
    setViewState((previousState) => ({ ...previousState, ...patch }));
  }, []);

  const replaceViewState = useCallback((nextState: SceneViewState): void => {
    setViewState(nextState);
  }, []);

  return { viewState, patchViewState, replaceViewState };
}

function useRuntimeRefs(): SceneRuntimeRefs {
  const sceneRef = useRef<Scene | null>(null);
  const contentRef = useRef<string>('');
  const statusRef = useRef<SceneStatus>('draft');
  const isDirtyRef = useRef<boolean>(false);
  const latestRequestRef = useRef<number>(0);
  const latestAppliedRequestRef = useRef<number>(0);
  const inFlightRequestCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(
    () => ({
      sceneRef,
      contentRef,
      statusRef,
      isDirtyRef,
      latestRequestRef,
      latestAppliedRequestRef,
      inFlightRequestCountRef,
      isMountedRef,
      autosaveTimeoutRef,
    }),
    [],
  );
}

function useRunSaveCycle(
  input: UseSceneEditorInput,
  runtimeRefs: SceneRuntimeRefs,
  patchViewState: ViewStateSetter,
): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    if (!runtimeRefs.sceneRef.current || !runtimeRefs.isDirtyRef.current) {
      return;
    }

    const payload = createSavePayload(runtimeRefs);
    if (!payload) {
      return;
    }

    const requestId = incrementRef(runtimeRefs.latestRequestRef);
    incrementRef(runtimeRefs.inFlightRequestCountRef);
    patchViewState({ isSaving: true });

    try {
      const savedScene = await input.service.saveScene(payload);
      applySaveSuccess({ runtimeRefs, patchViewState, requestId, payload, savedScene });
    } catch (error) {
      applySaveFailure({
        runtimeRefs,
        patchViewState,
        service: input.service,
        requestId,
        error,
      });
    } finally {
      const inFlightCount = decrementRef(runtimeRefs.inFlightRequestCountRef);
      if (runtimeRefs.isMountedRef.current && inFlightCount === 0) {
        patchViewState({ isSaving: false });
      }
    }
  }, [input.service, patchViewState, runtimeRefs]);
}

function useMountLifecycle(runtimeRefs: SceneRuntimeRefs): void {
  useEffect(() => {
    assignRef(runtimeRefs.isMountedRef, true);

    return () => {
      assignRef(runtimeRefs.isMountedRef, false);
      clearAutosaveTimeout(runtimeRefs.autosaveTimeoutRef);
    };
  }, [runtimeRefs]);
}

function useLoadScene(
  input: UseSceneEditorInput,
  runtimeRefs: SceneRuntimeRefs,
  patchViewState: ViewStateSetter,
  replaceViewState: ViewStateReplacer,
): void {
  useEffect(() => {
    const loadScene = async (): Promise<void> => {
      patchViewState({ loadState: 'loading', saveError: null });

      const result = await input.service.loadScene({
        projectId: input.projectId,
        sceneId: input.sceneId,
      });

      if (!runtimeRefs.isMountedRef.current) {
        return;
      }

      if (result.state === 'project-not-found') {
        applyUnavailableScene(runtimeRefs, replaceViewState, 'project-not-found');
        return;
      }

      if (result.state === 'scene-not-found') {
        applyUnavailableScene(runtimeRefs, replaceViewState, 'scene-not-found');
        return;
      }

      applyLoadedScene({
        runtimeRefs,
        replaceViewState,
        scene: result.scene,
        previousSceneId: result.previousSceneId,
        nextSceneId: result.nextSceneId,
      });
    };

    void loadScene();
  }, [input.projectId, input.sceneId, input.service, patchViewState, replaceViewState, runtimeRefs]);
}

function useAutosave(
  runtimeRefs: SceneRuntimeRefs,
  viewState: SceneViewState,
  runSaveCycle: () => Promise<void>,
): void {
  useEffect(() => {
    if (viewState.loadState !== 'ready' || !viewState.isDirty) {
      return undefined;
    }

    clearAutosaveTimeout(runtimeRefs.autosaveTimeoutRef);
    const timeout = setTimeout(() => {
      void runSaveCycle();
    }, autosaveDelayInMilliseconds);

    assignRef(runtimeRefs.autosaveTimeoutRef, timeout);
    return () => clearAutosaveTimeout(runtimeRefs.autosaveTimeoutRef);
  }, [
    runSaveCycle,
    runtimeRefs,
    viewState.content,
    viewState.isDirty,
    viewState.loadState,
    viewState.status,
  ]);
}

function useEditorMutators(
  runtimeRefs: SceneRuntimeRefs,
  patchViewState: ViewStateSetter,
  runSaveCycle: () => Promise<void>,
): Pick<UseSceneEditorResult, 'setContent' | 'setStatus' | 'retrySave'> {
  const setContent = useCallback(
    (value: string): void => {
      assignRef(runtimeRefs.contentRef, value);
      patchViewState({ content: value, saveError: null });
      markDirty(runtimeRefs, patchViewState);
    },
    [patchViewState, runtimeRefs],
  );

  const setStatus = useCallback(
    (value: SceneStatus): void => {
      assignRef(runtimeRefs.statusRef, value);
      patchViewState({ status: value, saveError: null });
      markDirty(runtimeRefs, patchViewState);
    },
    [patchViewState, runtimeRefs],
  );

  const retrySave = useCallback(async (): Promise<void> => {
    patchViewState({ saveError: null });
    await runSaveCycle();
  }, [patchViewState, runSaveCycle]);

  return { setContent, setStatus, retrySave };
}

export function useSceneEditor(input: UseSceneEditorInput): UseSceneEditorResult {
  const runtimeRefs = useRuntimeRefs();
  const { viewState, patchViewState, replaceViewState } = useViewState();
  const runSaveCycle = useRunSaveCycle(input, runtimeRefs, patchViewState);

  useMountLifecycle(runtimeRefs);
  useLoadScene(input, runtimeRefs, patchViewState, replaceViewState);
  useAutosave(runtimeRefs, viewState, runSaveCycle);

  const { setContent, setStatus, retrySave } = useEditorMutators(
    runtimeRefs,
    patchViewState,
    runSaveCycle,
  );

  const wordCount = useMemo<number>(
    () => input.service.countWords(viewState.content),
    [input.service, viewState.content],
  );

  return {
    scene: viewState.scene,
    content: viewState.content,
    status: viewState.status,
    wordCount,
    isDirty: viewState.isDirty,
    isSaving: viewState.isSaving,
    saveError: viewState.saveError,
    lastSavedAt: viewState.lastSavedAt,
    previousSceneId: viewState.previousSceneId,
    nextSceneId: viewState.nextSceneId,
    loadState: viewState.loadState,
    setContent,
    setStatus,
    retrySave,
  };
}
