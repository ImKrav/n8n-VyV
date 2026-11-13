/**
 * CR-03 · Credenciales OAuth2 — scopes mostrados (prueba nueva para n8n 2.47).
 * La prueba original (ScopesNotice.test.ts) solo existe en n8n 2.48; en 2.47 el
 * componente muestra un N8nNotice que se expande con la lista de scopes.
 *
 * Dobles de prueba:
 * - Stub  store de credenciales (createTestingPinia): un tipo OAuth2 con nombre fijo.
 */
import { createComponentRenderer } from '@/__tests__/render';
import ScopesNotice from '@/features/credentials/components/ScopesNotice.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(ScopesNotice);

describe('CP-CR-03-04 · Scopes mostrados coinciden con los solicitados', () => {
	beforeEach(() => {
		createTestingPinia();
		useCredentialsStore().state.credentialTypes = {
			testOAuth2Api: { name: 'testOAuth2Api', displayName: 'Test OAuth2 API', properties: [] },
		};
	});

	it.each([
		{ scopes: ['read:items'], summary: '1 scope available for Test credentials' },
		{ scopes: ['read:items', 'write:items'], summary: '2 scopes available for Test credentials' },
	])('resume $scopes.length scope(s) para el tipo de credencial', ({ scopes, summary }) => {
		// Arrange / Act
		const { container } = renderComponent({
			props: { activeCredentialType: 'testOAuth2Api', scopes },
		});

		// Assert
		expect(container).toHaveTextContent(summary);
	});

	it('al expandir muestra cada scope solicitado (la última parte de una URL de scope)', async () => {
		// Arrange
		const scopes = ['https://www.googleapis.com/auth/drive.readonly', 'read:items'];
		const { container } = renderComponent({
			props: { activeCredentialType: 'testOAuth2Api', scopes },
		});

		// Act
		await userEvent.click(container.querySelector('a[data-key="toggle-expand"]')!);

		// Assert
		expect(container).toHaveTextContent('drive.readonly');
		expect(container).toHaveTextContent('read:items');
		expect(container).not.toHaveTextContent('https://www.googleapis.com/auth/');
	});
});
