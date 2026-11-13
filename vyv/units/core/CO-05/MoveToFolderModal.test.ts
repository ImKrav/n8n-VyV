/**
 * CO-05 · Mover y eliminar carpetas — modal para mover.
 * Origen: packages/frontend/editor-ui/src/features/core/folders/components/MoveToFolderModal.test.ts
 */
import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, screen, within } from '@testing-library/vue';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createProjectListItem,
	createProjectSharingData,
} from '@/features/collaboration/projects/__tests__/utils';
import {
	getDropdownItems,
	getSelectedDropdownValue,
	mockedStore,
	type MockedStore,
} from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { MOVE_FOLDER_MODAL_KEY } from '@/features/core/folders/folders.constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { FolderTransferResult, FrontendSettings } from '@n8n/api-types';
import type {
	TransferPreview,
	TransferPreviewTarget,
} from '@n8n/frontend-module-type-availability-policies';
import type { Project } from '@/features/collaboration/projects/projects.types';
import type {
	ICredentialsResponse,
	IUsedCredential,
} from '@/features/credentials/credentials.types';
import type { ChangeLocationSearchResult } from '@/features/core/folders/folders.types';
import { getTruncatedProjectName } from '@/features/collaboration/projects/projects.utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import MoveToFolderModal from '@/features/core/folders/components/MoveToFolderModal.vue';
import type { EventBus } from '@n8n/utils/event-bus';
import type { WorkflowListEventMap } from '@/features/core/folders/folders.types';
import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';

vi.mock('@/app/api/workflow-dependencies');

const transferPreviewMock = vi.hoisted(() => ({
	preview: undefined as { value: unknown } | undefined,
	target: undefined as MaybeRefOrGetter<unknown>,
	destination: undefined as MaybeRefOrGetter<unknown>,
}));

vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@n8n/frontend-module-type-availability-policies')>();
	return {
		...actual,
		useTransferPreview: (
			target: MaybeRefOrGetter<unknown>,
			destination: MaybeRefOrGetter<unknown>,
		) => {
			transferPreviewMock.target = target;
			transferPreviewMock.destination = destination;
			return { preview: transferPreviewMock.preview };
		},
	};
});

const toastMock = vi.hoisted(() => ({ showForWorkflow: vi.fn(), showForFolder: vi.fn() }));

vi.mock('@/app/composables/useUnpublishedByMoveToast', () => ({
	useUnpublishedByMoveToast: () => toastMock,
}));

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/folders/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',

				folderId: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const renderComponent = createComponentRenderer(MoveToFolderModal, {
	props: {
		modalName: MOVE_FOLDER_MODAL_KEY,
	},
});

const TEST_FOLDER_RESOURCE = {
	id: 'test-folder-id',
	name: 'Test Folder',
	parentFolderId: 'test-parent-folder-id',
};

const TEST_WORKFLOW_RESOURCE = {
	id: 'test-workflow-id',
	name: 'Test Workflow',
	parentFolderId: 'test-parent-folder-id',
};

let uiStore: MockedStore<typeof useUIStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let credentialsStore: MockedStore<typeof useCredentialsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let foldersStore: MockedStore<typeof useFoldersStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;

const personalProject = createProjectListItem('personal');
const anotherUser = createProjectListItem('personal');
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));
const projects = [personalProject, ...teamProjects, anotherUser];
const homeProject = createProjectSharingData();

const enableSharing = {
	enterprise: {
		sharing: true,
		projects: { team: { limit: -1 } },
	},
} as FrontendSettings;

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: faker.string.alphanumeric(10),
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	type: 'generic',
	name: faker.lorem.words(2),
	sharedWithProjects: [],
	isManaged: false,
	homeProject,
	...overrides,
});

const readableCredential = createCredential({
	scopes: ['credential:read'],
});
const readableUsedCredential: IUsedCredential = {
	id: readableCredential.id,
	name: readableCredential.name,
	credentialType: readableCredential.type,
	currentUserCanUse: true,
	homeProject,
	sharedWithProjects: [],
};

const shareableCredential = createCredential({
	scopes: ['credential:share', 'credential:read'],
});
const shareableUsedCredential: IUsedCredential = {
	id: shareableCredential.id,
	name: shareableCredential.name,
	credentialType: shareableCredential.type,
	currentUserCanUse: true,
	homeProject,
	sharedWithProjects: [],
};

const folder: ChangeLocationSearchResult = {
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	id: faker.string.alphanumeric(10),
	name: 'test',
	homeProject,
	tags: [],
	workflowCount: 0,
	subFolderCount: 0,
	path: ['test'],
	resource: 'folder',
};

const mockEventBus = {
	emit: vi.fn(),
} as unknown as EventBus<WorkflowListEventMap>;

// Setup of describe('MoveToFolderModal', (original top-level describe)
beforeEach(() => {
	transferPreviewMock.preview = shallowRef<TransferPreview | null>(null);
	createTestingPinia();
	uiStore = mockedStore(useUIStore);
	uiStore.modalStateById = {
		[MOVE_FOLDER_MODAL_KEY]: {
			open: true,
		},
	};

	settingsStore = mockedStore(useSettingsStore);
	settingsStore.settings = {
		enterprise: {
			projects: { team: { limit: -1 } },
		},
	} as FrontendSettings;

	credentialsStore = mockedStore(useCredentialsStore);
	credentialsStore.fetchAllCredentials = vi.fn().mockResolvedValue([]);

	workflowsListStore = mockedStore(useWorkflowsListStore);
	workflowsListStore.fetchWorkflow = vi.fn().mockResolvedValue({
		id: TEST_WORKFLOW_RESOURCE.id,
		name: TEST_WORKFLOW_RESOURCE.name,
		parentFolderId: TEST_WORKFLOW_RESOURCE.parentFolderId,
		usedCredentials: [],
	});

	vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({});
	vi.mocked(workflowDependenciesApi.getFolderDependencies).mockResolvedValue([]);

	foldersStore = mockedStore(useFoldersStore);
	foldersStore.fetchFolderUsedCredentials = vi.fn().mockResolvedValue([]);
	foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([]);
	foldersStore.fetchFolderContent = vi.fn().mockResolvedValue({
		totalWorkflows: 0,
		totalSubFolders: 0,
	});
	foldersStore.moveFolder = vi.fn().mockResolvedValue(undefined);
	foldersStore.moveFolderToProject = vi.fn().mockResolvedValue(undefined);

	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsStore.updateWorkflow = vi.fn().mockResolvedValue({});

	projectsStore = mockedStore(useProjectsStore);
	projectsStore.moveResourceToProject = vi.fn().mockResolvedValue(undefined);
	projectsStore.searchProjects.mockResolvedValue({ count: projects.length, data: projects });
	projectsStore.globalProjectPermissions = { list: true };

	projectsStore.currentProject = personalProject as unknown as Project;
	projectsStore.currentProjectId = personalProject.id;
	projectsStore.personalProject = personalProject as unknown as Project;
	projectsStore.projects = projects;
	projectsStore.availableProjects = projects;
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-CO-05-01 · Mover un workflow a una carpeta', () => {
	it('should move selected workflow on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_WORKFLOW_RESOURCE,
					resourceType: 'workflow',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const submitButton = getByTestId('confirm-move-folder-button');
		// Wait for dropdown to load and auto-select project root
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(TEST_WORKFLOW_RESOURCE.id, {
				parentFolderId: folder.id,
			});
		});
		expect(mockEventBus.emit).toHaveBeenCalledWith('workflow-moved', {
			newParent: {
				id: folder.id,
				name: folder.name,
				type: folder.resource,
			},
			workflow: {
				id: TEST_WORKFLOW_RESOURCE.id,
				name: TEST_WORKFLOW_RESOURCE.name,
				oldParentId: TEST_WORKFLOW_RESOURCE.parentFolderId,
			},
			options: { skipApiCall: true },
		});
	});
});

describe('CP-CO-05-02 · Mover un workflow de vuelta a la raíz', () => {
	it('should reset to project root when switching projects', async () => {
		settingsStore.settings = enableSharing;
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(within(folderSelect).getByRole('combobox')).toHaveValue('test');

		const projectSelect = getByTestId('project-sharing-select');
		await userEvent.click(getByTestId('project-sharing-select'));
		const teamProject = [...(await getDropdownItems(projectSelect))].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		await userEvent.click(teamProject as Element);

		// After switching projects, the project root should be selected
		expect(within(folderSelect).getByRole('combobox')).toHaveValue('No folder (project root)');
	});
});

describe('CP-CO-05-03 · Mover una carpeta con contenido', () => {
	it('should move selected folder on submit', async () => {
		foldersStore.fetchFoldersAvailableForMove = vi.fn().mockResolvedValue([folder]);

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());

		const submitButton = getByTestId('confirm-move-folder-button');
		// Wait for dropdown to load and auto-select project root
		await waitFor(() => expect(submitButton).toBeEnabled());

		const folderSelect = getByTestId('move-to-folder-dropdown');
		const folderSelectDropdownItems = await getDropdownItems(folderSelect);
		await userEvent.click(folderSelectDropdownItems[1]);

		expect(submitButton).toBeEnabled();
		await userEvent.click(submitButton);

		expect(foldersStore.moveFolder).toHaveBeenCalledWith(
			personalProject.id,
			TEST_FOLDER_RESOURCE.id,
			folder.id,
		);
		expect(mockEventBus.emit).toHaveBeenCalledWith('folder-moved', {
			newParent: {
				id: folder.id,
				name: folder.name,
				type: folder.resource,
			},
			folder: { id: TEST_FOLDER_RESOURCE.id, name: TEST_FOLDER_RESOURCE.name },
			options: { skipApiCall: true },
		});
	});

	it('should render for folder resource with workflows and subfolders', async () => {
		foldersStore.fetchFolderContent = vi.fn().mockResolvedValue({
			totalWorkflows: 1,
			totalSubFolders: 1,
		});

		const { getByTestId } = renderComponent({
			props: {
				data: {
					resource: TEST_FOLDER_RESOURCE,
					resourceType: 'folder',
					workflowListEventBus: mockEventBus,
				},
			},
		});

		await waitFor(() => expect(getByTestId('moveFolder-modal')).toBeInTheDocument());
		expect(screen.getByText(`Move folder ${TEST_FOLDER_RESOURCE.name}`)).toBeInTheDocument();
		expect(screen.getByTestId('move-modal-description')).toBeInTheDocument();
	});
});
