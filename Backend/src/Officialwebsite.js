/**
 * officialWebsite.js
 * -----------------------------------------------------------------------
 * Given raw search results for "<Brand> Official Website [Country]",
 * picks the first URL that is NOT a social network, wiki, directory,
 * review/coupon site, blog, or forum - then normalizes it down to a
 * bare registrable domain (e.g. https://www.nordvpn.com/pricing ->
 * nordvpn.com).
 * -----------------------------------------------------------------------
 */

const { searchWithFallback } = require('./searchEngines');

// Host fragments that disqualify a result from being "the official site"
const REJECTED_HOST_FRAGMENTS = [
  'wikipedia.org',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'crunchbase.com',
  'trustpilot.com',
  'youtube.com',
  'pinterest.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'blogspot.com',
  'wordpress.com',
  'tumblr.com',
  'g2.com',
  'capterra.com',
  'glassdoor.com',
  'indeed.com',
  'yelp.com',
  'bbb.org',
  'sitejabber.com',
  'producthunt.com',
  'appsumo.com',
  'retailmenot.com',
  'honey.com',
  'coupons.com',
  'slickdeals.net',
  'similarweb.com',
  'app.similarweb.com',
];

// Path/title keywords that suggest "review", "coupon", "forum", "directory"
const REJECTED_KEYWORDS = [
  'review',
  'coupon',
  'promo code',
  'discount code',
  'forum',
  'directory',
  'vs ',
  'alternatives',
  'best ',
  'top 10',
  'top 20',
];

function normalizeDomain(rawUrl) {
  try {
    const u = new URL(rawUrl);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch (_) {
    return null;
  }
}

function isRejectedHost(host) {
  return REJECTED_HOST_FRAGMENTS.some((frag) => host.includes(frag));
}

function isRejectedByKeyword(title = '') {
  const lower = title.toLowerCase();
  return REJECTED_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * @param {string} brandName
 * @param {string} [country]  optional country name, e.g. "Germany"
 * @returns {Promise<{domain: string|null, sourceUrl: string|null, engine: string|null}>}
 */
async function findOfficialWebsite(brandName, country) {
  const query = country
    ? `${brandName} Official Website ${country}`
    : `${brandName} Official Website`;

  const { results, engine } = await searchWithFallback(query);

  for (const result of results) {
    const host = normalizeDomain(result.url);
    if (!host) continue;
    if (isRejectedHost(host)) continue;
    if (isRejectedByKeyword(result.title)) continue;

    return { domain: host, sourceUrl: result.url, engine };
  }

  return { domain: null, sourceUrl: null, engine };
}

module.exports = { findOfficialWebsite, normalizeDomain, isRejectedHost };