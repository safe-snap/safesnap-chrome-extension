// SafeSnap - Background Service Worker
// Handles screenshot capture, content script injection, and message routing

console.log('SafeSnap background service worker loaded');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'TAKE_SCREENSHOT':
      captureScreenshot(sendResponse);
      return true; // Keep channel open for async response

    case 'INJECT_CONTENT_SCRIPT':
      injectContentScript(message.tabId)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
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

/**
 * Inject content script and CSS into a tab on-demand
 * Uses chrome.scripting API (requires "scripting" permission + "activeTab")
 * @param {number} tabId - Tab ID to inject into
 */
async function injectContentScript(tabId) {
  try {
    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['banner.css'],
    });

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    console.log('Content script injected into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}
