/**
 * Rules configuration panel for managing notification priorities and focus mode settings.
 * @module rulesPanel
 */

import * as vscode from 'vscode';
import type { NotificationManager } from './notificationManager.js';
import { getDefaultRuleConfigs, loadRuleConfigs, saveRuleConfigs, convertToRoutingRules, Priority, getPriorityLabel, getActionLabel, type SourceRuleConfig } from './rulesConfig.js';
import { getMockSources } from './integrations/mockIntegrations.js';

/**
 * Rules configuration panel webview provider
 */
export class RulesPanel {
	private static currentPanel: RulesPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _notificationManager: NotificationManager;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, notificationManager: NotificationManager) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._notificationManager = notificationManager;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		this._panel.onDidDispose(() => this.dispose, null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case 'loadRules':
						this._sendRules();
						return;
					case 'saveRules':
						await this._handleSaveRules(message.rules);
						return;
					case 'resetRules':
						await this._handleResetRules();
						return;
					case 'applyRules':
						await this._handleApplyRules();
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public static createOrShow(extensionUri: vscode.Uri, notificationManager: NotificationManager): void {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it
		if (RulesPanel.currentPanel) {
			RulesPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel
		const panel = vscode.window.createWebviewPanel(
			'rulesPanel',
			'Notification Rules',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
			}
		);

		RulesPanel.currentPanel = new RulesPanel(panel, extensionUri, notificationManager);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, notificationManager: NotificationManager): void {
		RulesPanel.currentPanel = new RulesPanel(panel, extensionUri, notificationManager);
	}

	public dispose(): void {
		RulesPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _sendRules(): void {
		const rules = loadRuleConfigs();
		this._panel.webview.postMessage({
			command: 'rulesLoaded',
			rules: rules,
		});
	}

	private async _handleSaveRules(rules: SourceRuleConfig[]): Promise<void> {
		try {
			await saveRuleConfigs(rules);
			this._panel.webview.postMessage({
				command: 'rulesSaved',
				message: 'Rules saved successfully!',
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'error',
				message: `Failed to save rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	private async _handleResetRules(): Promise<void> {
		try {
			await saveRuleConfigs(getDefaultRuleConfigs());
			this._sendRules();
			this._panel.webview.postMessage({
				command: 'rulesSaved',
				message: 'Rules reset to defaults!',
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'error',
				message: `Failed to reset rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	private async _handleApplyRules(): Promise<void> {
		try {
			const rules = loadRuleConfigs();
			const focusMode = this._notificationManager.isFocusMode();
			const routingRules = convertToRoutingRules(rules, focusMode);
			this._notificationManager.setRules(routingRules);
			
			vscode.window.showInformationMessage('Notification rules applied successfully!');
			this._panel.webview.postMessage({
				command: 'rulesApplied',
				message: 'Rules applied successfully!',
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'error',
				message: `Failed to apply rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	private _update(): void {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
		// Load rules after panel is ready
		setTimeout(() => this._sendRules(), 100);
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const sources = getMockSources();
		const sourcesOptions = sources.map(s => `<option value="${s}">${s}</option>`).join('\n');
		const priorityOptions = Object.values(Priority)
			.filter(p => typeof p === 'number')
			.map(p => `<option value="${p}">${getPriorityLabel(p as Priority)}</option>`)
			.join('\n');

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Notification Rules</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		.header {
			margin-bottom: 20px;
		}
		.header h2 {
			margin: 0 0 8px 0;
			font-size: 20px;
			font-weight: 600;
		}
		.header p {
			margin: 0;
			font-size: 13px;
			color: var(--vscode-descriptionForeground);
			line-height: 1.5;
		}
		.controls {
			margin-bottom: 20px;
			display: flex;
			gap: 8px;
		}
		button {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 10px 20px;
			cursor: pointer;
			font-size: 13px;
			font-weight: 500;
			border-radius: 4px;
			transition: background-color 0.2s;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		button.secondary:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
		.rules-container {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		.rule-item {
			border: 1px solid var(--vscode-input-border);
			border-radius: 6px;
			padding: 16px;
			background-color: var(--vscode-input-background);
			margin-bottom: 12px;
			transition: border-color 0.2s;
		}
		.rule-item:hover {
			border-color: var(--vscode-focusBorder);
		}
		.rule-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 12px;
			padding-bottom: 12px;
			border-bottom: 1px solid var(--vscode-input-border);
		}
		.rule-title-input {
			width: 100%;
			font-weight: 600;
			font-size: 14px;
			color: var(--vscode-foreground);
			padding: 8px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			border-radius: 4px;
		}
		.rule-title-input:focus {
			outline: none;
			border-color: var(--vscode-focusBorder);
		}
		.delete-btn {
			background-color: transparent;
			color: var(--vscode-errorForeground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			padding: 6px 10px;
			font-size: 14px;
			cursor: pointer;
			border-radius: 3px;
			min-width: 32px;
		}
		.delete-btn:hover {
			background-color: var(--vscode-inputValidation-errorBackground);
		}
		.rule-fields {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr 1fr auto;
			gap: 8px;
			align-items: start;
		}
		.form-group {
			display: flex;
			flex-direction: column;
		}
		.form-group label {
			font-size: 11px;
			margin-bottom: 4px;
			color: var(--vscode-descriptionForeground);
		}
		select, input {
			padding: 8px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-family: var(--vscode-font-family);
			font-size: 13px;
			border-radius: 4px;
			transition: border-color 0.2s;
		}
		select:focus, input:focus {
			outline: none;
			border-color: var(--vscode-focusBorder);
		}
		input[type="checkbox"] {
			width: auto;
			margin: 0;
		}
		.add-rule {
			border: 2px dashed var(--vscode-input-border);
			border-radius: 6px;
			padding: 24px;
			text-align: center;
			cursor: pointer;
			background-color: var(--vscode-editor-background);
			color: var(--vscode-descriptionForeground);
			font-size: 13px;
			transition: all 0.2s;
		}
		.add-rule:hover {
			background-color: var(--vscode-list-hoverBackground);
			border-color: var(--vscode-focusBorder);
			color: var(--vscode-foreground);
		}
		.status {
			margin-top: 12px;
			padding: 8px;
			border-radius: 2px;
			display: none;
		}
		.status.success {
			background-color: var(--vscode-notifications-background);
			color: var(--vscode-notifications-foreground);
			border: 1px solid var(--vscode-notifications-border);
		}
		.status.error {
			background-color: var(--vscode-inputValidation-errorBackground);
			color: var(--vscode-inputValidation-errorForeground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
		}
		.priority-badge {
			display: inline-block;
			padding: 3px 8px;
			border-radius: 4px;
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.priority-low { 
			background-color: var(--vscode-badge-background);
			color: var(--vscode-badge-foreground);
		}
		.priority-medium { 
			background-color: var(--vscode-statusBarItem-warningBackground);
			color: var(--vscode-statusBarItem-warningForeground);
		}
		.priority-high { 
			background-color: var(--vscode-statusBarItem-errorBackground);
			color: var(--vscode-statusBarItem-errorForeground);
		}
		.priority-critical { 
			background-color: var(--vscode-statusBarItem-errorBackground);
			color: var(--vscode-statusBarItem-errorForeground);
			animation: pulse 2s infinite;
		}
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.7; }
		}
	</style>
</head>
<body>
	<div class="header">
		<h2>Notification Rules Configuration</h2>
		<p>Configure priority and behavior for different notification sources. Rules are evaluated in priority order (Critical → High → Medium → Low).</p>
	</div>

	<div class="controls">
		<button id="addRuleBtn">+ Add Rule</button>
		<button id="resetBtn" class="secondary">Reset to Defaults</button>
		<button id="applyBtn">Apply Rules</button>
		<button id="saveBtn">Save</button>
	</div>

	<div id="rulesContainer" class="rules-container"></div>

	<div id="status" class="status"></div>

	<script>
		const vscode = acquireVsCodeApi();
		let rules = [];

		const rulesContainer = document.getElementById('rulesContainer');
		const addRuleBtn = document.getElementById('addRuleBtn');
		const resetBtn = document.getElementById('resetBtn');
		const applyBtn = document.getElementById('applyBtn');
		const saveBtn = document.getElementById('saveBtn');
		const statusDiv = document.getElementById('status');

		const sources = ${JSON.stringify(getMockSources())};
		const priorities = [
			{ value: 0, label: 'Low' },
			{ value: 1, label: 'Medium' },
			{ value: 2, label: 'High' },
			{ value: 3, label: 'Critical' }
		];
		const actions = [
			{ value: 'allow', label: 'Show Immediately' },
			{ value: 'suppress', label: 'Suppress' },
			{ value: 'digest', label: 'Digest (Sidebar)' }
		];

		function showStatus(message, type) {
			statusDiv.textContent = message;
			statusDiv.className = 'status ' + type;
			statusDiv.style.display = 'block';
			setTimeout(() => {
				statusDiv.style.display = 'none';
			}, 3000);
		}

		function getRuleDescription(rule) {
			// Use custom title if provided, otherwise generate one
			if (rule.title && rule.title.trim()) {
				return rule.title;
			}
			const source = rule.source === '*' ? 'Any source' : rule.source;
			const action = actions.find(a => a.value === rule.action)?.label || rule.action;
			const contains = rule.contains ? \` containing "\${rule.contains}"\` : '';
			return \`\${source}\${contains} → \${action}\`;
		}

		function renderRules() {
			rulesContainer.innerHTML = '';
			
			if (rules.length === 0) {
				rulesContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--vscode-descriptionForeground);">No rules configured. Click "Add Rule" to create one.</div>';
				const addDiv = document.createElement('div');
				addDiv.className = 'add-rule';
				addDiv.innerHTML = '<span>+ Click to add a new rule</span>';
				addDiv.onclick = addNewRule;
				rulesContainer.appendChild(addDiv);
				return;
			}
			
			// Sort by priority (highest first)
			const sorted = [...rules].sort((a, b) => b.priority - a.priority);
			
			sorted.forEach((rule, index) => {
				const ruleDiv = document.createElement('div');
				ruleDiv.className = 'rule-item';
				const description = getRuleDescription(rule);
				const priorityClass = ['priority-low', 'priority-medium', 'priority-high', 'priority-critical'][rule.priority] || 'priority-low';
				ruleDiv.innerHTML = \`
					<div class="rule-header">
						<div style="flex: 1;">
							<div class="form-group" style="margin-bottom: 8px;">
								<label style="font-size: 10px; margin-bottom: 4px;">Rule Title</label>
								<input type="text" class="rule-title-input" value="\${rule.title || ''}" placeholder="\${description}" onchange="updateRule(\${rules.indexOf(rule)}, 'title', this.value); renderRules();" style="font-weight: 600; font-size: 14px; padding: 6px;">
							</div>
							<div style="display: flex; gap: 8px; align-items: center; font-size: 11px; color: var(--vscode-descriptionForeground);">
								<span class="priority-badge \${priorityClass}">\${priorities.find(p => p.value === rule.priority)?.label || 'Unknown'}</span>
								<span>•</span>
								<span>\${rule.source === '*' ? 'All sources' : rule.source}</span>
								\${rule.contains ? \`<span>•</span><span>Contains: "\${rule.contains}"</span>\` : ''}
								\${rule.showInFocusMode ? '<span>•</span><span style="color: var(--vscode-textLink-foreground);">Focus mode exception</span>' : ''}
							</div>
						</div>
						<button class="delete-btn" onclick="deleteRule(\${rules.indexOf(rule)})" title="Delete rule">✕</button>
					</div>
					<div class="rule-fields">
						<div class="form-group">
							<label>Source</label>
							<select onchange="updateRule(\${rules.indexOf(rule)}, 'source', this.value); renderRules();">
								<option value="*">* (Any Source)</option>
								\${sources.map(s => \`<option value="\${s}" \${rule.source === s ? 'selected' : ''}>\${s}</option>\`).join('')}
							</select>
						</div>
						<div class="form-group">
							<label>Priority</label>
							<select onchange="updateRule(\${rules.indexOf(rule)}, 'priority', parseInt(this.value)); renderRules();">
								\${priorities.map(p => \`<option value="\${p.value}" \${rule.priority === p.value ? 'selected' : ''}>\${p.label}</option>\`).join('')}
							</select>
						</div>
						<div class="form-group">
							<label>Action</label>
							<select onchange="updateRule(\${rules.indexOf(rule)}, 'action', this.value); renderRules();">
								\${actions.map(a => \`<option value="\${a.value}" \${rule.action === a.value ? 'selected' : ''}>\${a.label}</option>\`).join('')}
							</select>
						</div>
						<div class="form-group">
							<label>Show in Focus Mode</label>
							<input type="checkbox" \${rule.showInFocusMode ? 'checked' : ''} onchange="updateRule(\${rules.indexOf(rule)}, 'showInFocusMode', this.checked); renderRules();" title="Allow this notification even when Focus mode is enabled">
						</div>
						<div class="form-group">
							<label>Contains (optional)</label>
							<input type="text" value="\${rule.contains || ''}" placeholder="e.g., failed, error" onchange="updateRule(\${rules.indexOf(rule)}, 'contains', this.value); renderRules();" title="Filter by text content (case-insensitive)">
						</div>
					</div>
				\`;
				rulesContainer.appendChild(ruleDiv);
			});

			const addDiv = document.createElement('div');
			addDiv.className = 'add-rule';
			addDiv.innerHTML = '<span>+ Click to add a new rule</span>';
			addDiv.onclick = addNewRule;
			rulesContainer.appendChild(addDiv);
		}

		function addNewRule() {
			rules.push({
				title: '',
				source: '*',
				priority: 1,
				action: 'digest',
				showInFocusMode: false,
				contains: ''
			});
			renderRules();
		}

		function deleteRule(index) {
			rules.splice(index, 1);
			renderRules();
		}

		function updateRule(index, field, value) {
			if (rules[index]) {
				rules[index][field] = value;
			}
		}

		addRuleBtn.addEventListener('click', addNewRule);
		
		resetBtn.addEventListener('click', () => {
			vscode.postMessage({ command: 'resetRules' });
		});

		applyBtn.addEventListener('click', () => {
			vscode.postMessage({ command: 'applyRules' });
		});

		saveBtn.addEventListener('click', () => {
			vscode.postMessage({ command: 'saveRules', rules: rules });
		});

		window.deleteRule = deleteRule;
		window.updateRule = updateRule;

		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'rulesLoaded':
					rules = message.rules;
					renderRules();
					break;
				case 'rulesSaved':
					showStatus(message.message, 'success');
					break;
				case 'rulesApplied':
					showStatus(message.message, 'success');
					break;
				case 'error':
					showStatus(message.message, 'error');
					break;
			}
		});

		// Request rules on load
		vscode.postMessage({ command: 'loadRules' });
	</script>
</body>
	</html>`;
	}
}

