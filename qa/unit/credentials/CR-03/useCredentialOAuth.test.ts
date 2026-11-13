/**
 * CR-03 · Credenciales OAuth2 — flujo de autorización (cancelar, reconectar).
 * Origen: packages/frontend/editor-ui/src/features/credentials/composables/__tests__/useCredentialOAuth.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CREDENTIAL_DESCRIPTIONS_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { OAUTH_FLOW_TIMEOUT } from '@/features/credentials/composables/oauthCallback';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType } from 'n8n-workflow';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

const { mockShowError, mockShowMessage } = vi.hoisted(() => ({
	mockShowError: vi.fn(),
	mockShowMessage: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
		showMessage: mockShowMessage,
	}),
}));

const mockTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

const oAuth2Api: ICredentialType = {
	name: 'oAuth2Api',
	displayName: 'OAuth2 API',
	properties: [
		{
			displayName: 'Use Dynamic Client Registration',
			name: 'useDynamicClientRegistration',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			displayOptions: { show: { useDynamicClientRegistration: [false] } },
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			displayOptions: { show: { useDynamicClientRegistration: [false] } },
			default: '',
			required: true,
		},
	],
};

const oAuth1Api: ICredentialType = {
	name: 'oAuth1Api',
	displayName: 'OAuth1 API',
	properties: [],
};

const googleOAuth2Api: ICredentialType = {
	name: 'googleOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Google OAuth2 API',
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '', required: true },
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
			required: true,
		},
	],
};

const googleSheetsOAuth2Api: ICredentialType = {
	name: 'googleSheetsOAuth2Api',
	extends: ['googleOAuth2Api'],
	displayName: 'Google Sheets OAuth2 API',
	properties: [
		{ displayName: 'Scope', name: 'scope', type: 'string', default: '', required: true },
	],
};

const slackOAuth2Api: ICredentialType = {
	name: 'slackOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Slack OAuth2 API',
	properties: [
		{ displayName: 'Client ID', name: 'clientId', type: 'string', default: '', required: true },
	],
};

const mcpOAuth2ApiWithNoVisibleProps: ICredentialType = {
	name: 'mcpOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'MCP OAuth2 API',
	properties: [
		{
			displayName: 'Use Dynamic Client Registration',
			name: 'useDynamicClientRegistration',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'hidden',
			default: 'https://mcp.example.com/mcp',
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'none',
		},
	],
};

const oauth2ApiWithVisibleAllowedHttpRequestDomains: ICredentialType = {
	name: 'customOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Custom OAuth2 API',
	properties: [
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'options',
			options: [
				{ name: 'All', value: 'all' },
				{ name: 'Specific Domains', value: 'domains' },
				{ name: 'None', value: 'none' },
			],
			default: 'all',
		},
	],
};

const nonOAuthApi: ICredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAI API',
	properties: [
		{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '', required: true },
	],
};

function setupCredentialTypes(types: ICredentialType[]) {
	const credentialsStore = mockedStore(useCredentialsStore);
	const typeMap: Record<string, ICredentialType> = {};
	for (const t of types) {
		typeMap[t.name] = t;
	}
	credentialsStore.state.credentialTypes = typeMap;
}

// Setup of describe('useCredentialOAuth', (original top-level describe)
beforeEach(() => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	setupCredentialTypes([
		oAuth2Api,
		oAuth1Api,
		googleOAuth2Api,
		googleSheetsOAuth2Api,
		slackOAuth2Api,
		nonOAuthApi,
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('CP-CR-03-03 · Cancelar el consentimiento', () => {
	describe('authorize', () => {
		const mockCredential: ICredentialsResponse = {
			id: 'cred-123',
			name: 'Test OAuth2',
			type: 'slackOAuth2Api',
			data: 'dummy-data',
			createdAt: '',
			updatedAt: '',
			isManaged: false,
		};

		let mockPopup: {
			closed: boolean;
			close: ReturnType<typeof vi.fn>;
			location: { href: string };
		};
		class MockBroadcastChannel {
			static failOauth = false;

			static noopEventListener = false;

			static closeCalled = false;

			static __reset() {
				MockBroadcastChannel.closeCalled = false;
				MockBroadcastChannel.noopEventListener = false;
				MockBroadcastChannel.failOauth = false;
			}

			close = () => {
				MockBroadcastChannel.closeCalled = true;
			};

			addEventListener = (event: string, handler: (e: MessageEvent) => void) => {
				if (MockBroadcastChannel.noopEventListener) {
					return;
				}

				if (MockBroadcastChannel.failOauth) {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'error' } as MessageEvent), 0);
					}
				} else {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				}
			};

			removeEventListener = vi.fn();

			postMessage = vi.fn();
		}

		beforeEach(() => {
			mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };

			vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
			vi.stubGlobal('open', vi.fn().mockReturnValue(mockPopup));

			mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue(undefined);
		});

		afterEach(() => {
			MockBroadcastChannel.__reset();
			vi.unstubAllGlobals();
		});

		it('should return false and close the popup when API call fails', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockRejectedValue(new Error('API error'));

			const { authorize } = useCredentialOAuth();
			const result = await authorize(mockCredential);

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalled();
			expect(mockPopup.close).toHaveBeenCalled();
		});
	});

	describe('createAndAuthorize', () => {
		const createdCredential: ICredentialsResponse = {
			id: 'new-cred-123',
			name: 'Slack OAuth2 API',
			type: 'slackOAuth2Api',
			data: 'dummy-data',
			createdAt: '',
			updatedAt: '',
			isManaged: false,
		};

		let mockPopup: {
			closed: boolean;
			close: ReturnType<typeof vi.fn>;
			focus: ReturnType<typeof vi.fn>;
			location: { href: string };
		};

		class MockBroadcastChannel {
			static failOauth = false;

			static silent = false;

			close = vi.fn();

			addEventListener = (event: string, handler: (e: MessageEvent) => void) => {
				if (MockBroadcastChannel.silent) {
					return;
				}

				if (MockBroadcastChannel.failOauth) {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'error' } as MessageEvent), 0);
					}
				} else {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				}
			};

			removeEventListener = vi.fn();

			postMessage = vi.fn();
		}

		beforeEach(() => {
			mockTrack.mockClear();
			mockShowError.mockClear();
			mockShowMessage.mockClear();
			mockPopup = { closed: false, close: vi.fn(), focus: vi.fn(), location: { href: '' } };
			MockBroadcastChannel.silent = false;
			mockedStore(useCredentialsStore).deleteCredential.mockResolvedValue(true);
			vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
			vi.stubGlobal('open', vi.fn().mockReturnValue(mockPopup));
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		function setupSuccessfulOAuthFlow() {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.createNewCredential.mockResolvedValue(createdCredential);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');
			credentialsStore.getCredentialData.mockResolvedValue(undefined);

			MockBroadcastChannel.failOauth = false;
			return credentialsStore;
		}

		function setupFailedOAuthFlow() {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.createNewCredential.mockResolvedValue(createdCredential);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');
			credentialsStore.getCredentialData.mockResolvedValue(undefined);

			MockBroadcastChannel.failOauth = true;

			return credentialsStore;
		}

		it('should delete a newly created credential when authorization fails', async () => {
			const credentialsStore = setupFailedOAuthFlow();
			const { authorizeNewCredential } = useCredentialOAuth();

			await expect(authorizeNewCredential(createdCredential)).resolves.toBe(false);

			expect(credentialsStore.deleteCredential).toHaveBeenCalledWith({
				id: createdCredential.id,
			});
			expect(credentialsStore.upsertCredential).not.toHaveBeenCalled();
		});
	});
});

describe('CP-CR-03-06 · Reconectar tras revocación', () => {
	describe('authorize', () => {
		const mockCredential: ICredentialsResponse = {
			id: 'cred-123',
			name: 'Test OAuth2',
			type: 'slackOAuth2Api',
			data: 'dummy-data',
			createdAt: '',
			updatedAt: '',
			isManaged: false,
		};

		let mockPopup: {
			closed: boolean;
			close: ReturnType<typeof vi.fn>;
			location: { href: string };
		};
		class MockBroadcastChannel {
			static failOauth = false;

			static noopEventListener = false;

			static closeCalled = false;

			static __reset() {
				MockBroadcastChannel.closeCalled = false;
				MockBroadcastChannel.noopEventListener = false;
				MockBroadcastChannel.failOauth = false;
			}

			close = () => {
				MockBroadcastChannel.closeCalled = true;
			};

			addEventListener = (event: string, handler: (e: MessageEvent) => void) => {
				if (MockBroadcastChannel.noopEventListener) {
					return;
				}

				if (MockBroadcastChannel.failOauth) {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'error' } as MessageEvent), 0);
					}
				} else {
					if (event === 'message') {
						setTimeout(() => handler({ data: 'success' } as MessageEvent), 0);
					}
				}
			};

			removeEventListener = vi.fn();

			postMessage = vi.fn();
		}

		beforeEach(() => {
			mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };

			vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
			vi.stubGlobal('open', vi.fn().mockReturnValue(mockPopup));

			mockedStore(useCredentialsStore).getCredentialData.mockResolvedValue(undefined);
		});

		afterEach(() => {
			MockBroadcastChannel.__reset();
			vi.unstubAllGlobals();
		});

		it('should not treat a pre-existing token as success when reconnecting', async () => {
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://oauth.example.com/auth');
			mockPopup.closed = true;
			MockBroadcastChannel.noopEventListener = true;
			// Reconnect: old token data is present before the flow starts.
			credentialsStore.getCredentialData.mockResolvedValue({
				data: { oauthTokenData: '__n8n_BLANK_VALUE' },
			} as unknown as ICredentialsResponse);

			vi.useFakeTimers();
			try {
				const controller = new AbortController();
				const { authorize } = useCredentialOAuth();
				const promise = authorize(mockCredential, controller.signal);
				let resolved = false;
				void promise.then(() => (resolved = true));

				await vi.advanceTimersByTimeAsync(5000);
				expect(resolved).toBe(false);

				controller.abort();
				await expect(promise).resolves.toBe(false);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
