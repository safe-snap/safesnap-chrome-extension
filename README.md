# SafeSnap

> Share screenshots without exposing PII

![SafeSnap Logo](assets/icons/logo.svg)

![Coverage](.github/badges/coverage.svg)
[![CI](https://github.com/safe-snap/safesnap-chrome-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/safe-snap/safesnap-chrome-extension/actions/workflows/ci.yml)

**SafeSnap** is a privacy-first Chrome extension that automatically detects and protects personally identifiable information (PII) in screenshots. Perfect for QA teams, product managers, and anyone who needs to share screenshots without exposing sensitive data.

## Why SafeSnap?

SafeSnap is the **only tool** that combines automatic PII detection with screenshot capture in one integrated solution. Unlike other tools that either:

- Do PII detection but require separate screenshots
- Do screenshots but require manual PII review
- Require complex setup or external services

SafeSnap works instantly, locally, and automatically.

## Features

### Comprehensive PII Protection

Automatically detects and protects:

- **Proper nouns** (names, places, organizations)
- **Money amounts** with realistic variance
- **Quantities** with magnitude preservation
- **Email addresses**
- **Phone numbers**
- **Street addresses**
- **Dates** with time-based variance
- **URLs and domains**
- **IP addresses**
- **Credit card numbers**
- **Custom regex patterns** (user-defined)

### Smart Detection Engine

- **Multi-signal scoring** with 8 context signals for proper noun detection
- **Pattern matching** for structured data (emails, phones, etc.) with library validation
- **Context awareness** (skips labels, headings, buttons, department names)
- **Email domain matching** to boost company name detection confidence
- **Form input protection** before screenshots
- **Consistent replacements** (same input = same output)
- **Global replacement** ensures all occurrences of detected PII are replaced across the entire page
- **Magnitude variance** for realistic money/quantity replacement

**Performance:** 100% precision (zero false positives), 55.88% recall

📖 **[Read detailed detection documentation →](docs/DETECTION.md)**

### Screenshot Tools

- **One-click protection** before capture
- **Instant screenshot** of visible tab (PNG)
- **Copy to clipboard** for quick sharing
- **Auto-download** option
- **Restore original** to undo changes

## Installation

### From Source (Manual)

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/safesnap.git
   cd safesnap
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the extension:

   ```bash
   bun run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Chrome Web Store (Coming Soon)

Will be available on the Chrome Web Store once published.

## Quick Start

1. **Navigate** to any web page
2. **Click** the SafeSnap icon in your toolbar
3. **Select** PII types to protect (or use defaults)
4. **Click "Protect PII"** to replace sensitive information
5. **Click "Take Screenshot"** to capture
6. **Click "Restore Original"** when done

Your screenshot is now safe to share without exposing sensitive data!

## Use Cases

### QA Teams

- Report bugs without exposing customer data
- Share test results with external contractors
- Create training materials safely

### Product Managers

- Share mockups with customer examples
- Document workflows without privacy concerns
- Create presentations with real data (safely)

### Developers

- Screenshot error messages without tokens
- Share production issues with support teams
- Document API responses safely

### Compliance Teams

- Demonstrate UI without GDPR/CCPA violations
- Create audit documentation
- Share compliance screenshots

## Development

### Prerequisites

- Bun (package manager)
- Chrome browser for testing

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/safesnap.git
cd safesnap
bun install

# Run development build with watch mode
bun run dev

# Run tests
bun run test

# Run linter
bun run lint

# Production build
bun run build

# Create package for distribution
bun run package
```

### Project Structure

```
safesnap/
├── src/
│   ├── background/      # Background service worker
│   ├── content/         # Content scripts (PII detection/replacement)
│   ├── popup/           # Extension popup UI
│   ├── settings/        # Settings page
│   ├── detection/       # PII detection engine (pii-detector.js, pattern-matcher.js, dictionary.js)
│   ├── replacement/     # PII replacement logic (replacer.js, consistency-mapper.js, name/company pools)
│   ├── utils/           # Utility functions
│   └── i18n/            # Internationalization
├── tests/               # Jest unit tests (co-located with source as *.test.js)
├── config/              # Configuration files (app-config.js)
├── assets/              # Icons, images
├── src/dictionaries/    # Dictionary data files (en.js with 801 words)
├── dist/                # Build output
└── docs/                # Documentation
```

### Testing

```bash
# Run all tests (IMPORTANT: Use "bun run test", NOT "bun test")
bun run test

# Watch mode for TDD
bun run test:watch

# Coverage report
bun run test:coverage

# Run specific test
bun run test path/to/test.test.js
```

**Current Status:** 403 tests passing | >80% coverage

### Code Quality

```bash
# Lint code
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Format with Prettier
bun run format
```

## Architecture

SafeSnap uses a modular Chrome extension architecture:

- **Content Script**: Runs on web pages, performs PII detection and replacement
- **Background Service Worker**: Handles screenshot capture and message routing
- **Popup UI**: User interface for controls and settings
- **Settings Page**: Configuration and customization

All PII processing happens **locally in your browser**. No data is sent to external servers.

### Detection System

SafeSnap uses a **hybrid detection approach** combining:

1. **Pattern-based detection** - Regex patterns + library validation for structured data (emails, phones, credit cards)
2. **Multi-signal scoring** - 8 context signals for proper noun detection (names, companies, places)
3. **Context-aware filtering** - Skips UI elements, applies department/team name penalties

**Key Features:**

- 100% precision (zero false positives)
- 801-word curated dictionary for common English words
- Configurable detection threshold (default: 0.75)
- Email domain matching for company name validation
- Department name filtering (e.g., "Human Resources", "Customer Service")

**[Learn more about detection →](docs/DETECTION.md)**

## Privacy & Security

SafeSnap is built with privacy as the top priority:

- All processing happens **locally in your browser**
- No external servers or APIs
- No analytics or tracking
- No data collection
- Minimal permissions (activeTab, storage, clipboardWrite)
- Dictionary files are static, bundled assets
- Settings stored in Chrome's encrypted storage

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Quick checklist:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure `bun run test` and `bun run lint` pass
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 SafeSnap Community

## Support

- **Bug reports**: [GitHub Issues](https://github.com/yourusername/safesnap/issues)
- **Feature requests**: [GitHub Discussions](https://github.com/yourusername/safesnap/discussions)
- **Questions**: Check existing issues or start a discussion

## Roadmap

- [ ] Firefox support
- [ ] Edge support
- [ ] Safari support
- [ ] Additional language support (i18n)
- [ ] Export/import settings
- [ ] Bulk screenshot processing
- [ ] Video redaction support
- [ ] Additional PII types

See [open issues](https://github.com/yourusername/safesnap/issues) for planned features and known issues.

## Credits

- **Dictionary data**: US Census Bureau, Social Security Administration (public domain)
- **Built with**: Chrome Extension APIs, Jest, Webpack
- **Community contributors**: See [Contributors](https://github.com/yourusername/safesnap/graphs/contributors)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**Made with privacy in mind by the SafeSnap Community**
