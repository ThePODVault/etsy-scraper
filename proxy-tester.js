const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

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

async function testProxy(proxy) {
  console.log(`🌐 Testing proxy: ${proxy}`);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--proxy-server=${proxy}`
      ]
    });

    const page = await browser.newPage();
    await page.goto("https://api.ipify.org?format=json", { waitUntil: "networkidle2", timeout: 15000 });
    const ipInfo = await page.evaluate(() => document.body.innerText);
    console.log(`✅ Success: IP is ${ipInfo}\n`);

    await browser.close();
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}\n`);
    return false;
  }
}

(async () => {
  for (const proxy of proxyList) {
    await testProxy(proxy);
  }
  console.log("🧪 Proxy test complete.");
})();
