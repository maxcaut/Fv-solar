const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const { createClient } = require("@supabase/supabase-js"); // Aggiunto per Supabase

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Supabase
const SUPABASE_URL = "https://czdakmcnkqvcxwkgyhwx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4azTkKHrQCK-T-7rlj5Hzg_3WeWnLcK";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEMPO_LIMITE = 4 * 60 * 60 * 1000; // 4 ore

// Serve file statici
app.use(express.static(path.join(__dirname, "public")));

// Endpoint API /meteo oggi
app.get("/meteo", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+");
  const url = `https://www.ilmeteo.it/meteo/${citta}`;
  const oraAttuale = Date.now();

  try {
    // CONTROLLO CACHE SU SUPABASE
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", citta).maybeSingle();

    if (cache && (oraAttuale - cache.creato_il < TEMPO_LIMITE)) {
      console.log("Dati recuperati da cache DB (Oggi): " + citta);
      return res.json({ successo: true, valore: cache.valore });
    }

    // SE NON C'È CACHE, FACCIO SCRAPING (Il tuo codice originale)
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // SALVO IN CACHE DB
    await sb.from("cache_meteo").upsert([{ citta: citta, valore: valoreTrovato, creato_il: oraAttuale }]);

    res.json({
      successo: true,
      valore: valoreTrovato
    });
  } catch (error) {
    res.status(500).json({ successo: false, errore: error.message });
  }
});

// Endpoint API /meteo domani
app.get("/meteo/domani", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+");
  const url = `https://www.ilmeteo.it/meteo/${citta}/domani`;
  const cacheKeyDomani = citta + "_domani"; // Chiave per distinguere domani
  const oraAttuale = Date.now();

  try {
    // CONTROLLO CACHE SU SUPABASE
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", cacheKeyDomani).maybeSingle();

    if (cache && (oraAttuale - cache.creato_il < TEMPO_LIMITE)) {
      console.log("Dati recuperati da cache DB (Domani): " + citta);
      return res.json({ successo: true, valore: cache.valore });
    }

    // SCRAPING (Il tuo codice originale)
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // SALVO IN CACHE DB
    await sb.from("cache_meteo").upsert([{ citta: cacheKeyDomani, valore: valoreTrovato, creato_il: oraAttuale }]);

    res.json({
      successo: true,
      valore: valoreTrovato
    });
  } catch (error) {
    res.status(500).json({ successo: false, errore: error.message });
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
  console.log(`Server attivo sulla porta ${PORT}`);
});
