import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OutlineCanvas } from '@/components/outline/outline-canvas';
import type { WritingProject } from '@/domain/project/types';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const chapterId1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const chapterId2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sceneId1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const sceneId2 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const createProject = (overrides: Partial<WritingProject> = {}): WritingProject => ({
  id: projectId,
  title: 'Test Novel',
  description: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { wordCount: 10, sceneCount: 2, chapterCount: 2 },
  settings: { language: 'en', targetWordCount: null },
  chapterOrder: [chapterId1, chapterId2],
  chapters: {
    [chapterId1]: {
      id: chapterId1,
      projectId,
      title: 'Act One',
      sceneOrder: [sceneId1],
      wordCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    [chapterId2]: {
      id: chapterId2,
      projectId,
      title: 'Act Two',
      sceneOrder: [sceneId2],
      wordCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
  scenes: {
    [sceneId1]: {
      id: sceneId1,
      projectId,
      title: 'The Beginning',
      content: 'Once upon',
      status: 'draft',
      updatedAt: '2026-01-01T00:00:00.000Z',
      synopsis: 'How it all starts.',
    },
    [sceneId2]: {
      id: sceneId2,
      projectId,
      title: 'The Climax',
      content: 'A twist',
      status: 'final',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
  ...overrides,
});

const defaultProps = {
  projectId,
  editingSceneId: null,
  dropTarget: null,
  actionError: null,
  onEditStart: vi.fn(),
  onEditClose: vi.fn(),
  onInlineEdit: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDragOver: vi.fn(),
  onDrop: vi.fn(),
  onDragLeave: vi.fn(),
  onKeyboardReorder: vi.fn(),
  onCreateScene: vi.fn().mockResolvedValue(undefined),
  onAddChapter: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OutlineCanvas', () => {
  it('renders one ChapterColumn per chapter in chapterOrder', () => {
    render(<OutlineCanvas project={createProject()} {...defaultProps} />);

    expect(screen.getByText('Act One')).toBeInTheDocument();
    expect(screen.getByText('Act Two')).toBeInTheDocument();
  });

  it('renders scene cards with title and status badge', () => {
    render(<OutlineCanvas project={createProject()} {...defaultProps} />);

    expect(screen.getByText('The Beginning')).toBeInTheDocument();
    expect(screen.getByText('The Climax')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('shows empty state when project has no chapters', () => {
    const emptyProject = createProject({ chapterOrder: [], chapters: {}, scenes: {} });

    render(<OutlineCanvas project={emptyProject} {...defaultProps} />);

    expect(screen.getByText(/No chapters yet/i)).toBeInTheDocument();
  });

  it('shows inline editor when a card is clicked', async () => {
    const user = userEvent.setup();
    const onEditStart = vi.fn();

    render(
      <OutlineCanvas
        project={createProject()}
        {...defaultProps}
        onEditStart={onEditStart}
        editingSceneId={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Scene: The Beginning/i }));

    expect(onEditStart).toHaveBeenCalledWith(sceneId1);
  });

  it('fires onInlineEdit callback when title is changed in inline editor', async () => {
    const user = userEvent.setup();
    const onInlineEdit = vi.fn();

    render(
      <OutlineCanvas
        project={createProject()}
        {...defaultProps}
        onInlineEdit={onInlineEdit}
        editingSceneId={sceneId1}
      />,
    );

    const titleInput = screen.getByRole('textbox', { name: /Scene title/i });
    await user.clear(titleInput);
    await user.type(titleInput, 'New Title');

    expect(onInlineEdit).toHaveBeenCalledWith(
      sceneId1,
      expect.objectContaining({ title: expect.stringContaining('N') }),
    );
  });

  it('navigates to scene editor when Open link is clicked', () => {
    render(
      <OutlineCanvas
        project={createProject()}
        {...defaultProps}
        editingSceneId={sceneId1}
      />,
    );

    const openLink = screen.getByRole('link', { name: /Open full editor/i });
    expect(openLink).toHaveAttribute('href', `/workspace/${projectId}/scene/${sceneId1}?from=outline`);
  });

  it('shows actionError when prop is set', () => {
    render(
      <OutlineCanvas
        project={createProject()}
        {...defaultProps}
        actionError="Something went wrong."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });
});
