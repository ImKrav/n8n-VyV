/**
 * CO-04 · Crear y navegar carpetas — tarjeta de carpeta.
 * Origen: packages/frontend/editor-ui/src/features/core/folders/components/FolderCard.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { useRouter } from 'vue-router';
import FolderCard from '@/features/core/folders/components/FolderCard.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { FolderResource, UserAction } from '@/Interface';
import type { IUser } from 'n8n-workflow';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/folders/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',

				folderId: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const DEFAULT_FOLDER: FolderResource = {
	id: '1',
	name: 'Folder 1',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'folder',
	workflowCount: 2,
	subFolderCount: 2,
	homeProject: {
		id: '1',
		name: 'Project 1',
		icon: null,
		type: 'personal',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
} as const satisfies FolderResource;

const renderComponent = createComponentRenderer(FolderCard, {
	props: {
		data: DEFAULT_FOLDER,
		actions: [
			{ label: 'Open', value: 'open', disabled: false },
			{ label: 'Delete', value: 'delete', disabled: false },
		] as const satisfies Array<UserAction<IUser>>,
	},
	global: {
		stubs: {
			RouterLink: {
				template: '<div data-test-id="folder-card-link"><slot /></div>',
			},
		},
	},
});

// Setup of describe('FolderCard', (original top-level describe)
let pinia: ReturnType<typeof createPinia>;

beforeEach(async () => {
	pinia = createPinia();
	setActivePinia(pinia);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-CO-04-05 · Navegar con las migas de pan', () => {
	describe('navigation base-path handling', () => {
		const FOLDER_PATH = '/projects/1/folders/1';

		const openFolder = async (getByTestId: (id: string) => HTMLElement) => {
			const actionButton = getByTestId('folder-card-actions').querySelector('[role=button]');
			if (!actionButton) {
				throw new Error('Action button not found');
			}
			await userEvent.click(actionButton);
			await userEvent.click(getByTestId('action-open'));
		};

		const breadcrumbRenderOptions = () => ({
			props: {
				showOwnershipBadge: true,
				readOnly: false,
				data: {
					...DEFAULT_FOLDER,
					parentFolder: { id: '2', name: 'Parent folder', parentFolderId: null },
				} as FolderResource,
			},
			global: {
				stubs: {
					ProjectCardBadge: { template: '<div><slot /></div>' },
					N8nBreadcrumbs: { props: ['items'], template: '<div>{{ items[0]?.href }}</div>' },
				},
			},
		});

		beforeEach(() => {
			(useRouter().resolve as unknown as Mock).mockReturnValue({
				href: FOLDER_PATH,
				fullPath: FOLDER_PATH,
			});
		});

		it('renders the parent-folder breadcrumb link', () => {
			const { getByTestId } = renderComponent(breadcrumbRenderOptions());

			expect(getByTestId('folder-card-breadcrumbs').textContent).toBe(FOLDER_PATH);
		});
	});
});
