# VS Code Extension Publishing Checklist for DoNotDisturb++

## ✅ Setup

- [x] Install VSCE CLI: `npm install -g @vscode/vsce`
- [x] Create an Azure DevOps account at dev.azure.com
- [x] Create a publisher profile at marketplace.visualstudio.com/manage
- [x] Generate a Personal Access Token (PAT) with **Marketplace (Publish)** scope

**Your token:** `[REDACTED - see .env file]`

- [ ] Login with VSCE: `vsce login <publisher-name>`

## ✅ Prepare Your Extension

- [x] Set `name` in package.json: `donotdisturb-plus-plus`
- [x] Set `displayName` in package.json: `DoNotDisturb++`
- [x] Set `description` in package.json: Comprehensive description added
- [x] Set `version` in package.json: `0.1.0`
- [ ] **Set `publisher`** (must match your publisher ID): Currently `YOUR_PUBLISHER_ID` - **NEEDS UPDATE**
- [x] Set `engines.vscode` (minimum VS Code version): `^1.108.1`
- [ ] **Add `repository` URL**: Currently placeholder - **NEEDS UPDATE**
- [ ] **Add an icon (128x128 PNG recommended)**: `icon.png` - **NEEDS CREATION**
- [x] Write a good README.md: ✅ Complete
- [x] Update CHANGELOG.md: ✅ Complete
- [x] Create `.vscodeignore` to exclude unnecessary files: ✅ Complete

## ⚠️ Action Required Before Publishing

### 1. Update Publisher ID
Edit `package.json` and replace `YOUR_PUBLISHER_ID` with your actual publisher ID from marketplace.visualstudio.com/manage

### 2. Update Repository URL
Edit `package.json` and replace the repository URL with your actual GitHub repository (or remove if you don't have one):
```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/DoNotDisturb-Plus-Plus.git"
}
```

### 3. Create Extension Icon
Create a 128x128 PNG image named `icon.png` in the root directory (`/Users/quercy/Downloads/DoNotDisturb++/DD/icon.png`).

**Quick icon creation options:**
- Use an online tool like [Favicon.io](https://favicon.io/) or [Canva](https://www.canva.com/)
- Use a simple bell icon or "DND" text
- Must be 128x128 pixels, PNG format

## 📋 Test & Publish Steps

### Step 1: Install VSCE (if not already installed)
```bash
npm install -g @vscode/vsce
```

### Step 2: Login to VSCE
```bash
cd "/Users/quercy/Downloads/DoNotDisturb++/DD"
vsce login YOUR_PUBLISHER_ID
```
When prompted, paste your token:
```
[REDACTED - see .env file]
```

### Step 3: Test Package
```bash
npm run package
```
This creates a `.vsix` file that you can test locally.

### Step 4: Test Locally
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select the generated `.vsix` file (usually `donotdisturb-plus-plus-0.1.0.vsix`)
5. Test all features:
   - Status bar shows correctly
   - Focus Mode toggle works
   - AFK Mode toggle works
   - Sidebar notifications display
   - Rules panel opens
   - Chat panel opens
   - All commands work

### Step 5: Publish
```bash
npm run publish
```
Or:
```bash
vsce publish
```

### Step 6: Verify
- Check your extension at marketplace.visualstudio.com
- Verify all information is correct
- Test installation from marketplace

## 📝 Current Status

✅ **Completed:**
- Package.json configured (except publisher and repository)
- README.md written
- CHANGELOG.md updated
- .vscodeignore configured
- All code compiles successfully
- Extension scripts added

⚠️ **Needs Action:**
- [ ] Update `publisher` in package.json
- [ ] Update `repository.url` in package.json (or remove if no repo)
- [ ] Create `icon.png` (128x128 PNG)
- [ ] Install vsce: `npm install -g @vscode/vsce`
- [ ] Login: `vsce login <publisher-name>`
- [ ] Test package: `npm run package`
- [ ] Test locally by installing .vsix
- [ ] Publish: `npm run publish`

## 🎯 Quick Start Commands

```bash
# Navigate to extension directory
cd "/Users/quercy/Downloads/DoNotDisturb++/DD"

# Install VSCE (one time)
npm install -g @vscode/vsce

# Login (one time, use your publisher ID)
vsce login YOUR_PUBLISHER_ID

# Test package
npm run package

# Publish (after testing)
npm run publish
```

## 📌 Notes

- Extension name: `donotdisturb-plus-plus` (lowercase, hyphens)
- Current version: `0.1.0`
- Minimum VS Code version: 1.108.1
- All TypeScript compiles successfully ✅
- No linter errors ✅

