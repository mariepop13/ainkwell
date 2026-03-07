import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ManuscriptPageContent } from '@/components/manuscript/manuscript-page-content';
import { useManuscript } from '@/hooks/use-manuscript';
import type { Manuscript } from '@/domain/project/types';

vi.mock('@/hooks/use-manuscript');

const projectId = '550e8400-e29b-4d4a-a716-446655440000';

const chapterAId = 'aaaaaaaa-0000-4000-8000-000000000001';
const chapterBId = 'aaaaaaaa-0000-4000-8000-000000000002';
const sceneXId = 'bbbbbbbb-0000-4000-8000-000000000001';
const sceneYId = 'bbbbbbbb-0000-4000-8000-000000000002';

const manuscriptWithScenes: Manuscript = {
  projectTitle: 'The Great Novel',
  totalWordCount: 5,
  chapters: [
    {
      id: chapterAId,
      title: 'The Beginning',
      chapterIndex: 0,
      wordCount: 3,
      scenes: [
        { id: sceneXId, title: 'Dawn Breaks', content: 'The sun rose slowly.', wordCount: 3 },
      ],
    },
    {
      id: chapterBId,
      title: 'The Middle',
      chapterIndex: 1,
      wordCount: 2,
      scenes: [
        { id: sceneYId, title: 'Conflict Begins', content: 'Trouble arrives.', wordCount: 2 },
      ],
    },
  ],
};

const manuscriptWithEmptyChapter: Manuscript = {
  projectTitle: 'Empty Novel',
  totalWordCount: 0,
  chapters: [
    {
      id: chapterAId,
      title: 'Blank Chapter',
      chapterIndex: 0,
      wordCount: 0,
      scenes: [],
    },
  ],
};

describe('ManuscriptPageContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'loading', manuscript: null });

    render(<ManuscriptPageContent projectId={projectId} />);

    expect(screen.getByText('Loading manuscript...')).toBeInTheDocument();
  });

  it('renders project title after project loads', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    expect(screen.getByRole('heading', { level: 1, name: 'The Great Novel' })).toBeInTheDocument();
  });

  it('renders chapter headings in order', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings[0]).toHaveTextContent('1. The Beginning');
    expect(headings[1]).toHaveTextContent('2. The Middle');
  });

  it('renders scene titles and content', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Dawn Breaks' })).toBeInTheDocument();
    expect(screen.getByText('The sun rose slowly.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Conflict Begins' })).toBeInTheDocument();
    expect(screen.getByText('Trouble arrives.')).toBeInTheDocument();
  });

  it('renders total word count in the bar', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    expect(screen.getByText('Total: 5 words')).toBeInTheDocument();
  });

  it('renders Edit links for each scene pointing to scene editor', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute('href', `/workspace/${projectId}/scene/${sceneXId}`);
    expect(editLinks[1]).toHaveAttribute('href', `/workspace/${projectId}/scene/${sceneYId}`);
  });

  it('renders Back to project link', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithScenes });

    render(<ManuscriptPageContent projectId={projectId} />);

    const backLink = screen.getByRole('link', { name: 'Back to project' });
    expect(backLink).toHaveAttribute('href', `/workspace/${projectId}`);
  });

  it('shows not-found message when projectId is invalid UUID', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'not-found', manuscript: null });

    render(<ManuscriptPageContent projectId="non-existent-id" />);

    expect(screen.getByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('This project does not exist in local storage.')).toBeInTheDocument();
  });

  it('shows empty chapter message when chapter has no scenes', () => {
    vi.mocked(useManuscript).mockReturnValue({ loadState: 'ready', manuscript: manuscriptWithEmptyChapter });

    render(<ManuscriptPageContent projectId={projectId} />);

    expect(screen.getByText('No scenes in this chapter.')).toBeInTheDocument();
  });
});
