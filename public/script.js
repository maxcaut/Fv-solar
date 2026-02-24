const valoreEl = document.getElementById("valore");
const loadBtn = document.getElementById("loadBtn");
const cittaInput = document.getElementById("cittaInput");
const potenzaInput = document.getElementById("potenzaInput");
const loginScreen = document.getElementById("login-screen");
const MainScreen = document.getElementById("main-screen");
const loginPassword = document.getElementById("loginPassword");
const resetpassbtn = document.getElementById("resetPasswordBtn");
const resetScreen = document.getElementById("reset-screen");
const submitNewPasswordBtn = document.getElementById("submitNewPassword");
const messaggioReset = document.getElementById("messaggio-reset");
const changetbtn = document.getElementById("changetbtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordDiv = document.getElementById("changePasswordDiv");
const submitNewPasswordLogged = document.getElementById("submitNewPasswordLogged");
const registrati = document.getElementById("registrati");
const accedi = document.getElementById("accedi");
const preRegistrati = document.getElementById("pre-registrati");
const PrivacyPolicy = document.getElementById("privacy");
const preBack = document.getElementById("pre-back");
const h1registrati = document.getElementById("h1registrati");
const h1accedi = document.getElementById("h1accedi");

const SUPABASE_URL = "https://czdakmcnkqvcxwkgyhwx.supabase.co";       // dal tuo progetto
const SUPABASE_ANON_KEY = "sb_publishable_4azTkKHrQCK-T-7rlj5Hzg_3WeWnLcK"; // dal tuo progetto

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



//nascondo main screen e reset screen

MainScreen.style.display = "none";
resetScreen.style.display="none";
changePasswordDiv.style.display = "none";
registrati.style.display ="none";
PrivacyPolicy.style.display = "none";
preBack.style.display = "none";
h1registrati.style.display = "none";




function preregistrati(){
  accedi.style.display = "none";
  resetpassbtn.style.display = "none";
  preRegistrati.style.display = "none";
  h1accedi.style.display = "none";
  registrati.style.display ="block";
  PrivacyPolicy.style.display = "block";
  preBack.style.display = "block";
  h1registrati.style.display = "block";
  

};


function relo(){
  location.reload();
}


async function caricaValore(citta) {
  valoreEl.textContent = "Caricamento dati...";

  let numero = parseFloat(potenzaInput.value); 
  if(isNaN(numero)|| numero <= 0){
    numero = 3;
    console.log(numero);
  };
  let fattore = numero/3;

  document.getElementById("potenza-impianto").textContent = `Per un impianto da ${numero} kWh`;
  

  try {
    const res = await fetch(`/meteo?citta=${encodeURIComponent(citta)}`);
    const data = await res.json();

    if (data.successo && data.valore) {
      valoreEl.textContent = `${(parseFloat(data.valore) * fattore).toFixed(1)} kWh Totali`;
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


// login tramite tasto invio
loginPassword.addEventListener("keydown", (event) => {
  if(event.key === "Enter"){
    handleLogin();
  }
})


/*Esegui caricamento automatico se vuoi una città default
window.addEventListener("load", () => {
  const defaultCity = "somma vesuviana";
  cittaInput.value = defaultCity;
  caricaValore(defaultCity);
});*/



//salvare dati
async function salvadati() {

  const { data: { session } } = await sb.auth.getSession()

  if (!session) {
    alert("Effettua il login prima di salvare")
    return
  }

  const userId = session.user.id

  // ora puoi salvare nel database
  const { error } = await sb
    .from("profiles")
    .insert([
      {
        user_id: userId,
        citta: document.getElementById("cittaInput").value,
        impianto_kw: document.getElementById("potenzaInput").value
      }
    ])

  if (error) {
    console.error(error)
  } else {
    alert("Dati salvati!")
  }
  
}



// carica valori da database

async function caricaDatiUtente() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) return;

  const userId = session.user.id;

  const { data, error } = await sb
    .from("profiles")
    .select("citta, impianto_kw")
    .eq("user_id", userId)
    .maybeSingle(); // prende un solo record e se nn trova nnt pacienz

  if (error) {
    console.log("Errore recupero dati:" + error);
    return;
  }

  if (data) {
    // Inserisce nei campi input
    cittaInput.value = data.citta;
    potenzaInput.value = data.impianto_kw;

    // Aggiorna automaticamente la stima
    caricaValore(data.citta);
  }

  if (!data) {
    alert("Ops, i tuoi dati non sono ancora memorizzati. Salvali per vedere la stima automatica.");
    return;
  }
}




// logout
async function logout() {
  await sb.auth.signOut();
  location.reload(); // Ricarica per bloccare la visualizzazione
}



// Pulsante reset password
resetpassbtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();

  if (!email) {
    alert("Inserisci la tua email per ricevere il link di reset.");
    return;
  }

  try {
    const { data, error } = await sb.auth.resetPasswordForEmail(email, {
      // L'utente torna alla stessa pagina login dopo il reset
      redirectTo: window.location.origin
    });

    if (error) {
      console.error("Errore invio email reset:", error);
      alert("Errore: controlla l'email inserita.");
    } else {
      alert("Email di reset inviata! Controlla la tua casella di posta.");
    }
  } catch (err) {
    console.error(err);
    alert("Errore durante la richiesta di reset.");
  }
});





// 1. Funzione per gestire il Login
async function handleLogin() {
    
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Errore di accesso: " + error.message);
    } else {
        checkUser(); // Verifica l'utente dopo il login
    }
}



// 2. registrazione utente

async function signup() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await sb.auth.signUp({
      email: email,
      password: password,
      });
  if (error) alert("Errore registrazione:"+ error.message);
  else alert("Registrazione ok: a breve riceverai una E-Mail. Conferma Li il tuo Account.");
}




// 3. Modifica la funzione init per controllare la sessione
async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();

    if (session) {
        // Utente loggato: mostra la dashboard e carica i dati
        loginScreen.style.display = "none";
        MainScreen.style.display = "block";
        resetScreen.style.display = "none";
        caricaDatiUtente();
    } else {
        // Utente non loggato: mostra solo il login
        loginScreen.style.display = "block";
        MainScreen.style.display = "none";
        resetScreen.style.display = "none";
        
    }
}



// RESET PASSWORD - schermo e invio nuova password
window.addEventListener("load", async () => {

  let accessToken = null;
  let type = null;

  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    accessToken = hashParams.get("access_token");
    type = hashParams.get("type");
  }

  // 🔐 SOLO se è un vero reset password
  if (accessToken && type === "recovery") {
    window.resetAccessToken = accessToken;
    loginScreen.style.display = "none";
    MainScreen.style.display = "none";
    resetScreen.style.display = "block";
    return; 
  }

  // ✅ Se è conferma email (signup)
  if (accessToken && type === "signup") {
    // Supabase crea automaticamente la sessione
    await sb.auth.getSession();
    window.location.hash = ""; // pulisci URL
  }

  // Normale controllo utente
  await checkUser();
});


// cambio password con link
submitNewPasswordBtn.addEventListener("click", async () => {
  const nuovaPassword = document.getElementById("nuovaPassword").value.trim();
  const token = window.resetAccessToken;

  if(!nuovaPassword || !token){ 
    alert("Dati mancanti. Link non valido."); 
    return;
  }

  try{
    const { error } = await sb.auth.updateUser({ access_token: token, password: nuovaPassword });
    if(error){ 
     alert("Errore: " + error.message); 
    }
    else{ 
      alert("Password aggiornata con successo! "); 
      window.resetAccessToken = null; 
      window.location.reload();
    }
  } catch(err){
    console.error(err);
    alert("Errore durante il reset della password.");
  }
});



// cambio password da loggato

// Mostra il campo nuova password al click
changePasswordBtn.addEventListener("click", () => {
  MainScreen.style.display = "none";
  changePasswordDiv.style.display = "block";
});

// Invia la nuova password direttamente a Supabase
submitNewPasswordLogged.addEventListener("click", async () => {
  const nuovaPassword = document.getElementById("newPasswordInput").value.trim();

  if (!nuovaPassword) {
    alert("Inserisci una nuova password.");
    return;
  }

  try {
    const { data, error } = await sb.auth.updateUser({
      password: nuovaPassword
    });

    if (error) {
      alert("Errore: " + error.message);
    } else {
      alert("Password aggiornata con successo!");
      document.getElementById("newPasswordInput").value = "";
      changePasswordDiv.style.display = "none";
      MainScreen.style.display = "block";
    }
  } catch (err) {
    console.error(err);
    alert("Errore durante il cambio password.");
  }
});

function annulla(){
      changePasswordDiv.style.display = "none";
      MainScreen.style.display = "block";
};


