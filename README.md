# Knowledge OS — app

A small Next.js app that browses and edits the markdown files in your
Knowledge OS git repo. Git is the only data store — no database, no local
cache of file contents. Every save is a real commit.

This app has no login screen. Anyone with the deployed URL can view and edit
the content repo, since the app holds a GitHub token with write access.
Keep the URL unlisted, and don't link to it publicly.

## 1. Create the content repo

Create a **new, separate** GitHub repo (e.g. `your-name/knowledge-os-content`)
and push the contents of `seed-content/` from this folder to its root. That
repo is your actual second brain — this app just reads and writes to it.

```bash
cd seed-content
git init
git add .
git commit -m "Seed Knowledge OS structure"
git branch -M main
git remote add origin https://github.com/<you>/knowledge-os-content.git
git push -u origin main
```

## 2. Create a GitHub token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
token, scoped to only the `knowledge-os-content` repo, with **Contents:
read and write** permission.

## 3. Push this app to its own GitHub repo

```bash
git init
git add .
git commit -m "Knowledge OS app"
git branch -M main
git remote add origin https://github.com/<you>/knowledge-os-app.git
git push -u origin main
```

## 4. Deploy to Vercel

1. vercel.com → **Add New → Project** → import `knowledge-os-app`.
2. Framework preset: Next.js (auto-detected).
3. Add environment variables:
   - `GITHUB_TOKEN` — the token from step 2
   - `GITHUB_REPO` — `<you>/knowledge-os-content`
   - `GITHUB_BRANCH` — `main` (optional, defaults to `main`)
4. Deploy.

Visit the deployed URL and you'll see the file tree from
`knowledge-os-content` on the left. Click a file to preview it, click
**Edit** to change it, **Save** to commit directly to the repo.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the three variables above
npm run dev
```

## Adding a new project

Copy `Templates/project/` inside the content repo into
`Projects/<name>/`, either via the app (open each template file, Save-As isn't
built in yet — copy on GitHub.com or locally with git) or with:

```bash
cp -r Templates/project Projects/my-new-project
```

then push. The app will pick it up on next tree load.
