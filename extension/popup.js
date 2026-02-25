const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

let queue = [];

// Elements
const pickBtn = document.getElementById('pickBtn');
const clearBtn = document.getElementById('clearBtn');
const queueCount = document.getElementById('queueCount');
const queueGrid = document.getElementById('queueGrid');
const emptyState = document.getElementById('emptyState');
const footer = document.getElementById('footer');
const submitBtn = document.getElementById('submitBtn');
const status = document.getElementById('status');

// Load queue from storage, then check for new images
chrome.storage.local.get(['imageQueue', 'selectedImage'], (result) => {
  // First load existing queue
  if (result.imageQueue && result.imageQueue.length > 0) {
    queue = result.imageQueue;
  }

  // Then add any newly selected image
  if (result.selectedImage) {
    addToQueue(result.selectedImage);
    chrome.storage.local.remove(['selectedImage']);
  }

  // Render the queue
  renderQueue();
});

// Pick image button
pickBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'activatePicker' });
  window.close();
});

// Clear all button
clearBtn.addEventListener('click', () => {
  queue = [];
  saveQueue();
  renderQueue();
});

// Add item to queue
function addToQueue(item) {
  // Check for duplicates
  const exists = queue.some(q => q.src === item.src && q.pageUrl === item.pageUrl);
  if (!exists) {
    item.id = Date.now();
    item.category = item.category || 'Web';
    queue.push(item);
    saveQueue();
    renderQueue();
  }
}

// Remove item from queue
function removeFromQueue(id) {
  queue = queue.filter(item => item.id !== id);
  saveQueue();
  renderQueue();
}

// Save queue to storage
function saveQueue() {
  chrome.storage.local.set({ imageQueue: queue });
}

// Get domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

const CATEGORIES = ['Web', 'Motion', 'Branding', 'Illustration', 'Photography', '3D', 'AI', 'Other'];

// Render queue
function renderQueue() {
  queueCount.textContent = `${queue.length} item${queue.length !== 1 ? 's' : ''}`;

  if (queue.length === 0) {
    emptyState.style.display = 'block';
    queueGrid.style.display = 'none';
    footer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  queueGrid.style.display = 'grid';
  footer.style.display = 'block';

  queueGrid.innerHTML = queue.map(item => `
    <div class="queue-item" data-id="${item.id}">
      ${item.src
        ? `<img src="${item.src}" alt="" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">`
        : '<div class="no-image">Page only</div>'
      }
      <div class="queue-item-domain">${getDomain(item.pageUrl)}</div>
      <button class="queue-item-remove" onclick="removeFromQueue(${item.id})" title="Remove">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div class="queue-item-category">
        <select onchange="updateItemCategory(${item.id}, this.value)">
          ${CATEGORIES.map(cat => `
            <option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>
          `).join('')}
        </select>
      </div>
    </div>
  `).join('');

  submitBtn.textContent = `Submit ${queue.length} item${queue.length !== 1 ? 's' : ''}`;
}

// Update category for a single item
function updateItemCategory(id, category) {
  const item = queue.find(q => q.id === id);
  if (item) {
    item.category = category;
    saveQueue();
  }
}

// Submit all to craftorcrap
submitBtn.addEventListener('click', async () => {
  if (queue.length === 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  status.className = 'status';
  status.style.display = 'none';

  let successCount = 0;
  let errorCount = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.pageUrl,
          imageUrl: item.src,
          category: item.category || 'Web',
        }),
      });

      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch {
      errorCount++;
    }
  }

  if (successCount > 0) {
    status.className = 'status success';
    status.textContent = `${successCount} item${successCount !== 1 ? 's' : ''} submitted!`;
    status.style.display = 'block';

    // Clear submitted items
    queue = [];
    saveQueue();

    setTimeout(() => {
      renderQueue();
      status.style.display = 'none';
    }, 2000);
  }

  if (errorCount > 0 && successCount === 0) {
    status.className = 'status error';
    status.textContent = `Failed to submit ${errorCount} item${errorCount !== 1 ? 's' : ''}`;
    status.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = `Submit ${queue.length} item${queue.length !== 1 ? 's' : ''}`;
  }
});

// Make functions available globally for onclick
window.removeFromQueue = removeFromQueue;
window.updateItemCategory = updateItemCategory;
