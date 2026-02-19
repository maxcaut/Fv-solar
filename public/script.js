const valoreEl = document.getElementById("valore");
const loadBtn = document.getElementById("loadBtn");
const cittaInput = document.getElementById("cittaInput");
const potenzaInput = document.getElementById("potenzaInput");

let numero = parseFloat(potenzaInput.value);
let fattore = numero/3;

async function caricaValore(citta) {
  valoreEl.textContent = "Caricamento dati...";

  try {
    const res = await fetch(`/meteo?citta=${encodeURIComponent(citta)}`);
    const data = await res.json();

    if (data.successo && data.valore) {
      valoreEl.textContent = `${data.valore*fattore} Totali`;
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
