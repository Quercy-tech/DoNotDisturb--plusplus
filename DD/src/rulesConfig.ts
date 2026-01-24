/**
 * Configuration for notification rules and priorities.
 * @module rulesConfig
 */

import * as vscode from 'vscode';
import type { Rule } from './core/types.js';

/**
 * Priority levels for notification sources
 */
export enum Priority {
	Low = 0,
	Medium = 1,
	High = 2,
	Critical = 3,
}

/**
 * Rule configuration for a source
 */
export interface SourceRuleConfig {
	title?: string; // User-friendly title/name for the rule
	source: string;
	priority: Priority;
	action: 'allow' | 'suppress' | 'digest';
	showInFocusMode: boolean; // Whether to show in focus mode (even if normally digested)
	contains?: string; // Optional text filter
}

/**
 * Generate a default title for a rule if not provided
 */
export function generateRuleTitle(rule: SourceRuleConfig): string {
	if (rule.title) {
		return rule.title;
	}
	const source = rule.source === '*' ? 'Any source' : rule.source;
	const action = getActionLabel(rule.action);
	const contains = rule.contains ? ` containing "${rule.contains}"` : '';
	return `${source}${contains} → ${action}`;
}

/**
 * Default rule configurations
 */
export function getDefaultRuleConfigs(): SourceRuleConfig[] {
	return [
		{ title: 'Build Failures', source: 'Build', priority: Priority.High, action: 'allow', showInFocusMode: false, contains: 'failed' },
		{ title: 'Build Success', source: 'Build', priority: Priority.Low, action: 'suppress', showInFocusMode: false, contains: 'succeeded' },
		{ title: 'Test Failures', source: 'Test', priority: Priority.High, action: 'allow', showInFocusMode: false, contains: 'failed' },
		{ title: 'Test Passed', source: 'Test', priority: Priority.Low, action: 'suppress', showInFocusMode: false, contains: 'passed' },
		{ title: 'Debug Exceptions', source: 'Debug', priority: Priority.Critical, action: 'allow', showInFocusMode: true, contains: 'Exception' },
		{ title: 'Extension Errors', source: 'Extension', priority: Priority.High, action: 'allow', showInFocusMode: false, contains: 'error' },
		{ title: 'Git Conflicts', source: 'Git', priority: Priority.High, action: 'allow', showInFocusMode: false, contains: 'conflict' },
		{ title: 'Git Completed', source: 'Git', priority: Priority.Low, action: 'suppress', showInFocusMode: false, contains: 'completed' },
		{ title: 'Chat Messages', source: 'Chat', priority: Priority.Medium, action: 'digest', showInFocusMode: true }, // @mentions handled separately
	];
}

/**
 * Load rule configurations from VS Code settings
 */
export function loadRuleConfigs(): SourceRuleConfig[] {
	const config = vscode.workspace.getConfiguration('dd');
	const customRules = config.get<SourceRuleConfig[]>('rules', []);
	
	// If custom rules exist, use them; otherwise use defaults
	if (customRules.length > 0) {
		return customRules;
	}
	
	return getDefaultRuleConfigs();
}

/**
 * Save rule configurations to VS Code settings
 */
export async function saveRuleConfigs(rules: SourceRuleConfig[]): Promise<void> {
	const config = vscode.workspace.getConfiguration('dd');
	await config.update('rules', rules, vscode.ConfigurationTarget.Global);
}

/**
 * Convert rule configs to routing rules
 */
export function convertToRoutingRules(configs: SourceRuleConfig[], focusMode: boolean): Rule[] {
	const rules: Rule[] = [];
	
	// Sort by priority (highest first)
	const sorted = [...configs].sort((a, b) => b.priority - a.priority);
	
	for (const config of sorted) {
		// In focus mode, only include rules that should be shown
		if (focusMode && !config.showInFocusMode) {
			continue;
		}
		
		rules.push({
			source: config.source,
			contains: config.contains,
			action: config.action,
		});
	}
	
	// Add catch-all rule at the end
	if (!focusMode) {
		rules.push({ source: '*', action: 'digest' });
	} else {
		// In focus mode, default to suppress (silence everything not explicitly allowed)
		rules.push({ source: '*', action: 'suppress' });
	}
	
	return rules;
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: Priority): string {
	switch (priority) {
		case Priority.Low: return 'Low';
		case Priority.Medium: return 'Medium';
		case Priority.High: return 'High';
		case Priority.Critical: return 'Critical';
		default: return 'Unknown';
	}
}

/**
 * Get action label
 */
export function getActionLabel(action: string): string {
	switch (action) {
		case 'allow': return 'Show Immediately';
		case 'suppress': return 'Suppress';
		case 'digest': return 'Digest (Sidebar)';
		default: return action;
	}
}

