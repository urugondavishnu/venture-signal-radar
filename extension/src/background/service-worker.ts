/**
 * Chrome Extension Service Worker (Background Script)
 * Opens side panel on action click and handles page info requests.
 * SSE streaming is now handled directly in the React app (side panel stays open).
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Enable side panel on all tabs
chrome.sidePanel.setOptions({ enabled: true });

// Extension install handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Signal Tracker] Extension installed');
});

// Message handler — provides page info to the side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        sendResponse({
          url: tab.url || '',
          title: tab.title || '',
          domain: tab.url ? new URL(tab.url).hostname.replace(/^www\./, '') : '',
        });
      } else {
        sendResponse({ url: '', title: '', domain: '' });
      }
    });
    return true; // async response
  }
});
