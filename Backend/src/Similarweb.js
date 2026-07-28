/**
 * similarweb.js
 * -----------------------------------------------------------------------
 * Opens similarweb.com/website/<domain> and extracts the "Total Visits"
 * number Similarweb shows for free on every website profile page. If the
 * page doesn't have the data (new/tiny sites, or Similarweb's own gating),
 * returns "Unknown" - this must never throw or crash the search.
 * -----------------------------------------------------------------------
 */

const browserManager = require('./browser');

async function getMonthlyTraffic(domain) {
  if (!domain) return 'Unknown';

  try {
    return await browserManager.run(async (page) => {
      const url = `https://www.similarweb.com/website/${domain}/`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Similarweb renders the headline stat inside an element carrying
      // "engagement" / "visits" in its class or test-id; several
      // selectors are tried since Similarweb changes markup often.
      const selectors = [
        '[data-test="visits-time-series-value"]',
        '.engagement-list__item-value',
        '.wa-rank-list__value',
        '.app-engagement-value',
      ];

      for (const sel of selectors) {
        const el = await page.$(sel);
        if (el) {
          const text = (await el.textContent())?.trim();
          if (text) return text;
        }
      }

      // Fallback: grab anything on the page that looks like "12.3M" or "845.2K"
      // next to the word "visits".
      const bodyText = (await page.textContent('body')) || '';
      const match = bodyText.match(/([\d.]+\s?[MKB])\s*(?:visits|Visits)/);
      if (match) return match[1];

      return 'Unknown';
    });
  } catch (_) {
    return 'Unknown';
  }
}

module.exports = { getMonthlyTraffic };