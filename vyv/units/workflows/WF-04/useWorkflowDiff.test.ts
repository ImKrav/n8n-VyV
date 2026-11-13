/**
 * WF-04 · Historial de versiones y diff — comparar dos versiones.
 * Origen: packages/frontend/editor-ui/src/features/workflows/workflowDiff/useWorkflowDiff.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed, effectScope, nextTick } from 'vue';
import { mapConnections, useWorkflowDiff } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import type { CanvasConnection, CanvasNode } from '@/features/workflows/canvas/canvas.types';
import type { ExecutionOutputMap } from '@/app/types/executionData';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { NodeDiffStatus, type IConnections } from 'n8n-workflow';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';
import { createNodeExecutionSnapshot } from '@/features/workflows/canvas/__tests__/utils';
import { disposeWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { disposeWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

// Mock modules at top level
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'test-workflow',
	}),
}));

const mockDocumentStore = vi.hoisted(() => ({
	hydrate: vi.fn(),
	render: {
		nodeInputsByNodeId: new Map(),
		nodeOutputsByNodeId: new Map(),
		pinnedDataByNodeName: {},
		executionIssuesByNodeName: new Map(),
	},
	$id: 'test-store',
	$dispose: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStore,
	createWorkflowDocumentId: vi.fn(
		(workflowId: string, version: string = 'latest') => `${workflowId}@${version}`,
	),
	disposeWorkflowDocumentStore: vi.fn(),
}));

vi.mock('@/app/stores/workflowDocument/useWorkflowDocumentRenderData', async () => {
	const { createEmptyCanvasRenderData } = await vi.importActual<
		typeof import('@/features/workflows/canvas/canvas.utils')
	>('@/features/workflows/canvas/canvas.utils');
	return {
		useWorkflowDocumentRenderData: vi.fn(() => createEmptyCanvasRenderData()),
	};
});

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn((id: string) => ({
		$id: id,
		activeExecutionIssuesByNodeName: new Map(),
	})),
	disposeWorkflowExecutionStateStore: vi.fn(),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn().mockReturnValue({
			name: 'Test Node Type',
			version: 1,
		}),
	}),
}));

vi.mock('@/features/workflows/canvas/composables/useCanvasMapping', () => ({
	useCanvasMapping: vi.fn().mockReturnValue({
		additionalNodePropertiesById: computed(() => ({})),
		nodeExecutionRunDataOutputMapById: computed(() => ({})),
		nodeExecutionWaitingForNextById: computed(() => ({})),
		nodeHasIssuesById: computed(() => ({})),
		nodeDisplaySizeById: computed(() => ({})),
		nodes: computed(() => []),
		connections: computed(() => []),
	}),
}));

// Setup of describe('useWorkflowDiff', (original top-level describe)

describe('CP-WF-04-05 · Comparar dos versiones (diff)', () => {
	describe('useWorkflowDiff composable', () => {
		const mockUseCanvasMapping = vi.mocked(useCanvasMapping);

		const createMockCanvasMappingReturn = (
			nodes: Array<Partial<CanvasNode>> = [],
			connections: Array<Partial<CanvasConnection>> = [],
		) => ({
			additionalNodePropertiesById: computed(() => ({}) as Record<string, Partial<CanvasNode>>),
			nodeExecutionRunDataOutputMapById: computed(() => ({}) as Record<string, ExecutionOutputMap>),
			nodeExecutionWaitingForNextById: computed(() => ({}) as Record<string, boolean>),
			nodeHasIssuesById: computed(() => ({}) as Record<string, boolean>),
			nodeDisplaySizeById: computed(
				() => ({}) as Record<string, { width: number; height: number }>,
			),
			getNodeExecutionSnapshot: () => createNodeExecutionSnapshot(),
			nodes: computed(() => nodes as CanvasNode[]),
			connections: computed(() => connections as CanvasConnection[]),
		});

		beforeEach(() => {
			vi.clearAllMocks();
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn());
		});

		const createMockWorkflow = (
			id: string,
			nodes: INodeUi[] = [],
			connections: IConnections = {},
		): IWorkflowDb => ({
			id,
			name: `Workflow ${id}`,
			nodes,
			connections,
			active: false,
			activeVersionId: null,
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
			tags: [],
			pinData: {},
			settings: {
				executionOrder: 'v1',
			},
			versionId: 'version-1',
			isArchived: false,
		});

		const createMockNode = (id: string, overrides: Partial<INodeUi> = {}): INodeUi => ({
			id,
			name: `Node ${id}`,
			type: 'test-node',
			typeVersion: 1,
			position: [100, 100],
			parameters: {},
			...overrides,
		});

		const createMockCanvasConnection = (
			id: string,
			overrides: Partial<CanvasConnection> = {},
		): CanvasConnection => ({
			id,
			source: `node-${id}-source`,
			target: `node-${id}-target`,
			sourceHandle: 'main',
			targetHandle: 'main',
			...overrides,
		});

		it('should compute nodesDiff correctly', () => {
			const sourceNode = createMockNode('node1', { name: 'Source Node' });
			const targetNode = createMockNode('node1', { name: 'Target Node' });
			const sourceWorkflow = createMockWorkflow('source', [sourceNode]);
			const targetWorkflow = createMockWorkflow('target', [targetNode]);

			const { nodesDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(nodesDiff.value.size).toBe(1);
			expect(nodesDiff.value.get('node1')?.status).toBe(NodeDiffStatus.Modified);
		});
	});

	describe('useWorkflowDiff composable', () => {
		const mockUseCanvasMapping = vi.mocked(useCanvasMapping);

		const createMockCanvasMappingReturn = (
			nodes: Array<Partial<CanvasNode>> = [],
			connections: Array<Partial<CanvasConnection>> = [],
		) => ({
			additionalNodePropertiesById: computed(() => ({}) as Record<string, Partial<CanvasNode>>),
			nodeExecutionRunDataOutputMapById: computed(() => ({}) as Record<string, ExecutionOutputMap>),
			nodeExecutionWaitingForNextById: computed(() => ({}) as Record<string, boolean>),
			nodeHasIssuesById: computed(() => ({}) as Record<string, boolean>),
			nodeDisplaySizeById: computed(
				() => ({}) as Record<string, { width: number; height: number }>,
			),
			getNodeExecutionSnapshot: () => createNodeExecutionSnapshot(),
			nodes: computed(() => nodes as CanvasNode[]),
			connections: computed(() => connections as CanvasConnection[]),
		});

		beforeEach(() => {
			vi.clearAllMocks();
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn());
		});

		const createMockWorkflow = (
			id: string,
			nodes: INodeUi[] = [],
			connections: IConnections = {},
		): IWorkflowDb => ({
			id,
			name: `Workflow ${id}`,
			nodes,
			connections,
			active: false,
			activeVersionId: null,
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
			tags: [],
			pinData: {},
			settings: {
				executionOrder: 'v1',
			},
			versionId: 'version-1',
			isArchived: false,
		});

		const createMockNode = (id: string, overrides: Partial<INodeUi> = {}): INodeUi => ({
			id,
			name: `Node ${id}`,
			type: 'test-node',
			typeVersion: 1,
			position: [100, 100],
			parameters: {},
			...overrides,
		});

		const createMockCanvasConnection = (
			id: string,
			overrides: Partial<CanvasConnection> = {},
		): CanvasConnection => ({
			id,
			source: `node-${id}-source`,
			target: `node-${id}-target`,
			sourceHandle: 'main',
			targetHandle: 'main',
			...overrides,
		});

		it('should handle workflows with different nodes', () => {
			const sourceNodes = [createMockNode('node1'), createMockNode('node2')];
			const targetNodes = [createMockNode('node1'), createMockNode('node3')];
			const sourceWorkflow = createMockWorkflow('source', sourceNodes);
			const targetWorkflow = createMockWorkflow('target', targetNodes);

			const { nodesDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(nodesDiff.value.size).toBe(3);
			expect(nodesDiff.value.get('node1')?.status).toBe(NodeDiffStatus.Eq);
			expect(nodesDiff.value.get('node2')?.status).toBe(NodeDiffStatus.Deleted);
			expect(nodesDiff.value.get('node3')?.status).toBe(NodeDiffStatus.Added);
		});
	});

	describe('useWorkflowDiff composable', () => {
		const mockUseCanvasMapping = vi.mocked(useCanvasMapping);

		const createMockCanvasMappingReturn = (
			nodes: Array<Partial<CanvasNode>> = [],
			connections: Array<Partial<CanvasConnection>> = [],
		) => ({
			additionalNodePropertiesById: computed(() => ({}) as Record<string, Partial<CanvasNode>>),
			nodeExecutionRunDataOutputMapById: computed(() => ({}) as Record<string, ExecutionOutputMap>),
			nodeExecutionWaitingForNextById: computed(() => ({}) as Record<string, boolean>),
			nodeHasIssuesById: computed(() => ({}) as Record<string, boolean>),
			nodeDisplaySizeById: computed(
				() => ({}) as Record<string, { width: number; height: number }>,
			),
			getNodeExecutionSnapshot: () => createNodeExecutionSnapshot(),
			nodes: computed(() => nodes as CanvasNode[]),
			connections: computed(() => connections as CanvasConnection[]),
		});

		beforeEach(() => {
			vi.clearAllMocks();
			mockUseCanvasMapping.mockReturnValue(createMockCanvasMappingReturn());
		});

		const createMockWorkflow = (
			id: string,
			nodes: INodeUi[] = [],
			connections: IConnections = {},
		): IWorkflowDb => ({
			id,
			name: `Workflow ${id}`,
			nodes,
			connections,
			active: false,
			activeVersionId: null,
			createdAt: '2023-01-01T00:00:00.000Z',
			updatedAt: '2023-01-01T00:00:00.000Z',
			tags: [],
			pinData: {},
			settings: {
				executionOrder: 'v1',
			},
			versionId: 'version-1',
			isArchived: false,
		});

		const createMockNode = (id: string, overrides: Partial<INodeUi> = {}): INodeUi => ({
			id,
			name: `Node ${id}`,
			type: 'test-node',
			typeVersion: 1,
			position: [100, 100],
			parameters: {},
			...overrides,
		});

		const createMockCanvasConnection = (
			id: string,
			overrides: Partial<CanvasConnection> = {},
		): CanvasConnection => ({
			id,
			source: `node-${id}-source`,
			target: `node-${id}-target`,
			sourceHandle: 'main',
			targetHandle: 'main',
			...overrides,
		});

		it('should compute connectionsDiff correctly', () => {
			const sourceConnections = [createMockCanvasConnection('conn1')];
			const targetConnections = [
				createMockCanvasConnection('conn1'),
				createMockCanvasConnection('conn2'),
			];

			const sourceWorkflow = createMockWorkflow('source');
			const targetWorkflow = createMockWorkflow('target');

			mockUseCanvasMapping
				.mockReturnValueOnce(createMockCanvasMappingReturn([], sourceConnections))
				.mockReturnValueOnce(createMockCanvasMappingReturn([], targetConnections));

			const { connectionsDiff } = useWorkflowDiff(sourceWorkflow, targetWorkflow);

			expect(connectionsDiff.value.size).toBe(1);
			expect(connectionsDiff.value.get('conn2')?.status).toBe(NodeDiffStatus.Added);
		});
	});
});
