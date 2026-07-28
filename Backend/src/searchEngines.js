// src/routes/search.js
const express = require('express');
const { findOfficialWebsite } = require('../officialWebsite');
const { getMonthlyTraffic } = require('../similarweb'); // (rename किया हुआ स्मॉल 'similarweb' लोड करेगा)
const { findAffiliateLink } = require('../affiliateSearch');
const sheetsClient = require('../sheetsClient');

const router = express.Router();

// POST /api/search  { brand, country, email }
router.post('/search', async (req, res) => {
  const brand = String(req.body?.brand || '').trim();
  const country = String(req.body?.country || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();

  // अगर यूजर ने ब्रांड का नाम नहीं डाला
  if (!brand) {
    return res.status(400).json({ ok: false, error: 'Brand name is required.' });
  }

  // डिफ़ॉल्ट रिस्पॉन्स ऑब्जेक्ट
  const result = {
    brand,
    domain: 'Not Found',
    traffic: 'Unknown',
    affiliateLink: 'Not Found',
    status: 'not_found',
  };

  try {
    console.log(`🚀 [Search Route] Research starting for: ${brand}`);

    // 1. Official website ढूंढेंगे
    const websiteData = await findOfficialWebsite(brand, country || undefined);

    if (websiteData && websiteData.domain) {
      result.domain = websiteData.domain;
      result.status = 'partial';

      // 2. Similarweb से ट्रैफिक निकालेंगे (अगर एरर आए तो भी "Unknown" रहेगा, क्रैश नहीं होगा)
      try {
        result.traffic = await getMonthlyTraffic(result.domain);
      } catch (trafficErr) {
        console.error('⚠️ Traffic fetch failed:', trafficErr.message);
        result.traffic = 'Unknown';
      }

      // 3. Affiliate link ढूंढेंगे
      try {
        const affiliateLink = await findAffiliateLink(brand, result.domain);
        if (affiliateLink) {
          result.affiliateLink = affiliateLink;
          result.status = 'found';
        }
      } catch (affErr) {
        console.error('⚠️ Affiliate link search failed:', affErr.message);
        result.affiliateLink = 'Not Found';
      }
    }
  } catch (err) {
    // अगर कुछ भी फेल हो जाए, तो यूजर को क्रैश एरर नहीं दिखेगा, खाली डेटा चला जाएगा
    console.error('❌ [search] Error while researching brand:', err.message);
  }

  // Google Sheet में बैकग्राउंड में लॉग सेव करेंगे (सर्च फेल न हो, इसलिए इसे try/catch में रखा है)
  try {
    if (email) {
      // यूजर की डिटेल शीट में अपडेट करेंगे
      await sheetsClient.upsertUser({ name: undefined, email, country, brand });
    }
    // सर्च हिस्ट्री लॉग करेंगे
    await sheetsClient.logSearch({
      email: email || 'anonymous',
      brand,
      country,
      domain: result.domain,
      traffic: result.traffic,
      affiliateLink: result.affiliateLink,
      status: result.status,
    });
    console.log(`📝 [Search Route] Logged search for ${brand} to Google Sheets.`);
  } catch (sheetErr) {
    console.error('❌ [search] Logging to Sheets failed:', sheetErr.message);
  }

  // फाइनल रिस्पॉन्स यूजर को भेजेंगे
  return res.json({ ok: true, result });
});

module.exports = router;
