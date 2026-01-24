/**
 * Chat panel webview for sending messages through a settings-like interface.
 * @module chatPanel
 */

import * as vscode from 'vscode';
import type { NotificationManager } from './notificationManager.js';
import { getMockSources } from './integrations/mockIntegrations.js';

/**
 * Chat panel webview provider
 */
export class ChatPanel {
	private static currentPanel: ChatPanel | undefined;
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
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose, null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case 'sendMessage':
						await this._handleSendMessage(message.text, message.source);
						return;
					case 'getUserName':
						this._panel.webview.postMessage({
							command: 'userName',
							userName: this._notificationManager.getUserName(),
						});
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
		if (ChatPanel.currentPanel) {
			ChatPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel
		const panel = vscode.window.createWebviewPanel(
			'chatPanel',
			'Chat Messages',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
			}
		);

		ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, notificationManager);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, notificationManager: NotificationManager): void {
		ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, notificationManager);
	}

	public dispose(): void {
		ChatPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _handleSendMessage(text: string, source: string): Promise<void> {
		if (!text || text.trim().length === 0) {
			this._panel.webview.postMessage({
				command: 'error',
				message: 'Message cannot be empty',
			});
			return;
		}

		try {
			await this._notificationManager.processCustomNotification(
				source || 'Chat',
				'Message received',
				text
			);

			this._panel.webview.postMessage({
				command: 'messageSent',
				message: 'Message sent successfully!',
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'error',
				message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
		}
	}

	private _update(): void {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const sources = ['Chat', ...getMockSources()];
		const sourcesOptions = sources.map(s => `<option value="${s}">${s}</option>`).join('\n');

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Chat Messages</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			margin-bottom: 8px;
			font-weight: 600;
			color: var(--vscode-foreground);
		}
		select, textarea {
			width: 100%;
			padding: 8px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-family: var(--vscode-font-family);
			font-size: 13px;
			border-radius: 2px;
		}
		textarea {
			min-height: 120px;
			resize: vertical;
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
			margin-right: 8px;
			transition: background-color 0.2s;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		button.secondary:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
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
		.hint {
			margin-top: 8px;
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			line-height: 1.4;
		}
		.user-name {
			margin-bottom: 20px;
			padding: 12px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 4px;
			font-size: 12px;
			border-left: 3px solid var(--vscode-textLink-foreground);
		}
		.user-name strong {
			color: var(--vscode-foreground);
		}
		h2 {
			margin-top: 0;
			margin-bottom: 20px;
			font-size: 18px;
			font-weight: 600;
		}
	</style>
</head>
<body>
	<h2>Send Chat Message</h2>
	
	<div class="user-name">
		<strong>Your name:</strong> <span id="userName">Loading...</span>
		<div class="hint">Messages containing @yourname will be marked as important</div>
	</div>

	<div class="form-group">
		<label for="source">Notification Source:</label>
		<select id="source">
			${sourcesOptions}
		</select>
	</div>

	<div class="form-group">
		<label for="message">Message:</label>
		<textarea id="message" placeholder="Type your message here... (e.g., @john please review the PR)"></textarea>
		<div class="hint">Use @name to mention someone. Mentions will be marked as important notifications.</div>
	</div>

	<button id="sendBtn">Send Message</button>
	<button id="clearBtn" class="secondary">Clear</button>

	<div id="status" class="status"></div>

	<script>
		const vscode = acquireVsCodeApi();
		const sourceSelect = document.getElementById('source');
		const messageTextarea = document.getElementById('message');
		const sendBtn = document.getElementById('sendBtn');
		const clearBtn = document.getElementById('clearBtn');
		const statusDiv = document.getElementById('status');
		const userNameSpan = document.getElementById('userName');

		// Request user name
		vscode.postMessage({ command: 'getUserName' });

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'userName':
					userNameSpan.textContent = message.userName || 'Not set';
					break;
				case 'messageSent':
					showStatus(message.message, 'success');
					messageTextarea.value = '';
					break;
				case 'error':
					showStatus(message.message, 'error');
					break;
			}
		});

		function showStatus(message, type) {
			statusDiv.textContent = message;
			statusDiv.className = 'status ' + type;
			statusDiv.style.display = 'block';
			setTimeout(() => {
				statusDiv.style.display = 'none';
			}, 3000);
		}

		sendBtn.addEventListener('click', () => {
			const text = messageTextarea.value.trim();
			const source = sourceSelect.value;
			
			if (!text) {
				showStatus('Message cannot be empty', 'error');
				return;
			}

			sendBtn.disabled = true;
			vscode.postMessage({
				command: 'sendMessage',
				text: text,
				source: source
			});

			setTimeout(() => {
				sendBtn.disabled = false;
			}, 1000);
		});

		clearBtn.addEventListener('click', () => {
			messageTextarea.value = '';
			statusDiv.style.display = 'none';
		});

		// Allow Enter+Shift for new line, Enter alone to send
		messageTextarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendBtn.click();
			}
		});
	</script>
</body>
</html>`;
	}
}

