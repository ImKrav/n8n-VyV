/**
 * WF-03 · Publicar / activar y desactivar — botón de publicar de la cabecera del editor.
 * Origen: packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowHeaderDraftPublishActions.test.ts
 */
import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createMockEnterpriseSettings, mockNodeTypeDescription } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { WORKFLOW_PUBLISH_MODAL_KEY, EnterpriseEditionFeature } from '@/app/constants';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import { STORES } from '@n8n/stores';
import type { INodeUi } from '@/Interface';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockRestrictedNodeTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { nodeViewEventBus } from '@/app/event-bus';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN,
	LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW,
	LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN,
} from '@/app/constants/localStorage';
import { useUsersStore } from '@n8n/stores/users.store';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
	fetchWorkflowReviewRequests,
	updateWorkflowReviewRequestVersion,
} from '@/features/workflow-reviews/workflowReviews.api';
import { ResponseError } from '@n8n/rest-api-client';

// Hoisted: the vue-router mock factory runs before module-level consts initialize
const { mockRouterPush, mockRouterResolve } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockRouterResolve: vi.fn(({ params }: { params: { reviewId: string } }) => ({
		href: `/inbox/reviews/${params.reviewId}`,
	})),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: vi.fn().mockReturnValue({
		params: { workflowId: 'test' },
		query: {},
	}),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
		push: mockRouterPush,
		resolve: mockRouterResolve,
		currentRoute: {
			value: {
				params: { workflowId: 'test' },
				query: {},
			},
		},
	}),
}));

const mockSaveCurrentWorkflow = vi.fn().mockResolvedValue(true);
const mockUnpublishWorkflowFromHistory = vi.fn().mockResolvedValue(true);
const mockPublishWorkflow = vi.fn().mockResolvedValue({ success: true });
const mockShowMessage = vi.fn();
const mockShowToast = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: mockSaveCurrentWorkflow,
	}),
}));

vi.mock('@/app/composables/useWorkflowActivate', () => ({
	useWorkflowActivate: () => ({
		unpublishWorkflowFromHistory: mockUnpublishWorkflowFromHistory,
		publishWorkflow: mockPublishWorkflow,
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
		showToast: mockShowToast,
		showError: mockShowError,
	}),
}));

vi.mock('@/app/composables/useWorkflowPublicationStatusSync', () => ({
	useWorkflowPublicationStatusSync: vi.fn().mockReturnValue({ refetch: vi.fn() }),
}));

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	createWorkflowReviewRequest: vi.fn(),
	fetchEligibleReviewers: vi.fn(),
	fetchWorkflowReviewRequests: vi.fn(),
	updateWorkflowReviewRequestVersion: vi.fn(),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: createMockEnterpriseSettings(),
		},
	},
};

const defaultWorkflowProps = {
	id: '1',
	name: 'Test Workflow',
	tags: [],
	meta: {},
	isArchived: false,
	isNewWorkflow: false,
	workflowPermissions: {
		create: true,
		read: true,
		update: true,
		delete: true,
		publish: true,
		unpublish: true,
	},
};

const renderComponent = createComponentRenderer(WorkflowHeaderDraftPublishActions, {
	props: defaultWorkflowProps,
	pinia: createTestingPinia({ initialState, stubActions: false }),
	global: {
		stubs: {
			N8nTooltip: {
				template: '<div><slot name="content" /><slot /></div>',
			},
		},
	},
});

const createMockActiveVersion = (versionId: string) => ({
	versionId,
	authors: 'Test Author',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	workflowPublishHistory: [],
	name: 'Published Version',
	description: null,
});

const triggerNode: INodeUi = {
	id: 'trigger-1',
	name: 'Webhook Trigger',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	disabled: false,
};

// Setup of describe('WorkflowHeaderDraftPublishActions', (original top-level describe)
let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let collaborationStore: MockedStore<typeof useCollaborationStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

const setupEnabledPublishButton = () => {
	workflowDocumentStore.setNodes([triggerNode]);
};

const selectReviewer = async (baseElement: Element) => {
	if (!(baseElement instanceof HTMLElement)) throw new Error('Expected an HTML test container');

	await userEvent.click(within(baseElement).getByRole('combobox'));
	await waitFor(() => expect(within(baseElement).getByRole('listbox')).toBeInTheDocument());
	const option = baseElement.querySelector('#user-select-option-id-reviewer-1');
	expect(option).not.toBeNull();
	await userEvent.click(option as HTMLElement);
};

const setWorkflowReviewGates = ({
	licensed = true,
	instanceEnabled = true,
}: Partial<{
	licensed: boolean;
	instanceEnabled: boolean;
}> = {}) => {
	settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
		[EnterpriseEditionFeature.WorkflowReviews]: licensed,
	});
	settingsStore.settings = {
		...settingsStore.settings,
		workflowReviews: { enabled: instanceEnabled },
	};
};

beforeEach(async () => {
	workflowsStore = mockedStore(useWorkflowsStore);
	uiStore = mockedStore(useUIStore);
	collaborationStore = mockedStore(useCollaborationStore);
	projectsStore = mockedStore(useProjectsStore);
	settingsStore = mockedStore(useSettingsStore);
	settingsStore.isEnterpriseFeatureEnabled = createMockEnterpriseSettings();
	settingsStore.settings = {
		...settingsStore.settings,
		workflowReviews: { enabled: false },
	};
	useUsersStore().currentUserId = 'user-1';
	localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW('user-1'));
	localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('user-1'));
	localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('user-1'));
	useReviewRequiredStore().setReviewRequired(defaultWorkflowProps.id, false);
	// The testing pinia is shared across this file, so reset the review status to
	// "fetched, no open review" between tests.
	vi.mocked(fetchWorkflowReviewRequests).mockResolvedValue({ count: 0, data: [] });
	await useWorkflowReviewStatusStore().fetchStatus(defaultWorkflowProps.id);

	const nodeTypesStore = useNodeTypesStore();
	nodeTypesStore.setNodeTypes([
		mockNodeTypeDescription({
			name: 'n8n-nodes-base.webhook',
			group: ['trigger'],
		}),
	]);

	workflowsStore.setWorkflowId('1');
	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));
	workflowDocumentStore.setVersionData({ versionId: 'version-1', name: null, description: null });
	workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
	uiStore.markStateClean();
	collaborationStore.shouldBeReadOnly = false;

	mockSaveCurrentWorkflow.mockClear();
	mockSaveCurrentWorkflow.mockResolvedValue(true);
	mockPublishWorkflow.mockClear();
	mockPublishWorkflow.mockResolvedValue({ success: true });
	mockRouterPush.mockClear();
	mockRouterPush.mockResolvedValue(undefined);
	vi.mocked(createWorkflowReviewRequest).mockResolvedValue({
		id: 'review-1',
		state: 'open',
		decision: 'pending',
		workflowVersionId: 'version-1',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	});
	vi.mocked(fetchEligibleReviewers).mockResolvedValue({
		count: 1,
		data: [
			{
				id: 'reviewer-1',
				email: 'reviewer@n8n.io',
				firstName: 'Rae',
				lastName: 'Viewer',
			},
		],
	});
	vi.mocked(updateWorkflowReviewRequestVersion).mockResolvedValue({
		id: 'req-1',
		state: 'open',
		decision: 'pending',
		workflowVersionId: 'version-1',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-WF-03-01 · Publicar sin nodo trigger', () => {
	describe('Publish button state', () => {
		const restrictedNode: INodeUi = {
			id: 'slack-1',
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
			disabled: false,
		};

		const setupRestrictedWorkflow = (node: INodeUi = restrictedNode) => {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({ name: restrictedNode.type, displayName: 'Slack' }),
			]);
			workflowDocumentStore.setNodes([triggerNode, node]);
			mockRestrictedNodeTypes({ [restrictedNode.type]: 'instance' });
		};

		const restrictionText = /An administrator blocked 'Slack' on this instance/;

		it('should show publish button disabled when there are no trigger nodes', () => {
			workflowDocumentStore.setNodes([]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateDirty();

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});
	});

	describe('Publish button state', () => {
		const restrictedNode: INodeUi = {
			id: 'slack-1',
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
			disabled: false,
		};

		const setupRestrictedWorkflow = (node: INodeUi = restrictedNode) => {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({ name: restrictedNode.type, displayName: 'Slack' }),
			]);
			workflowDocumentStore.setNodes([triggerNode, node]);
			mockRestrictedNodeTypes({ [restrictedNode.type]: 'instance' });
		};

		const restrictionText = /An administrator blocked 'Slack' on this instance/;

		it('should show publish button disabled when trigger node is disabled', () => {
			workflowDocumentStore.setNodes([{ ...triggerNode, disabled: true }]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateDirty();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).toBeDisabled();
		});
	});
});

describe('CP-WF-03-07 · Cambios posteriores a la publicación', () => {
	describe('Publish button state', () => {
		const restrictedNode: INodeUi = {
			id: 'slack-1',
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 1,
			position: [200, 0],
			parameters: {},
			disabled: false,
		};

		const setupRestrictedWorkflow = (node: INodeUi = restrictedNode) => {
			useNodeTypesStore().setNodeTypes([
				mockNodeTypeDescription({ name: restrictedNode.type, displayName: 'Slack' }),
			]);
			workflowDocumentStore.setNodes([triggerNode, node]);
			mockRestrictedNodeTypes({ [restrictedNode.type]: 'instance' });
		};

		const restrictionText = /An administrator blocked 'Slack' on this instance/;

		it('should show publish button enabled when there are unpublished changes (versionId mismatch)', () => {
			workflowDocumentStore.setNodes([triggerNode]);

			workflowDocumentStore.setActiveState({
				activeVersionId: 'version-2',
				activeVersion: createMockActiveVersion('version-2'),
			});
			uiStore.markStateClean();

			const { getByTestId } = renderComponent();

			expect(getByTestId('workflow-open-publish-modal-button')).not.toBeDisabled();
		});
	});
});
