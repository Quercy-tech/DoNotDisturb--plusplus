# Security & Environment Variables

## ✅ Secrets Moved to .env

All sensitive information has been moved to the `.env` file to keep it out of git.

### What's in .env:
- `VSCE_PAT`: Your Personal Access Token for VS Code Marketplace
- `VSCE_PUBLISHER`: Your publisher ID

### Files Created:
- ✅ `.env` - Contains your actual secrets (NOT committed to git)
- ✅ `.env.example` - Template file (safe to commit)
- ✅ `.env.README.md` - Instructions for using environment variables

### Security Measures:
- ✅ `.env` is in `.gitignore` - will NOT be committed
- ✅ `.env.example` contains no secrets - safe to commit
- ✅ All documentation updated to reference `.env` instead of hardcoded secrets
- ✅ No secrets remain in any markdown files

## Usage

### Before Publishing:
```bash
# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Use the variables
vsce login $VSCE_PUBLISHER
# When prompted, use $VSCE_PAT or paste from .env
```

### For New Contributors:
1. Copy `.env.example` to `.env`
2. Fill in your own credentials
3. Never commit `.env` to git

## Verification

To verify no secrets are in git:
```bash
# Search for your PAT token (replace with your actual token pattern)
git grep "YOUR_TOKEN_PATTERN"
```

Should return no results (except in `.env` which is ignored).

**Note:** If you've already committed secrets, you'll need to rewrite git history to remove them. See GitHub's guide on [removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

