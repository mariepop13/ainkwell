import type { ReactElement } from 'react';

import { WorkspaceSceneList } from '@/components/scene/workspace-scene-list';

type WorkspacePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function WorkspacePage(props: WorkspacePageProps): Promise<ReactElement> {
  const params = await props.params;

  return <WorkspaceSceneList projectId={params.projectId} />;
}
