const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

let queue = [];

// Filter mode elements
const filterButtons = document.querySelectorAll('.filter-btn');
const badgesToggle = document.getElementById('badgesToggle');

// Load filter settings
chrome.storage.local.get(['filterMode', 'showBadges'], (result) => {
  const mode = result.filterMode || 'all';
  const showBadges = result.showBadges !== false;

  // Update filter buttons
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Update badges toggle
  badgesToggle.classList.toggle('active', showBadges);
});

// Filter button handlers
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;

    // Update UI
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Save setting
    chrome.storage.local.set({ filterMode: mode });
  });
});

// Badges toggle handler
badgesToggle.addEventListener('click', () => {
  const isActive = badgesToggle.classList.toggle('active');
  chrome.storage.local.set({ showBadges: isActive });
});

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
const MAX_QUEUE_SIZE = 10;

function addToQueue(item) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    // Queue is full
    return;
  }
  // Check for duplicates
  const exists = queue.some(q => q.src === item.src && q.pageUrl === item.pageUrl);
  if (!exists) {
    item.id = 'item-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
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
      <button class="queue-item-remove" data-remove-id="${item.id}" title="Remove">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div class="queue-item-category">
        <select data-category-id="${item.id}">
          ${CATEGORIES.map(cat => `
            <option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>
          `).join('')}
        </select>
      </div>
    </div>
  `).join('');

  // Add event listeners
  queueGrid.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromQueue(btn.dataset.removeId);
    });
  });

  queueGrid.querySelectorAll('[data-category-id]').forEach(select => {
    select.addEventListener('change', (e) => {
      e.stopPropagation();
      updateItemCategory(select.dataset.categoryId, select.value);
    });
  });

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

