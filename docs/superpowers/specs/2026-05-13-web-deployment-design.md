---
name: 2026-05-13-web-deployment-design
description: GitHub Actions workflow to build and deploy Expo/React Native web app to GitHub Pages
metadata:
  type: project
---

# Web Deployment via GitHub Actions

## Context

The app is an Expo/React Native project using Bun as the package manager. It already has web support enabled in `app.json`. A PWA-enabled version existed previously but is not desired — this is a fresh, plain web build.

Goal: add a GitHub Actions workflow that builds the web app on every push and deploys to GitHub Pages only when `main` branch is pushed.

## Design

### Build Trigger
- **Push to any branch:** run build job (ensures no broken builds merge to main)
- **Workflow dispatch:** manual trigger for ad-hoc builds
- **Do not deploy on pull requests** unless the PR targets main (deploy only on direct main pushes)

### Deploy Trigger
- Deploy job runs **only** when `github.ref == 'refs/heads/main'` AND triggered by a push (not workflow_dispatch alone, unless explicitly requested)

### Jobs

**`web-build` job**
- Runs on `ubuntu-latest`
- Steps: checkout → setup-bun → `bun install` → `bun run web` (or `bunx expo export --platform web`)
- Output: `dist/` directory
- Artifact: upload `dist/` using `actions/upload-artifact@v4`

**`web-deploy` job**
- Needs: `web-build`
- Runs only on `main` branch push
- Steps: download artifact → deploy using `peaceiris/actions-gh-pages@v3`
- Sets `github_pages.source` to `dist/`

### GitHub Pages Setup
- Assumes GitHub Pages is already enabled on the repository pointing to `gh-pages` branch (user confirmed it's already enabled on main)
- No changes to repository settings required in the workflow

### Expo Web Build Command
- Use `bunx expo export --platform web` to produce the static `dist/` directory
- Alternative: `bun run web` via Expo's dev server in CI mode — but `export` is preferred for production builds

## Out of Scope
- PWA / service worker
- Custom domain configuration
- Preview deployments for PRs
- iOS/Android build changes