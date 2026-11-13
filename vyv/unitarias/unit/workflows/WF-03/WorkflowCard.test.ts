/**
 * WF-03 · Publicar / activar y desactivar — acción «Unpublish» de la tarjeta del workflow.
 * Origen: packages/frontend/editor-ui/src/app/components/WorkflowCard.test.ts
 */
import type { Mock, MockInstance } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import WorkflowCard from '@/app/components/WorkflowCard.vue';
import type { WorkflowResource } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { FrontendSettings } from '@n8n/api-types';
import * as vueRouter from 'vue-router';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useMCPStore } from '@n8n/frontend-module-mcp';
import { useUIStore } from '@/app/stores/ui.store';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from '@/experiments/surfaceMcpToNewCloudUsers/constants';
// Experiment cleanup: remove with openWorkflowInAssistant.
import { useOpenWorkflowInAssistantStore } from '@/experiments/openWorkflowInAssistant/stores/openWorkflowInAssistant.store';
import { INSTANCE_AI_NEW_VIEW } from '@/features/ai/instanceAi/constants';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({
			params: {},
			location: {},
		}),
		RouterLink: vi.fn(),
	};
});

vi.mock('@n8n/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
			showToast,
		}),
	};
});

vi.mock('@/app/composables/useMessage', () => {
	const confirm = vi.fn(async () => MODAL_CONFIRM);
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

vi.mock('@/app/composables/useWorkflowActivate', () => {
	const unpublishWorkflowFromHistory = vi.fn().mockResolvedValue(true);
	const publishWorkflow = vi.fn().mockResolvedValue({ success: true });
	return {
		useWorkflowActivate: () => ({
			unpublishWorkflowFromHistory,
			publishWorkflow,
		}),
	};
});

vi.mock('@n8n/utils/event-bus', () => ({
	createEventBus: () => ({
		once: vi.fn((event, callback) => {
			// Auto-trigger the callback for testing
			if (event === 'unpublish') {
				callback();
			}
		}),
		emit: vi.fn(),
	}),
}));

const renderComponent = createComponentRenderer(WorkflowCard, {
	pinia: createTestingPinia({}),
});

const createWorkflow = (overrides = {}): WorkflowResource => ({
	resourceType: 'workflow',
	id: '1',
	name: 'My Workflow',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	readOnly: false,
	...overrides,
});

// Setup of describe('WorkflowCard', (original top-level describe)
let windowOpenSpy: MockInstance;
let router: ReturnType<typeof vueRouter.useRouter>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let mcpStore: MockedStore<typeof useMCPStore>;
let uiStore: MockedStore<typeof useUIStore>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;

beforeEach(async () => {
	router = vueRouter.useRouter();
	projectsStore = mockedStore(useProjectsStore);
	settingsStore = mockedStore(useSettingsStore);
	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsListStore = mockedStore(useWorkflowsListStore);
	usersStore = mockedStore(useUsersStore);
	mcpStore = mockedStore(useMCPStore);
	uiStore = mockedStore(useUIStore);
	message = useMessage();
	toast = useToast();

	settingsStore.settings = {
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
	} as unknown as FrontendSettings;
	vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

	windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
	vi.clearAllMocks();
});

// Experiment cleanup: remove with openWorkflowInAssistant.

describe('CP-WF-03-05 · Despublicar detiene el trigger', () => {
	describe('Unpublish functionality', () => {
		beforeEach(() => {
			// Enable draft/publish feature by default for unpublish tests
			settingsStore.isFeatureEnabled = vi.fn().mockReturnValue(true);
		});

		it('should emit workflow:unpublished event when unpublish action is successful', async () => {
			const data = createWorkflow({
				activeVersionId: 'v1',
				scopes: ['workflow:unpublish'],
			});

			const { getByTestId, emitted } = renderComponent({ props: { data } });
			const cardActions = getByTestId('workflow-card-actions');
			const cardActionsOpener = within(cardActions).getByRole('button');
			const controllingId = cardActionsOpener.getAttribute('aria-controls');

			await userEvent.click(cardActionsOpener);
			const actions = document.querySelector<HTMLElement>(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			// Find and click the unpublish action
			const unpublishAction = within(actions).getByTestId('action-unpublish');
			await userEvent.click(unpublishAction);

			await waitFor(() => {
				expect(emitted()['workflow:unpublished']).toBeTruthy();
				expect(emitted()['workflow:unpublished'][0]).toEqual([{ id: '1' }]);
			});
		});
	});
});
