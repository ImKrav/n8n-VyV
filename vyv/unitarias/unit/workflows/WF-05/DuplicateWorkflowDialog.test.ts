/**
 * WF-05 · Plantillas, importación y duplicado — duplicar un workflow (prueba nueva).
 * Hueco: `DuplicateWorkflowDialog.vue` no tenía prueba en el repo.
 * (Importar desde URL y plantillas: `ImportWorkflowUrlModal.test.ts`,
 * `templateActions.test.ts` y `templateTransforms.test.ts`, reutilizadas.)
 *
 * Dobles de prueba:
 * - Mock  `useWorkflowSaving().saveAsNewWorkflow`: se verifican argumentos y número de llamadas.
 * - Mock  `useToast` y `useTelemetry`: se verifican los mensajes y eventos.
 * - Stub  stores de Pinia (createTestingPinia): `getDuplicateCurrentWorkflowName` y
 *         `fetchWorkflow` devuelven datos fijos, sin red.
 * - Stub  `Modal`: solo expone sus slots, sin teleport ni animaciones.
 * - Fake  event bus externo (`createEventBus` real con un spy en `emit`).
 */
import { createComponentRenderer } from '@/__tests__/render';
import { MAX_WORKFLOW_NAME_LENGTH } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import DuplicateWorkflowDialog from '@/features/workflows/components/DuplicateWorkflowDialog.vue';
import type { IWorkflowDb } from '@/Interface';
import { i18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

const saveAsNewWorkflow = vi.fn();
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({ saveAsNewWorkflow }),
}));

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({}),
	RouterLink: { template: '<a><slot /></a>' },
}));

const ModalStub = {
	template: '<div><slot name="content" /><slot name="footer" :close="() => {}" /></div>',
};

const SOURCE = { id: 'wf-1', name: 'Invoices', tags: ['tag-1'] };
const SUGGESTED_NAME = 'Invoices copy';

const renderDialog = createComponentRenderer(DuplicateWorkflowDialog, {
	global: { stubs: { Modal: ModalStub, WorkflowTagsDropdown: true } },
});

const setup = ({ saved = false }: { saved?: boolean } = {}) => {
	const pinia = createTestingPinia();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const settingsStore = useSettingsStore();

	vi.mocked(workflowsStore.getDuplicateCurrentWorkflowName).mockResolvedValue(SUGGESTED_NAME);
	// @ts-expect-error -- computed is writable in a testing pinia
	workflowsStore.isWorkflowSaved = { [SOURCE.id]: saved };
	// @ts-expect-error -- computed is writable in a testing pinia
	settingsStore.areTagsEnabled = false;

	const externalEventBus = createEventBus();
	const emitSpy = vi.spyOn(externalEventBus, 'emit');

	const result = renderDialog({
		pinia,
		props: { modalName: 'duplicate', isActive: true, data: { ...SOURCE, externalEventBus } },
	});

	return {
		...result,
		workflowsStore,
		workflowsListStore,
		emitSpy,
		nameInput: () =>
			result.getByPlaceholderText(i18n.baseText('duplicateWorkflowDialog.enterWorkflowName')),
		saveButton: () => result.getByText(i18n.baseText('duplicateWorkflowDialog.save')),
	};
};

beforeEach(() => {
	saveAsNewWorkflow.mockReset();
	showMessage.mockClear();
	showError.mockClear();
	track.mockClear();
});

describe('CP-WF-05-05 · Duplicar con nombre vacío, repetido y muy largo', () => {
	it('propone el nombre único que calcula el store para evitar un nombre repetido', async () => {
		// Arrange
		const { nameInput, workflowsStore } = setup();

		// Act
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));

		// Assert
		expect(workflowsStore.getDuplicateCurrentWorkflowName).toHaveBeenCalledWith(SOURCE.name);
	});

	it('rechaza un nombre vacío o solo con espacios y no guarda nada', async () => {
		// Arrange
		const { nameInput, saveButton } = setup();
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));
		await userEvent.clear(nameInput());
		await userEvent.type(nameInput(), '   ');

		// Act
		await userEvent.click(saveButton());

		// Assert
		expect(saveAsNewWorkflow).not.toHaveBeenCalled();
		expect(showMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				type: 'error',
				title: i18n.baseText('duplicateWorkflowDialog.errors.missingName.title'),
			}),
		);
	});

	it('muestra el mensaje de permisos cuando la API responde 403', async () => {
		// Arrange
		saveAsNewWorkflow.mockRejectedValue(
			Object.assign(new Error('Forbidden'), { httpStatusCode: 403 }),
		);
		const { nameInput, saveButton } = setup();
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));

		// Act
		await userEvent.click(saveButton());

		// Assert
		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				expect.objectContaining({
					message: i18n.baseText('duplicateWorkflowDialog.errors.forbidden.message'),
				}),
				i18n.baseText('duplicateWorkflowDialog.errors.forbidden.title'),
			),
		);
		expect(track).not.toHaveBeenCalled();
	});

	it('acepta un nombre en el límite de longitud y limita la entrada al máximo', async () => {
		// Arrange
		saveAsNewWorkflow.mockResolvedValue('wf-2');
		const { nameInput, saveButton } = setup();
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));
		const atLimit = 'x'.repeat(MAX_WORKFLOW_NAME_LENGTH);

		// Act
		await userEvent.clear(nameInput());
		await userEvent.type(nameInput(), `${atLimit}overflow`);
		await userEvent.click(saveButton());

		// Assert
		expect(nameInput()).toHaveAttribute('maxlength', String(MAX_WORKFLOW_NAME_LENGTH));
		expect(saveAsNewWorkflow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ name: atLimit }),
		);
	});
});

describe('CP-WF-05-06 · El duplicado es independiente y conserva etiquetas', () => {
	it('duplica con el nombre recortado, URLs de webhook nuevas y avisa al bus externo', async () => {
		// Arrange
		saveAsNewWorkflow.mockResolvedValue('wf-2');
		const { nameInput, saveButton, emitSpy } = setup();
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));
		await userEvent.clear(nameInput());
		await userEvent.type(nameInput(), '  Invoices v2  ');

		// Act
		await userEvent.click(saveButton());

		// Assert
		expect(saveAsNewWorkflow).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				name: 'Invoices v2',
				tags: SOURCE.tags,
				resetWebhookUrls: true,
				resetNodeIds: true,
				data: undefined,
			}),
		);
		await waitFor(() =>
			expect(track).toHaveBeenCalledWith(
				'User duplicated workflow',
				expect.objectContaining({ old_workflow_id: SOURCE.id }),
			),
		);
		expect(emitSpy).toHaveBeenCalledWith('workflow-duplicated', { id: SOURCE.id });
	});

	it('copia un workflow guardado sin su id, estado activo ni relación de carpeta', async () => {
		// Arrange
		saveAsNewWorkflow.mockResolvedValue('wf-2');
		const { nameInput, saveButton, workflowsListStore } = setup({ saved: true });
		vi.mocked(workflowsListStore.fetchWorkflow).mockResolvedValue({
			id: SOURCE.id,
			name: SOURCE.name,
			active: true,
			activeVersionId: 'v1',
			nodes: [],
			connections: {},
			homeProject: { id: 'project-1' },
			parentFolder: { id: 'folder-1' },
		} as unknown as IWorkflowDb);
		await waitFor(() => expect(nameInput()).toHaveValue(SUGGESTED_NAME));

		// Act
		await userEvent.click(saveButton());

		// Assert
		await waitFor(() => expect(saveAsNewWorkflow).toHaveBeenCalledOnce());
		const { data } = saveAsNewWorkflow.mock.calls[0][0];
		expect(data).toMatchObject({ name: SOURCE.name, projectId: 'project-1', nodes: [] });
		expect(data).not.toHaveProperty('id');
		expect(data).not.toHaveProperty('active');
		expect(data).not.toHaveProperty('parentFolder');
	});
});
