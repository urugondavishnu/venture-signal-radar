/**
 * Content Script
 * Runs on every page to capture page information
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_DATA') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname.replace(/^www\./, ''),
    });
  }
  return true;
});
