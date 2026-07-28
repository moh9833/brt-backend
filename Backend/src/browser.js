// src/browser.js
const { chromium } = require('playwright');

let browserInstance = null;

// ब्राउज़र को शुरू (Initialize) करने का फंक्शन
async function init() {
  if (!browserInstance) {
    console.log('🚀 [Browser] Launching shared Chromium instance...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Render RAM crash fix
        '--single-process'         // Render RAM crash fix
      ]
    });
  }
  return browserInstance;
}

// ब्राउज़र इंस्टेंस प्राप्त करने का फंक्शन
async function getBrowser() {
  return await init();
}

// ब्राउज़र को बंद करने का फंक्शन
async function closeBrowser() {
  if (browserInstance) {
    console.log('🔌 [Browser] Closing Chromium instance...');
    await browserInstance.close();
    browserInstance = null;
  }
}

// यह ऑब्जेक्ट दोनों तरीकों (browserManager.init() और डायरेक्ट फंक्शन) को सपोर्ट करेगा
module.exports = {
  init,
  getBrowser,
  closeBrowser,
  close: closeBrowser
};
