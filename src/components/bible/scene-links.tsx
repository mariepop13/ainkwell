'use client';

import { type FormEvent, type ReactElement, useMemo, useState } from 'react';
import type {
  BibleEntity,
  BibleSceneLink,
  ProjectScene,
  SaveBibleSceneLinkInput,
} from '@/domain/bible/types';

interface SceneLinksProps {
  projectId: string;
  entities: BibleEntity[];
  scenes: ProjectScene[];
  sceneLinks: BibleSceneLink[];
  selectedEntityId: string | null;
  errorMessage: string | null;
  onSave: (input: SaveBibleSceneLinkInput) => void | Promise<void>;
  onDelete: (sceneLinkId: string) => void | Promise<void>;
}

export function SceneLinks({
  projectId,
  entities,
  scenes,
  sceneLinks,
  selectedEntityId,
  errorMessage,
  onSave,
  onDelete,
}: SceneLinksProps): ReactElement {
  const [entityId, setEntityId] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [notes, setNotes] = useState('');
  const entitiesById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities],
  );
  const entityIds = useMemo(() => new Set(entities.map((entity) => entity.id)), [entities]);
  const scenesById = useMemo(
    () => new Map(scenes.map((scene) => [scene.id, scene])),
    [scenes],
  );
  const sceneIds = useMemo(() => new Set(scenes.map((scene) => scene.id)), [scenes]);
  const visibleSceneLinks = selectedEntityId
    ? sceneLinks.filter((sceneLink) => sceneLink.entityId === selectedEntityId)
    : sceneLinks;
  const resolvedEntityId = useMemo(() => {
    if (entityIds.has(entityId)) {
      return entityId;
    }
    return selectedEntityId ?? entities[0]?.id ?? '';
  }, [entities, entityId, entityIds, selectedEntityId]);
  const resolvedSceneId = useMemo(() => {
    if (sceneIds.has(sceneId)) {
      return sceneId;
    }
    return scenes[0]?.id ?? '';
  }, [sceneId, sceneIds, scenes]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSave({
      projectId,
      entityId: resolvedEntityId,
      sceneId: resolvedSceneId,
      notes,
    });
    setNotes('');
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h3 className="text-base font-bold">Scene links</h3>
      {errorMessage ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{errorMessage}</p> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="scene-link-entity">
            Entity
          </label>
          <select
            id="scene-link-entity"
            value={resolvedEntityId}
            onChange={(event) => setEntityId(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={entities.length === 0}
          >
            {entities.map((entity) => (
              <option value={entity.id} key={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="scene-link-scene">
            Scene
          </label>
          <select
            id="scene-link-scene"
            value={resolvedSceneId}
            onChange={(event) => setSceneId(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={scenes.length === 0}
          >
            {scenes.map((scene) => (
              <option value={scene.id} key={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold" htmlFor="scene-link-notes">
            Notes
          </label>
          <input
            id="scene-link-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={500}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            disabled={entities.length === 0 || scenes.length === 0}
          >
            Save scene link
          </button>
        </div>
      </form>
      <ul className="space-y-2">
        {visibleSceneLinks.map((sceneLink) => (
          <li key={sceneLink.id} className="rounded-md border px-3 py-2">
            <p className="text-sm">
              <span className="font-semibold">{entitiesById.get(sceneLink.entityId)?.name ?? sceneLink.entityId}</span> in{' '}
              <span className="font-semibold">{scenesById.get(sceneLink.sceneId)?.title ?? sceneLink.sceneId}</span>
            </p>
            {sceneLink.notes ? <p className="text-xs text-muted-foreground">{sceneLink.notes}</p> : null}
            <button
              type="button"
              onClick={() => void onDelete(sceneLink.id)}
              className="mt-2 text-xs font-semibold text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {visibleSceneLinks.length === 0 ? <p className="text-sm text-muted-foreground">No scene links found.</p> : null}
    </section>
  );
}
