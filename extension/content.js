// craftorcrap Extension - Universal Quality Filter
// Vote craft/crap on any image, filter out the noise

// Don't run on craftorcrap website
if (window.location.hostname === 'craftorcrap.cc' || window.location.hostname === 'www.craftorcrap.cc') {
  // Exit early
} else {

const CRAFTORCRAP_URL = 'https://craftorcrap.cc';
const CATEGORIES = ['All', 'Web', 'Apps', 'Branding', 'Graphic Design', 'Motion', 'Illustration', 'Photography', 'Product', '3D', 'AI', 'Other'];

// Settings
let settings = {
  hoverEnabled: true,
  filterMode: 'all', // 'all', 'hide-crap', 'craft-only'
  showBadges: true,
};

// Fingerprint for voting
let fingerprint = null;

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
  // Generate fingerprint
  fingerprint = 'ext-' + navigator.userAgent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '') + '-' +
    (await crypto.subtle.digest('SHA-256', new TextEncoder().encode(navigator.userAgent + screen.width + screen.height))
      .then(h => Array.from(new Uint8Array(h)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')));

  // Load settings
  chrome.storage.local.get(['hoverEnabled', 'filterMode', 'showBadges'], (result) => {
    settings.hoverEnabled = result.hoverEnabled !== false;
    settings.filterMode = result.filterMode || 'all';
    settings.showBadges = result.showBadges !== false;
    applyFilter();
  });

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.hoverEnabled !== undefined) settings.hoverEnabled = changes.hoverEnabled.newValue !== false;
      if (changes.filterMode !== undefined) {
        settings.filterMode = changes.filterMode.newValue || 'all';
        applyFilter();
      }
      if (changes.showBadges !== undefined) {
        settings.showBadges = changes.showBadges.newValue !== false;
        updateAllBadges();
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

// Debounce helper
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

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

  voteOverlay.addEventListener('mouseenter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });

  voteOverlay.addEventListener('mouseleave', () => {
    hideOverlay();
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

  // Reset button states
  craftBtn.classList.remove('voted', 'disabled');
  crapBtn.classList.remove('voted', 'disabled');
  craftBtn.disabled = false;
  crapBtn.disabled = false;

  if (rating) {
    const percent = rating.percent;
    fill.style.width = `${percent}%`;
    fill.className = 'craftorcrap-rating-fill';
    if (percent >= 70) fill.classList.add('high');
    else if (percent <= 30) fill.classList.add('low');

    const total = rating.total_craft + rating.total_crap;
    text.textContent = total > 0 ? `${percent}% craft · ${total} votes` : 'No votes yet';

    // Show user's vote
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
  }, 300);
}

// Handle vote
async function handleVote(verdict) {
  if (!currentUrl || !fingerprint) return;

  const craftBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.craft');
  const crapBtn = voteOverlay.querySelector('.craftorcrap-vote-btn.crap');
  const clickedBtn = verdict === 'craft' ? craftBtn : crapBtn;

  // Disable buttons
  craftBtn.disabled = true;
  crapBtn.disabled = true;
  clickedBtn.classList.add('loading');

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentUrl,
        imageUrl: currentElement?.src || null,
        verdict,
        fingerprint,
      }),
    });

    const data = await response.json();

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
    }
  } catch (err) {
    console.error('Vote failed:', err);
    craftBtn.disabled = false;
    crapBtn.disabled = false;
    clickedBtn.classList.remove('loading');
  }
}

// Scan page for images
function scanPage() {
  const images = document.querySelectorAll('img');
  const urls = [];

  images.forEach(img => {
    if (processedElements.has(img)) return;
    if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

    processedElements.add(img);

    // Get the page URL this image links to
    const link = img.closest('a');
    const url = link?.href || window.location.href;

    urls.push(url);

    // Add hover listeners
    img.addEventListener('mouseenter', () => showOverlay(img, url, img.src));
    img.addEventListener('mouseleave', (e) => {
      if (!voteOverlay?.contains(e.relatedTarget)) {
        hideOverlay();
      }
    });

    // Add badge container
    if (!img.parentElement.querySelector('.craftorcrap-badge')) {
      const badge = document.createElement('div');
      badge.className = 'craftorcrap-badge';
      badge.style.display = 'none';

      // Position relative to image
      const wrapper = img.parentElement;
      if (getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
      }
      wrapper.appendChild(badge);
      img._craftorcrapBadge = badge;
      img._craftorcrapUrl = url;
    }
  });

  // Fetch ratings for new URLs
  if (urls.length > 0) {
    fetchRatings(urls);
  }
}

// Fetch ratings from API
async function fetchRatings(urls) {
  // Filter out already cached URLs
  const newUrls = urls.filter(url => !ratingsCache.has(url));
  if (newUrls.length === 0) return;

  try {
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: newUrls, fingerprint }),
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
  document.querySelectorAll('img').forEach(img => {
    if (img._craftorcrapUrl) {
      updateBadge(img, img._craftorcrapUrl);
    }
  });
}

// Apply filter to single element
function applyFilterToElement(element, url) {
  if (settings.filterMode === 'all') {
    element.style.filter = '';
    element.style.opacity = '';
    return;
  }

  const rating = ratingsCache.get(url);
  if (!rating) return;

  const percent = rating.percent;

  if (settings.filterMode === 'hide-crap' && percent < 30) {
    element.style.filter = 'grayscale(1) blur(3px)';
    element.style.opacity = '0.3';
  } else if (settings.filterMode === 'craft-only' && percent < 70) {
    element.style.filter = 'grayscale(1) blur(2px)';
    element.style.opacity = '0.4';
  } else {
    element.style.filter = '';
    element.style.opacity = '';
  }
}

// Apply filter to all elements
function applyFilter() {
  document.querySelectorAll('img').forEach(img => {
    if (img._craftorcrapUrl) {
      applyFilterToElement(img, img._craftorcrapUrl);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

} // End of else block
