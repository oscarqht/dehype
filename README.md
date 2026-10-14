# Dehype for Twitter / X

![Dehype for X poster: Less hype. More signal. Turn hyped posts into plain language.](docs/assets/dehype-poster.png)

A cross-browser extension (for **Google Chrome** and **Mozilla Firefox**) that replaces hyped Twitter/X post content with a clean, dehyped version generated via AI workflow.

---

## ✨ Features

- **Automatic Timeline Dehyping**: Automatically detects top-level tweets as you scroll down your timeline on `x.com` and `twitter.com`.
- **Loading Skeleton UI**: Replaces the original tweet text with an animated shimmer skeleton while awaiting the API response.
- **Top-Level Tweets Only**: Targets main tweets and intentionally ignores nested quote tweet cards.
- **Per-Tweet Dehyping**: Sends one API request per tweet so each post updates independently as soon as its response arrives.
- **500-Item LRU Cache**: Automatically stores the 500 most recently processed tweets in `chrome.storage.local`. Re-visiting the same tweets retrieves the result instantly without sending any API requests.
- **Original vs Dehyped Toggle**: Every dehyped tweet features a subtle `✨ Dehyped` badge. Clicking it toggles between the original text (`↩ Original`) and the dehyped text.
- **Rich Text Preservation**: Automatically formats line breaks and linkifies URLs, `@mentions`, and `#hashtags`.
- **Graceful Error Recovery**: If the API call fails or encounters network errors, the tweet reverts to its original content with an unobtrusive retry button (`⚠️ Dehype failed · Click to retry`).
- **Options & Popup UI**: Configure your Bearer API token, test your connection, check cache statistics (`X / 500 tweets cached`), and clear the cache at any time.

---

## 🛠️ Development & Build

### Requirements
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install --include=dev
```

### 2. Build the Extension
```bash
npm run build
```

This compiles TypeScript source code and assets into:
- `dist/chrome`: Manifest V3 extension for Google Chrome / Brave / Edge.
- `dist/firefox`: Manifest V3 extension for Mozilla Firefox.

### 3. Type Checking
```bash
npm run typecheck
```

---

## 🚀 Loading the Extension

### In Google Chrome (or Edge / Brave / Chromium):
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/chrome` folder inside this repository.
5. Click on the Dehype extension icon in your browser toolbar and click **Open Settings** (or right-click the extension icon and select **Options**).
6. Enter your Bearer API key, click **Test Connection**, and click **Save Key**.

### In Mozilla Firefox:
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the `dist/firefox` folder.
4. Open the extension's Options page or toolbar popup to enter your API key and verify connection.

---

## ⚙️ Workflow API Specification

The extension communicates with:
- **Endpoint**: `POST https://ai.insea.io/api/workflows/28777/run`
- **Headers**:
  - `Authorization: Bearer <API_KEY>`
  - `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "text": "Tweet content"
  }
  ```
- **Response**:
  ```json
  {
    "request_id": "req_123456",
    "data": {
      "status": "succeeded",
      "inputs": {
        "text": "Tweet content"
      },
      "outputs": {
        "result": "Dehyped tweet",
        "isHype": true
      }
    }
  }
  ```

---

## 📁 Project Structure

```
├── public/
│   └── icons/              # 16x16, 48x48, 128x128 extension icons
├── scripts/
│   └── build.mjs           # Multi-browser build script (Chrome & Firefox)
├── src/
│   ├── background/         # Service worker handling API requests & badge
│   ├── content/            # Twitter/X DOM observer, skeleton, toggle & batching
│   ├── options/            # Options/settings page (API key, cache stats, test)
│   ├── popup/              # Toolbar popup quick status & actions
│   ├── shared/             # Types, 500-item LRU cache, text linkifier & API client
│   ├── manifest.chrome.json
│   └── manifest.firefox.json
├── package.json
└── tsconfig.json
```
