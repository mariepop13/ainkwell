import type { ReactElement } from 'react';

import { SceneStatusBadge } from '@/components/scene/scene-status-badge';
import type { SceneStatus } from '@/domain/scene/types';

type SceneToolbarProps = {
  title: string;
  status: SceneStatus;
  wordCount: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  onStatusChange: (status: SceneStatus) => void;
  onRetrySave: () => Promise<void>;
};

const formatSavedAt = (lastSavedAt: string | null): string => {
  if (!lastSavedAt) {
    return 'Not saved yet';
  }

  return `Saved at ${new Date(lastSavedAt).toLocaleTimeString()}`;
};

const getSaveStateLabel = (props: Pick<SceneToolbarProps, 'isSaving' | 'isDirty' | 'lastSavedAt'>): string => {
  if (props.isSaving) {
    return 'Saving...';
  }

  if (props.isDirty) {
    return 'Unsaved changes';
  }

  return formatSavedAt(props.lastSavedAt);
};

type SceneStatusSelectProps = {
  status: SceneStatus;
  onStatusChange: (status: SceneStatus) => void;
};

function SceneStatusSelect(props: SceneStatusSelectProps): ReactElement {
  const handleStatusChange = (value: string): void => {
    props.onStatusChange(value as SceneStatus);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="scene-status" className="text-sm font-medium">
        Status
      </label>
      <select
        id="scene-status"
        value={props.status}
        onChange={(event) => handleStatusChange(event.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="draft">Draft</option>
        <option value="revise">Revise</option>
        <option value="final">Final</option>
      </select>
    </div>
  );
}

type SceneSaveErrorProps = {
  saveError: string | null;
  onRetrySave: () => Promise<void>;
};

function SceneSaveError(props: SceneSaveErrorProps): ReactElement | null {
  if (!props.saveError) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-3 flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <span>{props.saveError}</span>
      <button
        type="button"
        onClick={() => void props.onRetrySave()}
        className="rounded-md border border-destructive px-2 py-1 font-medium"
      >
        Retry
      </button>
    </div>
  );
}

export function SceneToolbar(props: SceneToolbarProps): ReactElement {
  return (
    <header className="rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold">{props.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <SceneStatusBadge status={props.status} />
            <span aria-live="polite">{props.wordCount} words</span>
            <span aria-live="polite">{getSaveStateLabel(props)}</span>
          </div>
        </div>

        <SceneStatusSelect status={props.status} onStatusChange={props.onStatusChange} />
      </div>

      <SceneSaveError saveError={props.saveError} onRetrySave={props.onRetrySave} />
    </header>
  );
}
