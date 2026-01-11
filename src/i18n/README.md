# SafeSnap Internationalization (i18n)

This directory contains all language files for SafeSnap. **All user-facing text is centralized in these files** to make translation easy.

## File Structure

- `en.js` - English (default language)
- Add new language files here (e.g., `es.js`, `fr.js`, `de.js`)

## How It Works

The HTML files (`popup.html` and `settings.html`) contain **empty elements** that are populated dynamically by JavaScript when the extension loads. The `initializeUIText()` functions in `popup.js` and `settings.js` read from the i18n file and fill in all text content.

This approach ensures:

- ✅ **100% of visible text comes from i18n files**
- ✅ **No hardcoded English text in HTML**
- ✅ **Translators only need to modify one file per language**
- ✅ **No HTML knowledge required for translation**

## How to Add a New Language

1. **Copy the English file:**

   ```bash
   cp en.js es.js  # Replace 'es' with your language code
   ```

2. **Translate all strings:**
   - Keep all the keys the same (e.g., `appName`, `btnProtectPii`)
   - Only translate the values (the text in quotes)
   - Preserve special characters like `\n` for line breaks

3. **Update the language code:**

   ```javascript
   // Change the export name to match your language
   export const es = {  // Change 'en' to your language code
   ```

4. **Update imports in code:**
   - In `src/popup/popup.js`, `src/settings/settings.js`, and `src/content/content.js`
   - Change: `import i18n from '../i18n/en.js';`
   - To: `import i18n from '../i18n/es.js';`

5. **Rebuild:**
   ```bash
   npm run build
   ```

## Translation Guidelines

### DO:

✅ Translate all text strings  
✅ Keep the same key names  
✅ Maintain the same formatting (bold tags, line breaks, etc.)  
✅ Test in the extension after translating  
✅ Translate alt text for accessibility  
✅ Adjust unit names if needed (e.g., "pixels" → "píxeles")

### DON'T:

❌ Don't change key names (e.g., keep `appName` as `appName`)  
❌ Don't remove or add keys without updating all language files  
❌ Don't translate technical terms like "PII", "URL", "IP", "IPv4"  
❌ Don't change emojis unless culturally necessary  
❌ Don't modify HTML files (they're auto-populated by JavaScript)

## Example Translation

**English (`en.js`):**

```javascript
export const en = {
  appName: 'SafeSnap',
  appLogoAlt: 'SafeSnap Logo',
  btnProtectPii: 'Protect PII',
  btnRestoreOriginal: 'Restore Original',
  unitPixels: 'pixels',
  unitPlusMinus: '±',
  // ...
};
```

**Spanish (`es.js`):**

```javascript
export const es = {
  appName: 'SafeSnap',
  appLogoAlt: 'Logotipo de SafeSnap',
  btnProtectPii: 'Proteger PII',
  btnRestoreOriginal: 'Restaurar Original',
  unitPixels: 'píxeles',
  unitPlusMinus: '±',
  // ...
};
```

**French (`fr.js`):**

```javascript
export const fr = {
  appName: 'SafeSnap',
  appLogoAlt: 'Logo SafeSnap',
  btnProtectPii: 'Protéger PII',
  btnRestoreOriginal: "Restaurer l'original",
  unitPixels: 'pixels',
  unitPlusMinus: '±',
  // ...
};
```

## String Categories

The i18n file is organized into these sections:

1. **Extension Name** - App name, logo alt text, branding
2. **Tabs** - Tab labels in the popup
3. **PII Type Labels** - Labels and descriptions for each PII type
4. **Buttons** - All button text
5. **Headings** - Section headings
6. **Settings Labels** - Form labels and settings options
7. **Environment Status** - Environment detection messages
8. **About Info** - About page content
9. **Units** - Measurement units (pixels, percent, plus-minus)
10. **Settings Page** - Settings page specific strings
11. **Alerts & Errors** - Error messages and alerts
12. **Confirmation Dialogs** - Confirmation prompts
13. **Watermark** - Watermark text displayed on protected pages
14. **Emojis** - Emoji icons (usually don't need translation)

## Testing Your Translation

1. **Build the extension:**

   ```bash
   npm run build
   ```

2. **Load the extension in your browser:**
   - Chrome/Brave: `chrome://extensions` → Enable "Developer mode" → "Load unpacked" → Select `dist/` folder
   - Test all screens: Popup → Protect/Settings/About tabs
   - Test advanced settings page

3. **Check for:**
   - Text overflow (some languages use longer words)
   - Special characters displaying correctly (é, ñ, ü, etc.)
   - Emojis appearing properly
   - Buttons fitting the layout
   - Alt text for images (screen reader accessibility)
   - Right-to-left text (for Arabic, Hebrew, etc.)

4. **Test functionality:**
   - Click all buttons to ensure labels are correct
   - Change settings and verify labels update
   - Take a screenshot to see watermark text
   - Check error messages by triggering errors

## Common Translation Challenges

### Long Text

Some languages (German, Finnish) use longer words. Test that:

- Button text doesn't overflow
- Labels fit in their containers
- Two-column layouts don't break

### Special Characters

Ensure your editor saves the file as **UTF-8** to preserve:

- Accented characters: é, ñ, ü, ç
- Asian characters: 中文, 日本語, 한국어
- Cyrillic: Русский
- Arabic script: العربية

### Formal vs Informal

Choose the appropriate level of formality for your language:

- **Formal**: German (Sie), Spanish (usted)
- **Informal**: Most English interfaces, French (tu)

## Questions or Issues?

If you encounter any problems while translating:

1. Check that all keys match the English file exactly
2. Ensure you're using correct JavaScript syntax (quotes, commas, semicolons)
3. Test the build with `npm run build` and check for errors
4. Verify file is saved as UTF-8 encoding
5. Open an issue on GitHub if you need help

## Language Codes (ISO 639-1)

Common language codes to use:

- `en` - English
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `it` - Italian (Italiano)
- `pt` - Portuguese (Português)
- `ja` - Japanese (日本語)
- `zh` - Chinese (中文)
- `ko` - Korean (한국어)
- `ru` - Russian (Русский)
- `ar` - Arabic (العربية)
- `hi` - Hindi (हिन्दी)
- `nl` - Dutch (Nederlands)
- `pl` - Polish (Polski)
- `tr` - Turkish (Türkçe)

Thank you for helping make SafeSnap accessible to more users worldwide!
