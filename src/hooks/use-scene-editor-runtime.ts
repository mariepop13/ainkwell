import type { MutableRefObject } from 'react';

import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import type { Scene, SceneStatus } from '@/domain/scene/types';

export type SceneEditorLoadState =
  | 'loading'
  | 'ready'
  | 'project-not-found'
  | 'scene-not-found'
  | 'error';

export type SceneViewState = {
  scene: Scene | null;
  content: string;
  status: SceneStatus;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  previousSceneId: string | null;
  nextSceneId: string | null;
  loadState: SceneEditorLoadState;
};

export type SceneRuntimeRefs = {
  sceneRef: MutableRefObject<Scene | null>;
  contentRef: MutableRefObject<string>;
  statusRef: MutableRefObject<SceneStatus>;
  isDirtyRef: MutableRefObject<boolean>;
  latestRequestRef: MutableRefObject<number>;
  latestAppliedRequestRef: MutableRefObject<number>;
  inFlightRequestCountRef: MutableRefObject<number>;
  isMountedRef: MutableRefObject<boolean>;
  autosaveTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

export type ViewStateSetter = (patch: Partial<SceneViewState>) => void;
export type ViewStateReplacer = (state: SceneViewState) => void;

export type SavePayload = {
  projectId: string;
  sceneId: string;
  content: string;
  status: SceneStatus;
  updatedAt: string;
};

type SaveSuccessInput = {
  runtimeRefs: SceneRuntimeRefs;
  patchViewState: ViewStateSetter;
  requestId: number;
  payload: SavePayload;
  savedScene: Scene;
  wordsDelta?: number;
  onWordsSaved?: (delta: number) => void;
};

type SaveFailureInput = {
  runtimeRefs: SceneRuntimeRefs;
  patchViewState: ViewStateSetter;
  service: SceneEditorServicePort;
  requestId: number;
  error: unknown;
};

type ApplyLoadedInput = {
  runtimeRefs: SceneRuntimeRefs;
  replaceViewState: ViewStateReplacer;
  scene: Scene;
  previousSceneId: string | null;
  nextSceneId: string | null;
};

export const initialViewState: SceneViewState = {
  scene: null,
  content: '',
  status: 'draft',
  isDirty: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  previousSceneId: null,
  nextSceneId: null,
  loadState: 'loading',
};

export const assignRef = <T>(ref: MutableRefObject<T>, value: T): void => {
  ref.current = value;
};

export const incrementRef = (ref: MutableRefObject<number>): number => {
  ref.current += 1;
  return ref.current;
};

export const decrementRef = (ref: MutableRefObject<number>): number => {
  ref.current = Math.max(ref.current - 1, 0);
  return ref.current;
};

export const clearAutosaveTimeout = (
  autosaveTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void => {
  if (!autosaveTimeoutRef.current) {
    return;
  }

  clearTimeout(autosaveTimeoutRef.current);
  assignRef(autosaveTimeoutRef, null);
};

export const resetRuntimeRefs = (runtimeRefs: SceneRuntimeRefs): void => {
  assignRef(runtimeRefs.sceneRef, null);
  assignRef(runtimeRefs.contentRef, '');
  assignRef(runtimeRefs.statusRef, 'draft');
  assignRef(runtimeRefs.isDirtyRef, false);
  assignRef(runtimeRefs.latestRequestRef, 0);
  assignRef(runtimeRefs.latestAppliedRequestRef, 0);
  assignRef(runtimeRefs.inFlightRequestCountRef, 0);
};

export const buildUnavailableViewState = (
  loadState: Extract<SceneEditorLoadState, 'project-not-found' | 'scene-not-found'>,
): SceneViewState => ({
  ...initialViewState,
  loadState,
});

export const markDirty = (runtimeRefs: SceneRuntimeRefs, patchViewState: ViewStateSetter): void => {
  assignRef(runtimeRefs.isDirtyRef, true);
  patchViewState({ isDirty: true });
};

export const applyUnavailableScene = (
  runtimeRefs: SceneRuntimeRefs,
  replaceViewState: ViewStateReplacer,
  loadState: Extract<SceneEditorLoadState, 'project-not-found' | 'scene-not-found'>,
): void => {
  resetRuntimeRefs(runtimeRefs);
  replaceViewState(buildUnavailableViewState(loadState));
};

export const applyLoadedScene = (input: ApplyLoadedInput): void => {
  const { runtimeRefs, replaceViewState, scene, previousSceneId, nextSceneId } = input;

  assignRef(runtimeRefs.sceneRef, scene);
  assignRef(runtimeRefs.contentRef, scene.content);
  assignRef(runtimeRefs.statusRef, scene.status);
  assignRef(runtimeRefs.isDirtyRef, false);
  assignRef(runtimeRefs.latestRequestRef, 0);
  assignRef(runtimeRefs.latestAppliedRequestRef, 0);
  assignRef(runtimeRefs.inFlightRequestCountRef, 0);

  replaceViewState({
    scene,
    content: scene.content,
    status: scene.status,
    isDirty: false,
    isSaving: false,
    saveError: null,
    lastSavedAt: scene.updatedAt,
    previousSceneId,
    nextSceneId,
    loadState: 'ready',
  });
};

export const createSavePayload = (runtimeRefs: SceneRuntimeRefs): SavePayload | null => {
  if (!runtimeRefs.sceneRef.current) {
    return null;
  }

  return {
    projectId: runtimeRefs.sceneRef.current.projectId,
    sceneId: runtimeRefs.sceneRef.current.id,
    content: runtimeRefs.contentRef.current,
    status: runtimeRefs.statusRef.current,
    updatedAt: new Date().toISOString(),
  };
};

export const applySaveSuccess = (input: SaveSuccessInput): void => {
  const { runtimeRefs, patchViewState, requestId, payload, savedScene, wordsDelta, onWordsSaved } = input;
  if (!runtimeRefs.isMountedRef.current || requestId < runtimeRefs.latestAppliedRequestRef.current) {
    return;
  }

  if (requestId !== runtimeRefs.latestRequestRef.current) {
    return;
  }

  assignRef(runtimeRefs.latestAppliedRequestRef, requestId);
  patchViewState({ saveError: null });
  assignRef(runtimeRefs.sceneRef, savedScene);
  patchViewState({ scene: savedScene, lastSavedAt: savedScene.updatedAt });

  const payloadStillCurrent =
    runtimeRefs.contentRef.current === payload.content && runtimeRefs.statusRef.current === payload.status;

  if (!payloadStillCurrent) {
    return;
  }

  if (onWordsSaved && wordsDelta !== undefined && wordsDelta !== 0) {
    onWordsSaved(wordsDelta);
  }

  assignRef(runtimeRefs.isDirtyRef, false);
  patchViewState({ isDirty: false });
};

export const applySaveFailure = (input: SaveFailureInput): void => {
  const { runtimeRefs, patchViewState, service, requestId, error } = input;
  if (!runtimeRefs.isMountedRef.current || requestId !== runtimeRefs.latestRequestRef.current) {
    return;
  }

  markDirty(runtimeRefs, patchViewState);
  patchViewState({ saveError: service.toUserErrorMessage(error) });
};
