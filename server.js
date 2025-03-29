const express = require("express");
const { scrapeEtsy } = require("./scraper");
const app = express();

app.get("/analyze", async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes("etsy.com/listing/")) {
    return res.status(400).json({ error: "Invalid or missing Etsy listing URL." });
  }

  try {
    const result = await scrapeEtsy(url);
    res.json(result);
  } catch (err) {
    console.error("Scrape failed:", err);
    res.status(500).json({ error: "Scraping failed.", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Etsy analyzer server running on port ${PORT}`);
});
