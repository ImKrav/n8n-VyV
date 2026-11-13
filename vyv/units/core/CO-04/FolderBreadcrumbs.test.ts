/**
 * CO-04 · Crear y navegar carpetas — migas de pan.
 * Origen: packages/frontend/editor-ui/src/features/core/folders/components/FolderBreadcrumbs.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import type { UserAction } from '@/Interface';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import FolderBreadcrumbs from '@/features/core/folders/components/FolderBreadcrumbs.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useRoute } from 'vue-router';
import type { Mock } from 'vitest';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes, type Project } from '@/features/collaboration/projects/projects.types';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import type { IUser } from 'n8n-workflow';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: vi.fn().mockReturnValue({}),
	useRouter: vi.fn(() => ({
		replace: vi.fn(),
	})),
}));

const TEST_PROJECT: Project = {
	id: '1',
	name: 'Test Project',
	icon: { type: 'icon', value: 'folder' },
	type: ProjectTypes.Personal,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	relations: [],
	scopes: [],
	rolesManaged: false,
};

const TEST_FOLDER: FolderShortInfo = {
	id: '1',
	name: 'Test Folder',
};

const TEST_FOLDER_CHILD: FolderShortInfo = {
	id: '2',
	name: 'Test Folder Child',
	parentFolder: TEST_FOLDER.id,
};

const TEST_ACTIONS: Array<UserAction<IUser>> = [
	{ label: 'Action 1', value: 'action1', disabled: false },
	{ label: 'Action 2', value: 'action2', disabled: true },
];

const renderComponent = createComponentRenderer(FolderBreadcrumbs, {});

// Setup of describe('FolderBreadcrumbs', (original top-level describe)
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let foldersStore: ReturnType<typeof mockedStore<typeof useFoldersStore>>;

beforeEach(() => {
	setActivePinia(createTestingPinia());
	projectsStore = mockedStore(useProjectsStore);
	foldersStore = mockedStore(useFoldersStore);
	(useRoute as Mock).mockReturnValue({
		query: { projectId: TEST_PROJECT.id },
	});
	projectsStore.currentProject = TEST_PROJECT;
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-CO-04-02 · Anidar carpetas en varios niveles', () => {
	it('should render 2 levels of breadcrumbs', () => {
		foldersStore.getCachedFolder.mockReturnValue(TEST_FOLDER);

		const { getByTestId, queryAllByTestId, queryByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER_CHILD,
				visibleLevels: 2,
			},
		});
		// Now, parent folder should also be visible
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(queryAllByTestId('breadcrumbs-item')).toHaveLength(2);
		expect(queryByTestId('ellipsis')).not.toBeInTheDocument();
	});
});

describe('CP-CO-04-05 · Navegar con las migas de pan', () => {
	it('should render folder breadcrumbs with actions', () => {
		const { getByTestId } = renderComponent({
			props: {
				currentFolder: TEST_FOLDER,
				actions: TEST_ACTIONS,
			},
		});
		expect(getByTestId('folder-breadcrumbs')).toBeVisible();
		expect(getByTestId('home-project')).toBeVisible();
		expect(getByTestId('breadcrumbs-item')).toBeVisible();
		expect(getByTestId('folder-breadcrumbs-actions')).toBeVisible();
	});
});
