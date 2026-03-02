import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';

export const SEED_PROJECT_TITLE = 'My Test Novel';

const SEED_DAILY_GOAL = 500;
const MILLISECONDS_PER_DAY = 86_400_000;

type SessionSeedData = {
  id: string;
  daysAgo: number;
  durationSeconds: number;
  wordsWritten: number;
};

const SESSION_SEEDS: SessionSeedData[] = [
  { id: 'seed-session-1', daysAgo: 1, durationSeconds: 1500, wordsWritten: 350 },
  { id: 'seed-session-2', daysAgo: 3, durationSeconds: 900, wordsWritten: 200 },
  { id: 'seed-session-3', daysAgo: 5, durationSeconds: 2100, wordsWritten: 450 },
];

function seedSessions(sessionRepo: LocalWritingSessionRepository, projectId: string): void {
  const now = Date.now();
  for (const seed of SESSION_SEEDS) {
    const startedAt = now - seed.daysAgo * MILLISECONDS_PER_DAY;
    const durationMilliseconds = seed.durationSeconds * 1000;
    sessionRepo.saveSession({
      id: seed.id,
      projectId,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(startedAt + durationMilliseconds).toISOString(),
      durationSeconds: seed.durationSeconds,
      wordsWritten: seed.wordsWritten,
    });
  }
}

export async function seedDevData(): Promise<void> {
  window.localStorage.clear();

  const projectRepo = new LocalProjectRepository();
  const project = await projectRepo.create({
    title: SEED_PROJECT_TITLE,
    description: 'Demo project with preloaded seed data.',
    settings: { language: 'en', targetWordCount: 80000 },
  });

  const firstChapterId = project.chapterOrder[0];
  const firstChapter = project.chapters[firstChapterId];
  const firstSceneId = firstChapter.sceneOrder[0];

  await projectRepo.saveScene({
    projectId: project.id,
    sceneId: firstSceneId,
    content:
      'Soft light filtered through the half-closed shutters, drawing golden stripes across the dusty floorboards. ' +
      'Elias sat up in bed, still groggy, and reached for the letter on his nightstand. ' +
      'The envelope bore no return address.',
    status: 'draft',
    updatedAt: new Date().toISOString(),
    synopsis: 'Introduction of the main character.',
    beats: [
      { id: 'beat-wakeup', content: 'Elias wakes up in his room', type: 'setup' },
      { id: 'beat-letter-discovery', content: 'He finds a letter with no sender', type: 'revelation' },
    ],
  });

  await projectRepo.createScene({ projectId: project.id, title: 'The Encounter', chapterId: firstChapterId });

  const chapter2 = await projectRepo.createChapter({ projectId: project.id, title: 'Shadows of the Past' });

  await projectRepo.createScene({ projectId: project.id, title: 'A Buried Secret', chapterId: chapter2.id });

  const sessionRepo = new LocalWritingSessionRepository(window.localStorage);
  sessionRepo.setDailyGoal({ projectId: project.id, goal: SEED_DAILY_GOAL });
  seedSessions(sessionRepo, project.id);
}
