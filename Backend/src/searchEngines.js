// src/searchEngines.js
const { getBrowser } = require('./browser');

/**
 * सिर्फ Google पर सर्च करेगा और टॉप रिजल्ट्स के URL लाएगा
 */
async function searchGoogleOnly(query) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    console.log(`🔍 [Google Search] Searching for: ${query}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const links = await page.evaluate(() => {
      const elements = document.querySelectorAll('#search .g a');
      const urls = [];
      elements.forEach(el => {
        let href = el.href;
        if (href && href.startsWith('http') && !href.includes('google.com')) {
          urls.push(href);
        }
      });
      return [...new Set(urls)];
    });

    console.log(`✅ [Google Search] Found ${links.length} results.`);
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
