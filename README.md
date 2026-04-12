# Resident Assessment Rubric App

A free static web app for evaluating resident clinical reasoning using a consultant-thinking rubric.

## Features

- Six scored domains
- Automatic total score and global classification
- Feedback phrase bank
- Notes for strengths, improvement priorities, and action plan
- Save records in the browser with localStorage
- Export saved records to CSV
- Print and share summary

## Local setup

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run:

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

## Publish for free

### Option 1: Cloudflare Pages

1. Create a GitHub repository and upload this project.
2. Log in to Cloudflare Pages.
3. Connect the GitHub repository.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

### Option 2: GitHub Pages

Simplest route:
1. Create a GitHub repository.
2. Upload this project.
3. Add a GitHub Actions workflow for Vite deployment.
4. Enable GitHub Pages in repository settings.

A simple workflow file is included in `.github/workflows/deploy.yml`.

## Notes

- This version stores saved assessments only in the current browser.
- If you later want shared records across devices, add a backend such as Supabase or Firebase.
- For a public teaching tool, this static version is the cheapest and simplest approach.
