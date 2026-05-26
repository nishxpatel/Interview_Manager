# Interview Manager

Interview Manager is a clean dashboard for tracking job, internship, and co-op interviews. It is built with Drexel students in mind, including a Drexel co-op import tool, but it works for anyone managing an interview pipeline.

Live site: <https://nishxpatel.github.io/Interview_Manager/>

GitHub repository: <https://github.com/nishxpatel/Interview_Manager>

## Features

- Google sign-in with Firebase Authentication
- Per-user interview storage in Cloud Firestore
- Add, edit, delete, and update interview records
- Track company, position, pipeline step, date/time, format, contacts, location/link, job description link, questions, and notes
- Pipeline analytics for total, upcoming scheduled interviews, communication-needed records, completed interviews, done/withdrawn records, and active records
- Drexel import tool for pasted content from "Maintain your Co-Op Interview Requests"
- Responsive React interface for desktop and mobile
- Lightweight PWA metadata for Chromium install prompts and iPhone Safari "Add to Home Screen"
- GitHub Pages deployment workflow

## Backend Choice

This app uses Firebase on the free Spark plan. Firebase is the simplest fit for this static React app because Google sign-in, Firestore, browser SDK support, and per-user security rules work cleanly without a custom server. Firebase's documentation says the Spark plan needs no payment information to get started, includes most Authentication options at no charge, and includes no-cost Cloud Firestore quota.

Supabase is also a strong free option, especially if the app needs relational data or SQL later. For this MVP, Firebase is simpler because the app needs Google login plus small per-user document storage, and Firestore security rules map directly to `/users/{uid}/interviews/{interviewId}`.

## Tech Stack

- Vite
- React
- TypeScript
- Firebase Auth and Firestore
- GitHub Pages via GitHub Actions

## Local Setup

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Run the app:

```bash
npm run dev
```

If Firebase variables are not set, the app runs in local demo mode and stores data in browser local storage. This is useful for UI testing, but it is not a replacement for authenticated cloud persistence.

## Firebase Setup

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. Add a Web app to the Firebase project.
3. Keep the project on the Spark plan. Do not enable paid Firebase features.
4. Enable Authentication, then enable the Google sign-in provider.
5. Add your local and deployed domains to Firebase Authentication's authorized domains:
   - `localhost`
   - `nishxpatel.github.io`
   - any custom domain you add later
6. Create a Cloud Firestore database.
7. Start in production mode, then publish the rules from `firestore.rules`.
8. Copy your Firebase web config into `.env` using the keys from `.env.example`.

Local `.env` file:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Optional rules deployment with the Firebase CLI:

```bash
npx firebase-tools deploy --only firestore:rules --project your-firebase-project-id
```

The app stores records at:

```text
/users/{uid}/interviews/{interviewId}
```

The provided Firestore rules only allow authenticated users to read and write their own interview documents.

## Firebase Console Checklist

Create these manually in Firebase:

- A Firebase project on the Spark plan
- A Web app inside that Firebase project
- Authentication with the Google provider enabled
- Authorized domains for `localhost` and `nishxpatel.github.io`
- A Cloud Firestore database
- Firestore rules copied from `firestore.rules`

Do not commit `.env`; it is ignored by Git.

## Drexel Import

Open Drexel's "Maintain your Co-Op Interview Requests" page, select/copy the page content, then paste it into the app's Drexel import modal.

The current parser extracts:

- Position
- Drexel job ID
- Employer/company
- Job length
- General job location
- Interview type
- Student/employer contact instructions when present
- Job description/posting links when present

Imported records do not auto-fill the user notes field. Dates, contacts, recruiter emails, and meeting links may not appear in the copied Drexel page text, so imported records stay editable. Date/time is only required once the record is in a scheduled pipeline step.

Browsers differ in what they expose during paste. Chromium desktop browsers usually provide rich HTML clipboard data, which allows embedded Drexel links to be preserved. Safari and iPhone home-screen mode may only provide plain text, so the app keeps parsing records and shows a notice when embedded links are not available from the clipboard.

The parser lives in `src/lib/drexelParser.ts` and is intentionally isolated so it can be adjusted when more Drexel examples are available.

## GitHub Pages Deployment

The site deploys through GitHub Actions from the `main` branch to GitHub Pages.

1. In GitHub, open Settings -> Pages.
2. Set Source to `GitHub Actions`.
3. Add these repository secrets in Settings -> Secrets and variables -> Actions:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

4. Push to the `main` branch or run the "Deploy to GitHub Pages" workflow manually.
5. After secrets are added, rerun the workflow so the deployed app uses Firebase instead of local demo mode.

The Vite base path is detected from `GITHUB_REPOSITORY` during the GitHub Actions build. For this repository, the production base path resolves to `/Interview_Manager/`, which matches the GitHub Pages URL.

If the Firebase secrets are not set, the app still builds and deploys in local demo mode. That keeps the public site available while Firebase configuration is being created.

## Development Commands

```bash
npm run dev
npm run build
npm run preview
```

## Mobile Install Notes

The app includes `public/manifest.webmanifest`, PWA icons, Apple touch icons, and iOS web app meta tags. On iPhone, open the live site in Safari and use Share -> Add to Home Screen. The app intentionally does not register a service worker yet so Firebase Auth and Firestore always use the network directly and do not risk stale cached sync behavior.

## Notes

This is an MVP. A production version can add richer import mapping, calendar export, labels, file attachments, and full-text search.
