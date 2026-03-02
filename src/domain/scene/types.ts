import type { SceneBeat } from '@/domain/scene/schemas';

export type SceneStatus = 'draft' | 'revise' | 'final';

export interface Scene {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: SceneStatus;
  updatedAt: string;
  synopsis?: string;
  beats?: SceneBeat[];
}

export interface SceneSummary {
  id: string;
  projectId: string;
  title: string;
  status: SceneStatus;
  updatedAt: string;
}
