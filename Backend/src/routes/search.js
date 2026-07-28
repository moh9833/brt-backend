const express = require('express');
const { findOfficialWebsite } = require('../officialWebsite');
const { getMonthlyTraffic } = require('../similarweb');
const { findAffiliateLink } = require('../affiliateSearch');
const sheetsClient = require('../sheetsClient');

const router = express.Router();

// POST /api/search  { brand, country, email }
router.post('/search', async (req, res) => {
  const brand = String(req.body?.brand || '').trim();
  const country = String(req.body?.country || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!brand) {
    return res.status(400).json({ ok: false, error: 'Brand name is required.' });
  }

  const result = {
    brand,
    domain: 'Not Found',
    traffic: 'Unknown',
    affiliateLink: 'Not Found',
    status: 'not_found',
  };

  try {
    // 1. Official website
    const { domain } = await findOfficialWebsite(brand, country || undefined);

    if (domain) {
      result.domain = domain;
      result.status = 'partial';

      // 2. Similarweb traffic (never throws - "Unknown" on failure)
      result.traffic = await getMonthlyTraffic(domain);

      // 3. Affiliate link
      const affiliateLink = await findAffiliateLink(brand, domain);
      if (affiliateLink) {
        result.affiliateLink = affiliateLink;
        result.status = 'found';
      }
    }
  } catch (err) {
    // Never crash the request - fall through with whatever partial data we have.
    console.error('[search] error while researching brand:', err.message);
  }

  // Best-effort logging - a Sheets hiccup must never fail the user's search.
  try {
    if (email) {
      await sheetsClient.upsertUser({ name: undefined, email, country, brand });
    }
    await sheetsClient.logSearch({
      email: email || 'anonymous',
      brand,
      country,
      domain: result.domain,
      traffic: result.traffic,
      affiliateLink: result.affiliateLink,
      status: result.status,
    });
  } catch (err) {
    console.error('[search] logging to Sheets failed:', err.message);
  }

  return res.json({ ok: true, result });
});

module.exports = router;
