# Publishing Guide for DoNotDisturb++

## Pre-Publishing Checklist

### 1. Update package.json
You need to update these fields in `package.json`:
- `publisher`: Replace `YOUR_PUBLISHER_ID` with your actual publisher ID from marketplace.visualstudio.com/manage
- `repository.url`: Replace `YOUR_USERNAME` with your GitHub username (or update the full URL if different)

### 2. Create Extension Icon
- Create a 128x128 PNG image named `icon.png` in the root directory
- The icon should represent your extension visually
- Place it in: `/Users/quercy/Downloads/DoNotDisturb++/DD/icon.png`

### 3. Install VSCE CLI
```bash
npm install -g @vscode/vsce
```

### 4. Login to VSCE
```bash
# Load environment variables from .env file
export $(cat .env | grep -v '^#' | xargs)
vsce login $VSCE_PUBLISHER
```
When prompted, enter your Personal Access Token from the `.env` file (VSCE_PAT variable).

**Note:** Make sure you have created a `.env` file from `.env.example` with your actual credentials.

### 6. Test Package
```bash
cd "/Users/quercy/Downloads/DoNotDisturb++/DD"
vsce package
```
This will create a `.vsix` file that you can test locally.

### 7. Test Locally
1. Open VS Code
2. Go to Extensions view
3. Click "..." menu → "Install from VSIX..."
4. Select the generated `.vsix` file
5. Test all features to ensure everything works

### 8. Publish
```bash
vsce publish
```

## Required Information

Before publishing, you need:
1. **Publisher ID**: Your publisher name from marketplace.visualstudio.com/manage
2. **Repository URL**: Your GitHub repository URL (if you have one)

## Notes

- The extension name in package.json is `donotdisturb-plus-plus` (lowercase, hyphens)
- Version is currently `0.1.0` (update for future releases)
- Make sure all files compile without errors before publishing

