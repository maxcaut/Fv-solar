const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Supabase tramite Environment Variables su Render
const SUPABASE_URL = "https://czdakmcnkqvcxwkgyhwx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEMPO_LIMITE = 4 * 60 * 60 * 1000; // 4 ore

// Funzione helper per rendere il timestamp leggibile nei log
const formattaDataLog = (timestamp) => {
  return new Date(Number(timestamp)).toLocaleString("it-IT");
};

app.use(express.static(path.join(__dirname, "public")));

// Endpoint API /meteo oggi
app.get("/meteo", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+");
  const url = `https://www.ilmeteo.it/meteo/${citta}`;
  const oraAttuale = Date.now();

  try {
    // 1. Prova a recuperare dalla cache su Supabase
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", citta).maybeSingle();

    if (cache) {
      const giornoSalvataggio = new Date(Number(cache.creato_il)).getDate();
      const giornoOggi = new Date(oraAttuale).getDate();

      // Controlla se sono passate meno di 4 ore E se siamo ancora nello stesso giorno solare
      if (oraAttuale - cache.creato_il < TEMPO_LIMITE && giornoSalvataggio === giornoOggi) {
        console.log(`[CACHE] Dati validi per ${citta}. Salvati il: ${formattaDataLog(cache.creato_il)}`);
        return res.json({ successo: true, valore: cache.valore });
      }
    }

    // 2. Se cache scaduta o giorno cambiato, fai scraping
    console.log(`[SCRAPE] Richiesta web per ${citta} (Oggi)`);
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // 3. Salva/Aggiorna la cache
    await sb.from("cache_meteo").upsert([{ 
      citta: citta, 
      valore: valoreTrovato, 
      creato_il: oraAttuale 
    }]);

    res.json({ successo: true, valore: valoreTrovato });

  } catch (error) {
    console.error(`[ERRORE] ${citta}:`, error.message);
    res.status(500).json({ successo: false, errore: error.message });
  }
});

// Endpoint API /meteo domani
app.get("/meteo/domani", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana";
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+");
  const url = `https://www.ilmeteo.it/meteo/${citta}/domani`;
  const cacheKeyDomani = citta + "_domani";
  const oraAttuale = Date.now();

  try {
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", cacheKeyDomani).maybeSingle();

    if (cache) {
      const giornoSalvataggio = new Date(Number(cache.creato_il)).getDate();
      const giornoOggi = new Date(oraAttuale).getDate();

      if (oraAttuale - cache.creato_il < TEMPO_LIMITE && giornoSalvataggio === giornoOggi) {
        console.log(`[CACHE DOMANI] Dati validi per ${citta}. Salvati il: ${formattaDataLog(cache.creato_il)}`);
        return res.json({ successo: true, valore: cache.valore });
      }
    }

    console.log(`[SCRAPE] Richiesta web per ${citta} (Domani)`);
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    await sb.from("cache_meteo").upsert([{ 
      citta: cacheKeyDomani, 
      valore: valoreTrovato, 
      creato_il: oraAttuale 
    }]);

    res.json({ successo: true, valore: valoreTrovato });

  } catch (error) {
    console.error(`[ERRORE DOMANI] ${citta}:`, error.message);
    res.status(500).json({ successo: false, errore: error.message });
  }
});

// Endpoint root serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint privacy policy
app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.listen(PORT, () => {
  console.log(`--------------------------------------------------`);
  console.log(`Server HelioTrack attivo sulla porta ${PORT}`);
  console.log(`Sistema di Cache Supabase (4 ore) configurato.`);
  console.log(`Orario server: ${formattaDataLog(Date.now())}`);
  console.log(`--------------------------------------------------`);
});
