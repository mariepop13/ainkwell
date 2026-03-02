import { describe, expect, it } from 'vitest';

import { sceneBeatSchema, sceneSchema } from '@/domain/scene/schemas';

const validProjectId = '11111111-1111-4111-8111-111111111111';

describe('Scene beat schema', () => {
  it('validates a beat with valid type', () => {
    const beat = { id: 'b1', content: 'Hero enters the room', type: 'setup' };
    expect(() => sceneBeatSchema.parse(beat)).not.toThrow();
  });

  it('rejects beat with invalid type', () => {
    const beat = { id: 'b1', content: 'Hero enters the room', type: 'invalid' };
    expect(() => sceneBeatSchema.parse(beat)).toThrow();
  });

  it('accepts scene without synopsis or beats (backward compat)', () => {
    const scene = {
      id: 's1',
      projectId: validProjectId,
      title: 'Opening Scene',
      content: '',
      status: 'draft' as const,
      updatedAt: '2026-02-27T00:00:00.000Z',
    };
    expect(() => sceneSchema.parse(scene)).not.toThrow();
  });

  it('accepts scene with synopsis and beats', () => {
    const scene = {
      id: 's1',
      projectId: validProjectId,
      title: 'Opening Scene',
      content: '',
      status: 'draft' as const,
      updatedAt: '2026-02-27T00:00:00.000Z',
      synopsis: 'Aria discovers the letter is missing.',
      beats: [
        { id: 'b1', content: 'Aria opens the drawer', type: 'setup' },
        { id: 'b2', content: 'Aria realizes the letter is gone', type: 'revelation' },
      ],
    };
    expect(() => sceneSchema.parse(scene)).not.toThrow();
  });
});
