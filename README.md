# ClassCrate — Bulk PDF Downloader

**Free, local, subject-wise Google Classroom bulk downloader.** Download accessible PDF, PPTX, DOCX, XLSX, and other attachments without a backend or subscription.

> **Status: local developer build (v0.2.0).** The extension has not been verified end-to-end with a university account. A Google Chrome Extension OAuth client ID and university-admin permission may be needed. Do not claim production readiness until completing the manual tests.

## Features

- Google sign-in through Chrome Identity API — no separate ClassCrate login.
- Lists active Google Classroom **subjects** (no date filter).
- Fetches classwork materials, assignments, and announcements for the chosen subject.
- Searchable file preview with PDF/PPTX/DOCX/XLSX filters, select-all, deselect and invert.
- Original file formats are preserved; Google Docs, Slides and Sheets export to DOCX, PPTX and XLSX.
- Downloads via **Chrome's native Downloads API**, individually visible at `chrome://downloads`.
- Optional folders: `Downloads/ClassCrate/<Subject>/<Post>/<File>`.
- Limited concurrency (two downloads), progress, cancellation, and retry failed items.
- Completion screen with star rating, copied feedback, optional WhatsApp draft and optional Chrome Web Store rating.
- No tracking, subscription, external application server, or payment requirement for local use.

## Quick start

1. Download this repo as ZIP and extract it.
2. Visit `chrome://extensions/` and enable **Developer mode**.
3. Select **Load unpacked** and choose the **extension/** folder (not the repository root).
4. Copy ClassCrate's extension ID shown by Chrome.
5. Follow [docs/SETUP.md](docs/SETUP.md) to create a Google Cloud project, enable the Classroom and Drive APIs, and configure the **Chrome Extension OAuth client**.
6. Put your OAuth **client ID** (not a client secret) in `extension/manifest.json`, then reload the extension.
7. Open `https://classroom.google.com/`, choose the floating ClassCrate button, sign in with Google, select a subject, click Fetch, select files and download.

**Google Workspace caveat:** Being able to open Classroom in Chrome does not guarantee the university allows access from unverified third-party OAuth apps. Ask your administrator if an access policy blocks the necessary scopes. Never try to bypass restrictions.

## Project structure

```text
ClassCrate-Bulk-PDF-Downloader/
├── extension/
│   ├── manifest.json            Chrome MV3 configuration, OAuth scopes
│   ├── background.js            Classroom + Drive API, auth, download queue
│   ├── content.js               On-page subject picker and file preview UI
│   ├── config.js                Optional store and WhatsApp links
│   ├── lib/core.mjs             Pure helpers for attachments and downloads
│   └── icons/                   Extension PNGs
├── docs/
│   ├── SETUP.md                 Complete Google OAuth setup
│   ├── PRIVACY.md               Data and permissions explanation
│   └── TEST_CHECKLIST.md        Browser verification steps
├── tests/
│   ├── core.test.mjs
│   └── background.test.mjs
├── README_CONCEPTS_QA.md        Developer concept questions and answers
└── LICENSE
```

## Learn the code

Read **[README_CONCEPTS_QA.md](README_CONCEPTS_QA.md)** for in-depth Q&A on Manifest V3, content scripts, service workers, Google OAuth, API paging, MIME types, concurrency, permissions, error handling, Git/GitHub and publishing.

## Run automated tests

Requires Node.js only for development:

```bash
node --test tests/*.test.mjs
```

The extension itself needs **no Node.js or npm at runtime**.

## Share for free

Classmates can use **Code → Download ZIP**, extract, turn on Developer Mode and load `extension/`. Each person signs into their own authorized Google account. During Google's OAuth Testing stage, **only designated test users** can authorize the app; broad distribution may require Google's verification, especially with the restricted Drive read scope.

Publishing via the Chrome Web Store is optional and requires a developer registration fee. Your extension can remain free for users, regardless of publication method.

## Feedback setup

Edit `extension/config.js` to set your *real* WhatsApp number or Chrome Web Store URL **later**. The WhatsApp button only opens a draft; it does not send a message automatically. Do not publish a personal phone number unless you accept public exposure.

## Known limitations

- Only attachments accessible to the signed-in user are downloadable.
- Owner-disabled downloads, unsupported Google file types, YouTube or external sites are not downloaded as fake PDFs.
- A school administrator can block your OAuth app; there is no legitimate bypass.
- The OAuth scopes are broad. Before public launch, review least-privilege, app verification and Chrome Web Store policies.
- Files go to Chrome's configured Downloads directory; Windows Downloads may differ if changed in settings.
- No automatic PDF conversion of existing PowerPoint files; they stay PPTX as requested.
- Download files individually; this version does not create ZIP archives.
- Some API error responses, unusual file types or Chrome prompts require testing with real courses.

## What comes after midterms?

Duplicate-aware syncing, optional ZIP export, subject history, improved error recovery, UI polish, comprehensive integration tests, Google verification and Chrome Web Store listing.

## Official documentation

- [Chrome extension identity](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Chrome Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads)
- [Google Classroom API](https://developers.google.com/workspace/classroom/reference/rest)
- [Google Drive downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads)

Licensed under [MIT](LICENSE).
