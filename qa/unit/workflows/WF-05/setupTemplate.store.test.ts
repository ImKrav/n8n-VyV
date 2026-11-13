/**
 * WF-05 · Plantillas, importación y duplicado — credenciales al usar una plantilla.
 * Origen: packages/frontend/editor-ui/src/features/workflows/templates/setupTemplate.store.test.ts
 */
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import type { ICredentialType } from 'n8n-workflow';

import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type {
	ITemplatesWorkflowFull,
	IWorkflowTemplateNode,
} from '@n8n/rest-api-client/api/templates';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { keyFromCredentialTypeAndName } from '@/features/workflows/templates/utils/templateTransforms';
import { useSetupTemplateStore } from '@/features/workflows/templates/setupTemplate.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import {
	nodeTypeHttpRequest,
	nodeTypeNextCloud,
	nodeTypeReadImap,
	nodeTypeTelegram,
	nodeTypeTwitter,
} from '@/app/utils/test-utils/nodeTypeTestData';
import * as testData from '@/features/workflows/templates/__tests__/setupTemplate.store.testData';

const mockCredentialsResponse = (id: string) =>
	mock<ICredentialsResponse>({
		id,
		name: 'Telegram account',
		type: 'telegramApi',
	});

const mockCredentialType = (name: string) => mock<ICredentialType>({ name });

const mockTemplateNode = (name: string, type: string) =>
	mock<IWorkflowTemplateNode>({
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
	});

const testTemplate1 = mock<ITemplatesWorkflowFull>({
	id: 1,
	workflow: {
		nodes: [
			mockTemplateNode('IMAP Email', 'n8n-nodes-base.emailReadImap'),
			mockTemplateNode('Nextcloud', 'n8n-nodes-base.nextCloud'),
		],
	},
	full: true,
});

const testTemplate2 = mock<ITemplatesWorkflowFull>({
	id: 2,
	workflow: {
		nodes: [
			{
				...mockTemplateNode('Telegram', 'n8n-nodes-base.telegram'),
				credentials: {
					telegramApi: 'telegram_habot',
				},
			},
		],
	},
	full: true,
});

// Setup of describe('SetupWorkflowFromTemplateView store', (original top-level describe)

describe('CP-WF-05-02 · Configurar credenciales al usar una plantilla', () => {
	describe('setInitialCredentialsSelection', () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([mockCredentialType('telegramApi')]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testTemplate2]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([nodeTypeTelegram, nodeTypeTwitter, nodeTypeHttpRequest]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testTemplate2.id.toString());
		});

		it("should select no credentials when there isn't any available", () => {
			// Setup
			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({});
		});
	});

	describe('setInitialCredentialsSelection', () => {
		beforeEach(() => {
			setActivePinia(
				createTestingPinia({
					stubActions: false,
				}),
			);

			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentialTypes([mockCredentialType('telegramApi')]);
			const templatesStore = useTemplatesStore();
			templatesStore.addWorkflows([testTemplate2]);
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.setNodeTypes([nodeTypeTelegram, nodeTypeTwitter, nodeTypeHttpRequest]);
			const setupTemplateStore = useSetupTemplateStore();
			setupTemplateStore.setTemplateId(testTemplate2.id.toString());
		});

		it("should select credential when there's only one", () => {
			// Setup
			const credentialId = 'YaSKdvEcT1TSFrrr1';
			const credentialsStore = useCredentialsStore();
			credentialsStore.setCredentials([mockCredentialsResponse(credentialId)]);

			const setupTemplateStore = useSetupTemplateStore();

			// Execute
			setupTemplateStore.setInitialCredentialSelection();

			expect(setupTemplateStore.selectedCredentialIdByKey).toEqual({
				[keyFromCredentialTypeAndName('telegramApi', 'telegram_habot')]: credentialId,
			});
		});
	});
});
