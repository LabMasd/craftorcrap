const CRAFTORCRAP_URL = 'https://craftorcrap.cc';

let selectedImage = null;
let selectedCategory = 'Web';

// Elements
const pickBtn = document.getElementById('pickBtn');
const preview = document.getElementById('preview');
const previewImage = document.getElementById('previewImage');
const previewUrl = document.getElementById('previewUrl');
const emptyState = document.getElementById('emptyState');
const submitBtn = document.getElementById('submitBtn');
const status = document.getElementById('status');
const categories = document.getElementById('categories');

// Category selection
categories.addEventListener('click', (e) => {
  if (e.target.classList.contains('category-btn')) {
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    selectedCategory = e.target.dataset.category;
  }
});

// Pick image button
pickBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send message to content script to activate picker
  chrome.tabs.sendMessage(tab.id, { action: 'activatePicker' });

  // Close popup while picking
  window.close();
});

// Listen for selected image from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'imageSelected') {
    selectedImage = message.data;
    showPreview(message.data);
  }
});

// Check if there's a stored selection
chrome.storage.local.get(['selectedImage'], (result) => {
  if (result.selectedImage) {
    selectedImage = result.selectedImage;
    showPreview(result.selectedImage);
  }
});

function showPreview(data) {
  previewImage.src = data.src;
  previewUrl.textContent = data.pageUrl;
  preview.classList.add('visible');
  emptyState.style.display = 'none';
  submitBtn.disabled = false;
}

// Submit to craftorcrap
submitBtn.addEventListener('click', async () => {
  if (!selectedImage) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  status.className = 'status';
  status.style.display = 'none';

  try {
    // Submit to the API
    const response = await fetch(`${CRAFTORCRAP_URL}/api/extension/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: selectedImage.pageUrl,
        imageUrl: selectedImage.src,
        category: selectedCategory,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      status.className = 'status success';
      status.textContent = 'Submitted successfully!';
      status.style.display = 'block';

      // Clear selection
      chrome.storage.local.remove(['selectedImage']);
      selectedImage = null;

      // Reset UI after delay
      setTimeout(() => {
        preview.classList.remove('visible');
        emptyState.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submit to craftorcrap';
        status.style.display = 'none';
      }, 2000);
    } else {
      throw new Error(result.error || 'Failed to submit');
    }
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message;
    status.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit to craftorcrap';
  }
});
