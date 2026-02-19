const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint principale
app.get("/", (req, res) => {
  res.send("Server Meteo attivo 🚀 Vai su /meteo");
});

// Endpoint scraping
app.get("/meteo", async (req, res) => {
  const url = "https://www.ilmeteo.it/meteo/somma+vesuviana";

  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    const valore = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\d+(\.\d+)?\s?kWh/);
      return match ? match[0] : null;
    });

    await browser.close();

    res.json({
      successo: true,
      valore: valore
    });

  } catch (error) {
    if (browser) await browser.close();

    res.status(500).json({
      successo: false,
      errore: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
