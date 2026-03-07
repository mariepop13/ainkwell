import type { ReactElement } from 'react';
import { ManuscriptPageContent } from '@/components/manuscript/manuscript-page-content';

type ManuscriptPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ManuscriptPage(props: ManuscriptPageProps): Promise<ReactElement> {
  const { projectId } = await props.params;
  return <ManuscriptPageContent projectId={projectId} />;
}
