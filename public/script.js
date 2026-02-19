const valoreEl = document.getElementById("valore");
const loadBtn = document.getElementById("loadBtn");
const cittaInput = document.getElementById("cittaInput");

async function caricaValore(citta) {
  valoreEl.textContent = "Caricamento dati...";

  try {
    const res = await fetch(`/meteo?citta=${encodeURIComponent(citta)}`);
    const data = await res.json();

    if (data.successo && data.valore) {
      valoreEl.textContent = `${data.valore}`;
    } else {
      valoreEl.textContent = "Errore nel recupero";
    }
  } catch (error) {
    valoreEl.textContent = "Errore connessione";
    console.error(error);
  }
}

// Aggiorna al click
loadBtn.addEventListener("click", () => {
  const citta = cittaInput.value.trim();
  if (citta) caricaValore(citta);
});

// Esegui caricamento automatico se vuoi una città default
window.addEventListener("load", () => {
  const defaultCity = "somma vesuviana";
  cittaInput.value = defaultCity;
  caricaValore(defaultCity);
});
