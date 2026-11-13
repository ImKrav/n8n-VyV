/**
 * CO-01 · Crear data table y columnas — store (renombrar y eliminar columnas).
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

describe('CP-CO-01-08 · Renombrar y eliminar una columna con datos', () => {
	describe('deleteDataTableColumn', () => {
		it('should delete column from data table', async () => {
			const dataTableId = faker.string.alphanumeric(10);
			const columnId = 'phone';
			const projectId = 'p1';
			dataTableStore.$patch({
				dataTables: [
					{ id: dataTableId, columns: [{ id: columnId, index: 0, name: 'phone', type: 'string' }] },
				],
				totalCount: 1,
			});
			vi.spyOn(dataTableApi, 'deleteDataTableColumnApi').mockResolvedValue(true);

			const deleted = await dataTableStore.deleteDataTableColumn(dataTableId, projectId, columnId);

			expect(deleted).toBe(true);
			expect(dataTableApi.deleteDataTableColumnApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				dataTableId,
				projectId,
				columnId,
			);
			expect(dataTableStore.dataTables[0].columns.find((c) => c.id === columnId)).toBeUndefined();
		});
	});

	describe('renameDataTableColumn', () => {
		it('should rename column in data table', async () => {
			const dataTableId = faker.string.alphanumeric(10);
			const columnId = 'col-1';
			const projectId = 'p1';
			const newName = 'renamedColumn';

			dataTableStore.$patch({
				dataTables: [
					{
						id: dataTableId,
						name: 'Test Table',
						sizeBytes: 0,
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
						projectId,
						columns: [
							{ id: columnId, index: 0, name: 'oldName', type: 'string' },
							{ id: 'col-2', index: 1, name: 'otherColumn', type: 'number' },
						],
					},
				],
			});

			vi.spyOn(dataTableApi, 'renameDataTableColumnApi').mockResolvedValue({
				id: columnId,
				index: 0,
				name: newName,
				type: 'string',
			});

			await dataTableStore.renameDataTableColumn(dataTableId, projectId, columnId, newName);

			expect(dataTableApi.renameDataTableColumnApi).toHaveBeenCalledWith(
				rootStore.restApiContext,
				dataTableId,
				projectId,
				columnId,
				newName,
			);

			const updatedColumn = dataTableStore.dataTables[0].columns.find((c) => c.id === columnId);
			expect(updatedColumn?.name).toBe(newName);
		});
	});
});
