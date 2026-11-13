/**
 * CR-02 · Eliminar credencial con confirmación por texto escrito.
 * Hueco: `TypeToConfirmDialog.vue` no tenía prueba en el repo.
 * (`CredentialEdit.test.ts`, reutilizada, cubre editar y renombrar.)
 *
 * Doble de prueba: Spy — los eventos emitidos se leen con `emitted()`.
 */
import { createComponentRenderer } from '@/__tests__/render';
import TypeToConfirmDialog from '@/features/credentials/components/CredentialEdit/TypeToConfirmDialog.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

const baseProps = {
	open: true,
	title: 'Delete credential',
	message: 'This action cannot be undone.',
	confirmLabel: 'Delete',
	confirmKeyword: 'delete',
};

const renderDialog = createComponentRenderer(TypeToConfirmDialog, { props: baseProps });

const setup = (props: Partial<typeof baseProps & { loading: boolean }> = {}) => {
	const result = renderDialog({ pinia: createTestingPinia(), props });
	return {
		...result,
		// N8nDialog renders into an async portal, so the queries must wait for it.
		input: async () => {
			const field = await result.findByTestId('credential-type-to-confirm-input');
			return field instanceof HTMLInputElement ? field : field.querySelector('input')!;
		},
		confirmButton: async () => await result.findByTestId('credential-type-to-confirm-button'),
	};
};

describe('CR-02 TypeToConfirmDialog', () => {
	it('deshabilita el botón de confirmar mientras no se escribe la palabra clave', async () => {
		// Arrange / Act
		const { confirmButton } = setup();

		// Assert
		expect(await confirmButton()).toBeDisabled();
	});

	it('mantiene el botón deshabilitado con una palabra distinta', async () => {
		// Arrange
		const { input, confirmButton } = setup();

		// Act
		await userEvent.type(await input(), 'DELETE');

		// Assert
		expect(await confirmButton()).toBeDisabled();
	});

	it('emite «confirm» al escribir la palabra exacta (con espacios alrededor) y pulsar el botón', async () => {
		// Arrange
		const { input, confirmButton, emitted } = setup();

		// Act
		await userEvent.type(await input(), '  delete  ');
		await userEvent.click(await confirmButton());

		// Assert
		expect(await confirmButton()).toBeEnabled();
		expect(emitted()).toHaveProperty('confirm');
		expect(emitted('confirm')).toHaveLength(1);
	});

	it('confirma también con la tecla Enter', async () => {
		// Arrange
		const { input, emitted } = setup();

		// Act
		await userEvent.type(await input(), 'delete{Enter}');

		// Assert
		expect(emitted('confirm')).toHaveLength(1);
	});

	it('no emite «confirm» mientras está cargando', async () => {
		// Arrange
		const { input, emitted } = setup({ loading: true });

		// Act
		await userEvent.type(await input(), 'delete{Enter}');

		// Assert
		expect(emitted()).not.toHaveProperty('confirm');
	});

	it('pide cerrar el diálogo al cancelar', async () => {
		// Arrange
		const { findByTestId, emitted } = setup();

		// Act
		await userEvent.click(await findByTestId('credential-type-to-confirm-cancel'));

		// Assert
		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted()).not.toHaveProperty('confirm');
	});
});
