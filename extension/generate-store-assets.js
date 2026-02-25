const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Store assets directory
const assetsDir = path.join(__dirname, 'store-assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Promotional tile - 440x280
function createPromoTile() {
  const canvas = createCanvas(440, 280);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 440, 280);

  // Logo text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('craft', 160, 130);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or', 232, 130);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('crap', 310, 130);

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Save creative inspiration from any page', 220, 175);

  return canvas;
}

// Small promo tile - 220x140 (half size)
function createSmallPromoTile() {
  const canvas = createCanvas(220, 140);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 220, 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('craft', 80, 60);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or', 116, 60);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('crap', 155, 60);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Save creative inspiration', 110, 90);

  return canvas;
}

// Marquee promo - 1400x560
function createMarqueePromo() {
  const canvas = createCanvas(1400, 560);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 1400, 560);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('craft', 580, 250);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or', 700, 250);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('crap', 820, 250);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Save creative inspiration from any webpage', 700, 330);

  return canvas;
}

// Screenshot placeholder - 1280x800
function createScreenshot() {
  const canvas = createCanvas(1280, 800);
  const ctx = canvas.getContext('2d');

  // Browser chrome
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 1280, 60);

  // Window buttons
  ctx.fillStyle = '#ff5f57';
  ctx.beginPath();
  ctx.arc(20, 30, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffbd2e';
  ctx.beginPath();
  ctx.arc(40, 30, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#28ca41';
  ctx.beginPath();
  ctx.arc(60, 30, 6, 0, Math.PI * 2);
  ctx.fill();

  // URL bar
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(200, 15, 880, 30, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('dribbble.com/shots/popular', 220, 35);

  // Page content area
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 60, 1280, 740);

  // Extension popup
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(950, 70, 320, 400, 12);
  ctx.fill();

  // Popup header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.fillText('craft', 970, 100);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('or', 1010, 100);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('crap', 1030, 100);

  // Pick button
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(1170, 85, 85, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = '12px -apple-system, sans-serif';
  ctx.fillText('Pick Image', 1183, 105);

  // Preview area
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(966, 130, 288, 120, 8);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click "Pick Image" to select', 1110, 190);

  // Categories
  const categories = ['Web', 'Motion', 'Branding', '3D', 'AI'];
  ctx.textAlign = 'left';
  let x = 966;
  categories.forEach((cat, i) => {
    ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(x, 270, cat.length * 8 + 20, 28, 14);
    ctx.fill();
    ctx.fillStyle = i === 0 ? '#000' : 'rgba(255,255,255,0.5)';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText(cat, x + 10, 288);
    x += cat.length * 8 + 28;
  });

  // Submit button
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(966, 420, 288, 44, 12);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Submit to craftorcrap', 1110, 447);

  // Sample grid on page
  ctx.textAlign = 'left';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = `hsl(${(row * 4 + col) * 40}, 60%, 70%)`;
      ctx.beginPath();
      ctx.roundRect(30 + col * 220, 100 + row * 300, 200, 260, 12);
      ctx.fill();
    }
  }

  return canvas;
}

// Generate all assets
const assets = [
  { name: 'promo-tile-440x280.png', canvas: createPromoTile() },
  { name: 'promo-tile-small-220x140.png', canvas: createSmallPromoTile() },
  { name: 'promo-marquee-1400x560.png', canvas: createMarqueePromo() },
  { name: 'screenshot-1280x800.png', canvas: createScreenshot() },
];

assets.forEach(({ name, canvas }) => {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, name), buffer);
  console.log(`Generated: ${name}`);
});

console.log('\nAll store assets generated in extension/store-assets/');
