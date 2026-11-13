/**
 * CO-05 · Mover y eliminar carpetas — carpetas disponibles como destino.
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

describe('CP-CO-05-04 · Impedir mover una carpeta dentro de sí misma o de una hija', () => {
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

		it('should fetch folders in a single page, empty filter', async () => {
			const folder = createFolder();
			vi.spyOn(foldersApi, 'getProjectFolders').mockResolvedValue({
				count: 1,
				data: [folder],
			});

			const available = await foldersStore.fetchFoldersAvailableForMove(projectId, folderId);
			expect(available).toEqual([{ ...folder, resource: 'folder' }]);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledTimes(1);
			expect(foldersApi.getProjectFolders).toHaveBeenCalledWith(
				rootStore.restApiContext,
				projectId,
				{
					skip: 0,
					take: 100,
					sortBy: 'updatedAt:desc',
				},
				{
					excludeFolderIdAndDescendants: folderId,
				},
				selectFields,
			);
		});
	});
});
