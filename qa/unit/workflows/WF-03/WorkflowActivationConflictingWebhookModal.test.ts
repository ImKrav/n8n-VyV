/**
 * WF-03 · Publicar / activar y desactivar — conflicto de webhook con otro workflow activo.
 * Origen: packages/frontend/editor-ui/src/features/workflows/components/WorkflowActivationConflictingWebhookModal.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowActivationConflictingWebhookModal from '@/features/workflows/components/WorkflowActivationConflictingWebhookModal.vue';
import {
	SLACK_TRIGGER_NODE_TYPE,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
} from '@/app/constants';

import { waitFor } from '@testing-library/vue';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from 'n8n-workflow';

vi.mock('@/app/stores/ui.store', () => {
	return {
		useUIStore: vi.fn(() => ({
			closeModal: vi.fn(),
		})),
	};
});
vi.mock('@n8n/stores/useRootStore', () => {
	return {
		useRootStore: vi.fn(() => ({
			webhookUrl: 'http://webhook-base',
			urlBaseEditor: 'http://editor-base',
		})),
	};
});

const renderComponent = createComponentRenderer(WorkflowActivationConflictingWebhookModal, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

// Setup of describe('WorkflowActivationConflictingWebhookModal', (original top-level describe)
beforeEach(() => {
	createTestingPinia();
});

describe('CP-WF-03-03 · Conflicto de webhook con otro workflow activo', () => {
	it('should render webhook conflict modal', async () => {
		const props = {
			modalName: WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
			data: {
				triggerName: 'Trigger in this workflow',
				workflowName: 'Test Workflow',
				triggerType: WEBHOOK_NODE_TYPE,
				workflowId: '123',
				webhookPath: 'webhook-path',
				method: 'GET',
				node: 'Node in workflow',
			},
		};

		const wrapper = renderComponent({ props });
		await waitFor(() => {
			expect(wrapper.queryByTestId('conflicting-webhook-callout')).toBeInTheDocument();
		});

		expect(wrapper.getByTestId('conflicting-webhook-callout')).toHaveTextContent(
			"A webhook trigger 'Node in workflow' in the workflow 'Test Workflow' uses a conflicting URL path, so this workflow cannot be activated",
		);
		expect(wrapper.getByTestId('conflicting-webhook-suggestion')).toHaveTextContent(
			'and activate this one, or adjust the following URL path in either workflow:',
		);
		expect(wrapper.getByTestId('conflicting-webhook-path')).toHaveTextContent(
			'http://webhook-base/webhook-path',
		);
	});
});
