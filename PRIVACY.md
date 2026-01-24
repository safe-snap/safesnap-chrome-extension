# Privacy Policy

**Last Updated:** January 2026

## Overview

SafeSnap is a privacy-first Chrome extension that helps users protect personally identifiable information (PII) in screenshots. We are committed to protecting your privacy and being transparent about our practices.

**The short version: SafeSnap does not collect, store, or transmit any of your data. Everything happens locally in your browser.**

---

## Data Collection

### What We DO NOT Collect

SafeSnap does **NOT** collect:

- Personal information (name, email, address, etc.)
- Browsing history or visited URLs
- Page content or text from websites you visit
- Screenshots you capture
- Detected PII or redacted content
- Usage analytics or telemetry
- Device identifiers or fingerprints
- IP addresses
- Any other user data

### What We Store Locally

SafeSnap stores the following data **locally on your device only** using Chrome's `storage.local` API:

- Your extension preferences (which PII types to detect)
- Detection sensitivity settings
- Redaction mode preference (random replacement vs. blackout)
- UI preferences (banner position, etc.)
- Custom regex patterns you define

This data never leaves your browser and is not accessible to us or any third party.

---

## Data Processing

### How SafeSnap Works

1. **Detection**: When you activate SafeSnap, it scans the visible page content to identify PII patterns (names, emails, phone numbers, etc.)

2. **Redaction**: Detected PII is replaced with anonymized placeholder values directly in your browser

3. **Screenshot**: The protected page is captured as an image

4. **Download**: The screenshot is saved directly to your device

**All of these steps happen 100% locally in your browser. No data is ever sent to external servers.**

### No Network Requests

SafeSnap does not make any network requests except for:

- Automatic extension updates through the Chrome Web Store (handled by Chrome, not by SafeSnap)

We do not operate any servers, APIs, or cloud services.

---

## Third-Party Services

SafeSnap does **NOT** use any third-party services, including:

- Analytics services (Google Analytics, Mixpanel, etc.)
- Crash reporting services
- Advertising networks
- Data brokers
- Cloud storage providers
- AI/ML services

---

## Data Sharing

We do **NOT** share any data with third parties because we do not collect any data.

---

## Data Security

Since all processing happens locally in your browser:

- Your data never travels over the network
- There are no servers that could be breached
- Your screenshots remain on your device
- You maintain complete control over your data

---

## Children's Privacy

SafeSnap does not collect any personal information from anyone, including children under 13 years of age.

---

## Open Source

SafeSnap is open source software. You can audit our code to verify our privacy practices:

**Repository:** https://github.com/safe-snap/safesnap-chrome-extension

---

## Your Rights

Since we don't collect any data, there is no personal data to:

- Access
- Correct
- Delete
- Export

Your extension preferences are stored locally and can be cleared by:

1. Uninstalling the extension, or
2. Using the "Reset to Defaults" option in settings, or
3. Clearing your browser's extension data

---

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date at the top of this document. Significant changes will be noted in our release notes.

---

## Contact

If you have questions about this privacy policy or SafeSnap's privacy practices, please:

- Open an issue: https://github.com/safe-snap/safesnap-chrome-extension/issues
- Email: support@safesnap.app

---

## Summary

| Question                              | Answer                           |
| ------------------------------------- | -------------------------------- |
| Do you collect personal data?         | **No**                           |
| Do you track users?                   | **No**                           |
| Do you use analytics?                 | **No**                           |
| Do you share data with third parties? | **No**                           |
| Do you display ads?                   | **No**                           |
| Where is data processed?              | **Locally in your browser only** |
| Do you operate servers?               | **No**                           |

**SafeSnap is built on a simple principle: your data is yours, and it should stay that way.**
