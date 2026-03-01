import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkspaceProjectPage from '@/app/workspace/[projectId]/page';
import { LocalProjectRepository } from '@/data/project/local-project-repository';

const mockedUseParams = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: mockedUseParams,
}));

const getFirstSceneId = (project: {
  chapterOrder: string[];
  chapters: Record<string, { sceneOrder: string[] }>;
}): string | undefined => {
  const firstChapterId = project.chapterOrder[0];
  if (!firstChapterId) return undefined;
  return project.chapters[firstChapterId]?.sceneOrder[0];
};

describe('WorkspaceProjectPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders chapters section with scene open links', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Project Hub',
      description: 'Scene overview',
    });

    mockedUseParams.mockReturnValue({ projectId: project.id });

    render(<WorkspaceProjectPage />);

    expect(await screen.findByText('Project Hub')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chapters' })).toBeInTheDocument();
    expect(screen.getByText('Scene 1')).toBeInTheDocument();

    const openLink = screen.getByRole('link', { name: 'Open' });
    const firstSceneId = getFirstSceneId(project);
    expect(openLink).toHaveAttribute('href', `/workspace/${project.id}/scene/${firstSceneId}`);
  });

  it('creates a chapter from the project hub', async () => {
    const user = userEvent.setup();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Project Create Chapter',
      description: '',
    });

    mockedUseParams.mockReturnValue({ projectId: project.id });

    render(<WorkspaceProjectPage />);
    await screen.findByText('Project Create Chapter');

    await user.click(screen.getByRole('button', { name: 'Add Chapter' }));

    const titleInput = await screen.findByPlaceholderText('Chapter title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Act One');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findAllByText('Act One')).not.toHaveLength(0);
  });

  it('shows invalid id message when project id is not valid', async () => {
    mockedUseParams.mockReturnValue({ projectId: 'invalid-id' });

    render(<WorkspaceProjectPage />);

    expect(await screen.findByText('Invalid project id')).toBeInTheDocument();
  });
});
