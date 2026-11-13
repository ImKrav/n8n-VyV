/**
 * CR-03 · Credenciales OAuth2 — URL de redirección.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialConfig.test.ts
 */
import CredentialConfig from '@/features/credentials/components/CredentialEdit/CredentialConfig.vue';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { STORES } from '@n8n/stores';
import { vi } from 'vitest';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import { addCredentialTranslation } from '@n8n/i18n';
import type { INodeUi } from '@/Interface';
import { computed, toValue } from 'vue';
import { useGatewayCreditsPromotion } from '@/features/credentials/gatewayCreditsPromotion/useGatewayCreditsPromotion';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@/features/credentials/gatewayCreditsPromotion/useGatewayCreditsPromotion', () => ({
	useGatewayCreditsPromotion: vi.fn(() => ({
		promotionText: computed<string | undefined>(() => undefined),
	})),
}));

vi.mock('@n8n/i18n', async () => {
	const actual = await vi.importActual('@n8n/i18n');
	return {
		...actual,
		addCredentialTranslation: vi.fn(),
	};
});

const mockCredentialType: ICredentialType = {
	name: 'testCredential',
	displayName: 'Test Credential',
	properties: [],
};

const defaultRenderOptions: RenderOptions<typeof CredentialConfig> = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: false,
						externalSecrets: false,
					},
				},
			},
		},
	}),
	props: {
		isManaged: true,
		mode: 'edit',
		credentialType: mockCredentialType,
		credentialProperties: [],
		credentialData: {} as ICredentialDataDecryptedObject,
		credentialPermissions: {
			share: false,
			move: false,
			create: false,
			read: false,
			update: false,
			delete: false,
			list: false,
		},
	},
};

const renderComponent = createComponentRenderer(CredentialConfig, defaultRenderOptions);

// Setup of describe('CredentialConfig', (original top-level describe)

describe('CP-CR-03-01 · URL de redirección correcta', () => {
	describe('OAuth Redirect URL', () => {
		const writePermissions = {
			create: true,
			update: true,
			read: true,
			delete: true,
			share: true,
			list: true,
			move: true,
		};

		it('should show redirect URL for OAuth credentials without managed OAuth', () => {
			renderComponent({
				pinia: createTestingPinia({
					initialState: {
						[STORES.SETTINGS]: {
							settings: { enterprise: { sharing: false, externalSecrets: false } },
						},
						[STORES.ROOT]: {
							oauthCallbackUrls: { oauth2: 'https://example.com/callback' },
						},
					},
				}),
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: true,
					managedOauthAvailable: false,
					useCustomOauth: false,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.getByTestId('copy-input')).toBeInTheDocument();
		});
	});

	describe('OAuth Redirect URL', () => {
		const writePermissions = {
			create: true,
			update: true,
			read: true,
			delete: true,
			share: true,
			list: true,
			move: true,
		};

		it('should not show redirect URL for non-OAuth credentials', () => {
			renderComponent({
				props: {
					isManaged: false,
					mode: 'new',
					credentialType: mockCredentialType,
					credentialProperties: [],
					credentialData: {} as ICredentialDataDecryptedObject,
					isOAuthType: false,
					managedOauthAvailable: false,
					useCustomOauth: false,
					credentialPermissions: writePermissions,
				},
			});

			expect(screen.queryByTestId('copy-input')).not.toBeInTheDocument();
		});
	});
});
