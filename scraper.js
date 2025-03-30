const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

// Webshare proxy list (rotates per request)
const proxyList = [
  "http://krgfsmic:d25c63hupt8f@38.154.227.167:5868",
  "http://krgfsmic:d25c63hupt8f@38.153.152.244:9594",
  "http://krgfsmic:d25c63hupt8f@86.38.234.176:6630",
  "http://krgfsmic:d25c63hupt8f@173.211.0.148:6641",
  "http://krgfsmic:d25c63hupt8f@161.123.152.115:6360",
  "http://krgfsmic:d25c63hupt8f@216.10.27.159:6837",
  "http://krgfsmic:d25c63hupt8f@154.36.110.199:6853",
  "http://krgfsmic:d25c63hupt8f@45.151.162.198:6600",
  "http://krgfsmic:d25c63hupt8f@185.199.229.156:7492",
  "http://krgfsmic:d25c63hupt8f@185.199.228.220:7300"
];

function randomDelay(min = 1500, max = 3500) {
  return new Promise(res => setTimeout(res, Math.random() * (max - min) + min));
}

async function scrapeEtsy(listingUrl) {
  const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
  console.log("🌀 Using proxy:", randomProxy);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--proxy-server=${randomProxy}`
    ]
  });

  const page = await browser.newPage();

  // Optional: confirm IP is via proxy
  try {
    await page.goto("https://api.ipify.org?format=json", { waitUntil: "networkidle2" });
    const currentIP = await page.evaluate(() => document.body.innerText);
    console.log("✅ Current IP:", currentIP);
  } catch (e) {
    console.warn("⚠️ Failed to fetch current IP");
  }

  await page.goto(listingUrl, { waitUntil: "networkidle2" });
  await randomDelay();

  const html = await page.content();
  console.log("=== LISTING PAGE HTML START ===");
  console.log(html.slice(0, 8000));
  console.log("=== LISTING PAGE HTML END ===");

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
    await browser.close();
    throw new Error("Shop URL not found from listing page.");
  }

  await page.goto(listingData.shopUrl, { waitUntil: "networkidle2" });
  await randomDelay();

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

  const listings = [];

  let nextPage = true;
  while (nextPage) {
    const items = await page.$$eval("li.wt-list-unstyled > div > a", anchors =>
      anchors.map(a => ({
        title: a.querySelector("h3")?.innerText.trim() || "N/A",
        url: a.href,
        price: a.querySelector(".currency-value")?.innerText.trim() || "N/A"
      }))
    );
    listings.push(...items);

    const nextButton = await page.$("nav[role='navigation'] a[aria-label='Next page']");
    if (nextButton) {
      await nextButton.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      await randomDelay();
    } else {
      nextPage = false;
    }
  }

  await browser.close();

  return {
    listing: listingData,
    shop: {
      name: listingData.shopName,
      url: listingData.shopUrl,
      ...shopMeta
    },
    listings
  };
}

module.exports = { scrapeEtsy };
