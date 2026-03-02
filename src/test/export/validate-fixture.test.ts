import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

import { projectExportSchema } from '@/domain/project/schemas';

describe('valid-import.json fixture', () => {
  it('passes projectExportSchema validation', () => {
    const raw = readFileSync(resolve('docs/test-fixtures/valid-import.json'), 'utf-8');
    const data = JSON.parse(raw);
    const result = projectExportSchema.safeParse(data);
    if (!result.success) {
      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });
});
