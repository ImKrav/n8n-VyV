/**
 * WF-05 · Plantillas, importación y duplicado — importar desde URL.
 * Origen: packages/frontend/editor-ui/src/features/workflows/components/ImportWorkflowUrlModal.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import ImportWorkflowUrlModal from '@/features/workflows/components/ImportWorkflowUrlModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUIStore } from '@/app/stores/ui.store';
import { nodeViewEventBus } from '@/app/event-bus';
import { IMPORT_WORKFLOW_URL_MODAL_KEY } from '@/app/constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';

const ModalStub = {
	template: `
        <div>
            <slot name="header" />
            <slot name="title" />
            <slot name="content" />
            <slot name="footer" />
        </div>
    `,
};

const initialState = {
	[STORES.UI]: {
		modalStateById: {
			[IMPORT_WORKFLOW_URL_MODAL_KEY]: {
				open: true,
			},
		},
	},
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(ImportWorkflowUrlModal);
let pinia: ReturnType<typeof createTestingPinia>;

// Setup of describe('ImportWorkflowUrlModal', (original top-level describe)
beforeEach(() => {
	pinia = createTestingPinia({ initialState });
});

describe('CP-WF-05-03 · Importar workflow desde URL válida', () => {
	it('should emit importWorkflowUrl event on confirm', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const urlInput = getByTestId('workflow-url-import-input');
		const confirmButton = getByTestId('confirm-workflow-import-url-button');

		await userEvent.type(urlInput, 'https://valid-url.com/workflow.json');
		expect(confirmButton).toBeEnabled();

		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		await userEvent.click(confirmButton);

		expect(emitSpy).toHaveBeenCalledWith('importWorkflowUrl', {
			url: 'https://valid-url.com/workflow.json',
		});
	});

	it('should accept URLs without .json extension', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const urlInput = getByTestId('workflow-url-import-input');
		const confirmButton = getByTestId('confirm-workflow-import-url-button');

		await userEvent.type(urlInput, 'https://example.com/workflow');
		expect(confirmButton).toBeEnabled();
	});
});

describe('CP-WF-05-04 · Importar desde URL inválida o con JSON no válido', () => {
	it('should disable confirm button for invalid URL', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const urlInput = getByTestId('workflow-url-import-input');
		const confirmButton = getByTestId('confirm-workflow-import-url-button');

		await userEvent.type(urlInput, 'invalid-url');
		expect(confirmButton).toBeDisabled();
	});
});
