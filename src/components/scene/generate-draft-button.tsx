import type { ReactElement } from 'react';

type GenerateDraftButtonProps = {
  isGenerating: boolean;
  generateError: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onClearError: () => void;
};

export function GenerateDraftButton({
  isGenerating,
  generateError,
  canGenerate,
  onGenerate,
  onClearError,
}: GenerateDraftButtonProps): ReactElement {
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        title={canGenerate ? undefined : 'Add a synopsis to enable AI draft generation'}
        className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? 'Generating...' : 'Generate Draft'}
      </button>

      {!canGenerate && !isGenerating ? (
        <p className="text-xs text-muted-foreground">Add a synopsis to generate</p>
      ) : null}

      {generateError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{generateError}</span>
          <button
            type="button"
            onClick={onClearError}
            className="rounded-md border border-destructive px-2 py-1 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
