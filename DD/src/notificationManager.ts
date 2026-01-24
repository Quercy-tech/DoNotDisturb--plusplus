/**
 * Notification manager that handles routing and tracking of notifications.
 * @module notificationManager
 */

import * as vscode from 'vscode';
import { route, type Action, type NotificationInput, type Rule, type RouterState } from './core/index.js';
import { generateMockNotification, generateMockNotificationFromSource } from './integrations/mockIntegrations.js';

/**
 * A processed notification with its routing result
 */
export interface ProcessedNotification {
	input: NotificationInput;
	action: Action;
	timestamp: number;
}

/**
 * Notification manager that handles routing and tracking
 */
export class NotificationManager {
	private processedNotifications: ProcessedNotification[] = [];
	private digestedNotifications: ProcessedNotification[] = [];
	private importantNotifications: ProcessedNotification[] = []; // "allow" action notifications
	private rules: Rule[] = [];
	private state: RouterState = { focusMode: false, afkMode: false };
	private userName: string = '';
	private onUnreadCountChanged?: (count: number) => void;
	private onImportantCountChanged?: (count: number) => void;
	private onFocusModeChanged?: (enabled: boolean) => void;
	private onAFKModeChanged?: (enabled: boolean) => void;

	constructor() {
		// Default rules
		this.rules = [
			{ source: 'Git', contains: 'conflict', action: 'suppress' },
			{ source: 'Build', contains: 'succeeded', action: 'suppress' },
			{ source: 'Test', contains: 'passed', action: 'suppress' },
			{ source: '*', action: 'digest' }, // Default: digest everything
		];
	}

	/**
	 * Set callback for when unread count changes
	 */
	setUnreadCountCallback(callback: (count: number) => void): void {
		this.onUnreadCountChanged = callback;
	}

	/**
	 * Set callback for when important notification count changes
	 */
	setImportantCountCallback(callback: (count: number) => void): void {
		this.onImportantCountChanged = callback;
	}

	/**
	 * Set callback for when focus mode changes
	 */
	setFocusModeCallback(callback: (enabled: boolean) => void): void {
		this.onFocusModeChanged = callback;
	}

	/**
	 * Set user name for @mention detection
	 */
	setUserName(name: string): void {
		this.userName = name;
	}

	/**
	 * Get user name
	 */
	getUserName(): string {
		return this.userName;
	}

	/**
	 * Toggle focus mode
	 */
	toggleFocusMode(): boolean {
		this.state.focusMode = !this.state.focusMode;
		this.notifyFocusModeChanged();
		return this.state.focusMode;
	}

	/**
	 * Get focus mode state
	 */
	isFocusMode(): boolean {
		return this.state.focusMode;
	}

	/**
	 * Toggle AFK mode
	 */
	toggleAFKMode(): boolean {
		this.state.afkMode = !this.state.afkMode;
		this.notifyAFKModeChanged();
		return this.state.afkMode || false;
	}

	/**
	 * Check if AFK mode is enabled
	 */
	isAFKMode(): boolean {
		return this.state.afkMode || false;
	}

	/**
	 * Set callback for when AFK mode changes
	 */
	setAFKModeCallback(callback: (enabled: boolean) => void): void {
		this.onAFKModeChanged = callback;
	}

	/**
	 * Check if notification contains @name mention
	 */
	private containsMention(input: NotificationInput): boolean {
		if (!this.userName) {
			return false;
		}
		const mentionPattern = new RegExp(`@${this.userName}\\b`, 'i');
		const text = `${input.title} ${input.body}`;
		return mentionPattern.test(text);
	}

	/**
	 * Process a notification through the router
	 */
	processNotification(input: NotificationInput): Action {
		// Check for @name mentions first - these are always important
		if (this.containsMention(input)) {
			const processed: ProcessedNotification = {
				input,
				action: 'allow',
				timestamp: Date.now(),
			};
			this.processedNotifications.push(processed);
			this.importantNotifications.push(processed);
			this.notifyImportantCountChanged();
			return 'allow';
		}

		// If AFK mode is enabled, force everything to digest (except mentions which are handled above)
		if (this.state.afkMode) {
			const processed: ProcessedNotification = {
				input,
				action: 'digest',
				timestamp: Date.now(),
			};
			this.processedNotifications.push(processed);
			this.digestedNotifications.push(processed);
			this.notifyUnreadCountChanged();
			return 'digest';
		}

		// If focus mode is enabled, force everything to digest (except mentions which are handled above)
		if (this.state.focusMode) {
			const processed: ProcessedNotification = {
				input,
				action: 'digest',
				timestamp: Date.now(),
			};
			this.processedNotifications.push(processed);
			this.digestedNotifications.push(processed);
			this.notifyUnreadCountChanged();
			return 'digest';
		}

		// Normal routing
		const action = route(input, this.state, this.rules);
		const processed: ProcessedNotification = {
			input,
			action,
			timestamp: Date.now(),
		};

		this.processedNotifications.push(processed);

		// Track digested notifications as unread items (unimportant - goes to sidebar)
		if (action === 'digest') {
			this.digestedNotifications.push(processed);
			this.notifyUnreadCountChanged();
		}

		// Track important notifications (allow action - shown in status bar)
		// Always track them, even in focus mode (so we can show what was missed when focus mode is turned off)
		if (action === 'allow') {
			this.importantNotifications.push(processed);
			// Only notify count change if not in focus mode (to update status bar)
			if (!this.state.focusMode) {
				this.notifyImportantCountChanged();
			}
		}

		return action;
	}

	/**
	 * Show notification based on action
	 */
	async showNotification(input: NotificationInput, action: Action): Promise<void> {
		switch (action) {
			case 'allow':
				await vscode.window.showInformationMessage(`${input.title}: ${input.body}`);
				break;
			case 'suppress':
				// Silently suppress
				console.log(`[Suppressed] ${input.source}: ${input.title}`);
				break;
			case 'digest':
				// Queue for digest
				console.log(`[Digested] ${input.source}: ${input.title}`);
				break;
		}
	}

	/**
	 * Get current unread count (digested notifications)
	 */
	getUnreadCount(): number {
		return this.digestedNotifications.length;
	}

	/**
	 * Get all digested notifications
	 */
	getDigestedNotifications(): ProcessedNotification[] {
		return [...this.digestedNotifications];
	}

	/**
	 * Clear all digested notifications
	 */
	clearDigested(): void {
		this.digestedNotifications = [];
		this.notifyUnreadCountChanged();
	}

	/**
	 * Mark a notification as read
	 */
	markAsRead(index: number): void {
		if (index >= 0 && index < this.digestedNotifications.length) {
			this.digestedNotifications.splice(index, 1);
			this.notifyUnreadCountChanged();
		}
	}

	/**
	 * Generate and process a mock notification
	 */
	async generateAndProcessMockNotification(source?: string): Promise<void> {
		const notification = source 
			? generateMockNotificationFromSource(source)
			: generateMockNotification();
		
		if (!notification) {
			return;
		}

		const action = this.processNotification(notification);
		await this.showNotification(notification, action);
	}

	/**
	 * Process a custom notification with user-provided message
	 */
	async processCustomNotification(source: string, title: string, body: string): Promise<void> {
		const notification: NotificationInput = {
			source,
			title,
			body,
		};

		const action = this.processNotification(notification);
		await this.showNotification(notification, action);
	}

	/**
	 * Set router state
	 */
	setState(state: RouterState): void {
		this.state = state;
	}

	/**
	 * Get router state
	 */
	getState(): RouterState {
		return { ...this.state };
	}

	/**
	 * Set rules
	 */
	setRules(rules: Rule[]): void {
		this.rules = rules;
	}

	/**
	 * Get rules
	 */
	getRules(): Rule[] {
		return [...this.rules];
	}

	/**
	 * Get important notifications count (allow action)
	 */
	getImportantCount(): number {
		return this.importantNotifications.length;
	}

	/**
	 * Get all important notifications
	 */
	getImportantNotifications(): ProcessedNotification[] {
		return [...this.importantNotifications];
	}

	/**
	 * Clear all important notifications
	 */
	clearImportant(): void {
		this.importantNotifications = [];
		this.notifyImportantCountChanged();
	}

	/**
	 * Mark an important notification as read
	 */
	markImportantAsRead(index: number): void {
		if (index >= 0 && index < this.importantNotifications.length) {
			this.importantNotifications.splice(index, 1);
			this.notifyImportantCountChanged();
		}
	}

	/**
	 * Notify callback of unread count change
	 */
	private notifyUnreadCountChanged(): void {
		if (this.onUnreadCountChanged) {
			this.onUnreadCountChanged(this.getUnreadCount());
		}
	}

	/**
	 * Notify callback of important count change
	 */
	private notifyImportantCountChanged(): void {
		if (this.onImportantCountChanged) {
			this.onImportantCountChanged(this.getImportantCount());
		}
	}

	/**
	 * Notify callback of focus mode change
	 */
	private notifyFocusModeChanged(): void {
		if (this.onFocusModeChanged) {
			this.onFocusModeChanged(this.state.focusMode);
		}
	}

	/**
	 * Notify callback of AFK mode change
	 */
	private notifyAFKModeChanged(): void {
		if (this.onAFKModeChanged) {
			this.onAFKModeChanged(this.state.afkMode || false);
		}
	}

	/**
	 * Get all notifications sorted by timestamp (newest first)
	 * Returns both important and digested notifications
	 */
	getAllNotificationsSorted(): ProcessedNotification[] {
		const all = [...this.importantNotifications, ...this.digestedNotifications];
		return all.sort((a, b) => b.timestamp - a.timestamp);
	}
}

