/**
 * CR-05 · Listado y compartir — vista de credenciales.
 * Origen: packages/frontend/editor-ui/src/features/credentials/views/CredentialsView.test.ts
 */
import { usePostHog } from '@/app/stores/posthog.store';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import CredentialsView from '@/features/credentials/views/CredentialsView.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor, within, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { STORES } from '@n8n/stores';
import { CREDENTIAL_SELECT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createRouter, createWebHistory } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import * as projectsApi from '@/features/collaboration/projects/projects.api';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

const mockAuthorize = vi.fn();
const mockIsOAuthCredentialType = vi.fn(() => true);

vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: mockAuthorize,
		isOAuthCredentialType: mockIsOAuthCredentialType,
	}),
}));

vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

vi.mock('@/features/collaboration/projects/projects.api', () => ({
	getProject: vi.fn(),
}));

vi.mock('@/app/api/workflow-dependencies', () => ({
	getResourceDependencyCounts: vi.fn().mockResolvedValue({}),
	getResourceDependencies: vi.fn().mockResolvedValue({}),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			name: VIEWS.HOMEPAGE,
			path: '/',
			component: { template: '<div></div>' },
		},
		{
			path: '/:projectId?/credentials/:credentialId?',
			name: VIEWS.CREDENTIALS,
			component: { template: '<div></div>' },
		},
		{
			path: '/entity-un-authorized',
			name: VIEWS.ENTITY_UNAUTHORIZED,
			component: { template: '<div></div>' },
		},
		{
			path: '/entity-not-found',
			name: VIEWS.ENTITY_NOT_FOUND,
			component: { template: '<div></div>' },
		},
	],
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: { enterprise: { variables: true, projects: { team: { limit: -1 } } } },
	},
};

const renderComponent = createComponentRenderer(CredentialsView, {
	global: { stubs: { ProjectHeader: true }, plugins: [router] },
});

const mockedProjectsApi = vi.mocked(projectsApi);

// Setup of describe('CredentialsView', (original top-level describe)
beforeEach(async () => {
	createTestingPinia({ initialState });
	mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
	await router.push('/');
	await router.isReady();

	// Mock getProject to prevent actual API calls when routes with projectId are navigated to
	mockedProjectsApi.getProject.mockResolvedValue(createTestProject({}));
});

afterEach(() => {
	vi.clearAllMocks();
	mockAuthorize.mockReset();
});

const enableDynamicCredentials = () => {
	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.settings = {
		...settingsStore.settings,
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
	} as unknown as typeof settingsStore.settings;
	settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
};

describe('CP-CR-05-03 · Filtrar por tipo', () => {
	describe('filters', () => {
		it('should filter by type', async () => {
			await router.push({ name: VIEWS.CREDENTIALS, query: { type: ['test'] } });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentialTypes = [
				{
					name: 'test',
					displayName: 'test',
					properties: [],
				},
			];
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
				},
				{
					id: '1',
					name: 'test',
					type: 'another',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
				},
			];
			const { getAllByTestId } = renderComponent();
			expect(getAllByTestId('resources-list-item').length).toBe(1);
		});
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

const seedCredentials = (names: string[]) => {
	const credentialsStore = mockedStore(useCredentialsStore);
	credentialsStore.allCredentialTypes = [
		{ name: 'test', displayName: 'Test type', properties: [] },
	];
	credentialsStore.allCredentials = names.map((name, i) => ({
		id: String(i + 1),
		name,
		type: 'test',
		createdAt: `2021-05-0${i + 1}T00:00:00Z`,
		updatedAt: `2021-05-0${i + 1}T00:00:00Z`,
		scopes: ['credential:update'],
		isManaged: false,
	}));
};

const listedNames = (getAllByTestId: (id: string) => HTMLElement[]) =>
	getAllByTestId('resources-list-item').map((item) =>
		item.querySelector('h2, [role="heading"]')?.textContent?.trim(),
	);

describe('CP-CR-05-01 · Buscar credenciales por nombre', () => {
	it('un término parcial devuelve solo las coincidencias', async () => {
		// Arrange
		await router.push({ name: VIEWS.CREDENTIALS, query: { search: 'slack' } });
		seedCredentials(['Slack bot', 'Slack admin', 'Gmail']);

		// Act
		const { getAllByTestId } = renderComponent();

		// Assert
		await waitFor(() => expect(getAllByTestId('resources-list-item')).toHaveLength(2));
		expect(listedNames(getAllByTestId)).toEqual(
			expect.arrayContaining(['Slack bot', 'Slack admin']),
		);
	});

	it('un término inexistente no lista ninguna credencial', async () => {
		// Arrange
		await router.push({ name: VIEWS.CREDENTIALS, query: { search: 'no-existe-xyz' } });
		seedCredentials(['Slack bot', 'Gmail']);

		// Act
		const { queryAllByTestId } = renderComponent();

		// Assert
		await waitFor(() => expect(queryAllByTestId('resources-list-item')).toHaveLength(0));
	});
});

describe('CP-CR-05-02 · Ordenar por nombre y fecha', () => {
	it('lista primero la credencial actualizada más recientemente (orden por defecto)', async () => {
		// Arrange: updatedAt grows with the index, so Alpha is the most recent
		await router.push({ name: VIEWS.CREDENTIALS });
		seedCredentials(['Bravo', 'Charlie', 'Alpha']);

		// Act
		const { getAllByTestId } = renderComponent();

		// Assert
		await waitFor(() => expect(listedNames(getAllByTestId)).toEqual(['Alpha', 'Charlie', 'Bravo']));
	});

	// The element-plus sort dropdown does not open in jsdom with this view; cover it in E2E.
	it.todo('cambiar a «Sort by name (A-Z)» y «(Z-A)» desde el desplegable (cubrir en E2E)');
});
