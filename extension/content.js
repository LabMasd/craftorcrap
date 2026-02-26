// craftorcrap Image Saver - Pinterest-style overlay on images

// Don't run on craftorcrap website
if (window.location.hostname === 'craftorcrap.cc' || window.location.hostname === 'www.craftorcrap.cc') {
  // Exit early - don't initialize the extension on our own site
} else {

const CATEGORIES = ['All', 'Web', 'Apps', 'Branding', 'Graphic Design', 'Motion', 'Illustration', 'Photography', 'Product', '3D', 'AI', 'Other'];
const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

let hoverEnabled = true;

// Load hover setting
chrome.storage.local.get(['hoverEnabled'], (result) => {
  hoverEnabled = result.hoverEnabled !== false; // Default to true
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.hoverEnabled !== undefined) {
    hoverEnabled = changes.hoverEnabled.newValue !== false;
    if (!hoverEnabled && saveBar) {
      saveBar.classList.remove('show');
    }
  }
});

let saveBar = null;
let currentImage = null;
let currentElement = null;
let selectedCategory = 'All';
let hideTimeout = null;

// Create the save bar
function createSaveBar() {
  if (saveBar) return;

  saveBar = document.createElement('div');
  saveBar.id = 'craftorcrap-savebar';
  saveBar.innerHTML = `
    <button class="craftorcrap-savebar-btn" title="Save to craftorcrap">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <text x="12" y="16" text-anchor="middle" fill="#0a0a0a" font-size="10" font-weight="bold">C</text>
      </svg>
    </button>
    <div class="craftorcrap-savebar-dropdown">
      <div class="craftorcrap-savebar-category">
        <span>${selectedCategory}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="craftorcrap-savebar-menu">
        ${CATEGORIES.map(cat => `
          <div class="craftorcrap-savebar-option ${cat === selectedCategory ? 'selected' : ''}" data-category="${cat}">${cat}</div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(saveBar);

  // Event listeners
  const categoryBtn = saveBar.querySelector('.craftorcrap-savebar-category');
  const menu = saveBar.querySelector('.craftorcrap-savebar-menu');
  const saveBtn = saveBar.querySelector('.craftorcrap-savebar-btn');

  categoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });

  menu.querySelectorAll('.craftorcrap-savebar-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCategory = option.dataset.category;
      saveBar.querySelector('.craftorcrap-savebar-category span').textContent = selectedCategory;
      menu.querySelectorAll('.craftorcrap-savebar-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      menu.classList.remove('show');
    });
  });

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    saveCurrentImage();
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    menu.classList.remove('show');
  });

  // Keep bar visible when hovering over it
  saveBar.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });

  saveBar.addEventListener('mouseleave', () => {
    hideSaveBar();
  });
}

// Position save bar over the image
function positionSaveBar(element) {
  if (!saveBar) return;

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Position at bottom of image
  saveBar.style.position = 'absolute';
  saveBar.style.left = `${rect.left + scrollX + 12}px`;
  saveBar.style.bottom = 'auto';
  saveBar.style.top = `${rect.bottom + scrollY - 12 - 44}px`; // 44 is approx bar height
}

// Show save bar for an image
function showSaveBar(imageSrc, element) {
  if (!hoverEnabled) return;
  if (!saveBar) createSaveBar();

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  currentImage = imageSrc;
  currentElement = element;
  positionSaveBar(element);
  saveBar.classList.add('show');
}

// Hide save bar
function hideSaveBar() {
  if (hideTimeout) clearTimeout(hideTimeout);

  hideTimeout = setTimeout(() => {
    // Double-check we're not hovering over the image or save bar
    if (saveBar && currentElement) {
      const hoverElements = document.querySelectorAll(':hover');
      for (const el of hoverElements) {
        if (saveBar.contains(el) || currentElement.contains(el) || el === currentElement) {
          return; // Still hovering, don't hide
        }
      }
    }

    if (saveBar) {
      saveBar.classList.remove('show');
      saveBar.querySelector('.craftorcrap-savebar-menu').classList.remove('show');
    }
    currentImage = null;
    currentElement = null;
  }, 500);
}

// Save current image and auto-vote as craft
async function saveCurrentImage() {
  if (!currentImage) return;

  const saveBtn = saveBar.querySelector('.craftorcrap-savebar-btn');
  const originalHTML = saveBtn.innerHTML;
  saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>';
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        imageUrl: currentImage,
        category: selectedCategory === 'All' ? null : selectedCategory,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      // Auto-vote as craft
      if (data.id) {
        try {
          // Generate a simple fingerprint for the extension
          const fingerprint = 'ext-' + navigator.userAgent.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '') + '-' + Date.now();
          await fetch(`${CRAFTORCRAP_URL}/api/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submission_id: data.id,
              verdict: 'craft',
              fingerprint: fingerprint,
            }),
          });
        } catch (e) {
          // Vote failed, but save succeeded - that's ok
        }
      }

      saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>';
      saveBtn.classList.add('success');
      setTimeout(() => {
        saveBtn.innerHTML = originalHTML;
        saveBtn.classList.remove('success');
        saveBtn.disabled = false;
        hideSaveBar();
      }, 1200);
    } else {
      saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>';
      saveBtn.classList.add('error');
      setTimeout(() => {
        saveBtn.innerHTML = originalHTML;
        saveBtn.classList.remove('error');
        saveBtn.disabled = false;
      }, 1500);
    }
  } catch (err) {
    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>';
    saveBtn.classList.add('error');
    setTimeout(() => {
      saveBtn.innerHTML = originalHTML;
      saveBtn.classList.remove('error');
      saveBtn.disabled = false;
    }, 1500);
  }
}

// Check if element is an image - returns { src, element } or null
function getImageSrc(element) {
  if (element.tagName === 'IMG' && element.src) {
    // Skip tiny images (likely icons)
    if (element.naturalWidth > 100 && element.naturalHeight > 100) {
      return { src: element.src, element };
    }
  }

  // Check for background image on larger elements
  const rect = element.getBoundingClientRect();
  if (rect.width > 100 && rect.height > 100) {
    const bg = window.getComputedStyle(element).backgroundImage;
    if (bg && bg !== 'none' && bg.startsWith('url(')) {
      const match = bg.match(/url\(["']?(.+?)["']?\)/);
      if (match) return { src: match[1], element };
    }
  }

  return null;
}

// Mouse event handlers
document.addEventListener('mouseover', (e) => {
  // Check if we're hovering over the save bar itself
  if (saveBar && saveBar.contains(e.target)) {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    return;
  }

  const result = getImageSrc(e.target);
  if (result) {
    showSaveBar(result.src, result.element);
  }
}, true);

document.addEventListener('mouseout', (e) => {
  // Don't hide if moving to the save bar
  if (saveBar && e.relatedTarget && saveBar.contains(e.relatedTarget)) {
    return;
  }

  // Don't hide if still within the current image element
  if (currentElement && e.relatedTarget && currentElement.contains(e.relatedTarget)) {
    return;
  }

  const result = getImageSrc(e.target);
  if (result) {
    hideSaveBar();
  }
}, true);

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showSaveConfirmation') {
    showSaveConfirmation(message.imageUrl);
  }
});

function showSaveConfirmation(imageSrc) {
  const existing = document.getElementById('craftorcrap-confirmation');
  if (existing) existing.remove();

  const confirmation = document.createElement('div');
  confirmation.id = 'craftorcrap-confirmation';
  confirmation.innerHTML = `
    <div class="craftorcrap-confirm-content">
      <div class="craftorcrap-confirm-icon">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="craftorcrap-confirm-text">
        <strong>Saved to queue!</strong>
        <span>Open extension to review & submit</span>
      </div>
    </div>
  `;

  document.body.appendChild(confirmation);

  setTimeout(() => {
    confirmation.classList.add('craftorcrap-fade-out');
    setTimeout(() => confirmation.remove(), 300);
  }, 3000);
}

} // End of else block - don't run on craftorcrap.cc
