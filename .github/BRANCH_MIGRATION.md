# Branch Migration: master → main

## ✅ Completed Steps

### 1. Renamed Local Branch

```bash
git branch -m master main
```

- ✅ Local branch renamed from `master` to `main`

### 2. Pushed to Remote

```bash
git push -u origin main
```

- ✅ New `main` branch created on GitHub
- ✅ Upstream tracking configured

### 3. Updated Workflows

- ✅ Simplified workflows to use `main` only (removed `master`)
- ✅ Committed and pushed workflow changes

### 4. Verified GitHub Actions

Visit: https://github.com/safe-snap/safesnap-chrome-extension/actions

- ✅ Workflows should now trigger on the `main` branch

---

## 🔄 Next Steps (Manual on GitHub)

### Update Default Branch on GitHub

**Important:** You must change the default branch on GitHub.com to complete the migration:

1. **Go to Repository Settings**
   - Visit: https://github.com/safe-snap/safesnap-chrome-extension/settings/branches

2. **Change Default Branch**
   - Click the "Switch default branch" button (or pencil icon next to default branch)
   - Select `main` from the dropdown
   - Click "Update" and confirm the change

3. **Update Branch Protection Rules (if any)**
   - If you have branch protection on `master`, recreate them for `main`
   - Settings → Branches → Branch protection rules

4. **Delete Old `master` Branch (Recommended)**
   ```bash
   # After confirming main branch works on GitHub
   git push origin --delete master
   ```

   - Or delete via GitHub UI: Branches → master → Delete button

---

## 🎯 Benefits of Using `main`

1. **Modern Standard** - GitHub's default since 2020
2. **Inclusive Language** - More welcoming terminology
3. **Cleaner Workflows** - No need to support multiple branch names
4. **Better Defaults** - New repos clone as `main` by default

---

## 🧪 Verification Checklist

After updating the default branch on GitHub:

- [ ] Visit https://github.com/safe-snap/safesnap-chrome-extension
- [ ] Verify "main" shows as default branch (not "master")
- [ ] Clone in a new directory to test: `git clone <repo-url>`
- [ ] Verify it checks out `main` branch (not `master`)
- [ ] Check Actions tab shows workflow runs on `main` branch
- [ ] Delete `master` branch via GitHub UI or: `git push origin --delete master`

---

## 📊 Current Status

| Item                          | Status                          |
| ----------------------------- | ------------------------------- |
| Local branch renamed          | ✅ Done                         |
| Remote `main` branch created  | ✅ Done                         |
| Workflows updated             | ✅ Done                         |
| Workflows pushed              | ✅ Done                         |
| GitHub default branch changed | ⏳ **TODO** (manual step)       |
| Old `master` branch deleted   | ⏳ After default branch changed |

---

## 🔗 Quick Links

- **Repository:** https://github.com/safe-snap/safesnap-chrome-extension
- **Settings:** https://github.com/safe-snap/safesnap-chrome-extension/settings/branches
- **Actions:** https://github.com/safe-snap/safesnap-chrome-extension/actions
- **Branches:** https://github.com/safe-snap/safesnap-chrome-extension/branches

---

## 📝 Notes for Team Members

If team members have local clones with the old `master` branch:

```bash
# Update their local repository
git branch -m master main
git fetch origin
git branch -u origin/main main
git remote set-head origin -a

# Verify
git branch --show-current  # Should show: main
git status                  # Should show: On branch main
```

---

## 🚨 Important

**GitHub Actions will only trigger automatically after you:**

1. Set `main` as the default branch on GitHub.com
2. Workflows are already configured correctly for `main` branch
3. Push new commits to `main` (or we can re-push current commits)

The push we just made will trigger the workflows, but you should verify by checking the Actions tab!
