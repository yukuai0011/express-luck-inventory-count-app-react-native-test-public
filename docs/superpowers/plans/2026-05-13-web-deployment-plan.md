# Web Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow that builds the Expo web app on every push and deploys to GitHub Pages only when `main` is pushed.

**Architecture:** Single workflow file with two jobs: `web-build` produces a `dist/` artifact, `web-deploy` publishes it to GitHub Pages only on main branch pushes.

**Tech Stack:** Bun, Expo export, `peaceiris/actions-gh-pages@v3`, `actions/upload-artifact@v4`

---

### Task 1: Create web deployment workflow

**Files:**
- Create: `.github/workflows/web.yml`

- [ ] **Step 1: Write the workflow file**

```yaml
name: Build and Deploy Web App

on:
  push:
    branches: ['**']
  workflow_dispatch:

jobs:
  web-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: "1.3.13"

      - name: Install dependencies
        run: bun install

      - name: Export web bundle
        run: bunx expo export --platform web

      - name: Upload web artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist

  web-deploy:
    needs: web-build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Download web artifact
        uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: dist

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist
```

- [ ] **Step 2: Verify the file is valid YAML and matches the spec**

Read the file back and check:
1. Trigger: any branch push + workflow_dispatch ✓
2. Deploy condition: `github.ref == 'refs/heads/main' && github.event_name == 'push'` ✓
3. Expo export produces `dist/` directory ✓
4. Artifact name `web-dist` is consistent between upload and download ✓
5. `peaceiris/actions-gh-pages@v3` is used with `publish_dir: dist` ✓

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/web.yml
git commit -m "feat: add GitHub Actions workflow for web build and deploy"
```

---

**Spec coverage check:**
- Build on every push: Task 1, line `branches: ['**']` ✓
- Deploy only on main: Task 1, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` ✓
- GitHub Pages deployment: Task 1, `peaceiris/actions-gh-pages@v3` ✓

**Placeholder scan:** None — all file paths, commands, and conditions are fully specified.

**Plan complete and saved to `docs/superpowers/plans/2026-05-13-web-deployment-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent to implement the task, verify the file, and commit.

**2. Inline Execution** - Execute in this session using `executing-plans`.

Which approach?