/**
 * EX-03 · Vista previa, reintento y borrado — depurar en el editor (datos fijados).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/composables/useExecutionDebugging.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useExecutionDebugging } from '@/features/execution/executions/composables/useExecutionDebugging';
import type { INodeUi } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useToast } from '@n8n/composables/useToast';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useAiSimulatedExecutionsStore } from '@/app/stores/aiSimulatedExecutions.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';

vi.mock('@n8n/composables/useToast', () => {
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showToast,
		}),
	};
});

const { mockConfirm, mockRouterPush, mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockConfirm: vi.fn(),
	mockRouterPush: vi.fn(),
	mockWorkflowDocumentStore: {
		documentId: 'test-id@latest',
		workflowId: 'test-workflow',
		allNodes: [] as INodeUi[],
		workflowTriggerNodes: [] as INodeUi[],
		getParentNodes: vi.fn().mockReturnValue([]),
		pinNodeData: vi.fn(),
		unpinNodeData: vi.fn(),
		clearPinnedDataTimestamps: vi.fn(),
		resetAllNodesIssues: vi.fn(),
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		pinnedDataByNodeName: {},
		settings: {},
	} satisfies Partial<ReturnType<typeof useWorkflowDocumentStore>>,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn().mockReturnValue(mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
	injectWorkflowDocumentStore: () => ({ value: mockWorkflowDocumentStore }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mockRouterPush }),
}));

let executionDebugging: ReturnType<typeof useExecutionDebugging>;
let toast: ReturnType<typeof useToast>;
let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

// Setup of describe('useExecutionDebugging()', (original top-level describe)
beforeEach(() => {
	vi.clearAllMocks();
	createTestingPinia();

	mockWorkflowDocumentStore.allNodes = [];
	mockWorkflowDocumentStore.getParentNodes.mockReturnValue([]);
	mockWorkflowDocumentStore.pinnedDataByNodeName = {};
	mockConfirm.mockResolvedValue(MODAL_CONFIRM);

	const workflowStore = mockedStore(useWorkflowsStore);
	workflowStore.setWorkflowId('test-workflow');

	toast = useToast();

	// Production resolves the execution-state store by the injected document
	// store's `documentId` ('test-id@latest' on the mock above).
	executionStateStore = useWorkflowExecutionStateStore('test-id@latest');

	executionDebugging = useExecutionDebugging();
});

describe('CP-EX-03-07 · Depurar en el editor (con licencia)', () => {
	it('should applyExecutionData', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						testNode: [
							{
								data: {},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.allNodes = [{ name: 'testNode' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		const setWorkflowExecutionData = vi.spyOn(executionStateStore, 'setWorkflowExecutionData');

		await executionDebugging.applyExecutionData('1');

		expect(setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
		expect(toast.showToast).toHaveBeenCalledTimes(1);
	});

	it('should mark workflow as dirty after pinning imported execution data', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						TriggerNode: [
							{
								data: {
									main: [[{ json: { id: '1' } }, { json: { id: '2' } }]],
								},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		const uiStore = mockedStore(useUIStore);
		mockWorkflowDocumentStore.allNodes = [{ name: 'TriggerNode' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(uiStore.markStateDirty).toHaveBeenCalledTimes(1);
	});
});
