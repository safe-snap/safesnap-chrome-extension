# SafeSnap - Design Specification

## Product Overview

**Name:** SafeSnap (centrally stored, subject to change)

**Purpose:** Chrome extension for taking screenshots with PII protection

## Model

**Core Features:**

- Full-featured PII protection using dictionary-based detection
- Core dictionary (20K words) ships with extension
- All PII types available: proper nouns, money, quantities, emails, phones, addresses, dates, URLs, IPs, custom regex
- Default enabled: proper nouns, money, quantities
- Full banner customization (position, colors, text, size, opacity, fade distance)
- Form input protection (all visible inputs: text, textarea, email, tel, url, search, number, date/time, select)
- Copy to clipboard + PNG download (fixed format)
- Consistency mapping: exact match, per-page session
- Essential settings only: default PII types, banner customization
- Custom regex patterns with examples and validation

## PII Detection Strategy

### Dictionary-Based Approach

1. Load dictionary (Census/SSA public domain data, curated common words)
2. Check if word exists in dictionary → if yes, it's a common word (label/business term), keep it
3. If not in dictionary → check if it's PII:
   - Pattern matching (email, phone, money, credit card, URL patterns)
   - Proper noun detection using multi-signal scoring system
   - Multi-word capitalized sequences with majority-based unknown word detection
4. Consider HTML context:
   - Skip `<label>`, `<th>`, `<dt>`, `<h1-h6>`, elements with `role="label"`
   - Skip `<strong>` before colons
5. Hybrid detection: multi-signal scoring + HTML structure awareness

### Proper Noun Detection (Multi-Signal Scoring System)

SafeSnap uses a sophisticated scoring system to distinguish real names from business terminology:

**Scoring Signals & Weights:**

| Signal                          | Weight | Description                          |
| ------------------------------- | ------ | ------------------------------------ |
| Capitalization pattern          | +0.3   | Has capital letters (baseline)       |
| Unknown in dictionary           | +0.3   | Majority (>50%) of words are unknown |
| Has honorific OR company suffix | +0.4   | Mr/Mrs/Dr/Prof OR Inc/Corp/LLC/Ltd   |
| Multi-word (2+ words)           | +0.2   | "John Doe" vs "John"                 |
| Not at sentence start           | +0.1   | Reduces false positives              |
| Near other PII                  | +0.2   | Within 50 chars of email/phone       |

**Protection Threshold:** Score ≥ 0.8

**Examples:**

✅ **Protected (score ≥ 0.8):**

- "Mr. John Doe" → 1.3 (honorific + 2 unknown + multi-word + mid-sentence)
- "John Doe" → 0.9 (2 unknown + multi-word + mid-sentence)
- "Acme Corp" → 1.3 (company suffix + 2 unknown + multi-word)

❌ **Not Protected (score < 0.8):**

- "Average Receipt Value" → 0.6 (only 1/3 unknown: "Receipt")
- "Total Revenue Growth" → 0.5 (all common business words)
- "Receipt" alone → 0.7 (single unknown word)

### Pattern Matching

**Supported Patterns:**

- Email addresses: `user@example.com`
- Phone numbers: Various formats (US, international)
- Money amounts: `$500`, `€1,234.56`, `£99.99`
- Credit cards: Major card formats
- URLs: `https://example.com`, `www.example.com`
- IP addresses: IPv4 and IPv6
- Dates: Multiple formats (MM/DD/YYYY, DD-MM-YYYY, ISO 8601, etc.)
- Street addresses: Number + street name patterns
- **Locations (hybrid: pattern + gazetteer)**
  - Multi-word: "Bay Area", "Silicon Valley", "Pacific Ocean" (pattern-based)
  - Single-word: "Paris", "Tokyo", "California" (gazetteer: 500 locations)
  - Confidence: 0.95 (gazetteer), 0.90 (pattern)
  - Replacement: Type-aware fake locations (city→city, region→region, country→country, feature→feature)

## Replacement Strategy

### Random Similar Data with Magnitude Preservation

**Money Amounts:**

- ±30% variance (default)
- Keep currency symbol
- Example: `$500` → `$437.21`

**Quantities:**

- ±30% variance
- Preserve units
- Example: `1000 items` → `847 items`

**Proper Nouns (Names):**

- Large pool (~100 names from Census/SSA data + curated)
- Example: `John Smith` → `Alex Martinez`

**Company Names:**

- Large pool (~100+ generic terms with variations)
- Examples: "Company A", "Organization B", "Business Inc", "Tech Company C", etc.

**Dates:**

- Randomize within ±2 months (similar timeframe)
- Example: `January 15, 2024` → `February 3, 2024`

**Street Addresses:**

- Preserve structure, randomize content
- Example: `123 Market Street` → `789 Maple Street`

**URLs/Domains:**

- Maintain TLD, randomize domain
- Example: `acme.com` → `company-a.com`

**Consistency Mapping:**

- Same entity → same replacement throughout page
- Example: "TARGET, LLC" and "target.com" both become "Company A" / "company-a.com"

## Environment Banner System

### Default Patterns

```regex
PROD:    \.(prod|production)($|/|:)
DEV:     \.(dev|development)($|/|:)
STAGING: \.(staging|stg|stage)($|/|:)
LOCAL:   \.(local|loc)($|/|:|localhost|127\.0\.0\.1|192\.168\.|10\.0\.)
```

### Banner Behavior

**Default Position:** Top-right corner

**Customization Options:**

- Position: top-left, top-right, bottom-left, bottom-right, top-bar, bottom-bar
- Colors per environment (PROD=red, DEV=blue, STAGING=orange, LOCAL=green)
- Custom text per environment
- Size: compact badge to full bar
- Opacity: 0-100%
- Fade distance: how close cursor needs to be (50px-150px)

**Interaction:**

- Fades to 20% opacity AND shrinks to 50% size when cursor approaches

**Text Changes:**

- Normal: "⚠️ PRODUCTION"
- After "Protect PII" clicked: "⚠️ PRODUCTION - PII PROTECTED"
- After "Restore Original": reverts to "⚠️ PRODUCTION"
- On failure: Separate persistent warning bar "⚠️ PII Protection Failed - Screenshot not safe" (non-dismissible until resolved)

## User Workflows

### Workflow

1. User navigates to page
2. User clicks extension icon → popup opens (tabbed interface)
3. User selects which PII types to protect via checkboxes
4. User clicks "Protect PII" button
5. Page content modified (PII replaced)
6. User clicks "Take Screenshot" or "Copy to Clipboard"
7. Screenshot captured
8. User clicks "Restore Original" to undo changes

## UI/UX Specifications

### Popup Interface (Tabbed)

```
[Protect] [Settings] [About]

Protect Tab:
  Select PII to Protect:
  ☑ Proper Nouns  ☑ Money  ☑ Quantities
  ☐ Emails  ☐ Phones  ☐ Addresses
  ☐ Dates  ☐ URLs  ☐ IPs
  ☐ Custom Regex

  [Protect PII]
  [Take Screenshot] [Copy to Clipboard]
  [Restore Original]

  Status: Ready / Protected / Error
```

### Settings Page (Essential Only - Free)

- Default PII types to protect (checkboxes)
- Banner customization (position, colors, text, size, opacity, fade distance)
- Custom regex patterns (simple UI with examples, docs link, syntax validation)
- Export/Import settings (NOT available - kept simple)

## Error Handling

### Tiered Approach

**Minor Issues:** Silent fallback or warning

- Dictionary load failure → use pattern matching only, show warning
- Large page → process best effort, show progress indicator if >500ms

**Critical Failures:** Blocking error

- Detection completely fails → block screenshot
- Banner shows failure: Separate persistent warning bar appears
- "⚠️ PII Protection Failed - Screenshot not safe"
- Warning bar is non-dismissible until user clicks "Restore Original" or refreshes
- "Take Screenshot" button disabled

### Performance

- Target: Best effort with progress indicator if >500ms
- Lazy loading: Core dictionary loads on first "Protect PII" click
- ~100-200ms one-time delay on first use

## Key Design Decisions

1. Dictionary approach (free) vs AI/LLM
2. Dictionary-based detection with 20K word dictionary
3. Magnitude preservation: ±30% variance
4. Consistency mapping: Per-page exact match (free), smart entity recognition
5. Banner interaction: Fade to 20% + shrink to 50% on proximity
6. Error handling: Tiered with non-dismissible failure warnings
7. Test coverage: 90%+ comprehensive with hybrid organization
8. No usage limits
9. i18n-ready: Architecture supports multiple languages, launch with English
10. Name storage: Centralized in single config location (subject to change)
11. Name pools: ~100 person names (Census/SSA), ~100+ company terms (generic variations)
12. Performance: Best effort, progress indicator if >500ms, lazy loading
