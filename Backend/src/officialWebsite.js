// src/officialWebsite.js
const { searchGoogleOnly } = require('./searchEngines');

// जो वेबसाइट्स आधिकारिक (Official) नहीं होतीं, उनकी लिस्ट
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

// डोमेन नेम साफ़ करने के लिए (उदा. https://www.nordvpn.com/ -> nordvpn.com)
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

/**
 * Brand के नाम से उसकी असली वेबसाइट ढूंढता है
 */
async function findOfficialWebsite(brandName, country) {
  const query = country
    ? `${brandName} Official Website ${country}`
    : `${brandName} Official Website`;

  // सिर्फ Google से रिजल्ट्स मंगाएंगे
  const urls = await searchGoogleOnly(query);

  for (const url of urls) {
    const host = normalizeDomain(url);
    if (!host) continue;
    if (isRejectedHost(host)) continue;

    // पहली वैलिड वेबसाइट मिलते ही रिटर्न कर देंगे
    return { domain: host, sourceUrl: url, engine: 'google' };
  }

  return { domain: null, sourceUrl: null, engine: 'google' };
}

module.exports = { findOfficialWebsite, normalizeDomain, isRejectedHost };
