/**
 * Tree view provider for displaying digested notifications in the sidebar.
 * @module notificationTreeProvider
 */

import * as vscode from 'vscode';
import type { ProcessedNotification } from './notificationManager.js';

/**
 * Tree item for notification categories (sources)
 */
class NotificationCategoryItem extends vscode.TreeItem {
	children: NotificationItem[] = [];
	public readonly icon: string;

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		icon: string,
		public readonly count: number
	) {
		super(label, collapsibleState);
		this.icon = icon;
		this.tooltip = `${this.label} (${count} notification${count === 1 ? '' : 's'})`;
		this.description = `${count}`;
		this.iconPath = new vscode.ThemeIcon(this.icon);
	}
}

/**
 * Tree item for individual notifications
 */
class NotificationItem extends vscode.TreeItem {
	constructor(
		public readonly notification: ProcessedNotification,
		public readonly category: string
	) {
		super(notification.input.title, vscode.TreeItemCollapsibleState.None);
		
		this.description = this.getTimeAgo(notification.timestamp);
		this.tooltip = `${notification.input.source}: ${notification.input.title}\n${notification.input.body}\n${new Date(notification.timestamp).toLocaleString()}`;
		this.contextValue = 'notification';
		
		// Set icon based on source
		this.iconPath = this.getIconForSource(notification.input.source);
		
		// Set color based on source importance
		this.resourceUri = vscode.Uri.parse(`notification://${notification.input.source}/${notification.timestamp}`);
	}

	private getTimeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	private getIconForSource(source: string): vscode.ThemeIcon {
		const iconMap: Record<string, string> = {
			'Git': 'git-branch',
			'Extension': 'extensions',
			'Build': 'tools',
			'Debug': 'debug',
			'Test': 'beaker',
			'Language Server': 'server-process',
			'File System': 'file',
		};
		return new vscode.ThemeIcon(iconMap[source] || 'bell');
	}
}

/**
 * Tree data provider for notifications
 */
export class NotificationTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private notifications: ProcessedNotification[] = [];

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	updateNotifications(notifications: ProcessedNotification[]): void {
		this.notifications = notifications;
		this.refresh();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
		if (!element) {
			// Root level: show categories
			return this.getCategories();
		}

		if (element instanceof NotificationCategoryItem) {
			// Return notifications for this category
			return element.children;
		}

		return [];
	}

	private getCategories(): NotificationCategoryItem[] {
		// Group notifications by source
		const grouped = new Map<string, ProcessedNotification[]>();
		
		for (const notification of this.notifications) {
			const source = notification.input.source;
			if (!grouped.has(source)) {
				grouped.set(source, []);
			}
			grouped.get(source)!.push(notification);
		}

		// Create category items
		const categories: NotificationCategoryItem[] = [];
		
		// Define category order and icons
		const categoryConfig: Record<string, { icon: string; priority: number }> = {
			'Git': { icon: 'git-branch', priority: 1 },
			'Build': { icon: 'tools', priority: 2 },
			'Test': { icon: 'beaker', priority: 3 },
			'Debug': { icon: 'debug', priority: 4 },
			'Extension': { icon: 'extensions', priority: 5 },
			'Language Server': { icon: 'server-process', priority: 6 },
			'File System': { icon: 'file', priority: 7 },
		};

		// Sort by priority
		const sortedSources = Array.from(grouped.keys()).sort((a, b) => {
			const aPriority = categoryConfig[a]?.priority || 999;
			const bPriority = categoryConfig[b]?.priority || 999;
			return aPriority - bPriority;
		});

		for (const source of sortedSources) {
			const notifications = grouped.get(source)!;
			const config = categoryConfig[source] || { icon: 'bell', priority: 999 };
			
			const categoryItem = new NotificationCategoryItem(
				source,
				vscode.TreeItemCollapsibleState.Expanded,
				config.icon,
				notifications.length
			);

			// Create notification items for this category
			categoryItem.children = notifications
				.sort((a, b) => b.timestamp - a.timestamp) // Most recent first
				.map(n => new NotificationItem(n, source));

			categories.push(categoryItem);
		}

		return categories;
	}
}

