/**
 * CO-02 · Edición de filas — filtrar por columna.
 * Origen: packages/frontend/editor-ui/src/features/core/dataTable/composables/useDataTableColumnFilters.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { GridApi, ColDef } from 'ag-grid-community';
import { jsonParse } from 'n8n-workflow';
import { useDataTableColumnFilters } from '@/features/core/dataTable/composables/useDataTableColumnFilters';
import type {
	FilterModel,
	BackendFilter,
} from '@/features/core/dataTable/types/dataTableFilters.types';

// Setup of describe('useDataTableColumnFilters', (original top-level describe)
let mockGridApi: Partial<GridApi>;
let gridApiRef: Ref<GridApi>;
let colDefsRef: Ref<ColDef[]>;

const parseFilterJSON = (json: string | undefined): BackendFilter | undefined => {
	if (!json) return undefined;
	return jsonParse<BackendFilter>(json);
};

beforeEach(() => {
	mockGridApi = {
		getFilterModel: vi.fn().mockReturnValue({}),
	};
	gridApiRef = ref(mockGridApi as GridApi);
	colDefsRef = ref([
		{ field: 'name', colId: 'name' },
		{ field: 'age', colId: 'age' },
		{ field: 'createdAt', colId: 'createdAt' },
	]);
});

describe('CP-CO-02-07 · Filtrar por columna', () => {
	describe('text filters', () => {
		it('should process contains filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result).toEqual({
				type: 'and',
				filters: [{ columnName: 'name', condition: 'ilike', value: 'test' }],
			});
		});
	});

	describe('multiple filters', () => {
		it('should process multiple filters from different columns', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'john' },
				age: { filterType: 'number', type: 'greaterThan', filter: 25 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.type).toBe('and');
			expect(result?.filters).toHaveLength(2);
			expect(result?.filters).toContainEqual({
				columnName: 'name',
				condition: 'ilike',
				value: 'john',
			});
			expect(result?.filters).toContainEqual({ columnName: 'age', condition: 'gt', value: 25 });
		});
	});
});
