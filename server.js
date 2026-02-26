const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Supabase tramite Environment Variables
const SUPABASE_URL = "https://czdakmcnkqvcxwkgyhwx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEMPO_LIMITE = 4 * 60 * 60 * 1000; // 4 ore

// Serve file statici
app.use(express.static(path.join(__dirname, "public")));

// Endpoint API /meteo con parametro città oggi
app.get("/meteo", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana"; // default
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+"); // sostituisci spazi con '+'
  const url = `https://www.ilmeteo.it/meteo/${citta}`;
  const oraAttuale = Date.now();

  try {
    // CONTROLLO CACHE
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", citta).maybeSingle();

    let valoreIeriDaSalvare = cache ? cache.valore_ieri : null;

    if (cache) {
      const giornoSalvataggio = new Date(Number(cache.creato_il)).getDate();
      const giornoOggi = new Date(oraAttuale).getDate();

      // Se è lo stesso giorno e siamo sotto il limite delle 4 ore
      if (oraAttuale - cache.creato_il < TEMPO_LIMITE && giornoSalvataggio === giornoOggi) {
        console.log(`>>> [CACHE OGGI] Dati validi per ${citta} (Salvati il: ${cache.data_leggibile})`);
        return res.json({
          successo: true,
          valore: cache.valore,
          ieri: cache.valore_ieri
        });
      }

      // Se il giorno è cambiato, il vecchio "valore" diventa "ieri"
      if (giornoSalvataggio !== giornoOggi) {
        console.log(`>>> [ROTAZIONE] Giorno cambiato per ${citta}. Sposto oggi in ieri.`);
        valoreIeriDaSalvare = cache.valore;
      }
    }

    console.log(`>>> [SCRAPE OGGI] Nuova richiesta per ${citta}`);
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // DATA LEGGIBILE PER IL DB E LOG
    const dataLeggibile = new Date(oraAttuale).toLocaleString("it-IT");

    // SALVATAGGIO IN CACHE
    await sb.from("cache_meteo").upsert([{ 
      citta: citta, 
      valore: valoreTrovato, 
      valore_ieri: valoreIeriDaSalvare,
      creato_il: oraAttuale,
      data_leggibile: dataLeggibile 
    }]);

    res.json({
      successo: true,
      valore: valoreTrovato,
      ieri: valoreIeriDaSalvare
    });
  } catch (error) {
    console.error(`!!! [ERRORE OGGI] ${citta}:`, error.message);
    res.status(500).json({
      successo: false,
      errore: error.message
    });
  }
});

// Endpoint API /meteo con parametro città domani
app.get("/meteo/domani", async (req, res) => {
  let citta = req.query.citta || "somma+vesuviana"; // default
  citta = citta.trim().toLowerCase().replace(/\s+/g, "+"); // sostituisci spazi con '+'
  const url = `https://www.ilmeteo.it/meteo/${citta}/domani`;
  const cacheKeyDomani = citta + "_domani";
  const oraAttuale = Date.now();

  try {
    // CONTROLLO CACHE
    const { data: cache } = await sb.from("cache_meteo").select("*").eq("citta", cacheKeyDomani).maybeSingle();

    if (cache) {
      const giornoSalvataggio = new Date(Number(cache.creato_il)).getDate();
      const giornoOggi = new Date(oraAttuale).getDate();

      if (oraAttuale - cache.creato_il < TEMPO_LIMITE && giornoSalvataggio === giornoOggi) {
        console.log(`>>> [CACHE DOMANI] Dati validi per ${citta} (Salvati il: ${cache.data_leggibile})`);
        return res.json({
          successo: true,
          valore: cache.valore
        });
      }
    }

    console.log(`>>> [SCRAPE DOMANI] Nuova richiesta per ${citta}`);
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);
    const valoreTrovato = match ? match[0] : null;

    // DATA LEGGIBILE PER IL DB E LOG
    const dataLeggibile = new Date(oraAttuale).toLocaleString("it-IT");

    // SALVATAGGIO IN CACHE
    await sb.from("cache_meteo").upsert([{ 
      citta: cacheKeyDomani, 
      valore: valoreTrovato, 
      creato_il: oraAttuale,
      data_leggibile: dataLeggibile 
    }]);

    res.json({
      successo: true,
      valore: valoreTrovato
    });
  } catch (error) {
    console.error(`!!! [ERRORE DOMANI] ${citta}:`, error.message);
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

// Endpoint privacy policy
app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.listen(PORT, () => {
  console.log(`Server HelioTrack attivo sulla porta ${PORT}`);
  console.log(`Monitoraggio cache Supabase abilitato con storico ieri.`);
});
