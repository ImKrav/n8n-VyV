/**
 * CR-05 · Listado y compartir — compartir (con y sin licencia).
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialSharing.ee.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import type { Scope } from '@n8n/permissions';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CredentialSharing from '@/features/credentials/components/CredentialEdit/CredentialSharing.ee.vue';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRolesStore } from '@n8n/stores/roles.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import { getDropdownItems, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { useI18n } from '@n8n/i18n';
import type * as I18nModule from '@n8n/i18n';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';

const { fetchDependenciesMock, getDependenciesMock } = vi.hoisted(() => ({
	fetchDependenciesMock: vi.fn(),
	getDependenciesMock: vi.fn(),
}));

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		fetchDependencies: fetchDependenciesMock,
		getDependencies: getDependenciesMock,
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof I18nModule>();
	return {
		...actual,
		useI18n: vi.fn(),
	};
});

const mockBaseText = vi.fn((key: string, options?: { interpolate?: Record<string, string> }) => {
	const translations: Record<string, string> = {
		'projects.sharing.allUsers': 'All users and projects',
		'projects.sharing.select.placeholder.project': 'Share with users or projects...',
		'credentialEdit.credentialSharing.info.owner':
			'Only users with credential sharing permission can change who this credential is shared with',
		'credentialEdit.credentialSharing.info.sharee.team': 'Shared by team project',
		'credentialEdit.credentialSharing.info.sharee.personal': 'Shared by personal project',
		'credentialEdit.credentialSharing.info.personalSpaceRestricted':
			"You don't have permission to share personal credentials",
		'credentialEdit.credentialSharing.role.user.canUse': 'Can use',
		'credentialEdit.credentialSharing.role.user.canUse.description':
			"Can use this credential. Can't edit it.",
		'credentialEdit.credentialSharing.usedIn': 'Used in "{workflowName}"',
		'credentialEdit.credentialSharing.usedIn.count': 'Used in {count} workflows',
		'credentialEdit.credentialSharing.canView': 'Can view',
		'credentialEdit.credentialSharing.canView.tooltip':
			"Members of this project can see that this credential is used here, but can't use or edit it.",
		'credentialEdit.credentialSharing.share': 'Share',
		'credentialEdit.credentialSharing.share.tooltip': 'Share this credential with {project}',
		'credentialEdit.credentialSharing.usedIn.personalSpace': 'Can use in personal space',
		'credentialEdit.credentialSharing.usedIn.personalSpace.tooltip':
			"{name}'s role lets them use any credential in their personal space, without a share.",
		'credentialEdit.credentialSharing.share.teamProjects.tooltip':
			'Lets {name} use this credential in team projects too.',
		'auth.roles.owner': 'Owner',
		'contextual.credentials.sharing.unavailable.title': 'Upgrade to collaborate',
		'contextual.credentials.sharing.unavailable.description':
			'You can share credentials with others when you upgrade your plan.',
		'contextual.credentials.sharing.unavailable.button': 'View plans',
	};

	let text = translations[key] || key;

	// Handle interpolation
	if (options?.interpolate) {
		Object.entries(options.interpolate).forEach(([placeholder, value]) => {
			text = text.replace(`{${placeholder}}`, value);
		});
	}

	return text;
});

const renderComponent = createComponentRenderer(CredentialSharing);
const testProjects = Array.from({ length: 3 }, createProjectListItem);

const createCredential = (overrides = {}): ICredentialsResponse => ({
	id: '1',
	name: 'Test Credential',
	type: 'testType',
	isManaged: false,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	homeProject: {
		id: 'project-1',
		name: 'Test Project',
		type: 'team',
		icon: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	sharedWithProjects: [],
	...overrides,
});

// Setup of describe('CredentialSharing.ee', (original top-level describe)
let usersStore: ReturnType<typeof useUsersStore>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let rolesStore: ReturnType<typeof useRolesStore>;
let isEnterpriseFeatureEnabledSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);

	usersStore = useUsersStore();
	projectsStore = useProjectsStore();
	settingsStore = useSettingsStore();
	rolesStore = useRolesStore();

	fetchDependenciesMock.mockReset().mockResolvedValue(undefined);
	getDependenciesMock.mockReset().mockReturnValue(undefined);

	// Mock i18n
	vi.mocked(useI18n).mockReturnValue({
		baseText: mockBaseText,
	} as unknown as ReturnType<typeof useI18n>);

	// Mock store methods
	vi.spyOn(usersStore, 'fetchUsers').mockResolvedValue([]);
	vi.spyOn(projectsStore, 'getAllProjects').mockResolvedValue();
	vi.spyOn(projectsStore, 'searchShareableProjects').mockResolvedValue({
		count: testProjects.length,
		data: testProjects,
	});
	vi.spyOn(rolesStore, 'processedCredentialRoles', 'get').mockReturnValue([
		{
			slug: 'credential:user',
			displayName: 'User',
			description: null,
			systemRole: false,
			roleType: 'credential',
			scopes: [],
			licensed: true,
		},
	]);
	isEnterpriseFeatureEnabledSpy = vi
		.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get')
		.mockReturnValue({
			sharing: true,
			ldap: false,
			saml: false,
			oidc: false,
			mfaEnforcement: false,
			logStreaming: false,
			advancedExecutionFilters: false,
			variables: false,
			sourceControl: false,
			externalSecrets: false,
			auditLogs: false,
			debugInEditor: false,
			binaryDataS3: false,
			workerView: false,
			advancedPermissions: false,

			workflowDiffs: false,
			namedVersions: false,
			provisioning: true,
			showNonProdBanner: false,
			projects: {
				team: {
					limit: -1,
				},
			},
			customRoles: false,
			personalSpacePolicy: false,
			dataRedaction: false,
			otelCustomSpanAttributes: false,
			workflowReviews: false,
		});
});

describe('CP-CR-05-04 · Compartir con un miembro (con licencia)', () => {
	describe('IAM-1435: projects used in but not shared with', () => {
		const marketingProject = {
			id: 'marketing-project',
			name: 'Marketing',
			type: 'team' as const,
			icon: null,
			createdAt: '',
			updatedAt: '',
			role: 'project:editor' as const,
		};

		const ownerPersonalProject = {
			id: 'owner-personal-project',
			name: 'Mona Pfeffer <mona@example.com>',
			type: 'personal' as const,
			icon: null,
			createdAt: '',
			updatedAt: '',
			relations: [],
			scopes: [],
			rolesManaged: false,
		};

		beforeEach(() => {
			projectsStore.myProjects = [marketingProject];
			projectsStore.personalProject = ownerPersonalProject;
		});

		it('shares the project when the Share action is clicked', async () => {
			getDependenciesMock.mockReturnValue({
				dependencies: [
					{
						id: 'wf-1',
						name: 'Email summary',
						type: 'workflowParent',
						projectId: 'marketing-project',
					},
				],
				inaccessibleCount: 0,
			});

			const credential = createCredential({
				homeProject: ownerPersonalProject,
				sharedWithProjects: [],
			});
			const { getByTestId, emitted } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			await userEvent.click(getByTestId('credential-used-in-project-share'));

			expect(emitted()['update:modelValue']).toEqual([[[marketingProject]]]);
		});
	});
});

describe('CP-CR-05-06 · Aviso de pago al compartir sin licencia', () => {
	describe('projects filtering', () => {
		it('should show upgrade action box when sharing is not enabled', () => {
			isEnterpriseFeatureEnabledSpy.mockReturnValue({
				sharing: false,
				ldap: false,
				saml: false,
				oidc: false,
				mfaEnforcement: false,
				logStreaming: false,
				advancedExecutionFilters: false,
				variables: false,
				sourceControl: false,
				externalSecrets: false,
				auditLogs: false,
				debugInEditor: false,
				binaryDataS3: false,
				workerView: false,
				advancedPermissions: false,

				workflowDiffs: false,
				provisioning: true,
				showNonProdBanner: false,
				projects: {
					team: {
						limit: -1,
					},
				},
				customRoles: false,
				personalSpacePolicy: false,
				dataRedaction: false,
			});

			const credential = createCredential();
			const { getByText } = renderComponent({
				props: {
					credentialId: credential.id,
					credentialData: {},
					credentialPermissions: { share: true },
					credential,
					modalBus: createEventBus(),
				},
			});

			// Should show upgrade message
			expect(getByText(/upgrade to collaborate/i)).toBeInTheDocument();
		});
	});
});
