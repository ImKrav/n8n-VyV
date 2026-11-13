/**
 * CR-04 · Uso desde un nodo — solo credenciales compatibles.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialPicker/CredentialPicker.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { createTestingPinia } from '@pinia/testing';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import {
	PERSONAL_OPENAI_CREDENTIAL,
	PROJECT_OPENAI_CREDENTIAL,
	GLOBAL_OPENAI_CREDENTIAL,
	TEST_CREDENTIAL_TYPES,
	TEST_CREDENTIALS,
} from '@/features/credentials/components/CredentialPicker/CredentialPicker.test.constants';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: 'https://test.com' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

const renderComponent = createComponentRenderer(CredentialPicker);

// Setup of describe('CredentialPicker', (original top-level describe)
beforeEach(() => {
	createTestingPinia();
	credentialsStore = mockedStore(useCredentialsStore);
	credentialsStore.state.credentials = TEST_CREDENTIALS;
	credentialsStore.state.credentialTypes = TEST_CREDENTIAL_TYPES;
	mockedStore(useProjectsStore).currentProject = createTestProject({
		scopes: ['credential:create', 'credential:update'],
	});
	uiStore = mockedStore(useUIStore);
});

describe('CP-CR-04-02 · Solo se listan credenciales compatibles', () => {
	it('should render all credentials of the specified type', async () => {
		const TEST_APP_NAME = 'OpenAI';
		const TEST_CREDENTIAL_TYPE = 'openAiApi';
		const { getByTestId } = renderComponent({
			props: {
				appName: TEST_APP_NAME,
				credentialType: TEST_CREDENTIAL_TYPE,
				selectedCredentialId: null,
			},
		});
		expect(getByTestId('credential-dropdown')).toBeInTheDocument();
		expect(getByTestId('credential-dropdown')).toHaveAttribute(
			'credential-type',
			TEST_CREDENTIAL_TYPE,
		);
		// Open the dropdown
		await userEvent.click(getByTestId('credential-dropdown'));
		// Personal openAI credential should be in the dropdown
		expect(
			screen.getByTestId(`node-credentials-select-item-${PERSONAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// OpenAI credential that belong to other project should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${PROJECT_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// Global OpenAI credential should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${GLOBAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
	});

	it('should only render personal credentials of the specified type', async () => {
		const TEST_APP_NAME = 'OpenAI';
		const TEST_CREDENTIAL_TYPE = 'openAiApi';
		const { getByTestId } = renderComponent({
			props: {
				personalOnly: true,
				appName: TEST_APP_NAME,
				credentialType: TEST_CREDENTIAL_TYPE,
				selectedCredentialId: null,
			},
		});
		expect(getByTestId('credential-dropdown')).toBeInTheDocument();
		expect(getByTestId('credential-dropdown')).toHaveAttribute(
			'credential-type',
			TEST_CREDENTIAL_TYPE,
		);
		// Open the dropdown
		await userEvent.click(getByTestId('credential-dropdown'));
		// Personal openAI credential should be in the dropdown
		expect(
			screen.getByTestId(`node-credentials-select-item-${PERSONAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
		// OpenAI credential that belong to other project should not be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${PROJECT_OPENAI_CREDENTIAL.id}`),
		).not.toBeInTheDocument();
		// Global OpenAI credential should be in the dropdown
		expect(
			screen.queryByTestId(`node-credentials-select-item-${GLOBAL_OPENAI_CREDENTIAL.id}`),
		).toBeInTheDocument();
	});
});
