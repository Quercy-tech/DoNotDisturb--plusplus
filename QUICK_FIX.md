# Quick Fix: Remove Secret from Git History

GitHub blocked your push because the secret token is in git history. Here's the fastest way to fix it:

## Quick Solution

Run these commands in your repository root:

```bash
cd "/Users/quercy/Downloads/DoNotDisturb++"

# 1. Remove secret from all commits
git filter-branch --force --tree-filter "
  find . -type f -name '*.md' -exec sed -i '' 's|[REDACTED - see .env file]|[REDACTED - see .env file]|g' {} + 2>/dev/null || true
" --prune-empty --tag-name-filter cat -- --all

# 2. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 3. Verify it's gone
git grep "[REDACTED - see .env file]" || echo "✅ Secret removed!"

# 4. Force push (WARNING: Rewrites remote history!)
git push origin --force --all
```

## Alternative: Use BFG (Faster)

```bash
# Install BFG
brew install bfg

cd "/Users/quercy/Downloads/DoNotDisturb++"

# Create replacement file
echo "[REDACTED - see .env file]==>[REDACTED]" > /tmp/replacements.txt

# Clean
bfg --replace-text /tmp/replacements.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## After Fixing

1. ✅ Secret removed from all commits
2. ✅ GitHub will allow you to push
3. ✅ All secrets now only in `.env` (which is ignored)

## Important

⚠️ **Force push rewrites history** - anyone who cloned the repo needs to re-clone

⚠️ **Backup first** - Consider cloning to a backup location before running

