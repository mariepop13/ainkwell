import type { ReactElement } from 'react';
import { X } from 'lucide-react';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
}

export function TagChip({ label, onRemove }: TagChipProps): ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${label}`}
          className="ml-0.5 rounded-full hover:bg-muted"
        >
          <X size={10} />
        </button>
      ) : null}
    </span>
  );
}
