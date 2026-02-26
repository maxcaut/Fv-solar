require("dotenv").config(); // legge .env solo in locale

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// 🔐 SUPABASE SERVER
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================
// 📁 FILE STATICI
// ===============================
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 🧠 FUNZIONE SCRAPING
// ===============================
async function prendiValore(citta, tipo = "oggi") {
  const baseUrl = `https://www.ilmeteo.it/meteo/${citta}`;
  const url = tipo === "domani" ? `${baseUrl}/domani` : baseUrl;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(response.data);
    const testo = $("body").text();
    const match = testo.match(/\d+(\.\d+)?\s?kWh/);

    if (!match) return null;

    return parseFloat(match[0]);
  } catch (err) {
    console.error("Errore scraping IlMeteo:", err.message);
    return null;
  }
}

// ===============================
// 🔁 LOGICA CACHE CITTÀ
// ===============================
async function gestisciCache(citta, tipo = "oggi") {
  const oggi = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("meteo_cache")
    .select("*")
    .eq("citta", citta)
    .maybeSingle();

  if (error) throw error;

  // se non esiste → prima volta
  if (!data) {
    const nuovoValore = await prendiValore(citta, tipo);
    await supabase.from("meteo_cache").insert({
      citta,
      valore_oggi: tipo === "oggi" ? nuovoValore : null,
      valore_domani: tipo === "domani" ? nuovoValore : null,
      valore_ieri: null,
      data_aggiornamento: oggi
    });
    return null;
  }

  // se giorno nuovo → aggiorna
  if (data.data_aggiornamento !== oggi) {
    const nuovoOggi = await prendiValore(citta, "oggi");
    const nuovoDomani = await prendiValore(citta, "domani");

    await supabase
      .from("meteo_cache")
      .update({
        valore_ieri: data.valore_oggi,
        valore_oggi: nuovoOggi,
        valore_domani: nuovoDomani,
        data_aggiornamento: oggi
      })
      .eq("citta", citta);

    return tipo === "oggi" ? data.valore_oggi : data.valore_domani;
  }

  // stesso giorno → restituisco da cache
  if (tipo === "oggi") return data.valore_ieri;
  if (tipo === "domani") return data.valore_domani;

  return null;
}

// ===============================
// 🌤 ENDPOINT /meteo (oggi → mostra ieri)
// ===============================
app.get("/meteo", async (req, res) => {
  try {
    let citta = req.query.citta || "somma+vesuviana";
    citta = citta.trim().replace(/\s+/g, "+");

    const valore = await gestisciCache(citta, "oggi");

    res.json({
      successo: true,
      valore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ successo: false, errore: err.message });
  }
});

// ===============================
// 🌤 ENDPOINT /meteo/domani
// ===============================
app.get("/meteo/domani", async (req, res) => {
  try {
    let citta = req.query.citta || "somma+vesuviana";
    citta = citta.trim().replace(/\s+/g, "+");

    const valore = await gestisciCache(citta, "domani");

    res.json({
      successo: true,
      valore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ successo: false, errore: err.message });
  }
});

// ===============================
// 📄 ROUTE STATICHE
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

// ===============================
// 🚀 START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
