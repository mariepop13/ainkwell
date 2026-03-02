import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';

const SEED_PROJECT_TITLE = 'Mon Roman de Test';

export async function seedDevData(): Promise<void> {
  window.localStorage.clear();

  const projectRepo = new LocalProjectRepository();
  const project = await projectRepo.create({
    title: SEED_PROJECT_TITLE,
    description: 'Projet de démonstration avec données préchargées.',
    settings: { language: 'fr', targetWordCount: 80000 },
  });

  const firstChapterId = project.chapterOrder[0];
  const firstChapter = project.chapters[firstChapterId];
  const firstSceneId = firstChapter.sceneOrder[0];

  await projectRepo.saveScene({
    projectId: project.id,
    sceneId: firstSceneId,
    content:
      'La lumière filtrait doucement à travers les volets mi-clos, dessinant des raies dorées sur le plancher poussiéreux. ' +
      'Elias se redressa sur son lit, encore groggy, et saisit la lettre posée sur sa table de nuit. ' +
      "L'enveloppe ne portait pas d'adresse d'expéditeur.",
    status: 'draft',
    updatedAt: new Date().toISOString(),
    synopsis: 'Introduction du personnage principal.',
    beats: [
      { id: 'beat-wakeup', content: 'Elias se réveille dans sa chambre', type: 'setup' },
      { id: 'beat-letter-discovery', content: 'Il découvre une lettre sans expéditeur', type: 'revelation' },
    ],
  });

  await projectRepo.createScene({
    projectId: project.id,
    title: 'La Rencontre',
    chapterId: firstChapterId,
  });

  const chapter2 = await projectRepo.createChapter({
    projectId: project.id,
    title: 'Les Ombres du Passé',
  });

  await projectRepo.createScene({
    projectId: project.id,
    title: 'Un Secret Enfoui',
    chapterId: chapter2.id,
  });

  const sessionRepo = new LocalWritingSessionRepository(window.localStorage);
  sessionRepo.setDailyGoal({ projectId: project.id, goal: 500 });

  const now = Date.now();
  const millisecondsPerDay = 86_400_000;

  sessionRepo.saveSession({
    id: 'seed-session-1',
    projectId: project.id,
    startedAt: new Date(now - millisecondsPerDay).toISOString(),
    endedAt: new Date(now - millisecondsPerDay + 1_500_000).toISOString(),
    durationSeconds: 1500,
    wordsWritten: 350,
  });

  sessionRepo.saveSession({
    id: 'seed-session-2',
    projectId: project.id,
    startedAt: new Date(now - 3 * millisecondsPerDay).toISOString(),
    endedAt: new Date(now - 3 * millisecondsPerDay + 900_000).toISOString(),
    durationSeconds: 900,
    wordsWritten: 200,
  });

  sessionRepo.saveSession({
    id: 'seed-session-3',
    projectId: project.id,
    startedAt: new Date(now - 5 * millisecondsPerDay).toISOString(),
    endedAt: new Date(now - 5 * millisecondsPerDay + 2_100_000).toISOString(),
    durationSeconds: 2100,
    wordsWritten: 450,
  });
}
