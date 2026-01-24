// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NotificationManager } from './notificationManager.js';
import { getMockSources } from './integrations/mockIntegrations.js';
import { NotificationTreeProvider } from './notificationTreeProvider.js';
import { ChatPanel } from './chatPanel.js';
import { RulesPanel } from './rulesPanel.js';
import { loadRuleConfigs, convertToRoutingRules } from './rulesConfig.js';

// Status bar items
let statusBarItem: vscode.StatusBarItem;
let notificationManager: NotificationManager;
let notificationTreeProvider: NotificationTreeProvider;
let mockNotificationInterval: NodeJS.Timeout | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const extensionUri = context.extensionUri;

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "DD" is now active!');

	// Initialize notification manager
	notificationManager = new NotificationManager();
	
	// Get user name from VS Code configuration or environment
	const config = vscode.workspace.getConfiguration('dd');
	const userName = config.get<string>('userName') || process.env.USER || process.env.USERNAME || 'user';
	notificationManager.setUserName(userName);
	
	// Load and apply configurable rules
	const ruleConfigs = loadRuleConfigs();
	const focusMode = notificationManager.isFocusMode();
	const routingRules = convertToRoutingRules(ruleConfigs, focusMode);
	notificationManager.setRules(routingRules);
	
	// Set callbacks
	notificationManager.setUnreadCountCallback(() => {
		// Update tree view when digested notifications change
		notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
	});
	
	notificationManager.setImportantCountCallback((count) => {
		// Update status bar when important notifications change
		updateStatusBarItem();
	});

	notificationManager.setFocusModeCallback((enabled) => {
		// Update status bar when focus mode changes
		updateStatusBarItem();
		// Reapply rules when focus mode changes (rules may differ in focus mode)
		const ruleConfigs = loadRuleConfigs();
		const routingRules = convertToRoutingRules(ruleConfigs, enabled);
		notificationManager.setRules(routingRules);
	});

	notificationManager.setAFKModeCallback((enabled: boolean) => {
		// Update status bar when AFK mode changes
		updateStatusBarItem();
	});

	// Create tree view for unimportant notifications (sidebar)
	notificationTreeProvider = new NotificationTreeProvider();
	notificationTreeProvider.setNotificationManager(notificationManager);
	const treeView = vscode.window.createTreeView('ddNotifications', {
		treeDataProvider: notificationTreeProvider,
		showCollapseAll: true,
	});
	context.subscriptions.push(treeView);

	// Command to mark a notification as read from tree view
	const markNotificationAsReadCommand = vscode.commands.registerCommand('DD.markNotificationAsRead', async (item: any) => {
		try {
			if (!item) {
				return;
			}

			// Handle NotificationItem from tree view
			if (item.notification) {
				const notification = item.notification;
				// Find the notification in the digested list and mark as read
				const digested = notificationManager.getDigestedNotifications();
				const index = digested.findIndex(n => 
					n.timestamp === notification.timestamp &&
					n.input.source === notification.input.source &&
					n.input.title === notification.input.title
				);
				
				if (index >= 0) {
					notificationManager.markAsRead(index);
					notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
					vscode.window.showInformationMessage(`Marked "${notification.input.title}" as read`);
				} else {
					vscode.window.showInformationMessage('Notification not found');
				}
			} else if (item && 'index' in item && typeof item.index === 'number') {
				// Direct index access (fallback)
				notificationManager.markAsRead(item.index);
				notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
				vscode.window.showInformationMessage('Notification marked as read');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to mark as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Create unified status bar item (shows focus mode or important count)
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100 // Priority (higher = more to the left)
	);
	
	statusBarItem.command = 'DD.toggleFocusOrShowImportant';
	updateStatusBarItem();
	statusBarItem.show();
	
	context.subscriptions.push(statusBarItem);

	// Start mock notification generator (every 5 seconds)
	startMockNotificationGenerator();


	// Unified command: toggle focus mode or show important items
	const toggleFocusOrShowImportantCommand = vscode.commands.registerCommand('DD.toggleFocusOrShowImportant', async () => {
		try {
			if (notificationManager.isFocusMode()) {
				// If in focus mode, toggle it off and show what was missed
				notificationManager.toggleFocusMode();
				const missed = notificationManager.getImportantNotifications();
				
				if (missed.length > 0) {
					const items = missed.map((n, i) => ({
						label: `$(warning) ${n.input.source}: ${n.input.title}`,
						description: n.input.body,
						detail: new Date(n.timestamp).toLocaleTimeString(),
						index: i,
					}));

					const selected = await vscode.window.showQuickPick(items, {
						placeHolder: `Focus mode disabled. You missed ${missed.length} important notification${missed.length === 1 ? '' : 's'}`,
						canPickMany: false,
					});

					if (selected && 'index' in selected) {
						notificationManager.markImportantAsRead(selected.index);
						vscode.window.showInformationMessage(`Marked "${selected.label}" as read`);
					}
				} else {
					vscode.window.showInformationMessage('Focus mode disabled - no missed notifications');
					updateStatusBarItem();
				}
			} else {
				// Not in focus mode - show important items
				const count = notificationManager.getImportantCount();
				const important = notificationManager.getImportantNotifications();
				
				if (count === 0) {
					// Offer to enable focus mode if no important notifications
					const action = await vscode.window.showInformationMessage(
						'No important notifications',
						'Enable Focus Mode'
					);
					if (action === 'Enable Focus Mode') {
						notificationManager.toggleFocusMode();
					}
				} else {
					// Show list of important items
					const items = important.map((n, i) => ({
						label: `$(warning) ${n.input.source}: ${n.input.title}`,
						description: n.input.body,
						detail: new Date(n.timestamp).toLocaleTimeString(),
						index: i,
					}));

					const selected = await vscode.window.showQuickPick(items, {
						placeHolder: `You have ${count} important notification${count === 1 ? '' : 's'}`,
						canPickMany: false,
					});

					if (selected && 'index' in selected) {
						notificationManager.markImportantAsRead(selected.index);
						vscode.window.showInformationMessage(`Marked "${selected.label}" as read`);
					}
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to toggle AFK mode
	const toggleAFKCommand = vscode.commands.registerCommand('DD.toggleAFK', async () => {
		try {
			const enabled = notificationManager.toggleAFKMode();
			if (enabled) {
				vscode.window.showInformationMessage('AFK mode enabled - all notifications will be queued');
			} else {
				// Show sorted list of all missed notifications when deactivating AFK
				const allNotifications = notificationManager.getAllNotificationsSorted();
				
				if (allNotifications.length > 0) {
					// Get important and digested separately
					const important = notificationManager.getImportantNotifications();
					const digested = notificationManager.getDigestedNotifications();

					// Create sorted items: important first, then by timestamp
					const items: Array<{
						label: string;
						description: string;
						detail: string;
						source: string;
						isImportant: boolean;
						timestamp: number;
					}> = [];

					// Add important notifications first
					important.forEach((n) => {
						items.push({
							label: `$(warning) ${n.input.source}: ${n.input.title}`,
							description: n.input.body,
							detail: `Important • ${new Date(n.timestamp).toLocaleString()}`,
							source: n.input.source,
							isImportant: true,
							timestamp: n.timestamp,
						});
					});

					// Add digested notifications
					digested.forEach(n => {
						items.push({
							label: `$(info) ${n.input.source}: ${n.input.title}`,
							description: n.input.body,
							detail: `Digested • ${new Date(n.timestamp).toLocaleString()}`,
							source: n.input.source,
							isImportant: false,
							timestamp: n.timestamp,
						});
					});

					// Sort: important first, then by timestamp (newest first)
					items.sort((a, b) => {
						if (a.isImportant !== b.isImportant) {
							return a.isImportant ? -1 : 1;
						}
						return b.timestamp - a.timestamp;
					});

					// Add "Mark all as read" option at the top
					const markAllItem = {
						label: '$(check-all) Mark All as Read',
						description: `Clear all ${allNotifications.length} notification${allNotifications.length === 1 ? '' : 's'}`,
						detail: 'Click to dismiss all notifications',
						isMarkAll: true,
					};

					const selected = await vscode.window.showQuickPick([markAllItem, ...items], {
						placeHolder: `AFK mode disabled. You have ${allNotifications.length} notification${allNotifications.length === 1 ? '' : 's'} (${important.length} important, ${digested.length} digested)`,
						canPickMany: false,
					});

					if (selected) {
						if ('isMarkAll' in selected && selected.isMarkAll) {
							// Mark all as read
							notificationManager.clearImportant();
							notificationManager.clearDigested();
							updateStatusBarItem();
							vscode.window.showInformationMessage(`Marked all ${allNotifications.length} notification${allNotifications.length === 1 ? '' : 's'} as read`);
						} else if ('isImportant' in selected) {
							// Regular notification item
							if (selected.isImportant) {
								const index = important.findIndex(n => 
									n.input.source === selected.source && 
									n.timestamp === selected.timestamp
								);
								if (index >= 0) {
									notificationManager.markImportantAsRead(index);
									updateStatusBarItem();
								}
								vscode.window.showInformationMessage(`Marked "${selected.label}" as read`);
							} else {
								const index = digested.findIndex(n => 
									n.input.source === selected.source && 
									n.timestamp === selected.timestamp
								);
								if (index >= 0) {
									notificationManager.markAsRead(index);
								}
								vscode.window.showInformationMessage(`Marked "${selected.label}" as read`);
							}
						}
					}
				} else {
					vscode.window.showInformationMessage('AFK mode disabled - no missed notifications');
					updateStatusBarItem();
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to toggle AFK mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Keep the separate toggle command for keyboard shortcut
	const toggleFocusCommand = vscode.commands.registerCommand('DD.toggleFocus', async () => {
		try {
			const enabled = notificationManager.toggleFocusMode();
			if (enabled) {
				// Don't clear important notifications - we want to show them when focus mode is turned off
				vscode.window.showInformationMessage('Focus mode enabled - all notifications silenced (except @mentions)');
			} else {
				// Show missed notifications when disabling focus mode
				const missed = notificationManager.getImportantNotifications();
				if (missed.length > 0) {
					const items = missed.map((n, i) => ({
						label: `$(warning) ${n.input.source}: ${n.input.title}`,
						description: n.input.body,
						detail: new Date(n.timestamp).toLocaleTimeString(),
						index: i,
					}));

					const selected = await vscode.window.showQuickPick(items, {
						placeHolder: `Focus mode disabled. You missed ${missed.length} important notification${missed.length === 1 ? '' : 's'}`,
						canPickMany: false,
					});

					if (selected && 'index' in selected) {
						notificationManager.markImportantAsRead(selected.index);
						updateStatusBarItem();
						vscode.window.showInformationMessage(`Marked "${selected.label}" as read`);
					}
				} else {
					vscode.window.showInformationMessage('Focus mode disabled - no missed notifications');
					updateStatusBarItem();
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to toggle focus mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to refresh tree view
	const refreshTreeCommand = vscode.commands.registerCommand('DD.refreshNotifications', () => {
		notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
	});

		// Command to clear digested notifications
		const clearDigestedCommand = vscode.commands.registerCommand('DD.clearDigested', async () => {
			try {
				const count = notificationManager.getUnreadCount();
				if (count === 0) {
					vscode.window.showInformationMessage('No digested notifications to clear');
					return;
				}
				notificationManager.clearDigested();
				notificationTreeProvider.updateNotifications([]);
				vscode.window.showInformationMessage(`Cleared ${count} digested notification${count === 1 ? '' : 's'}`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to clear: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});

	// Command to generate a mock notification manually
	const generateMockCommand = vscode.commands.registerCommand('DD.generateMockNotification', async () => {
		try {
			await notificationManager.generateAndProcessMockNotification();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to generate notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to generate notification from specific source
	const generateFromSourceCommand = vscode.commands.registerCommand('DD.generateFromSource', async () => {
		try {
			const sources = getMockSources();
			const selected = await vscode.window.showQuickPick(sources, {
				placeHolder: 'Select a source to generate notification from',
			});
			
			if (selected) {
				await notificationManager.generateAndProcessMockNotification(selected);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to generate notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

		// Command to clear important notifications
		const clearImportantCommand = vscode.commands.registerCommand('DD.clearImportant', async () => {
			try {
				const count = notificationManager.getImportantCount();
				if (count === 0) {
					vscode.window.showInformationMessage('No important notifications to clear');
					return;
				}
				notificationManager.clearImportant();
				updateStatusBarItem();
				vscode.window.showInformationMessage(`Cleared ${count} important notification${count === 1 ? '' : 's'}`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to clear: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		});

	// Command to set user name
	const setUserNameCommand = vscode.commands.registerCommand('DD.setUserName', async () => {
		try {
			const currentName = notificationManager.getUserName();
			const input = await vscode.window.showInputBox({
				prompt: 'Enter your name for @mention detection',
				placeHolder: currentName,
				value: currentName,
			});
			
			if (input !== undefined) {
				notificationManager.setUserName(input);
				const config = vscode.workspace.getConfiguration('dd');
				await config.update('userName', input, vscode.ConfigurationTarget.Global);
				vscode.window.showInformationMessage(`User name set to: ${input}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to set user name: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to open chat panel
	const openChatPanelCommand = vscode.commands.registerCommand('DD.openChatPanel', () => {
		ChatPanel.createOrShow(extensionUri, notificationManager);
	});

	// Command to send a custom chat message (opens panel) - same as openChatPanel
	const sendChatMessageCommand = vscode.commands.registerCommand('DD.sendChatMessage', () => {
		ChatPanel.createOrShow(extensionUri, notificationManager);
	});

	// Command to open rules configuration panel
	const openRulesPanelCommand = vscode.commands.registerCommand('DD.openRulesPanel', () => {
		RulesPanel.createOrShow(extensionUri, notificationManager);
	});

	// Command to toggle mock notification generator
	const toggleGeneratorCommand = vscode.commands.registerCommand('DD.toggleMockGenerator', async () => {
		try {
			if (mockNotificationInterval) {
				clearInterval(mockNotificationInterval);
				mockNotificationInterval = undefined;
				vscode.window.showInformationMessage('Mock notification generator stopped');
			} else {
				startMockNotificationGenerator();
				vscode.window.showInformationMessage('Mock notification generator started');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to toggle generator: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Handle webview panel restoration
	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer('chatPanel', {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				ChatPanel.revive(webviewPanel, extensionUri, notificationManager);
			}
		});
		vscode.window.registerWebviewPanelSerializer('rulesPanel', {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				RulesPanel.revive(webviewPanel, extensionUri, notificationManager);
			}
		});
	}

	context.subscriptions.push(
		toggleFocusOrShowImportantCommand,
		toggleFocusCommand,
		toggleAFKCommand,
		refreshTreeCommand,
		clearDigestedCommand,
		clearImportantCommand,
		markNotificationAsReadCommand,
		setUserNameCommand,
		openChatPanelCommand,
		sendChatMessageCommand,
		openRulesPanelCommand,
		generateMockCommand,
		generateFromSourceCommand,
		toggleGeneratorCommand
	);
}

function startMockNotificationGenerator(): void {
	// Generate a mock notification every 5 seconds
	mockNotificationInterval = setInterval(async () => {
		try {
			await notificationManager.generateAndProcessMockNotification();
		} catch (error) {
			console.error('Error generating mock notification:', error);
		}
	}, 5000);
}

function updateStatusBarItem(): void {
	if (!statusBarItem || !notificationManager) {
		return;
	}
	
	const isAFKMode = notificationManager.isAFKMode();
	const isFocusMode = notificationManager.isFocusMode();
	
	if (isAFKMode) {
		// Show AFK mode
		statusBarItem.text = '$(circle-slash) AFK';
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
		statusBarItem.tooltip = 'AFK mode: All notifications queued. Click to disable and see missed notifications.';
	} else if (isFocusMode) {
		// Show focus mode
		statusBarItem.text = '$(eye-closed) Focus';
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
		statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
		statusBarItem.tooltip = 'Focus mode: All notifications silenced (except @mentions). Click to disable and see missed notifications.';
	} else {
		// Show important count
		const count = notificationManager.getImportantCount();
		if (count === 0) {
			statusBarItem.text = '$(check) All clear';
			statusBarItem.backgroundColor = undefined;
			statusBarItem.color = undefined;
			statusBarItem.tooltip = 'Click to view notifications or enable Focus mode';
		} else {
			statusBarItem.text = `$(warning) ${count} important`;
			statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
			statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
			statusBarItem.tooltip = `Click to view ${count} important notification${count === 1 ? '' : 's'}`;
		}
	}
	
	statusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (mockNotificationInterval) {
		clearInterval(mockNotificationInterval);
		mockNotificationInterval = undefined;
	}
}
