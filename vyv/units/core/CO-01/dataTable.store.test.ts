/**
 * CO-01 · Crear data table y columnas — store (crear tabla).
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

describe('CP-CO-01-01 · Crear data table con nombre válido', () => {
	describe('createDataTable', () => {
		it('should create data table and update state', async () => {
			const mockTable = createTable({ id: 'dt-1', name: 'New Table' });
			vi.spyOn(dataTableApi, 'createDataTableApi').mockResolvedValue(mockTable);

			const result = await dataTableStore.createDataTable('New Table', 'p1');

			expect(dataTableApi.createDataTableApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'New Table',
				'p1',
				undefined,
				undefined,
				true,
			);
			expect(dataTableStore.dataTables[0]).toEqual(mockTable);
			expect(dataTableStore.totalCount).toBe(1);
			expect(result).toBe(mockTable);
		});
	});
});
