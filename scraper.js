const playwright = require("playwright");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.5993.117 Safari/537.36"
];

function randomDelay(min = 1500, max = 3500) {
  return new Promise(res => setTimeout(res, Math.random() * (max - min) + min));
}

async function scrapeEtsy(listingUrl) {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
  await randomDelay();

  const listingData = await page.evaluate(() => {
    const getText = sel => document.querySelector(sel)?.innerText?.trim() || "N/A";

    const shopLink = document.querySelector("a[href*='/shop/']");
    const title = getText("h1[data-buy-box-listing-title]") || getText("h1");
    const price = getText("[data-buy-box-region='price'] span[class*='currency-value']") || getText("[data-selector='price']");

    return {
      title,
      price,
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

  await page.goto(listingData.shopUrl, { waitUntil: "domcontentloaded" });
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
      await page.waitForLoadState("domcontentloaded");
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
