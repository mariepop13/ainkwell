import type { ReactElement } from 'react';

import { SceneEditorShell } from '@/components/scene/scene-editor-shell';

type ScenePageProps = {
  params: Promise<{
    projectId: string;
    sceneId: string;
  }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function ScenePage(props: ScenePageProps): Promise<ReactElement> {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const backTo = searchParams.from === 'outline' ? 'outline' : 'workspace';

  return <SceneEditorShell projectId={params.projectId} sceneId={params.sceneId} backTo={backTo} />;
}
