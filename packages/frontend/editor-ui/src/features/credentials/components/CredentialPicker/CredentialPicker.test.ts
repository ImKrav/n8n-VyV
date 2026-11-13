import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '../../credentials.store';
import { createTestingPinia } from '@pinia/testing';
import CredentialPicker from './CredentialPicker.vue';
import {
	PERSONAL_OPENAI_CREDENTIAL,
	TEST_CREDENTIAL_TYPES,
	TEST_CREDENTIALS,
} from './CredentialPicker.test.constants';
import userEvent from '@testing-library/user-event';

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

describe('CredentialPicker', () => {
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

	it('should render', () => {
		expect(() =>
			renderComponent({
				props: {
					appName: 'OpenAI',
					credentialType: 'openAiApi',
					selectedCredentialId: null,
				},
			}),
		).not.toThrowError();
	});

	it('opens the credential editor at the body level when requested', async () => {
		const { getByTestId } = renderComponent({
			props: {
				appName: 'OpenAI',
				credentialType: 'openAiApi',
				selectedCredentialId: PERSONAL_OPENAI_CREDENTIAL.id,
				credentialModalAppendToBody: true,
			},
		});

		await userEvent.click(getByTestId('credential-edit-button'));

		expect(uiStore.openExistingCredential).toHaveBeenCalledWith(PERSONAL_OPENAI_CREDENTIAL.id, {
			appendToBody: true,
		});
	});

	it('opens the new credential form at the body level when requested', async () => {
		credentialsStore.state.credentials = {};
		const { getByTestId } = renderComponent({
			props: {
				appName: 'OpenAI',
				credentialType: 'openAiApi',
				selectedCredentialId: null,
				projectId: 'project-1',
				credentialModalAppendToBody: true,
			},
		});

		await userEvent.click(getByTestId('create-credential'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			true,
			false,
			'project-1',
			undefined,
			undefined,
			undefined,
			{ closeOnSave: true, appendToBody: true },
		);
	});
});
