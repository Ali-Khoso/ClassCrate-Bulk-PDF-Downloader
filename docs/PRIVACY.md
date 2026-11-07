# ClassCrate Privacy and Permissions

**Local development version.** This document describes intended behavior; it is not a substitute for a reviewed and hosted Chrome Web Store privacy policy.

- **Google authentication:** Chrome's `identity.getAuthToken` requests Google access tokens. ClassCrate does not request passwords or store tokens itself. Chrome manages token caching.
- **Classroom permissions:** The extension reads courses, coursework materials, assigned coursework, and announcements to discover attachments. Reading this information can expose private course metadata.
- **Drive permission:** `drive.readonly` is needed to obtain metadata and download accessible Drive attachments. It is a restricted Google OAuth scope and may require verification for general distribution.
- **Storage:** `chrome.storage.local` keeps download job names, paths, statuses and errors. Session storage holds the selected subject's temporary file list. It does not upload data to an application server.
- **Downloads:** File bytes are fetched from Google Drive using an authorized Chrome download; files save into the browser's configured Downloads directory.
- **Feedback:** Star rating and comments stay in the UI until you choose to copy or share them. An optional WhatsApp button opens a draft; it never sends messages automatically. Avoid including private course information in bug reports.
- **Network traffic:** The implementation contacts Google Classroom / Drive APIs. Optional feedback sharing only opens a user-controlled external URL. No analytics, advertisements, or ClassCrate telemetry.
- **Access limits:** The extension honors file-owner download restrictions, university policies and Google permissions.

For public release, provide accurate consent disclosures, a hosted privacy policy, a way to contact the developer, and complete any required Google verification and Chrome Web Store review.
