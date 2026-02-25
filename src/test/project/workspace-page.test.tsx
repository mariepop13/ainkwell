import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePage from '@/app/workspace/page';

describe('WorkspacePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  it('shows empty state on first render', async () => {
    render(<WorkspacePage />);

    expect(await screen.findByTestId('workspace-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-loading')).not.toBeInTheDocument();
  });

  it('creates a project through the UI flow', async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await screen.findByTestId('workspace-empty');
    await user.type(screen.getByLabelText('Title'), 'Project One');
    await user.type(screen.getByLabelText('Description'), 'My first project');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByText('Project One')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-empty')).not.toBeInTheDocument();
  });

  it('edits an existing project', async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await screen.findByTestId('workspace-empty');
    await user.type(screen.getByLabelText('Title'), 'Draft Name');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    const projectTitle = await screen.findByText('Draft Name');
    const projectCard = projectTitle.closest('article');
    expect(projectCard).toBeTruthy();

    if (!projectCard) {
      throw new Error('Project card should exist');
    }

    await user.click(within(projectCard).getByRole('button', { name: 'Edit' }));

    const scopedQueries = within(projectCard);
    const editTitleInput = scopedQueries.getByLabelText('Title');
    await user.clear(editTitleInput);
    await user.type(editTitleInput, 'Revised Name');
    await user.click(scopedQueries.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Revised Name')).toBeInTheDocument();
  });

  it('deletes a project from the list', async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await screen.findByTestId('workspace-empty');
    await user.type(screen.getByLabelText('Title'), 'Delete target');
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    const projectTitle = await screen.findByText('Delete target');
    const projectCard = projectTitle.closest('article');
    expect(projectCard).toBeTruthy();

    if (!projectCard) {
      throw new Error('Project card should exist');
    }

    await user.click(within(projectCard).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Delete target')).not.toBeInTheDocument();
    });
  });

  it('keeps projects after remount through local storage persistence', async () => {
    const user = userEvent.setup();
    const firstRender = render(<WorkspacePage />);

    await screen.findByTestId('workspace-empty');
    await user.type(screen.getByLabelText('Title'), 'Persistent project');
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Persistent project')).toBeInTheDocument();

    firstRender.unmount();
    render(<WorkspacePage />);

    expect(await screen.findByText('Persistent project')).toBeInTheDocument();
  });
});
