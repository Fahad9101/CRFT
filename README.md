# CRFT Resident Assessment Platform

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

## Security model

- Residents use Firebase anonymous authentication and an assigned activation code. A SHA-256 code-derived lookup document permits only direct code validation; residents cannot list activation documents, read other submissions, or access staff data.
- Evaluators and Program Directors sign in with Google through Firebase Authentication.
- A matching `crft_staff/{uid}` document authorizes each staff account with role `admin`, `evaluator`, or `programDirector`.
- Evaluators can manage the active session, activations, and manual evaluations. Program Directors have read-only access.
- Firestore rules deny all access not explicitly granted. Existing `crft_session_config`, `crft_activations`, and `crft_submissions` documents are preserved.

## One-time staff setup

1. In Firebase Authentication, enable Anonymous and Google sign-in.
2. Sign in once through CRFT with the required Google staff account so Firebase creates its Authentication user.
3. Create `crft_staff/{Google email}` in Firestore for each staff account, with exactly one field:
   - CRFT Administrator with access to both workspaces: `role` = `admin`
   - Evaluator: `role` = `evaluator`
   - Program Director: `role` = `programDirector`
4. Never place passwords or service-account keys in this repository.

## Safe deployment order

Deploy the web app first, sign in as the administrator once to migrate existing activations to protected hash lookups, then deploy the security rules:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project crft-c9f31
```

The project remains compatible with the Firebase Spark plan. Confirm that `crft_activation_access` contains the active CRFT-AUG26 activation before publishing the restrictive rules.
