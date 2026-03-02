import { describe, it, expect, beforeEach } from 'vitest';
import { seedDevData, SEED_PROJECT_TITLE } from '@/lib/seed-dev-data';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';

const EXPECTED_DAILY_GOAL = 500;

describe('seedDevData', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates exactly one project', async () => {
    await seedDevData();
    const projects = await new LocalProjectRepository().list();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe(SEED_PROJECT_TITLE);
  });

  it('project has two chapters', async () => {
    await seedDevData();
    const [project] = await new LocalProjectRepository().list();
    expect(project.chapterOrder).toHaveLength(2);
  });

  it('creates writing sessions', async () => {
    await seedDevData();
    const [project] = await new LocalProjectRepository().list();
    const sessions = new LocalWritingSessionRepository(window.localStorage).listSessions(project.id);
    expect(sessions.length).toBeGreaterThanOrEqual(3);
  });

  it('sets daily goal to 500', async () => {
    await seedDevData();
    const [project] = await new LocalProjectRepository().list();
    const data = new LocalWritingSessionRepository(window.localStorage).getProjectData(project.id);
    expect(data.dailyGoal).toBe(EXPECTED_DAILY_GOAL);
  });

  it('is idempotent: seeding twice keeps one project', async () => {
    await seedDevData();
    await seedDevData();
    const projects = await new LocalProjectRepository().list();
    expect(projects).toHaveLength(1);
  });

  it('creates scenes with content in the correct chapters', async () => {
    await seedDevData();
    const [project] = await new LocalProjectRepository().list();

    const chapter1 = project.chapters[project.chapterOrder[0]];
    const chapter2 = project.chapters[project.chapterOrder[1]];

    expect(chapter1.sceneOrder.length).toBeGreaterThanOrEqual(2);
    expect(chapter2.sceneOrder.length).toBeGreaterThanOrEqual(1);

    const firstScene = project.scenes[chapter1.sceneOrder[0]];
    expect(firstScene.content.length).toBeGreaterThan(0);
    expect(firstScene.synopsis).toBeTruthy();
    expect(firstScene.beats?.length).toBeGreaterThan(0);
  });
});
