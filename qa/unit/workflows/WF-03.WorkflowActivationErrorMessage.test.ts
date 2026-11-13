/**
 * WF-03 · Mensajes de error de activación.
 * Hueco: `WorkflowActivationErrorMessage.vue` no tenía prueba en el repo.
 * (Publicar y conflicto de webhook: `WorkflowPublishModal.test.ts` y
 * `WorkflowActivationConflictingWebhookModal.test.ts`, reutilizadas.)
 *
 * Sin dobles: el componente solo depende de i18n real.
 */
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowActivationErrorMessage from '@/features/workflows/components/WorkflowActivationErrorMessage.vue';
import { i18n } from '@n8n/i18n';

const renderComponent = createComponentRenderer(WorkflowActivationErrorMessage);

describe('WF-03 WorkflowActivationErrorMessage', () => {
	it('muestra el texto genérico de error y el detalle devuelto por el servidor', () => {
		// Arrange
		const message = 'There was a problem activating the workflow: missing trigger';
		const genericText = i18n.baseText(
			'workflowActivator.showMessage.displayActivationError.message.errorDataNotUndefined',
		);

		// Act
		const { container, getByText } = renderComponent({ props: { message } });

		// Assert
		expect(container).toHaveTextContent(genericText);
		expect(getByText(message).tagName).toBe('I');
	});

	it('escapa el HTML del mensaje del servidor en lugar de interpretarlo', () => {
		// Arrange
		const message = '<b>bold</b>';

		// Act
		const { container } = renderComponent({ props: { message } });

		// Assert
		expect(container.querySelector('b')).toBeNull();
		expect(container).toHaveTextContent('<b>bold</b>');
	});
});
