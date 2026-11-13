/**
 * CO-05 · Mover y eliminar carpetas — no se puede soltar una carpeta sobre sí misma.
 * Origen: packages/frontend/editor-ui/src/features/core/folders/composables/useFolders.test.ts
 */
import { describe, it, expect } from 'vitest';
import { useFolders } from '@/features/core/folders/composables/useFolders';
import { FOLDER_NAME_MAX_LENGTH } from '@/features/core/folders/folders.constants';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const mockFoldersStore = {
	draggedElement: null as { type: string; id: string; name: string } | null,
	activeDropTarget: null as { type: string; id: string; name: string } | null,
};

vi.mock('@/features/core/folders/folders.store', () => ({
	useFoldersStore: vi.fn(() => mockFoldersStore),
}));

// Setup of describe('useFolders', (original top-level describe)
beforeEach(() => {
	setActivePinia(createTestingPinia());
	mockFoldersStore.draggedElement = null;
	mockFoldersStore.activeDropTarget = null;
	document.body.classList.remove('dragging-resource');
});

afterEach(() => {
	vi.clearAllMocks();
});

const { validateFolderName, onDragStart, onDragEnd, handleDrop } = useFolders();

describe('CP-CO-05-04 · Impedir mover una carpeta dentro de sí misma o de una hija', () => {
	describe('handleDrop', () => {
		it('should not allow dropping a folder onto itself', () => {
			const element = document.createElement('div');
			element.setAttribute('data-target', 'folder');
			element.setAttribute('data-resourceid', 'folder-123');
			element.setAttribute('data-resourcename', 'Test');
			document.body.appendChild(element);

			document.body.classList.add('dragging-resource');
			mockFoldersStore.draggedElement = { type: 'folder', id: 'folder-123', name: 'Test' };
			mockFoldersStore.activeDropTarget = { type: 'folder', id: 'folder-123', name: 'Test' };

			const result = handleDrop({
				target: element,
				preventDefault: vi.fn(),
			} as unknown as MouseEvent);

			expect(result).to.deep.equal({});

			document.body.removeChild(element);
		});
	});
});
