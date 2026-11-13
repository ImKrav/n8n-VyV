/**
 * WF-04 · Historial de versiones y diff — formulario para nombrar una versión.
 * Origen: packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowVersionFormModal.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createEventBus } from '@n8n/utils/event-bus';
import WorkflowVersionFormModal, {
	type WorkflowVersionFormModalEventBusEvents,
} from '@/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue';
import { STORES } from '@n8n/stores';

const TEST_MODAL_KEY = 'test-modal';

const renderComponent = createComponentRenderer(WorkflowVersionFormModal, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[TEST_MODAL_KEY]: {
						open: true,
					},
				},
				modalStack: [TEST_MODAL_KEY],
			},
		},
	}),
	global: {
		stubs: {
			Modal: {
				template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
				props: ['name', 'eventBus'],
				mounted() {
					this.eventBus?.emit('opened');
				},
			},
			WorkflowVersionForm: {
				template: `
					<div>
						<input :data-test-id="versionNameTestId" :value="versionName" @input="$emit('update:versionName', $event.target.value)" />
						<textarea :data-test-id="descriptionTestId" :value="description" @input="$emit('update:description', $event.target.value)" />
					</div>
				`,
				props: ['versionName', 'description', 'versionNameTestId', 'descriptionTestId'],
				methods: {
					focusInput: vi.fn(),
				},
			},
		},
	},
});

// Setup of describe('WorkflowVersionFormModal', (original top-level describe)
afterEach(() => {
	cleanup();
});

describe('CP-WF-04-02 · Nombrar una versión', () => {
	it('should disable submit button when version name is empty', async () => {
		const eventBus = createEventBus<WorkflowVersionFormModalEventBusEvents>();
		const { getByTestId } = renderComponent({
			props: {
				modalName: TEST_MODAL_KEY,
				data: {
					versionId: 'version-123',
					versionName: '',
					modalTitle: 'Test Modal',
					submitButtonLabel: 'Submit',
					eventBus,
				},
			},
		});

		await waitFor(() => {
			const submitButton = getByTestId(`${TEST_MODAL_KEY}-submit-button`);
			expect(submitButton).toBeDisabled();
		});
	});

	it('should disable submit button when version name is only whitespace', async () => {
		const eventBus = createEventBus<WorkflowVersionFormModalEventBusEvents>();
		const { getByTestId } = renderComponent({
			props: {
				modalName: TEST_MODAL_KEY,
				data: {
					versionId: 'version-123',
					versionName: '   ',
					modalTitle: 'Test Modal',
					submitButtonLabel: 'Submit',
					eventBus,
				},
			},
		});

		await waitFor(() => {
			const submitButton = getByTestId(`${TEST_MODAL_KEY}-submit-button`);
			expect(submitButton).toBeDisabled();
		});
	});
});
