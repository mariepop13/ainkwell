import type { ReactElement } from 'react';

import { SceneEditorShell } from '@/components/scene/scene-editor-shell';

type ScenePageProps = {
  params: Promise<{
    projectId: string;
    sceneId: string;
  }>;
};

export default async function ScenePage(props: ScenePageProps): Promise<ReactElement> {
  const params = await props.params;

  return <SceneEditorShell projectId={params.projectId} sceneId={params.sceneId} />;
}
