/**
 * EX-05 · Panel de logs — construcción del árbol de logs (orden, error, sub-ejecución, tokens).
 * Origen: packages/frontend/editor-ui/src/features/execution/logs/logs.utils.test.ts
 */
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
} from '@/__tests__/mocks';
import {
	createLogTree,
	flattenLogEntries,
	findSelectedLogEntry,
	findSubExecutionLocator,
	getDefaultCollapsedEntries,
	getGroupExecutionStatus,
	getGroupTiming,
	getSubtreeTotalConsumedTokens,
	getTreeNodeData,
	isEmptyGroupLog,
	isSubNodeLog,
	mergeStartData,
	restoreChatHistory,
	processFiles,
	extractBotResponse,
} from '@/features/execution/logs/logs.utils';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	createEmptyRunExecutionData,
	createRunExecutionData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { ExecutionError, ITaskData, ITaskStartedData, IRunExecutionData } from 'n8n-workflow';
import {
	aiAgentNode,
	aiChatWorkflow,
	aiModelNode,
	createTestLogTreeCreationContext,
} from '@/features/execution/logs/__test__/data';
import {
	type GroupLogEntry,
	type LogEntry,
	type LogEntrySelection,
	type NodeLogEntry,
	isGroupLog,
	isNodeLog,
} from '@/features/execution/logs/logs.types';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { createTestLogEntry } from '@/features/execution/logs/__test__/mocks';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, NO_OP_NODE_TYPE } from '@/app/constants';

// A log tree of node entries only, all the way down (overrides the union-typed
// `children`/`parent` so assertions can read `.node`/`.runData` at any depth).
type NodeTreeEntry = Omit<NodeLogEntry, 'children' | 'parent'> & {
	parent?: NodeTreeEntry;
	children: NodeTreeEntry[];
};

// These tests never pass canvas groups, so the builder result can only contain node
// entries. Assert that recursively to narrow the tree without an unchecked cast.
function assertNodeTree(entries: LogEntry[]): asserts entries is NodeTreeEntry[] {
	for (const entry of entries) {
		if (!isNodeLog(entry)) {
			throw new Error(`Expected a node log entry but got a "${entry.type}" entry`);
		}
		assertNodeTree(entry.children);
	}
}

describe('CP-EX-05-01 · Orden de los nodos en el árbol', () => {
	describe(createLogTree, () => {
		it('should return root node log entries in ascending order of executionIndex', () => {
			const workflow = createTestWorkflowObject({
				nodes: [
					createTestNode({ name: 'A' }),
					createTestNode({ name: 'B' }),
					createTestNode({ name: 'C' }),
				],
				connections: {
					B: { main: [[{ node: 'A', type: NodeConnectionTypes.Main, index: 0 }]] },
					C: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			});
			const execution = createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [
								createTestTaskData({
									startTime: Date.parse('2025-04-04T00:00:00.000Z'),
									executionIndex: 0,
								}),
							],
							B: [
								createTestTaskData({
									startTime: Date.parse('2025-04-04T00:00:01.000Z'),
									executionIndex: 1,
								}),
							],
							C: [
								createTestTaskData({
									startTime: Date.parse('2025-04-04T00:00:02.000Z'),
									executionIndex: 3,
								}),
								createTestTaskData({
									startTime: Date.parse('2025-04-04T00:00:02.000Z'),
									executionIndex: 2,
								}),
							],
						},
					},
				}),
			});

			expect(createLogTree(workflow, execution)).toEqual([
				expect.objectContaining({ node: expect.objectContaining({ name: 'A' }), runIndex: 0 }),
				expect.objectContaining({ node: expect.objectContaining({ name: 'B' }), runIndex: 0 }),
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
				expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 0 }),
			]);
		});
	});
});

describe('CP-EX-05-03 · Detalle de un nodo con error', () => {
	describe(findSelectedLogEntry, () => {
		function find(state: LogEntrySelection, response: IExecutionResponse, isExecuting: boolean) {
			return findSelectedLogEntry(
				state,
				createLogTree(createTestWorkflowObject(response.workflowData), response),
				isExecuting,
			);
		}

		describe('when execution is finished and log is not manually selected', () => {
			it('should return first log entry with error', () => {
				const response = createTestWorkflowExecutionResponse({
					workflowData: createTestWorkflow({
						nodes: [
							createTestNode({ name: 'A' }),
							createTestNode({ name: 'B' }),
							createTestNode({ name: 'C' }),
						],
					}),
					data: createRunExecutionData({
						resultData: {
							runData: {
								A: [createTestTaskData({ executionStatus: 'success', startTime: 0 })],
								B: [createTestTaskData({ executionStatus: 'success', startTime: 1 })],
								C: [
									createTestTaskData({ executionStatus: 'success', startTime: 2 }),
									createTestTaskData({
										error: {} as ExecutionError,
										executionStatus: 'error',
										startTime: 3,
									}),
									createTestTaskData({
										error: {} as ExecutionError,
										executionStatus: 'error',
										startTime: 4,
									}),
								],
							},
						},
					}),
				});

				expect(find({ type: 'initial' }, response, false)).toEqual(
					expect.objectContaining({ node: expect.objectContaining({ name: 'C' }), runIndex: 1 }),
				);
			});
		});
	});
});

describe('CP-EX-05-04 · Abrir una sub-ejecución', () => {
	describe(createLogTree, () => {
		it('should include runs of a sub execution', () => {
			const workflow = createTestWorkflowObject({
				id: 'root-workflow-id',
				nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B' })],
				connections: {
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			});
			const subWorkflow = createTestWorkflowObject({
				id: 'sub-workflow-id',
				nodes: [createTestNode({ name: 'C' })],
			});
			const rootExecutionData = createTestWorkflowExecutionResponse({
				id: 'root-exec-id',
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [createTestTaskData()],
							B: [
								createTestTaskData({
									metadata: {
										subExecution: { workflowId: 'sub-workflow-id', executionId: 'sub-exec-id' },
									},
								}),
							],
						},
					},
				}),
			});
			const subExecutionData = createRunExecutionData({
				resultData: { runData: { C: [createTestTaskData(), createTestTaskData()] } },
			});
			const logs = createLogTree(
				workflow,
				rootExecutionData,
				{ 'sub-workflow-id': subWorkflow },
				{ 'sub-exec-id': subExecutionData },
			);
			assertNodeTree(logs);

			expect(logs).toHaveLength(2);

			expect(logs[0].node.name).toBe('A');
			expect(logs[0].workflow).toBe(workflow);
			expect(logs[0].execution).toBe(rootExecutionData.data);
			expect(logs[0].executionId).toBe('root-exec-id');
			expect(logs[0].children).toHaveLength(0);

			expect(logs[1].node.name).toBe('B');
			expect(logs[1].workflow).toBe(workflow);
			expect(logs[1].execution).toBe(rootExecutionData.data);
			expect(logs[1].executionId).toBe('root-exec-id');
			expect(logs[1].children).toHaveLength(2);

			expect(logs[1].children[0].node.name).toBe('C');
			expect(logs[1].children[0].workflow).toBe(subWorkflow);
			expect(logs[1].children[0].execution).toBe(subExecutionData);
			expect(logs[1].children[0].executionId).toBe('sub-exec-id');
			expect(logs[1].children[0].children).toHaveLength(0);

			expect(logs[1].children[1].node.name).toBe('C');
			expect(logs[1].children[1].workflow).toBe(subWorkflow);
			expect(logs[1].children[1].execution).toBe(subExecutionData);
			expect(logs[1].children[1].executionId).toBe('sub-exec-id');
			expect(logs[1].children[1].children).toHaveLength(0);
		});
	});
});

describe('CP-EX-05-06 · Conteo de tokens con un nodo de IA', () => {
	describe('createLogTree with canvas groups', () => {
		const group = { id: 'group-1', name: 'My Group', nodeIds: ['B', 'C'] };

		function expectGroup(entry: LogEntry): GroupLogEntry {
			if (!isGroupLog(entry)) {
				throw new Error('expected a group log entry');
			}
			return entry;
		}

		function expectNode(entry: LogEntry): NodeLogEntry {
			if (!isNodeLog(entry)) {
				throw new Error('expected a node log entry');
			}
			return entry;
		}

		// Linear main flow A -> B -> C -> D, with B and C optionally grouped.
		function createLinearWorkflow(nodeIds: Record<string, string> = {}) {
			return createTestWorkflowObject({
				id: 'w1',
				nodes: [
					createTestNode({ id: nodeIds.A ?? 'A', name: 'A' }),
					createTestNode({ id: nodeIds.B ?? 'B', name: 'B' }),
					createTestNode({ id: nodeIds.C ?? 'C', name: 'C' }),
					createTestNode({ id: nodeIds.D ?? 'D', name: 'D' }),
				],
				connections: {
					A: { main: [[{ node: 'B', type: NodeConnectionTypes.Main, index: 0 }]] },
					B: { main: [[{ node: 'C', type: NodeConnectionTypes.Main, index: 0 }]] },
					C: { main: [[{ node: 'D', type: NodeConnectionTypes.Main, index: 0 }]] },
				},
			});
		}

		function taskAt(seconds: number, partial: Partial<ReturnType<typeof createTestTaskData>> = {}) {
			return createTestTaskData({
				startTime: Date.parse('2025-01-01T00:00:00.000Z') + seconds * 1000,
				executionIndex: seconds,
				...partial,
			});
		}

		function linearResponse() {
			return createTestWorkflowExecutionResponse({
				id: 'e1',
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [taskAt(0)],
							B: [taskAt(1, { source: [{ previousNode: 'A', previousNodeRun: 0 }] })],
							C: [taskAt(2, { source: [{ previousNode: 'B', previousNodeRun: 0 }] })],
							D: [taskAt(3, { source: [{ previousNode: 'C', previousNodeRun: 0 }] })],
						},
					},
				}),
			});
		}

		// Grouped nodes must stay main-flow nodes: a false sub-node match makes their input pane show their own output

		it('sums member tokens once for a group', () => {
			const withTokens = (total: number) => ({
				data: {
					main: [
						[
							{
								json: { tokenUsage: { completionTokens: 0, promptTokens: 0, totalTokens: total } },
							},
						],
					],
				},
			});
			const response = createTestWorkflowExecutionResponse({
				id: 'e1',
				data: createRunExecutionData({
					resultData: {
						runData: {
							A: [taskAt(0)],
							B: [taskAt(1, withTokens(10))],
							C: [taskAt(2, withTokens(5))],
						},
					},
				}),
			});

			const logs = createLogTree(createLinearWorkflow(), response, {}, {}, undefined, [group]);
			const groupEntry = expectGroup(logs[1]);

			expect(getSubtreeTotalConsumedTokens(groupEntry, false).totalTokens).toBe(15);
		});
	});
});
