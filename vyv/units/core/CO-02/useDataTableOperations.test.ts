/**
 * CO-02 · Edición de filas — editar celdas.
 * Origen: packages/frontend/editor-ui/src/features/core/dataTable/composables/useDataTableOperations.test.ts
 */
import {
	useDataTableOperations,
	type UseDataTableOperationsParams,
} from '@/features/core/dataTable/composables/useDataTableOperations';
import { ref } from 'vue';
import type {
	GridApi,
	ColumnMovedEvent,
	CellValueChangedEvent,
	CellKeyDownEvent,
} from 'ag-grid-community';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { ResponseError } from '@n8n/rest-api-client';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { MODAL_CONFIRM } from '@/app/constants';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { DataTableRow } from '@/features/core/dataTable/dataTable.types';

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({})),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: vi.fn(() => ({
		confirm: vi.fn(),
	})),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
		showMessage: vi.fn(),
	})),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string) => key),
	})),
}));

vi.mock('@/features/core/dataTable/composables/useDataTableTypes', () => ({
	useDataTableTypes: vi.fn(() => ({
		mapToDataTableColumnType: vi.fn(),
	})),
}));

vi.mock('@/features/core/dataTable/typeGuards', () => ({
	isDataTableValue: vi.fn((value: unknown) => value !== undefined && value !== null),
	isAGGridCellType: vi.fn(() => true),
}));

// Setup of describe('useDataTableOperations', (original top-level describe)
let params: UseDataTableOperationsParams;
let dataTableStore: ReturnType<typeof useDataTableStore>;
let confirmMock: ReturnType<typeof vi.fn>;
let showErrorMock: ReturnType<typeof vi.fn>;
let showMessageMock: ReturnType<typeof vi.fn>;
let telemetryTrackMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	setActivePinia(createTestingPinia());

	dataTableStore = {
		addDataTableColumn: vi.fn(),
		deleteDataTableColumn: vi.fn(),
		moveDataTableColumn: vi.fn(),
		renameDataTableColumn: vi.fn(),
		deleteRows: vi.fn(),
		insertEmptyRow: vi.fn(),
	} as unknown as ReturnType<typeof useDataTableStore>;

	vi.mocked(useDataTableStore).mockReturnValue(dataTableStore);

	confirmMock = vi.fn();
	vi.mocked(useMessage).mockReturnValue({
		confirm: confirmMock,
	} as unknown as ReturnType<typeof useMessage>);

	showErrorMock = vi.fn();
	showMessageMock = vi.fn();
	vi.mocked(useToast).mockReturnValue({
		showError: showErrorMock,
		showMessage: showMessageMock,
	} as unknown as ReturnType<typeof useToast>);

	telemetryTrackMock = vi.fn();
	vi.mocked(useTelemetry).mockReturnValue({
		track: telemetryTrackMock,
	} as unknown as ReturnType<typeof useTelemetry>);

	params = {
		colDefs: ref([]),
		rowData: ref([]),
		deleteGridColumn: vi.fn(),
		addGridColumn: vi.fn(),
		setGridData: vi.fn(),
		insertGridColumnAtIndex: vi.fn(),
		moveGridColumn: vi.fn(),
		dataTableId: 'test',
		projectId: 'test',
		gridApi: ref(null as unknown as GridApi),
		totalItems: ref(0),
		setTotalItems: vi.fn(),
		ensureItemOnPage: vi.fn(),
		focusFirstEditableCell: vi.fn(),
		toggleSave: vi.fn(),
		currentPage: ref(1),
		pageSize: ref(10),
		currentSortBy: ref(''),
		currentSortOrder: ref(null),
		currentFilterJSON: ref(undefined),
		handleClearSelection: vi.fn(),
		selectedRowIds: ref(new Set()),
		handleCopyFocusedCell: vi.fn(),
	};
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-CO-02-01 · Añadir fila con valores válidos', () => {
	describe('onCellValueChanged', () => {
		it('should update cell value successfully', async () => {
			const updateRowMock = vi.fn().mockResolvedValue(undefined);
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				updateRow: updateRowMock,
			});

			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'Jane' },
				api: { applyTransaction: vi.fn() },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text', colId: 'col1' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(params.toggleSave).toHaveBeenCalledWith(true);
			expect(updateRowMock).toHaveBeenCalledWith('test', 'test', 1, { name: 'Jane' });
			expect(telemetryTrackMock).toHaveBeenCalledWith('User edited data table content', {
				data_table_id: 'test',
				column_id: 'col1',
				column_type: 'text',
			});
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});
	});
});

describe('CP-CO-02-02 · Texto en una columna number', () => {
	describe('onCellValueChanged', () => {
		it('should revert cell value when update fails', async () => {
			const isDataTableValue = await import('@/features/core/dataTable/typeGuards').then(
				(m) => m.isDataTableValue,
			);
			vi.mocked(isDataTableValue).mockReturnValue(true);

			const updateError = new Error('Update failed');
			vi.mocked(useDataTableStore).mockReturnValue({
				...dataTableStore,
				updateRow: vi.fn().mockRejectedValue(updateError),
			});

			const applyTransaction = vi.fn();
			const { onCellValueChanged } = useDataTableOperations(params);
			const event = {
				data: { id: 1, name: 'Jane' },
				api: { applyTransaction },
				oldValue: 'John',
				colDef: { field: 'name', cellDataType: 'text', colId: 'col1' },
			} as unknown as CellValueChangedEvent<DataTableRow>;

			await onCellValueChanged(event);

			expect(applyTransaction).toHaveBeenCalledWith({
				update: [{ id: 1, name: 'John' }],
			});
			expect(showErrorMock).toHaveBeenCalledWith(updateError, 'dataTable.updateRow.error');
			expect(params.toggleSave).toHaveBeenCalledWith(false);
		});
	});
});
