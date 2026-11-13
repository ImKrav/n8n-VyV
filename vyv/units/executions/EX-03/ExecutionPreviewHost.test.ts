/**
 * EX-03 · Vista previa, reintento y borrado — vista previa de una ejecución.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/workflow/ExecutionPreviewHost.test.ts
 */
import {
	defineComponent,
	h,
	inject,
	onBeforeUnmount,
	ref,
	shallowRef,
	type Ref,
	type ShallowRef,
} from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
	WorkflowIdKey,
} from '@/app/constants/injectionKeys';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import ExecutionPreviewHost from '@/features/execution/executions/components/workflow/ExecutionPreviewHost.vue';

const {
	mockDocumentStore,
	mockLoad,
	mockDispose,
	mockSetActiveNodeName,
	mockUnsetActiveNodeName,
	injected,
} = vi.hoisted(() => ({
	mockDocumentStore: {
		documentId: 'test-workflow@execution-preview',
		workflowId: 'test-workflow',
		getNodeById: vi.fn(),
		connectionsBySourceNode: {},
		setConnections: vi.fn(),
	},
	mockLoad: vi.fn(),
	mockDispose: vi.fn(),
	mockSetActiveNodeName: vi.fn(),
	mockUnsetActiveNodeName: vi.fn(),
	injected: {
		workflowId: undefined as Ref<string> | undefined,
		documentStore: undefined as ShallowRef<WorkflowDocumentStore | null> | undefined,
		documentStoreOnBeforeUnmount: undefined as WorkflowDocumentStore | null | undefined,
		enabledFeatures: undefined as Ref<Record<string, unknown>> | undefined,
	},
}));

// Reactive refs must be created after the vue import is initialized — at
// module scope here, not inside vi.hoisted.
const mockPreview = {
	documentStore: shallowRef<unknown>(null),
	execution: shallowRef<unknown>(null),
	isLoading: ref(false),
	loadError: ref<Error | null>(null),
	isProductionExecutionPreview: ref(false),
};

vi.mock('@/features/execution/executions/composables/useExecutionPreviewDocument', () => ({
	useExecutionPreviewDocument: vi.fn(() => ({
		...mockPreview,
		load: mockLoad,
		dispose: mockDispose,
	})),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		setActiveNodeName: mockSetActiveNodeName,
		unsetActiveNodeName: mockUnsetActiveNodeName,
	})),
}));

vi.mock('@/app/views/NodeView.vue', () => ({
	default: defineComponent({
		name: 'NodeViewStub',
		setup() {
			injected.workflowId = inject(WorkflowIdKey);
			injected.documentStore = inject(WorkflowDocumentStoreKey);
			injected.enabledFeatures = inject(EditorEnabledFeaturesKey);
			onBeforeUnmount(() => {
				injected.documentStoreOnBeforeUnmount = injected.documentStore?.value;
			});
			return () => h('div', { 'data-test-id': 'node-view-stub' });
		},
	}),
}));

vi.mock('@/features/execution/logs/components/LogsPanel.vue', () => ({
	default: defineComponent({
		name: 'LogsPanelStub',
		props: { isReadOnly: { type: Boolean, default: false } },
		setup(props) {
			return () =>
				h('div', {
					'data-test-id': 'logs-panel-stub',
					'data-read-only': String(props.isReadOnly),
				});
		},
	}),
}));

const renderComponent = createComponentRenderer(ExecutionPreviewHost, {
	global: {
		plugins: [createTestingPinia()],
	},
});

// Setup of describe('ExecutionPreviewHost', (original top-level describe)
beforeEach(() => {
	vi.clearAllMocks();
	mockPreview.documentStore.value = null;
	mockPreview.execution.value = null;
	mockPreview.isLoading.value = false;
	mockPreview.loadError.value = null;
	injected.documentStoreOnBeforeUnmount = undefined;
	mockDispose.mockImplementation(() => {});
	mockLoad.mockImplementation(async () => {
		mockPreview.documentStore.value = mockDocumentStore;
		mockPreview.execution.value = { id: 'execution-1' } as IExecutionResponse;
	});
});

describe('CP-EX-03-01 · Vista previa de ejecución exitosa', () => {
	it('loads the execution on mount and renders the scoped subtree', async () => {
		const { getByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		expect(mockLoad).toHaveBeenCalledTimes(1);

		await waitFor(() => expect(getByTestId('node-view-stub')).toBeInTheDocument());

		// The subtree is scoped to the preview's stores via provides
		expect(injected.workflowId?.value).toBe('test-workflow');
		expect(injected.documentStore?.value).toBe(mockDocumentStore);
		expect(injected.enabledFeatures?.value).toEqual({
			readOnly: true,
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
			expandGroups: 'errored',
		});
	});

	it('renders the read-only logs panel once execution data is present', async () => {
		const { getByTestId } = renderComponent({
			props: { workflowId: 'test-workflow', executionId: 'execution-1' },
		});

		await waitFor(() =>
			expect(getByTestId('logs-panel-stub')).toHaveAttribute('data-read-only', 'true'),
		);
	});
});
