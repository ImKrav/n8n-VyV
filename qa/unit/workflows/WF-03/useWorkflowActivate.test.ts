/**
 * WF-03 · Publicar / activar y desactivar — despublicar.
 * Origen: packages/frontend/editor-ui/src/app/composables/useWorkflowActivate.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { PushMessage } from '@n8n/api-types';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { WORKFLOW_ACTIVE_MODAL_KEY } from '@/app/constants';

// --- hoisted mocks ---
// vi.hoisted callbacks run before any imports, so only plain JS is usable there.

const mockSetActiveState = vi.hoisted(() => vi.fn());
const mockSetPublicationStatus = vi.hoisted(() => vi.fn());
const mockSetVersionData = vi.hoisted(() => vi.fn());
const mockSetChecksum = vi.hoisted(() => vi.fn());

// `hydrated` and `checksum` are set per-test to model a document that is
// open in an editor (routed or embedded) versus one that is not.
const mockDocumentStore = vi.hoisted(() => ({
	setActiveState: mockSetActiveState,
	setPublicationStatus: mockSetPublicationStatus,
	setVersionData: mockSetVersionData,
	setChecksum: mockSetChecksum,
	checksum: undefined as string | undefined,
	versionData: null,
	hydrated: false,
	active: false,
}));

// A second workflow's document store, to model the editor switching to another
// workflow (or artifact tab) while a request is in flight.
const otherDocumentStore = vi.hoisted(() => ({
	setActiveState: vi.fn(),
	setPublicationStatus: vi.fn(),
	setVersionData: vi.fn(),
	setChecksum: vi.fn(),
	checksum: 'other-checksum' as string | undefined,
	versionData: null,
	hydrated: false,
	active: false,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn((documentId: string) =>
		documentId === 'wf-2@latest' ? otherDocumentStore : mockDocumentStore,
	),
	createWorkflowDocumentId: vi.fn((workflowId: string) => `${workflowId}@latest`),
}));

// Captures the listeners publishWorkflow registers, so tests can dispatch
// push messages and verify the listeners are removed again.
const mockPushListeners = vi.hoisted(() => new Set<(message: unknown) => void>());

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		addEventListener: (handler: (message: unknown) => void) => {
			mockPushListeners.add(handler);
			return () => mockPushListeners.delete(handler);
		},
	}),
}));

const mockPublishWorkflow = vi.hoisted(() => vi.fn());
const mockDeactivateWorkflow = vi.hoisted(() => vi.fn());
const mockSetWorkflowActive = vi.hoisted(() => vi.fn());
const mockSetWorkflowInactive = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue({
		publishWorkflow: mockPublishWorkflow,
		deactivateWorkflow: mockDeactivateWorkflow,
		setWorkflowActive: mockSetWorkflowActive,
		setWorkflowInactive: mockSetWorkflowInactive,
	}),
}));

// Returns `undefined` for ids the list store never paged in - the runtime
// behaviour that its `IWorkflowDb` return type hides.
const mockGetWorkflowById = vi.hoisted(() =>
	vi.fn((_id: string) => ({ activeVersion: null }) as { activeVersion: unknown } | undefined),
);

const mockFetchWorkflow = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn().mockReturnValue({
		getWorkflowById: mockGetWorkflowById,
		fetchWorkflow: mockFetchWorkflow,
	}),
}));

// useSettingsStore is called at publish time (not at composable init), so we
// control the return value per-test via the mockSettingsImpl variable below.
const mockSettingsImpl = vi.hoisted(() => ({
	isWorkflowPublicationServiceEnabled: false,
	isMultiMain: false,
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => mockSettingsImpl),
}));

const mockOpenModal = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		openModal: mockOpenModal,
		openModalWithData: vi.fn(),
	}),
}));

const mockRegisterPendingActivationModal = vi.hoisted(() => vi.fn());
const mockClearPendingActivationModal = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/workflowPublicationConfirmation', () => ({
	registerPendingActivationModal: mockRegisterPendingActivationModal,
	clearPendingActivationModal: mockClearPendingActivationModal,
}));

vi.mock('@/features/collaboration/collaboration/collaboration.store', () => ({
	useCollaborationStore: vi.fn().mockReturnValue({
		requestWriteAccess: vi.fn(),
	}),
}));

const mockExternalHooksRun = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({ run: mockExternalHooksRun }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

const mockShowError = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({ showError: mockShowError, showMessage: vi.fn() }),
}));

const mockShowPolicyViolationToast = vi.hoisted(() => vi.fn());
const mockClosePolicyViolationToast = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/usePolicyViolationToast', () => ({
	usePolicyViolationToast: vi.fn().mockReturnValue({
		showPolicyViolationToast: mockShowPolicyViolationToast,
		closePolicyViolationToast: mockClosePolicyViolationToast,
	}),
}));

// Models the "Don't show again" flag of the activation success modal.
const mockActivationStorageFlag = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('@n8n/composables/useStorage', () => ({
	useStorage: vi.fn().mockReturnValue(mockActivationStorageFlag),
}));

vi.mock('@/app/composables/useActivationError', () => ({
	useActivationError: vi.fn().mockReturnValue({ errorMessage: { value: '' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockReturnValue('') }),
}));

// --- helpers ---

const WORKFLOW_ID = 'wf-1';
const OTHER_WORKFLOW_ID = 'wf-2';
const VERSION_ID = 'v-1';

function dispatchPushMessage(message: PushMessage) {
	for (const handler of mockPushListeners) {
		handler(message);
	}
}

function makePublishedWorkflowResponse() {
	return {
		activeVersion: {
			versionId: 'av-1',
			authors: '',
			createdAt: '',
			updatedAt: '',
			workflowPublishHistory: [],
			name: null,
			description: null,
		},
		checksum: 'abc123',
		versionId: 'v-2',
	};
}

// --- tests ---

// Setup of describe('useWorkflowActivate', (original top-level describe)
beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
	mockSettingsImpl.isWorkflowPublicationServiceEnabled = false;
	mockSettingsImpl.isMultiMain = false;
	mockActivationStorageFlag.value = undefined;
	mockDocumentStore.hydrated = false;
	mockDocumentStore.checksum = undefined;
	mockDocumentStore.active = false;
	otherDocumentStore.hydrated = false;
	mockGetWorkflowById.mockReturnValue({ activeVersion: null });
	mockFetchWorkflow.mockResolvedValue(makePublishedWorkflowResponse());
	mockPushListeners.clear();
});

describe('CP-WF-03-05 · Despublicar detiene el trigger', () => {
	describe('unpublishWorkflowFromHistory()', () => {
		it('unpublishes when the workflow is not in the list store cache', async () => {
			mockGetWorkflowById.mockReturnValue(undefined);
			mockDeactivateWorkflow.mockResolvedValueOnce(undefined);

			const { unpublishWorkflowFromHistory } = useWorkflowActivate();

			expect(await unpublishWorkflowFromHistory(WORKFLOW_ID)).toBe(true);
		});
	});
});
