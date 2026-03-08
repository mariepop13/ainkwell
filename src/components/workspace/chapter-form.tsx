import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';

type ChapterFormProps = {
  initialTitle?: string;
  titleLabel?: string;
  submitLabel: string;
  errorText?: string;
  onSubmit: (title: string) => Promise<void>;
  onCancel?: () => void;
};

export function ChapterForm({
  initialTitle = '',
  titleLabel = 'Chapter title',
  submitLabel,
  errorText = 'Could not save chapter. Please try again.',
  onSubmit,
  onCancel,
}: ChapterFormProps): ReactElement {
  const [title, setTitle] = useState(initialTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedTitle);
      setTitle('');
    } catch {
      setSubmitError(errorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      className="flex items-center gap-3"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); }}
        placeholder={titleLabel}
        aria-label={titleLabel}
        maxLength={120}
        required
        autoFocus
        className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? '…' : submitLabel}
      </button>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      ) : null}
      {submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}
