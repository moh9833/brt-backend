// src/searchEngines.js
const { getBrowser } = require('./browser');

// Proxy URL में से Username और Password अलग-अलग करने का हेल्पर
function getProxyConfig() {
  const rawUrl = process.env.PROXY_URL;
  if (!rawUrl) return undefined;

  try {
    const u = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    const config = {
      server: `${u.protocol}//${u.hostname}:${u.port || 80}`
    };
    if (u.username) config.username = decodeURIComponent(u.username);
    if (u.password) config.password = decodeURIComponent(u.password);
    return config;
  } catch (_) {
    return { server: rawUrl };
  }
}

async function searchGoogleOnly(query) {
  const browser = await getBrowser();
  const proxyConfig = getProxyConfig();

  const contextOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US'
  };

  // अगर प्रोक्सी है, तो उसे प्लेराइट के फॉर्मेट में सेट करेंगे
  if (proxyConfig) {
    contextOptions.proxy = proxyConfig;
    console.log(`🌐 [Proxy Connected]: ${proxyConfig.server}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    console.log(`🔍 [Google Search] Searching for: ${query}`);

    // टाइमआउट 10 सेकंड रखा है ताकि जल्दी रिस्पॉन्स मिले
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const links = await page.evaluate(() => {
      const searchContainer = document.querySelector('#search, #rso');
      if (!searchContainer) return [];

      const anchors = Array.from(searchContainer.querySelectorAll('a'));
      const foundUrls = [];

      anchors.forEach(a => {
        const href = a.href;
        if (href && href.startsWith('http') && !href.includes('google.')) {
          foundUrls.push(href);
        }
      });
      return [...new Set(foundUrls)];
    });

    console.log(`✅ [Google Search] Found ${links.length} results.`);
    return links;

  } catch (error) {
    console.error(`⚠️ [Google Search Timeout/Error]:`, error.message);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

module.exports = { searchGoogleOnly };