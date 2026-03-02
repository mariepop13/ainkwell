import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { DevSeedClient } from './dev-seed-client';

export default function DevSeedPage(): ReactElement {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <DevSeedClient />;
}
