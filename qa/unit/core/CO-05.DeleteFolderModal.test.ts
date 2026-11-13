/**
 * CO-05 · Eliminar una carpeta con contenido (transferir o borrar).
 * Hueco: `DeleteFolderModal.vue` no tenía prueba en el repo.
 * (Mover workflows y carpetas: `MoveToFolderModal.test.ts`, reutilizada.)
 *
 * Dobles de prueba:
 * - Mock  `useToast`: se verifican los mensajes de éxito y de error.
 * - Stub  `useRoute`: entrega un `projectId` fijo.
 * - Stub  stores de Pinia: `breadcrumbsCache` y `currentProject` con datos fijos;
 *         `deleteFolder` es un spy que no llama a la API.
 * - Fake  `MoveToFolderDropdown`: un botón que emite la carpeta destino elegida.
 * - Spy   `emit` del event bus de la lista de workflows.
 */
import { createComponentRenderer } from '@/__tests__/render';
import DeleteFolderModal from '@/features/core/folders/components/DeleteFolderModal.vue';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import type {
	ChangeLocationSearchResult,
	WorkflowListEventMap,
} from '@/features/core/folders/folders.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent, h, type PropType } from 'vue';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { projectId: 'project-1' } }),
	useRouter: () => ({}),
	RouterLink: { template: '<a><slot /></a>' },
}));

const FOLDER = { id: 'folder-1', name: 'Reports' };

let destination: ChangeLocationSearchResult;
const MoveToFolderDropdownFake = defineComponent({
	emits: { 'location:selected': (_: ChangeLocationSearchResult) => true },
	setup:
		(_, { emit }) =>
		() =>
			h(
				'button',
				{
					'data-test-id': 'fake-destination',
					onClick: () => emit('location:selected', destination),
				},
				'pick',
			),
});

const ModalStub = defineComponent({
	props: { title: { type: String as PropType<string>, default: '' } },
	template: '<div><h1>{{ title }}</h1><slot name="content" /><slot name="footer" /></div>',
});

const renderModal = createComponentRenderer(DeleteFolderModal, {
	global: { stubs: { Modal: ModalStub, MoveToFolderDropdown: MoveToFolderDropdownFake } },
});

const setup = (content = { workflowCount: 3, subFolderCount: 2 }) => {
	const pinia = createTestingPinia();
	const foldersStore = useFoldersStore();
	const projectsStore = useProjectsStore();
	foldersStore.breadcrumbsCache = { [FOLDER.id]: { ...FOLDER, parentFolder: undefined } };
	// @ts-expect-error -- computed is writable in a testing pinia
	projectsStore.currentProject = { id: 'project-1', name: 'Finance', type: 'team' };

	const workflowListEventBus = createEventBus<WorkflowListEventMap>();
	const busEmit = vi.spyOn(workflowListEventBus, 'emit');

	const result = renderModal({
		pinia,
		props: {
			modalName: 'deleteFolder',
			activeId: FOLDER.id,
			data: { workflowListEventBus, content },
		},
	});
	const confirmButton = () => result.getByTestId('confirm-delete-folder-button');
	// The component puts `delete-data-input` on both the wrapper and the field.
	const confirmInput = () =>
		result.container.querySelector<HTMLInputElement>('[data-test-id="delete-data-input"] input')!;
	return { ...result, foldersStore, busEmit, confirmButton, confirmInput };
};

describe('CO-05 DeleteFolderModal', () => {
	beforeEach(() => {
		showMessage.mockClear();
		showError.mockClear();
	});

	it('muestra el nombre de la carpeta y cuánto contenido tiene', () => {
		// Arrange / Act
		const { getByText, container } = setup();

		// Assert
		expect(getByText("Delete 'Reports'")).toBeInTheDocument();
		expect(container).toHaveTextContent(
			'What should we do with the 2 folders and the 3 workflows in this folder?',
		);
	});

	it('no permite eliminar mientras no se elige qué hacer con el contenido', () => {
		// Arrange / Act
		const { confirmButton } = setup();

		// Assert
		expect(confirmButton()).toBeDisabled();
	});

	it('exige escribir «delete <nombre>» exacto para borrar el contenido', async () => {
		// Arrange
		const { getByTestId, confirmButton, confirmInput } = setup();
		await userEvent.click(getByTestId('delete-content-radio'));

		// Act
		await userEvent.type(confirmInput(), 'delete reports');

		// Assert
		expect(confirmButton()).toBeDisabled();

		// Act
		await userEvent.clear(confirmInput());
		await userEvent.type(confirmInput(), 'delete Reports');

		// Assert
		expect(confirmButton()).toBeEnabled();
	});

	it('borra la carpeta sin destino y notifica a la lista con los conteos', async () => {
		// Arrange
		const { getByTestId, confirmButton, confirmInput, foldersStore, busEmit } = setup();
		await userEvent.click(getByTestId('delete-content-radio'));
		await userEvent.type(confirmInput(), 'delete Reports');

		// Act
		await userEvent.click(confirmButton());

		// Assert
		expect(foldersStore.deleteFolder).toHaveBeenCalledExactlyOnceWith(
			'project-1',
			FOLDER.id,
			undefined,
		);
		await waitFor(() =>
			expect(busEmit).toHaveBeenCalledWith('folder-deleted', {
				folderId: FOLDER.id,
				workflowCount: 3,
				folderCount: 2,
			}),
		);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it.each([
		{
			target: 'otra carpeta',
			picked: { id: 'folder-2', name: 'Archive', resource: 'folder' },
			expectedParent: 'folder-2',
		},
		{
			target: 'la raíz del proyecto',
			picked: { id: 'project-1', name: 'Finance', resource: 'project' },
			expectedParent: '0',
		},
	])('transfiere el contenido a $target', async ({ picked, expectedParent }) => {
		// Arrange
		destination = picked as ChangeLocationSearchResult;
		const { getByTestId, confirmButton, foldersStore } = setup();
		await userEvent.click(getByTestId('transfer-content-radio'));
		await userEvent.click(getByTestId('fake-destination'));

		// Act
		await userEvent.click(confirmButton());

		// Assert
		expect(foldersStore.deleteFolder).toHaveBeenCalledExactlyOnceWith(
			'project-1',
			FOLDER.id,
			expectedParent,
		);
		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining(picked.name) }),
			),
		);
	});

	it('muestra el error y no notifica a la lista si la API falla', async () => {
		// Arrange
		const { getByTestId, confirmButton, confirmInput, foldersStore, busEmit } = setup();
		vi.mocked(foldersStore.deleteFolder).mockRejectedValue(new Error('boom'));
		await userEvent.click(getByTestId('delete-content-radio'));
		await userEvent.type(confirmInput(), 'delete Reports');

		// Act
		await userEvent.click(confirmButton());

		// Assert
		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(expect.any(Error), 'Problem while deleting folder'),
		);
		expect(busEmit).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
	});
});
