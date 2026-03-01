import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import { GoalsPageClient } from '@/components/writing-session/goals-page-client';

const PROJECT_A = '8b5d05ea-3f90-4fd4-91cb-c18edfd3de71';

describe('GoalsPageClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders dashboard after mount', async () => {
    render(<GoalsPageClient projectId={PROJECT_A} projectTitle="My Novel" />);
    expect(await screen.findByText("Today's Progress")).toBeInTheDocument();
  });

  it('renders empty state for session history', async () => {
    render(<GoalsPageClient projectId={PROJECT_A} projectTitle="My Novel" />);
    expect(await screen.findByText('No sessions recorded yet.')).toBeInTheDocument();
  });

  it('renders weekly chart section', async () => {
    render(<GoalsPageClient projectId={PROJECT_A} projectTitle="My Novel" />);
    expect(await screen.findByText('This Week')).toBeInTheDocument();
  });

  it('daily goal form saves and updates persisted goal', async () => {
    const user = userEvent.setup();
    render(<GoalsPageClient projectId={PROJECT_A} projectTitle="My Novel" />);

    const input = await screen.findByLabelText('Daily word count goal');
    await user.clear(input);
    await user.type(input, '300');
    await user.click(screen.getByRole('button', { name: 'Save goal' }));

    await waitFor(() => {
      const repository = new LocalWritingSessionRepository(window.localStorage);
      const data = repository.getProjectData(PROJECT_A);
      expect(data.dailyGoal).toBe(300);
    });
  });

  it('start and stop session cycle persists a session', async () => {
    const user = userEvent.setup();
    render(<GoalsPageClient projectId={PROJECT_A} projectTitle="My Novel" />);

    await user.click(await screen.findByRole('button', { name: 'Start session' }));
    await user.click(screen.getByRole('button', { name: 'Stop session' }));

    await waitFor(() => {
      const repository = new LocalWritingSessionRepository(window.localStorage);
      const sessions = repository.listSessions(PROJECT_A);
      expect(sessions.length).toBeGreaterThan(0);
    });
  });
});
