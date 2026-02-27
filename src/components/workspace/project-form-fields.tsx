import type { ReactElement } from 'react';

type ProjectMode = 'create' | 'edit';

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const LANGUAGE_MAX_LENGTH = 16;

function FieldError({ message }: { message?: string }): ReactElement | null {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

export function ProjectTitleField({
  mode,
  value,
  error,
  onChange,
}: {
  mode: ProjectMode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${mode}-project-title`}>Title</label>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        id={`${mode}-project-title`}
        maxLength={TITLE_MAX_LENGTH}
        name="title"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="My writing project"
        value={value}
      />
      <p className="text-xs text-muted-foreground">{value.length}/{TITLE_MAX_LENGTH}</p>
      <FieldError message={error} />
    </div>
  );
}

export function ProjectDescriptionField({
  mode,
  value,
  error,
  onChange,
}: {
  mode: ProjectMode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${mode}-project-description`}>Description</label>
      <textarea
        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        id={`${mode}-project-description`}
        maxLength={DESCRIPTION_MAX_LENGTH}
        name="description"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Short summary of your project"
        value={value}
      />
      <p className="text-xs text-muted-foreground">{value.length}/{DESCRIPTION_MAX_LENGTH}</p>
      <FieldError message={error} />
    </div>
  );
}

function ProjectLanguageField({
  mode,
  value,
  error,
  onChange,
}: {
  mode: ProjectMode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${mode}-project-language`}>Language</label>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        id={`${mode}-project-language`}
        maxLength={LANGUAGE_MAX_LENGTH}
        name="language"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="en"
        value={value}
      />
      <FieldError message={error} />
    </div>
  );
}

function ProjectTargetWordCountField({
  mode,
  value,
  error,
  onChange,
}: {
  mode: ProjectMode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${mode}-project-target-word-count`}>Target words</label>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        id={`${mode}-project-target-word-count`}
        inputMode="numeric"
        name="targetWordCount"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Optional"
        value={value}
      />
      <FieldError message={error} />
    </div>
  );
}

export function ProjectSettingsFields({
  mode,
  language,
  targetWordCountInput,
  languageError,
  targetWordCountError,
  onLanguageChange,
  onTargetWordCountChange,
}: {
  mode: ProjectMode;
  language: string;
  targetWordCountInput: string;
  languageError?: string;
  targetWordCountError?: string;
  onLanguageChange: (value: string) => void;
  onTargetWordCountChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ProjectLanguageField error={languageError} mode={mode} onChange={onLanguageChange} value={language} />
      <ProjectTargetWordCountField
        error={targetWordCountError}
        mode={mode}
        onChange={onTargetWordCountChange}
        value={targetWordCountInput}
      />
    </div>
  );
}

export function ProjectFormActions({
  mode,
  isSubmitting,
  onCancel,
}: {
  mode: ProjectMode;
  isSubmitting: boolean;
  onCancel?: () => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {mode === 'create' ? 'Create project' : 'Save changes'}
      </button>
      {mode === 'edit' && onCancel ? (
        <button
          className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
