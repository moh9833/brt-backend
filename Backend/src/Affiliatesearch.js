/**
 * affiliateSearch.js
 * -----------------------------------------------------------------------
 * Step 1: Load the brand's own official site and scan its header, footer
 *         and nav links for affiliate/partner-program wording.
 * Step 2: If nothing found, search Google for "<Brand> Affiliate /
 *         Affiliate Program / Partner Program / Publisher Program /
 *         Creator Program" and accept only links that live on the
 *         brand's own domain OR on a recognized affiliate network.
 * -----------------------------------------------------------------------
 */

const browserManager = require('./browser');
const { searchWithFallback } = require('./searchEngines');
const { normalizeDomain } = require('./officialWebsite');

const LINK_KEYWORDS = [
  'affiliate',
  'become partner',
  'become a partner',
  'partner program',
  'partners',
  'publishers',
  'creators',
  'creator program',
  'ambassador',
  'influencer',
  'referral partner',
  'refer a friend',
];

const TRUSTED_NETWORK_HOSTS = [
  'impact.com',
  'cj.com',
  'cjaffiliate.com',
  'partnerstack.com',
  'shareasale.com',
  'awin.com',
  'flexoffers.com',
  'rakutenadvertising.com',
  'linksynergy.com', // Rakuten legacy domain
  'partnerize.com',
  'tradedoubler.com',
  'everflow.io',
  'admitad.com',
];

function textLooksAffiliateRelated(text) {
  const lower = text.toLowerCase();
  return LINK_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Scan the brand's own site's header/footer/nav for an affiliate link. */
async function findOnOwnSite(domain) {
  const url = `https://${domain}`;
  try {
    return await browserManager.run(async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const candidates = await page.$$eval(
        'footer a, header a, nav a',
        (anchors) =>
          anchors
            .map((a) => ({
              text: (a.textContent || '').trim(),
              href: a.href,
            }))
            .filter((a) => a.href)
      );

      for (const { text, href } of candidates) {
        if (textLooksAffiliateRelated(text)) {
          return href;
        }
      }
      return null;
    });
  } catch (_) {
    return null;
  }
}

/** Search Google for an affiliate program page, accepting only own-domain
 *  or trusted-network results. */
async function findViaSearch(brandName, ownDomain) {
  const queries = [
    `${brandName} Affiliate`,
    `${brandName} Affiliate Program`,
    `${brandName} Partner Program`,
    `${brandName} Publisher Program`,
    `${brandName} Creator Program`,
  ];

  for (const query of queries) {
    const { results } = await searchWithFallback(query);
    for (const result of results) {
      const host = normalizeDomain(result.url);
      if (!host) continue;

      const isOwnSite = ownDomain && host.includes(ownDomain);
      const isTrustedNetwork = TRUSTED_NETWORK_HOSTS.some((n) => host.includes(n));

      if (isOwnSite || isTrustedNetwork) {
        return result.url;
      }
    }
  }
  return null;
}

/**
 * @param {string} brandName
 * @param {string|null} ownDomain  normalized official domain, if known
 * @returns {Promise<string|null>} affiliate program URL, or null
 */
async function findAffiliateLink(brandName, ownDomain) {
  if (ownDomain) {
    const onSite = await findOnOwnSite(ownDomain);
    if (onSite) return onSite;
  }
  return findViaSearch(brandName, ownDomain);
}

module.exports = { findAffiliateLink };