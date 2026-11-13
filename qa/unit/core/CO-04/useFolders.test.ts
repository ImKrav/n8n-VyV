/**
 * CO-04 · Crear y navegar carpetas — validar nombres de carpeta.
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

describe('CP-CO-04-03 · Nombre vacío o duplicado en el mismo nivel', () => {
	describe('validateFolderName', () => {
		it('should reject folder names longer than the maximum length', () => {
			const longName = 'a'.repeat(FOLDER_NAME_MAX_LENGTH + 1);
			const result = validateFolderName(longName);
			expect(result).toBe(`Folder name cannot be longer than ${FOLDER_NAME_MAX_LENGTH} characters`);
		});
	});

	describe('validateFolderName', () => {
		describe('Edge cases', () => {
			it('should handle empty string input', () => {
				// Decide on your desired behavior for empty strings
				// This is implementation-dependent - modify as needed
				const result = validateFolderName('');
				expect(typeof result).toBe('string'); // Expecting an error message
			});
		});
	});
});
