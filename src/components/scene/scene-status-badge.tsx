import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';
import type { SceneStatus } from '@/domain/scene/types';

type SceneStatusBadgeProps = {
  status: SceneStatus;
};

const statusLabels: Record<SceneStatus, string> = {
  draft: 'Draft',
  revise: 'Revise',
  final: 'Final',
};

const statusClasses: Record<SceneStatus, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-700',
  revise: 'border-amber-300 bg-amber-100 text-amber-700',
  final: 'border-emerald-300 bg-emerald-100 text-emerald-700',
};

export function SceneStatusBadge(props: SceneStatusBadgeProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        statusClasses[props.status],
      )}
    >
      {statusLabels[props.status]}
    </span>
  );
}
