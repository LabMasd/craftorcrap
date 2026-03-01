// craftorcrap Extension - Universal Quality Filter
// Vote craft/crap on any image, filter out the noise

const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

// Listen for connect message from craftorcrap.cc
window.addEventListener('message', (event) => {
  if (event.data?.type === 'CRAFTORCRAP_CONNECT' && event.data?.token) {
    chrome.storage.local.set({
      extensionToken: event.data.token,
      isAuthenticated: true,
      currentUser: event.data.user || null,
    });
    // Show confirmation
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:white;padding:12px 24px;border-radius:12px;font-family:system-ui;font-size:14px;font-weight:500;z-index:999999;';
    toast.textContent = '✓ Extension connected!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
});

// Don't run voting UI on craftorcrap website
if (window.location.hostname === 'craftorcrap.cc' || window.location.hostname === 'www.craftorcrap.cc') {
  // Exit early - but keep the message listener above
} else {

// Settings
let settings = {
  hoverEnabled: true,
  filterMode: 'all', // 'all', 'hide-crap', 'craft-only'
  showBadges: true,
  crapStyle: 'blur', // 'blur' or 'cover'
  defaultBoardId: '', // board to save crafts to
  sharePublicly: false, // submit crafts to public page
  siteSettings: {}, // domain -> filterMode
};

// Get current domain
const currentDomain = window.location.hostname.replace('www.', '');

// Get effective filter mode (site-specific or default)
function getEffectiveFilterMode() {
  const siteMode = settings.siteSettings[currentDomain];
  return siteMode || settings.filterMode;
}

// Auth state
let isAuthenticated = false;
let currentUser = null;
let extensionToken = null;

// Cache for ratings
const ratingsCache = new Map();

// Track processed elements
const processedElements = new WeakSet();

// UI elements
let voteOverlay = null;
let currentElement = null;
let currentUrl = null;
let hideTimeout = null;

// Initialize
async function init() {
  // Load settings and auth
  chrome.storage.local.get(['hoverEnabled', 'filterMode', 'showBadges', 'crapStyle', 'extensionToken', 'isAuthenticated', 'currentUser', 'defaultBoardId', 'sharePublicly', 'siteSettings'], (result) => {
    settings.siteSettings = result.siteSettings || {};
    settings.hoverEnabled = result.hoverEnabled !== false;
    settings.filterMode = result.filterMode || 'all';
    settings.showBadges = result.showBadges !== false;
    settings.crapStyle = result.crapStyle || 'blur';
    settings.defaultBoardId = result.defaultBoardId || '';
    settings.sharePublicly = result.sharePublicly || false;
    extensionToken = result.extensionToken || null;
    isAuthenticated = result.isAuthenticated || false;
    currentUser = result.currentUser || null;
    applyFilter();
  });

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.hoverEnabled) {
        settings.hoverEnabled = changes.hoverEnabled.newValue !== false;
      }
      if (changes.filterMode) {
        settings.filterMode = changes.filterMode.newValue || 'all';
        applyFilter();
      }
      if (changes.showBadges) {
        settings.showBadges = changes.showBadges.newValue !== false;
        updateAllBadges();
      }
      if (changes.crapStyle) {
        settings.crapStyle = changes.crapStyle.newValue || 'blur';
        applyFilter();
      }
      if (changes.extensionToken) {
        extensionToken = changes.extensionToken.newValue || null;
        isAuthenticated = !!extensionToken;
      }
      if (changes.isAuthenticated) {
        isAuthenticated = changes.isAuthenticated.newValue || false;
      }
      if (changes.currentUser) {
        currentUser = changes.currentUser.newValue || null;
      }
      if (changes.defaultBoardId) {
        settings.defaultBoardId = changes.defaultBoardId.newValue || '';
      }
      if (changes.sharePublicly) {
        settings.sharePublicly = changes.sharePublicly.newValue || false;
      }
      if (changes.siteSettings) {
        settings.siteSettings = changes.siteSettings.newValue || {};
        applyFilter();
      }
    }
  });

  // Create vote overlay
  createVoteOverlay();

  // Scan page for images
  scanPage();

  // Watch for new content
  const observer = new MutationObserver(debounce(scanPage, 500));
  observer.observe(document.body, { childList: true, subtree: true });
}

// Check authentication status
async function checkAuth() {
  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/auth`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json();
    isAuthenticated = data.authenticated;
    currentUser = data.user;

    // Store auth state for sidepanel
    chrome.storage.local.set({
      isAuthenticated,
      currentUser,
    });
  } catch (err) {
    console.error('Auth check failed:', err);
    isAuthenticated = false;
    currentUser = null;
  }
}

// Debounce helper
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Categories list
const CATEGORIES = ['Web', 'Apps', 'Branding', 'Graphic', 'Motion', 'Illustration', 'Photo', 'Product', '3D', 'AI'];

// Create the vote overlay
function createVoteOverlay() {
  if (voteOverlay) return;

  voteOverlay = document.createElement('div');
  voteOverlay.id = 'craftorcrap-overlay';
  voteOverlay.innerHTML = `
    <div class="craftorcrap-vote-buttons">
      <button class="craftorcrap-vote-btn craft" data-vote="craft" title="Craft - Worth it">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </button>
      <button class="craftorcrap-vote-btn crap" data-vote="crap" title="Crap - Skip it">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    <div class="craftorcrap-category-row">
      <select class="craftorcrap-category-select">
        <option value="">Category</option>
        ${CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
    </div>
    <div class="craftorcrap-login-prompt" style="display: none;">
      <a href="${CRAFTORCRAP_URL}/extension/connect" target="_blank">Connect account to vote</a>
    </div>
    <div class="craftorcrap-undo-row" style="display: none;">
      <button class="craftorcrap-undo-btn">Undo vote</button>
    </div>
    <div class="craftorcrap-followed-row" style="display: none;">
      <span class="craftorcrap-followed-text"></span>
    </div>
    <div class="craftorcrap-rating-bar">
      <div class="craftorcrap-rating-fill"></div>
    </div>
    <div class="craftorcrap-rating-text"></div>
  `;

  document.body.appendChild(voteOverlay);

  // Event listeners
  voteOverlay.querySelectorAll('.craftorcrap-vote-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleVote(btn.dataset.vote);
    });
  });

  // Undo button
  voteOverlay.querySelector('.craftorcrap-undo-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleUndo();
  });

  voteOverlay.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });

  voteOverlay.addEventListener('mouseleave', () => {
    hideOverlay();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only work when hovering over something (overlay visible)
    if (!currentUrl || !currentElement) return;

    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handleVote('craft');
    } else if (e.key.toLowerCase() === 'x') {
      e.preventDefault();
      handleVote('crap');
    }
  });
}

// Show overlay on element
function showOverlay(element, url, imageUrl) {
  if (!settings.hoverEnabled || !voteOverlay) return;

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  currentElement = element;
  currentUrl = url;

  // Position overlay
  const rect = element.getBoundingClientRect();
  voteOverlay.style.position = 'fixed';
  voteOverlay.style.left = `${rect.left + 12}px`;
  voteOverlay.style.top = `${rect.bottom - 60}px`;

  // Show/hide vote buttons based on auth
  const voteButtons = voteOverlay.querySelector('.craftorcrap-vote-buttons');
  const loginPrompt = voteOverlay.querySelector('.craftorcrap-login-prompt');

  if (isAuthenticated) {
    voteButtons.style.display = 'flex';
    loginPrompt.style.display = 'none';
  } else {
    voteButtons.style.display = 'none';
    loginPrompt.style.display = 'block';
  }

  // Update rating display
  const rating = ratingsCache.get(url);
  updateOverlayRating(rating);

  voteOverlay.classList.add('show');
}

// Update overlay with rating data
function updateOverlayRating(rating) {
  const fill = voteOverlay.querySelector('.craftorcrap-rating-fill');
  const text = voteOverlay.querySelector('.craftorcrap-rating-text');
  const craftBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.craft');
  const crapBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.crap');
  const undoRow = voteOverlay.querySelector('.craftorcrap-undo-row');
  const followedRow = voteOverlay.querySelector('.craftorcrap-followed-row');

  // Reset button states
  craftBtn.classList.remove('voted', 'disabled');
  crapBtn.classList.remove('voted', 'disabled');
  craftBtn.disabled = false;
  crapBtn.disabled = false;
  undoRow.style.display = 'none';
  if (followedRow) followedRow.style.display = 'none';

  if (rating) {
    const percent = rating.percent;
    fill.style.width = `${percent}%`;
    fill.className = 'craftorcrap-rating-fill';
    if (percent >= 70) fill.classList.add('high');
    else if (percent <= 30) fill.classList.add('low');

    const total = rating.total_craft + rating.total_crap;
    const weightedPercent = rating.weighted_percent || percent;
    const showWeighted = weightedPercent !== percent;

    if (total > 0) {
      if (showWeighted) {
        text.textContent = `${weightedPercent}% craft (weighted) · ${total} votes`;
      } else {
        text.textContent = `${percent}% craft · ${total} votes`;
      }
    } else {
      text.textContent = 'No votes yet';
    }

    // Show followed users' votes
    if (followedRow && rating.followed_votes) {
      const fv = rating.followed_votes;
      const totalFollowed = fv.craft + fv.crap;
      if (totalFollowed > 0) {
        const followedText = followedRow.querySelector('.craftorcrap-followed-text');
        if (fv.craft > 0 && fv.crap > 0) {
          followedText.textContent = `Friends: ${fv.craft} craft, ${fv.crap} crap`;
        } else if (fv.craft > 0) {
          followedText.textContent = `${fv.craft} friend${fv.craft > 1 ? 's' : ''} voted craft`;
        } else {
          followedText.textContent = `${fv.crap} friend${fv.crap > 1 ? 's' : ''} voted crap`;
        }
        followedRow.style.display = 'block';
      }
    }

    // Show user's vote and undo option
    if (rating.user_vote) {
      if (rating.user_vote === 'craft') {
        craftBtn.classList.add('voted');
        crapBtn.classList.add('disabled');
      } else {
        crapBtn.classList.add('voted');
        craftBtn.classList.add('disabled');
      }
      craftBtn.disabled = true;
      crapBtn.disabled = true;
      undoRow.style.display = 'block';
    }
  } else {
    fill.style.width = '50%';
    fill.className = 'craftorcrap-rating-fill';
    text.textContent = 'Be the first to vote';
  }
}

// Hide overlay
function hideOverlay() {
  if (hideTimeout) clearTimeout(hideTimeout);

  hideTimeout = setTimeout(() => {
    if (voteOverlay) {
      voteOverlay.classList.remove('show');
    }
    currentElement = null;
    currentUrl = null;
  }, 800);
}

// Save craft to board
async function saveCraftToBoard(url, boardId) {
  if (!extensionToken) return;

  try {
    await fetch(`${CRAFTORCRAP_URL}/api/extension/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        url,
        board_id: boardId,
      }),
    });
  } catch (err) {
    console.error('Save to board failed:', err);
  }
}

// Submit craft to public page
async function submitCraftPublic(url, imageUrl) {
  if (!extensionToken) return;

  try {
    await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        url,
        imageUrl,
        category: 'Web',
      }),
    });
  } catch (err) {
    console.error('Submit public failed:', err);
  }
}

// Handle vote
async function handleVote(verdict) {
  if (!currentUrl) return;

  // Check auth first
  if (!isAuthenticated || !extensionToken) {
    window.open(`${CRAFTORCRAP_URL}/extension/connect`, '_blank');
    return;
  }

  const craftBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.craft');
  const crapBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.crap');
  const categorySelect = voteOverlay.querySelector('.craftorcrap-category-select');
  const clickedBtn = verdict === 'craft' ? craftBtn : crapBtn;

  // Disable buttons
  craftBtn.disabled = true;
  crapBtn.disabled = true;
  clickedBtn.classList.add('loading');

  // Get selected category
  const category = categorySelect?.value || null;

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({
        url: currentUrl,
        imageUrl: currentElement?.src || null,
        verdict,
        category,
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      // Not authenticated - clear token and show login
      isAuthenticated = false;
      currentUser = null;
      extensionToken = null;
      chrome.storage.local.set({ isAuthenticated: false, currentUser: null, extensionToken: null });

      const voteButtons = voteOverlay.querySelector('.craftorcrap-vote-buttons');
      const loginPrompt = voteOverlay.querySelector('.craftorcrap-login-prompt');
      voteButtons.style.display = 'none';
      loginPrompt.style.display = 'block';
      return;
    }

    if (response.ok) {
      // Update cache
      ratingsCache.set(currentUrl, {
        total_craft: data.total_craft,
        total_crap: data.total_crap,
        percent: Math.round((data.total_craft / (data.total_craft + data.total_crap)) * 100),
        user_vote: data.user_vote,
      });

      // Update UI
      clickedBtn.classList.remove('loading');
      clickedBtn.classList.add('voted');
      (verdict === 'craft' ? crapBtn : craftBtn).classList.add('disabled');

      updateOverlayRating(ratingsCache.get(currentUrl));
      updateBadge(currentElement, currentUrl);
      applyFilterToElement(currentElement, currentUrl);

      // Handle craft vote actions based on settings
      if (verdict === 'craft') {
        // Save to board (or unsorted)
        saveCraftToBoard(currentUrl, settings.defaultBoardId || null);

        // Submit to public page if enabled
        if (settings.sharePublicly) {
          submitCraftPublic(currentUrl, currentElement?.src || null);
        }
      }
    }
  } catch (err) {
    console.error('Vote failed:', err);
    craftBtn.disabled = false;
    crapBtn.disabled = false;
    clickedBtn.classList.remove('loading');
  }
}

// Show why hidden popup
function showWhyHidden(targetEl, reason, contentEl, url) {
  // Remove existing popup if any
  const existing = document.getElementById('craftorcrap-why-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'craftorcrap-why-popup';
  popup.innerHTML = `
    <div class="craftorcrap-why-content">
      <p class="craftorcrap-why-text">${reason}</p>
      <div class="craftorcrap-why-actions">
        <button class="craftorcrap-why-btn reveal">Show anyway</button>
        <button class="craftorcrap-why-btn close">Dismiss</button>
      </div>
    </div>
  `;

  // Position near target
  const rect = targetEl.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.left = `${Math.max(10, rect.left)}px`;
  popup.style.top = `${Math.max(10, rect.top + rect.height / 2 - 50)}px`;
  popup.style.zIndex = '2147483647';

  document.body.appendChild(popup);

  // Reveal button - temporarily show content
  popup.querySelector('.craftorcrap-why-btn.reveal').addEventListener('click', () => {
    // Remove filter temporarily
    if (contentEl._craftorcrapCover) {
      contentEl._craftorcrapCover.style.display = 'none';
    }
    contentEl.style.filter = '';
    contentEl.style.opacity = '';
    contentEl.style.cursor = '';
    contentEl.title = '';
    popup.remove();

    // Re-apply filter after 10 seconds
    setTimeout(() => {
      applyFilterToElement(contentEl, url);
    }, 10000);
  });

  // Close button
  popup.querySelector('.craftorcrap-why-btn.close').addEventListener('click', () => {
    popup.remove();
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
}

// Handle undo vote
async function handleUndo() {
  if (!currentUrl || !extensionToken) return;

  const undoBtn = voteOverlay.querySelector('.craftorcrap-undo-btn');
  undoBtn.disabled = true;
  undoBtn.textContent = 'Undoing...';

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/vote`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extensionToken}`,
      },
      body: JSON.stringify({ url: currentUrl }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update cache
      const newTotal = data.total_craft + data.total_crap;
      const percent = newTotal > 0 ? Math.round((data.total_craft / newTotal) * 100) : 50;

      ratingsCache.set(currentUrl, {
        total_craft: data.total_craft,
        total_crap: data.total_crap,
        percent,
        user_vote: null,
      });

      // Update UI
      updateOverlayRating(ratingsCache.get(currentUrl));
      updateBadge(currentElement, currentUrl);
      applyFilter();
    }
  } catch (err) {
    console.error('Undo failed:', err);
  }

  undoBtn.disabled = false;
  undoBtn.textContent = 'Undo vote';
}

// Scan page for images and videos
function scanPage() {
  const urls = [];

  // Process images
  document.querySelectorAll('img').forEach(img => {
    if (processedElements.has(img)) return;
    if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

    processedElements.add(img);
    const url = getElementUrl(img);
    urls.push(url);
    setupElement(img, url, img.src);
  });

  // Process videos
  document.querySelectorAll('video').forEach(video => {
    if (processedElements.has(video)) return;
    if (video.offsetWidth < 100 || video.offsetHeight < 100) return;

    processedElements.add(video);
    const url = getElementUrl(video);
    urls.push(url);
    setupElement(video, url, video.poster || null);
  });

  // Process video containers (for custom players, LinkedIn, etc.)
  document.querySelectorAll('[data-video-id], [class*="video"], [class*="Video"], .feed-shared-update-v2, .feed-shared-article').forEach(container => {
    if (processedElements.has(container)) return;
    if (container.offsetWidth < 100 || container.offsetHeight < 100) return;
    // Skip if it's an img or video element itself
    if (container.tagName === 'IMG' || container.tagName === 'VIDEO') return;

    processedElements.add(container);
    const url = getElementUrl(container);
    urls.push(url);
    setupElement(container, url, null);
  });

  // Fetch ratings for new URLs
  if (urls.length > 0) {
    fetchRatings(urls);
  }

  // Apply filter immediately for craft-only mode (covers unrated elements)
  if (settings.filterMode === 'craft-only') {
    applyFilter();
  }
}

// Get URL for an element (from parent link or current page)
function getElementUrl(element) {
  const link = element.closest('a');
  return link?.href || window.location.href;
}

// Setup an element for voting/filtering
function setupElement(element, url, thumbnail) {
  // Add hover listeners
  element.addEventListener('mouseenter', () => showOverlay(element, url, thumbnail));
  element.addEventListener('mouseleave', (e) => {
    if (!voteOverlay?.contains(e.relatedTarget)) {
      hideOverlay();
    }
  });

  // Set URL for filtering
  element._craftorcrapUrl = url;

  // Add badge container
  const wrapper = element.parentElement;
  if (wrapper && !wrapper.querySelector('.craftorcrap-badge')) {
    const badge = document.createElement('div');
    badge.className = 'craftorcrap-badge';
    badge.style.display = 'none';

    if (getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }
    wrapper.appendChild(badge);
    element._craftorcrapBadge = badge;
  }
}

// Fetch ratings from API
async function fetchRatings(urls) {
  // Filter out already cached URLs
  const newUrls = urls.filter(url => !ratingsCache.has(url));
  if (newUrls.length === 0) return;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (extensionToken) {
      headers['Authorization'] = `Bearer ${extensionToken}`;
    }

    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/ratings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ urls: newUrls }),
    });

    const data = await response.json();

    if (data.ratings) {
      Object.entries(data.ratings).forEach(([url, rating]) => {
        ratingsCache.set(url, rating);
      });

      // Update badges and filters
      updateAllBadges();
      applyFilter();
    }
  } catch (err) {
    console.error('Failed to fetch ratings:', err);
  }
}

// Update badge for an element
function updateBadge(element, url) {
  const badge = element._craftorcrapBadge;
  if (!badge || !settings.showBadges) {
    if (badge) badge.style.display = 'none';
    return;
  }

  const rating = ratingsCache.get(url);
  if (!rating || (rating.total_craft + rating.total_crap) === 0) {
    badge.style.display = 'none';
    return;
  }

  const percent = rating.percent;
  badge.textContent = `${percent}%`;
  badge.className = 'craftorcrap-badge';
  if (percent >= 70) badge.classList.add('high');
  else if (percent <= 30) badge.classList.add('low');
  badge.style.display = 'flex';
}

// Update all badges
function updateAllBadges() {
  document.querySelectorAll('img, video, [data-video-id], [class*="video"], [class*="Video"]').forEach(el => {
    if (el._craftorcrapUrl) {
      updateBadge(el, el._craftorcrapUrl);
    }
  });
}

// Apply filter to single element (returns true if filtered)
function applyFilterToElement(element, url) {
  // Remove existing cover if any
  const existingCover = element._craftorcrapCover;
  if (existingCover) {
    existingCover.remove();
    element._craftorcrapCover = null;
  }

  // Reset element styles
  element.style.filter = '';
  element.style.opacity = '';

  const effectiveMode = getEffectiveFilterMode();

  if (effectiveMode === 'all') {
    return false;
  }

  const rating = ratingsCache.get(url);

  let shouldFilter = false;
  let filterText = '';

  if (effectiveMode === 'craft-only') {
    // Craft Only: show only images YOU voted craft on, hide everything else
    if (!rating || rating.user_vote !== 'craft') {
      shouldFilter = true;
      filterText = rating ? `${rating.percent}% craft` : 'Not voted';
    }
  } else if (effectiveMode === 'hide-crap') {
    // Hide Crap: hide images with low ratings (use weighted percent if available)
    const displayPercent = rating?.weighted_percent || rating?.percent;
    if (rating && displayPercent < 30) {
      shouldFilter = true;
      filterText = `${displayPercent}% craft`;
    }
  }

  if (!shouldFilter) return false;

  // Determine reason text
  let reasonText = '';
  if (effectiveMode === 'craft-only') {
    if (!rating) {
      reasonText = 'Hidden: No rating yet. Only showing content you voted Craft on.';
    } else if (rating.user_vote !== 'craft') {
      reasonText = `Hidden: You haven't voted Craft on this. (${rating.percent}% craft · ${rating.total_craft + rating.total_crap} votes)`;
    }
  } else if (effectiveMode === 'hide-crap') {
    reasonText = `Hidden: Low rating (${rating.percent}% craft · ${rating.total_craft + rating.total_crap} votes)`;
  }

  if (settings.crapStyle === 'cover') {
    // Create black cover
    const cover = document.createElement('div');
    cover.className = 'craftorcrap-cover';
    cover.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <span>${filterText}</span>
    `;
    cover.style.cursor = 'pointer';
    cover.title = 'Click to see why this is hidden';

    // Click to show reason
    cover.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showWhyHidden(cover, reasonText, element, url);
    });

    // Position cover
    const wrapper = element.parentElement;
    if (getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }
    wrapper.appendChild(cover);
    element._craftorcrapCover = cover;
  } else {
    // Blur style - wrap in clickable overlay
    element.style.filter = 'grayscale(1) blur(4px)';
    element.style.opacity = '0.3';
    element.style.cursor = 'pointer';
    element.title = 'Click to see why this is hidden';

    // Add click handler for blurred elements
    if (!element._craftorcrapBlurHandler) {
      element._craftorcrapBlurHandler = (e) => {
        if (element.style.filter) {
          e.stopPropagation();
          e.preventDefault();
          showWhyHidden(element, reasonText, element, url);
        }
      };
      element.addEventListener('click', element._craftorcrapBlurHandler);
    }
  }

  return true;
}

// Apply filter to all elements
function applyFilter() {
  let filteredCount = 0;

  document.querySelectorAll('img, video, [data-video-id], [class*="video"], [class*="Video"]').forEach(el => {
    if (el._craftorcrapUrl) {
      const wasFiltered = applyFilterToElement(el, el._craftorcrapUrl);
      if (wasFiltered) filteredCount++;
    }
  });

  // Update extension icon badge with filtered count
  updateExtensionBadge(filteredCount);
}

// Update extension badge with filtered count
function updateExtensionBadge(count) {
  chrome.runtime.sendMessage({ action: 'updateBadge', count });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

} // End of else block
