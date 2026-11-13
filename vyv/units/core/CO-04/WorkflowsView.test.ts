/**
 * CO-04 · Crear y navegar carpetas — vista de workflows y carpetas.
 * Origen: packages/frontend/editor-ui/src/app/views/WorkflowsView.test.ts
 */
import { defineComponent, h, nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { VIEWS } from '@/app/constants';
import type { WorkflowListResource } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { promotionEventBus } from '@n8n/frontend-module-promotions';
import { foldersEventBus } from '@/features/core/folders/folders.eventBus';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import WorkflowsView from '@/app/views/WorkflowsView.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useEmptyStateDetection } from '@/features/workflows/readyToRun/composables/useEmptyStateDetection';
import { useAgentListStore } from '@/features/agents/agentList.store';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

vi.mock('@/features/collaboration/projects/projects.api');
vi.mock('@n8n/rest-api-client/api/users');
vi.mock('@/features/integrations/sourceControl.ee/sourceControl.api');
vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));
vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
	}),
}));
vi.mock('@/experiments/utils', async (importOriginal) => {
	const actual = await importOriginal<object>();

	return {
		...actual,
		isExtraTemplateLinksExperimentEnabled: vi.fn(() => true),
	};
});
const mockTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/:projectId?',
			component: { template: '<div></div>' },
		},
		{
			path: '/:projectId/folders/:folderId',
			component: { template: '<div></div>' },
		},
		{
			path: '/workflow',
			name: VIEWS.NEW_WORKFLOW,
			component: { template: '<div></div>' },
		},
		{
			path: '/templates',
			name: VIEWS.TEMPLATES,
			component: { template: '<div></div>' },
		},
	],
});

vi.mock('@n8n/rest-api-client/api/usage', () => ({
	getLicense: vi.fn(),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let foldersStore: ReturnType<typeof mockedStore<typeof useFoldersStore>>;
let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let projectPages: ReturnType<typeof useProjectPages>;

const renderComponent = createComponentRenderer(WorkflowsView, {
	global: {
		plugins: [router],
	},
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: { sharing: false, projects: { team: { limit: 5 } } },
			folders: { enabled: false },
		},
	},
};

describe('CP-CO-04-01 · Crear carpeta en la raíz', () => {
	describe('Folders', () => {
		beforeEach(async () => {
			await router.push('/');
			await router.isReady();
			pinia = createTestingPinia({ initialState });
			foldersStore = mockedStore(useFoldersStore);
			workflowsListStore = mockedStore(useWorkflowsListStore);
			settingsStore = mockedStore(useSettingsStore);

			settingsStore.isFoldersFeatureEnabled = true;
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);
			projectPages = useProjectPages();
		});

		const TEST_WORKFLOW_RESOURCE: WorkflowListResource = {
			resource: 'workflow',
			id: '1',
			name: 'Workflow 1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			active: true,
			activeVersionId: 'v1',
			isArchived: false,
			versionId: '1',
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};
		const TEST_FOLDER_RESOURCE: WorkflowListResource = {
			resource: 'folder',
			id: '2',
			name: 'Folder 2',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowCount: 1,
			subFolderCount: 0,
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		it('refreshes the current project after a folder is created', async () => {
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = {
				id: 'project-1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				relations: [],
				rolesManaged: false,
				scopes: [],
			} as Project;

			const { unmount } = renderComponent({ pinia });
			await waitAllPromises();
			workflowsListStore.fetchWorkflowsPage.mockClear();
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockClear();

			foldersEventBus.emit('folder-created', { projectId: 'project-1' });

			await waitFor(() => {
				expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalled();
				expect(foldersStore.fetchTotalWorkflowsAndFoldersCount).toHaveBeenCalled();
			});
			unmount();
		});
	});
});

describe('CP-CO-04-06 · Buscar workflows dentro de carpetas', () => {
	describe('WorkflowsView', () => {
		beforeEach(async () => {
			await router.push('/');
			await router.isReady();
			pinia = createTestingPinia({ initialState });
			foldersStore = mockedStore(useFoldersStore);
			workflowsListStore = mockedStore(useWorkflowsListStore);
			settingsStore = mockedStore(useSettingsStore);

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);

			foldersStore.totalWorkflowCount = 0;
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);

			// Mock getSimplifiedLayoutVisibility to return false so ResourcesListLayout is used
			const readyToRunStore = mockedStore(useReadyToRunStore);
			vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(false);

			projectPages = useProjectPages();
		});

		describe('filters', () => {
			it('should set search filter based on query parameters', async () => {
				await router.replace({ query: { search: 'one' } });

				workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

				renderComponent({ pinia });
				await waitAllPromises();

				expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
					expect.any(String),
					expect.any(Number),
					expect.any(Number),
					expect.any(String),
					expect.objectContaining({
						query: 'one',
						isArchived: false,
					}),
					expect.any(Boolean),
					expect.any(Boolean),
				);
			});
		});
	});

	describe('Folders', () => {
		beforeEach(async () => {
			await router.push('/');
			await router.isReady();
			pinia = createTestingPinia({ initialState });
			foldersStore = mockedStore(useFoldersStore);
			workflowsListStore = mockedStore(useWorkflowsListStore);
			settingsStore = mockedStore(useSettingsStore);

			settingsStore.isFoldersFeatureEnabled = true;
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);
			projectPages = useProjectPages();
		});

		const TEST_WORKFLOW_RESOURCE: WorkflowListResource = {
			resource: 'workflow',
			id: '1',
			name: 'Workflow 1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			active: true,
			activeVersionId: 'v1',
			isArchived: false,
			versionId: '1',
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};
		const TEST_FOLDER_RESOURCE: WorkflowListResource = {
			resource: 'folder',
			id: '2',
			name: 'Folder 2',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowCount: 1,
			subFolderCount: 0,
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		describe('entering a folder from search results', () => {
			// Named routes like the real app, so the route-name watchers fire on
			// project-root -> folder navigation.
			const namedRouter = createRouter({
				history: createWebHistory(),
				routes: [
					{
						path: '/projects/:projectId/workflows',
						name: VIEWS.PROJECTS_WORKFLOWS,
						component: { template: '<div></div>' },
					},
					{
						path: '/projects/:projectId/folders/:folderId/workflows',
						name: VIEWS.PROJECTS_FOLDERS,
						component: { template: '<div></div>' },
					},
				],
			});

			const renderWithNamedRoutes = createComponentRenderer(WorkflowsView, {
				global: {
					plugins: [namedRouter],
				},
			});

			it('should clear the search when opening a folder from search results', async () => {
				vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
				vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
				foldersStore.totalWorkflowCount = 4;

				await namedRouter.push({
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: { projectId: 'project-1' },
					query: { search: 'candi' },
				});
				await namedRouter.isReady();

				const { getByTestId, unmount } = renderWithNamedRoutes({ pinia });
				await waitAllPromises();

				expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenLastCalledWith(
					'project-1',
					expect.any(Number),
					expect.any(Number),
					expect.any(String),
					expect.objectContaining({ query: 'candi' }),
					expect.any(Boolean),
					expect.any(Boolean),
				);

				workflowsListStore.fetchWorkflowsPage.mockClear();

				// FolderCard builds the folder URL from the current route query,
				// so the search term is carried into the folder route.
				await namedRouter.push({
					name: VIEWS.PROJECTS_FOLDERS,
					params: { projectId: 'project-1', folderId: 'folder-1' },
					query: { search: 'candi' },
				});
				await waitAllPromises();
				await waitAllPromises();

				expect(namedRouter.currentRoute.value.query.search).toBeUndefined();
				// The folder contents must load unfiltered
				expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenLastCalledWith(
					'project-1',
					expect.any(Number),
					expect.any(Number),
					expect.any(String),
					expect.objectContaining({ query: undefined, parentFolderId: 'folder-1' }),
					expect.any(Boolean),
					expect.any(Boolean),
				);
				const searchEl = getByTestId('resources-list-search');
				const searchInput =
					searchEl instanceof HTMLInputElement ? searchEl : searchEl.querySelector('input');
				expect(searchInput).toHaveValue('');
				unmount();
			});
		});
	});
});
