/**
 * CO-02 · Edición de filas — valores nulos y celdas muy grandes.
 * Origen: packages/frontend/editor-ui/src/features/core/dataTable/utils/columnUtils.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import type {
	CellClassParams,
	ICellRendererParams,
	ValueGetterParams,
	ValueSetterParams,
	CellEditRequestEvent,
	ValueFormatterParams,
} from 'ag-grid-community';
import { ref } from 'vue';
import type { I18nClass } from '@n8n/i18n';
import type { DataTableColumn, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import {
	createCellClass,
	createValueGetter,
	createCellRendererSelector,
	createStringValueSetter,
	stringCellEditorParams,
	dateValueFormatter,
	numberValueFormatter,
	getStringColumnFilterOptions,
	getBooleanColumnFilterOptions,
	getNumberColumnFilterOptions,
	getDateColumnFilterOptions,
	isOversizedValue,
	isUnsafeNumberValue,
} from '@/features/core/dataTable/utils/columnUtils';
import {
	ADD_ROW_ROW_ID,
	NULL_VALUE,
	EMPTY_VALUE,
	MAX_CELL_DISPLAY_LENGTH,
} from '@/features/core/dataTable/constants';
import NullEmptyCellRenderer from '@/features/core/dataTable/components/dataGrid/NullEmptyCellRenderer.vue';
import OversizedCellRenderer from '@/features/core/dataTable/components/dataGrid/OversizedCellRenderer.vue';

// Setup of describe('columnUtils', (original top-level describe)
let mockI18n: I18nClass;

beforeEach(() => {
	mockI18n = {
		baseText: vi.fn((key: string) => key),
	} as unknown as I18nClass;
});

describe('CP-CO-02-04 · Nulo frente a cadena vacía', () => {
	describe('createValueGetter', () => {
		it('should return null for undefined values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: {} } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBeNull();
		});
	});

	describe('createValueGetter', () => {
		it('should return null for null values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: null } } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBeNull();
		});
	});
});

describe('CP-CO-02-05 · Celda de más de 10 000 caracteres', () => {
	describe('isOversizedValue', () => {
		it('should return true for strings exceeding max length', () => {
			const longString = 'a'.repeat(MAX_CELL_DISPLAY_LENGTH + 1);
			expect(isOversizedValue(longString)).toBe(true);
		});
	});

	describe('createCellClass', () => {
		const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };

		it('should return "oversized-cell" for oversized values', () => {
			const longString = 'a'.repeat(MAX_CELL_DISPLAY_LENGTH + 1);
			const params = {
				data: { id: 1, test: longString },
				column: {
					getUserProvidedColDef: () => ({ cellDataType: 'text' }),
				},
			} as unknown as CellClassParams;

			expect(createCellClass(col)(params)).toBe('oversized-cell');
		});
	});
});
