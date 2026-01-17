# PII Detection System

SafeSnap uses a sophisticated multi-signal detection system to identify personally identifiable information (PII) with high precision and recall.

## Table of Contents

- [Overview](#overview)
- [Detection Types](#detection-types)
- [Proper Noun Detection Algorithm](#proper-noun-detection-algorithm)
- [Signal Scoring System](#signal-scoring-system)
- [Pattern-Based Detection](#pattern-based-detection)
- [Context Awareness](#context-awareness)
- [Performance Metrics](#performance-metrics)
- [Configuration](#configuration)
- [Examples](#examples)

---

## Overview

SafeSnap employs a **hybrid detection approach** combining:

1. **Pattern-based detection** - Regex patterns + library validation for structured data
2. **Dictionary-based detection** - Signal scoring for proper nouns using a curated common word dictionary
3. **Context-aware filtering** - Skips UI elements, applies department/team name penalties

**Key Design Principle:** All processing happens **locally in your browser**. No data is sent to external servers.

---

## Detection Types

SafeSnap can detect and protect the following PII types:

| Type                 | Detection Method          | Examples                               |
| -------------------- | ------------------------- | -------------------------------------- |
| **Proper Nouns**     | Multi-signal scoring      | "John Smith", "Acme Corp", "Microsoft" |
| **Email Addresses**  | Regex pattern             | john.doe@example.com                   |
| **Phone Numbers**    | Regex + libphonenumber-js | (555) 123-4567, +1-555-123-4567        |
| **Money Amounts**    | Regex pattern             | $500.00, €1,234.56                     |
| **Quantities**       | Regex pattern             | 50 units, 1,000 items                  |
| **Dates**            | Regex pattern             | 2024-01-15, Jan 15 2024                |
| **Street Addresses** | Regex pattern             | 123 Main St, Suite 100                 |
| **URLs/Domains**     | Regex pattern             | https://example.com, api.company.com   |
| **IP Addresses**     | Regex pattern             | 192.168.1.1, 10.0.0.1                  |
| **Credit Cards**     | Regex + card-validator    | 4111-1111-1111-1111                    |
| **Custom Patterns**  | User-defined regex        | Any custom regex pattern               |

---

## Proper Noun Detection Algorithm

Proper noun detection (names, places, companies) is the most complex part of SafeSnap's detection system.

### High-Level Flow

```
Text Input
  ↓
1. Regex Pattern Matching
   Match capitalized words/phrases
   (e.g., "John Smith", "Acme Corp")
  ↓
2. Context Gathering
   Collect 8 signals for each candidate
  ↓
3. Signal Scoring
   Calculate weighted score (0.0-2.0 range)
  ↓
4. Department Filtering
   Apply -0.9 penalty if matches department pattern
  ↓
5. Email Domain Matching
   Apply +0.3 boost if matches nearby email domain
  ↓
6. Threshold Check
   If score ≥ 0.75 → Detected as PII
   If score < 0.75 → Keep as regular text
  ↓
Detected PII Entities
```

### Step 1: Candidate Identification

**Regex Pattern:**

```regex
\b(?:(Mr|Mrs|Ms|Dr|Prof)\.\s+)?(?!Mr|Mrs|Ms|Dr|Prof\b)[A-Z][a-z]+(?:[-'][A-Z][a-z]+)*(?: [A-Z][a-z]+(?:[-'][A-Z][a-z]+)*){0,4}(?:\s+(?:Inc|LLC|Corp|Ltd|Co|GmbH|SA|PLC|AG|Technologies|Systems|Solutions|Group|Company|Enterprises|Industries|Services|Partners|Associates|International|Global|Consulting|Holdings|Financial|Capital|Ventures|Labs|Studio|Media|Network|Platform|Tech|Digital))?\b
```

**Matches:**

- Honorifics: Mr., Mrs., Ms., Dr., Prof.
- Capitalized words: Single or multi-word (up to 5 words)
- Hyphenated names: Mary-Jane, Jean-Luc
- Company suffixes: Inc, LLC, Corp, Ltd, GmbH, SA, PLC, AG, Technologies, etc.

**Example Matches:**

- "John Doe"
- "Dr. Sarah Martinez"
- "Acme Corp"
- "Microsoft Corporation"
- "Jean-Luc Picard"

### Step 2: Context Gathering

For each candidate, SafeSnap gathers **8 signals** from surrounding context:

| Signal                  | Description                                         | Value Range          |
| ----------------------- | --------------------------------------------------- | -------------------- |
| `capitalizationPattern` | Has proper capitalization (baseline)                | Always 1.0           |
| `unknownInDictionary`   | Majority of words NOT in common dictionary          | 0.0 or 1.0           |
| `hasHonorificOrSuffix`  | Has honorific (Mr/Mrs) OR company suffix (Inc/Corp) | 0.0 or 1.0           |
| `multiWord`             | Contains 2 or more words                            | 0.0 or 1.0           |
| `notSentenceStart`      | Not at beginning of sentence                        | 0.0 or 1.0           |
| `nearOtherPII`          | Within 50 chars of email/phone                      | 0.0 or 1.0           |
| `matchesEmailDomain`    | Matches company name from nearby email              | 0.0 or 1.0           |
| `isDepartmentName`      | Matches generic department/team pattern             | 0.0 or 1.0 (penalty) |

**Context Window:** 50 characters before and after the candidate phrase

### Step 3: Signal Scoring

Each signal has a **weight** that determines its contribution to the final score:

```javascript
score = (capitalizationPattern × 0.30)      // Baseline
      + (unknownInDictionary × 0.35)        // Strong signal: not common word
      + (hasHonorificOrSuffix × 0.45)       // Very strong: has Mr/Inc/Corp
      + (multiWord × 0.20)                   // Moderate: "John Doe" vs "John"
      + (notSentenceStart × 0.15)            // Weak: reduces false positives
      + (nearOtherPII × 0.25)                // Moderate: co-occurrence boost
      + (matchesEmailDomain × 0.30)          // Strong: email domain validation
      + (isDepartmentName × -0.90)           // Heavy penalty: filters out departments
```

**Scoring Examples:**

#### Example 1: "John Smith" (Person Name)

```
capitalizationPattern:   1.0 × 0.30 = 0.30
unknownInDictionary:     1.0 × 0.35 = 0.35  (neither "John" nor "Smith" in dictionary)
hasHonorificOrSuffix:    0.0 × 0.45 = 0.00
multiWord:               1.0 × 0.20 = 0.20
notSentenceStart:        1.0 × 0.15 = 0.15
nearOtherPII:            1.0 × 0.25 = 0.25  (email nearby)
matchesEmailDomain:      0.0 × 0.30 = 0.00
isDepartmentName:        0.0 × -0.90 = 0.00
                                     -----
Total Score:                          1.25  ✅ Above threshold (0.75)
```

#### Example 2: "Acme Corp" (Company)

```
capitalizationPattern:   1.0 × 0.30 = 0.30
unknownInDictionary:     1.0 × 0.35 = 0.35  ("Acme" not in dictionary)
hasHonorificOrSuffix:    1.0 × 0.45 = 0.45  (has "Corp" suffix)
multiWord:               1.0 × 0.20 = 0.20
notSentenceStart:        0.0 × 0.15 = 0.00
nearOtherPII:            1.0 × 0.25 = 0.25  (email "john@acme.com" nearby)
matchesEmailDomain:      1.0 × 0.30 = 0.30  (matches "acme" from email)
isDepartmentName:        0.0 × -0.90 = 0.00
                                     -----
Total Score:                          1.85  ✅ Above threshold (0.75)
```

#### Example 3: "Human Resources" (Department - Filtered Out)

```
capitalizationPattern:   1.0 × 0.30 = 0.30
unknownInDictionary:     1.0 × 0.35 = 0.35  (neither word in dictionary)
hasHonorificOrSuffix:    0.0 × 0.45 = 0.00
multiWord:               1.0 × 0.20 = 0.20
notSentenceStart:        1.0 × 0.15 = 0.15
nearOtherPII:            0.0 × 0.25 = 0.00
matchesEmailDomain:      0.0 × 0.30 = 0.00
isDepartmentName:        1.0 × -0.90 = -0.90  (matches "Human" + "Resources")
                                     -----
Total Score:                          0.10  ❌ Below threshold (0.75)
```

#### Example 4: "New York" (Common Place - Filtered Out)

```
capitalizationPattern:   1.0 × 0.30 = 0.30
unknownInDictionary:     0.0 × 0.35 = 0.00  (both "New" and "York" in dictionary)
hasHonorificOrSuffix:    0.0 × 0.45 = 0.00
multiWord:               1.0 × 0.20 = 0.20
notSentenceStart:        1.0 × 0.15 = 0.15
nearOtherPII:            0.0 × 0.25 = 0.00
matchesEmailDomain:      0.0 × 0.30 = 0.00
isDepartmentName:        0.0 × -0.90 = 0.00
                                     -----
Total Score:                          0.65  ❌ Below threshold (0.75)
```

### Step 4: Department Filtering

SafeSnap applies a **-0.9 penalty** to phrases matching generic department/team patterns.

**Pattern-Based Detection:**

- **Department Prefixes** (27 prefixes): "Human", "Customer", "Technical", "Quality", "Engineering", "Marketing", "Sales", "Finance", "IT", "Legal", "Product", "Operations", "Support", "Administrative", "Executive", "Management", "Research", "Development", "Security", "Compliance", "Risk", "Audit", "Payroll", "Benefits", "Recruiting", "Training", "Communications"
- **Department Suffixes** (5 suffixes): "Resources", "Service", "Support", "Team", "Department"

**Matching Logic:**

- Matches: "[Prefix] [Suffix]" (e.g., "Human Resources")
- Matches: "Visit/Call/Contact [Prefix] [Suffix]" (e.g., "Call Customer Service")

**Examples:**

- ❌ "Human Resources" → Filtered out (score reduced by 0.9)
- ❌ "Customer Service" → Filtered out
- ❌ "Visit Technical Support" → Filtered out
- ✅ "John Resources" → NOT filtered (doesn't match department pattern)

**Configuration:** `config/app-config.js:115-141`

### Step 5: Email Domain Matching

SafeSnap boosts the score by **+0.3** if the candidate matches a company name from a nearby email domain.

**Algorithm:**

1. Scan 50 characters before/after candidate for email addresses
2. Extract domain from email (e.g., "acme.com" → "acme")
3. Strip common suffixes from candidate (e.g., "Acme Corp" → "acme")
4. Case-insensitive comparison
5. If match → Add +0.3 to score

**Examples:**

- Email: "john@acme.com" near "Acme Corp" → +0.3 boost ✅
- Email: "support@microsoft.com" near "Microsoft" → +0.3 boost ✅
- Email: "user@example.com" near "Acme Corp" → No boost ❌

**Configuration:** `config/app-config.js:108`

### Step 6: Threshold Check

**Detection Threshold:** `0.75`

- **Score ≥ 0.75** → Detected as PII (proper noun)
- **Score < 0.75** → Kept as regular text

**Why 0.75?**

- Balanced precision and recall
- Lower threshold (0.70) increases false positives
- Higher threshold (0.80) misses valid proper nouns
- Current setting achieves **100% precision, 55.88% recall**

---

## Pattern-Based Detection

Pattern-based detection uses **regex patterns + library validation** for structured data types.

### Detection Process

```
Text Input
  ↓
1. Apply Regex Pattern
   Match candidates (e.g., email-like strings)
  ↓
2. Library Validation (if available)
   Validate using external library (e.g., libphonenumber-js)
  ↓
3. Confidence Assignment
   Valid → Confidence = 1.0 (100% certain)
   Invalid → Discard match
  ↓
Detected PII Entity
```

### Supported Patterns

#### Email Addresses

**Pattern:**

```regex
[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
```

**Examples:**

- john.doe@example.com ✅
- user+tag@company.co.uk ✅
- invalid@.com ❌

#### Phone Numbers

**Pattern:** Regex + `libphonenumber-js` validation

```regex
(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}
```

**Examples:**

- (555) 123-4567 ✅
- +1-555-123-4567 ✅
- 555.123.4567 ✅
- 123-4567 ❌ (too short)

#### Money Amounts

**Pattern:**

```regex
[$€£¥]\s?\d{1,3}(,?\d{3})*(\.\d{2})?
```

**Examples:**

- $500.00 ✅
- €1,234.56 ✅
- £10,000 ✅
- $5 ❌ (no decimals, may be ambiguous)

#### Credit Card Numbers

**Pattern:** Regex + `card-validator` library

```regex
\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b
```

**Examples:**

- 4111-1111-1111-1111 ✅ (Visa test card)
- 5500-0000-0000-0004 ✅ (Mastercard test card)
- 1234-5678-9012-3456 ❌ (invalid Luhn check)

#### URLs and Domains

**Pattern:**

```regex
https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)
```

**Examples:**

- https://example.com ✅
- http://api.company.com/endpoint ✅
- www.example.com ❌ (missing protocol)

#### IP Addresses

**Pattern:**

```regex
\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b
```

**Examples:**

- 192.168.1.1 ✅
- 10.0.0.1 ✅
- 256.256.256.256 ⚠️ (matches pattern but invalid IP)

#### Street Addresses

**Pattern:** Multi-line regex for US addresses

```regex
\b\d+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b
```

**Examples:**

- 123 Main Street ✅
- 456 Oak Ave ✅
- 789 Elm Blvd, Suite 100 ✅

#### Dates

**Pattern:** Multiple formats supported

```regex
(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})|(Jan|Feb|Mar|...) \d{1,2},? \d{4}
```

**Examples:**

- 2024-01-15 ✅
- 01/15/2024 ✅
- Jan 15, 2024 ✅

### Custom Patterns

Users can define **custom regex patterns** in the settings page.

**Use Cases:**

- Internal employee IDs (e.g., `EMP-\d{5}`)
- Project codes (e.g., `PROJ-[A-Z]{3}-\d{3}`)
- Ticket numbers (e.g., `TICKET-\d{6}`)

**Example Configuration:**

```javascript
{
  name: "Employee ID",
  pattern: "EMP-\\d{5}",
  enabled: true
}
```

---

## Context Awareness

SafeSnap is **context-aware** and skips detection in UI elements to prevent false positives.

### Skipped HTML Elements

Detection is **disabled** for the following elements:

| Element Type  | Examples                            | Reason                      |
| ------------- | ----------------------------------- | --------------------------- |
| Form labels   | `<label>`, `[role="label"]`         | UI text, not PII            |
| Headings      | `<h1>`, `<h2>`, ..., `<h6>`         | Page structure, not PII     |
| Table headers | `<th>`, `[role="columnheader"]`     | Table labels, not data      |
| Buttons       | `<button>`, `[role="button"]`       | UI controls, not PII        |
| Navigation    | `<nav>`, `[role="navigation"]`      | Menu items, not PII         |
| ARIA labels   | `[aria-label]`, `[aria-labelledby]` | Screen reader text, not PII |

### Form Input Protection

SafeSnap **protects form inputs** before taking screenshots:

1. Detects `<input>`, `<textarea>`, `<select>` elements
2. Replaces values with placeholder text
3. Restores original values after screenshot (if "Restore Original" clicked)

**Example:**

```html
<!-- Before protection -->
<input type="text" value="John Smith" />

<!-- After protection -->
<input type="text" value="[PROTECTED]" />
```

---

## Performance Metrics

SafeSnap's detection system has been **benchmarked on 49 real-world test cases**.

### Current Performance (v1.0)

| Metric              | Value       | Description                       |
| ------------------- | ----------- | --------------------------------- |
| **Precision**       | **100.00%** | Zero false positives              |
| **Recall**          | 55.88%      | Detects 55.88% of all PII         |
| **Accuracy**        | 69.39%      | Overall correctness               |
| **F1 Score**        | 0.7170      | Harmonic mean of precision/recall |
| **True Positives**  | 19          | Correctly detected PII            |
| **True Negatives**  | 15          | Correctly ignored non-PII         |
| **False Positives** | **0**       | Incorrectly flagged as PII        |
| **False Negatives** | 15          | Missed PII                        |

### Performance Over Time

| Version              | Precision   | Recall | F1 Score   | Key Improvement                          |
| -------------------- | ----------- | ------ | ---------- | ---------------------------------------- |
| v0.1 (baseline)      | 94.74%      | 52.94% | 0.6792     | Initial release                          |
| v0.2 (Session 1)     | 87.50%      | 61.76% | 0.7241     | +8.82% recall, context signals           |
| **v1.0 (Session 2)** | **100.00%** | 55.88% | **0.7170** | **100% precision**, department filtering |

### Known Limitations

SafeSnap's current detection system has known limitations:

| Limitation             | Examples                            | Status                                |
| ---------------------- | ----------------------------------- | ------------------------------------- |
| **Apostrophe names**   | "James O'Brien", "Maria D'Angelo"   | ❌ Not detected (regex limitation)    |
| **Single-word brands** | "Deloitte", "SpaceX", "OpenAI"      | ❌ Not detected (low score)           |
| **Product names**      | "iPhone", "MacBook", "Android"      | ❌ Not detected (no brand suffix)     |
| **Non-English names**  | "José García", "François Dubois"    | ⚠️ Partial support (accented chars)   |
| **Common place names** | "New York", "Los Angeles", "London" | ✅ Correctly filtered (in dictionary) |

**Why these limitations exist:**

- **Apostrophe names:** Regex complexity (would create false positives)
- **Single-word brands:** Low signal score (no suffix, often in dictionary)
- **Product names:** No distinguishing features (looks like common noun)

**Future improvements:**

- Brand/product suffix list (if needed for specific use cases)
- Post-processing for apostrophe names
- Multi-language dictionaries

---

## Configuration

SafeSnap's detection system is **highly configurable**.

### Core Configuration File

**Location:** `config/app-config.js`

### Detection Settings

```javascript
export const APP_CONFIG = {
  properNounDetection: {
    // Minimum score required for detection (0.0-2.0)
    minimumScore: 0.75,

    // Signal weights (adjust to tune sensitivity)
    weights: {
      capitalizationPattern: 0.3, // Baseline: has proper capitalization
      unknownInDictionary: 0.35, // Strong: not common word
      hasHonorificOrSuffix: 0.45, // Very strong: has Mr/Inc/Corp
      multiWord: 0.2, // Moderate: 2+ words
      notSentenceStart: 0.15, // Weak: not at sentence start
      nearOtherPII: 0.25, // Moderate: near email/phone
      matchesEmailDomain: 0.3, // Strong: matches email domain
    },

    // Context window for nearOtherPII signal (characters)
    nearbyPIIWindowSize: 50,

    // Enable debug logging (logs scoring details)
    debugMode: false,
  },

  // Department name filtering (pattern-based)
  departmentDetection: {
    // Department prefixes (e.g., "Human", "Customer")
    departmentPrefixes: [
      'Human',
      'Customer',
      'Technical',
      'Quality',
      'Engineering',
      'Marketing',
      'Sales',
      'Finance',
      'IT',
      'Legal',
      'Product',
      'Operations',
      'Support',
      'Administrative',
      'Executive',
      'Management',
      'Research',
      'Development',
      'Security',
      'Compliance',
      'Risk',
      'Audit',
      'Payroll',
      'Benefits',
      'Recruiting',
      'Training',
      'Communications',
    ],

    // Department suffixes (e.g., "Resources", "Service")
    departmentSuffixes: ['Resources', 'Service', 'Support', 'Team', 'Department'],

    // Score penalty for department matches
    penalty: -0.9,
  },

  // Default enabled PII types
  defaults: {
    enabledPIITypes: [
      'properNouns',
      'emails',
      'phones',
      'money',
      'quantities',
      'dates',
      'addresses',
      'urls',
      'ips',
      'creditCards',
    ],
  },
};
```

### User Settings (Runtime)

Users can customize detection behavior in the **Settings page**:

| Setting                | Description                             | Default           |
| ---------------------- | --------------------------------------- | ----------------- |
| **Enabled PII Types**  | Which PII types to detect               | All types enabled |
| **Magnitude Variance** | Variance for money/quantities (%)       | 30%               |
| **Custom Patterns**    | User-defined regex patterns             | Empty             |
| **Dictionary Size**    | Core (801 words) or Full (hypothetical) | Core              |

---

## Examples

### Example 1: Person Name Detection

**Input Text:**

```
"Contact John Smith at john.smith@acme.com for more information."
```

**Detection Process:**

1. **Pattern Matching:**
   - Email detected: `john.smith@acme.com` (confidence: 1.0)

2. **Proper Noun Candidates:**
   - "Contact" → Score: 0.30 (only capitalization) → ❌ Below threshold
   - "John Smith" → Score: 1.25 (see scoring example above) → ✅ Detected

**Final Output:**

```
Detected PII:
- Type: proper_noun, Text: "John Smith", Confidence: 1.25
- Type: email, Text: "john.smith@acme.com", Confidence: 1.0
```

### Example 2: Company Name with Email

**Input Text:**

```
"Visit Acme Corp or email support@acme.com for assistance."
```

**Detection Process:**

1. **Pattern Matching:**
   - Email detected: `support@acme.com` (confidence: 1.0)

2. **Proper Noun Candidates:**
   - "Visit" → Verb in dictionary → Score: 0.30 → ❌ Below threshold
   - "Acme Corp" → Score: 1.85 (has "Corp" suffix + email domain match) → ✅ Detected

**Final Output:**

```
Detected PII:
- Type: proper_noun, Text: "Acme Corp", Confidence: 1.85
- Type: email, Text: "support@acme.com", Confidence: 1.0
```

### Example 3: Department Filtering

**Input Text:**

```
"Please contact Human Resources or Customer Service for help."
```

**Detection Process:**

1. **Pattern Matching:**
   - No patterns matched

2. **Proper Noun Candidates:**
   - "Human Resources" → Score: 0.10 (department penalty applied) → ❌ Below threshold
   - "Customer Service" → Score: 0.10 (department penalty applied) → ❌ Below threshold

**Final Output:**

```
Detected PII:
- (None)
```

### Example 4: Mixed PII Types

**Input Text:**

```
"Dr. Sarah Martinez (555-123-4567) submitted invoice #12345 for $1,250.00 on 2024-01-15."
```

**Detection Process:**

1. **Pattern Matching:**
   - Phone detected: `(555-123-4567)` (confidence: 1.0)
   - Money detected: `$1,250.00` (confidence: 1.0)
   - Date detected: `2024-01-15` (confidence: 1.0)

2. **Proper Noun Candidates:**
   - "Dr. Sarah Martinez" → Score: 1.50 (honorific + multi-word + near phone) → ✅ Detected

**Final Output:**

```
Detected PII:
- Type: proper_noun, Text: "Dr. Sarah Martinez", Confidence: 1.50
- Type: phone, Text: "(555-123-4567)", Confidence: 1.0
- Type: money, Text: "$1,250.00", Confidence: 1.0
- Type: date, Text: "2024-01-15", Confidence: 1.0
```

---

## Architecture Files

For more details on the detection system implementation:

- **Core Detection Logic:** `src/detection/pii-detector.js` (798 lines)
- **Pattern Matching:** `src/detection/pattern-matcher.js`
- **Dictionary Management:** `src/detection/dictionary.js` (87 lines)
- **Configuration:** `config/app-config.js` (lines 96-141)
- **Tests:** `src/detection/pii-detector.test.js` (403 tests)
- **Benchmarks:** `src/detection/dictionary-benchmark.test.js`

---

## Testing and Validation

SafeSnap's detection system is **extensively tested**:

- **403 unit tests** covering all detection scenarios
- **49 benchmark test cases** from real-world examples
- **100% precision** (zero false positives)
- **Continuous integration** (GitHub Actions)

**Run Tests:**

```bash
bun run test src/detection/pii-detector.test.js
bun run test src/detection/dictionary-benchmark.test.js
```

---

## Privacy Guarantee

All PII detection happens **locally in your browser**:

- ✅ No external API calls
- ✅ No data sent to servers
- ✅ No analytics or tracking
- ✅ Dictionary files are static, bundled assets
- ✅ Open source (auditable by anyone)

**Your data never leaves your machine.**

---

## Related Documentation

- [README.md](../README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contributing guidelines
- [TESTING.md](../TESTING.md) - Testing guide

---

**Questions?** Open an issue on [GitHub](https://github.com/safe-snap/safesnap-chrome-extension/issues).
