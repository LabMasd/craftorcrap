// craftorcrap Image Picker

let pickerActive = false;
let overlay = null;
let highlightedElement = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'activatePicker') {
    activatePicker();
  }
});

function activatePicker() {
  if (pickerActive) return;
  pickerActive = true;

  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'craftorcrap-overlay';
  overlay.innerHTML = `
    <div class="craftorcrap-toolbar">
      <span class="craftorcrap-logo">craft<span>or</span>crap</span>
      <span class="craftorcrap-hint">Click on an image to select it</span>
      <button class="craftorcrap-cancel">Cancel (Esc)</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Add event listeners
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  // Cancel button
  overlay.querySelector('.craftorcrap-cancel').addEventListener('click', deactivatePicker);
}

function deactivatePicker() {
  if (!pickerActive) return;
  pickerActive = false;

  // Remove overlay
  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Remove highlight
  if (highlightedElement) {
    highlightedElement.classList.remove('craftorcrap-highlight');
    highlightedElement = null;
  }

  // Remove event listeners
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function handleMouseOver(e) {
  if (!pickerActive) return;

  const target = getImageElement(e.target);
  if (target && target !== highlightedElement) {
    if (highlightedElement) {
      highlightedElement.classList.remove('craftorcrap-highlight');
    }
    highlightedElement = target;
    highlightedElement.classList.add('craftorcrap-highlight');
  }
}

function handleMouseOut(e) {
  if (!pickerActive) return;

  const target = getImageElement(e.target);
  if (target && target === highlightedElement) {
    highlightedElement.classList.remove('craftorcrap-highlight');
    highlightedElement = null;
  }
}

function handleClick(e) {
  if (!pickerActive) return;

  const target = getImageElement(e.target);
  if (target) {
    e.preventDefault();
    e.stopPropagation();

    const imageSrc = getImageSrc(target);
    if (imageSrc) {
      // Store selection
      const data = {
        src: imageSrc,
        pageUrl: window.location.href,
        pageTitle: document.title,
      };

      chrome.storage.local.set({ selectedImage: data });

      // Show confirmation
      showConfirmation(imageSrc);

      deactivatePicker();
    }
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    deactivatePicker();
  }
}

function getImageElement(element) {
  // Check if element is an image
  if (element.tagName === 'IMG') return element;

  // Check if element has background image
  const bg = window.getComputedStyle(element).backgroundImage;
  if (bg && bg !== 'none' && bg.startsWith('url(')) return element;

  // Check for video/canvas
  if (element.tagName === 'VIDEO' || element.tagName === 'CANVAS') return element;

  // Check for SVG
  if (element.tagName === 'SVG' || element.closest('svg')) return element.closest('svg') || element;

  // Check parent for picture element
  if (element.closest('picture')) return element.closest('picture').querySelector('img');

  return null;
}

function getImageSrc(element) {
  if (element.tagName === 'IMG') {
    return element.src || element.currentSrc;
  }

  if (element.tagName === 'VIDEO') {
    return element.poster || element.src;
  }

  const bg = window.getComputedStyle(element).backgroundImage;
  if (bg && bg !== 'none') {
    const match = bg.match(/url\(["']?(.+?)["']?\)/);
    if (match) return match[1];
  }

  return null;
}

function showConfirmation(imageSrc) {
  const confirmation = document.createElement('div');
  confirmation.id = 'craftorcrap-confirmation';
  confirmation.innerHTML = `
    <div class="craftorcrap-confirm-content">
      <img src="${imageSrc}" alt="Selected">
      <div class="craftorcrap-confirm-text">
        <strong>Image selected!</strong>
        <span>Click the extension icon to submit</span>
      </div>
    </div>
  `;
  document.body.appendChild(confirmation);

  setTimeout(() => {
    confirmation.classList.add('craftorcrap-fade-out');
    setTimeout(() => confirmation.remove(), 300);
  }, 2500);
}
