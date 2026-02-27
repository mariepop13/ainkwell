'use client';

import type { Dispatch, FormEvent, ReactElement, SetStateAction } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ProjectDescriptionField,
  ProjectFormActions,
  ProjectSettingsFields,
  ProjectTitleField,
} from '@/components/workspace/project-form-fields';

export type ProjectFormValues = {
  title: string;
  description: string;
  settings: {
    language: string;
    targetWordCount: number | null;
  };
};

type ProjectFormInitialValues = {
  title?: string;
  description?: string;
  settings?: {
    language?: string;
    targetWordCount?: number | null;
  };
};

type ProjectFormProps = {
  mode: 'create' | 'edit';
  initialValues?: ProjectFormInitialValues;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
  title?: string;
  className?: string;
};

type ProjectFormErrors = {
  title?: string;
  description?: string;
  language?: string;
  targetWordCount?: string;
  submit?: string;
};

type ValidationResult = {
  values: ProjectFormValues | null;
  errors: ProjectFormErrors;
};

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const LANGUAGE_MAX_LENGTH = 16;

const defaultValues: ProjectFormValues = {
  title: '',
  description: '',
  settings: {
    language: 'en',
    targetWordCount: null,
  },
};

function buildInitialValues(initialValues?: ProjectFormInitialValues): ProjectFormValues {
  const settings = initialValues?.settings;
  return {
    title: initialValues?.title ?? defaultValues.title,
    description: initialValues?.description ?? defaultValues.description,
    settings: {
      language: settings?.language ?? defaultValues.settings.language,
      targetWordCount: settings?.targetWordCount ?? defaultValues.settings.targetWordCount,
    },
  };
}

function buildInitialTargetWordCount(initialValues?: ProjectFormInitialValues): string {
  return initialValues?.settings?.targetWordCount?.toString() ?? '';
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to save the project.';
}

function validateTitle(title: string): string | undefined {
  if (title.length === 0) {
    return 'Title is required.';
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  return undefined;
}

function validateDescription(description: string): string | undefined {
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  return undefined;
}

function validateLanguage(language: string): string | undefined {
  if (language.length < 2 || language.length > LANGUAGE_MAX_LENGTH) {
    return `Language must be between 2 and ${LANGUAGE_MAX_LENGTH} characters.`;
  }

  return undefined;
}

function parseTargetWordCount(value: string): { parsedValue: number | null; error?: string } {
  if (value.length === 0) {
    return { parsedValue: null };
  }

  if (!/^\d+$/.test(value)) {
    return { parsedValue: null, error: 'Target word count must be a non-negative integer.' };
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    return { parsedValue: null, error: 'Target word count must be a non-negative integer.' };
  }

  return { parsedValue };
}

function validateProjectForm(formValues: ProjectFormValues, targetWordCountInput: string): ValidationResult {
  const title = formValues.title.trim();
  const description = formValues.description.trim();
  const language = formValues.settings.language.trim().toLowerCase();
  const targetWordCountText = targetWordCountInput.trim();
  const { parsedValue, error: targetWordCountError } = parseTargetWordCount(targetWordCountText);
  const errors: ProjectFormErrors = {
    title: validateTitle(title),
    description: validateDescription(description),
    language: validateLanguage(language),
    targetWordCount: targetWordCountError,
  };

  if (Object.values(errors).some(Boolean)) {
    return { values: null, errors };
  }

  return {
    values: { title, description, settings: { language, targetWordCount: parsedValue } },
    errors: {},
  };
}

type ProjectFormController = {
  formValues: ProjectFormValues;
  targetWordCountInput: string;
  errors: ProjectFormErrors;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setLanguage: (language: string) => void;
  setTargetWordCountInput: (value: string) => void;
};

type ProjectFormState = {
  formValues: ProjectFormValues;
  targetWordCountInput: string;
  errors: ProjectFormErrors;
  setFormValues: Dispatch<SetStateAction<ProjectFormValues>>;
  setTargetWordCountInput: Dispatch<SetStateAction<string>>;
  setErrors: Dispatch<SetStateAction<ProjectFormErrors>>;
};

function useProjectFormState(initialValues?: ProjectFormInitialValues): ProjectFormState {
  const [formValues, setFormValues] = useState<ProjectFormValues>(() => buildInitialValues(initialValues));
  const [targetWordCountInput, setTargetWordCountInput] = useState(() => buildInitialTargetWordCount(initialValues));
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  return { formValues, targetWordCountInput, errors, setFormValues, setTargetWordCountInput, setErrors };
}

function useProjectSubmitHandler({
  mode,
  onSubmit,
  formValues,
  targetWordCountInput,
  setErrors,
  setFormValues,
  setTargetWordCountInput,
}: {
  mode: 'create' | 'edit';
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  formValues: ProjectFormValues;
  targetWordCountInput: string;
  setErrors: Dispatch<SetStateAction<ProjectFormErrors>>;
  setFormValues: Dispatch<SetStateAction<ProjectFormValues>>;
  setTargetWordCountInput: Dispatch<SetStateAction<string>>;
}): (event: FormEvent<HTMLFormElement>) => Promise<void> {
  return async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationResult = validateProjectForm(formValues, targetWordCountInput);
    setErrors(validationResult.errors);
    if (!validationResult.values) {
      return;
    }

    try {
      await onSubmit(validationResult.values);
      setErrors({});
      if (mode === 'create') {
        setFormValues(defaultValues);
        setTargetWordCountInput('');
      }
    } catch (error) {
      setErrors((previousErrors) => ({ ...previousErrors, submit: readErrorMessage(error) }));
    }
  };
}

function useProjectFormController({
  mode,
  initialValues,
  onSubmit,
}: Pick<ProjectFormProps, 'mode' | 'initialValues' | 'onSubmit'>): ProjectFormController {
  const state = useProjectFormState(initialValues);
  const handleSubmit = useProjectSubmitHandler({
    mode,
    onSubmit,
    formValues: state.formValues,
    targetWordCountInput: state.targetWordCountInput,
    setErrors: state.setErrors,
    setFormValues: state.setFormValues,
    setTargetWordCountInput: state.setTargetWordCountInput,
  });

  return {
    formValues: state.formValues,
    targetWordCountInput: state.targetWordCountInput,
    errors: state.errors,
    handleSubmit,
    setTitle: (title: string) => {
      state.setFormValues((previousValues) => ({ ...previousValues, title }));
    },
    setDescription: (description: string) => {
      state.setFormValues((previousValues) => ({ ...previousValues, description }));
    },
    setLanguage: (language: string) => {
      state.setFormValues((previousValues) => ({
        ...previousValues,
        settings: { ...previousValues.settings, language },
      }));
    },
    setTargetWordCountInput: state.setTargetWordCountInput,
  };
}

export function ProjectForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  title,
  className,
}: ProjectFormProps): ReactElement {
  const controller = useProjectFormController({ mode, initialValues, onSubmit });

  return (
    <form className={cn('space-y-4 rounded-lg border bg-card p-4', className)} onSubmit={controller.handleSubmit}>
      <h2 className="text-lg font-headline font-semibold">{title ?? (mode === 'create' ? 'Create project' : 'Edit project')}</h2>
      <ProjectTitleField
        error={controller.errors.title}
        mode={mode}
        onChange={controller.setTitle}
        value={controller.formValues.title}
      />
      <ProjectDescriptionField
        error={controller.errors.description}
        mode={mode}
        onChange={controller.setDescription}
        value={controller.formValues.description}
      />
      <ProjectSettingsFields
        language={controller.formValues.settings.language}
        languageError={controller.errors.language}
        mode={mode}
        onLanguageChange={controller.setLanguage}
        onTargetWordCountChange={controller.setTargetWordCountInput}
        targetWordCountError={controller.errors.targetWordCount}
        targetWordCountInput={controller.targetWordCountInput}
      />
      {controller.errors.submit ? <p className="text-sm text-destructive">{controller.errors.submit}</p> : null}
      <ProjectFormActions isSubmitting={isSubmitting} mode={mode} onCancel={onCancel} />
    </form>
  );
}
