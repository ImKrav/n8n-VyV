/**
 * WF-03 · Publicar / activar y desactivar — modal de publicación.
 * Origen: packages/frontend/editor-ui/src/features/workflows/components/WorkflowPublishModal.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import WorkflowPublishModal from '@/features/workflows/components/WorkflowPublishModal.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { WEBHOOK_NODE_TYPE, NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const mockPublishWorkflow = vi.fn();
const mockShowMessage = vi.fn();
const mockShowError = vi.fn();
const mockTelemetryTrack = vi.fn();
const mockModalClosed = vi.fn();

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
		showError: mockShowError,
	}),
}));

vi.mock('@/app/plugins/telemetry', () => ({
	telemetry: {
		get track() {
			return mockTelemetryTrack;
		},
	},
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {},
		},
	},
	[STORES.UI]: {
		modalStateById: {
			[WORKFLOW_PUBLISH_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [WORKFLOW_PUBLISH_MODAL_KEY],
	},
};

const renderComponent = createComponentRenderer(WorkflowPublishModal, {
	pinia: createTestingPinia({ initialState, stubActions: false }),
	global: {
		stubs: {
			Modal: {
				props: ['eventBus'],
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
				created() {
					this.eventBus?.on('close', mockModalClosed);
				},
			},
			WorkflowVersionForm: {
				template: `
					<div>
						<input data-test-id="workflow-publish-version-name-input" @input="$emit('update:versionName', $event.target.value)" />
					</div>
				`,
				props: ['versionName', 'description', 'disabled'],
			},
		},
	},
});

const WEBHOOK_NODE_TYPE_DESCRIPTION: INodeTypeDescription = {
	displayName: 'Webhook',
	name: WEBHOOK_NODE_TYPE,
	group: ['trigger'],
	version: 1,
	description: 'Starts the workflow when a webhook is called',
	defaults: { name: 'Webhook' },
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
	webhooks: [{ name: 'default', httpMethod: 'GET', path: '' }],
};

// Setup of describe('WorkflowPublishModal', (original top-level describe)
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

beforeEach(() => {
	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsListStore = mockedStore(useWorkflowsListStore);

	// Register the webhook node type so workflowTriggerNodes computed recognises triggers
	const nodeTypesStore = useNodeTypesStore();
	nodeTypesStore.setNodeTypes([WEBHOOK_NODE_TYPE_DESCRIPTION]);

	workflowsStore.setWorkflowId('workflow-1');

	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('workflow-1'));
	workflowDocumentStore.setActiveState({
		activeVersionId: 'old-version',
		activeVersion: {
			versionId: 'old-version',
			authors: 'Test Author',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowPublishHistory: [],
			name: 'Published Version',
			description: null,
		},
	});

	// Set versionId different from activeVersion.versionId so wfHasAnyChanges is true
	workflowDocumentStore.setVersionData({
		versionId: 'new-version',
		name: null,
		description: null,
	});

	// Add a trigger node to the document store so containsTrigger is true
	workflowDocumentStore.setNodes([
		{
			id: 'trigger-1',
			name: 'Webhook Trigger',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			disabled: false,
		},
	]);

	mockPublishWorkflow.mockReset().mockResolvedValue({
		success: true,
		errorHandled: false,
	});
});

/** Mirrors the push handler that flips the document to "published" out of band. */
function publishConfirmedByPush(versionId: string) {
	workflowDocumentStore.setActiveState({
		activeVersionId: versionId,
		activeVersion: {
			versionId,
			authors: 'Test Author',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowPublishHistory: [],
			name: 'Published Version',
			description: null,
		},
	});
}

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-WF-03-01 · Publicar sin nodo trigger', () => {
	describe('re-attempt (partial / failed publication)', () => {
		// Set versionId === activeVersion.versionId so wfHasAnyChanges is false
		beforeEach(() => {
			workflowDocumentStore.setVersionData({
				versionId: 'old-version',
				name: null,
				description: null,
			});
		});

		it('still blocks re-attempt when containsTrigger is false', async () => {
			workflowDocumentStore.setPublicationStatus({ status: 'partial' });
			workflowDocumentStore.setNodes([]);

			const { getByTestId } = renderComponent();

			await waitFor(() => {
				expect(getByTestId('workflow-publish-button')).toBeDisabled();
			});
		});
	});
});

describe('CP-WF-03-03 · Conflicto de webhook con otro workflow activo', () => {
	describe('handlePublish without conflicts', () => {
		it('should proceed to publish when there are no conflicting webhooks', async () => {
			mockPublishWorkflow.mockReset().mockResolvedValue({
				success: true,
				errorHandled: false,
			});
			const { getByTestId } = renderComponent();

			const versionInput = getByTestId('workflow-publish-version-name-input');
			await userEvent.type(versionInput, 'v1.0.0');

			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(mockPublishWorkflow).toHaveBeenCalled();
				expect(mockShowMessage).not.toHaveBeenCalled();
				expect(mockTelemetryTrack).toHaveBeenCalledWith('User published version from canvas', {
					workflow_id: 'workflow-1',
				});
			});
		});
	});
});

describe('CP-WF-03-06 · Publicar con credencial inválida', () => {
	describe('publish never settles', () => {
		it('stops the spinner and reports the failure when publishWorkflow throws', async () => {
			mockPublishWorkflow.mockReset().mockRejectedValue(new Error('boom'));

			const { getByTestId } = renderComponent();

			await userEvent.type(getByTestId('workflow-publish-version-name-input'), 'v1.0.0');
			await userEvent.click(getByTestId('workflow-publish-button'));

			await waitFor(() => {
				expect(getByTestId('workflow-publish-cancel-button')).not.toBeDisabled();
			});
			expect(mockShowError).toHaveBeenCalled();
		});
	});
});
