/**
 * CR-01 · Crear credencial — campos obligatorios.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialInputs.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import {
	CREDENTIAL_BLANKING_VALUE,
	type INodeProperties,
	type INodeListSearchResult,
} from 'n8n-workflow';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { getCredentialOptions } from '@/features/credentials/credentials.api';

vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getCredentialOptions: vi.fn(),
}));

const renderComponent = createComponentRenderer(CredentialInputs);

// Setup of describe('compact CredentialInputs', (original top-level describe)
beforeEach(() => setActivePinia(createTestingPinia()));

describe('CP-CR-01-02 · Campo obligatorio vacío', () => {
	it('preserves multiline private keys and validates required fields only after submission', async () => {
		const rendered = renderComponent({
			props: {
				compact: true,
				credentialData: { privateKey: '' },
				documentationUrl: '',
				credentialProperties: [
					{
						name: 'privateKey',
						displayName: 'Private key',
						type: 'string',
						required: true,
						default: '',
						typeOptions: { rows: 4, password: true },
					},
				],
			},
		});
		const input = rendered.getByLabelText('Private key');
		expect(input.tagName).toBe('TEXTAREA');
		expect(input).toHaveAttribute('rows', '4');
		expect(rendered.queryByRole('alert')).toBeNull();
		await fireEvent.blur(input);
		expect(rendered.queryByRole('alert')).toBeNull();
		await rendered.rerender({ showValidationWarnings: true });
		expect(rendered.getByRole('alert')).toHaveTextContent('This field is required');
		const key = '-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----';
		await fireEvent.update(input, key);
		expect(rendered.emitted('update')).toContainEqual([{ name: 'privateKey', value: key }]);
		await rendered.rerender({ credentialData: { privateKey: key } });
		expect(rendered.queryByRole('alert')).toBeNull();
		expect(input).toHaveValue(key);
	});
});
