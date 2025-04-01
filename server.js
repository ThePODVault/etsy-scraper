const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Load SOCKS5 proxies from file
const proxyListPath = path.join(__dirname, "proxies.txt");
const rawProxies = fs.readFileSync(proxyListPath, "utf-8").split("\n").filter(Boolean);

// Transform into proper proxy URLs
const proxies = rawProxies.map(line => {
  const [ip, port, user, pass] = line.trim().split(":");
  return `socks5://${user}:${pass}@${ip}:${port}`;
});

function getRandomProxy() {
  return proxies[Math.floor(Math.random() * proxies.length)];
}

async function scrapeEtsy(url) {
  const proxyUrl = getRandomProxy();

  console.log(`🌐 Using proxy: ${proxyUrl}`);

  const [protocol, authHost] = proxyUrl.split("://");
  const [auth, host] = authHost.split("@");
  const [proxyUser, proxyPass] = auth.split(":");
  const [proxyHost, proxyPort] = host.split(":");

  const launchOptions = {
    headless: "new",
    args: [
      `--proxy-server=${protocol}://${proxyHost}:${proxyPort}`,
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  };

  let browser;

  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Authenticate proxy
    await page.authenticate({
      username: proxyUser,
      password: proxyPass
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector("h1[data-buy-box-listing-title]")?.innerText;
      const price = document.querySelector("[data-buy-box-region='price']")?.innerText;
      const shopName = document.querySelector("div[data-region='shop-name'] span a")?.innerText;
      const rating = document.querySelector("[data-region='rating'] > span")?.innerText;
      const reviews = document.querySelector("span[data-region='review-count']")?.innerText;

      return {
        title: title || "N/A",
        price: price || "N/A",
        shopName: shopName || "N/A",
        rating: rating || "N/A",
        reviews: reviews || "N/A"
      };
    });

    await browser.close();
    return result;

  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ Scraping error:", err.message);
    throw err;
  }
}

module.exports = { scrapeEtsy };
