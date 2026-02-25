// craftorcrap Background Service Worker

const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

// Create context menus
function createContextMenus() {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Context menu for images
    chrome.contextMenus.create({
      id: 'save-to-craftorcrap',
      title: 'Save to craftorcrap',
      contexts: ['image']
    });

    // Context menu for links (in case it's a link to an image)
    chrome.contextMenus.create({
      id: 'save-link-to-craftorcrap',
      title: 'Save to craftorcrap',
      contexts: ['link']
    });

    // Context menu for page
    chrome.contextMenus.create({
      id: 'save-page-to-craftorcrap',
      title: 'Save page to craftorcrap',
      contexts: ['page']
    });

    console.log('craftorcrap context menus created');
  });
}

// Create context menus on install and startup
chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

// Also create immediately when service worker loads
createContextMenus();

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-craftorcrap') {
    // Right-clicked on an image
    const imageUrl = info.srcUrl;
    const pageUrl = info.pageUrl;

    // Store the selection and open popup for category selection
    chrome.storage.local.set({
      selectedImage: {
        src: imageUrl,
        pageUrl: pageUrl,
        pageTitle: tab.title
      },
      openPopupAfterSave: true
    });

    // Show notification or open side panel
    showSaveNotification(imageUrl, tab.id);
  }

  if (info.menuItemId === 'save-link-to-craftorcrap') {
    // Right-clicked on a link
    const linkUrl = info.linkUrl;
    const pageUrl = info.pageUrl;

    chrome.storage.local.set({
      selectedImage: {
        src: linkUrl,
        pageUrl: pageUrl,
        pageTitle: tab.title
      }
    });

    showSaveNotification(linkUrl, tab.id);
  }

  if (info.menuItemId === 'save-page-to-craftorcrap') {
    // Right-clicked on page - save the page URL
    const pageUrl = info.pageUrl;

    chrome.storage.local.set({
      selectedImage: {
        src: null,
        pageUrl: pageUrl,
        pageTitle: tab.title
      }
    });

    showSaveNotification(null, tab.id);
  }
});

// Show save notification via content script
function showSaveNotification(imageUrl, tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: 'showSaveConfirmation',
    imageUrl: imageUrl
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'imageSelected') {
    chrome.storage.local.set({ selectedImage: message.data });
  }

  if (message.action === 'quickSave') {
    // Quick save without category selection (defaults to 'Other')
    quickSaveToSite(message.data);
  }
});

// Quick save function
async function quickSaveToSite(data) {
  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: data.pageUrl,
        imageUrl: data.src,
        category: data.category || 'Other'
      })
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
