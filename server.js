const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CACHE PER CITTÀ E TEMPO LIMITE (4 ORE) ---
const cacheMeteo = {}; 
const TEMPO_LIMITE = 4 * 60 * 60 * 1000; // 4 ore in millisecondi
// ----------------------------------------------

// Serve file statici
app.use(express.static(path.join(__dirname, "public")));

// Endpoint API /meteo con parametro città oggi
app.get("/meteo", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+"); // Normalizziamo il nome città
  const url = `https://www.ilmeteo.it/meteo/${citta}`;

  const oraAttuale = Date.now();

  // CONTROLLO CACHE: Se esiste la città ed è passata meno di TEMPO_LIMITE
  if (cacheMeteo[citta] && (oraAttuale - cacheMeteo[citta].timestamp < TEMPO_LIMITE)) {
    console.log(`Cache USATA per ${citta} (Oggi)`);
    return res.json({
      successo: true,
      valore: cacheMeteo[citta].valore
    });
  }

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // SALVATAGGIO IN CACHE
    cacheMeteo[citta] = {
      valore: valoreTrovato,
      timestamp: oraAttuale
    };

    res.json({
      successo: true,
      valore: valoreTrovato
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      errore: error.message
    });
  }
});

// Endpoint API /meteo con parametro città domani
app.get("/meteo/domani", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+");
  const url = `https://www.ilmeteo.it/meteo/${citta}/domani`;

  // Usiamo una chiave diversa per distinguere i dati di domani
  const cacheKeyDomani = `${citta}_domani`;
  const oraAttuale = Date.now();

  // CONTROLLO CACHE DOMANI
  if (cacheMeteo[cacheKeyDomani] && (oraAttuale - cacheMeteo[cacheKeyDomani].timestamp < TEMPO_LIMITE)) {
    console.log(`Cache USATA per ${citta} (Domani)`);
    return res.json({
      successo: true,
      valore: cacheMeteo[cacheKeyDomani].valore
    });
  }

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // SALVATAGGIO IN CACHE DOMANI
    cacheMeteo[cacheKeyDomani] = {
      valore: valoreTrovato,
      timestamp: oraAttuale
    };

    res.json({
      successo: true,
      valore: valoreTrovato
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      errore: error.message
    });
  }
});

// Endpoint root serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint privacy
app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT} - Cache impostata a 4 ore`);
});
