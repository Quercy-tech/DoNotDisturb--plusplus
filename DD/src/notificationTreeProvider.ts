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
		this.tooltip = `${this.label}: ${count} notification${count === 1 ? '' : 's'} (digested - shown in sidebar)`;
		this.description = `${count} item${count === 1 ? '' : 's'}`;
		this.iconPath = new vscode.ThemeIcon(this.icon);
		this.contextValue = 'category';
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
		// Truncate long titles to reduce visual clutter
		const maxTitleLength = 50;
		const displayTitle = notification.input.title.length > maxTitleLength 
			? notification.input.title.substring(0, maxTitleLength) + '...'
			: notification.input.title;
		
		super(displayTitle, vscode.TreeItemCollapsibleState.None);
		
		// Show shorter time format
		const timeAgo = this.getTimeAgo(notification.timestamp);
		// Truncate body in description to reduce clutter
		const bodyPreview = notification.input.body.length > 35 
			? notification.input.body.substring(0, 35) + '...'
			: notification.input.body;
		this.description = `${timeAgo} • ${bodyPreview}`;
		this.tooltip = `${notification.input.source}: ${notification.input.title}\n\n${notification.input.body}\n\nTime: ${new Date(notification.timestamp).toLocaleString()}\n\nClick or right-click to mark as read`;
		this.contextValue = 'notification';
		this.command = {
			command: 'DD.markNotificationAsRead',
			title: 'Mark as Read',
			arguments: [this]
		};
		
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
	private notificationManager?: any; // Reference to NotificationManager for marking as read

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	updateNotifications(notifications: ProcessedNotification[]): void {
		this.notifications = notifications;
		this.refresh();
	}

	setNotificationManager(manager: any): void {
		this.notificationManager = manager;
	}

	getNotificationByIndex(index: number): ProcessedNotification | undefined {
		if (index >= 0 && index < this.notifications.length) {
			return this.notifications[index];
		}
		return undefined;
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
		// If no notifications, return empty array (tree view will show empty state)
		if (this.notifications.length === 0) {
			return [];
		}

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
			
			// Collapse by default to reduce visual clutter (less overwhelming)
			const categoryItem = new NotificationCategoryItem(
				source,
				vscode.TreeItemCollapsibleState.Collapsed,
				config.icon,
				notifications.length
			);

			// Create notification items for this category
			// Limit to 10 most recent per category to reduce overwhelming list
			const sortedNotifications = notifications
				.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
			
			// Find indices in the original digested notifications array
			categoryItem.children = sortedNotifications.slice(0, 10).map((n) => {
				return new NotificationItem(n, source);
			});
			
			// Update count to show if there are more
			if (notifications.length > 10) {
				categoryItem.description = `10 of ${notifications.length} items`;
				categoryItem.tooltip = `${categoryItem.label}: ${notifications.length} notification${notifications.length === 1 ? '' : 's'} (showing 10 most recent)`;
			}

			categories.push(categoryItem);
		}

		return categories;
	}
}

