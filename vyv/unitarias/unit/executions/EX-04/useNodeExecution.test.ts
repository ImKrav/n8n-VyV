/**
 * EX-04 · Detener ejecuciones — detener la espera de un webhook de prueba.
 * Origen: packages/frontend/editor-ui/src/app/composables/useNodeExecution.test.ts
 */
import { ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import type router from 'vue-router';
import {
	AI_TRANSFORM_NODE_TYPE,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
} from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';

import { useNodeExecution } from '@/app/composables/useNodeExecution';
import { useUIStore } from '@/app/stores/ui.store';
import { needsAgentInput } from '@/app/utils/nodes/nodeTransforms';
import { generateCodeForAiTransform } from '@/features/ndv/parameters/utils/buttonParameter.utils';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	FROM_AI_PARAMETERS_MODAL_KEY,
} from '@/app/constants';

const {
	mockWorkflowsStore,
	mockWorkflowExecutionStateStore,
	mockNodeTypesStore,
	mockNdvStore,
	mockRunWorkflow,
	mockPinnedData,
	mockMessage,
	mockWorkflowDocumentStore,
	mockNodeHelpers,
} = vi.hoisted(() => ({
	mockWorkflowsStore: {
		executedNode: undefined as string | undefined,
		workflowId: '123',
		getNodeByName: vi.fn(),
		removeTestWebhook: vi.fn(),
	},
	mockWorkflowExecutionStateStore: {
		isWorkflowRunning: false,
		executionWaitingForWebhook: false,
		chatPartialExecutionDestinationNode: undefined as string | undefined,
		executingNode: {
			isNodeExecuting: vi.fn().mockReturnValue(false),
		},
	},
	mockNodeTypesStore: {
		getNodeType: vi.fn(),
		isTriggerNode: vi.fn(),
	},
	mockNdvStore: {
		activeNode: null as INodeUi | null,
		isInputPanelEmpty: false,
		pushRef: 'push-ref-123',
		unsetActiveNodeName: vi.fn(),
	},
	mockRunWorkflow: {
		runWorkflow: vi.fn(),
		stopCurrentExecution: vi.fn(),
	},
	mockPinnedData: {
		hasData: { value: false },
		unsetData: vi.fn(),
	},
	mockMessage: {
		confirm: vi.fn(),
	},
	mockWorkflowDocumentStore: {
		workflowId: '123',
		updateNodeProperties: vi.fn(),
		getNodeByName: vi.fn(),
		getStartNode: vi.fn(),
		checkIfNodeHasChatParent: vi.fn(),
		pinData: {} as Record<string, unknown>,
		usedCredentials: {} as Record<string, IUsedCredential>,
		allNodes: [] as INodeUi[],
	},
	mockNodeHelpers: {
		getNodeInputData: vi.fn().mockReturnValue([]),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn().mockReturnValue(mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
	injectWorkflowDocumentStore: () => ({ value: mockWorkflowDocumentStore }),
}));

vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
		useRoute: vi.fn(),
	};
});

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue(mockWorkflowsStore),
}));

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn().mockReturnValue(mockWorkflowExecutionStateStore),
	injectWorkflowExecutionStateStore: vi.fn(() => ({
		// Plain accessor so per-test reassignment of the mock fields is always
		// picked up.
		get value() {
			return {
				...mockWorkflowExecutionStateStore,
				get activeExecutionExecutedNode() {
					return mockWorkflowsStore.executedNode;
				},
			};
		},
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn().mockReturnValue(mockNodeTypesStore),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn().mockReturnValue(mockNdvStore),
	injectNDVStore: vi.fn(() => ({ value: mockNdvStore })),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		openModalWithData: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: vi.fn().mockReturnValue(mockRunWorkflow),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn().mockReturnValue(mockNodeHelpers),
}));

vi.mock('@/app/composables/usePinnedData', () => ({
	usePinnedData: vi.fn().mockReturnValue(mockPinnedData),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: vi.fn().mockReturnValue(mockMessage),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: vi.fn(),
		trackAiTransform: vi.fn(),
	}),
}));

// Keeps the interpolated values in the returned string, so a test can assert
// what a message was built from without depending on the copy.
const baseTextMock = vi.hoisted(
	() => (key: string, options?: { interpolate?: Record<string, string> }) =>
		options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
);

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: vi.fn().mockImplementation(baseTextMock) },
	useI18n: vi.fn().mockReturnValue({
		baseText: vi.fn().mockImplementation(baseTextMock),
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({
		run: vi.fn(),
	}),
}));

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	needsAgentInput: vi.fn().mockReturnValue(false),
}));

vi.mock('@/features/ndv/parameters/utils/buttonParameter.utils', () => ({
	generateCodeForAiTransform: vi.fn(),
}));

function createTestNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'test-id',
		name: 'Test Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

let uiStore: ReturnType<typeof useUIStore>;

// Setup of describe('useNodeExecution', (original top-level describe)
beforeEach(() => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	uiStore = useUIStore();

	// Reset store properties to defaults
	mockWorkflowExecutionStateStore.isWorkflowRunning = false;
	mockWorkflowsStore.executedNode = undefined;
	mockWorkflowExecutionStateStore.executionWaitingForWebhook = false;
	mockWorkflowExecutionStateStore.chatPartialExecutionDestinationNode = undefined;
	mockWorkflowExecutionStateStore.executingNode.isNodeExecuting.mockReset().mockReturnValue(false);
	mockWorkflowDocumentStore.checkIfNodeHasChatParent.mockReturnValue(false);
	mockWorkflowsStore.removeTestWebhook.mockReset();
	mockWorkflowsStore.getNodeByName.mockReset();

	mockNodeHelpers.getNodeInputData.mockReset().mockReturnValue([]);
	mockWorkflowDocumentStore.getNodeByName.mockReset();
	mockWorkflowDocumentStore.pinData = {};
	mockWorkflowDocumentStore.usedCredentials = {};
	mockWorkflowDocumentStore.allNodes = [];

	mockNodeTypesStore.getNodeType.mockReturnValue(null);
	mockNodeTypesStore.isTriggerNode.mockReturnValue(false);

	mockNdvStore.activeNode = null;
	mockNdvStore.isInputPanelEmpty = false;
	mockNdvStore.unsetActiveNodeName.mockReset();

	mockRunWorkflow.runWorkflow.mockReset();
	mockRunWorkflow.stopCurrentExecution.mockReset();

	mockPinnedData.hasData.value = false;
	mockPinnedData.unsetData.mockReset();

	mockMessage.confirm.mockReset();

	vi.mocked(needsAgentInput).mockReturnValue(false);
	vi.mocked(generateCodeForAiTransform).mockReset();
});

describe('CP-EX-04-06 · Detener la espera de un webhook de prueba', () => {
	describe('execute', () => {
		it('should stop webhook when listening', async () => {
			mockNodeTypesStore.isTriggerNode.mockReturnValue(true);
			mockWorkflowExecutionStateStore.executionWaitingForWebhook = true;
			const node = ref(createTestNode({ disabled: false }));

			const { execute } = useNodeExecution(node);
			const result = await execute();

			expect(result).toBe('stopped-webhook');
			expect(mockWorkflowsStore.removeTestWebhook).toHaveBeenCalledWith('123');
		});
	});
});
