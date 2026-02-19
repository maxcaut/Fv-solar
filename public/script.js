const valoreEl = document.getElementById("valore");
const refreshBtn = document.getElementById("refreshBtn");

const API_URL = "/meteo"; // chiamata al server stesso

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

window.addEventListener("load", caricaValore);
refreshBtn.addEventListener("click", caricaValore);
