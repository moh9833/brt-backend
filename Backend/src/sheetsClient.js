const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const APP_SECRET = process.env.APP_SECRET;

async function callAppsScript(action, payload) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('XXXX')) {
    throw new Error(
      'APPS_SCRIPT_URL is not configured - deploy apps-script/Code.gs and set it in backend/.env'
    );
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, secret: APP_SECRET, ...payload }),
  });

  if (!res.ok) {
    throw new Error(`Apps Script call failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Apps Script error: ${data.error || 'unknown'}`);
  }
  return data;
}

/** Create the user if the email is new, otherwise update their activity fields. */
async function upsertUser({ name, email, country, brand }) {
  return callAppsScript('upsertUser', { name, email, country, brand });
}

/** Look up whether an email is already registered (used to restore login state). */
async function findUser(email) {
  return callAppsScript('findUser', { email });
}

/** Append one row to the Search History sheet. */
async function logSearch({ email, brand, country, domain, traffic, affiliateLink, status }) {
  return callAppsScript('logSearch', {
    email,
    brand,
    country,
    domain,
    traffic,
    affiliateLink,
    status,
  });
}

module.exports = { upsertUser, findUser, logSearch };
