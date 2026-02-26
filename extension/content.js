// craftorcrap Image Saver - Pinterest-style overlay on images

const CATEGORIES = ['Web', 'Motion', 'Branding', 'Illustration', 'Photography', '3D', 'AI', 'Other'];
const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

let saveBar = null;
let currentImage = null;
let currentElement = null;
let selectedCategory = 'Web';
let hideTimeout = null;

// Create the save bar
function createSaveBar() {
  if (saveBar) return;

  saveBar = document.createElement('div');
  saveBar.id = 'craftorcrap-savebar';
  saveBar.innerHTML = `
    <div class="craftorcrap-savebar-logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
        <text x="12" y="16" text-anchor="middle" fill="#0a0a0a" font-size="10" font-weight="bold">C</text>
      </svg>
    </div>
    <div class="craftorcrap-savebar-selector">
      <span class="craftorcrap-savebar-label">Save to</span>
      <div class="craftorcrap-savebar-dropdown">
        <span class="craftorcrap-savebar-category">${selectedCategory}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
        <div class="craftorcrap-savebar-menu">
          ${CATEGORIES.map(cat => `
            <div class="craftorcrap-savebar-option ${cat === selectedCategory ? 'selected' : ''}" data-category="${cat}">${cat}</div>
          `).join('')}
        </div>
      </div>
    </div>
    <button class="craftorcrap-savebar-btn">Save</button>
  `;

  document.body.appendChild(saveBar);

  // Event listeners
  const dropdown = saveBar.querySelector('.craftorcrap-savebar-dropdown');
  const menu = saveBar.querySelector('.craftorcrap-savebar-menu');
  const saveBtn = saveBar.querySelector('.craftorcrap-savebar-btn');

  dropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });

  menu.querySelectorAll('.craftorcrap-savebar-option').forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCategory = option.dataset.category;
      saveBar.querySelector('.craftorcrap-savebar-category').textContent = selectedCategory;
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
    if (saveBar) {
      saveBar.classList.remove('show');
      saveBar.querySelector('.craftorcrap-savebar-menu').classList.remove('show');
    }
    currentImage = null;
    currentElement = null;
  }, 300);
}

// Save current image
async function saveCurrentImage() {
  if (!currentImage) return;

  const saveBtn = saveBar.querySelector('.craftorcrap-savebar-btn');
  saveBtn.textContent = '...';
  saveBtn.disabled = true;

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        imageUrl: currentImage,
        category: selectedCategory,
      }),
    });

    if (response.ok) {
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('success');
      setTimeout(() => {
        saveBtn.textContent = 'Save';
        saveBtn.classList.remove('success');
        saveBtn.disabled = false;
        hideSaveBar();
      }, 1500);
    } else {
      const data = await response.json();
      saveBtn.textContent = data.error?.includes('already') ? 'Already saved' : 'Error';
      saveBtn.classList.add('error');
      setTimeout(() => {
        saveBtn.textContent = 'Save';
        saveBtn.classList.remove('error');
        saveBtn.disabled = false;
      }, 2000);
    }
  } catch (err) {
    saveBtn.textContent = 'Error';
    saveBtn.classList.add('error');
    setTimeout(() => {
      saveBtn.textContent = 'Save';
      saveBtn.classList.remove('error');
      saveBtn.disabled = false;
    }, 2000);
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
  const result = getImageSrc(e.target);
  if (result) {
    showSaveBar(result.src, result.element);
  }
}, true);

document.addEventListener('mouseout', (e) => {
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
