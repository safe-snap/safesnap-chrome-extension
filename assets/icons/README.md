# Icon Generation

The SafeSnap extension uses PNG icons for the browser toolbar and extension icon display. These need to be generated from the SVG source file.

## Quick Start

### Option 1: Use ImageMagick (Recommended)

```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux

# Generate icons
npm run generate-icons
```

### Option 2: Use librsvg

```bash
# Install librsvg
brew install librsvg  # macOS
# or
sudo apt-get install librsvg2-bin  # Linux

# Generate icons
npm run generate-icons
```

### Option 3: Manual Conversion

If you don't want to install conversion tools, you can manually convert `assets/icons/logo.svg` to PNG files:

1. Open https://cloudconvert.com/svg-to-png
2. Upload `assets/icons/logo.svg`
3. Create 3 versions:
   - 16x16px → save as `icon16.png`
   - 48x48px → save as `icon48.png`
   - 128x128px → save as `icon128.png`
4. Place all files in `assets/icons/`

## Current Icon Status

- ✅ **logo.svg** - High-quality SVG source file (displays in popup)
- ⚠️ **icon16.png, icon48.png, icon128.png** - Currently placeholder 1x1 transparent PNGs

The extension will work with the placeholder PNGs, but the browser toolbar icon will appear blank/invisible. The logo displays correctly in the popup using the SVG file.

## Icon Design

The logo features:
- Camera icon (representing screenshots)
- Detective magnifying glass (representing PII detection)
- Lock symbol (representing privacy protection)
- Clean, professional blue/purple color scheme
