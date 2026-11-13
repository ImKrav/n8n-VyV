/**
 * EX-04 · Detener ejecuciones — botón de ejecutar del nodo (detener ejecución y escucha).
 * Origen: packages/frontend/editor-ui/src/app/components/NodeExecuteButton.test.ts
 */
import { reactive, shallowRef, computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore, getTooltip, queryTooltip } from '@/__tests__/utils';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { nodeViewEventBus } from '@/app/event-bus';
import {
	AI_TRANSFORM_NODE_TYPE,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
} from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/app/constants';
import NodeExecuteButton from '@/app/components/NodeExecuteButton.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import * as buttonParameterUtils from '@/features/ndv/parameters/utils/buttonParameter.utils';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/app/composables/useRunWorkflow', () => {
	const runWorkflow = vi.fn();
	const stopCurrentExecution = vi.fn();
	return {
		useRunWorkflow: () => ({
			runWorkflow,
			stopCurrentExecution,
		}),
	};
});

vi.mock('@/app/composables/useExternalHooks', () => {
	const run = vi.fn();
	return {
		useExternalHooks: () => ({
			run,
		}),
	};
});

vi.mock('@/app/composables/usePinnedData', () => {
	const createMock = () => ({
		hasData: computed(() => false),
		canPinNode: vi.fn().mockReturnValue(false),
		setData: vi.fn(),
		onSetDataSuccess: vi.fn(),
		onSetDataError: vi.fn(),
		unsetData: vi.fn(),
		onUnsetData: vi.fn(),
		isValidNodeType: computed(() => false),
		isValidJSON: vi.fn(),
		isValidSize: vi.fn(),
		data: computed(() => undefined),
	});
	return {
		usePinnedData: vi.fn(createMock),
	};
});

vi.mock('@/app/composables/useMessage', () => {
	const confirm = vi.fn(async () => 'confirm');
	return {
		useMessage: () => ({
			confirm,
		}),
	};
});

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal()),
	injectWorkflowDocumentStore: vi.fn(),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let ndvStore: MockedStore<typeof useNDVStore>;

let runWorkflow: ReturnType<typeof useRunWorkflow>;
let externalHooks: ReturnType<typeof useExternalHooks>;
let message: ReturnType<typeof useMessage>;
let toast: ReturnType<typeof useToast>;
let workflowExecutionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
let nodeViewEventBusEmitSpy: ReturnType<typeof vi.spyOn>;

// Setup of describe('NodeExecuteButton', (original top-level describe)
beforeEach(() => {
	vi.clearAllMocks();
	nodeViewEventBusEmitSpy = vi.spyOn(nodeViewEventBus, 'emit');

	renderComponent = createComponentRenderer(NodeExecuteButton, {
		pinia: createTestingPinia(),
		props: {
			nodeName: 'test-node',
			telemetrySource: 'test-source',
		},
	});

	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsStore.workflowId = 'abc123';
	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('abc123'));
	vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));
	workflowExecutionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('abc123'));

	nodeTypesStore = mockedStore(useNodeTypesStore);
	ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId('abc123'));

	runWorkflow = useRunWorkflow({ router: useRouter() });
	externalHooks = useExternalHooks();
	message = useMessage();
	toast = useToast();
});

afterEach(() => {
	nodeViewEventBusEmitSpy.mockRestore();
});

describe('CP-EX-04-01 · Detener una ejecución desde el editor', () => {
	it('stops execution when clicking button while workflow is running', async () => {
		vi.spyOn(
			useWorkflowExecutionStateStore(createWorkflowDocumentId('abc123')),
			'isWorkflowRunning',
			'get',
		).mockReturnValue(true);
		nodeTypesStore.isTriggerNode = () => true;
		workflowExecutionStateStore.setActiveExecutionId('test-execution-id');
		workflowExecutionStateStore.executingNode.isNodeExecuting = vi.fn().mockReturnValue(true);
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole, emitted } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(runWorkflow.stopCurrentExecution).toHaveBeenCalledTimes(1);
		expect(emitted().stopExecution).toBeTruthy();
	});
});

describe('CP-EX-04-06 · Detener la espera de un webhook de prueba', () => {
	it('stops webhook when clicking button while listening for events', async () => {
		vi.spyOn(
			useWorkflowExecutionStateStore(createWorkflowDocumentId('abc123')),
			'executionWaitingForWebhook',
			'get',
		).mockReturnValue(true);
		nodeTypesStore.isTriggerNode = () => true;
		vi.spyOn(workflowDocumentStore, 'getNodeByName').mockReturnValue(
			mockNode({ name: 'test-node', type: SET_NODE_TYPE }),
		);

		const { getByRole } = renderComponent();

		await userEvent.click(getByRole('button'));

		expect(workflowsStore.removeTestWebhook).toHaveBeenCalledWith('abc123');
	});
});
