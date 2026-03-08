import type { Manuscript, ManuscriptChapter, ManuscriptScene, WritingProject } from '@/domain/project/types';

function countWords(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

function buildManuscriptScene(scene: { id: string; title: string; content: string }): ManuscriptScene {
  return {
    id: scene.id,
    title: scene.title,
    content: scene.content,
    wordCount: countWords(scene.content),
  };
}

function buildManuscriptChapter(
  chapterId: string,
  chapterIndex: number,
  project: WritingProject,
): ManuscriptChapter | null {
  const chapter = project.chapters[chapterId];
  if (!chapter) return null;

  const scenes = chapter.sceneOrder
    .map((sceneId) => project.scenes[sceneId])
    .filter((scene): scene is NonNullable<typeof scene> => Boolean(scene))
    .map(buildManuscriptScene);

  const wordCount = scenes.reduce((total, scene) => total + scene.wordCount, 0);

  return {
    id: chapterId,
    title: chapter.title,
    chapterIndex,
    scenes,
    wordCount,
  };
}

export function buildManuscript(project: WritingProject): Manuscript {
  const chapters = project.chapterOrder
    .map((chapterId, index) => buildManuscriptChapter(chapterId, index, project))
    .filter((chapter): chapter is ManuscriptChapter => chapter !== null);

  const totalWordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);

  return {
    projectTitle: project.title,
    chapters,
    totalWordCount,
  };
}
