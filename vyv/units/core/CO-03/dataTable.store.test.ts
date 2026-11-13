/**
 * CO-03 · Importar y exportar CSV — store (crear tabla desde CSV).
 * Origen: packages/frontend/editor-ui/src/features/core/dataTable/dataTable.store.test.ts
 */
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { faker } from '@faker-js/faker';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createPinia, setActivePinia } from 'pinia';
import * as dataTableApi from '@/features/core/dataTable/dataTable.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { hasPermission } from '@/app/utils/rbac/permissions';

vi.mock('@/features/collaboration/projects/projects.store');
vi.mock('@n8n/stores/settings.store');
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => true) }));

function createTable(data: Partial<DataTable>) {
	return {
		id: faker.string.alphanumeric(10),
		name: faker.lorem.word(),
		columns: [],
		sizeBytes: 0,
		createdAt: '2021-01-01',
		updatedAt: '2021-01-01',
		projectId: 'project-1',
		projectName: 'Project',
		...data,
	};
}

// Setup of describe('dataTable.store', (original top-level describe)
let dataTableStore: ReturnType<typeof useDataTableStore>;
let rootStore: ReturnType<typeof useRootStore>;

beforeEach(() => {
	setActivePinia(createPinia());

	vi.mocked(useSettingsStore).mockReturnValue({
		settings: {
			dataTables: {
				maxSize: 10485760, // 10MB in bytes
			},
		},
	} as ReturnType<typeof useSettingsStore>);

	vi.mocked(useProjectsStore).mockReturnValue({
		fetchProject: vi.fn(),
	} as unknown as ReturnType<typeof useProjectsStore>);

	rootStore = useRootStore();
	dataTableStore = useDataTableStore();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('CP-CO-03-01 · Importar un CSV válido', () => {
	describe('createDataTable', () => {
		it('should create data table with CSV import parameters', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'Imported Table' });
			const columns = [
				{ name: 'col1', type: 'string' as const },
				{ name: 'col2', type: 'number' as const },
			];
			const fileId = 'file123';
			vi.spyOn(dataTableApi, 'createDataTableApi').mockResolvedValue(mockTable);

			const result = await dataTableStore.createDataTable(
				'Imported Table',
				'p1',
				columns,
				fileId,
				false,
			);

			expect(dataTableApi.createDataTableApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'Imported Table',
				'p1',
				columns,
				fileId,
				false,
			);
			expect(dataTableStore.dataTables[0]).toEqual(mockTable);
			expect(result).toBe(mockTable);
		});
	});
});
