import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkspaceProjectPage from '@/app/workspace/[projectId]/page';
import { LocalProjectRepository } from '@/data/project/local-project-repository';

const mockedUseParams = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: mockedUseParams,
}));

describe('WorkspaceProjectPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders project scenes with open links', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Project Hub',
      description: 'Scene overview',
    });

    mockedUseParams.mockReturnValue({ projectId: project.id });

    render(<WorkspaceProjectPage />);

    expect(await screen.findByText('Project Hub')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scenes' })).toBeInTheDocument();
    expect(screen.getByText('Scene 1')).toBeInTheDocument();

    const openLink = screen.getByRole('link', { name: 'Open' });
    expect(openLink).toHaveAttribute('href', `/workspace/${project.id}/scene/${project.sceneOrder[0]}`);
  });

  it('creates a scene from the project hub', async () => {
    const user = userEvent.setup();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Project Create Scene',
      description: '',
    });

    mockedUseParams.mockReturnValue({ projectId: project.id });

    render(<WorkspaceProjectPage />);
    await screen.findByText('Project Create Scene');

    await user.click(screen.getByRole('button', { name: 'Create scene' }));

    await waitFor(() => {
      expect(screen.getByText('Scene 2')).toBeInTheDocument();
    });
  });

  it('shows invalid id message when project id is not valid', async () => {
    mockedUseParams.mockReturnValue({ projectId: 'invalid-id' });

    render(<WorkspaceProjectPage />);

    expect(await screen.findByText('Invalid project id')).toBeInTheDocument();
  });
});
