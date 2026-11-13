/**
 * CR-02 · Editar, renombrar y eliminar — secretos enmascarados al reabrir.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/TemplatedAuthSimpleView.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import TemplatedAuthSimpleView from '@/features/credentials/components/CredentialEdit/TemplatedAuthSimpleView.vue';

// ParameterInputExpanded transitively derives the workflow id from the route
// (focus panel store); these tests run without a router.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

// ParameterInputExpanded pulls real stores (ui, settings, workflows fallback
// for the document-store inject), so the renderer needs an active pinia.
const pinia = createTestingPinia({ stubActions: false });
setActivePinia(pinia);

const renderComponent = createComponentRenderer(TemplatedAuthSimpleView, { pinia });

const credentialData = (overrides: Record<string, string> = {}) => ({
	template: JSON.stringify({
		headers: { Authorization: 'Key {{api_key}}', 'api-version': '{{api_version}}' },
	}),
	placeholderDefs: JSON.stringify([
		{ name: 'api_key', title: 'fal.ai API key', info: 'Dashboard → Keys', type: 'password' },
		{ name: 'api_version', title: 'API version', type: 'plain' },
	]),
	placeholderValues: JSON.stringify({ api_key: '***', api_version: '202404' }),
	...overrides,
});

// Setup of describe('TemplatedAuthSimpleView', (original top-level describe)

describe('CP-CR-02-02 · Secretos no visibles al reabrir', () => {
	it('displays the stored redacted sentinel as a full-length mask, like native credential fields', async () => {
		const { getAllByTestId } = renderComponent({
			props: { credentialData: credentialData() },
		});

		// the 3-char `***` sentinel renders as the same blanking value native
		// fields use, so a redacted secret doesn't show as three dots
		const [apiKey] = getAllByTestId('templated-auth-value-input');
		await waitFor(() =>
			expect(apiKey.querySelector('input') ?? apiKey).toHaveValue(CREDENTIAL_BLANKING_VALUE),
		);
	});

	it('keeps the untouched `***` sentinel — not the display mask — when composing', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				// api_key is stored redacted; api_version has no stored value yet
				credentialData: credentialData({
					placeholderValues: JSON.stringify({ api_key: '***' }),
				}),
			},
		});

		// edit the plain field; the untouched redacted field must round-trip `***`
		// so the server merges back the stored secret
		const apiVersionEl = getAllByTestId('templated-auth-value-input')[1];
		const input = apiVersionEl.querySelector('input') ?? apiVersionEl;
		await userEvent.type(input, '202501');

		await waitFor(() => {
			const updates = emitted<[{ name: string; value: string }]>('update');
			expect(updates).toBeTruthy();
			const last = updates[updates.length - 1][0];
			expect(JSON.parse(last.value)).toEqual({ api_key: '***', api_version: '202501' });
		});
	});
});
