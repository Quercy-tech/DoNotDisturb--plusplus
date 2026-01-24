# Cleaning Git History to Remove Secrets

GitHub detected secrets in your git history. Even though we've removed them from current files, they're still in previous commits.

## Option 1: Use git filter-branch (Recommended)

This will rewrite history to remove the secret from all commits:

```bash
cd "/Users/quercy/Downloads/DoNotDisturb++"

# Backup your repository first!
git clone . ../DoNotDisturb-backup

# Remove the secret from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch DD/PUBLISHING.md DD/PUBLISHING_CHECKLIST.md DD/SECURITY.md && \
   git checkout HEAD -- DD/PUBLISHING.md DD/PUBLISHING_CHECKLIST.md DD/SECURITY.md" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history!)
git push origin --force --all
git push origin --force --tags
```

## Option 2: Use BFG Repo-Cleaner (Faster)

```bash
# Install BFG (if not installed)
brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/

cd "/Users/quercy/Downloads/DoNotDisturb++"

# Create a file with the secret to remove
echo "[REDACTED - see .env file]" > /tmp/secret.txt

# Clean the repository
bfg --replace-text /tmp/secret.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

## Option 3: Start Fresh (Easiest but loses history)

If you don't need the commit history:

```bash
cd "/Users/quercy/Downloads/DoNotDisturb++"

# Remove git history
rm -rf .git

# Initialize new repo
git init
git add .
git commit -m "Initial commit - secrets removed"
git branch -M main
git remote add origin https://github.com/Quercy-tech/DoNotDisturb-.git
git push -u origin main --force
```

## After Cleaning

1. Verify no secrets remain:
   ```bash
   git grep "[REDACTED - see .env file]"
   ```

2. Make sure `.env` is in `.gitignore` and never commit it

3. All secrets should only exist in `.env` file (which is ignored)

## Important Notes

⚠️ **Force pushing rewrites history** - anyone who has cloned the repo will need to re-clone it.

⚠️ **Backup first** - Always backup your repository before rewriting history.

✅ **After cleaning** - The secret will be removed from all commits, and GitHub will allow you to push.

