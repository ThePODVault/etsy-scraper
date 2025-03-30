const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.5993.117 Safari/537.36"
];

function randomDelay(min = 1500, max = 3500) {
  return new Promise(res => setTimeout(res, Math.random() * (max - min) + min));
}

async function scrapeEtsy(listingUrl) {
  const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
  await page.setViewport({ width: 1280, height: 800 });

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

    const nextBtn = await page.$("nav[role='navigation'] a[aria-label='Next page']");
    if (nextBtn) {
      await nextBtn.click();
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
