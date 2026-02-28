const CRAFTORCRAP_URL = 'https://craftorcrap.cc';
const CATEGORIES = ['Web', 'Apps', 'Branding', 'Graphic Design', 'Motion', 'Illustration', 'Photography', 'Product', '3D', 'AI', 'Other'];

let queue = [];
let hoverEnabled = true;
let showBadges = true;
let filterMode = 'all';
let crapStyle = 'blur'; // 'blur' or 'cover'
let isAuthenticated = false;
let currentUser = null;
let extensionToken = null;
let userBoards = [];
let defaultBoardId = ''; // empty = unsorted
let sharePublicly = false;

// Auth elements
const authSection = document.getElementById('authSection');
const authLoggedOut = document.getElementById('authLoggedOut');
const authLoggedIn = document.getElementById('authLoggedIn');
const authAvatar = document.getElementById('authAvatar');
const authName = document.getElementById('authName');

// Settings dropdown elements
const settingsDropdown = document.getElementById('settingsDropdown');
const settingsHeader = document.getElementById('settingsHeader');
const craftSettingsRow = document.getElementById('craftSettingsRow');
const publicSettingRow = document.getElementById('publicSettingRow');
const defaultBoardSelect = document.getElementById('defaultBoardSelect');
const publicToggle = document.getElementById('publicToggle');

// Toggle settings dropdown
settingsHeader.addEventListener('click', () => {
  settingsDropdown.classList.toggle('open');
});

// Load auth state and craft settings
chrome.storage.local.get(['isAuthenticated', 'currentUser', 'extensionToken', 'defaultBoardId', 'sharePublicly'], (result) => {
  isAuthenticated = result.isAuthenticated || false;
  currentUser = result.currentUser || null;
  extensionToken = result.extensionToken || null;
  defaultBoardId = result.defaultBoardId || '';
  sharePublicly = result.sharePublicly || false;
  updateAuthUI();
  updateCraftSettingsUI();
  if (extensionToken) {
    fetchUserBoards();
  }
});

// Listen for auth changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isAuthenticated) {
      isAuthenticated = changes.isAuthenticated.newValue || false;
      updateAuthUI();
      updateCraftSettingsUI();
    }
    if (changes.currentUser) {
      currentUser = changes.currentUser.newValue || null;
      updateAuthUI();
    }
    if (changes.extensionToken) {
      extensionToken = changes.extensionToken.newValue || null;
      if (extensionToken) {
        fetchUserBoards();
      }
      updateCraftSettingsUI();
    }
  }
});

function updateAuthUI() {
  if (isAuthenticated && currentUser) {
    authLoggedOut.style.display = 'none';
    authLoggedIn.style.display = 'flex';
    authName.textContent = currentUser.name || 'User';
    if (currentUser.imageUrl) {
      authAvatar.src = currentUser.imageUrl;
      authAvatar.style.display = 'block';
    } else {
      authAvatar.style.display = 'none';
    }
  } else {
    authLoggedOut.style.display = 'flex';
    authLoggedIn.style.display = 'none';
  }
}

// Elements
const hoverToggle = document.getElementById('hoverToggle');
const badgesToggle = document.getElementById('badgesToggle');
const filterButtons = document.querySelectorAll('.filter-btn');
const crapStyleButtons = document.querySelectorAll('.style-btn');

// Load settings
chrome.storage.local.get(['hoverEnabled', 'showBadges', 'filterMode', 'crapStyle'], (result) => {
  hoverEnabled = result.hoverEnabled !== false;
  showBadges = result.showBadges !== false;
  filterMode = result.filterMode || 'all';
  crapStyle = result.crapStyle || 'blur';
  updateSettingsUI();
});

// Hover toggle
hoverToggle.addEventListener('click', () => {
  hoverEnabled = !hoverEnabled;
  chrome.storage.local.set({ hoverEnabled });
  updateSettingsUI();
});

// Badges toggle
badgesToggle.addEventListener('click', () => {
  showBadges = !showBadges;
  chrome.storage.local.set({ showBadges });
  updateSettingsUI();
});

// Filter buttons
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterMode = btn.dataset.mode;

    // Update UI immediately
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Save to storage (this will notify content scripts)
    chrome.storage.local.set({ filterMode });
  });
});

// Crap style buttons
crapStyleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    crapStyle = btn.dataset.style;

    // Update UI immediately
    crapStyleButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Save to storage
    chrome.storage.local.set({ crapStyle });
  });
});

function updateSettingsUI() {
  // Hover toggle
  hoverToggle.classList.toggle('active', hoverEnabled);

  // Badges toggle
  badgesToggle.classList.toggle('active', showBadges);

  // Filter buttons
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === filterMode);
  });

  // Crap style buttons
  crapStyleButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === crapStyle);
  });
}

// Elements
const dropZone = document.getElementById('dropZone');
const clearBtn = document.getElementById('clearBtn');
const queueCount = document.getElementById('queueCount');
const queueGrid = document.getElementById('queueGrid');
const emptyState = document.getElementById('emptyState');
const footer = document.getElementById('footer');
const submitBtn = document.getElementById('submitBtn');
const status = document.getElementById('status');

// Load queue from storage
chrome.storage.local.get(['imageQueue', 'selectedImage'], (result) => {
  if (result.imageQueue && result.imageQueue.length > 0) {
    queue = result.imageQueue;
  }
  if (result.selectedImage) {
    addToQueue(result.selectedImage);
    chrome.storage.local.remove(['selectedImage']);
  }
  renderQueue();
});

// Listen for storage changes (when images are added via context menu)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedImage && changes.selectedImage.newValue) {
    addToQueue(changes.selectedImage.newValue);
    chrome.storage.local.remove(['selectedImage']);
  }
});

// Drag and drop handling
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  // Handle dropped files
  if (e.dataTransfer.files.length > 0) {
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          addToQueue({
            src: event.target.result,
            pageUrl: 'Local file',
            pageTitle: file.name
          });
        };
        reader.readAsDataURL(file);
      }
    }
    return;
  }

  // Handle dropped URLs/images from web
  const html = e.dataTransfer.getData('text/html');
  const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');

  if (html) {
    // Try to extract image src from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    if (img && img.src) {
      addToQueue({
        src: img.src,
        pageUrl: url || img.src,
        pageTitle: img.alt || 'Dropped image'
      });
      return;
    }
  }

  if (url && (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) || url.startsWith('data:image'))) {
    addToQueue({
      src: url,
      pageUrl: url,
      pageTitle: 'Dropped image'
    });
  }
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
  if (url === 'Local file') return 'Local';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

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

  // Add event listeners using delegation
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
      const headers = { 'Content-Type': 'application/json' };
      if (extensionToken) {
        headers['Authorization'] = `Bearer ${extensionToken}`;
      }
      const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
        method: 'POST',
        headers,
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

    queue = [];
    saveQueue();

    setTimeout(() => {
      renderQueue();
      status.style.display = 'none';
    }, 2000);
  }

  if (errorCount > 0 && successCount === 0) {
    status.className = 'status error';
    status.textContent = `Failed to submit`;
    status.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = `Submit ${queue.length} item${queue.length !== 1 ? 's' : ''}`;
  }
});

// Fetch user's boards
async function fetchUserBoards() {
  if (!extensionToken) return;

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/boards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${extensionToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      userBoards = data.boards || [];
      updateBoardDropdown();
    }
  } catch (err) {
    console.error('Failed to fetch boards:', err);
  }
}

// Update board dropdown with user's boards
function updateBoardDropdown() {
  defaultBoardSelect.innerHTML = `
    <option value="">Unsorted</option>
    ${userBoards.map(board => `
      <option value="${board.id}" ${defaultBoardId === board.id ? 'selected' : ''}>${board.name}</option>
    `).join('')}
  `;
  updateSettingsSummary();
}

// Update craft settings UI
function updateCraftSettingsUI() {
  // Show craft-specific settings only when authenticated
  craftSettingsRow.style.display = isAuthenticated ? 'flex' : 'none';
  publicSettingRow.style.display = isAuthenticated ? 'flex' : 'none';

  // Update toggle state
  publicToggle.classList.toggle('active', sharePublicly);

  // Update dropdown selection
  if (defaultBoardSelect.value !== defaultBoardId) {
    defaultBoardSelect.value = defaultBoardId;
  }
}

// Board select change
defaultBoardSelect.addEventListener('change', () => {
  defaultBoardId = defaultBoardSelect.value;
  chrome.storage.local.set({ defaultBoardId });
});

// Public toggle
publicToggle.addEventListener('click', () => {
  sharePublicly = !sharePublicly;
  chrome.storage.local.set({ sharePublicly });
  updateCraftSettingsUI();
});

