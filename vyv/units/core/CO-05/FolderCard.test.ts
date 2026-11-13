/**
 * CO-05 · Mover y eliminar carpetas — acción «Delete» de la tarjeta.
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

describe('CP-CO-05-05 · Eliminar una carpeta vacía', () => {
	it('should emit action event when action is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		const actionButton = getByTestId('folder-card-actions').querySelector('[role=button]');
		if (!actionButton) {
			throw new Error('Action button not found');
		}
		await userEvent.click(actionButton);
		const actionToggleId = actionButton.getAttribute('aria-controls');
		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		expect(actionDropdown).toBeInTheDocument();
		const deleteAction = getByTestId('action-delete');
		expect(deleteAction).toBeInTheDocument();
		await userEvent.click(deleteAction);
		expect(emitted('action')).toEqual([[{ action: 'delete', folderId: '1' }]]);
	});
});
