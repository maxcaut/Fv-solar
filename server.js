const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server Meteo attivo 🚀 Vai su /meteo");
});

app.get("/meteo", async (req, res) => {
  const url = "https://www.ilmeteo.it/meteo/somma+vesuviana";

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(response.data);

    // Cerca direttamente il valore kWh
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);

    res.json({
      successo: true,
      valore: match ? match[0] : null
    });

  } catch (error) {
    res.status(500).json({
      successo: false,
      errore: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
