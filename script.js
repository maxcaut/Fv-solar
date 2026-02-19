const valoreEl = document.getElementById("valore");
const refreshBtn = document.getElementById("refreshBtn");

// Inserisci qui il tuo endpoint Render o locale
const API_URL = "https://tuo-progetto.onrender.com/meteo";

async function caricaValore() {
  valoreEl.textContent = "Caricamento...";
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (data.successo && data.valore) {
      valoreEl.textContent = data.valore;
    } else {
      valoreEl.textContent = "Errore nel recupero";
    }
  } catch (error) {
    valoreEl.textContent = "Errore connessione";
    console.error(error);
  }
}

// Carica subito al caricamento della pagina
window.addEventListener("load", caricaValore);

// Aggiorna al click
refreshBtn.addEventListener("click", caricaValore);
