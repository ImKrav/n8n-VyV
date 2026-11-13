/**
 * CR-01 · Crear credencial — selector del tipo de credencial (búsqueda). En n8n 2.47 solo se conserva
 * la preparación del archivo original (2.48); las pruebas de este archivo son nuevas.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialsSelectModal.test.ts
 */
/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';
import type * as typeAvailabilityPolicies from '@n8n/frontend-module-type-availability-policies';
import {
	mockRestrictedCredentialTypes,
	mockRestrictedNodeTypes,
} from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialsSelectModal from '@/features/credentials/components/CredentialsSelectModal.vue';

const selectBlur = vi.hoisted(() => vi.fn());
const selectFocus = vi.hoisted(() => vi.fn());

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join('|')}` : key,
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track: vi.fn() }) }));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({ value: { workflowId: '' } }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp', () => ({
	useInstanceAiCredentialHelp: () => () => undefined,
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		props: { loading: { type: Boolean, default: false } },
		template:
			'<div><slot name="header" /><slot v-if="!loading" name="content" /><slot name="footer" /></div>',
	},
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent } = await import('vue');

	return {
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: { modelValue: { type: String, default: '' } },
			emits: ['update:modelValue', 'visible-change'],
			setup(_, { expose }) {
				expose({ blur: selectBlur, focus: selectFocus });
			},
			template: '<div><slot /></div>',
		}),
		N8nOption: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
				disabled: { type: Boolean, default: false },
			},
			template: `
				<div
					class="el-select-dropdown__item"
					:data-name="value"
					:data-disabled="disabled"
				><slot /></div>
			`,
		}),
		N8nButton: defineComponent({
			name: 'N8nButton',
			props: { label: { type: String, default: '' }, disabled: { type: Boolean, default: false } },
			emits: ['click'],
			template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
		}),
		N8nIcon: defineComponent({ template: '<i />' }),
		N8nText: defineComponent({ template: '<span><slot /></span>' }),
	};
});

// The popover and the dialog have their own tests; here they only record what they receive.
vi.mock('@n8n/frontend-module-type-availability-policies', async (importOriginal) => ({
	...(await importOriginal<typeof typeAvailabilityPolicies>()),
	RestrictedNodePopover: {
		name: 'RestrictedNodePopover',
		props: ['nodeTypeName', 'restriction', 'kind', 'scopeLabel', 'description', 'anchor'],
		emits: ['contactAdmin'],
		template:
			'<button data-test-id="restricted-marker" @click="$emit(\'contactAdmin\', restriction?.scope ?? \'instance\')" />',
	},
	ContactAdminModal: {
		name: 'ContactAdminModal',
		props: ['open', 'typeName', 'kind', 'audience'],
		emits: ['update:open'],
		template: '<div v-if="open" data-test-id="contact-admin-modal">{{ typeName }}</div>',
	},
}));

const types = [
	{ name: 'airtableApi', displayName: 'Airtable', properties: [] },
	{
		name: 'mailjetEmailApi',
		displayName: 'Mailjet Email',
		properties: [],
		supportedNodes: ['n8n-nodes-base.mailjet'],
	},
	{ name: 'slackApi', displayName: 'Slack', properties: [] },
	{ name: 'zoomApi', displayName: 'Zoom', properties: [] },
] satisfies ICredentialType[];

function mountModal() {
	useCredentialsStore().setCredentialTypes(types);
	return mount(CredentialsSelectModal);
}

async function mountLoaded() {
	const wrapper = mountModal();
	await flushPromises();
	return wrapper;
}

function names(wrapper: ReturnType<typeof mountModal>) {
	return wrapper
		.findAll('[data-test-id="new-credential-type-select-option"]')
		.map((o) => o.attributes('data-name'));
}

function option(wrapper: ReturnType<typeof mountModal>, name: string) {
	return wrapper.find(`[data-test-id="new-credential-type-select-option"][data-name="${name}"]`);
}

async function openList(wrapper: ReturnType<typeof mountModal>) {
	wrapper.findComponent({ name: 'N8nSelect' }).vm.$emit('visible-change', true);
	await nextTick();
}

async function select(wrapper: ReturnType<typeof mountModal>, name: string) {
	wrapper.findComponent({ name: 'N8nSelect' }).vm.$emit('update:modelValue', name);
	await nextTick();
}

function continueButton(wrapper: ReturnType<typeof mountModal>) {
	return wrapper.findComponent({ name: 'N8nButton' });
}

// Setup of describe('CredentialsSelectModal — restricted credential types', (original top-level describe)
beforeEach(() => {
	setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
	selectBlur.mockClear();
	selectFocus.mockClear();
	const credentialsStore = mockedStore(useCredentialsStore);
	credentialsStore.fetchCredentialTypes = vi.fn().mockResolvedValue(undefined);
	mockRestrictedCredentialTypes({});
	mockRestrictedNodeTypes({});
});

afterEach(() => {
	vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

/** Types a search term the way the real select does: through its filter-method. */
async function search(wrapper: ReturnType<typeof mountModal>, term: string) {
	const select = wrapper.findComponent({ name: 'N8nSelect' });
	const filter = (select.vm.$attrs['filter-method'] ?? select.vm.$attrs.filterMethod) as (
		query: string,
	) => void;
	filter(term);
	await nextTick();
}

describe('CP-CR-01-05 · Búsqueda de tipo sin resultados', () => {
	it('no muestra opciones para un tipo inexistente y no permite continuar', async () => {
		// Arrange
		const wrapper = await mountLoaded();

		// Act
		await search(wrapper, 'tipo-que-no-existe');

		// Assert
		expect(names(wrapper)).toEqual([]);
		expect(wrapper.find('[data-test-id="new-credential-type-button"]').attributes()).toHaveProperty(
			'disabled',
		);
	});

	it('muestra solo los tipos que coinciden con un término parcial', async () => {
		// Arrange
		const wrapper = await mountLoaded();

		// Act
		await search(wrapper, 'sla');

		// Assert
		expect(names(wrapper)).toEqual(['slackApi']);
	});
});
