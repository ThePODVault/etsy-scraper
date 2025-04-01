const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

// ✅ SOCKS5 proxies (Webshare Premium)
const proxyList = [
  "socks5://krgfsmic:d25c63hupt8f@45.43.82.186:6180",
  "socks5://krgfsmic:d25c63hupt8f@156.243.179.82:6570",
  "socks5://krgfsmic:d25c63hupt8f@216.173.107.156:6124",
  "socks5://krgfsmic:d25c63hupt8f@31.58.24.152:6223",
  "socks5://krgfsmic:d25c63hupt8f@86.38.26.239:6404",
  "socks5://krgfsmic:d25c63hupt8f@166.88.34.43:5754",
  "socks5://krgfsmic:d25c63hupt8f@168.199.227.103:6882",
  "socks5://krgfsmic:d25c63hupt8f@216.173.74.208:5888",
  "socks5://krgfsmic:d25c63hupt8f@46.203.127.115:6140",
  "socks5://krgfsmic:d25c63hupt8f@94.177.21.83:5452"
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeEtsy(listingUrl) {
  const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
  console.log("🌀 Using proxy:", proxy);

  const browser = await puppeteer.launch({
    headless: "new", // use modern headless mode
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--proxy-server=${proxy}`
    ]
  });

  const page = await browser.newPage();

  try {
    // Go to listing
    await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await delay(2000);

    const listingData = await page.evaluate(() => {
      const getText = sel => document.querySelector(sel)?.innerText?.trim() || "N/A";
      const shopLink = Array.from(document.querySelectorAll("a")).find(a =>
        a.href.includes("/shop/")
      );

      return {
        title: getText("h1[data-buy-box-listing-title]") || getText("h1"),
        price: getText("[data-buy-box-region='price'] span[class*='currency-value']") || getText("[data-selector='price']"),
        shopName: shopLink?.innerText?.trim() || "N/A",
        shopUrl: shopLink?.href || "",
        reviews: getText("span[data-buy-box-region='review-rating']"),
        listingUrl: location.href
      };
    });

    if (!listingData.shopUrl) {
      throw new Error("Shop URL not found from listing page.");
    }

    // Go to shop page
    await page.goto(listingData.shopUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await delay(1500);

    const shopMeta = await page.evaluate(() => {
      const getText = sel => document.querySelector(sel)?.innerText?.trim() || "N/A";
      const stats = Array.from(document.querySelectorAll("[data-shop-home-header-section] span"))
        .map(el => el.innerText)
        .filter(Boolean);

      return {
        rating: getText("[aria-label*='stars']") || "N/A",
        sales: stats.find(s => s.includes(" Sales")) || "N/A",
        reviews: getText("[data-average-rating]") || "N/A"
      };
    });

    await browser.close();

    return {
      listing: listingData,
      shop: {
        name: listingData.shopName,
        url: listingData.shopUrl,
        ...shopMeta
      }
    };
  } catch (err) {
    await browser.close();
    throw new Error(`Scraping failed: ${err.message}`);
  }
}

module.exports = { scrapeEtsy };
