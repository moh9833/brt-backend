// src/searchEngines.js (Google ONLY + Proxy Support)
const { getBrowser } = require('./browser');

async function searchGoogleOnly(query) {
  const browser = await getBrowser();

  // अगर Render में PROXY_URL सेट होगा तो यह उसे यूज़ करेगा
  const proxyConfig = process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined;

  const contextOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US'
  };

  // अगर Proxy मौजूद है, तो Playwright को बताएँगे
  if (proxyConfig) {
    contextOptions.proxy = proxyConfig;
    console.log(`🌐 [Proxy Active] Routing Google Search through Proxy.`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    console.log(`🔍 [Google Only] Searching for: ${query}`);

    // गूगल पर जाएँगे
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // अगर गूगल ने Consent/Cookie फॉर्म दिखाया, तो "Accept All" बटन दबाने की कोशिश करेंगे
    try {
      const acceptBtn = await page.$('button:has-text("Accept all"), button:has-text("I agree"), #L2AGLb');
      if (acceptBtn) {
        console.log('🍪 [Google] Consent button found, clicking Accept...');
        await acceptBtn.click();
        await page.waitForTimeout(1500); // 1.5 सेकंड रुकेंगे
      }
    } catch (_) {}

    // गूगल रिजल्ट्स में से ऑर्गेनिक लिंक्स निकालेंगे
    const links = await page.evaluate(() => {
      const searchContainer = document.querySelector('#search, #rso');
      if (!searchContainer) return [];

      const anchors = Array.from(searchContainer.querySelectorAll('a'));
      const foundUrls = [];

      anchors.forEach(a => {
        const href = a.href;
        if (!href) return;

        try {
          const urlObj = new URL(href);
          if (
            urlObj.protocol === 'https:' &&
            !urlObj.hostname.includes('google.') &&
            !urlObj.hostname.includes('gstatic.com') &&
            !href.includes('/search?') &&
            !href.includes('accounts.google.com')
          ) {
            foundUrls.push(href);
          }
        } catch (_) {}
      });

      return [...new Set(foundUrls)];
    });

    console.log(`✅ [Google Only] Extracted ${links.length} results.`);
    return links;

  } catch (error) {
    console.error(`❌ [Google Only Error]:`, error.message);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

module.exports = { searchGoogleOnly };