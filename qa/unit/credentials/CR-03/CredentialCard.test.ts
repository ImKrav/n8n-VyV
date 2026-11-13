/**
 * CR-03 · Credenciales OAuth2 — conectar desde la tarjeta.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialCard.test.ts
 */
import { usePostHog } from '@/app/stores/posthog.store';
import { setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import CredentialCard from '@/features/credentials/components/CredentialCard.vue';
import type { CredentialsResource } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { FrontendSettings } from '@n8n/api-types';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { MODAL_CONFIRM } from '@/app/constants';

const mockAuthorize = vi.fn();
const mockIsOAuthCredentialType = vi.fn();

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: mockAuthorize,
		isOAuthCredentialType: mockIsOAuthCredentialType,
	}),
}));

const mockConfirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: mockConfirm,
	}),
}));

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage,
		showError,
	}),
}));

const renderComponent = createComponentRenderer(CredentialCard);

const createCredential = (overrides = {}): CredentialsResource =>
	({
		id: '',
		createdAt: '',
		updatedAt: '',
		type: '',
		name: '',
		sharedWithProjects: [],
		homeProject: {} as ProjectSharingData,
		...overrides,
	}) as Partial<CredentialsResource> as CredentialsResource;

// Setup of describe('CredentialCard', (original top-level describe)
let projectsStore: ReturnType<typeof useProjectsStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
	projectsStore = useProjectsStore();
	settingsStore = useSettingsStore();
	settingsStore.settings = {
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
	} as unknown as FrontendSettings;
	vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
	mockAuthorize.mockReset();
	mockIsOAuthCredentialType.mockReset();
	mockIsOAuthCredentialType.mockReturnValue(true);
});

describe('CP-CR-03-02 · Autorización exitosa', () => {
	describe('private credentials connect flow', () => {
		const privateUnconnectedData = (overrides = {}) =>
			createCredential({
				id: 'cred-1',
				isResolvable: true,
				connectedByMe: false,
				scopes: ['credential:connect'],
				homeProject: { name: 'Test Project' },
				...overrides,
			});

		it('should call authorize with the credential and emit "connected" on success', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'oAuth2Api' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(true);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(mockAuthorize).toHaveBeenCalledWith(credential);
			expect(emitted('connected')).toEqual([[data.id]]);
		});
	});
});

describe('CP-CR-03-03 · Cancelar el consentimiento', () => {
	describe('private credentials connect flow', () => {
		const privateUnconnectedData = (overrides = {}) =>
			createCredential({
				id: 'cred-1',
				isResolvable: true,
				connectedByMe: false,
				scopes: ['credential:connect'],
				homeProject: { name: 'Test Project' },
				...overrides,
			});

		it('should not emit "connected" if authorize fails', async () => {
			const data = privateUnconnectedData();
			const credential = { id: data.id, type: 'oAuth2Api' } as ICredentialsResponse;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(false);

			const { getByTestId, emitted } = renderComponent({ props: { data } });

			await userEvent.click(getByTestId('credential-card-connect'));

			expect(mockAuthorize).toHaveBeenCalled();
			expect(emitted('connected')).toBeUndefined();
		});
	});
});
