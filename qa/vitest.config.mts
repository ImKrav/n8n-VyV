// Runs the QA suite with the editor-ui Vitest setup (aliases, jsdom, setup file).
// `root` is editor-ui, so every path below is relative to that package.
import { resolve } from 'node:path';

import editorUiConfig from '../packages/frontend/editor-ui/vitest.config.mts';
import { reusedTests, selectedSources } from './suite.mts';

const editorUiRoot = resolve(import.meta.dirname, '../packages/frontend/editor-ui');

export default {
	...editorUiConfig,
	root: editorUiRoot,
	test: {
		...editorUiConfig.test,
		include: ['../../../qa/unit/**/*.test.ts', ...reusedTests],
		coverage: {
			...editorUiConfig.test?.coverage,
			include: selectedSources,
			reporter: ['text', 'text-summary', 'json-summary', 'html'],
			reportsDirectory: resolve(import.meta.dirname, 'coverage'),
		},
	},
};
