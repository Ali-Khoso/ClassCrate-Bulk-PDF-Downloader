# ClassCrate — Important Concepts: Questions & Answers

This is the **second README** for ClassCrate. Use the main [README.md](README.md) for installation. This guide explains the concepts behind the extension in easy, interview-ready English.

## A. Chrome Extension Architecture

### Q1. What is ClassCrate?
A free Chrome extension that lets an authorized student choose one Google Classroom subject, fetch accessible attachments, select files and download them through Chrome.

### Q2. Why choose a Chrome extension instead of a website?
An extension can put its user interface directly on Classroom pages and use browser features such as Chrome Downloads and Google identity authentication.

### Q3. What is Manifest V3?
Chrome's modern extension architecture. It separates extension configuration, page interaction and event-driven background logic.

### Q4. What does manifest.json do?
It declares the name, version, permissions, allowed hostnames, OAuth scopes, content scripts and background service worker.

### Q5. What is a content script?
JavaScript loaded into a permitted webpage. In ClassCrate, extension/content.js adds a floating panel onto classroom.google.com.

### Q6. What is a service worker?
An event-driven background script. The ClassCrate worker in extension/background.js handles Google APIs, authentication and download operations. Chrome may suspend and restart it.

### Q7. Content script vs service worker?
The content script displays UI and handles user clicks. The service worker runs privileged tasks such as accessing Chrome Downloads and Google API data.

### Q8. How do they communicate?
Messages, such as COURSES, FILES, START_DOWNLOAD, JOB and CANCEL, are sent using chrome.runtime.sendMessage and processed by chrome.runtime.onMessage.

### Q9. Why use Shadow DOM for the user interface?
It helps isolate ClassCrate's styles from Google Classroom's CSS and reduces accidental conflicts.

### Q10. Why no backend?
Classroom and Drive already host the information. The extension accesses them directly with an authorized account and uses Chrome for local downloads. The MVP does not need a database or paid server.

## B. Authentication and Google APIs

### Q11. What is OAuth 2.0?
A way for users to give an application limited permission to access their data without giving the app their Google password.

### Q12. Does the user need to sign up separately for ClassCrate?
No. They sign into Google using Chrome's identity flow and grant the app requested permissions.

### Q13. What is an access token?
A temporary credential sent in an HTTP Authorization header when calling Google APIs. Never expose tokens in GitHub repositories, logs or feedback screenshots.

### Q14. What is a Google OAuth client ID?
A public identifier for the application. It must match the Chrome extension registered in Google Cloud. It is not a secret or password.

### Q15. What is an OAuth scope?
A permission requested from Google. The manifest declares read-only Classroom and Drive scopes. The user or administrator can refuse them.

### Q16. Why is drive.readonly a concern?
This restricted Google scope may give broad read access to Drive data, not just one course. Production distribution may require Google OAuth verification and stronger compliance checks.

### Q17. Why can the university block the extension?
A school Google Workspace administrator may disallow third-party apps or their scopes. Accessing Classroom in Chrome does not automatically authorize this new OAuth application.

### Q18. What is the Google Classroom API?
An official way to retrieve course and classwork information that the signed-in user is allowed to access.

### Q19. What is the Google Drive API?
An official interface for Drive file metadata, permissions, file downloads and exports. Classroom discovers materials, while Drive supplies accessible files.

### Q20. What is an API endpoint?
A URL for requesting a specific resource. For example, the Classroom courses endpoint returns authorized course records.

### Q21. What is API pagination?
Large responses arrive in batches. ClassCrate follows nextPageToken to request the remaining results.

### Q22. What is HTTP 401?
Typically an invalid or expired token. The worker tries to clear the cached token and retrieve a valid one before retrying the request once.

### Q23. What is HTTP 403?
Access was denied. Possible reasons include school policies, insufficient scope permission or Drive owner restrictions. ClassCrate does not bypass these rules.

### Q24. Why remove duplicate files?
The same Drive attachment can appear in multiple posts. collectMaterials tracks Drive IDs in a Set to avoid showing duplicate attachments.

## C. Files, Formats and Downloads

### Q25. What is a MIME type?
A standard label for file content, such as application/pdf. It helps determine an attachment's type and export behavior.

### Q26. Are PowerPoint files converted to PDFs automatically?
No. An existing PPTX stays PPTX; a DOCX stays DOCX; a PDF stays PDF. Maintaining original formats is a key requirement.

### Q27. What about native Google Docs and Slides?
Google editor documents require export. ClassCrate can export Google Docs to DOCX, Slides to PPTX and Sheets to XLSX when Google permits it.

### Q28. What is chrome.downloads.download?
The browser API used to start a real Chrome download. Downloads appear in Chrome's download history and configured Downloads folder.

### Q29. How are files organized?
In ClassCrate / Subject / Post / Filename folders, or flat within ClassCrate / Subject when post organization is disabled.

### Q30. Why sanitize file paths?
Course and file names may contain invalid characters or misleading path fragments. safePart removes problematic characters before constructing download paths.

### Q31. What is a queue?
A list of selected files waiting to download. Each download follows states such as queued, starting, downloading, complete and failed.

### Q32. Why limit concurrent downloads to two?
A small concurrency limit reduces simultaneous traffic and makes progress tracking more predictable.

### Q33. How does progress work?
The worker listens to chrome.downloads.onChanged and stores file statuses. The on-page panel requests the latest job summary.

### Q34. What happens when the background worker restarts?
Important job state is stored in Chrome local storage. On startup, the worker checks existing Chrome downloads and reconciles known statuses where possible.

### Q35. Local storage vs session storage?
Local storage persists job progress between browser restarts. Session storage holds short-lived subject and file cache data.

### Q36. Why might a listed attachment fail to download?
Permissions may change, a Drive file might be deleted, Google's export may fail, network access may be interrupted, or Chrome may require automatic-download permission.

## D. Safety, Privacy and Feedback

### Q37. Does ClassCrate upload lecture files to its own servers?
No app backend or telemetry service is included in this local version. File content is requested from Google Drive and saved by Chrome.

### Q38. Can the extension bypass school or teacher download restrictions?
No. It only downloads content that Google's APIs allow the signed-in user to access and download.

### Q39. How does the WhatsApp feedback feature work?
An optional button opens a draft message containing a user-supplied rating and feedback. The user must review and send it manually.

### Q40. Why is the Chrome Store rating button disabled at first?
The extension does not yet have a published store listing. The actual listing URL must be supplied in extension/config.js after publication.

### Q41. What security practices are important?
Never commit access tokens or passwords; validate input; use least-privilege scopes where possible; avoid loading untrusted scripts; avoid logging private class information; honor API and user permissions.

## E. Testing, GitHub and Interview Preparation

### Q42. How do I run automated tests?
With Node.js installed for development, run: node --test tests/*.test.mjs . Node.js is not required to run the installed extension.

### Q43. What tests are included?
Pure helper tests check filenames, original file formats, Google exports, duplicate filtering, URL validation and progress summaries. A mocked service-worker test simulates the Classroom to Drive to Chrome Downloads flow.

### Q44. How do I investigate errors?
Open chrome://extensions, select ClassCrate and inspect its service worker. Use Chrome DevTools to examine UI problems and chrome://downloads to inspect download failures. Do not paste private tokens or coursework into public issues.

### Q45. What should I say about this project in an interview?
"I built a Manifest V3 Chrome extension that uses Google OAuth, Classroom and Drive APIs to discover authorized course attachments. I developed a subject-wise UI, file filtering, a limited-concurrency download queue, local state recovery and automated tests."

### Q46. What software design principles are used?
Separation of concerns, event-driven programming, asynchronous JavaScript, input validation, explicit authorization, minimal persistent state and dependency-free core helpers.

### Q47. How do I share the extension with friends for free?
Friends download the GitHub repository ZIP, enable Chrome Developer mode, and load the extension folder. Each user must authorize Google access. During OAuth testing, users may have to be added to the application's test-user list.

### Q48. What makes a Git commit meaningful?
A commit should represent a coherent change, such as implementing course discovery, adding download state, writing tests or documenting permissions. Avoid splitting the same unfinished feature into arbitrary empty commits.

### Q49. What will we improve after midterms?
Optional ZIP output, duplicate-aware syncing, improved file previews, error recovery, accessibility, public privacy policy, OAuth verification and Chrome Web Store publishing.

### Q50. Which files should I read first?
Start with extension/manifest.json, then extension/content.js, extension/background.js and extension/lib/core.mjs. Read tests/core.test.mjs to understand expected behavior.

---

## Key code map

| Concept | File |
| --- | --- |
| Permissions and OAuth configuration | extension/manifest.json |
| Google API access and download state | extension/background.js |
| Subject picker and searchable preview | extension/content.js |
| Filename sanitization and MIME types | extension/lib/core.mjs |
| WhatsApp and optional store link | extension/config.js |
| Unit tests | tests/core.test.mjs |
| Mocked service-worker test | tests/background.test.mjs |
| OAuth installation | docs/SETUP.md |
| Privacy explanation | docs/PRIVACY.md |

**End-to-end flow:** Google sign-in → list subjects → choose subject → Fetch Files → select attachments → download via Chrome → view completion → optional feedback.
