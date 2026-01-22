# Deployment Workflow

## ⚠️ CRITICAL: Always Deploy to Main Branch

**All changes must be deployed directly to the `main` branch.**

This project uses a simplified deployment workflow where:
- Work happens on feature branches (e.g., `richardlitang/sofia`)
- When ready to deploy, changes are **immediately pushed to main**
- No pull requests, no review delays - main is the deployment target

## Deployment Commands

When the user says "deploy" or "deploy right after", follow these steps:

### 1. Commit Changes
```bash
git add <changed-files>
git commit -m "descriptive message

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 2. Push to Feature Branch (optional, for backup)
```bash
git push origin <current-branch>
```

### 3. Deploy to Main (REQUIRED)
```bash
# Sync with main first
git fetch origin

# Merge main into current branch (if needed)
git merge origin/main --no-edit

# Push current branch to main
git push origin <current-branch>:main
```

## Why This Workflow?

- **Speed**: Changes go live immediately without waiting for PR reviews
- **Simplicity**: No complex branching strategies
- **Trust**: The user trusts Claude to make quality changes
- **Iteration**: Fast feedback loop for testing in production

## When to Deploy

- User explicitly says "deploy"
- User says "push to production"
- User says "deploy to main"
- User says "deploy right after"
- End of a coding session when changes are complete

## When NOT to Deploy

- Changes are incomplete or broken
- Tests are failing
- User says "don't deploy yet" or "save for later"
- Working on experimental/risky features (ask first)

## Worktree Note

This repository uses git worktrees. Main branch is checked out at `/Users/richardlitang/Desktop/dreams/stackhunt`. Therefore:
- Cannot directly checkout main in this workspace
- Must use `git push origin <branch>:main` to deploy
- Cannot use `git fetch origin main:main` (will fail)

## Hosting

The project is hosted on Vercel and automatically deploys when main branch is updated.

## Example Session

```bash
# User: "deploy right after"

# Step 1: Commit
git add src/pages/admin/strategy/index.astro
git commit -m "fix: Add CSV import tabs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Step 2: Push to feature branch (backup)
git push origin richardlitang/sofia

# Step 3: Deploy to main
git fetch origin
git merge origin/main --no-edit
git push origin richardlitang/sofia:main
# ✅ Deployed!
```

## For Conductor.build

This deployment workflow should be followed automatically when:
1. User uses phrases like "deploy", "push to prod", "deploy to main"
2. End of coding session with completed work
3. User explicitly requests deployment

Always use the command: `git push origin <current-branch>:main`
