const { chromium } = require('playwright');

let browserInstance = null;

/**
 * Optional proxy support, read from environment variables so no code change
 * is needed to turn it on/off or swap providers. Set these in Render's
 * Environment tab:
 *
 *   PROXY_SERVER   e.g. "http://gate.proxyprovider.com:7000"  (or socks5://...)
 *   PROXY_USERNAME e.g. "user-country-us"
 *   PROXY_PASSWORD e.g. "yourpassword"
 *
 * If PROXY_SERVER is not set, Chromium launches with no proxy (unchanged
 * behavior from before). username/password are optional - only needed if
 * your provider requires per-request auth rather than IP whitelisting.
 */
function getProxyConfig() {
  const server = process.env.PROXY_SERVER;
  if (!server) return undefined;

  const proxy = { server };
  if (process.env.PROXY_USERNAME) proxy.username = process.env.PROXY_USERNAME;
  if (process.env.PROXY_PASSWORD) proxy.password = process.env.PROXY_PASSWORD;
  return proxy;
}

async function init() {
  if (!browserInstance) {
    const proxy = getProxyConfig();
    console.log(
      proxy
        ? `🚀 [Browser] Launching shared Chromium instance (via proxy ${proxy.server})...`
        : '🚀 [Browser] Launching shared Chromium instance (no proxy)...'
    );
    browserInstance = await chromium.launch({
      headless: true,
      proxy,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
      ],
    });
  }
  return browserInstance;
}

async function getBrowser() {
  return await init();
}

async function closeBrowser() {
  if (browserInstance) {
    console.log('🔌 [Browser] Closing Chromium instance...');
    await browserInstance.close();
    browserInstance = null;
  }
}

module.exports = {
  init,
  getBrowser,
  closeBrowser,
  close: closeBrowser,
};
