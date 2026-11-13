/**
 * CR-01 · Crear credencial — nombre mostrado en el listado.
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

describe('CP-CR-01-08 · Nombre con HTML no se ejecuta', () => {
	it('should render name and home project name', () => {
		const projectName = 'Test Project';
		const data = createCredential({
			homeProject: {
				name: projectName,
			},
		});
		const { getByRole, getByTestId } = renderComponent({ props: { data } });

		const heading = getByRole('heading');
		const badge = getByTestId('card-badge');

		expect(heading).toHaveTextContent(data.name);
		expect(badge).toHaveTextContent(projectName);
	});

	// Prueba nueva: un nombre con etiquetas se muestra como texto, sin crear nodos HTML.
	it('muestra como texto un nombre que contiene una etiqueta script', () => {
		// Arrange
		const name = '<script>alert(1)</script><img src=x onerror=alert(2)>';
		const data = createCredential({ name });

		// Act
		const { getByRole, container } = renderComponent({ props: { data } });

		// Assert
		expect(getByRole('heading')).toHaveTextContent(name);
		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('img[src="x"]')).toBeNull();
	});
});
