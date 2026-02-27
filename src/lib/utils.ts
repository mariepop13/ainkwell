import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateProjectId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid.toLowerCase();
  }

  const seed = `${Date.now().toString(16)}${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
  let seedIndex = 0;

  const nextSeedNibble = (): number => {
    const nibble = Number.parseInt(seed[seedIndex % seed.length] ?? '0', 16);
    seedIndex += 1;
    return Number.isNaN(nibble) ? 0 : nibble;
  };

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const randomNibble = (nextSeedNibble() + Math.floor(Math.random() * 16)) % 16;
    const value = token === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function formatProjectDate(isoDate: string): string {
  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}
