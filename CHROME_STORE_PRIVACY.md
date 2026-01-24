# Chrome Web Store Privacy Practices

This document contains the required justifications for Chrome Web Store submission.

---

## Single Purpose Description

**SafeSnap automatically detects and redacts personally identifiable information (PII) in web page screenshots to protect privacy before sharing.**

---

## Permission Justifications

### activeTab

**Justification:**

SafeSnap requires the `activeTab` permission to capture screenshots of the current tab when the user clicks the extension icon and initiates a screenshot. This permission is only activated when the user explicitly interacts with the extension popup and clicks the "Protect & Screenshot" button. The extension reads the visible content of the active tab to detect PII (names, emails, phone numbers, etc.) and replace them with anonymized values before capturing the screenshot. No data is accessed without direct user action.

---

### downloads

**Justification:**

SafeSnap requires the `downloads` permission to save the protected screenshot to the user's device. After the user captures a screenshot with PII redacted, they can download the image file directly to their computer. This is the core functionality of the extension - allowing users to save privacy-protected screenshots locally. The download is only triggered by explicit user action (clicking the download button).

---

### host_permissions (`<all_urls>`)

**Justification:**

SafeSnap requires broad host permissions to function on any website the user visits. The extension's purpose is to protect PII in screenshots of ANY web page - including internal company tools, CRM systems, email clients, banking sites, healthcare portals, and other sensitive applications. Users need PII protection regardless of which domain they are viewing. The content script must be able to:

1. Read page content to detect PII (names, emails, phone numbers, money amounts, dates, etc.)
2. Apply visual redactions to the page before screenshot capture
3. Display a privacy banner indicating protection status

Without broad host permissions, users would be unable to protect screenshots on most websites where they actually need privacy protection. All processing happens locally in the browser - no page content is ever transmitted externally.

---

### storage

**Justification:**

SafeSnap requires the `storage` permission to save user preferences locally using `chrome.storage.local`. This includes:

- Which PII types to detect (names, emails, phones, money, dates, etc.)
- Detection sensitivity threshold
- Redaction mode preference (random replacement vs. blackout)
- Banner position preference
- Magnitude variance setting for numeric values
- Custom regex patterns defined by the user

All settings are stored locally on the user's device only. No data is synced to external servers. This allows users to maintain consistent preferences across browser sessions without re-configuring the extension each time.

---

### tabs

**Justification:**

SafeSnap requires the `tabs` permission to:

1. Query the active tab to determine if content scripts are loaded and ready
2. Send messages between the popup, background service worker, and content scripts
3. Capture the visible tab as a screenshot using `chrome.tabs.captureVisibleTab()`

This permission enables the core screenshot capture functionality and the communication required to coordinate PII detection and redaction between extension components. The extension only accesses tab information when the user explicitly initiates a screenshot action.

---

## Remote Code

**Justification:**

SafeSnap does **NOT** use any remote code. All JavaScript code is bundled locally within the extension package at build time. The extension does not:

- Load scripts from external servers
- Execute dynamically fetched code
- Use `eval()` or similar dynamic code execution
- Connect to any external APIs or services

All PII detection algorithms, dictionaries (20,000+ proper nouns), and replacement logic are included in the extension bundle. The Content Security Policy explicitly restricts script sources to 'self' only:

```
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

---

## Data Usage Compliance Certification

SafeSnap certifies compliance with Chrome Web Store Developer Program Policies:

### Data Collection

- **SafeSnap does NOT collect any user data**
- **SafeSnap does NOT transmit any data to external servers**
- **All processing happens 100% locally in the user's browser**

### Data Usage

- Page content is read only to detect PII patterns
- Detected PII is replaced with anonymized values locally
- Screenshots are saved directly to the user's device
- User preferences are stored locally using chrome.storage.local

### Data Sharing

- **SafeSnap does NOT share any data with third parties**
- **SafeSnap does NOT use analytics or tracking**
- **SafeSnap does NOT contain advertisements**

### Data Security

- No network requests are made (except for extension updates via Chrome Web Store)
- No user data leaves the browser
- Source code is open source and auditable: https://github.com/safe-snap/safesnap-chrome-extension

---

## Privacy Policy

SafeSnap is committed to user privacy. Our complete privacy policy is available at:

https://github.com/safe-snap/safesnap-chrome-extension/blob/main/PRIVACY.md

**Summary:** SafeSnap processes all data locally. No personal information, browsing history, screenshots, or detected PII is ever collected, stored on external servers, or shared with any third party.
