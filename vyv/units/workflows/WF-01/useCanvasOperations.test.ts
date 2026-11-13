/**
 * WF-01 · Edición en el canvas — operaciones del lienzo (añadir, conectar, mover, eliminar, desactivar, copiar y pegar nodos).
 * Origen: packages/frontend/editor-ui/src/app/composables/useCanvasOperations.test.ts
 */
import { setActivePinia } from 'pinia';
import type {
	IConnection,
	IConnections,
	INodeTypeDescription,
	IPinData,
	IWebhookDescription,
	INodeConnections,
	WorkflowExecuteMode,
	Workflow,
	IWorkflowGroup,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, TelemetryHelpers, deepCopy } from 'n8n-workflow';
import { UserError } from '@n8n/errors';
import type { CanvasConnection, CanvasNode } from '@/features/workflows/canvas/canvas.types';
import { CanvasConnectionMode } from '@/features/workflows/canvas/canvas.types';
import type {
	AddedNode,
	INodeUi,
	IWorkflowDb,
	WorkflowDataWithTemplateId,
	XYPosition,
} from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type {
	ICredentialsResponse,
	IUsedCredential,
} from '@/features/credentials/credentials.types';
import type { IWorkflowTemplate, IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import {
	AddConnectionCommand,
	AddNodeCommand,
	AddNodeGroupCommand,
	BulkCommand,
	historyBus,
	MoveNodeCommand,
	RemoveNodeCommand,
	RemoveNodeGroupCommand,
	ReplaceNodeParametersCommand,
	UpdateNodeGroupCommand,
} from '@/app/models/history';
import type { Command } from '@/app/models/history';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useAgentNodeCanvasGeometryStore } from '@/features/agents/agentNodeCanvasGeometry.store';
import { getNDVStoreId, useNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	createMockEnterpriseSettings,
	createMockNodeTypes,
	createTestNode,
	createTestNodeProperties,
	createTestWorkflow,
	createTestWorkflowObject,
	mockLoadedNodeType,
	mockNode,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mock } from 'vitest-mock-extended';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import {
	AGENT_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	MESSAGE_AN_AGENT_NODE_TYPE,
	NO_OP_NODE_TYPE,
	OPEN_AI_CHAT_MODEL_NODE_TYPE,
	SET_NODE_TYPE,
	SLACK_NODE_TYPE,
	STICKY_NODE_TYPE,
	UPDATE_WEBHOOK_ID_NODE_TYPES,
	VIEWS,
	WEBHOOK_NODE_TYPE,
	EnterpriseEditionFeature,
} from '@/app/constants';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { Connection } from '@vue-flow/core';
import { useClipboard } from '@vueuse/core';
import { createCanvasConnectionHandleString } from '@/features/workflows/canvas/canvas.utils';
import { isVNode, nextTick, reactive, ref, shallowRef } from 'vue';
import type { CanvasLayoutEvent } from '@/features/workflows/canvas/composables/useCanvasLayout';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import * as nodeHelpers from '@/app/composables/useNodeHelpers';
import * as workflowsApi from '@/app/api/workflows';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowDocumentConnections } from '@/app/stores/workflowDocument/useWorkflowDocumentConnections';
import { useWorkflowDocumentGraph } from '@/app/stores/workflowDocument/useWorkflowDocumentGraph';

import { useRouter } from 'vue-router';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';

const mockRoute = reactive({
	query: {},
	params: {},
});

const mockRouterReplace = vi.fn();

// This file turns every PostHog flag on, so the group rules need their own
// switches: most of these tests describe the strict rules.
const allowTriggerInGroup = shallowRef(false);
const allowMultipleBoundaryNodes = shallowRef(false);
vi.mock('@/app/composables/useNodeGroupRules', () => ({
	useNodeGroupRules: () => ({ allowTriggerInGroup, allowMultipleBoundaryNodes }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => mockRoute,
	useRouter: () => ({
		replace: mockRouterReplace,
	}),
}));

vi.mock('@/app/api/workflows', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/api/workflows')>();
	return {
		...actual,
		getNewWorkflow: vi.fn().mockResolvedValue({ name: 'New Workflow', settings: {} }),
		getNewWorkflowData: vi.fn().mockResolvedValue({ name: 'New Workflow', settings: {} }),
	};
});

vi.mock('@n8n/rest-api-client/api/workflowHistory', () => ({
	getWorkflowHistory: vi.fn().mockResolvedValue([]),
	getWorkflowVersion: vi.fn().mockResolvedValue({ workflow: { nodes: [], connections: {} } }),
}));

import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import * as workflowHelpersModule from '@/app/composables/useWorkflowHelpers';
import * as nodeGroupOperationGuards from '@/features/workflows/canvas/composables/useCanvasNodeGroupOperationGuards';
import { DEFAULT_NODE_SIZE, GRID_SIZE, HORIZONTAL_NODE_STEP } from '@/app/utils/nodeViewUtils';
import { AGENT_NODE_SIZE } from '@/features/agents/utils/agentNode';

vi.mock('n8n-workflow', async (importOriginal) => {
	const actual = await importOriginal<typeof import('n8n-workflow')>();
	return {
		...actual,
		TelemetryHelpers: {
			...actual.TelemetryHelpers,
			generateNodesGraph: vi.fn().mockReturnValue({
				nodeGraph: {
					nodes: [],
				},
			}),
		},
		isHitlToolType: vi.fn((nodeType: string) => {
			return nodeType.toLowerCase().includes('hitltool');
		}),
	};
});

vi.mock('@vueuse/core', async (importOriginal) => {
	const original = await importOriginal<typeof import('@vueuse/core')>();
	const copySpy = vi.fn();
	return {
		...original,
		useClipboard: vi.fn(() => ({ copy: copySpy })),
	};
});

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({ track }),
	};
});

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
				showToast,
			};
		},
	};
});

const getAutoSelectedCredentialMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/credentials/credentials.utils', () => ({
	getAutoSelectedCredential: getAutoSelectedCredentialMock,
}));

const canPinNodeMock = vi.fn();
const setDataMock = vi.fn();
const unsetDataMock = vi.fn();
const hasDataRef = { value: false };
const getInputDataWithPinnedMock = vi.fn();

vi.mock('@/app/composables/usePinnedData', () => {
	return {
		usePinnedData: vi.fn(() => ({
			canPinNode: canPinNodeMock,
			setData: setDataMock,
			unsetData: unsetDataMock,
			hasData: hasDataRef,
		})),
	};
});

vi.mock('@/app/composables/useDataSchema', () => {
	return {
		useDataSchema: vi.fn(() => ({
			getInputDataWithPinned: getInputDataWithPinnedMock,
		})),
	};
});

function buildImportNodes() {
	return [
		mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE }),
		mockNode({ id: '2', name: 'Node 2', type: SET_NODE_TYPE }),
	].map((node) => {
		// Setting position in mockNode will wrap it in a Proxy
		// This causes deepCopy to remove position -> set position after instead
		node.position = [40, 40];
		node.credentials = undefined;
		return node;
	});
}

// Setup of describe('useCanvasOperations', (original top-level describe)
const workflowId = 'test';
function createInitialState() {
	return {
		[STORES.NODE_TYPES]: {},
		[getNDVStoreId(createWorkflowDocumentId('default'))]: {},
		[STORES.WORKFLOWS]: {
			workflowId,
			workflow: mock<IWorkflowDb>({
				id: workflowId,
				nodes: [],
				connections: {},
				tags: [],
				usedCredentials: [],
			}),
		},
		[STORES.SETTINGS]: {
			settings: {
				enterprise: {},
			},
		},
	};
}

type Writable<T> = { -readonly [K in keyof T]: T[K] };
type WritableDocumentStore = Writable<ReturnType<typeof useWorkflowDocumentStore>>;

let workflowDocumentStoreInstance: WritableDocumentStore;

beforeEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();

	const pinia = createTestingPinia({ initialState: createInitialState() });
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	workflowDocumentStoreInstance = useWorkflowDocumentStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	) as WritableDocumentStore;

	mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
	allowTriggerInGroup.value = false;
	allowMultipleBoundaryNodes.value = false;
	// These actions are stubbed by createTestingPinia, so provide safe defaults.
	// Tests that need custom behavior can override via vi.spyOn.
	mockGraphTraversalDefaults();
	vi.mocked(workflowDocumentStoreInstance.getParentNodesByDepth).mockReturnValue([]);
	vi.mocked(workflowDocumentStoreInstance.getConnectedNodes).mockReturnValue([]);
	vi.mocked(workflowDocumentStoreInstance.getWorkflowObjectAccessorSnapshot).mockReturnValue({
		id: workflowDocumentStoreInstance.workflowId,
		connectionsBySourceNode: workflowDocumentStoreInstance.connectionsBySourceNode,
		connectionsByDestinationNode: workflowDocumentStoreInstance.connectionsByDestinationNode,
		pinData: workflowDocumentStoreInstance.pinnedDataByNodeName as IPinData,
		expression: workflowDocumentStoreInstance.getExpressionHandler(),
		getNode: workflowDocumentStoreInstance.getNodeByName,
		getParentNodes: workflowDocumentStoreInstance.getParentNodes,
		getNodeConnectionIndexes: workflowDocumentStoreInstance.getNodeConnectionIndexes,
		getParentMainInputNode: workflowDocumentStoreInstance.getParentMainInputNode,
		getChildNodes: workflowDocumentStoreInstance.getChildNodes,
		getParentNodesByDepth: workflowDocumentStoreInstance.getParentNodesByDepth,
	});
});

// createTestingPinia stubs the traversal actions to return undefined, so the
// port maps never fill. Tests that need a real graph override these defaults.
function mockGraphTraversalDefaults() {
	vi.mocked(workflowDocumentStoreInstance.getParentNodes).mockReturnValue([]);
	vi.mocked(workflowDocumentStoreInstance.getChildNodes).mockReturnValue([]);
}

// Mock: createWorkflowObject is stubbed, so build a test Workflow from the given data.
function mockCreateWorkflowObject() {
	vi.mocked(workflowDocumentStoreInstance.createWorkflowObject).mockImplementation(
		(nodes, connections) => createTestWorkflowObject({ nodes, connections }),
	);
}

function mockStoreNodePositions(positionsByNodeId: Record<string, XYPosition>) {
	const nodesById = new Map(
		Object.entries(positionsByNodeId).map(([id, position]) => [
			id,
			createTestNode({ id, position }),
		]),
	);
	vi.spyOn(workflowDocumentStoreInstance, 'getNodeById').mockImplementation((id: string) =>
		nodesById.get(id),
	);
}

type TestNode = ReturnType<typeof createTestNode>;
type TestConnectionOptions = {
	sourceType?: IConnection['type'];
	targetType?: IConnection['type'];
	sourceIndex?: number;
	targetIndex?: number;
};

function createGroupedNode(id: string, name: string, position?: TestNode['position']): TestNode {
	return createTestNode({ id, name, type: SET_NODE_TYPE, ...(position ? { position } : {}) });
}

function nodeEndpoint(
	node: TestNode,
	type: IConnection['type'] = NodeConnectionTypes.Main,
	index = 0,
): IConnection {
	return { index, node: node.name, type };
}

function workflowConnection(
	sourceNode: TestNode,
	targetNode: TestNode,
	options: TestConnectionOptions = {},
): [IConnection, IConnection] {
	const {
		sourceType = NodeConnectionTypes.Main,
		targetType = sourceType,
		sourceIndex = 0,
		targetIndex = 0,
	} = options;

	return [
		nodeEndpoint(sourceNode, sourceType, sourceIndex),
		nodeEndpoint(targetNode, targetType, targetIndex),
	];
}

function canvasConnection(
	sourceNode: TestNode,
	targetNode: TestNode,
	options: TestConnectionOptions = {},
): Connection {
	const {
		sourceType = NodeConnectionTypes.Main,
		targetType = sourceType,
		sourceIndex = 0,
		targetIndex = 0,
	} = options;

	return {
		source: sourceNode.id,
		sourceHandle: `outputs/${sourceType}/${sourceIndex}`,
		target: targetNode.id,
		targetHandle: `inputs/${targetType}/${targetIndex}`,
	};
}

function createConnectionsBySource(
	...connections: Array<[IConnection, IConnection]>
): IConnections {
	const connectionsBySource: IConnections = {};

	for (const [source, target] of connections) {
		const sourceConnections = (connectionsBySource[source.node] ??= {});
		const typeConnections = (sourceConnections[source.type] ??= []);
		const outputConnections = (typeConnections[source.index] ??= []);
		outputConnections.push(target);
	}

	return connectionsBySource;
}

function createGroupedNodeTypeDescription(
	connectionTypes: IConnection['type'][] = [NodeConnectionTypes.Main],
): INodeTypeDescription {
	return mockNodeTypeDescription({
		name: SET_NODE_TYPE,
		inputs: connectionTypes,
		outputs: connectionTypes,
	});
}

function mockWorkflowObjectAccessors(nodes: TestNode[], connections: IConnections) {
	const workflowObject = createTestWorkflowObject({
		nodes,
		connections,
	});

	vi.mocked(workflowDocumentStoreInstance.getParentNodes).mockImplementation((...args) =>
		workflowObject.getParentNodes(...args),
	);
	vi.mocked(workflowDocumentStoreInstance.getChildNodes).mockImplementation((...args) =>
		workflowObject.getChildNodes(...args),
	);
	vi.mocked(workflowDocumentStoreInstance.getConnectionsBetweenNodes).mockImplementation(
		(...args) => workflowObject.getConnectionsBetweenNodes(...args),
	);
}

function setupGroupedCanvas({
	nodes,
	lookupNodes = nodes,
	connections = {},
	groups = [],
	nodeTypeDescription = createGroupedNodeTypeDescription(),
	mockWorkflowObject = false,
}: {
	nodes: TestNode[];
	lookupNodes?: TestNode[];
	connections?: IConnections;
	groups?: IWorkflowGroup[];
	nodeTypeDescription?: INodeTypeDescription;
	mockWorkflowObject?: boolean;
}) {
	const nodeTypesStore = mockedStore(useNodeTypesStore);
	const nodesById = new Map(lookupNodes.map((node) => [node.id, node]));
	const nodesByName = new Map(lookupNodes.map((node) => [node.name, node]));

	nodeTypesStore.nodeTypes = { [SET_NODE_TYPE]: { 1: nodeTypeDescription } };
	nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
	workflowDocumentStoreInstance.allNodes = nodes;
	workflowDocumentStoreInstance.connectionsBySourceNode = connections;
	vi.spyOn(workflowDocumentStoreInstance, 'getNodeById').mockImplementation((id) =>
		nodesById.get(id),
	);
	vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockImplementation(
		(name) => nodesByName.get(name) ?? null,
	);
	vi.spyOn(workflowDocumentStoreInstance, 'allGroups', 'get').mockReturnValue(groups);
	vi.spyOn(workflowDocumentStoreInstance, 'getGroupForNode').mockImplementation((nodeId) =>
		groups.find((group) => group.nodeIds.includes(nodeId)),
	);

	if (mockWorkflowObject) {
		mockWorkflowObjectAccessors(nodes, connections);
	}

	return { workflowDocumentStore: workflowDocumentStoreInstance };
}

function expectConnectionAdded(
	sourceNode: TestNode,
	targetNode: TestNode,
	options: TestConnectionOptions = {},
) {
	expect(workflowDocumentStoreInstance.addConnection).toHaveBeenCalledWith({
		connection: workflowConnection(sourceNode, targetNode, options),
	});
}

function expectConnectionRemoved(
	sourceNode: TestNode,
	targetNode: TestNode,
	options: TestConnectionOptions = {},
) {
	expect(workflowDocumentStoreInstance.removeConnection).toHaveBeenCalledWith({
		connection: workflowConnection(sourceNode, targetNode, options),
	});
}

describe('CP-WF-01-01 · Añadir un trigger y un nodo y conectarlos', () => {
	describe('addNodes', () => {
		it('should add nodes at specified positions', async () => {
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeName = 'type';
			const nodes = [
				mockNode({ name: 'Node 1', type: nodeTypeName, position: [32, 32] }),
				mockNode({ name: 'Node 2', type: nodeTypeName, position: [96, 256] }),
			];

			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: mockNodeTypeDescription({ name: nodeTypeName }) },
			};

			const addNodeSpy = vi.spyOn(workflowDocumentStoreInstance, 'addNode');

			const { addNodes } = useCanvasOperations();
			await addNodes(nodes, {});

			expect(addNodeSpy).toHaveBeenCalledTimes(2);
			expect(addNodeSpy.mock.calls[0][0]).toMatchObject({
				name: nodes[0].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [32, 32],
				parameters: {},
			});
			expect(addNodeSpy.mock.calls[1][0]).toMatchObject({
				name: nodes[1].name,
				type: nodeTypeName,
				typeVersion: 1,
				position: [96, 256],
				parameters: {},
			});
		});
	});

	describe('addConnections', () => {
		it('should create connections between nodes', async () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const nodeTypeName = SET_NODE_TYPE;
			const nodeType = mockNodeTypeDescription({
				name: nodeTypeName,
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
			});
			const nodes = [
				mockNode({ id: 'a', name: 'Node A', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'b', name: 'Node B', type: nodeTypeName, position: [40, 40] }),
				mockNode({ id: 'c', name: 'Node C', type: nodeTypeName, position: [40, 40] }),
			];
			const connections = [
				{
					source: nodes[0].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					target: nodes[1].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					data: {
						source: { type: NodeConnectionTypes.Main, index: 0 },
						target: { type: NodeConnectionTypes.Main, index: 0 },
					},
				},
				{
					source: nodes[1].id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					target: nodes[2].id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						index: 0,
						type: NodeConnectionTypes.Main,
					}),
					data: {
						source: { type: NodeConnectionTypes.Main, index: 0 },
						target: { type: NodeConnectionTypes.Main, index: 0 },
					},
				},
			];

			workflowDocumentStoreInstance.allNodes = nodes;
			nodeTypesStore.nodeTypes = {
				[nodeTypeName]: { 1: nodeType },
			};

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeById').mockImplementation(
				(id: string) =>
					({
						[nodes[0].id]: nodes[0],
						[nodes[1].id]: nodes[1],
						[nodes[2].id]: nodes[2],
					})[id] as INodeUi | undefined,
			);
			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockImplementation(
				(name: string) =>
					(({
						[nodes[0].name]: nodes[0],
						[nodes[1].name]: nodes[1],
						[nodes[2].name]: nodes[2],
					})[name] as INodeUi) ?? null,
			);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);

			const { addConnections } = useCanvasOperations();
			await addConnections(connections);

			expect(workflowDocumentStoreInstance.addConnection).toHaveBeenCalledWith({
				connection: [
					{
						index: 0,
						node: 'Node A',
						type: NodeConnectionTypes.Main,
					},
					{
						index: 0,
						node: 'Node B',
						type: NodeConnectionTypes.Main,
					},
				],
			});
		});
	});
});

describe('CP-WF-01-02 · Mover y eliminar nodos', () => {
	describe('updateNodePosition', () => {
		it('should update node position', () => {
			const id = 'node1';
			const position: CanvasNode['position'] = { x: 10, y: 20 };
			const setNodePositionByIdSpy = vi.spyOn(workflowDocumentStoreInstance, 'setNodePositionById');
			mockStoreNodePositions({ node1: [0, 0] });

			const { updateNodePosition } = useCanvasOperations();
			updateNodePosition(id, position);

			expect(setNodePositionByIdSpy).toHaveBeenCalledWith(id, [position.x, position.y]);
		});
	});

	describe('deleteNode', () => {
		it('should delete node and track history', () => {
			const historyStore = mockedStore(useHistoryStore);
			vi.mocked(workflowDocumentStoreInstance.incomingConnectionsByNodeName).mockReturnValue({});

			const id = 'node1';
			const node: INodeUi = createTestNode({
				id,
				type: 'node',
				position: [10, 20],
				name: 'Node 1',
			});

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeById').mockReturnValue(node);

			const { deleteNode } = useCanvasOperations();
			deleteNode(id, { trackHistory: true });

			expect(workflowDocumentStoreInstance.removeNodeById).toHaveBeenCalledWith(id);
			expect(
				useWorkflowExecutionStateStore(workflowDocumentStoreInstance.documentId)
					.clearActiveNodeExecutionData,
			).toHaveBeenCalledWith(node.name);
			expect(historyStore.pushCommandToUndo).toHaveBeenCalledWith(
				new RemoveNodeCommand(node, expect.any(Number)),
			);
		});
	});

	describe('deleteConnectionsByNodeId', () => {
		it('should delete all connections for a given node ID', () => {
			const { deleteConnectionsByNodeId } = useCanvasOperations();

			const node1 = createTestNode({ id: 'node1', name: 'Node 1' });
			const node2 = createTestNode({ id: 'node2', name: 'Node 1' });

			workflowDocumentStoreInstance.connectionsBySourceNode = {
				[node1.name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				node2: {
					[NodeConnectionTypes.Main]: [
						[{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeById').mockReturnValue(node1);
			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName')
				.mockReturnValueOnce(node1)
				.mockReturnValueOnce(node2);

			deleteConnectionsByNodeId(node1.id);

			expect(workflowDocumentStoreInstance.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			expect(workflowDocumentStoreInstance.removeConnection).toHaveBeenCalledWith({
				connection: [
					{ node: node2.name, type: NodeConnectionTypes.Main, index: 0 },
					{ node: node1.name, type: NodeConnectionTypes.Main, index: 0 },
				],
			});

			expect(workflowDocumentStoreInstance.removeAllNodeConnection).toHaveBeenCalledWith(node1);
		});
	});
});

describe('CP-WF-01-03 · Rechazar conexión entre tipos incompatibles', () => {
	describe('isConnectionAllowed', () => {
		it('should return false if source node does not have connection type', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionTypes.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockImplementation(
				(name: string) =>
					(({
						[sourceNode.name]: sourceNode,
						[targetNode.name]: targetNode,
					})[name] as INodeUi) ?? null,
			);
			const { isConnectionAllowed } = useCanvasOperations();

			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});
	});

	describe('isConnectionAllowed', () => {
		it('should return false if target node does not have connection type', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: 'targetType',
				inputs: [NodeConnectionTypes.AiTool],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.AiTool,
				index: 0,
			};

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockImplementation(
				(name: string) =>
					(({
						[sourceNode.name]: sourceNode,
						[targetNode.name]: targetNode,
					})[name] as INodeUi) ?? null,
			);
			const { isConnectionAllowed } = useCanvasOperations();

			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(false);
		});
	});

	describe('isConnectionAllowed', () => {
		it('should return true if all conditions are met and no filter is set', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);

			const sourceNode = mockNode({
				id: '1',
				type: 'sourceType',
				name: 'Source Node',
				typeVersion: 1,
			});
			const sourceNodeTypeDescription = mockNodeTypeDescription({
				name: sourceNode.type,
				outputs: [NodeConnectionTypes.Main],
			});
			const sourceHandle: IConnection = {
				node: sourceNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			const targetNode = mockNode({
				id: '2',
				type: 'targetType',
				name: 'Target Node',
				typeVersion: 1,
			});
			const targetNodeTypeDescription = mockNodeTypeDescription({
				name: targetNode.type,
				inputs: [
					{
						type: NodeConnectionTypes.Main,
					},
				],
			});
			const targetHandle: IConnection = {
				node: targetNode.name,
				type: NodeConnectionTypes.Main,
				index: 0,
			};

			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockImplementation(
				(name: string) =>
					(({
						[sourceNode.name]: sourceNode,
						[targetNode.name]: targetNode,
					})[name] as INodeUi) ?? null,
			);
			const { isConnectionAllowed } = useCanvasOperations();

			nodeTypesStore.getNodeType = vi.fn(
				(nodeTypeName: string) =>
					({
						[sourceNode.type]: sourceNodeTypeDescription,
						[targetNode.type]: targetNodeTypeDescription,
					})[nodeTypeName],
			);

			expect(isConnectionAllowed(sourceNode, targetNode, sourceHandle, targetHandle)).toBe(true);
		});
	});
});

describe('CP-WF-01-04 · Nodo desactivado no se ejecuta', () => {
	describe('toggleNodesDisabled', () => {
		it('disables nodes based on provided ids', async () => {
			const nodes = [
				createTestNode({ id: '1', name: 'A' }),
				createTestNode({ id: '2', name: 'B' }),
			];
			vi.spyOn(workflowDocumentStoreInstance, 'getNodesByIds').mockReturnValue(nodes);
			const updateNodePropertiesSpy = vi.spyOn(
				workflowDocumentStoreInstance,
				'updateNodeProperties',
			);

			const { toggleNodesDisabled } = useCanvasOperations();
			toggleNodesDisabled([nodes[0].id, nodes[1].id], {
				trackHistory: true,
				trackBulk: true,
			});

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodes[0].name,
				properties: {
					disabled: true,
				},
			});
		});
	});

	describe('revertToggleNodeDisabled', () => {
		it('re-enables a previously disabled node', () => {
			const nodeName = 'testNode';
			const node = createTestNode({ name: nodeName });
			vi.spyOn(workflowDocumentStoreInstance, 'getNodeByName').mockReturnValue(node);
			const updateNodePropertiesSpy = vi.spyOn(
				workflowDocumentStoreInstance,
				'updateNodeProperties',
			);

			const { revertToggleNodeDisabled } = useCanvasOperations();
			revertToggleNodeDisabled(nodeName);

			expect(updateNodePropertiesSpy).toHaveBeenCalledWith({
				name: nodeName,
				properties: {
					disabled: true,
				},
			});
		});
	});
});

describe('CP-WF-01-06 · Copiar y pegar nodos entre workflows', () => {
	describe('copyNodes', () => {
		function copyNodeCredentialsWithSharing({
			credentials,
			usedCredentials = {},
			usableCredentials = [],
		}: {
			credentials: INodeUi['credentials'];
			usedCredentials?: Record<string, IUsedCredential>;
			usableCredentials?: ICredentialsResponse[];
		}) {
			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: true,
			});

			const credentialsStore = useCredentialsStore();
			vi.spyOn(credentialsStore, 'allCredentials', 'get').mockReturnValue(usableCredentials);

			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: {
					1: mockNodeTypeDescription({
						name: SET_NODE_TYPE,
						credentials: [{ name: 'openAiApi', required: true }],
					}),
				},
			};

			const node = mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE });
			node.position = [40, 40];
			node.credentials = credentials;

			workflowDocumentStoreInstance.allNodes = [node];
			vi.spyOn(workflowDocumentStoreInstance, 'usedCredentials', 'get').mockReturnValue(
				usedCredentials,
			);
			vi.mocked(workflowDocumentStoreInstance.outgoingConnectionsByNodeName).mockReturnValue({});

			return useCanvasOperations().getNodesToSave([node]).nodes[0].credentials;
		}

		it('should copy nodes', async () => {
			const nodeTypesStore = useNodeTypesStore();
			const nodeTypeDescription = mockNodeTypeDescription({ name: SET_NODE_TYPE });

			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: { 1: nodeTypeDescription },
			};

			const nodes = buildImportNodes();
			workflowDocumentStoreInstance.allNodes = nodes;
			vi.spyOn(workflowDocumentStoreInstance, 'getNodesByIds').mockReturnValue(nodes);
			vi.mocked(workflowDocumentStoreInstance.outgoingConnectionsByNodeName).mockReturnValue({});

			const { copyNodes } = useCanvasOperations();
			await copyNodes(['1', '2']);

			expect(useClipboard().copy).toHaveBeenCalledTimes(1);
			expect(vi.mocked(useClipboard().copy).mock.calls).toMatchSnapshot();
		});
	});

	describe('copyNodes', () => {
		function copyNodeCredentialsWithSharing({
			credentials,
			usedCredentials = {},
			usableCredentials = [],
		}: {
			credentials: INodeUi['credentials'];
			usedCredentials?: Record<string, IUsedCredential>;
			usableCredentials?: ICredentialsResponse[];
		}) {
			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: true,
			});

			const credentialsStore = useCredentialsStore();
			vi.spyOn(credentialsStore, 'allCredentials', 'get').mockReturnValue(usableCredentials);

			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[SET_NODE_TYPE]: {
					1: mockNodeTypeDescription({
						name: SET_NODE_TYPE,
						credentials: [{ name: 'openAiApi', required: true }],
					}),
				},
			};

			const node = mockNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE });
			node.position = [40, 40];
			node.credentials = credentials;

			workflowDocumentStoreInstance.allNodes = [node];
			vi.spyOn(workflowDocumentStoreInstance, 'usedCredentials', 'get').mockReturnValue(
				usedCredentials,
			);
			vi.mocked(workflowDocumentStoreInstance.outgoingConnectionsByNodeName).mockReturnValue({});

			return useCanvasOperations().getNodesToSave([node]).nodes[0].credentials;
		}

		it('drops stored credentials the current user cannot use when sharing is enabled', () => {
			const foreignCredential = mock<ICredentialsResponse>({
				id: 'cred-foreign',
				name: 'Someone else',
			});

			expect(
				copyNodeCredentialsWithSharing({
					credentials: {
						openAiApi: { id: foreignCredential.id, name: foreignCredential.name },
					},
					usableCredentials: [foreignCredential],
					usedCredentials: {
						[foreignCredential.id]: {
							id: foreignCredential.id,
							name: foreignCredential.name,
							credentialType: 'openAiApi',
							currentUserCanUse: false,
						},
					},
				}),
			).toEqual({});
		});
	});

	describe('importWorkflowData', () => {
		const workflowData = {
			nodes: [], //buildImportNodes(),
			connections: {},
		};

		it('centers a pasted node in the viewport instead of using the last click', async () => {
			const nodes = [createTestNode({ name: 'Pasted', position: [100, 100] })];
			vi.mocked(workflowDocumentStoreInstance.createWorkflowObject).mockImplementation(
				(importedNodes, connections) =>
					createTestWorkflowObject({ nodes: importedNodes, connections }),
			);

			const canvasOperations = useCanvasOperations();
			canvasOperations.lastClickPosition.value = [900, 900];
			const result = await canvasOperations.importWorkflowData(
				{ nodes, connections: {} },
				'paste',
				{ viewport: { xMin: 0, yMin: 0, xMax: 1000, yMax: 1000 }, trackEvents: false },
			);

			expect(result.nodes?.[0].position).toEqual([448, 448]);
		});
	});
});
