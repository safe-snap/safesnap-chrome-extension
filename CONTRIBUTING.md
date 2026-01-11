# Contributing to SafeSnap

Thank you for your interest in contributing to SafeSnap! We welcome contributions from the community to help make this privacy-first screenshot tool even better.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Please be kind, constructive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Browser version and operating system
- SafeSnap version (found in Settings > About)

### Suggesting Features

We welcome feature suggestions! Please open an issue with:

- A clear description of the feature
- The problem it solves or use case it addresses
- Any implementation ideas you have
- Examples from other tools (if applicable)

### Contributing Code

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following our code style guidelines
3. **Write or update tests** to cover your changes
4. **Ensure all tests pass** with `npm test`
5. **Run the linter** with `npm run lint` and fix any issues
6. **Build the extension** with `npm run build` to verify
7. **Commit your changes** using clear, descriptive commit messages
8. **Push to your fork** and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/safesnap.git
cd safesnap

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Build the extension
npm run build

# Watch mode for development
npm run watch
```

## Code Style Guidelines

### JavaScript/ES6+

- Use modern ES6+ syntax (const/let, arrow functions, destructuring)
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused (single responsibility)
- Use async/await instead of Promise chains

### File Organization

- Place source code in `src/`
- Place tests in `tests/` mirroring the source structure
- Place configuration in `config/`
- Keep files focused on a single concern

### Testing

- Write unit tests for all new functionality
- Maintain test coverage above 80%
- Test both success and error cases
- Use descriptive test names that explain the scenario

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>

[optional body]

[optional footer]
```

Types:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, no logic changes)
- `refactor:` Code refactoring (no feature changes)
- `test:` Adding or updating tests
- `chore:` Maintenance tasks (dependencies, build config)

Examples:

```
feat: add support for custom PII detection patterns
fix: resolve memory leak in screenshot capture
docs: update installation instructions
test: add unit tests for pattern matcher
```

## Testing Requirements

All pull requests must:

- Pass all existing tests (`npm test`)
- Include tests for new functionality
- Maintain or improve code coverage (>80%)
- Pass ESLint checks (`npm run lint`)
- Build successfully (`npm run build`)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.js
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Update CHANGELOG.md** with your changes under "Unreleased"
3. **Ensure CI checks pass** (tests, linting, build)
4. **Request review** from maintainers
5. **Address feedback** and make requested changes
6. **Squash commits** if requested before merge

### Pull Request Checklist

- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] Tests added/updated and passing
- [ ] Linter passes with no errors
- [ ] Build succeeds
- [ ] CHANGELOG.md updated
- [ ] No merge conflicts with main

## Project Structure

```
safesnap/
├── src/
│   ├── background/      # Background service worker
│   ├── content/         # Content scripts
│   ├── popup/           # Extension popup UI
│   ├── settings/        # Settings page
│   ├── core/            # Core detection/replacement logic
│   ├── utils/           # Utility functions
│   └── i18n/            # Internationalization
├── tests/               # Test files
├── config/              # Configuration files
├── assets/              # Images, icons, dictionaries
├── dist/                # Build output
└── docs/                # Documentation
```

## Key Architecture Decisions

### PII Detection

- Uses dictionary-based detection with 20K+ proper nouns
- Pattern-based detection for structured data (emails, phones, etc.)
- Custom regex patterns for user-defined sensitive data

### Replacement Strategy

- Consistent replacements within a session (same input = same output)
- Magnitude variance for realistic money/quantity replacements
- Preserves data relationships and format

### Privacy First

- All processing happens locally in the browser
- No data sent to external servers
- No analytics or tracking
- User data stays on their machine

## Questions?

If you have questions about contributing, please:

- Open a discussion on GitHub
- Review existing issues and pull requests
- Check the README for project documentation

Thank you for contributing to SafeSnap!
