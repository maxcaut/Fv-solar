const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve i file statici del front-end
app.use(express.static(path.join(__dirname, "public")));

// Endpoint API /meteo
app.get("/meteo", async (req, res) => {
  const url = "https://www.ilmeteo.it/meteo/somma+vesuviana";

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
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

// Endpoint root / serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
