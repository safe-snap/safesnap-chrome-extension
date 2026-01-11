// SafeSnap - Background Service Worker
// Handles screenshot capture and message routing

console.log('SafeSnap background service worker loaded');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'TAKE_SCREENSHOT':
      captureScreenshot(sendResponse);
      return true; // Keep channel open for async response

    case 'GET_STATUS':
      sendResponse({ status: 'ready' });
      break;

    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Capture visible tab as screenshot
 */
async function captureScreenshot(sendResponse) {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab[0]) {
      throw new Error('No active tab found');
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}
