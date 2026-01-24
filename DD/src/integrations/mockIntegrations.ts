/**
 * Mock integrations that simulate notifications from various VS Code sources.
 * @module mockIntegrations
 */

import type { NotificationInput } from '../core/types.js';

/**
 * Mock notification templates for different sources
 */
export interface MockNotificationTemplate {
	source: string;
	templates: Array<{ title: string; body: string }>;
}

/**
 * Mock integrations with realistic notification templates
 */
export const mockIntegrations: MockNotificationTemplate[] = [
	{
		source: 'Git',
		templates: [
			{ title: 'Git: Pull completed', body: 'Successfully pulled 3 commits from origin/main' },
			{ title: 'Git: Push completed', body: 'Pushed 2 commits to origin/main' },
			{ title: 'Git: Branch created', body: 'Created branch feature/new-feature' },
			{ title: 'Git: Merge conflict', body: 'Merge conflict in src/extension.ts' },
			{ title: 'Git: Repository initialized', body: 'Initialized git repository' },
		],
	},
	{
		source: 'Extension',
		templates: [
			{ title: 'Extension installed', body: 'ESLint extension has been installed' },
			{ title: 'Extension update available', body: 'Update available for Python extension' },
			{ title: 'Extension recommendation', body: 'We recommend installing the Prettier extension' },
			{ title: 'Extension error', body: 'Extension "some-extension" failed to activate' },
		],
	},
	{
		source: 'Build',
		templates: [
			{ title: 'Build succeeded', body: 'Build completed successfully in 2.3s' },
			{ title: 'Build failed', body: 'Build failed: 3 errors, 2 warnings' },
			{ title: 'TypeScript compilation', body: 'Compiled 15 files with no errors' },
			{ title: 'Lint errors found', body: 'Found 5 linting errors in your code' },
		],
	},
	{
		source: 'Debug',
		templates: [
			{ title: 'Breakpoint hit', body: 'Breakpoint hit at src/extension.ts:42' },
			{ title: 'Debug session started', body: 'Debug session started for extension' },
			{ title: 'Debug session ended', body: 'Debug session ended' },
			{ title: 'Exception thrown', body: 'Uncaught exception: TypeError in extension.ts' },
		],
	},
	{
		source: 'Test',
		templates: [
			{ title: 'Tests passed', body: 'All 12 tests passed in 0.5s' },
			{ title: 'Tests failed', body: '2 of 12 tests failed' },
			{ title: 'Test coverage', body: 'Test coverage: 85% (target: 80%)' },
		],
	},
	{
		source: 'Language Server',
		templates: [
			{ title: 'Language server started', body: 'TypeScript language server initialized' },
			{ title: 'Code actions available', body: '5 quick fixes available' },
			{ title: 'Diagnostics updated', body: 'Updated diagnostics for 8 files' },
		],
	},
	{
		source: 'File System',
		templates: [
			{ title: 'File saved', body: 'Saved src/extension.ts' },
			{ title: 'File deleted', body: 'Deleted old-file.ts' },
			{ title: 'File watcher error', body: 'File watcher stopped working' },
		],
	},
];

/**
 * Generate a random notification from a random integration
 */
export function generateMockNotification(): NotificationInput {
	const integration = mockIntegrations[Math.floor(Math.random() * mockIntegrations.length)];
	const template = integration.templates[Math.floor(Math.random() * integration.templates.length)];
	
	return {
		source: integration.source,
		title: template.title,
		body: template.body,
	};
}

/**
 * Generate a notification from a specific source
 */
export function generateMockNotificationFromSource(source: string): NotificationInput | null {
	const integration = mockIntegrations.find(int => int.source === source);
	if (!integration) {
		return null;
	}
	
	const template = integration.templates[Math.floor(Math.random() * integration.templates.length)];
	return {
		source: integration.source,
		title: template.title,
		body: template.body,
	};
}

/**
 * Get all available mock sources
 */
export function getMockSources(): string[] {
	return mockIntegrations.map(int => int.source);
}

