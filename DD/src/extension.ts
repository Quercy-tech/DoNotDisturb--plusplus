// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NotificationManager } from './notificationManager.js';
import { getMockSources } from './integrations/mockIntegrations.js';
import { NotificationTreeProvider } from './notificationTreeProvider.js';

// Status bar item for important items
let statusBarItem: vscode.StatusBarItem;
let notificationManager: NotificationManager;
let notificationTreeProvider: NotificationTreeProvider;
let mockNotificationInterval: NodeJS.Timeout | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "DD" is now active!');

	// Initialize notification manager
	notificationManager = new NotificationManager();
	
	// Update rules to make some notifications important (allow) and others unimportant (digest)
	notificationManager.setRules([
		// Important: Errors and failures should be shown immediately
		{ source: 'Build', contains: 'failed', action: 'allow' },
		{ source: 'Test', contains: 'failed', action: 'allow' },
		{ source: 'Debug', contains: 'Exception', action: 'allow' },
		{ source: 'Extension', contains: 'error', action: 'allow' },
		{ source: 'Git', contains: 'conflict', action: 'allow' },
		
		// Suppress: Success messages
		{ source: 'Build', contains: 'succeeded', action: 'suppress' },
		{ source: 'Test', contains: 'passed', action: 'suppress' },
		{ source: 'Git', contains: 'completed', action: 'suppress' },
		
		// Everything else goes to digest (unimportant - sidebar)
		{ source: '*', action: 'digest' },
	]);
	
	// Set callbacks
	notificationManager.setUnreadCountCallback(() => {
		// Update tree view when digested notifications change
		notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
	});
	
	notificationManager.setImportantCountCallback((count) => {
		// Update status bar when important notifications change
		updateStatusBarItem();
	});

	// Create tree view for unimportant notifications (sidebar)
	notificationTreeProvider = new NotificationTreeProvider();
	const treeView = vscode.window.createTreeView('ddNotifications', {
		treeDataProvider: notificationTreeProvider,
		showCollapseAll: true,
	});
	context.subscriptions.push(treeView);

	// Create status bar item for important items
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100 // Priority (higher = more to the left)
	);
	
	statusBarItem.command = 'DD.showImportantItems';
	statusBarItem.tooltip = 'Click to view important notifications';
	updateStatusBarItem();
	statusBarItem.show();
	
	context.subscriptions.push(statusBarItem);

	// Start mock notification generator (every 5 seconds)
	startMockNotificationGenerator();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('DD.helloWorld', async () => {
		try {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage('Hello World from DoNotDisturb++!');
		} catch (error) {
			vscode.window.showErrorMessage(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to show important items when status bar is clicked
	const showImportantCommand = vscode.commands.registerCommand('DD.showImportantItems', async () => {
		try {
			const count = notificationManager.getImportantCount();
			const important = notificationManager.getImportantNotifications();
			
			if (count === 0) {
				vscode.window.showInformationMessage('No important notifications');
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
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to show important items: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to refresh tree view
	const refreshTreeCommand = vscode.commands.registerCommand('DD.refreshNotifications', () => {
		notificationTreeProvider.updateNotifications(notificationManager.getDigestedNotifications());
	});

	// Command to clear digested notifications
	const clearDigestedCommand = vscode.commands.registerCommand('DD.clearDigested', async () => {
		try {
			notificationManager.clearDigested();
			notificationTreeProvider.updateNotifications([]);
			vscode.window.showInformationMessage('Digested notifications cleared');
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
			notificationManager.clearImportant();
			vscode.window.showInformationMessage('Important notifications cleared');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to clear: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
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

	context.subscriptions.push(
		disposable, 
		showImportantCommand,
		refreshTreeCommand,
		clearDigestedCommand,
		clearImportantCommand,
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
	const count = notificationManager ? notificationManager.getImportantCount() : 0;
	if (count === 0) {
		statusBarItem.text = '$(check) All clear';
		statusBarItem.backgroundColor = undefined;
		statusBarItem.color = undefined;
	} else {
		statusBarItem.text = `$(warning) ${count} important`;
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (mockNotificationInterval) {
		clearInterval(mockNotificationInterval);
		mockNotificationInterval = undefined;
	}
}
