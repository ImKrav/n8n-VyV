/**
 * CO-02 · Edición de filas — ordenar por columna.
 * Origen: packages/frontend/editor-ui/src/features/core/dataTable/composables/useAgGrid.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref, type Ref } from 'vue';
import { useAgGrid } from '@/features/core/dataTable/composables/useAgGrid';
import { useClipboard } from '@n8n/composables/useClipboard';
import type {
	GridApi,
	GridReadyEvent,
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
	CellKeyDownEvent,
	CellClickedEvent,
	SortChangedEvent,
	ColDef,
	Column,
	IRowNode,
} from 'ag-grid-community';

vi.mock('@n8n/composables/useClipboard', () => ({
	useClipboard: vi.fn((options) => {
		return {
			copy: vi.fn(async (text: string) => text),
			onPaste: options?.onPaste || vi.fn(),
		};
	}),
}));

vi.mock('@vueuse/core', () => ({
	onClickOutside: vi.fn(),
}));

// Setup of describe('useAgGrid', (original top-level describe)
let gridContainerRef: Ref<HTMLElement | null>;
let mockGridApi: Partial<GridApi>;

beforeEach(() => {
	gridContainerRef = ref(document.createElement('div'));
	mockGridApi = {
		setGridOption: vi.fn(),
		getFocusedCell: vi.fn(),
		getEditingCells: vi.fn(() => []),
		getDisplayedRowAtIndex: vi.fn(),
		getRowNode: vi.fn(),
		getAllDisplayedColumns: vi.fn(() => []),
		ensureIndexVisible: vi.fn(),
		setFocusedCell: vi.fn(),
		startEditingCell: vi.fn(),
		isEditing: vi.fn(() => false),
		clearFocusedCell: vi.fn(),
	};
});

const createComposable = (options?: Partial<Parameters<typeof useAgGrid>[0]>) => {
	return useAgGrid({
		gridContainerRef,
		defaultSortColumn: 'id',
		pinnedBottomRowId: '__add_row__',
		...options,
	});
};

describe('CP-CO-02-06 · Ordenar por columna', () => {
	describe('onSortChanged', () => {
		it('should update sort state when column is sorted', () => {
			const { onGridReady, onSortChanged, currentSortBy, currentSortOrder } = createComposable();
			onGridReady({ api: mockGridApi as GridApi } as GridReadyEvent);

			const mockColumn = {
				getColId: () => 'col1',
				getSort: () => 'desc' as const,
			} as unknown as Column;

			const colDefs: ColDef[] = [{ colId: 'col1', field: 'name' }];

			const event = {
				columns: [mockColumn],
			} as unknown as SortChangedEvent;

			onSortChanged(event, colDefs);

			expect(currentSortBy.value).toBe('name');
			expect(currentSortOrder.value).toBe('desc');
		});
	});
});
