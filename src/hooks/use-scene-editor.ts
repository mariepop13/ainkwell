import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import type { Scene, SceneStatus } from '@/domain/scene/types';

type SceneEditorLoadState = 'loading' | 'ready' | 'project-not-found' | 'scene-not-found';

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

export function useSceneEditor(input: UseSceneEditorInput): UseSceneEditorResult {
  const [scene, setScene] = useState<Scene | null>(null);
  const [content, setContentState] = useState<string>('');
  const [status, setStatusState] = useState<SceneStatus>('draft');
  const [isDirty, setIsDirtyState] = useState<boolean>(false);
  const [isSaving, setIsSavingState] = useState<boolean>(false);
  const [saveError, setSaveErrorState] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAtState] = useState<string | null>(null);
  const [previousSceneId, setPreviousSceneIdState] = useState<string | null>(null);
  const [nextSceneId, setNextSceneIdState] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<SceneEditorLoadState>('loading');

  const sceneRef = useRef<Scene | null>(null);
  const contentRef = useRef<string>('');
  const statusRef = useRef<SceneStatus>('draft');
  const isDirtyRef = useRef<boolean>(false);
  const latestRequestRef = useRef<number>(0);
  const latestAppliedRequestRef = useRef<number>(0);
  const inFlightRequestCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMutableState = useCallback((): void => {
    sceneRef.current = null;
    contentRef.current = '';
    statusRef.current = 'draft';
    isDirtyRef.current = false;
    latestRequestRef.current = 0;
    latestAppliedRequestRef.current = 0;
    inFlightRequestCountRef.current = 0;
  }, []);

  const applyUnavailableSceneState = useCallback(
    (nextLoadState: Extract<SceneEditorLoadState, 'project-not-found' | 'scene-not-found'>): void => {
      resetMutableState();
      setScene(null);
      setContentState('');
      setStatusState('draft');
      setIsDirtyState(false);
      setIsSavingState(false);
      setLastSavedAtState(null);
      setPreviousSceneIdState(null);
      setNextSceneIdState(null);
      setLoadState(nextLoadState);
    },
    [resetMutableState],
  );

  const markDirty = useCallback((): void => {
    isDirtyRef.current = true;
    setIsDirtyState(true);
  }, []);

  const clearAutosaveTimeout = useCallback((): void => {
    if (!autosaveTimeoutRef.current) {
      return;
    }

    clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = null;
  }, []);

  const applySaveSuccess = useCallback(
    (requestId: number, savedScene: Scene, payloadContent: string, payloadStatus: SceneStatus): void => {
      if (!isMountedRef.current) {
        return;
      }

      if (requestId < latestAppliedRequestRef.current) {
        return;
      }

      latestAppliedRequestRef.current = requestId;
      setSaveErrorState(null);

      if (requestId === latestRequestRef.current) {
        setScene(savedScene);
        sceneRef.current = savedScene;
        setLastSavedAtState(savedScene.updatedAt);

        const isCurrentPayload =
          contentRef.current === payloadContent && statusRef.current === payloadStatus;

        if (isCurrentPayload) {
          isDirtyRef.current = false;
          setIsDirtyState(false);
        }
      }
    },
    [],
  );

  const applySaveFailure = useCallback(
    (requestId: number, error: unknown): void => {
      if (!isMountedRef.current) {
        return;
      }

      if (requestId !== latestRequestRef.current) {
        return;
      }

      markDirty();
      setSaveErrorState(input.service.toUserErrorMessage(error));
    },
    [input.service, markDirty],
  );

  const runSaveCycle = useCallback(async (): Promise<void> => {
    if (!sceneRef.current || !isDirtyRef.current) {
      return;
    }

    const payload = {
      projectId: sceneRef.current.projectId,
      sceneId: sceneRef.current.id,
      content: contentRef.current,
      status: statusRef.current,
      updatedAt: new Date().toISOString(),
    };

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    inFlightRequestCountRef.current += 1;
    setIsSavingState(true);

    try {
      const savedScene = await input.service.saveScene(payload);
      applySaveSuccess(requestId, savedScene, payload.content, payload.status);
    } catch (error) {
      applySaveFailure(requestId, error);
    } finally {
      inFlightRequestCountRef.current = Math.max(inFlightRequestCountRef.current - 1, 0);
      if (isMountedRef.current && inFlightRequestCountRef.current === 0) {
        setIsSavingState(false);
      }
    }
  }, [applySaveFailure, applySaveSuccess, input.service]);

  const setContent = useCallback(
    (value: string): void => {
      contentRef.current = value;
      setContentState(value);
      setSaveErrorState(null);
      markDirty();
    },
    [markDirty],
  );

  const setStatus = useCallback(
    (value: SceneStatus): void => {
      statusRef.current = value;
      setStatusState(value);
      setSaveErrorState(null);
      markDirty();
    },
    [markDirty],
  );

  const retrySave = useCallback(async (): Promise<void> => {
    setSaveErrorState(null);
    await runSaveCycle();
  }, [runSaveCycle]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAutosaveTimeout();
    };
  }, [clearAutosaveTimeout]);

  useEffect(() => {
    const loadScene = async (): Promise<void> => {
      setLoadState('loading');
      setSaveErrorState(null);

      const result = await input.service.loadScene({
        projectId: input.projectId,
        sceneId: input.sceneId,
      });

      if (!isMountedRef.current) {
        return;
      }

      if (result.state === 'project-not-found') {
        applyUnavailableSceneState('project-not-found');
        return;
      }

      if (result.state === 'scene-not-found') {
        applyUnavailableSceneState('scene-not-found');
        return;
      }

      sceneRef.current = result.scene;
      contentRef.current = result.scene.content;
      statusRef.current = result.scene.status;
      isDirtyRef.current = false;
      latestRequestRef.current = 0;
      latestAppliedRequestRef.current = 0;
      inFlightRequestCountRef.current = 0;

      setScene(result.scene);
      setContentState(result.scene.content);
      setStatusState(result.scene.status);
      setIsDirtyState(false);
      setIsSavingState(false);
      setLastSavedAtState(result.scene.updatedAt);
      setPreviousSceneIdState(result.previousSceneId);
      setNextSceneIdState(result.nextSceneId);
      setLoadState('ready');
    };

    void loadScene();
  }, [applyUnavailableSceneState, input.projectId, input.sceneId, input.service]);

  useEffect(() => {
    if (loadState !== 'ready' || !isDirty) {
      return undefined;
    }

    clearAutosaveTimeout();
    autosaveTimeoutRef.current = setTimeout(() => {
      void runSaveCycle();
    }, autosaveDelayInMilliseconds);

    return clearAutosaveTimeout;
  }, [clearAutosaveTimeout, content, isDirty, loadState, runSaveCycle, status]);

  const wordCount = useMemo<number>(() => input.service.countWords(content), [content, input.service]);

  return {
    scene,
    content,
    status,
    wordCount,
    isDirty,
    isSaving,
    saveError,
    lastSavedAt,
    previousSceneId,
    nextSceneId,
    loadState,
    setContent,
    setStatus,
    retrySave,
  };
}
