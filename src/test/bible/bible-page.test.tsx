import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { BiblePageClient } from '@/components/bible/bible-page-client';
import { LocalProjectRepository } from '@/data/project/local-project-repository';

describe('BiblePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates entities, relationships, and scene links with persisted state after reload', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({
      title: 'Demo Project',
      description: 'Project used for Story Bible integration tests.',
    });
    const projectId = project.id;
    const { unmount } = render(<BiblePageClient projectId={projectId} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Aria/i });

    await user.click(screen.getByRole('button', { name: 'New entity' }));
    const secondNameInput = screen.getByLabelText('Name');
    await user.clear(secondNameInput);
    await user.type(secondNameInput, 'Citadel');
    await user.selectOptions(screen.getByLabelText('Category', { selector: '#entity-category' }), 'location');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Citadel/i });

    const fromEntitySelect = screen.getByLabelText('From entity');
    const toEntitySelect = screen.getByLabelText('To entity');
    const relationshipTypeSelect = screen.getByLabelText('Type');
    await user.selectOptions(fromEntitySelect, within(fromEntitySelect).getByRole('option', { name: 'Aria' }));
    await user.selectOptions(toEntitySelect, within(toEntitySelect).getByRole('option', { name: 'Citadel' }));
    await user.selectOptions(
      relationshipTypeSelect,
      within(relationshipTypeSelect).getByRole('option', { name: 'located_in' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save relationship' }));
    const bibleStorageKey = `ainkwell:projects:${projectId}:bible:v1`;
    const relationshipData = JSON.parse(window.localStorage.getItem(bibleStorageKey) ?? '{}') as {
      relationships?: Array<unknown>;
    };
    expect(relationshipData.relationships).toHaveLength(1);

    const sceneLinkEntitySelect = screen.getByLabelText('Entity');
    const sceneLinkSceneSelect = screen.getByLabelText('Scene');
    await user.selectOptions(
      sceneLinkEntitySelect,
      within(sceneLinkEntitySelect).getByRole('option', { name: 'Aria' }),
    );
    await user.selectOptions(
      sceneLinkSceneSelect,
      within(sceneLinkSceneSelect).getByRole('option', { name: 'Scene 1' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save scene link' }));
    const sceneLinkData = JSON.parse(window.localStorage.getItem(bibleStorageKey) ?? '{}') as {
      sceneLinks?: Array<unknown>;
    };
    expect(sceneLinkData.sceneLinks).toHaveLength(1);

    unmount();
    render(<BiblePageClient projectId={projectId} />);

    await screen.findByRole('button', { name: /Aria/i });
    const persistedData = JSON.parse(window.localStorage.getItem(bibleStorageKey) ?? '{}') as {
      relationships?: Array<unknown>;
      sceneLinks?: Array<unknown>;
    };
    expect(persistedData.relationships).toHaveLength(1);
    expect(persistedData.sceneLinks).toHaveLength(1);
  });

  it('shows invalid id state when projectId is malformed', async () => {
    render(<BiblePageClient projectId="demo-project" />);

    expect(await screen.findByText('Invalid project id')).toBeInTheDocument();
    expect(
      screen.getByText('The Story Bible route requires a valid project identifier.'),
    ).toBeInTheDocument();
  });

  it('shows project not found state when UUID does not exist', async () => {
    render(<BiblePageClient projectId="2f2b4bd9-114f-4c73-99ba-28f274d7f00b" />);

    expect(await screen.findByText('Project not found')).toBeInTheDocument();
    expect(
      screen.getByText('This project does not exist in local storage.'),
    ).toBeInTheDocument();
  });
});

describe('BiblePage tag filtering and TagsInput', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders tag chips in the filter panel when entities with tags exist', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({ title: 'Tag Filter Test', description: '' });
    render(<BiblePageClient projectId={project.id} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    const tagsInput = screen.getByLabelText('Tags');
    await user.type(tagsInput, 'protagonist');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Aria/i });

    expect(screen.getByRole('button', { name: 'protagonist' })).toBeInTheDocument();
  });

  it('filters the entity list when a tag chip is clicked', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({ title: 'Tag Filter Test 2', description: '' });
    render(<BiblePageClient projectId={project.id} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    const tagsInput = screen.getByLabelText('Tags');
    await user.type(tagsInput, 'protagonist');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Aria/i });

    await user.click(screen.getByRole('button', { name: 'New entity' }));
    const secondNameInput = screen.getByLabelText('Name');
    await user.clear(secondNameInput);
    await user.type(secondNameInput, 'Citadel');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Citadel/i });

    await user.click(screen.getByRole('button', { name: 'protagonist' }));

    expect(screen.getByRole('button', { name: /Aria/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Citadel/i })).not.toBeInTheDocument();
  });

  it('clears the tag filter when "Clear tags" is clicked', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({ title: 'Tag Filter Test 3', description: '' });
    render(<BiblePageClient projectId={project.id} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    const tagsInput = screen.getByLabelText('Tags');
    await user.type(tagsInput, 'protagonist');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Aria/i });

    await user.click(screen.getByRole('button', { name: 'New entity' }));
    const secondNameInput = screen.getByLabelText('Name');
    await user.clear(secondNameInput);
    await user.type(secondNameInput, 'Citadel');
    await user.click(screen.getByRole('button', { name: 'Save entity' }));
    await screen.findByRole('button', { name: /Citadel/i });

    await user.click(screen.getByRole('button', { name: 'protagonist' }));
    expect(screen.queryByRole('button', { name: /Citadel/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear tags' }));

    expect(screen.getByRole('button', { name: /Aria/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Citadel/i })).toBeInTheDocument();
  });

  it('adds a tag chip in BibleEditor when Enter is pressed', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({ title: 'Tags Input Test', description: '' });
    render(<BiblePageClient projectId={project.id} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    const tagsInput = screen.getByLabelText('Tags');
    await user.type(tagsInput, 'hero');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Remove tag hero' })).toBeInTheDocument();
  });

  it('removes a tag chip when its x button is clicked', async () => {
    const user = userEvent.setup();
    const projectRepository = new LocalProjectRepository();
    const project = await projectRepository.create({ title: 'Tags Remove Test', description: '' });
    render(<BiblePageClient projectId={project.id} />);

    const nameInput = await screen.findByLabelText('Name');
    await user.type(nameInput, 'Aria');
    const tagsInput = screen.getByLabelText('Tags');
    await user.type(tagsInput, 'hero');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Remove tag hero' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove tag hero' }));

    expect(screen.queryByRole('button', { name: 'Remove tag hero' })).not.toBeInTheDocument();
  });
});
