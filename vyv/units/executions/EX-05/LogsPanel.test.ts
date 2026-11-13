/**
 * EX-05 · Panel de logs — panel completo (detalle y atajos de teclado).
 * Origen: packages/frontend/editor-ui/src/features/execution/logs/components/LogsPanel.test.ts
 */
import { renderComponent } from '@/__tests__/render';
import { moveResize, startResize } from '@/__tests__/resize';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { computed, h, nextTick, shallowRef } from 'vue';
import {
	aiAgentNode,
	aiChatExecutionResponse as aiChatExecutionResponseTemplate,
	aiChatWorkflow,
	aiManualExecutionResponse,
	aiManualWorkflow,
	nodeTypes,
} from '@/features/execution/logs/__test__/data';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { IN_PROGRESS_EXECUTION_ID, LOGS_EXECUTION_DATA_THROTTLE_DURATION } from '@/app/constants';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	LogsPanelHostKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
} from '@/app/constants/injectionKeys';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createRunExecutionData, deepCopy } from 'n8n-workflow';
import { createTestTaskData } from '@/__tests__/mocks';
import { useLogsStore } from '@/app/stores/logs.store';
import { useUIStore } from '@/app/stores/ui.store';
import { LOGS_PANEL_STATE } from '@/features/execution/logs/logs.constants';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import { userEvent } from '@testing-library/user-event';
import { useToast } from '@n8n/composables/useToast';
import type { IWorkflowDb } from '@/Interface';

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				clearAllStickyNotifications: vi.fn(),
			};
		},
	};
});

const mockCopy = vi.fn();
vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		useClipboard: () => {
			return {
				copy: mockCopy,
			};
		},
	};
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	const { useWorkflowsStore } = await import('@/app/stores/workflows.store');
	return {
		useWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
		useRouteWorkflowId: () => computed(() => useWorkflowsStore().workflowId),
	};
});

// Setup of describe('LogsPanel', (original top-level describe)
const VIEWPORT_HEIGHT = 800;

let pinia: TestingPinia;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let logsStore: ReturnType<typeof mockedStore<typeof useLogsStore>>;
let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

let aiChatExecutionResponse: typeof aiChatExecutionResponseTemplate;

function setWorkflow(workflow: IWorkflowDb) {
	workflowsStore.setWorkflowId(workflow.id);
	const store = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
	store.hydrate(workflow);
	ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId(workflow.id));
}

// Production stages execution data on the per-document execution-state store.
// The component resolves it from the injected document store, which is keyed by
// `workflowsStore.workflowId` — so resolve the same store here for test setup.
function setExecutionData(execution: IExecutionResponse | null) {
	useWorkflowExecutionStateStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	).setWorkflowExecutionData(execution);
}

function render(provide: Record<symbol, unknown> = {}) {
	const wfId = workflowsStore.workflowId;
	const wrapper = renderComponent(LogsPanel, {
		global: {
			provide: {
				...provide,
				[ChatSymbol as symbol]: {},
				[ChatOptionsSymbol as symbol]: {},
				[WorkflowIdKey as unknown as string]: computed(() => wfId),
				[WorkflowDocumentStoreKey as symbol]: shallowRef(
					useWorkflowDocumentStore(createWorkflowDocumentId(wfId)),
				),
			},
			plugins: [
				createRouter({
					history: createWebHistory(),
					routes: [{ path: '/', component: () => h('div') }],
				}),
				pinia,
			],
		},
	});

	vi.advanceTimersByTime(1000);

	return wrapper;
}

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });

	pinia = createTestingPinia({ stubActions: false, fakeApp: true });

	setActivePinia(pinia);

	workflowsStore = mockedStore(useWorkflowsStore);
	setExecutionData(null);

	logsStore = mockedStore(useLogsStore);
	logsStore.toggleOpen(false);

	nodeTypeStore = mockedStore(useNodeTypesStore);
	nodeTypeStore.setNodeTypes(nodeTypes);

	ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId(workflowsStore.workflowId));

	uiStore = mockedStore(useUIStore);

	Object.defineProperty(document.body, 'offsetHeight', {
		configurable: true,
		get() {
			return VIEWPORT_HEIGHT;
		},
	});
	vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
		y: 0,
		height: VIEWPORT_HEIGHT,
	} as DOMRect);

	localStorage.clear();

	aiChatExecutionResponse = deepCopy(aiChatExecutionResponseTemplate);
});

afterEach(async () => {
	await flushPromises();
	await vi.runOnlyPendingTimersAsync();
});

describe('CP-EX-05-02 · Detalle de entrada y salida de un nodo', () => {
	it('should render only output panel of selected node by default', async () => {
		logsStore.toggleOpen(true);
		setWorkflow(aiManualWorkflow);
		setExecutionData(aiManualExecutionResponse);

		const rendered = render();

		await waitFor(() =>
			expect(rendered.queryByTestId('log-details-header')).toHaveTextContent('AI Agent'),
		);
		expect(rendered.queryByTestId('log-details-input')).not.toBeInTheDocument();
		expect(rendered.queryByTestId('log-details-output')).toBeInTheDocument();
	});
});

describe('CP-EX-05-05 · Atajos de teclado del panel', () => {
	describe('selection', () => {
		beforeEach(() => {
			logsStore.toggleOpen(true);
			setWorkflow(aiChatWorkflow);
			setExecutionData(aiChatExecutionResponse);
		});

		it('should allow to select previous and next row via keyboard shortcut', async () => {
			const { getByTestId, findByRole } = render();
			const overview = getByTestId('logs-overview');

			await waitFor(async () =>
				expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/),
			);
			await fireEvent.keyDown(overview, { key: 'K' });
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Agent/);
			await fireEvent.keyDown(overview, { key: 'J' });
			expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			logsStore.toggleOpen(true);
			setWorkflow(aiChatWorkflow);
			setExecutionData(aiChatExecutionResponse);
		});

		it('should handle arrow navigation without bubbling to canvas shortcuts', async () => {
			const { getByTestId, findByRole } = render();
			const overview = getByTestId('logs-overview');
			const documentKeydown = vi.fn();
			document.addEventListener('keydown', documentKeydown);

			try {
				await waitFor(async () =>
					expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/),
				);
				await fireEvent.keyDown(overview, { key: 'ArrowUp' });

				expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Agent/);
				await fireEvent.keyDown(overview, { key: 'ArrowDown' });
				expect(await findByRole('treeitem', { selected: true })).toHaveTextContent(/AI Model/);
				expect(documentKeydown).not.toHaveBeenCalled();
			} finally {
				document.removeEventListener('keydown', documentKeydown);
			}
		});
	});
});
