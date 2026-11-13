/**
 * EX-03 · Vista previa, reintento y borrado — depurar en el editor con y sin licencia.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.test.ts
 */
import { describe, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { createRouter, createWebHistory, RouterLink } from 'vue-router';
import { randomInt, type ExecutionSummary, type AnnotationVote } from 'n8n-workflow';
import { useSettingsStore } from '@n8n/stores/settings.store';
import WorkflowExecutionsPreview from '@/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import type { IWorkflowDb } from '@/Interface';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type {
	ExecutionSummaryWithScopes,
	IExecutionResponse,
} from '@/features/execution/executions/executions.types';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import type { FrontendSettings } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { nextTick, computed, ref } from 'vue';
import type { WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';

const showMessage = vi.fn();
const showError = vi.fn();
const showToast = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError, showToast }),
}));

// Force the add-to-dataset action available so tests can assert the
// execution status/mode gating in the component itself.
vi.mock('@/features/ai/evaluation.ee/composables/useAddExecutionToDataset', () => ({
	useAddExecutionToDataset: () => ({
		isFeatureEnabled: ref(true),
		hasDataTableConfig: ref(true),
		fetchDataTableConfigs: vi.fn(),
		openModal: vi.fn(),
	}),
}));

const routes = [
	{ path: '/', name: 'home', component: { template: '<div></div>' } },
	{
		path: '/workflow/:workflowId/debug/:executionId',
		name: VIEWS.EXECUTION_DEBUG,
		component: { template: '<div></div>' },
	},
	{
		path: '/workflow/:workflowId/executions/:executionId',
		name: VIEWS.EXECUTION_PREVIEW,
		component: { template: '<div></div>' },
	},
	{
		path: '/workflow/:workflowId/history/:versionId?',
		name: VIEWS.WORKFLOW_HISTORY,
		component: { template: '<div></div>' },
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

const generateUndefinedNullOrString = () => {
	switch (randomInt(4)) {
		case 0:
			return undefined;
		case 1:
			return null;
		case 2:
			return faker.string.uuid();
		case 3:
			return '';
		default:
			return undefined;
	}
};

const executionDataFactory = (
	tags: Array<{ id: string; name: string }> = [],
): ExecutionSummaryWithScopes => ({
	id: faker.string.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	createdAt: faker.date.past(),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.number.int().toString(),
	workflowName: faker.string.sample(),
	status: faker.helpers.arrayElement(['error', 'success']),
	nodeExecutionStatus: {},
	retryOf: generateUndefinedNullOrString(),
	retrySuccessId: generateUndefinedNullOrString(),
	scopes: ['workflow:update'],
	annotation: { tags, vote: 'up' },
});

const renderComponent = createComponentRenderer(WorkflowExecutionsPreview, {
	global: {
		stubs: {
			// UN STUB router-link
			RouterLink,
			// The preview canvas loads and evicts per-execution data stores on mount,
			// which would clobber the state these tests seed.
			ExecutionPreviewHost: true,
			// Reka UI tooltips don't open in jsdom, so expose the props the component
			// passes and assert the wiring instead of driving the popup.
			N8nTooltip: {
				name: 'N8nTooltip',
				props: ['disabled', 'content'],
				template:
					'<div :data-tooltip-disabled="disabled" :data-tooltip-content="content"><slot /></div>',
			},
		},
		plugins: [router],
		provide: {
			[WorkflowIdKey]: computed(() => 'test-workflow-id'),
		},
	},
});

// Setup of describe('WorkflowExecutionsPreview.vue', (original top-level describe)
const executionData: ExecutionSummary = executionDataFactory();

beforeEach(() => {
	createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
					},
				},
			},
			[STORES.EXECUTIONS]: {
				activeExecution: executionData,
			},
		},
	});
});

describe('CP-EX-03-08 · Depurar en el editor sin licencia', () => {
	test.each([
		[false, [], '/'],
		[false, ['workflow:update'], '/'],
		[true, [], '/'],
		[true, ['workflow:read'], '/'],
		[true, ['workflow:update'], `/workflow/${executionData.workflowId}/debug/${executionData.id}`],
	])(
		'when debug enterprise feature is %s with workflow scopes %s it should handle debug link click accordingly',
		async (availability, scopes, path) => {
			const settingsStore = mockedStore(useSettingsStore);
			const workflowsListStore = mockedStore(useWorkflowsListStore);

			settingsStore.settings.enterprise = {
				...(settingsStore.settings.enterprise ?? {}),
				[EnterpriseEditionFeature.DebugInEditor]: availability,
			} as FrontendSettings['enterprise'];

			workflowsListStore.workflowsById[executionData.workflowId] = { scopes } as IWorkflowDb;

			await router.push(path);

			const { getByTestId } = renderComponent({ props: { execution: executionData } });

			await userEvent.click(getByTestId('execution-debug-button'));

			expect(router.currentRoute.value.path).toBe(path);
		},
	);
});
