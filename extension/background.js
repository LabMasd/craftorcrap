// craftorcrap Background Service Worker

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('craftorcrap extension installed');
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'imageSelected') {
    // Store the selected image data
    chrome.storage.local.set({ selectedImage: message.data });
  }
});
