# DoNotDisturb++

Smart notification management for Visual Studio Code. Take control of your notifications with intelligent routing, Focus Mode, AFK Mode, and customizable priority rules.

## Features

### 🎯 Smart Notification Routing
- Automatically classify notifications into **Important** (status bar) and **Digested** (sidebar)
- Customizable rules with priority levels (Low, Medium, High, Critical)
- Text-based filtering for precise control

### 🔕 Focus Mode
- Silence all notifications except @mentions
- Toggle with `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
- See what you missed when you disable Focus Mode

### 🏃 AFK Mode
- Queue all notifications while you're away
- Toggle with `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)
- Get a sorted summary when you return
- One-click "Mark All as Read" option

### 📋 Organized Sidebar
- Notifications grouped by source (Git, Build, Test, etc.)
- Collapsed by default to reduce clutter
- Shows 10 most recent per category
- Click any notification to mark as read
- Truncated titles and previews for quick scanning

### @ Mentions
- Notifications containing `@yourname` are automatically marked as important
- Configure your name in settings or via command

### ⚙️ Customizable Rules
- Visual rule configuration panel
- Set priority, source, action, and Focus Mode exceptions
- Custom rule titles for easy identification
- Rules evaluated in priority order

## Quick Start

1. **Set your name** (for @mention detection):
   - Command Palette → `DoNotDisturb++: Set User Name`
   - Or configure `dd.userName` in settings

2. **Enable Focus Mode**:
   - Click the status bar item, or
   - Press `Ctrl+Shift+F` / `Cmd+Shift+F`

3. **Enable AFK Mode**:
   - Press `Ctrl+Shift+A` / `Cmd+Shift+A`

4. **Configure Rules**:
   - Command Palette → `DoNotDisturb++: Configure Notification Rules`

## Commands

| Command | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| `DoNotDisturb++: Toggle Focus Mode` | Enable/disable Focus Mode | `Ctrl+Shift+F` / `Cmd+Shift+F` |
| `DoNotDisturb++: Toggle AFK Mode` | Enable/disable AFK Mode | `Ctrl+Shift+A` / `Cmd+Shift+A` |
| `DoNotDisturb++: Configure Notification Rules` | Open rules configuration panel | - |
| `DoNotDisturb++: Set User Name` | Set your name for @mention detection | - |
| `DoNotDisturb++: Open Chat Panel` | Send custom chat messages | - |

## Extension Settings

This extension contributes the following settings:

* `dd.userName`: Your name for @mention detection. Notifications containing `@yourname` will be marked as important.
* `dd.rules`: Custom notification rules. Each rule defines:
  - `title`: User-friendly name (optional)
  - `source`: Notification source (e.g., 'Git', 'Build', '*' for any)
  - `priority`: 0=Low, 1=Medium, 2=High, 3=Critical
  - `action`: 'allow' (show immediately), 'suppress' (hide), 'digest' (sidebar)
  - `showInFocusMode`: Whether to show even when Focus Mode is enabled
  - `contains`: Optional text filter (case-insensitive)

## Status Bar

The status bar shows:
- **AFK Mode**: `$(circle-slash) AFK` (yellow background) - All notifications queued
- **Focus Mode**: `$(eye-closed) Focus` (prominent background) - All notifications silenced except @mentions
- **Important Count**: `$(warning) X important` (red background) - Number of important notifications
- **All Clear**: `$(check) All clear` - No important notifications

Click the status bar item to:
- View important notifications (when not in Focus/AFK mode)
- Toggle Focus Mode (when in Focus Mode)
- See missed notifications (when disabling Focus/AFK mode)

## Sidebar View

The sidebar shows digested (non-important) notifications:
- Grouped by source (Git, Build, Test, etc.)
- Collapsed by default
- Limited to 10 most recent per category
- Click any notification to mark as read
- Right-click for context menu options

## Use Cases

### Deep Work Session
1. Enable Focus Mode (`Ctrl+Shift+F`)
2. Work without distractions
3. Only @mentions will interrupt you
4. When done, disable Focus Mode to see what you missed

### Away from Keyboard
1. Enable AFK Mode (`Ctrl+Shift+A`)
2. All notifications are queued
3. When you return, disable AFK Mode
4. Review sorted list of missed notifications
5. Use "Mark All as Read" to quickly dismiss everything

### Custom Notification Rules
1. Open Rules Configuration panel
2. Add rules for specific sources (e.g., "Build failures" → High priority → Show Immediately)
3. Set Focus Mode exceptions for critical notifications
4. Save and apply rules

## Requirements

- VS Code 1.108.1 or higher

## Known Issues

None at this time. Please report issues on [GitHub](https://github.com/YOUR_USERNAME/DoNotDisturb-Plus-Plus/issues).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

---

**Enjoy a distraction-free coding experience!** 🚀
