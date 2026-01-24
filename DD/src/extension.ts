// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Status bar item for unread items
let statusBarItem: vscode.StatusBarItem;
let unreadCount = 0;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "DD" is now active!');

	// Create status bar item for unread items
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100 // Priority (higher = more to the left)
	);
	
	statusBarItem.command = 'DD.showUnreadItems';
	statusBarItem.tooltip = 'Click to view unread items';
	updateStatusBarItem();
	statusBarItem.show();
	
	context.subscriptions.push(statusBarItem);

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

	// Command to show unread items when status bar is clicked
	const showUnreadCommand = vscode.commands.registerCommand('DD.showUnreadItems', async () => {
		try {
			if (unreadCount === 0) {
				vscode.window.showInformationMessage('No unread items');
			} else {
				vscode.window.showInformationMessage(`You have ${unreadCount} unread item${unreadCount === 1 ? '' : 's'}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to show unread items: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to increment unread count (for testing)
	const incrementUnreadCommand = vscode.commands.registerCommand('DD.incrementUnread', async () => {
		try {
			unreadCount++;
			updateStatusBarItem();
			vscode.window.showInformationMessage(`Unread count increased to ${unreadCount}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to increment: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	// Command to clear unread count
	const clearUnreadCommand = vscode.commands.registerCommand('DD.clearUnread', async () => {
		try {
			unreadCount = 0;
			updateStatusBarItem();
			vscode.window.showInformationMessage('Unread items cleared');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to clear: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	});

	context.subscriptions.push(disposable, showUnreadCommand, incrementUnreadCommand, clearUnreadCommand);
}

function updateStatusBarItem(): void {
	if (unreadCount === 0) {
		statusBarItem.text = '$(bell) 0 unread';
		statusBarItem.backgroundColor = undefined;
	} else {
		statusBarItem.text = `$(bell-dot) ${unreadCount} unread`;
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
