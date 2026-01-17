# SafeSnap Extension - Feature Demonstration

This document demonstrates the capabilities of the SafeSnap Chrome extension through real-world scenarios. Each scenario shows how SafeSnap automatically detects and protects different types of Personally Identifiable Information (PII) in screenshots.

---

## Table of Contents

1. [Scenario 1: Email & Contact Information](#scenario-1-email--contact-information)
2. [Scenario 2: Names & Proper Nouns](#scenario-2-names--proper-nouns)
3. [Scenario 3: Financial Data](#scenario-3-financial-data)
4. [Scenario 4: Location Information](#scenario-4-location-information)
5. [Scenario 5: Mixed Content (Real-World Example)](#scenario-5-mixed-content-real-world-example)
6. [Settings & Configuration](#settings--configuration)
7. [How to Capture These Screenshots](#how-to-capture-these-screenshots)

---

## Scenario 1: Email & Contact Information

**Use Case:** Sharing a support ticket or customer inquiry without exposing customer contact details.

### BEFORE (Without SafeSnap)

![Email Before](demo-screenshots/01-email-before.png)

**Content visible:**

```
From: john.smith@company.com
To: support@example.com
Phone: (555) 123-4567

Hi, I need help with my account. You can reach me at
john.smith@company.com or call me at (555) 123-4567.

Thanks,
John Smith
```

**Privacy Risks:**

- ✗ Email addresses fully visible
- ✗ Phone numbers exposed
- ✗ Full names revealed
- ✗ Can be used for spam, phishing, or identity theft

### AFTER (With SafeSnap)

![Email After](demo-screenshots/01-email-after.png)

**Content protected:**

```
From: [EMAIL_PROTECTED]
To: [EMAIL_PROTECTED]
Phone: [PHONE_PROTECTED]

Hi, I need help with my account. You can reach me at
[EMAIL_PROTECTED] or call me at [PHONE_PROTECTED].

Thanks,
[NAME_PROTECTED]
```

**Protection Applied:**

- ✓ All email addresses replaced with fake emails (e.g., alice.johnson@example.com)
- ✓ Phone numbers replaced with realistic fake numbers
- ✓ Personal names replaced with consistent fake names
- ✓ Format preserved for readability

---

## Scenario 2: Names & Proper Nouns

**Use Case:** Documenting team processes or sharing meeting notes without identifying individuals.

### BEFORE (Without SafeSnap)

![Names Before](demo-screenshots/02-names-before.png)

**Content visible:**

```
Meeting Notes - Q1 Planning

Attendees:
- CEO John Smith
- CTO Jane Doe
- VP Sarah Lee
- Director Tom Brown
- Manager Lisa Green

Discussion:
John Smith proposed the new initiative. Jane Doe will lead
the technical implementation. Sarah Lee confirmed budget
approval. By Stephen Council, Tech Reporter.

Action Items:
- John: Review proposal by Friday
- Jane: Schedule tech review
- Sarah: Finalize budget allocation
```

**Privacy Risks:**

- ✗ Executive names exposed (CEO, CTO, VP)
- ✗ Manager names revealed
- ✗ Reporter names visible
- ✗ Can be used to identify organizational structure

### AFTER (With SafeSnap)

![Names After](demo-screenshots/02-names-after.png)

**Content protected:**

```
Meeting Notes - Q1 Planning

Attendees:
- CEO [NAME_PROTECTED]
- CTO [NAME_PROTECTED]
- VP [NAME_PROTECTED]
- Director [NAME_PROTECTED]
- Manager [NAME_PROTECTED]

Discussion:
[NAME_PROTECTED] proposed the new initiative. [NAME_PROTECTED]
will lead the technical implementation. [NAME_PROTECTED]
confirmed budget approval. By [NAME_PROTECTED], Tech Reporter.

Action Items:
- [NAME]: Review proposal by Friday
- [NAME]: Schedule tech review
- [NAME]: Finalize budget allocation
```

**Protection Applied:**

- ✓ All names replaced with fake names (e.g., Robert Johnson, Emily Davis)
- ✓ Executive titles (CEO, CTO, VP) preserved for context
- ✓ Job descriptions (Tech Reporter, Manager) handled correctly
- ✓ Common words like "By" not included in name detection
- ✓ Consistent replacement (same name = same replacement throughout)

**Key Improvement:**

- ✓ "By Stephen Council, Tech Reporter" now correctly detects only "Stephen Council"
- ✓ "Tech Reporter" is NOT detected as a company (fixed false positive)
- ✓ "Senior Engineer John Smith" correctly detects the name with reduced confidence

---

## Scenario 3: Financial Data

**Use Case:** Sharing payment confirmations or financial dashboards without exposing sensitive financial information.

### BEFORE (Without SafeSnap)

![Financial Before](demo-screenshots/03-financial-before.png)

**Content visible:**

```
Payment Summary

Customer: John Doe
Email: john.doe@email.com
Credit Card: 4532-1234-5678-9010
Expiry: 12/25
CVV: 123

Transaction Details:
Amount: $1,250.00
Date: January 15, 2024
SSN: 123-45-6789

Billing Address:
123 Main Street
New York, NY 10001
```

**Privacy Risks:**

- ✗ Full credit card number exposed (can be used for fraud)
- ✗ SSN visible (major identity theft risk)
- ✗ Complete financial profile available
- ✗ Home address revealed

### AFTER (With SafeSnap)

![Financial After](demo-screenshots/03-financial-after.png)

**Content protected:**

```
Payment Summary

Customer: [NAME_PROTECTED]
Email: [EMAIL_PROTECTED]
Credit Card: [CARD_PROTECTED]
Expiry: [DATE_PROTECTED]
CVV: [REDACTED]

Transaction Details:
Amount: [AMOUNT_PROTECTED] ($1,190.00 - $1,310.00 range)
Date: [DATE_PROTECTED]
SSN: [SSN_PROTECTED]

Billing Address:
[ADDRESS_PROTECTED]
[LOCATION_PROTECTED]
```

**Protection Applied:**

- ✓ Credit card numbers replaced with valid test card numbers
- ✓ SSN replaced with fake but valid format SSN
- ✓ Dollar amounts replaced with similar values (±5% variance)
- ✓ Dates replaced while preserving format
- ✓ Addresses and locations replaced with fake equivalents

---

## Scenario 4: Location Information

**Use Case:** Sharing analytics dashboards or user reports without revealing user locations.

### BEFORE (Without SafeSnap)

![Location Before](demo-screenshots/04-location-before.png)

**Content visible:**

```
User Analytics Dashboard

Top Locations:
1. New York - 1,250 users
2. Bay Area - 890 users
3. Los Angeles - 765 users
4. Chicago - 543 users
5. Seattle - 432 users

Regional Breakdown:
- California: 35% of traffic
- New York: 25% of traffic
- Texas: 15% of traffic
- Washington: 10% of traffic

Office Locations:
- 123 Market Street, San Francisco, CA 94103
- 456 Broadway, New York, NY 10013
- 789 Michigan Avenue, Chicago, IL 60611

Customer: Jane Smith from Boston, Massachusetts
Email: jane.smith@company.com
Address: 321 Commonwealth Ave, Boston, MA 02115
```

**Privacy Risks:**

- ✗ Specific user locations exposed
- ✗ Office addresses revealed
- ✗ Customer addresses visible
- ✗ Regional analytics can identify business operations

### AFTER (With SafeSnap)

![Location After](demo-screenshots/04-location-after.png)

**Content protected:**

```
User Analytics Dashboard

Top Locations:
1. [LOCATION] - 1,250 users
2. [LOCATION] - 890 users
3. [LOCATION] - 765 users
4. [LOCATION] - 543 users
5. [LOCATION] - 432 users

Regional Breakdown:
- [STATE]: 35% of traffic
- [STATE]: 25% of traffic
- [STATE]: 15% of traffic
- [STATE]: 10% of traffic

Office Locations:
- [ADDRESS_PROTECTED]
- [ADDRESS_PROTECTED]
- [ADDRESS_PROTECTED]

Customer: [NAME] from [LOCATION]
Email: [EMAIL_PROTECTED]
Address: [ADDRESS_PROTECTED]
```

**Protection Applied:**

- ✓ City names replaced (e.g., New York → Riverdale)
- ✓ Regions replaced (e.g., Bay Area → Pine Valley)
- ✓ State names replaced with other US states
- ✓ Complete addresses replaced with fake addresses
- ✓ Location consistency maintained within document

**Key Feature:**

- ✓ 500+ location gazetteer for accurate detection
- ✓ Type-aware replacement (city→city, region→region, state→state)

---

## Scenario 5: Mixed Content (Real-World Example)

**Use Case:** Sharing a complete customer support interaction with multiple PII types.

### BEFORE (Without SafeSnap)

![Mixed Before](demo-screenshots/05-mixed-before.png)

**Content visible:**

```
Support Ticket #12345

From: Sarah Johnson <sarah.j@techcorp.com>
Date: January 15, 2024
Phone: +1 (555) 987-6543
Location: Seattle, Washington

Issue Description:
I'm having trouble accessing my account. I've tried resetting
my password using my registered email sarah.j@techcorp.com
but haven't received the reset link.

Account Details:
- Account ID: ACC-2024-5678
- Registration Date: 03/15/2023
- Last Login IP: 192.168.1.100
- Payment Method: Visa ending in 4532
- Amount Charged: $299.99
- Billing Address: 456 Pine Street, Seattle, WA 98101

Previous Correspondence:
On 01/10/2024, I spoke with Agent Mike Chen who said the
issue would be resolved. Please contact me at the number
above or email me.

Company Info:
TechCorp Solutions Inc.
Website: https://techcorp.com
Support: support@techcorp.com
SSN on File: 987-65-4321
```

**Privacy Risks:**

- ✗ Multiple email addresses exposed
- ✗ Phone numbers visible
- ✗ IP address revealed
- ✗ Credit card information shown
- ✗ SSN exposed
- ✗ Physical address visible
- ✗ Personal names throughout
- ✗ Complete customer profile available

### AFTER (With SafeSnap)

![Mixed After](demo-screenshots/05-mixed-after.png)

**Content protected:**

```
Support Ticket #12345

From: [NAME_PROTECTED] <[EMAIL_PROTECTED]>
Date: [DATE_PROTECTED]
Phone: [PHONE_PROTECTED]
Location: [LOCATION_PROTECTED]

Issue Description:
I'm having trouble accessing my account. I've tried resetting
my password using my registered email [EMAIL_PROTECTED]
but haven't received the reset link.

Account Details:
- Account ID: ACC-2024-5678
- Registration Date: [DATE_PROTECTED]
- Last Login IP: [IP_PROTECTED]
- Payment Method: Visa ending in [REDACTED]
- Amount Charged: [AMOUNT_PROTECTED]
- Billing Address: [ADDRESS_PROTECTED]

Previous Correspondence:
On [DATE_PROTECTED], I spoke with Agent [NAME_PROTECTED] who
said the issue would be resolved. Please contact me at the
number above or email me.

Company Info:
[COMPANY_PROTECTED]
Website: [URL_PROTECTED]
Support: [EMAIL_PROTECTED]
SSN on File: [SSN_PROTECTED]
```

**Protection Applied:**

- ✓ 10+ different PII types detected and replaced
- ✓ All replacements consistent within document
- ✓ Context preserved for understanding the issue
- ✓ Non-PII data (Account ID, ticket number) preserved
- ✓ Realistic fake data generated for all fields

---

## Settings & Configuration

### Settings Panel

![Settings Panel](demo-screenshots/06-settings-panel.png)

**Customization Options:**

**PII Type Selection:**

- ☑ Email Addresses
- ☑ Phone Numbers
- ☑ Credit Cards
- ☑ SSN (Social Security Numbers)
- ☑ Dates
- ☑ Money/Currency
- ☑ Quantities
- ☑ Addresses
- ☑ IP Addresses
- ☑ URLs
- ☑ Locations (NEW!)
- ☑ Proper Nouns (Names)

**Advanced Settings:**

- **Magnitude Variance:** 0-100% (controls how much money/quantity values can vary)
  - 0% = Exact preservation
  - 50% = ±50% variance (realistic for demos)
  - 100% = Maximum variation
- **Confidence Threshold:** 0.5-1.0 (controls proper noun detection sensitivity)
  - Lower = More names detected (may include some false positives)
  - Higher = Fewer names detected (only high-confidence matches)
  - Default: 0.75 (balanced)

**Custom Patterns:**

- Add regex patterns for organization-specific PII
- Example: Employee IDs, Custom account formats, Internal codes

### Popup Interface

![Popup Interface](demo-screenshots/07-popup-interface.png)

**Quick Controls:**

- One-click enable/disable
- Quick access to settings
- Current detection status
- Last screenshot information

---

## How to Capture These Screenshots

### Prerequisites

1. Load the SafeSnap extension in Chrome:

   ```bash
   # Build the extension
   cd /Users/eb/github.com/safe-snap/safesnap-chrome-extension
   bun run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Ensure the extension is enabled

### Screenshot Instructions

For each scenario, you'll need to capture two screenshots: BEFORE and AFTER.

#### Scenario 1: Email & Contact Information

**01-email-before.png:**

1. Create an HTML file with the content shown in Scenario 1 (BEFORE section)
2. Open it in Chrome without SafeSnap enabled (or disable the extension temporarily)
3. Take a screenshot showing the full content
4. Crop to focus on the relevant text area

**01-email-after.png:**

1. With the same HTML file open
2. Enable SafeSnap extension
3. Take a screenshot (use Chrome's built-in screenshot tool or any method)
4. The extension should automatically redact the PII
5. Crop to match the BEFORE screenshot dimensions

#### Scenario 2: Names & Proper Nouns

**02-names-before.png & 02-names-after.png:**

1. Create an HTML file with the meeting notes content
2. Follow the same process as Scenario 1
3. Pay special attention to:
   - Names with job titles (CEO John Smith, CTO Jane Doe)
   - Job descriptions (Tech Reporter, Senior Engineer)
   - Common words like "By" before names

**Test Cases to Verify:**

- ✓ "By Stephen Council, Tech Reporter" - should detect only "Stephen Council"
- ✓ "Tech Reporter" alone should NOT be detected as a company
- ✓ "Senior Engineer John Smith" - should detect the full phrase with job title

#### Scenario 3: Financial Data

**03-financial-before.png & 03-financial-after.png:**

1. Create a payment summary page with:
   - Credit card number: 4532-1234-5678-9010 (test card)
   - SSN: 123-45-6789
   - Dollar amounts: $1,250.00
   - Full address
2. Capture BEFORE/AFTER screenshots
3. Verify credit card is properly redacted

#### Scenario 4: Location Information

**04-location-before.png & 04-location-after.png:**

1. Create a dashboard with location analytics
2. Include various location types:
   - Cities: New York, Los Angeles, Chicago
   - Regions: Bay Area, Silicon Valley
   - States: California, Texas, Washington
   - Addresses: Full street addresses
3. Capture BEFORE/AFTER screenshots
4. Verify location consistency (same location = same replacement)

#### Scenario 5: Mixed Content

**05-mixed-before.png & 05-mixed-after.png:**

1. Create a support ticket with ALL PII types:
   - Emails, phones, names, dates, money, addresses, locations, IPs, URLs, credit cards, SSNs
2. This is the most comprehensive test
3. Capture full-page BEFORE/AFTER screenshots
4. Verify all PII types are detected and replaced

#### Settings & UI Screenshots

**06-settings-panel.png:**

1. Click the SafeSnap extension icon in Chrome toolbar
2. Click "Settings" or navigate to the settings page
3. Take a screenshot of the full settings panel
4. Ensure all checkboxes and sliders are visible

**07-popup-interface.png:**

1. Click the SafeSnap extension icon
2. Take a screenshot of the popup that appears
3. Show the current status and quick controls

### Screenshot Guidelines

**Technical Requirements:**

- **Format:** PNG (for best quality)
- **Dimensions:** 1200px width minimum (for clarity)
- **DPI:** 144 DPI or higher (for retina displays)
- **Background:** Use a clean, light background for web content

**Content Guidelines:**

- **Highlight Changes:** Use red boxes or arrows to highlight where PII was replaced
- **Annotations:** Add text labels pointing to specific redactions
- **Consistency:** Use the same font sizes and layouts for BEFORE/AFTER comparisons
- **Cropping:** Crop tightly around relevant content, but leave some margin

**Tools Recommended:**

- **Chrome DevTools:** For precise screenshot capture
- **Lightshot / Greenshot:** For annotations
- **GIMP / Photoshop:** For editing and adding annotations

### Sample HTML Template

Create a file `test-page.html` with sample content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SafeSnap Test Page</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
        line-height: 1.6;
        background: #f5f5f5;
      }
      .container {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      h2 {
        color: #333;
        border-bottom: 2px solid #4caf50;
        padding-bottom: 10px;
      }
      .section {
        margin: 20px 0;
        padding: 15px;
        background: #fafafa;
        border-left: 4px solid #4caf50;
      }
      .label {
        font-weight: bold;
        color: #555;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Use content from Scenario 1-5 here -->
      <h2>Support Ticket #12345</h2>

      <div class="section">
        <p><span class="label">From:</span> Sarah Johnson &lt;sarah.j@techcorp.com&gt;</p>
        <p><span class="label">Date:</span> January 15, 2024</p>
        <p><span class="label">Phone:</span> +1 (555) 987-6543</p>
        <p><span class="label">Location:</span> Seattle, Washington</p>
      </div>

      <div class="section">
        <h3>Issue Description:</h3>
        <p>
          I'm having trouble accessing my account. I've tried resetting my password using my
          registered email sarah.j@techcorp.com but haven't received the reset link.
        </p>
      </div>

      <!-- Add more content sections here -->
    </div>
  </body>
</html>
```

### Capturing the Screenshots

**Using Chrome DevTools (Recommended):**

1. Open the test page in Chrome
2. Press `F12` to open DevTools
3. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
4. Type "screenshot" and select "Capture full size screenshot"
5. Chrome will save a full-page screenshot to your Downloads folder

**Using Extension Screenshot Feature:**

1. With SafeSnap enabled, the screenshot detection should work automatically
2. Use any screenshot tool (Snipping Tool, Lightshot, etc.)
3. SafeSnap will intercept and redact the screenshot
4. Compare the redacted version to the original

---

## Verification Checklist

After capturing all screenshots, verify:

- [ ] All BEFORE screenshots show original, unredacted content
- [ ] All AFTER screenshots show properly redacted content
- [ ] Replacements are consistent within each scenario
- [ ] No PII remains visible in AFTER screenshots
- [ ] Screenshots are high quality and readable
- [ ] Annotations (if any) are clear and don't obscure content
- [ ] File names match the placeholders in this document
- [ ] All 12 placeholder files have been replaced with actual screenshots

---

## Additional Resources

- **Main README:** See `/README.md` for installation and basic usage
- **Architecture:** See `/docs/ARCHITECTURE.md` for technical details
- **Testing:** See `/docs/TESTING.md` for test documentation
- **Design Spec:** See `/docs/DESIGN_SPECIFICATION.md` for feature specifications

---

## Notes for Screenshot Capture

**Important Behaviors to Demonstrate:**

1. **Consistency:** Same PII value should map to same replacement throughout
   - Test: Use "John Smith" multiple times, verify same replacement

2. **Context Preservation:** Non-PII should remain unchanged
   - Test: Account IDs, ticket numbers, product codes should NOT be replaced

3. **Format Preservation:** Replacements should maintain original format
   - Test: Phone numbers keep (XXX) XXX-XXXX format
   - Test: Credit cards keep XXXX-XXXX-XXXX-XXXX format

4. **Magnitude Variance:** Money amounts should vary realistically
   - Test: $1,250.00 might become $1,190.00 or $1,310.00 (within ±5% by default)

5. **Location Awareness:** Locations replaced with similar type
   - Test: "New York" (city) → "Riverdale" (city), not "California" (state)

6. **Job Title Handling:** Job descriptions vs. executive titles
   - Test: "Tech Reporter" alone is NOT detected as company
   - Test: "By Stephen Council, Tech Reporter" detects only "Stephen Council"
   - Test: "CEO John Smith" includes the title in detection

---

**Last Updated:** January 16, 2026
**Version:** 1.0.0
**Extension Version:** 1.0.0
