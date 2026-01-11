# Fix: Change Default Branch When Both Exist

## Current Situation

- ✅ `main` branch exists with latest commits
- ✅ `master` branch exists (old branch)
- ❌ Cannot rename `master` → `main` because `main` already exists

## Solution: Change Default, Then Delete Old Branch

### Step 1: Change Default Branch to `main`

Since both branches exist, we change the default instead of renaming:

1. **Go to Repository Settings**
   - Visit: https://github.com/safe-snap/safesnap-chrome-extension/settings

2. **Navigate to Branches Section**
   - Click "Branches" in the left sidebar
   - OR direct link: https://github.com/safe-snap/safesnap-chrome-extension/settings/branches

3. **Change Default Branch**
   - Look for the "Default branch" section at the top
   - Current default should show: `master`
   - Click the **switch icon** (⇄) or pencil icon next to `master`
   - A dropdown will appear - select **`main`**
   - Click **"Update"** button
   - GitHub will show a warning dialog - click **"I understand, update the default branch"**

### Step 2: Delete Old `master` Branch

After changing the default to `main`:

#### Option A: Delete via GitHub UI (Easiest)

1. Go to: https://github.com/safe-snap/safesnap-chrome-extension/branches
2. Find `master` in the branch list
3. Click the trash/delete icon (🗑️) next to `master`
4. Confirm deletion

#### Option B: Delete via Command Line

```bash
git push origin --delete master
```

### Step 3: Verify Changes

1. **Check default branch:**
   - Visit: https://github.com/safe-snap/safesnap-chrome-extension
   - Should now show `main` branch by default (not `master`)

2. **Check GitHub Actions:**
   - Visit: https://github.com/safe-snap/safesnap-chrome-extension/actions
   - Workflows should now show runs on `main` branch

3. **Verify branch list:**
   - Visit: https://github.com/safe-snap/safesnap-chrome-extension/branches
   - Should only show `main` branch (not `master`)

---

## Why This Happened

When we ran `git push -u origin main`, it created a new `main` branch on GitHub without deleting `master`. GitHub now has both branches:

- `master` - old branch (currently set as default)
- `main` - new branch with latest commits

Since both exist, we can't "rename" - we need to change the default and delete the old one.

---

## Current Branch Status

### Local:

```
* main (current branch)
```

### Remote (GitHub):

```
origin/master (old, currently default)
origin/main   (new, has latest commits)
```

### After following steps above:

```
origin/main (only branch, set as default) ✅
```

---

## Visual Guide

### Before:

```
GitHub Default: master ─┐
                       │
Local: main ───────────┤
Remote: master         │
Remote: main ──────────┘
```

### After:

```
GitHub Default: main ──┐
                       │
Local: main ───────────┤
Remote: main ──────────┘
(master deleted)
```

---

## Troubleshooting

### "Cannot delete default branch"

- You must change the default branch FIRST before deleting
- Set `main` as default, then delete `master`

### "Protected branch" error

- Go to Settings → Branches → Branch protection rules
- Remove protection from `master` branch
- Then delete it

### Still see workflows on `master`

- Normal - old workflow runs remain in history
- New commits to `main` will trigger new workflow runs

---

## Quick Checklist

- [ ] Step 1: Change default branch to `main` on GitHub.com
- [ ] Step 2: Delete `master` branch (UI or command line)
- [ ] Step 3: Verify `main` is now the only default branch
- [ ] Step 4: Check Actions tab for workflow runs on `main`
- [ ] Step 5: Test by making a small commit and pushing

---

## After Completion

Update your local repo to remove tracking of deleted `master`:

```bash
git remote prune origin
```

This removes references to deleted remote branches.
