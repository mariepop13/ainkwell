'use client';

import { type FormEvent, type ReactElement } from 'react';
import { useSceneLinksEditorState } from '@/components/bible/scene-links-state';
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

interface SceneLinkFormProps {
  entities: BibleEntity[];
  scenes: ProjectScene[];
  resolvedEntityId: string;
  resolvedSceneId: string;
  notes: string;
  onEntityChange: (value: string) => void;
  onSceneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

interface SceneLinksSectionProps {
  entities: BibleEntity[];
  scenes: ProjectScene[];
  visibleSceneLinks: BibleSceneLink[];
  entitiesById: Map<string, BibleEntity>;
  scenesById: Map<string, ProjectScene>;
  resolvedEntityId: string;
  resolvedSceneId: string;
  notes: string;
  errorMessage: string | null;
  onEntityChange: (value: string) => void;
  onSceneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (sceneLinkId: string) => void | Promise<void>;
}

function SectionError({ message }: { message: string | null }): ReactElement | null {
  if (!message) {
    return null;
  }

  return <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{message}</p>;
}

function SelectField({
  id,
  label,
  value,
  disabled,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        disabled={disabled}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotesField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-semibold" htmlFor="scene-link-notes">
        Notes
      </label>
      <input
        id="scene-link-notes"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        maxLength={500}
      />
    </div>
  );
}

function SceneLinkForm({
  entities,
  scenes,
  resolvedEntityId,
  resolvedSceneId,
  notes,
  onEntityChange,
  onSceneChange,
  onNotesChange,
  onSubmit,
}: SceneLinkFormProps): ReactElement {
  const entityOptions = entities.map((entity) => ({ value: entity.id, label: entity.name }));
  const sceneOptions = scenes.map((scene) => ({ value: scene.id, label: scene.title }));

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <SelectField
        id="scene-link-entity"
        label="Entity"
        value={resolvedEntityId}
        options={entityOptions}
        disabled={entities.length === 0}
        onChange={onEntityChange}
      />
      <SelectField
        id="scene-link-scene"
        label="Scene"
        value={resolvedSceneId}
        options={sceneOptions}
        disabled={scenes.length === 0}
        onChange={onSceneChange}
      />
      <NotesField value={notes} onChange={onNotesChange} />
      <SceneLinkSubmitButton disabled={entities.length === 0 || scenes.length === 0} />
    </form>
  );
}

function SceneLinkSubmitButton({ disabled }: { disabled: boolean }): ReactElement {
  return (
    <div className="md:col-span-2">
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        disabled={disabled}
      >
        Save scene link
      </button>
    </div>
  );
}

function SceneLinksSection({
  entities,
  scenes,
  visibleSceneLinks,
  entitiesById,
  scenesById,
  resolvedEntityId,
  resolvedSceneId,
  notes,
  errorMessage,
  onEntityChange,
  onSceneChange,
  onNotesChange,
  onSubmit,
  onDelete,
}: SceneLinksSectionProps): ReactElement {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h3 className="text-base font-bold">Scene links</h3>
      <SectionError message={errorMessage} />
      <SceneLinkForm
        entities={entities}
        scenes={scenes}
        resolvedEntityId={resolvedEntityId}
        resolvedSceneId={resolvedSceneId}
        notes={notes}
        onEntityChange={onEntityChange}
        onSceneChange={onSceneChange}
        onNotesChange={onNotesChange}
        onSubmit={onSubmit}
      />
      <SceneLinksList
        links={visibleSceneLinks}
        entitiesById={entitiesById}
        scenesById={scenesById}
        onDelete={onDelete}
      />
    </section>
  );
}

function SceneLinksList({
  links,
  entitiesById,
  scenesById,
  onDelete,
}: {
  links: BibleSceneLink[];
  entitiesById: Map<string, BibleEntity>;
  scenesById: Map<string, ProjectScene>;
  onDelete: (sceneLinkId: string) => void | Promise<void>;
}): ReactElement {
  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">No scene links found.</p>;
  }

  return (
    <ul className="space-y-2">
      {links.map((sceneLink) => (
        <SceneLinksListItem
          key={sceneLink.id}
          sceneLink={sceneLink}
          entityName={entitiesById.get(sceneLink.entityId)?.name ?? sceneLink.entityId}
          sceneName={scenesById.get(sceneLink.sceneId)?.title ?? sceneLink.sceneId}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function SceneLinksListItem({
  sceneLink,
  entityName,
  sceneName,
  onDelete,
}: {
  sceneLink: BibleSceneLink;
  entityName: string;
  sceneName: string;
  onDelete: (sceneLinkId: string) => void | Promise<void>;
}): ReactElement {
  return (
    <li className="rounded-md border px-3 py-2">
      <p className="text-sm">
        <span className="font-semibold">{entityName}</span> in <span className="font-semibold">{sceneName}</span>
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
  );
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
  const editorState = useSceneLinksEditorState({
    projectId,
    entities,
    scenes,
    sceneLinks,
    selectedEntityId,
    onSave,
  });

  return (
    <SceneLinksSection
      entities={entities}
      scenes={scenes}
      visibleSceneLinks={editorState.visibleSceneLinks}
      entitiesById={editorState.entitiesById}
      scenesById={editorState.scenesById}
      resolvedEntityId={editorState.resolvedEntityId}
      resolvedSceneId={editorState.resolvedSceneId}
      notes={editorState.state.notes}
      errorMessage={errorMessage}
      onEntityChange={editorState.setEntityId}
      onSceneChange={editorState.setSceneId}
      onNotesChange={editorState.setNotes}
      onSubmit={editorState.handleSubmit}
      onDelete={onDelete}
    />
  );
}
