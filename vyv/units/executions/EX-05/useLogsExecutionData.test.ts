/**
 * EX-05 · Panel de logs — cargar los datos de una sub-ejecución.
 * Origen: packages/frontend/editor-ui/src/features/execution/logs/composables/useLogsExecutionData.test.ts
 */
import { setActivePinia } from 'pinia';
import { useLogsExecutionData } from '@/features/execution/logs/composables/useLogsExecutionData';
import type { NodeLogEntry } from '@/features/execution/logs/logs.types';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { nodeTypes } from '@/features/execution/logs/__test__/data';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createRunExecutionData, type INode, type IRunExecutionData } from 'n8n-workflow';
import { useToast } from '@n8n/composables/useToast';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { computed, isProxy } from 'vue';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

vi.mock('@n8n/composables/useToast');

// Setup of describe(useLogsExecutionData, (original top-level describe)
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
let documentStore: ReturnType<typeof useWorkflowDocumentStore>;

beforeEach(() => {
	setActivePinia(createTestingPinia({ stubActions: false }));

	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsListStore = mockedStore(useWorkflowsListStore);

	// The composable resolves the execution-state store via the injected
	// document store (falls back to `workflowsStore.workflowId`, '' here).
	executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(''));
	documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(''));

	nodeTypeStore = mockedStore(useNodeTypesStore);
	nodeTypeStore.setNodeTypes(nodeTypes);
});

describe('CP-EX-05-04 · Abrir una sub-ejecución', () => {
	describe('loadSubExecution', () => {
		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });

			executionStateStore.setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					id: 'e0',
					workflowData: createTestWorkflow({
						id: 'w0',
						nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B' })],
						connections: {
							A: {
								main: [[{ type: 'main', node: 'B', index: 0 }]],
							},
						},
					}),
					data: createRunExecutionData({
						resultData: {
							runData: {
								A: [createTestTaskData()],
								B: [
									createTestTaskData({
										metadata: { subExecution: { workflowId: 'w1', executionId: 'e1' } },
									}),
								],
							},
						},
					}),
				}),
			);

			vi.advanceTimersByTime(1000);
		});

		it('should add runs from sub execution to the entries', async () => {
			workflowsStore.fetchExecutionDataById.mockResolvedValueOnce(
				createTestWorkflowExecutionResponse({
					id: 'e1',
					data: {
						resultData: { runData: { C: [createTestTaskData()] } },
					} as unknown as IRunExecutionData,
					workflowData: createTestWorkflow({ id: 'w1', nodes: [createTestNode({ name: 'C' })] }),
				}),
			);

			const { loadSubExecution, entries } = useLogsExecutionData();

			await waitFor(() => expect(entries.value).toHaveLength(2));
			expect(entries.value[1].children).toHaveLength(0);

			await loadSubExecution(entries.value[1]);

			vi.advanceTimersByTime(1000);

			await waitFor(() => {
				expect(entries.value).toHaveLength(2);
				expect(entries.value[1].children).toHaveLength(1);
				const childEntry = entries.value[1].children[0] as NodeLogEntry;
				expect(childEntry.node.name).toBe('C');
				expect(childEntry.workflow.id).toBe('w1');
				expect(childEntry.executionId).toBe('e1');
			});
		});
	});
});
