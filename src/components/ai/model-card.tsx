import type { ReactElement } from 'react';

import { extractProvider, formatContextLength, formatPrice } from '@/application/ai/model-fetcher';
import type { OpenRouterModel } from '@/domain/ai/types';

type ModelCardProps = {
  model: OpenRouterModel;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
};

export function ModelCard({ model, isSelected, onSelect }: ModelCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{model.name}</span>
            {isSelected ? <span className="text-primary text-xs flex-shrink-0">✓</span> : null}
          </div>
          <p className="text-xs text-muted-foreground mb-1">{extractProvider(model.id)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span><span aria-hidden="true">💰</span><span className="sr-only">Price:</span> {formatPrice(model.pricing.prompt, model.pricing.completion)}</span>
            <span><span aria-hidden="true">📏</span><span className="sr-only">Context:</span> {formatContextLength(model.context_length)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
