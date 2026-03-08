import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatContextLength,
  extractProvider,
} from '@/application/ai/model-fetcher';

describe('formatPrice', () => {
  it('formats non-zero prompt and completion prices per 1K tokens', () => {
    expect(formatPrice('0.000001', '0.000002')).toBe('$0.001 / $0.002 per 1K tokens');
  });

  it('shows $0 for zero prices', () => {
    expect(formatPrice('0', '0')).toBe('$0 / $0 per 1K tokens');
  });

  it('returns N/A for invalid prices', () => {
    expect(formatPrice('', '')).toBe('N/A');
  });
});

describe('formatContextLength', () => {
  it('formats millions', () => {
    expect(formatContextLength(1_000_000)).toBe('1.0M tokens');
  });

  it('formats thousands', () => {
    expect(formatContextLength(128_000)).toBe('128K tokens');
  });

  it('formats small values', () => {
    expect(formatContextLength(512)).toBe('512 tokens');
  });

  it('returns N/A for null', () => {
    expect(formatContextLength(null)).toBe('N/A');
  });
});

describe('extractProvider', () => {
  it('capitalizes the provider from a model id', () => {
    expect(extractProvider('google/gemini-2.0-flash-001')).toBe('Google');
  });

  it('handles anthropic', () => {
    expect(extractProvider('anthropic/claude-3-5-sonnet')).toBe('Anthropic');
  });

  it('returns empty string for malformed id', () => {
    expect(extractProvider('')).toBe('');
  });
});
