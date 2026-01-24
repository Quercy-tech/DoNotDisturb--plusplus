# Change Log

All notable changes to the "DoNotDisturb++" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2024-12-XX

### Added
- Initial release of DoNotDisturb++
- Smart notification routing with customizable rules
- Focus Mode - silence all notifications except @mentions
- AFK Mode - queue notifications while away
- Status bar integration showing notification counts and modes
- Sidebar view for digested notifications
- @mention detection for automatic prioritization
- Visual rules configuration panel
- Custom rule titles and priority levels
- Keyboard shortcuts for Focus Mode (`Ctrl+Shift+F` / `Cmd+Shift+F`) and AFK Mode (`Ctrl+Shift+A` / `Cmd+Shift+A`)
- "Mark All as Read" option when exiting AFK Mode
- Click-to-mark-as-read functionality in sidebar
- Notification categories with icons
- Truncated display for less overwhelming sidebar
- Collapsed categories by default
- Limited display (10 most recent per category)

### Features
- Notification classification: Important (status bar) vs Digested (sidebar)
- Priority-based rule evaluation (Critical → High → Medium → Low)
- Text filtering with `contains` option
- Focus Mode exceptions for critical notifications
- Sorted notification lists when exiting modes
- Real-time status bar updates
- User name configuration for @mention detection
