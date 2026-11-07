# ClassCrate — Setup and troubleshooting

## 1. Install the extension

Extract the repository. In Chrome, visit `chrome://extensions`, enable Developer mode, then choose **Load unpacked** → select `extension/`. Record the extension ID that Chrome displays.

## 2. Configure Google Cloud (free development setup)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named ClassCrate.
3. Enable **Google Classroom API** and **Google Drive API** from the API Library.
4. Under **Google Auth Platform → Branding / Audience**, configure an External app in Testing where available. Set app name, email and relevant details as prompted.
5. Add your Google account and university account to **Test users**, when the test-user setting is available. Your classmates must be added too during Testing.
6. Under **Data Access**, request the exact scopes in `extension/manifest.json`:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly`
   - `https://www.googleapis.com/auth/classroom.announcements.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
7. Under **Clients**, create an OAuth client of type **Chrome Extension** (some interfaces call this Chrome App); associate it with the extension ID from step 1.
8. Copy the public OAuth client ID ending in `.apps.googleusercontent.com` into `extension/manifest.json` in place of the placeholder.
9. Reload the extension on `chrome://extensions`. Open Google Classroom and click the ClassCrate floating button, then **Continue with Google**.

**Security:** Never put a client secret, refresh token, password, private key, session cookie, or access token in the repository. The OAuth client ID is a public identifier.

## 3. Work with a university-managed account

The university's Workspace administrator may block this third-party app and its Google Drive scope. If you see access denied or app blocked, ask the admin for approval. A third-party extension working does not prove that this app's separate OAuth client is authorized.

`drive.readonly` is a **restricted scope**. Public distribution can require Google's app verification and associated compliance steps. Keep this project local while testing.

## 4. Where do downloads go?

Native Chrome downloads: `ClassCrate/<Subject>/<Post>/<filename>` relative to your configured Chrome Downloads directory. Files appear individually at `chrome://downloads/`. Turning off post organization gives `ClassCrate/<Subject>/<filename>`.

## 5. Diagnose errors

| Symptom | Check |
| --- | --- |
| `invalid_client` | Extension ID matches the OAuth client; OAuth client has correct type |
| `access_denied` | Google test users, account selection, school Workspace restrictions |
| 403 for Classroom | Required Classroom scopes and role permissions |
| 403 for Drive | File owner restrictions, Drive sharing, admin policy |
| No subjects | Signed-in Google account and active Classroom courses |
| No files | Material type, actual attachments, permission to read posts |
| Download interrupted | `chrome://downloads`, network, Chrome automatic-download prompts |
| Popup doesn't appear | Reload Classroom after extension installation; inspect console |
| Wrong folder | Chrome Settings → Downloads location |

Debug the service worker at `chrome://extensions` → ClassCrate → **Service worker → Inspect**. Do not post API tokens or private class materials in public issues.

## 6. Optional feedback links

Update `extension/config.js` with your own verified Chrome Web Store URL (only after release) and a WhatsApp number you are comfortable making public. WhatsApp generates a draft; the person sending the feedback controls the final message.

## 7. Update the local version

Download the latest GitHub ZIP, replace your extracted source folder, and click **Reload** in Chrome's Extensions page. If you change the manifest key, the extension ID can change; re-check the OAuth association.
