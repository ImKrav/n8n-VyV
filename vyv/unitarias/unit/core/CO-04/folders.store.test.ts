/**
 * CO-04 · Crear y navegar carpetas — store de carpetas.
 * Origen: packages/frontend/editor-ui/src/features/core/folders/folders.store.test.ts
 */
import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { faker } from '@faker-js/faker';

import { useFoldersStore } from '@/features/core/folders/folders.store';
import * as foldersApi from '@/features/core/folders/folders.api';
import * as workflowsEEApi from '@/app/api/workflows.ee';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';
import { useRootStore } from '@n8n/stores/useRootStore';

const createFolder = (
	overrides: Partial<ChangeLocationSearchResponseItem> = {},
): ChangeLocationSearchResponseItem => ({
	createdAt: faker.date.recent().toISOString(),
	updatedAt: faker.date.recent().toISOString(),
	id: faker.string.alphanumeric(10),
	name: faker.lorem.words(3),
	tags: [],
	parentFolder: {
		id: faker.string.alphanumeric(10),
		name: faker.lorem.words(2),
		parentFolderId: null,
	},
	workflowCount: 2,
	subFolderCount: 2,
	path: [faker.lorem.word(), faker.lorem.word()],
	...overrides,
});

// Setup of describe('folders.store', (original top-level describe)
let foldersStore: ReturnType<typeof useFoldersStore>;
let rootStore: ReturnType<typeof useRootStore>;

beforeEach(() => {
	vi.restoreAllMocks();
	setActivePinia(createPinia());
	rootStore = useRootStore();
	foldersStore = useFoldersStore();
});

describe('CP-CO-04-02 · Anidar carpetas en varios niveles', () => {
	describe('fetchFoldersAvailableForMove', () => {
		const projectId = faker.string.alphanumeric(10);
		const folderId = faker.string.alphanumeric(10);
		const selectFields = [
			'id',
			'name',
			'createdAt',
			'updatedAt',
			'project',
			'tags',
			'parentFolder',
			'workflowCount',
			'subFolderCount',
			'path',
		];

		it('should cache the results on breadcrumbs cache', async () => {
			const folder = createFolder();
			vi.spyOn(foldersApi, 'getProjectFolders').mockResolvedValue({
				count: 1,
				data: [folder],
			});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId);
			expect(available).toEqual([{ ...folder, resource: 'folder' }]);
			expect(foldersStore.breadcrumbsCache).toEqual({
				[folder.id]: {
					id: folder.id,
					name: folder.name,
					parentFolder: folder.parentFolder?.id,
				},
			});
		});
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

describe('CP-CO-04-04 · Renombrar una carpeta', () => {
	it('envía el nombre nuevo de la carpeta a la API del proyecto', async () => {
		// Arrange
		const renameSpy = vi.spyOn(foldersApi, 'renameFolder').mockResolvedValue(undefined);

		// Act
		await foldersStore.renameFolder('project-1', 'folder-1', 'Facturas 2026');

		// Assert
		expect(renameSpy).toHaveBeenCalledExactlyOnceWith(
			rootStore.restApiContext,
			'project-1',
			'folder-1',
			'Facturas 2026',
		);
	});

	it('propaga el error de la API (por ejemplo, nombre duplicado en el mismo nivel)', async () => {
		// Arrange
		vi.spyOn(foldersApi, 'renameFolder').mockRejectedValue(new Error('Folder name already exists'));

		// Act / Assert
		await expect(foldersStore.renameFolder('project-1', 'folder-1', 'Duplicada')).rejects.toThrow(
			'Folder name already exists',
		);
	});
});

describe('CP-CO-04-01 · Crear carpeta en la raíz', () => {
	it('crea la carpeta en la raíz del proyecto cuando no hay carpeta padre', async () => {
		// Arrange
		const createSpy = vi
			.spyOn(foldersApi, 'createFolder')
			.mockResolvedValue({ id: 'new-folder', name: 'Raíz' } as Awaited<
				ReturnType<typeof foldersApi.createFolder>
			>);

		// Act
		const created = await foldersStore.createFolder('Raíz', 'project-1');

		// Assert
		expect(created).toMatchObject({ id: 'new-folder', name: 'Raíz' });
		expect(createSpy).toHaveBeenCalledWith(
			rootStore.restApiContext,
			'project-1',
			'Raíz',
			undefined,
		);
	});

	it('crea una subcarpeta dentro de la carpeta padre indicada', async () => {
		// Arrange
		const createSpy = vi
			.spyOn(foldersApi, 'createFolder')
			.mockResolvedValue({ id: 'child', name: 'Hija' } as Awaited<
				ReturnType<typeof foldersApi.createFolder>
			>);

		// Act
		await foldersStore.createFolder('Hija', 'project-1', 'parent-1');

		// Assert
		expect(createSpy).toHaveBeenCalledWith(
			rootStore.restApiContext,
			'project-1',
			'Hija',
			'parent-1',
		);
	});
});
