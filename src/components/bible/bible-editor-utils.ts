export function resolveIdInList<T extends { id: string }>(
  candidateId: string,
  items: T[],
  fallback?: string | null,
): string {
  const ids = new Set(items.map((item) => item.id));
  if (ids.has(candidateId)) {
    return candidateId;
  }

  return fallback ?? items[0]?.id ?? '';
}
