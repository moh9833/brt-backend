// src/searchEngines.js
const { getBrowser } = require('./browser');

/**
 * गूगल सर्च रिजल्ट्स में से सारे ऑर्गेनिक लिंक्स निकालेगा (चाहे गूगल डिज़ाइन बदल दे)
 */
async function searchGoogleOnly(query) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US'
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    console.log(`🔍 [Google Search] Running: ${query}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // सुपर-मजबूत लिंक एक्सट्रैक्टर (यह किसी क्लास-नाम पर निर्भर नहीं है)
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
          // सिर्फ असली वेबसाइट्स लेंगे, गूगल की खुद की सर्विसेज के लिंक्स छोड़ देंगे
          if (
            urlObj.protocol === 'https:' &&
            !urlObj.hostname.includes('google.') &&
            !urlObj.hostname.includes('gstatic.com') &&
            !href.includes('/search?') &&
            !href.includes('accounts.google.com') &&
            !href.includes('support.google.com')
          ) {
            foundUrls.push(href);
          }
        } catch (_) {}
      });

      return [...new Set(foundUrls)]; // डुप्लीकेट्स हटाएंगे
    });

    console.log(`✅ [Google Search] Extracted ${links.length} clean links.`);
    return links;

  } catch (error) {
    console.error(`❌ [Google Search Error]:`, error.message);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

module.exports = { searchGoogleOnly };
