'use client';

import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface DailyGoalFormProps {
  currentGoal: number | null;
  onSave: (goal: number | null) => void;
}

function parseGoalInput(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== trimmed) {
    return 'invalid';
  }
  return parsed;
}

function GoalInputRow({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <div className="flex gap-2">
      <input
        id="daily-goal-input"
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 500"
        className="w-32 rounded-md border bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        Save goal
      </button>
    </div>
  );
}

export function DailyGoalForm({ currentGoal, onSave }: DailyGoalFormProps): ReactElement {
  const [inputValue, setInputValue] = useState<string>(currentGoal?.toString() ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(currentGoal?.toString() ?? '');
  }, [currentGoal]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setValidationError(null);
    const result = parseGoalInput(inputValue);
    if (result === 'invalid') {
      setValidationError('Daily goal must be a non-negative whole number.');
      return;
    }
    onSave(result);
  };

  const handleChange = (value: string): void => {
    setInputValue(value);
    setValidationError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="daily-goal-input" className="text-sm font-medium">
          Daily word count goal
        </label>
        <GoalInputRow value={inputValue} onChange={handleChange} />
      </div>
      {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
    </form>
  );
}
