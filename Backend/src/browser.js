const { chromium } = require('playwright');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    console.log('Launching new Chromium browser...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Render RAM fix
        '--single-process'         // Render RAM fix
      ]
    });
  }
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

module.exports = { getBrowser, closeBrowser };