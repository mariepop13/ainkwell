import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChapterService } from '@/application/project/chapter-service';
import type { ProjectService } from '@/application/project/project-service';
import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import type { WritingProject } from '@/domain/project/types';
import type { SceneStatus } from '@/domain/scene/types';

type LoadState = 'loading' | 'ready' | 'error' | 'not-found';

export type DragInfo = {
  sceneId: string;
  sourceChapterId: string;
  sourceIndex: number;
};

export type InlineEditPatch = {
  title?: string;
  status?: SceneStatus;
  synopsis?: string;
};

type DropTarget = {
  chapterId: string;
  index: number;
};

export type UseOutlineCanvasResult = {
  project: WritingProject | null;
  loadState: LoadState;
  editingSceneId: string | null;
  dragState: DragInfo | null;
  dropTarget: DropTarget | null;
  actionError: string | null;
  handleEditStart: (sceneId: string) => void;
  handleEditClose: () => void;
  handleInlineEdit: (sceneId: string, patch: InlineEditPatch) => void;
  handleDragStart: (info: DragInfo) => void;
  handleDragEnd: () => void;
  handleDragOver: (chapterId: string, index: number) => void;
  handleDrop: (targetChapterId: string, targetIndex: number) => void;
  handleDragLeave: () => void;
  handleCreateScene: (chapterId: string, title: string) => Promise<void>;
  handleAddChapter: (title: string) => Promise<void>;
};

type UseOutlineCanvasInput = {
  projectId: string;
  projectService: ProjectService;
  chapterService: ChapterService;
  sceneService: SceneEditorServicePort;
};

const inlineEditDebounceMs = 600;

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

function applyOptimisticReorder(
  project: WritingProject,
  sceneId: string,
  sourceChapterId: string,
  targetChapterId: string,
  targetIndex: number,
): WritingProject {
  const sourceChapter = project.chapters[sourceChapterId];
  const targetChapter = project.chapters[targetChapterId];
  if (!sourceChapter || !targetChapter) {
    return project;
  }

  const sourceOrder = sourceChapter.sceneOrder.filter((id) => id !== sceneId);
  const baseTargetOrder =
    targetChapterId === sourceChapterId ? sourceOrder : targetChapter.sceneOrder;
  const clampedIndex = Math.min(targetIndex, baseTargetOrder.length);
  const targetOrder = [
    ...baseTargetOrder.slice(0, clampedIndex),
    sceneId,
    ...baseTargetOrder.slice(clampedIndex),
  ];

  return {
    ...project,
    chapters: {
      ...project.chapters,
      [sourceChapterId]: { ...sourceChapter, sceneOrder: sourceOrder },
      [targetChapterId]: { ...targetChapter, sceneOrder: targetOrder },
    },
  };
}

export function useOutlineCanvas({
  projectId,
  projectService,
  chapterService,
  sceneService,
}: UseOutlineCanvasInput): UseOutlineCanvasResult {
  const [project, setProject] = useState<WritingProject | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragInfo | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inlineEditDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const loaded = await projectService.getProjectById(projectId);
      setProject(loaded);
      setLoadState(loaded ? 'ready' : 'not-found');
    } catch (error) {
      setProject(null);
      setActionError(toErrorMessage(error, 'Unable to load project.'));
      setLoadState('error');
    }
  }, [projectId, projectService]);

  useEffect(() => {
    let isMounted = true;
    setLoadState('loading');
    setActionError(null);

    void projectService.getProjectById(projectId).then((loaded) => {
      if (!isMounted) {
        return;
      }
      setProject(loaded);
      setLoadState(loaded ? 'ready' : 'not-found');
    }).catch((error) => {
      if (!isMounted) {
        return;
      }
      setProject(null);
      setActionError(toErrorMessage(error, 'Unable to load project.'));
      setLoadState('error');
    });

    return () => {
      isMounted = false;
    };
  }, [projectId, projectService]);

  const handleEditStart = useCallback((sceneId: string): void => {
    setEditingSceneId(sceneId);
  }, []);

  const handleEditClose = useCallback((): void => {
    setEditingSceneId(null);
  }, []);

  const handleInlineEdit = useCallback(
    (sceneId: string, patch: InlineEditPatch): void => {
      setProject((prev) => {
        if (!prev) {
          return prev;
        }
        const scene = prev.scenes[sceneId];
        if (!scene) {
          return prev;
        }
        return {
          ...prev,
          scenes: { ...prev.scenes, [sceneId]: { ...scene, ...patch } },
        };
      });

      if (inlineEditDebounceRef.current) {
        clearTimeout(inlineEditDebounceRef.current);
      }
      inlineEditDebounceRef.current = setTimeout(() => {
        void chapterService
          .updateSceneInline({ projectId, sceneId, ...patch })
          .catch((error) => {
            setActionError(toErrorMessage(error, 'Failed to update scene.'));
          });
      }, inlineEditDebounceMs);
    },
    [chapterService, projectId],
  );

  const handleDragStart = useCallback((info: DragInfo): void => {
    setDragState(info);
    setActionError(null);
  }, []);

  const handleDragEnd = useCallback((): void => {
    setDragState(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((chapterId: string, index: number): void => {
    setDropTarget({ chapterId, index });
  }, []);

  const handleDrop = useCallback(
    async (targetChapterId: string, targetIndex: number): Promise<void> => {
      if (!dragState || !project) {
        return;
      }

      const previousProject = project;
      const { sceneId, sourceChapterId } = dragState;

      setDragState(null);
      setDropTarget(null);
      setProject(
        applyOptimisticReorder(project, sceneId, sourceChapterId, targetChapterId, targetIndex),
      );

      try {
        await chapterService.reorderScene({
          projectId,
          sceneId,
          targetChapterId,
          targetIndex,
        });
      } catch (error) {
        setProject(previousProject);
        setActionError(toErrorMessage(error, 'Failed to reorder scene.'));
      }
    },
    [chapterService, dragState, project, projectId],
  );

  const handleDragLeave = useCallback((): void => {
    setDropTarget(null);
  }, []);

  const handleCreateScene = useCallback(
    async (chapterId: string, title: string): Promise<void> => {
      try {
        await sceneService.createScene({ projectId, title, chapterId });
        await reload();
      } catch (error) {
        setActionError(toErrorMessage(error, 'Failed to create scene.'));
      }
    },
    [projectId, reload, sceneService],
  );

  const handleAddChapter = useCallback(
    async (title: string): Promise<void> => {
      try {
        await chapterService.createChapter({ projectId, title });
        await reload();
      } catch (error) {
        setActionError(toErrorMessage(error, 'Failed to add chapter.'));
      }
    },
    [chapterService, projectId, reload],
  );

  return {
    project,
    loadState,
    editingSceneId,
    dragState,
    dropTarget,
    actionError,
    handleEditStart,
    handleEditClose,
    handleInlineEdit,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleDragLeave,
    handleCreateScene,
    handleAddChapter,
  };
}
