// src/searchEngines.js
const { getBrowser } = require('./browser');

// 1. DuckDuckGo Search (HTML Version - क्लाउड सर्वर्स के लिए सबसे भरोसेमंद)
async function searchDuckDuckGo(page, query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log(`🦆 [DuckDuckGo] Searching: ${query}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('.result__snippet, .web-result, .result__url'));
      const urls = [];
      anchors.forEach(el => {
        const a = el.querySelector('a') || el;
        if (a && a.href && a.href.startsWith('http')) {
          urls.push(a.href);
        }
      });
      return urls;
    });
    return links;
  } catch (err) {
    console.error('❌ [DuckDuckGo Error]:', err.message);
    return [];
  }
}

// 2. Bing Search (बहुत अच्छा बैकअप)
async function searchBing(page, query) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
    console.log(`🔎 [Bing] Searching: ${query}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('#b_results .b_algo h2 a, #b_results a'));
      const urls = [];
      anchors.forEach(a => {
        if (a.href && a.href.startsWith('http') && !a.href.includes('bing.com') && !a.href.includes('microsoft.com')) {
          urls.push(a.href);
        }
      });
      return urls;
    });
    return links;
  } catch (err) {
    console.error('❌ [Bing Error]:', err.message);
    return [];
  }
}

// 3. Google Search (पहला प्रयास)
async function searchGoogle(page, query) {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    console.log(`🔍 [Google] Searching: ${query}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // चेक करेंगे कि कहीं गूगल ने Consent/Consent Page तो नहीं दिखा दिया
    const isBlocked = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('before you continue') || text.includes('consent') || text.includes('detected unusual traffic');
    });

    if (isBlocked) {
      console.log('⚠️ [Google] Blocked by Consent/Captcha Screen.');
      return [];
    }

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
      return foundUrls;
    });
    return links;
  } catch (err) {
    console.error('❌ [Google Error]:', err.message);
    return [];
  }
}

// मुख्य फंक्शन जो तीनों को बारी-बारी आज़माएगा
async function searchGoogleOnly(query) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // 1. सबसे पहले Google ट्राई करो
    let links = await searchGoogle(page, query);
    if (links && links.length > 0) return links;

    // 2. अगर Google फेल हुआ, तो Bing ट्राई करो
    console.log('🔄 [Fallback] Google failed or blocked. Trying Bing...');
    links = await searchBing(page, query);
    if (links && links.length > 0) return links;

    // 3. अगर Bing भी फेल हुआ, तो DuckDuckGo ट्राई करो
    console.log('🔄 [Fallback] Bing failed. Trying DuckDuckGo...');
    links = await searchDuckDuckGo(page, query);
    return links;

  } catch (error) {
    console.error(`❌ [Search Engine Chain Error]:`, error.message);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

module.exports = { searchGoogleOnly };
