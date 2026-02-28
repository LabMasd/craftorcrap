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
let recentCrafts = [];
let userBoards = [];

// Auth elements
const authSection = document.getElementById('authSection');
const authLoggedOut = document.getElementById('authLoggedOut');
const authLoggedIn = document.getElementById('authLoggedIn');
const authAvatar = document.getElementById('authAvatar');
const authName = document.getElementById('authName');

// Crafts section elements
const craftsSection = document.getElementById('craftsSection');
const craftsList = document.getElementById('craftsList');
const craftsClear = document.getElementById('craftsClear');

// Load auth state and recent crafts
chrome.storage.local.get(['isAuthenticated', 'currentUser', 'extensionToken', 'recentCrafts'], (result) => {
  isAuthenticated = result.isAuthenticated || false;
  currentUser = result.currentUser || null;
  extensionToken = result.extensionToken || null;
  recentCrafts = result.recentCrafts || [];
  updateAuthUI();
  renderRecentCrafts();
  if (extensionToken) {
    fetchUserBoards();
  }
});

// Listen for auth and crafts changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isAuthenticated) {
      isAuthenticated = changes.isAuthenticated.newValue || false;
      updateAuthUI();
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
    }
    if (changes.recentCrafts) {
      recentCrafts = changes.recentCrafts.newValue || [];
      renderRecentCrafts();
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
      renderRecentCrafts(); // Re-render to update board dropdowns
    }
  } catch (err) {
    console.error('Failed to fetch boards:', err);
  }
}

// Render recent crafts
function renderRecentCrafts() {
  if (recentCrafts.length === 0) {
    craftsSection.style.display = 'none';
    return;
  }

  craftsSection.style.display = 'block';

  craftsList.innerHTML = recentCrafts.map((craft, index) => `
    <div class="craft-item" data-index="${index}">
      ${craft.imageUrl
        ? `<img class="craft-item-thumb" src="${craft.imageUrl}" alt="" onerror="this.style.display='none'">`
        : '<div class="craft-item-thumb"></div>'
      }
      <div class="craft-item-info">
        <div class="craft-item-url">${getDomain(craft.url)}</div>
        <div class="craft-item-actions">
          <div class="craft-action-row">
            <select class="craft-board-select" data-craft-index="${index}" ${craft.savedToBoard ? 'disabled' : ''}>
              <option value="">Select board...</option>
              ${userBoards.map(board => `
                <option value="${board.id}" ${craft.boardId === board.id ? 'selected' : ''}>${board.name}</option>
              `).join('')}
            </select>
            <button class="craft-action-btn board-btn ${craft.savedToBoard ? 'done' : ''}" data-craft-index="${index}" data-action="board" ${craft.savedToBoard ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              ${craft.savedToBoard ? 'Saved' : 'Save'}
            </button>
          </div>
          <div class="craft-action-row">
            <button class="craft-action-btn public-btn ${craft.submittedPublic ? 'done' : ''}" data-craft-index="${index}" data-action="public" ${craft.submittedPublic ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              ${craft.submittedPublic ? 'On craftorcrap' : 'Add to craftorcrap'}
            </button>
          </div>
        </div>
      </div>
      <button class="craft-item-remove" data-craft-index="${index}" title="Remove">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Add event listeners for board save
  craftsList.querySelectorAll('.craft-action-btn[data-action="board"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.craftIndex);
      const select = craftsList.querySelector(`select[data-craft-index="${index}"]`);
      const boardId = select?.value || null;
      if (!boardId) {
        select.focus();
        return;
      }
      saveCraftToBoard(index, boardId);
    });
  });

  // Add event listeners for public submit
  craftsList.querySelectorAll('.craft-action-btn[data-action="public"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.craftIndex);
      submitCraftPublic(index);
    });
  });

  craftsList.querySelectorAll('.craft-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.craftIndex);
      removeCraft(index);
    });
  });
}

// Save craft to board
async function saveCraftToBoard(index, boardId) {
  const craft = recentCrafts[index];
  if (!craft || !extensionToken || !boardId) return;

  const btn = craftsList.querySelector(`.craft-action-btn[data-action="board"][data-craft-index="${index}"]`);
  const select = craftsList.querySelector(`select[data-craft-index="${index}"]`);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Saving...';
  }

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        url: craft.url,
        board_id: boardId,
      }),
    });

    if (response.ok) {
      recentCrafts[index].savedToBoard = true;
      recentCrafts[index].boardId = boardId;
      chrome.storage.local.set({ recentCrafts });
      renderRecentCrafts();
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save';
      }
    }
  } catch (err) {
    console.error('Save failed:', err);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Save';
    }
  }
}

// Submit craft to public craftorcrap page
async function submitCraftPublic(index) {
  const craft = recentCrafts[index];
  if (!craft || !extensionToken) return;

  const btn = craftsList.querySelector(`.craft-action-btn[data-action="public"][data-craft-index="${index}"]`);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Submitting...';
  }

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        url: craft.url,
        imageUrl: craft.imageUrl,
        category: 'Web',
      }),
    });

    if (response.ok || response.status === 409) {
      // 409 means already submitted, which is fine
      recentCrafts[index].submittedPublic = true;
      chrome.storage.local.set({ recentCrafts });
      renderRecentCrafts();
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Add to craftorcrap';
      }
    }
  } catch (err) {
    console.error('Submit failed:', err);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Add to craftorcrap';
    }
  }
}

// Remove craft from list
function removeCraft(index) {
  recentCrafts.splice(index, 1);
  chrome.storage.local.set({ recentCrafts });
  renderRecentCrafts();
}

// Clear all crafts
craftsClear.addEventListener('click', () => {
  recentCrafts = [];
  chrome.storage.local.set({ recentCrafts });
  renderRecentCrafts();
});

