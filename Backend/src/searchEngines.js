const { getBrowser } = require('./browser');

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Google's cookie-consent interstitial is the #1 reason a fresh headless
 * browser - especially from a datacenter IP like a Render/AWS box - sees a
 * "before you continue" page instead of real results. Setting this cookie
 * BEFORE navigating skips the interstitial entirely instead of trying to
 * detect and click through it.
 */
async function setConsentCookie(context) {
  await context.addCookies([
    {
      name: 'CONSENT',
      value: 'YES+cb.20240101-00-p0.en+FX+000',
      domain: '.google.com',
      path: '/',
    },
  ]);
}

// Google Search - hardened version. Throws on block/failure instead of
// swallowing the error and returning [], so the retry loop below can
// actually retry with a real cool-down instead of the caller silently
// moving on with zero results.
async function searchGoogle(context, page, query) {
  await setConsentCookie(context);

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us&pws=0`;
  console.log(`🔍 [Google] Searching: ${query}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the real results container instead of assuming domcontentloaded
  // means results are there - if it never shows up, that's a strong signal
  // we got a block/interstitial page instead.
  const resultsAppeared = await page
    .waitForSelector('#search, #rso', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  const isBlocked = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return (
      text.includes('before you continue') ||
      text.includes('consent') ||
      text.includes('detected unusual traffic') ||
      text.includes('captcha')
    );
  });

  if (!resultsAppeared || isBlocked) {
    console.log('⚠️  [Google] Blocked by consent/captcha screen, or results never loaded.');
    throw new Error('BLOCKED_OR_NO_RESULTS_CONTAINER');
  }

  const links = await page.evaluate(() => {
    const searchContainer = document.querySelector('#search, #rso');
    if (!searchContainer) return [];
    const anchors = Array.from(searchContainer.querySelectorAll('a'));
    const foundUrls = [];
    anchors.forEach((a) => {
      const href = a.href;
      if (href && href.startsWith('http') && !href.includes('google.')) {
        foundUrls.push(href);
      }
    });
    return foundUrls;
  });

  if (!links.length) {
    // A page that loaded but produced zero links is almost always a soft
    // block (a different layout Google shows to suspicious traffic), not a
    // genuinely empty result set. Treat it the same as a hard block so the
    // retry logic actually kicks in instead of quietly returning [].
    console.log('⚠️  [Google] Page loaded but 0 links parsed - treating as blocked.');
    throw new Error('ZERO_LINKS_PARSED');
  }

  return links;
}

/**
 * Google-only search with real retries and cool-down between attempts.
 * An instant retry right after a block just gets blocked again - this backs
 * off 15s -> 45s -> 120s before giving up and returning [].
 *
 * Same exported name/signature as before (searchGoogleOnly(query)) so
 * officialWebsite.js and affiliateSearch.js don't need any changes.
 */
async function searchGoogleOnly(query, { maxRetries = 3 } = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const backoffMs = [15000, 45000, 120000];

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await searchGoogle(context, page, query);
      } catch (err) {
        console.error(`❌ [Google Error] (attempt ${attempt + 1}/${maxRetries + 1}):`, err.message);
        if (attempt < maxRetries) {
          const delay = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1];
          console.log(`⏳ [Google] Waiting ${delay / 1000}s before retrying...`);
          await sleep(delay);
        }
      }
    }
    console.warn(`🚫 [Google] Giving up on "${query}" after ${maxRetries + 1} attempts.`);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

module.exports = { searchGoogleOnly };
