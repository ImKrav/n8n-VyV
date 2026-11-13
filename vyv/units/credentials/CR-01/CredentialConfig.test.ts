/**
 * CR-01 · Crear credencial — configuración con campos obligatorios vacíos.
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

describe('CP-CR-01-02 · Campo obligatorio vacío', () => {
	describe('Connect banner gating', () => {
		const oAuthNotConnectedProps = {
			isManaged: false,
			mode: 'edit' as const,
			credentialId: 'existing-cred-123',
			credentialType: mockCredentialType,
			credentialProperties: [],
			credentialData: {} as ICredentialDataDecryptedObject,
			isOAuthType: true,
			isOAuthConnected: false,
			requiredPropertiesFilled: true,
			isResolvable: true,
		};

		it('hides the connect banner while required properties are not filled', () => {
			renderComponent({
				props: {
					...oAuthNotConnectedProps,
					requiredPropertiesFilled: false,
					credentialPermissions: { read: true, connect: true },
				},
			});

			expect(screen.getByTestId('oauth-not-connected-banner')).not.toBeVisible();
		});
	});
});
