/**
 * CR-03 · Credenciales OAuth2 — scopes mostrados.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/ScopesNotice.test.ts (archivo movido completo: sus dos pruebas son de este caso)
 */
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ScopesNotice from '@/features/credentials/components/ScopesNotice.vue';

const renderComponent = createComponentRenderer(ScopesNotice);

describe('CP-CR-03-04 · Scopes mostrados coinciden con los solicitados', () => {
	describe.each([
		{ scopeCount: '1 scope', scopes: ['read:items'] },
		{ scopeCount: '2 scopes', scopes: ['read:items', 'write:items'] },
	])('ScopesNotice ($scopeCount)', ({ scopeCount, scopes }) => {
		beforeEach(() => {
			createTestingPinia();
			useCredentialsStore().state.credentialTypes = {
				testOAuth2Api: {
					name: 'testOAuth2Api',
					displayName: 'Test OAuth2 API',
					properties: [],
				},
			};
		});

		it('reveals the available scopes when clicking the scope count', async () => {
			const { getByText, getByRole } = renderComponent({
				props: {
					activeCredentialType: 'testOAuth2Api',
					scopes,
				},
			});

			expect(getByRole('region')).not.toHaveTextContent('read:items');
			expect(getByRole('region')).not.toHaveTextContent('write:items');

			await userEvent.click(getByText(scopeCount, { exact: false }));

			for (const scope of scopes) {
				expect(getByRole('region')).toHaveTextContent(scope);
			}
			expect(getByText('Show less')).toBeVisible();

			await userEvent.click(getByText('Show less'));

			for (const scope of scopes) {
				expect(getByRole('region')).not.toHaveTextContent(scope);
			}
			expect(getByText(`${scopeCount} available`)).toBeVisible();
		});

		// NODE-5622: Users expect the "scopes available" control to reveal the scope list.
		it('reveals the available scopes when clicking the available label', async () => {
			const { getByText, getByRole } = renderComponent({
				props: {
					activeCredentialType: 'testOAuth2Api',
					scopes,
				},
			});

			expect(getByRole('region')).not.toHaveTextContent('read:items');
			expect(getByRole('region')).not.toHaveTextContent('write:items');

			await userEvent.click(getByText(/available/));

			for (const scope of scopes) {
				expect(getByRole('region')).toHaveTextContent(scope);
			}
			expect(getByText('Show less')).toBeVisible();

			await userEvent.click(getByText(/available/));

			for (const scope of scopes) {
				expect(getByRole('region')).not.toHaveTextContent(scope);
			}
			expect(getByText(`${scopeCount} available`)).toBeVisible();
		});
	});
});
