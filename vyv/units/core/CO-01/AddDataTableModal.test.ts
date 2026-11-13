/**
 * CO-01 · Crear data table y columnas — modal para crear la tabla (prueba nueva, con ciclo TDD en CP-CO-01-02).
 * Hueco: `AddDataTableModal.vue` no tenía prueba en el repo.
 * (Añadir, renombrar y eliminar columnas: `AddColumnButton.test.ts` y
 * `ColumnHeader.test.ts`, reutilizadas.)
 *
 * Dobles de prueba:
 * - Mock  `vue-router` (`push`, `replace`): se verifica la navegación.
 * - Mock  `useToast` y `useTelemetry`: se verifican error y evento.
 * - Stub  stores de Pinia: `createDataTable` devuelve una tabla fija o falla, sin red;
 *         `closeModal` es un spy.
 * - Stub  `Modal`: solo expone sus slots.
 */
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import AddDataTableModal from '@/features/core/dataTable/components/AddDataTableModal.vue';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

const push = vi.fn();
const replace = vi.fn();
vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { projectId: 'project-1' } }),
	useRouter: () => ({ push, replace }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage: vi.fn() }),
}));

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const ModalStub = {
	template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
};

const MODAL_NAME = 'addDataTableModal';
const CREATED = { id: 'dt-1', name: 'Sales', project: { id: 'project-1' } } as DataTable;

const renderModal = createComponentRenderer(AddDataTableModal, {
	props: { modalName: MODAL_NAME },
	global: { stubs: { Modal: ModalStub } },
});

const setup = () => {
	const pinia = createTestingPinia();
	const dataTableStore = useDataTableStore();
	const uiStore = useUIStore();
	const result = renderModal({ pinia });
	return {
		...result,
		dataTableStore,
		uiStore,
		nameInput: () => result.getByTestId('data-table-name-input-select'),
		createButton: () => result.getByTestId('proceed-from-select-button'),
	};
};

beforeEach(() => {
	push.mockClear();
	replace.mockClear();
	showError.mockClear();
	track.mockClear();
});

describe('CP-CO-01-01 · Crear data table con nombre válido', () => {
	it('crea la tabla desde cero en el proyecto actual y abre su detalle', async () => {
		// Arrange
		const { nameInput, createButton, dataTableStore, uiStore } = setup();
		vi.mocked(dataTableStore.createDataTable).mockResolvedValue(CREATED);
		await userEvent.type(nameInput(), 'Sales');

		// Act
		await userEvent.click(createButton());

		// Assert
		expect(dataTableStore.createDataTable).toHaveBeenCalledExactlyOnceWith('Sales', 'project-1');
		await waitFor(() =>
			expect(push).toHaveBeenCalledWith({ name: DATA_TABLE_DETAILS, params: { id: CREATED.id } }),
		);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		expect(track).toHaveBeenCalledWith(
			'User created data table',
			expect.objectContaining({ data_table_id: CREATED.id, creation_mode: 'scratch' }),
		);
	});

	it('crea la tabla al pulsar Enter en el campo de nombre', async () => {
		// Arrange
		const { nameInput, dataTableStore } = setup();
		vi.mocked(dataTableStore.createDataTable).mockResolvedValue(CREATED);

		// Act
		await userEvent.type(nameInput(), 'Sales{Enter}');

		// Assert
		expect(dataTableStore.createDataTable).toHaveBeenCalledOnce();
	});

	it('vuelve a la lista de data tables al cancelar', async () => {
		// Arrange
		const { getByTestId, dataTableStore } = setup();

		// Act
		await userEvent.click(getByTestId('cancel-select-button'));

		// Assert
		expect(replace).toHaveBeenCalledExactlyOnceWith({ name: PROJECT_DATA_TABLES });
		expect(dataTableStore.createDataTable).not.toHaveBeenCalled();
	});
});

describe('CP-CO-01-02 · Nombre vacío o solo espacios', () => {
	it('deshabilita «Create» mientras el nombre está vacío', () => {
		// Arrange / Act
		const { createButton } = setup();

		// Assert
		expect(createButton()).toBeDisabled();
	});

	it('deshabilita «Create» con un nombre de solo espacios', async () => {
		// Arrange
		const { nameInput, createButton } = setup();

		// Act
		await userEvent.type(nameInput(), '   ');

		// Assert
		expect(createButton()).toBeDisabled();
	});

	it('no crea la tabla al pulsar Enter con un nombre de solo espacios', async () => {
		// Arrange
		const { nameInput, dataTableStore } = setup();

		// Act
		await userEvent.type(nameInput(), '   {Enter}');

		// Assert
		expect(dataTableStore.createDataTable).not.toHaveBeenCalled();
	});

	it('propone el nombre del CSV cuando el nombre tiene solo espacios', async () => {
		// Arrange
		const { nameInput, dataTableStore, getByTestId, container } = setup();
		vi.mocked(dataTableStore.findAvailableDataTableName).mockResolvedValue('ventas');
		await userEvent.type(nameInput(), '   ');
		await userEvent.click(getByTestId('import-csv-option'));

		// Act
		const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
		await userEvent.upload(fileInput, new File(['a,b\n1,2'], 'ventas.csv', { type: 'text/csv' }));

		// Assert
		await waitFor(() => expect(nameInput()).toHaveValue('ventas'));
		expect(dataTableStore.findAvailableDataTableName).toHaveBeenCalledWith('ventas', 'project-1');
	});
});

describe('CP-CO-01-03 · Nombre duplicado en el proyecto', () => {
	it('muestra el error del servidor (p. ej. nombre duplicado) y no cierra ni navega', async () => {
		// Arrange
		const duplicated = new Error('Data table with this name already exists');
		const { nameInput, createButton, dataTableStore, uiStore } = setup();
		vi.mocked(dataTableStore.createDataTable).mockRejectedValue(duplicated);
		await userEvent.type(nameInput(), 'Sales');

		// Act
		await userEvent.click(createButton());

		// Assert
		await waitFor(() => expect(showError).toHaveBeenCalledWith(duplicated, expect.any(String)));
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		expect(track).not.toHaveBeenCalled();
	});
});
