import { describe, it, expect } from 'vitest';

import { buildManuscript } from '@/application/manuscript/manuscript-service';
import type { WritingProject } from '@/domain/project/types';

const baseProject: WritingProject = {
  id: '550e8400-e29b-4d4a-a716-446655440000',
  title: 'My Novel',
  description: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { wordCount: 0, sceneCount: 0, chapterCount: 0 },
  settings: { language: 'en', targetWordCount: null },
  chapterOrder: [],
  chapters: {},
  scenes: {},
};

const chapterA = 'aaaaaaaa-0000-4000-8000-000000000001';
const chapterB = 'aaaaaaaa-0000-4000-8000-000000000002';
const sceneX = 'bbbbbbbb-0000-4000-8000-000000000001';
const sceneY = 'bbbbbbbb-0000-4000-8000-000000000002';

describe('buildManuscript', () => {
  it('returns projectTitle from the project', () => {
    const project = { ...baseProject, title: 'War and Peace' };
    const result = buildManuscript(project);
    expect(result.projectTitle).toBe('War and Peace');
  });

  it('returns empty chapters array when chapterOrder is empty', () => {
    const result = buildManuscript(baseProject);
    expect(result.chapters).toEqual([]);
  });

  it('returns 0 totalWordCount when all scenes are empty', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: [sceneX],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Scene 1',
          content: '',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.totalWordCount).toBe(0);
  });

  it('orders chapters by chapterOrder', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterB, chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Alpha',
          sceneOrder: [],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        [chapterB]: {
          id: chapterB,
          projectId: baseProject.id,
          title: 'Beta',
          sceneOrder: [],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters.map((c) => c.title)).toEqual(['Beta', 'Alpha']);
  });

  it('sets chapterIndex correctly starting at 0', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA, chapterB],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'First',
          sceneOrder: [],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        [chapterB]: {
          id: chapterB,
          projectId: baseProject.id,
          title: 'Second',
          sceneOrder: [],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters[0]?.chapterIndex).toBe(0);
    expect(result.chapters[1]?.chapterIndex).toBe(1);
  });

  it('orders scenes by chapter sceneOrder', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: [sceneY, sceneX],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Scene X',
          content: 'hello world',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        [sceneY]: {
          id: sceneY,
          projectId: baseProject.id,
          title: 'Scene Y',
          content: 'foo bar baz',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters[0]?.scenes.map((s) => s.title)).toEqual(['Scene Y', 'Scene X']);
  });

  it('computes wordCount per scene from content', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: [sceneX],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Scene X',
          content: 'one two three four five',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters[0]?.scenes[0]?.wordCount).toBe(5);
  });

  it('computes wordCount per chapter as sum of scene word counts', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: [sceneX, sceneY],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Scene X',
          content: 'one two three',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        [sceneY]: {
          id: sceneY,
          projectId: baseProject.id,
          title: 'Scene Y',
          content: 'four five',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters[0]?.wordCount).toBe(5);
  });

  it('computes totalWordCount as sum of chapter word counts', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA, chapterB],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: [sceneX],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        [chapterB]: {
          id: chapterB,
          projectId: baseProject.id,
          title: 'Chapter 2',
          sceneOrder: [sceneY],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Scene X',
          content: 'one two three',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        [sceneY]: {
          id: sceneY,
          projectId: baseProject.id,
          title: 'Scene Y',
          content: 'four five six seven',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.totalWordCount).toBe(7);
  });

  it('skips missing chapter references gracefully', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: ['non-existent-id', chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Real Chapter',
          sceneOrder: [],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.title).toBe('Real Chapter');
  });

  it('skips missing scene references within a chapter gracefully', () => {
    const project: WritingProject = {
      ...baseProject,
      chapterOrder: [chapterA],
      chapters: {
        [chapterA]: {
          id: chapterA,
          projectId: baseProject.id,
          title: 'Chapter 1',
          sceneOrder: ['ghost-scene-id', sceneX],
          wordCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
      scenes: {
        [sceneX]: {
          id: sceneX,
          projectId: baseProject.id,
          title: 'Real Scene',
          content: 'hello',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    };
    const result = buildManuscript(project);
    expect(result.chapters[0]?.scenes).toHaveLength(1);
    expect(result.chapters[0]?.scenes[0]?.title).toBe('Real Scene');
  });
});
