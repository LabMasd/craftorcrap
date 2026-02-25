# craftorcrap Chrome Extension

Save images and assets directly to craftorcrap from any webpage.

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Usage

1. Click the craftorcrap icon in your browser toolbar
2. Click "Pick Image" to activate the image picker
3. Hover over images on the page - they'll highlight
4. Click an image to select it
5. Choose a category
6. Click "Submit to craftorcrap"

## Icons

Before loading the extension, you need to add icon files:

- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

You can create these from any square image/logo.

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `popup.html/js` - The popup UI when clicking the icon
- `content.js/css` - Injected into pages for image picking
- `background.js` - Service worker for background tasks

## API

The extension submits to `https://craftorcrap.cc/api/extension/submit` with:

```json
{
  "url": "page URL",
  "imageUrl": "selected image URL",
  "category": "Web|Motion|Branding|..."
}
```
