/* =========================================================
   MONEY TRANSFER BEAST
   DEMO / PROTOTYPE ONLY

   No real M-PESA, Airtel, T-Kash, bank or card
   transactions are performed by this prototype.

   SAFETY NOTES (read before editing):
   - PIN is never stored in plaintext. It is hashed with
     SHA-256 + a per-user random salt, using the browser
     Web Crypto API.
   - 3 failed PIN attempts trigger a 30-second cooldown.
   - Money movement always goes through a confirmation
     step, then the PIN modal.
   - All user-provided strings are escaped with escapeHTML().
   - The "SAMPLE" badge on M-PESA is intentional: the demo
     starts with a fake KES 5,000 balance.

   RECEIVE FLOW (Buyer borrows seller's phone):
   - Seller opens Receive on their own phone.
   - Buyer taps Buyer payment, logs in with their own
     phone + National ID + PIN.
   - Buyer picks a source (balances hidden).
   - App auto-fills seller as the destination.
   - Buyer pays, authorizes with PIN.
   - Success screen + 5s countdown, then reset.
   - Seller session is never logged out.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

"use strict";


/* ================= CONFIG ================= */

const STORAGE_KEY =
  "money_transfer_beast_replacement_v3";

const THEME_KEY =
  "money_transfer_beast_theme";

const DEMO_ADMIN_PASSWORD =
  "admin123";

const REGISTERED_AGENTS = {
  "0712345678": "BEAST Demo Safaricom Agent",
  "0720000000": "Safaricom Registered Agent",
  "0711111111": "Safaricom Registered Agent"
};

const REGISTERED_AGENT_CODES = {
  "AGENT-001": "BEAST Demo Agent 001",
  "AGENT-002": "BEAST Demo Agent 002",
  "BEAST-AG":  "BEAST Demo Agent"
};

/*
  Demo buyers — used on the Receive screen when a
  buyer borrows the seller's phone.
  These are NOT the registered user's account.
  PINs are hashed on load; plain PINs never persist.
*/
const DEMO_BUYERS = [
  {
    phone: "0722000001",
    nationalId: "11111111",
    pin: "1111",
    name: "Alice Njeri",
    sources: {
      mpesa: { enabled: true, balance: 12500 },
      wallet: { enabled: true, balance: 0 }
    }
  },
  {
    phone: "0722000002",
    nationalId: "22222222",
    pin: "2222",
    name: "Brian Otieno",
    sources: {
      mpesa: { enabled: true, balance: 3200 },
      wallet: { enabled: true, balance: 500 }
    }
  },
  {
    phone: "0722000003",
    nationalId: "33333333",
    pin: "3333",
    name: "Carol Wambui",
    sources: {
      mpesa: { enabled: true, balance: 48000 },
      wallet: { enabled: true, balance: 1200 }
    }
  }
];

const SOURCE_NAMES = {
  mpesa:  "M-PESA",
  tkash:  "T-Kash",
  airtel: "Airtel Money",
  bank:   "Bank Account",
  card:   "Card",
  wallet: "BEAST Wallet"
};

const SAMPLE_BALANCE_SOURCES = new Set(["mpesa"]);

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCKOUT_MS   = 30 * 1000;
const AUTO_LOCK_MS     = 2 * 60 * 1000;

const BUYER_SUCCESS_MS = 5000;


/* ================= STATE ================= */

function defaultState(){

  return {

    registered:false,

    user:{
      name:"",
      phone:"",
      nationalId:"",
      beastId:"",
      pinHash:"",
      pinSalt:""
    },

    sources:{
      mpesa:{
        balance:5000,
        enabled:true,
        account:"0712345678"
      },
      tkash:{
        balance:0,
        enabled:false,
        account:""
      },
      airtel:{
        balance:0,
        enabled:false,
        account:""
      },
      bank:{
        balance:0,
        enabled:false,
        account:"",
        bankName:""
      },
      card:{
        balance:0,
        enabled:false,
        account:"",
        cardName:"",
        last4:""
      },
      wallet:{
        balance:0,
        enabled:true,
        account:"BEAST-WALLET"
      }
    },

    transactions:[],

    notifications:[],

    securityEvents:[],

    owner:{
      fees:0,
      providerCosts:0,
      transactions:0,
      volume:0
    },

    settings:{
      notifications:true,
      screenSecurity:true,
      biometric:false
    },

    security:{
      failedPinAttempts:0,
      lockoutUntil:0
    },

    adminUnlocked:false

  };

}


function loadState(){

  try{

    const saved =
      JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

    if(saved){

      const base = defaultState();

      return {

        ...base,
        ...saved,

        user:{
          ...base.user,
          ...(saved.user || {})
        },

        sources:{
          ...base.sources,
          ...(saved.sources || {})
        },

        owner:{
          ...base.owner,
          ...(saved.owner || {})
        },

        settings:{
          ...base.settings,
          ...(saved.settings || {})
        },

        security:{
          ...base.security,
          ...(saved.security || {})
        }

      };

    }

  }catch(error){

    console.error(error);

  }

  return defaultState();

}


const state = loadState();

let pendingAction = null;

let cameraStream = null;

let autoLockTimer = null;

/* Buyer flow state (in-memory only) */

let buyerSession = null;

let buyerStep = 1;

let buyerSuccessTimer = null;


/* ================= HELPERS ================= */

function $(id){
  return document.getElementById(id);
}

function money(value){
  return `KES ${Number(value || 0)
    .toLocaleString("en-KE",{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })}`;
}

function normalizePhone(value=""){

  let phone =
    String(value)
    .trim()
    .replace(/\s+/g,"")
    .replace(/-/g,"");

  if(phone.startsWith("+254")){
    phone = "0" + phone.slice(4);
  }
  else if(phone.startsWith("254")){
    phone = "0" + phone.slice(3);
  }

  return phone;

}

function validPhone(value){
  return /^(07|01)\d{8}$/.test(normalizePhone(value));
}

function internationalPhone(value){

  const phone = normalizePhone(value);

  if(!validPhone(phone)) return "";

  return "+254" + phone.slice(1);

}

function validAgent(value){
  return String(value || "").trim().length >= 4;
}

function save(){
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

function randomDigits(length){
  return Math.floor(
    Math.random() * Math.pow(10,length)
  )
  .toString()
  .padStart(length,"0");
}

function randomHex(bytes){
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

function generateBeastId(){
  return `BEAST-${randomDigits(6)}`;
}

function generateReference(){
  return `BST-${Date.now()
    .toString()
    .slice(-8)}-${randomDigits(3)}`;
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function dateText(value){
  return new Date(value).toLocaleString("en-KE");
}

function toast(message){

  const element = $("toast");
  if(!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(element._timer);
  element._timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2600);

}


/* ================= PIN HASHING ================= */

async function hashPin(pin, saltHex){

  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + ":" + pin);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");

}

async function setPin(pin){

  state.user.pinSalt = randomHex(16);
  state.user.pinHash = await hashPin(pin, state.user.pinSalt);
  state.user.pin = undefined;

}

async function verifyPin(pin){

  if(!state.user.pinHash || !state.user.pinSalt) return false;
  const hash = await hashPin(pin, state.user.pinSalt);
  return hash === state.user.pinHash;

}

function pinLocked(){
  return (
    state.security.lockoutUntil &&
    Date.now() < state.security.lockoutUntil
  );
}

function secondsLeft(){
  return Math.ceil(
    (state.security.lockoutUntil - Date.now()) / 1000
  );
}


/* ================= DEMO BUYER HASHING ================= */

/* Pre-hash each demo buyer's PIN once at startup */

const demoBuyerHashes = {};

async function buildDemoBuyerHashes(){

  for(const buyer of DEMO_BUYERS){

    const salt = randomHex(16);

    demoBuyerHashes[buyer.phone] = {
      salt,
      hash: await hashPin(buyer.pin, salt)
    };

  }

}

async function verifyDemoBuyerPin(phone, pin){

  const entry = demoBuyerHashes[phone];

  if(!entry) return false;

  const attempt = await hashPin(pin, entry.salt);

  return attempt === entry.hash;

}


/* ================= THEME ================= */

function setTheme(theme){

  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);

  $("darkModeButton")?.classList.toggle("active", theme === "dark");
  $("lightModeButton")?.classList.toggle("active", theme === "light");

}

function loadTheme(){
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  setTheme(theme);
}


/* ================= NAVIGATION ================= */

const screenMap = {
  home:"homeScreen",
  send:"sendScreen",
  receive:"receiveScreen",
  withdraw:"withdrawScreen",
  lipa:"lipaScreen",
  history:"historyScreen",
  profile:"profileScreen",
  security:"securityScreen",
  notifications:"notificationsScreen",
  settings:"settingsScreen",
  admin:"adminScreen",
  balance:"balanceScreen",
  beastOwn:"beastOwnScreen"
};

const SENSITIVE_FIELDS = [
  "regPin","regPin2",
  "sendAmount","sendPhone",
  "receiveAmount",
  "withdrawAmount","agentNumber",
  "lipaAmount",
  "depositAmount","agentDepositAmount",
  "agentDepositPin",
  "authorizationPin",
  "oldPin","newPin","confirmNewPin",
  "adminPassword",
  "buyerLoginPhone","buyerLoginNationalId","buyerLoginPin",
  "buyerPayAmount"
];

function clearSensitiveFields(){

  SENSITIVE_FIELDS.forEach(id => {
    const el = $(id);
    if(el) el.value = "";
  });

  [
    "recipientVerification",
    "receiveDestinationVerification",
    "buyerVerification",
    "agentVerification",
    "lipaVerification",
    "agentDepositVerification",
    "loginBalance"
  ].forEach(id => {
    $(id)?.classList.add("hidden");
  });

}

function showScreen(name){

  const screen = screenMap[name] || name;

  document
    .querySelectorAll(".app-screen")
    .forEach(el => el.classList.remove("active"));

  const target = $(screen);
  if(target) target.classList.add("active");

  clearSensitiveFields();
  closeMenu();
  resetAutoLock();

  if(name === "receive"){
    resetBuyerFlow();
    renderReceiveSellerLine();
  }

  window.scrollTo({ top:0, behavior:"smooth" });

  renderEverything();

}

function openMenu(){
  $("menuDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("open");
}

function closeMenu(){
  $("menuDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("open");
}


/* ================= AUTO LOCK ================= */

function resetAutoLock(){

  clearTimeout(autoLockTimer);

  if(!state.registered) return;

  autoLockTimer = setTimeout(() => {

    if(!state.registered) return;

    addSecurity("Session auto-locked after inactivity.");
    save();

    showScreen("balance");
    toast("Session locked. Verify your identity.");

  }, AUTO_LOCK_MS);

}


/* ================= REGISTRATION ================= */

function setupRegistration(){

  if(!$("regNext1")) return;

  $("regNext1").onclick = () => {

    const name = $("regName").value.trim();
    const phone = normalizePhone($("regPhone").value);
    const nationalId = $("regNationalId").value.trim();

    if(name.length < 2){
      toast("Enter your full name.");
      return;
    }

    if(!validPhone(phone)){
      toast("Enter a valid Kenyan phone number.");
      return;
    }

    if(nationalId.length < 5){
      toast("Enter your National ID.");
      return;
    }

    state.user.name = name;
    state.user.phone = phone;
    state.user.nationalId = nationalId;

    $("regStep1").classList.add("hidden");
    $("regStep2").classList.remove("hidden");

    document.querySelectorAll(".step")[1]?.classList.add("active");

  };

  $("regNext2").onclick = async () => {

    const pin = $("regPin").value;
    const confirmPin = $("regPin2").value;

    if(!/^\d{4}$/.test(pin)){
      toast("PIN must contain 4 digits.");
      return;
    }

    if(pin !== confirmPin){
      toast("PINs do not match.");
      return;
    }

    await setPin(pin);

    $("registrationSummary").innerHTML = `

      <b>${escapeHTML(state.user.name)}</b><br>

      Phone: ${escapeHTML(state.user.phone)}<br>

      International: ${escapeHTML(internationalPhone(state.user.phone))}<br>

      National ID: ${escapeHTML(state.user.nationalId)}<br><br>

      Your BEAST ID will be generated after confirmation.

      <br><br>

      <small class="muted">
        Your PIN is stored as a salted SHA-256 hash,
        never as plaintext.
      </small>

    `;

    $("regStep2").classList.add("hidden");
    $("regStep3").classList.remove("hidden");

    document.querySelectorAll(".step")[2]?.classList.add("active");

  };

  $("finishRegistration").onclick = () => {

    state.user.beastId = generateBeastId();
    state.registered = true;

    addNotification(
      "BEAST ID created",
      `Your BEAST ID is ${state.user.beastId}.`
    );

    addSecurity("New BEAST registration completed.");
    save();

    toast("BEAST account created.");
    showScreen("home");

  };

}


/* ================= BALANCE ================= */

function totalBalance(){

  return Object.values(state.sources)
    .reduce((total, source) => {
      return total + (source.enabled ? Number(source.balance) : 0);
    }, 0);

}


/* ================= SOURCE CARDS ================= */

function renderSources(containerId){

  const container = $(containerId);
  if(!container) return;

  container.innerHTML =

    Object.entries(state.sources)

    .map(([key, source]) => {

      const icon =
        key === "mpesa"  ? "📱" :
        key === "tkash"  ? "📲" :
        key === "airtel" ? "📲" :
        key === "bank"   ? "🏦" :
        key === "card"   ? "💳" : "🐾";

      let details = source.account || "Not linked";

      if(key === "bank" && source.bankName){
        details = `${source.bankName} • ${source.account}`;
      }

      if(key === "card"){
        details = source.cardName
          ? `${source.cardName} •••• ${source.last4 || "----"}`
          : "Not linked";
      }

      const isSample = SAMPLE_BALANCE_SOURCES.has(key);

      return `

        <div class="source-card">

          <div class="source-top">

            <span class="source-icon">${icon}</span>

            <span class="pill ${source.enabled ? "green" : "red"}">
              ${source.enabled ? "DEMO ACTIVE" : "OFF"}
            </span>

          </div>

          <div>

            <strong>${SOURCE_NAMES[key]}</strong>

            <small>${escapeHTML(details)}</small>

            ${isSample ? `
              <span class="pill blue" style="margin-top:4px;">
                SAMPLE BALANCE
              </span>
            ` : ""}

          </div>

          <strong>${money(source.balance)}</strong>

        </div>

      `;

    })

    .join("");

}


/* ================= SOURCE SELECTS ================= */

function fillSourceSelects(){

  ["sendSource","receiveSource","withdrawSource","lipaSource"]

  .forEach(id => {

    const select = $(id);
    if(!select) return;

    const current = select.value;

    select.innerHTML =

      Object.entries(state.sources)
        .filter(([, source]) => source.enabled)
        .map(([key]) => `
          <option value="${key}">
            ${SOURCE_NAMES[key]}
          </option>
        `)
        .join("");

    if(current && state.sources[current]?.enabled){
      select.value = current;
    }

  });

}


/* ================= SOURCE MANAGER ================= */

function setupSourceManager(){

  const type = $("sourceType");
  const bankFields = $("bankSourceFields");
  const cardFields = $("cardSourceFields");

  function updateFields(){

    if(!type) return;

    if(bankFields){
      bankFields.classList.toggle("hidden", type.value !== "bank");
    }

    if(cardFields){
      cardFields.classList.toggle("hidden", type.value !== "card");
    }

  }

  type?.addEventListener("change", updateFields);

  $("saveSourceButton")?.addEventListener("click", () => {

    const sourceType = type.value;
    const account = $("sourceAccount")?.value.trim();

    if(sourceType !== "wallet" && !account){
      toast("Enter the account or phone number.");
      return;
    }

    if(
      sourceType !== "wallet" &&
      sourceType !== "bank" &&
      sourceType !== "card" &&
      !validPhone(account)
    ){
      toast("Enter a valid Kenyan phone number.");
      return;
    }

    const source = state.sources[sourceType];

    if(!source){
      toast("Invalid payment source.");
      return;
    }

    source.enabled = true;
    source.account = account;

    if(sourceType === "bank"){

      const bankName = $("bankName")?.value.trim();

      if(!bankName){
        toast("Select or enter the bank name.");
        source.enabled = false;
        return;
      }

      source.bankName = bankName;

    }

    if(sourceType === "card"){

      const cardName = $("cardName")?.value.trim();
      const last4 = $("cardLast4")?.value.trim();

      if(!cardName){
        toast("Enter the card name.");
        source.enabled = false;
        return;
      }

      if(!/^\d{4}$/.test(last4)){
        toast("Enter the last 4 card digits.");
        source.enabled = false;
        return;
      }

      source.cardName = cardName;
      source.last4 = last4;

    }

    const balance = Number($("sourceBalance")?.value || 0);

    if(balance > 0){
      source.balance = balance;
    }

    addSecurity(`${SOURCE_NAMES[sourceType]} linked to BEAST.`);
    addNotification(
      "Payment source linked",
      `${SOURCE_NAMES[sourceType]} is now linked to your BEAST account.`
    );

    save();
    toast(`${SOURCE_NAMES[sourceType]} linked successfully.`);
    renderEverything();

  });

  updateFields();

}


/* ================= FEES ================= */

function beastFee(amount){

  amount = Number(amount || 0);
  if(amount <= 0) return 0;
  if(amount <= 1000) return 7;
  if(amount <= 10000) return 30;
  return 50;

}

function providerCost(source, amount){

  amount = Number(amount || 0);

  if(source === "wallet") return 0;

  if(source === "mpesa"){
    if(amount <= 100) return 0;
    if(amount <= 1500) return 5;
    if(amount <= 5000) return 9;
    if(amount <= 20000) return 11;
    if(amount <= 250000) return 13;
    return 20;
  }

  if(source === "tkash")  return amount <= 1500 ? 5 : 10;
  if(source === "airtel") return amount <= 1500 ? 5 : 10;
  if(source === "bank")   return amount <= 10000 ? 3 : 10;
  if(source === "card")   return amount <= 10000 ? 8 : 15;

  return 0;

}

function costPreview(source, amount){

  amount = Number(amount || 0);

  const fee = beastFee(amount);
  const provider = providerCost(source, amount);
  const total = amount + fee + provider;

  return `
    <b>Cost preview</b><br>
    Amount: ${money(amount)}<br>
    BEAST fee: ${money(fee)}<br>
    Provider cost: ${money(provider)}<br><br>
    <strong>Total deducted: ${money(total)}</strong>
  `;

}

function setupCostPreview(){

  const setups = [
    ["sendCostPreview","sendSource","sendAmount"],
    ["withdrawCostPreview","withdrawSource","withdrawAmount"],
    ["lipaCostPreview","lipaSource","lipaAmount"]
  ];

  setups.forEach(([preview, source, amount]) => {

    const update = () => {
      const box = $(preview);
      if(!box) return;
      box.innerHTML = costPreview($(source)?.value, $(amount)?.value);
    };

    $(source)?.addEventListener("change", update);
    $(amount)?.addEventListener("input", update);

    update();

  });

}


/* ================= RECIPIENT ================= */

function getRecipient(phone){

  phone = normalizePhone(phone);
  if(!validPhone(phone)) return null;

  const demoNames = {
    "0720000000": "John Kamau (demo)",
    "0711111111": "Mary Wanjiku (demo)",
    "0799999999": "Peter Otieno (demo)",
    "0112345678": "BEAST Demo Business"
  };

  if(phone === state.user.phone){
    return {
      name: state.user.name,
      phone,
      beastId: state.user.beastId,
      own: true
    };
  }

  return {
    name: demoNames[phone] || "Demo recipient",
    phone,
    beastId: "Demo destination",
    own: false
  };

}

function displayVerification(id, data, title){

  const box = $(id);
  if(!box) return;

  box.classList.remove("hidden");

  box.innerHTML = `
    <strong>✓ ${escapeHTML(title)}</strong>
    ${escapeHTML(data.name)}<br>
    ${escapeHTML(data.phone || data.id)}<br>
    <small>${escapeHTML(data.beastId || "Demo destination")}</small>
  `;

}


/* ================= CONFIRM MODAL ================= */

function askConfirmation(summaryHTML, onConfirm){

  if(!$("confirmModal")){
    pendingAction = onConfirm;
    openPinModal("Confirm");
    return;
  }

  $("confirmBody").innerHTML = summaryHTML;
  $("confirmModal").classList.remove("hidden");

  $("confirmYes").onclick = () => {
    $("confirmModal").classList.add("hidden");
    onConfirm();
  };

  $("confirmNo").onclick = () => {
    $("confirmModal").classList.add("hidden");
    pendingAction = null;
  };

  $("confirmClose")?.addEventListener("click", () => {
    $("confirmModal").classList.add("hidden");
    pendingAction = null;
  });

}

function buildConfirmationHTML({
  title, recipientName, recipient, amount, source, fee, provider
}){

  const total = Number(amount) + Number(fee) + Number(provider);

  return `
    <b>${escapeHTML(title)}</b><br><br>
    Recipient: ${escapeHTML(recipientName)}<br>
    Destination: ${escapeHTML(recipient)}<br>
    Source: ${escapeHTML(SOURCE_NAMES[source] || source)}<br><br>
    Amount: ${money(amount)}<br>
    BEAST fee: ${money(fee)}<br>
    Provider cost: ${money(provider)}<br><br>
    <strong>Total deducted: ${money(total)}</strong>
  `;

}


/* ================= SEND ================= */

function setupSend(){

  $("verifyRecipient")?.addEventListener("click", () => {

    const recipient = getRecipient($("sendPhone").value);

    if(!recipient){
      toast("Enter a valid recipient phone.");
      return;
    }

    if(recipient.own){
      toast("You cannot send to yourself.");
      return;
    }

    displayVerification(
      "recipientVerification",
      recipient,
      "Demo recipient"
    );

  });

  $("sendMoneyButton")?.addEventListener("click", () => {

    const recipient = getRecipient($("sendPhone").value);
    const amount = Number($("sendAmount").value);
    const source = $("sendSource").value;

    if(!recipient || recipient.own){
      toast("Verify a valid recipient first.");
      return;
    }

    if(amount <= 0){
      toast("Enter an amount.");
      return;
    }

    const fee = beastFee(amount);
    const provider = providerCost(source, amount);

    askConfirmation(

      buildConfirmationHTML({
        title: "Confirm send",
        recipientName: recipient.name,
        recipient: recipient.phone,
        amount, source, fee, provider
      }),

      () => authorize("Send money", () => {

        completeTransaction({
          type: "Send",
          amount,
          source,
          recipient: recipient.phone,
          recipientName: recipient.name,
          description: `Send to ${recipient.name}`
        });

      })

    );

  });

}


/* ================= RECEIVE — TABS + BUYER FLOW ================= */

function setupReceiveTabs(){

  document.querySelectorAll("[data-rtab]").forEach(tab => {

    tab.addEventListener("click", () => {

      const target = tab.dataset.rtab;

      document.querySelectorAll("[data-rtab]").forEach(t =>
        t.classList.toggle("active", t === tab)
      );

      document.querySelectorAll(".receive-tab-panel").forEach(panel =>
        panel.classList.remove("active")
      );

      const panel =
        target === "buyer"   ? $("buyerTab")   :
        target === "deposit" ? $("depositTab") :
        $("agentTab");

      panel?.classList.add("active");

      // resetting buyer flow when leaving it
      if(target === "buyer"){
        resetBuyerFlow();
      }

      updateReceiveBackButton();

    });

  });

}


function renderReceiveSellerLine(){

  const line = $("receiveSellerLine");
  if(!line) return;

  if(!state.registered){
    line.textContent = "Paying: —";
    return;
  }

  line.textContent = `Paying: ${state.user.name} • ${state.user.beastId}`;

}


/* ---- Step navigation ---- */

function setBuyerStep(step){

  buyerStep = step;

  ["buyerStep1","buyerStep2","buyerStep3","buyerSuccessPanel"]
    .forEach(id => $(id)?.classList.remove("active"));

  if(step === 1) $("buyerStep1")?.classList.add("active");
  if(step === 2) $("buyerStep2")?.classList.add("active");
  if(step === 3) $("buyerStep3")?.classList.add("active");
  if(step === "success") $("buyerSuccessPanel")?.classList.add("active");

  document.querySelectorAll(".buyer-step").forEach(el => {

    const n = Number(el.dataset.bstep);

    el.classList.toggle("active", n === step);

  });

  updateReceiveBackButton();

}

function updateReceiveBackButton(){

  const btn = $("receiveBackButton");
  if(!btn) return;

  const buyerTabActive =
    $("buyerTab")?.classList.contains("active");

  if(!buyerTabActive){
    btn.classList.add("hidden");
    return;
  }

  // Hide the back arrow on step 1 and on success
  if(buyerStep === 1 || buyerStep === "success"){
    btn.classList.add("hidden");
  }
  else{
    btn.classList.remove("hidden");
  }

}

function handleReceiveBack(){

  if(buyerStep === 3){
    setBuyerStep(2);
    return;
  }

  if(buyerStep === 2){
    // Log the buyer out and go back to login
    buyerSession = null;
    setBuyerStep(1);

    if($("buyerLoginPhone")) $("buyerLoginPhone").value = "";
    if($("buyerLoginNationalId")) $("buyerLoginNationalId").value = "";
    if($("buyerLoginPin")) $("buyerLoginPin").value = "";

    return;
  }

}


/* ---- Buyer login ---- */

function setupBuyerFlow(){

  $("receiveBackButton")?.addEventListener("click", handleReceiveBack);

  $("buyerLoginButton")?.addEventListener("click", doBuyerLogin);

  $("buyerChooseSourceButton")?.addEventListener("click", () => {

    if(!buyerSession) return;

    if(!buyerSession.chosenSource){
      toast("Select an account first.");
      return;
    }

    renderBuyerStep3();
    setBuyerStep(3);

  });

  $("buyerPayAmount")?.addEventListener("input", updateBuyerCostPreview);

  $("buyerConfirmPayButton")?.addEventListener("click", doBuyerPay);

}


async function doBuyerLogin(){

  const phone = normalizePhone($("buyerLoginPhone").value);
  const nationalId = $("buyerLoginNationalId").value.trim();
  const pin = $("buyerLoginPin").value;

  if(!validPhone(phone)){
    toast("Enter a valid buyer phone number.");
    return;
  }

  if(!/^\d{5,}$/.test(nationalId)){
    toast("Enter the buyer's National ID.");
    return;
  }

  if(!/^\d{4}$/.test(pin)){
    toast("Enter the buyer's 4-digit BEAST PIN.");
    return;
  }

  const buyer = DEMO_BUYERS.find(b => b.phone === phone);

  if(!buyer){
    addSecurity(`Unknown buyer attempted login on Receive: ${phone}.`);
    save();
    toast("Buyer not found in the demo registry.");
    return;
  }

  if(buyer.nationalId !== nationalId){
    addSecurity(`Buyer National ID mismatch for ${phone}.`);
    save();
    toast("Buyer National ID does not match.");
    return;
  }

  const ok = await verifyDemoBuyerPin(phone, pin);

  if(!ok){
    addSecurity(`Failed buyer PIN attempt for ${phone}.`);
    save();
    toast("Incorrect buyer BEAST PIN.");
    return;
  }

  // Start a buyer session (in-memory only)
  buyerSession = {
    phone: buyer.phone,
    name: buyer.name,
    nationalId: buyer.nationalId,
    sources: JSON.parse(JSON.stringify(buyer.sources)),
    chosenSource: null
  };

  $("buyerLoginPin").value = "";

  renderBuyerStep2();
  setBuyerStep(2);

}


/* ---- Step 2 — show accounts, hide balances ---- */

function renderBuyerStep2(){

  if(!buyerSession) return;

  if($("buyerWelcomeLine")){
    $("buyerWelcomeLine").textContent =
      `Signed in as ${buyerSession.name}`;
  }

  const list = $("buyerSourcesList");
  if(!list) return;

  const entries = Object.entries(buyerSession.sources)
    .filter(([, src]) => src.enabled);

  list.innerHTML = entries.map(([key]) => {

    const icon =
      key === "mpesa"  ? "📱" :
      key === "tkash"  ? "📲" :
      key === "airtel" ? "📲" :
      key === "bank"   ? "🏦" :
      key === "card"   ? "💳" : "🐾";

    const selected =
      buyerSession.chosenSource === key ? " selected" : "";

    return `
      <button
        class="buyer-source-option${selected}"
        data-bsource="${key}">
        <span class="buyer-source-icon">${icon}</span>
        <span class="buyer-source-text">
          <strong>${SOURCE_NAMES[key]}</strong>
          <small>Balance hidden</small>
        </span>
      </button>
    `;

  }).join("");

  list.querySelectorAll("[data-bsource]").forEach(btn => {

    btn.addEventListener("click", () => {

      buyerSession.chosenSource = btn.dataset.bsource;

      list.querySelectorAll(".buyer-source-option")
        .forEach(b => b.classList.remove("selected"));

      btn.classList.add("selected");

      $("buyerChooseSourceButton").disabled = false;

    });

  });

  $("buyerChooseSourceButton").disabled = !buyerSession.chosenSource;

}


/* ---- Step 3 — amount + destination ---- */

function renderBuyerStep3(){

  if(!buyerSession) return;

  if($("buyerDestinationName")){
    $("buyerDestinationName").textContent = state.user.name;
  }

  if($("buyerDestinationId")){
    $("buyerDestinationId").textContent =
      `${state.user.beastId} • ${internationalPhone(state.user.phone)}`;
  }

  if($("buyerChosenSourceName")){
    $("buyerChosenSourceName").textContent =
      SOURCE_NAMES[buyerSession.chosenSource] || "—";
  }

  if($("buyerPayAmount")) $("buyerPayAmount").value = "";

  updateBuyerCostPreview();

}

function updateBuyerCostPreview(){

  const box = $("buyerCostPreview");
  if(!box || !buyerSession) return;

  const amount = Number($("buyerPayAmount")?.value || 0);
  const source = buyerSession.chosenSource;

  if(amount <= 0){
    box.innerHTML = `
      <b>Cost preview</b><br>
      Enter an amount to calculate the buyer cost.
    `;
    return;
  }

  box.innerHTML = costPreview(source, amount);

}


/* ---- Pay ---- */

function doBuyerPay(){

  if(!buyerSession) return;

  const amount = Number($("buyerPayAmount").value);

  if(amount <= 0){
    toast("Enter an amount.");
    return;
  }

  const source = buyerSession.chosenSource;
  const fee = beastFee(amount);
  const provider = providerCost(source, amount);
  const total = amount + fee + provider;

  const src = buyerSession.sources[source];

  if(!src || src.balance < total){
    toast("Buyer has insufficient balance for this payment.");
    return;
  }

  askConfirmation(

    `
      <b>Confirm buyer payment</b><br><br>
      Buyer: ${escapeHTML(buyerSession.name)}<br>
      Paying to: ${escapeHTML(state.user.name)}<br>
      Destination: ${escapeHTML(state.user.beastId)}<br>
      Source: ${escapeHTML(SOURCE_NAMES[source])}<br><br>
      Amount: ${money(amount)}<br>
      BEAST fee: ${money(fee)}<br>
      Provider cost: ${money(provider)}<br><br>
      <strong>Total deducted from buyer: ${money(total)}</strong>
    `,

    () => authorizeBuyerPin(amount, source, fee, provider)

  );

}


function authorizeBuyerPin(amount, source, fee, provider){

  // Use a scoped PIN modal for the buyer flow
  $("pinPurpose").textContent =
    `Buyer authorization — ${buyerSession.name}`;

  $("authorizationPin").value = "";

  if($("pinError")){
    $("pinError").textContent = "";
    $("pinError").classList.add("hidden");
  }

  $("pinModal").classList.remove("hidden");

  // Temporarily override the PIN handler for this flow
  const confirmBtn = $("confirmPin");

  const handler = async () => {

    const pin = $("authorizationPin").value;

    if(!/^\d{4}$/.test(pin)){
      if($("pinError")){
        $("pinError").textContent = "Enter the buyer's 4-digit PIN.";
        $("pinError").classList.remove("hidden");
      }
      return;
    }

    const ok = await verifyDemoBuyerPin(buyerSession.phone, pin);

    if(!ok){
      addSecurity(`Failed buyer PIN at payment for ${buyerSession.phone}.`);
      save();

      if($("pinError")){
        $("pinError").textContent = "Incorrect buyer PIN.";
        $("pinError").classList.remove("hidden");
      }

      toast("Incorrect buyer PIN.");
      return;
    }

    confirmBtn.removeEventListener("click", handler);

    $("pinModal").classList.add("hidden");

    finishBuyerPayment(amount, source, fee, provider);

  };

  confirmBtn.addEventListener("click", handler);

}


function finishBuyerPayment(amount, source, fee, provider){

  const src = buyerSession.sources[source];
  const total = amount + fee + provider;

  src.balance -= total;

  // Credit the seller's matching source if enabled, otherwise wallet
  let sellerSourceKey = source;

  if(!state.sources[sellerSourceKey]?.enabled){
    sellerSourceKey = "wallet";
    state.sources.wallet.enabled = true;
  }

  state.sources[sellerSourceKey].balance += amount;

  state.owner.fees += fee;
  state.owner.providerCosts += provider;
  state.owner.transactions++;
  state.owner.volume += amount;

  const reference = generateReference();

  const transaction = {
    reference,
    createdAt: new Date().toISOString(),
    status: "completed",
    type: "Buyer Payment",
    amount,
    fee,
    providerCost: provider,
    totalDeducted: total,
    source,
    recipient: state.user.phone,
    recipientName: state.user.name,
    buyerName: buyerSession.name,
    buyerPhone: buyerSession.phone,
    description:
      `Buyer payment from ${buyerSession.name} (${buyerSession.phone})`
  };

  state.transactions.unshift(transaction);

  addNotification(
    "Buyer payment received",
    `${money(amount)} from ${buyerSession.name}. Ref ${reference}.`
  );

  addSecurity(
    `Buyer payment of ${money(amount)} received from ${buyerSession.phone}.`
  );

  save();

  showBuyerSuccess(amount, reference);

  renderEverything();

}


/* ---- Success + countdown + reset ---- */

function showBuyerSuccess(amount, reference){

  if($("buyerSuccessText")){
    $("buyerSuccessText").textContent =
      `${money(amount)} received. Reference ${reference}.`;
  }

  setBuyerStep("success");

  clearTimeout(buyerSuccessTimer);

  const fill = $("buyerCountdownFill");
  const text = $("buyerCountdownText");

  if(fill){
    fill.style.transition = "none";
    fill.style.width = "100%";
  }

  requestAnimationFrame(() => {
    if(fill){
      fill.style.transition = `width ${BUYER_SUCCESS_MS}ms linear`;
      fill.style.width = "0%";
    }
  });

  let remaining = Math.ceil(BUYER_SUCCESS_MS / 1000);

  if(text){
    text.textContent = `Returning to login in ${remaining}s…`;
  }

  const tick = setInterval(() => {

    remaining -= 1;

    if(remaining > 0 && text){
      text.textContent = `Returning to login in ${remaining}s…`;
    }

    if(remaining <= 0){
      clearInterval(tick);
      buyerSuccessTimer = setTimeout(() => {
        resetBuyerFlow();
      }, 200);
    }

  }, 1000);

}


function resetBuyerFlow(){

  clearTimeout(buyerSuccessTimer);

  buyerSession = null;

  ["buyerLoginPhone","buyerLoginNationalId","buyerLoginPin","buyerPayAmount"]
    .forEach(id => { if($(id)) $(id).value = ""; });

  if($("buyerSourcesList")) $("buyerSourcesList").innerHTML = "";

  if($("buyerChosenSourceName")) $("buyerChosenSourceName").textContent = "—";

  if($("buyerDestinationName")) $("buyerDestinationName").textContent = "—";
  if($("buyerDestinationId"))   $("buyerDestinationId").textContent = "—";

  if($("buyerCostPreview")) $("buyerCostPreview").innerHTML = "";

  if($("buyerChooseSourceButton")) $("buyerChooseSourceButton").disabled = true;

  setBuyerStep(1);

  renderReceiveSellerLine();

}


/* ================= DEPOSIT TO BEAST ================= */

function depositProviderCost(source, amount){

  amount = Number(amount || 0);

  if(source === "wallet") return 0;

  if(source === "mpesa"){
    if(amount <= 100) return 0;
    if(amount <= 1500) return 5;
    return 10;
  }

  if(source === "tkash" || source === "airtel"){
    return amount <= 1500 ? 5 : 10;
  }

  if(source === "bank") return amount <= 10000 ? 3 : 10;
  if(source === "card") return amount <= 10000 ? 8 : 15;

  return 0;

}

function updateDepositPreview(){

  const box = $("depositCostPreview");
  if(!box) return;

  const source = $("depositSource")?.value;
  const amount = Number($("depositAmount")?.value || 0);

  if(amount <= 0){
    box.innerHTML = `
      <b>Deposit preview</b><br>
      Enter an amount to calculate the deposit details.
    `;
    return;
  }

  const provider = depositProviderCost(source, amount);

  box.innerHTML = `
    <b>Deposit to BEAST</b><br>
    Amount: ${money(amount)}<br>
    Provider cost: ${money(provider)}<br><br>
    <strong>BEAST receives: ${money(Math.max(0, amount - provider))}</strong>
  `;

}

function performDeposit(){

  const phone = normalizePhone($("depositPhone")?.value || "");
  const source = $("depositSource")?.value;
  const amount = Number($("depositAmount")?.value || 0);

  if(!validPhone(phone)){
    toast("Enter the BEAST customer's valid phone number.");
    return;
  }

  if(phone !== state.user.phone){
    toast("Demo deposit is available for the registered BEAST customer.");
    return;
  }

  if(!state.sources[source]){
    toast("Select a valid deposit source.");
    return;
  }

  if(source === "wallet"){
    toast("BEAST Wallet cannot deposit into itself.");
    return;
  }

  if(amount <= 0){
    toast("Enter a deposit amount.");
    return;
  }

  const provider = depositProviderCost(source, amount);

  askConfirmation(

    `
      <b>Confirm deposit</b><br><br>
      Source: ${escapeHTML(SOURCE_NAMES[source])}<br>
      Amount: ${money(amount)}<br>
      Provider cost: ${money(provider)}<br><br>
      <strong>BEAST Wallet receives: ${money(Math.max(0, amount - provider))}</strong>
    `,

    () => authorize("Deposit to BEAST", () => {
      completeDeposit({ phone, source, amount });
    })

  );

}


function completeDeposit(data){

  const source = state.sources[data.source];

  if(!source || !source.enabled){
    toast("Selected deposit source is not enabled.");
    return;
  }

  const provider = depositProviderCost(data.source, data.amount);
  const received = Math.max(0, Number(data.amount) - provider);

  if(source.balance < Number(data.amount)){
    toast(`Insufficient ${SOURCE_NAMES[data.source]} balance.`);
    return;
  }

  source.balance -= Number(data.amount);

  state.sources.wallet.enabled = true;
  state.sources.wallet.balance += received;

  state.owner.providerCosts += provider;
  state.owner.transactions++;
  state.owner.volume += Number(data.amount);

  const transaction = {

    reference: generateReference(),
    createdAt: new Date().toISOString(),
    status: "completed",
    type: "Deposit to BEAST",
    amount: Number(data.amount),
    fee: 0,
    providerCost: provider,
    totalDeducted: Number(data.amount),
    source: data.source,
    destination: "BEAST Wallet",
    recipient: state.user.phone,
    recipientName: state.user.name,
    received,
    description:
      `Deposit from ${SOURCE_NAMES[data.source]} to BEAST Wallet`

  };

  state.transactions.unshift(transaction);

  addNotification(
    "Deposit completed",
    `${money(received)} was deposited into your BEAST Wallet from ${SOURCE_NAMES[data.source]}. Ref ${transaction.reference}.`
  );

  addSecurity(
    `BEAST deposit authorized from ${SOURCE_NAMES[data.source]}.`
  );

  save();

  toast(`Deposit completed. ${money(received)} added to BEAST Wallet.`);

  if($("depositAmount")) $("depositAmount").value = "";

  renderEverything();

}


/* ================= AGENT DEPOSIT ================= */

function verifyAgentDeposit(){

  const agent = ($("agentDepositAgent")?.value || "").trim();
  const customerPhone = normalizePhone($("agentDepositPhone")?.value || "");
  const nationalId = $("agentDepositNationalId")?.value.trim();

  if(!validAgent(agent)){
    toast("Enter a valid agent number or agent code.");
    return;
  }

  const agentName =
    REGISTERED_AGENTS[normalizePhone(agent)] ||
    REGISTERED_AGENT_CODES[agent.toUpperCase()];

  if(!agentName){

    $("agentDepositVerification")?.classList.remove("hidden");

    if($("agentDepositVerification")){
      $("agentDepositVerification").innerHTML = `
        <strong>✕ Agent not verified</strong><br>
        This demo only accepts a registered Safaricom agent.
      `;
    }

    toast("Agent verification failed.");
    return;

  }

  if(!validPhone(customerPhone)){
    toast("Enter a valid customer phone number.");
    return;
  }

  if(customerPhone !== state.user.phone){
    toast("Customer is not the registered demo BEAST customer.");
    return;
  }

  if(nationalId !== state.user.nationalId){
    toast("Customer National ID does not match.");
    return;
  }

  $("agentDepositVerification")?.classList.remove("hidden");

  if($("agentDepositVerification")){
    $("agentDepositVerification").innerHTML = `
      <strong>✓ Safaricom agent verified (demo)</strong><br>
      Agent: ${escapeHTML(agentName)}<br>
      Agent ID: ${escapeHTML(agent)}<br>
      Customer: ${escapeHTML(state.user.name)}<br>
      Customer phone: ${escapeHTML(customerPhone)}<br>
      National ID verified.
    `;
  }

  addSecurity(`Safaricom agent ${agent} verified for BEAST deposit.`);
  save();
  toast("Safaricom agent and customer verified.");

}


function agentDeposit(){

  const verification = $("agentDepositVerification");

  if(!verification || verification.classList.contains("hidden")){
    toast("Verify the Safaricom agent and customer first.");
    return;
  }

  const agent = ($("agentDepositAgent").value || "").trim();
  const customerPhone = normalizePhone($("agentDepositPhone").value);
  const nationalId = $("agentDepositNationalId").value.trim();
  const amount = Number($("agentDepositAmount").value);

  const agentName =
    REGISTERED_AGENTS[normalizePhone(agent)] ||
    REGISTERED_AGENT_CODES[agent.toUpperCase()];

  if(!agentName){
    toast("Agent is not registered.");
    return;
  }

  if(customerPhone !== state.user.phone || nationalId !== state.user.nationalId){
    toast("Customer verification failed.");
    return;
  }

  if(amount <= 0){
    toast("Enter the deposit amount.");
    return;
  }

  askConfirmation(

    `
      <b>Confirm agent deposit</b><br><br>
      Agent: ${escapeHTML(agentName)}<br>
      Customer: ${escapeHTML(state.user.name)}<br>
      Amount: ${money(amount)}<br><br>
      <strong>BEAST Wallet receives: ${money(amount)}</strong>
    `,

    () => authorize("Agent deposit", () => {

      completeAgentDeposit({ agent, customerPhone, amount });

    })

  );

}


function completeAgentDeposit(data){

  state.sources.wallet.enabled = true;
  state.sources.wallet.balance += Number(data.amount);

  const agentCost = 0;

  state.owner.providerCosts += agentCost;
  state.owner.transactions++;
  state.owner.volume += Number(data.amount);

  const transaction = {

    reference: generateReference(),
    createdAt: new Date().toISOString(),
    status: "completed",
    type: "Agent Deposit",
    amount: Number(data.amount),
    fee: 0,
    providerCost: agentCost,
    totalDeducted: 0,
    source: "Agent",
    destination: "BEAST Wallet",
    recipient: data.customerPhone,
    recipientName: state.user.name,
    agent: data.agent,
    description:
      `Cash deposit through verified Safaricom agent ${data.agent}`

  };

  state.transactions.unshift(transaction);

  addNotification(
    "Agent deposit completed",
    `${money(data.amount)} was deposited into your BEAST Wallet through a verified Safaricom agent. Ref ${transaction.reference}.`
  );

  addSecurity(
    `Agent deposit authorized through Safaricom agent ${data.agent}.`
  );

  save();
  toast(`Agent deposit completed. ${money(data.amount)} added to BEAST Wallet.`);

  if($("agentDepositAmount")) $("agentDepositAmount").value = "";

  renderEverything();

}


/* ================= WITHDRAW ================= */

function setupWithdraw(){

  $("verifyAgent")?.addEventListener("click", () => {

    const number = ($("agentNumber").value || "").trim();

    if(!validAgent(number)){
      toast("Enter a valid agent number or agent code.");
      return;
    }

    $("agentVerification").classList.remove("hidden");

    $("agentVerification").innerHTML = `
      <strong>✓ Demo agent accepted</strong>
      Agent ID: ${escapeHTML(number)}<br>
      Store: ${escapeHTML($("withdrawStore").value || "Main agent")}<br>
      <small>Agent balance is not shown.</small>
    `;

  });

  $("withdrawButton")?.addEventListener("click", () => {

    if($("agentVerification").classList.contains("hidden")){
      toast("Verify the agent first.");
      return;
    }

    const amount = Number($("withdrawAmount").value);
    const source = $("withdrawSource").value;
    const agent = ($("agentNumber").value || "").trim();

    if(amount <= 0){
      toast("Enter an amount.");
      return;
    }

    const fee = beastFee(amount);
    const provider = providerCost(source, amount);

    askConfirmation(

      buildConfirmationHTML({
        title: "Confirm withdrawal",
        recipientName: "Demo agent",
        recipient: agent,
        amount, source, fee, provider
      }),

      () => authorize("Agent withdrawal", () => {

        completeTransaction({
          type: "Withdraw",
          amount,
          source,
          recipient: agent,
          recipientName: "Demo agent",
          description: "Agent cash withdrawal"
        });

      })

    );

  });

}


/* ================= LIPA NA ================= */

function lipaFields(){

  const type = $("lipaType")?.value;
  if(!$("lipaDestinationFields")) return;

  if(type === "paybill"){
    $("lipaDestinationFields").innerHTML = `
      <div class="two-col">
        <label>
          PayBill number
          <input id="lipaDestNumber" placeholder="123456">
        </label>
        <label>
          Account number
          <input id="lipaAccount" placeholder="Account">
        </label>
      </div>
    `;
  }
  else if(type === "till"){
    $("lipaDestinationFields").innerHTML = `
      <label>
        Till number
        <input id="lipaDestNumber" placeholder="123456">
      </label>
    `;
  }
  else if(type === "pochi"){
    $("lipaDestinationFields").innerHTML = `
      <label>
        Pochi phone / business number
        <input id="lipaDestNumber"
               placeholder="0712345678 or +254712345678">
      </label>
    `;
  }
  else{
    $("lipaDestinationFields").innerHTML = `
      <label>
        Business / account reference
        <input id="lipaDestNumber" placeholder="Business reference">
      </label>
    `;
  }

}

function setupLipa(){

  $("lipaType")?.addEventListener("change", lipaFields);
  lipaFields();

  $("verifyLipa")?.addEventListener("click", () => {

    const value = ($("lipaDestNumber")?.value || "").trim();

    if(value.length < 4){
      toast("Enter destination.");
      return;
    }

    $("lipaVerification").classList.remove("hidden");

    $("lipaVerification").innerHTML = `
      <strong>✓ Demo destination</strong><br>
      Business: ${escapeHTML(value)}<br>
      Method: ${escapeHTML(SOURCE_NAMES[$("lipaMethod").value] || $("lipaMethod").value)}
    `;

  });

  $("lipaPayButton")?.addEventListener("click", () => {

    if($("lipaVerification").classList.contains("hidden")){
      toast("Verify destination first.");
      return;
    }

    const amount = Number($("lipaAmount").value);
    const source = $("lipaSource").value;
    const dest = $("lipaDestNumber").value;

    if(amount <= 0){
      toast("Enter an amount.");
      return;
    }

    const fee = beastFee(amount);
    const provider = providerCost(source, amount);

    askConfirmation(

      buildConfirmationHTML({
        title: "Confirm business payment",
        recipientName: "Demo business",
        recipient: dest,
        amount, source, fee, provider
      }),

      () => authorize("Lipa Na payment", () => {

        completeTransaction({
          type: "Lipa Na",
          amount,
          source,
          recipient: dest,
          recipientName: "Demo business",
          description: `${$("lipaType").value} payment`
        });

      })

    );

  });

}


/* ================= PIN AUTHORIZATION (SELLER) ================= */

function openPinModal(purpose){

  $("pinPurpose").textContent = purpose;
  $("authorizationPin").value = "";

  if($("pinError")){
    $("pinError").textContent = "";
    $("pinError").classList.add("hidden");
  }

  $("pinModal").classList.remove("hidden");
  setTimeout(() => $("authorizationPin").focus(), 100);

}

function authorize(purpose, callback){

  pendingAction = callback;
  openPinModal(purpose);

}

function closePin(){

  pendingAction = null;
  $("pinModal").classList.add("hidden");

}

async function attemptPin(pin){

  if(pinLocked()){

    const s = secondsLeft();

    if($("pinError")){
      $("pinError").textContent = `Locked. Try again in ${s}s.`;
      $("pinError").classList.remove("hidden");
    }

    toast(`Locked. Try again in ${s}s.`);
    return;

  }

  const ok = await verifyPin(pin);

  if(!ok){

    state.security.failedPinAttempts += 1;

    addSecurity("Failed BEAST PIN authorization attempt.");

    if(state.security.failedPinAttempts >= MAX_PIN_ATTEMPTS){
      state.security.lockoutUntil = Date.now() + PIN_LOCKOUT_MS;
      state.security.failedPinAttempts = 0;
      save();

      if($("pinError")){
        $("pinError").textContent =
          `Too many attempts. Locked for ${PIN_LOCKOUT_MS/1000}s.`;
        $("pinError").classList.remove("hidden");
      }

      toast(`Too many attempts. Locked for ${PIN_LOCKOUT_MS/1000}s.`);
      return;

    }

    save();

    if($("pinError")){
      $("pinError").textContent =
        `Incorrect PIN. ${MAX_PIN_ATTEMPTS - state.security.failedPinAttempts} tries left.`;
      $("pinError").classList.remove("hidden");
    }

    toast("Incorrect BEAST PIN.");
    return;

  }

  state.security.failedPinAttempts = 0;
  state.security.lockoutUntil = 0;
  save();

  const action = pendingAction;
  closePin();

  if(action) action();

}

function setupPin(){

  $("confirmPin")?.addEventListener("click", () => {
    // If a buyer flow is active, the buyer handler is attached separately
    if(buyerSession && $("confirmPin")._buyerHandler){
      return;
    }
    attemptPin($("authorizationPin").value);
  });

  $("authorizationPin")?.addEventListener("keydown", e => {
    if(e.key === "Enter"){
      if(buyerSession && $("confirmPin")._buyerHandler) return;
      attemptPin($("authorizationPin").value);
    }
  });

  $("cancelPin").onclick = closePin;
  $("closePinModal").onclick = closePin;

}


/* ================= COMPLETE TRANSACTION (SELLER) ================= */

function completeTransaction(data){

  const amount = Number(data.amount);
  const fee = beastFee(amount);
  const provider = providerCost(data.source, amount);
  const total = amount + fee + provider;

  const source = state.sources[data.source];

  if(!source || !source.enabled){
    toast("Selected payment source is not enabled.");
    return;
  }

  if(source.balance < total){
    toast(`Insufficient ${SOURCE_NAMES[data.source]} balance. Need ${money(total)}.`);
    return;
  }

  const balanceBefore = source.balance;
  source.balance -= total;

  state.owner.fees += fee;
  state.owner.providerCosts += provider;
  state.owner.transactions++;
  state.owner.volume += amount;

  const transaction = {
    reference: generateReference(),
    createdAt: new Date().toISOString(),
    status: "completed",
    type: data.type,
    amount, fee,
    providerCost: provider,
    totalDeducted: total,
    source: data.source,
    recipient: data.recipient,
    recipientName: data.recipientName,
    description: data.description,
    balanceBefore,
    balanceAfter: source.balance
  };

  state.transactions.unshift(transaction);

  addNotification(
    `${data.type} completed`,
    `${money(amount)} sent to ${data.recipientName}. Ref ${transaction.reference}.`
  );

  addSecurity(
    `${data.type} authorized from ${SOURCE_NAMES[data.source]}.`
  );

  save();
  toast(`${data.type} completed. ${money(total)} deducted.`);

  if(data.type === "Send"){
    $("sendPhone").value = "";
    $("sendAmount").value = "";
    $("recipientVerification").classList.add("hidden");
  }

  renderEverything();

}


/* ================= NOTIFICATIONS ================= */

function addNotification(title, message){

  state.notifications.unshift({
    title, message,
    createdAt: new Date().toISOString(),
    read: false
  });

  state.notifications = state.notifications.slice(0, 100);
  save();

}

function renderNotifications(){

  const box = $("notificationList");
  if(!box) return;

  if(!state.notifications.length){
    box.innerHTML = `<div class="panel muted">No notifications yet.</div>`;
    return;
  }

  box.innerHTML =

    state.notifications

    .map(n => `
      <div class="list-item ${n.read ? "" : "unread"}">
        <strong>${escapeHTML(n.title)}</strong>
        <small>
          ${escapeHTML(n.message)}<br>
          ${dateText(n.createdAt)}
        </small>
      </div>
    `)

    .join("");

}

function markNotificationsReadIfOpen(){

  const screen = $("notificationsScreen");

  if(!screen || !screen.classList.contains("active")) return;

  let changed = false;

  state.notifications.forEach(n => {
    if(!n.read){ n.read = true; changed = true; }
  });

  if(changed){
    save();
    updateNotificationBadge();
  }

}

function updateNotificationBadge(){

  const unread = state.notifications.filter(n => !n.read).length;

  if($("notificationBadge")){
    $("notificationBadge").textContent = unread;
  }

}


/* ================= SECURITY ================= */

function addSecurity(message){

  state.securityEvents.unshift({
    message,
    createdAt: new Date().toISOString()
  });

  state.securityEvents = state.securityEvents.slice(0, 100);

}

function renderSecurity(){

  const box = $("securityList");
  if(!box) return;

  if(!state.securityEvents.length){
    box.innerHTML = `<div class="muted">No security events.</div>`;
    return;
  }

  box.innerHTML =

    state.securityEvents

    .map(event => `
      <div class="list-item">
        <strong>Security event</strong>
        <small>
          ${escapeHTML(event.message)}<br>
          ${dateText(event.createdAt)}
        </small>
      </div>
    `)

    .join("");

}


/* ================= CAMERA / DEVICE SECURITY ================= */

function setSecurityStatus(id, text, className=""){

  const element = $(id);
  if(!element) return;

  element.textContent = text;

  const card = element.closest(".security-status-card");

  if(card){
    card.classList.remove("green","red","blue");
    if(className) card.classList.add(className);
  }

}

async function startFrontCamera(){

  if(!navigator.mediaDevices?.getUserMedia){
    setSecurityStatus("cameraStatus", "Not supported", "red");
    toast("This browser does not provide camera access.");
    return;
  }

  try{

    if(cameraStream) stopFrontCamera();

    setSecurityStatus("cameraStatus", "Requesting permission...", "blue");

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:{ ideal:"user" } },
      audio:false
    });

    const video = $("securityCameraPreview");

    if(video){
      video.srcObject = cameraStream;
      video.classList.remove("hidden");
      await video.play().catch(() => {});
    }

    setSecurityStatus("cameraStatus", "FRONT CAMERA ACTIVE", "green");

    addSecurity("Front camera security check activated with user permission.");
    save();
    toast("Front camera security check is active.");

  }catch(error){

    console.error(error);

    setSecurityStatus("cameraStatus", "Permission denied / unavailable", "red");

    addSecurity("Front camera security check could not start.");
    save();
    toast("Camera permission was not granted.");

  }

}

function stopFrontCamera(){

  if(cameraStream){
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  const video = $("securityCameraPreview");

  if(video){
    video.pause();
    video.srcObject = null;
    video.classList.add("hidden");
  }

  setSecurityStatus("cameraStatus", "CAMERA OFF", "red");

}

function checkCaptureSecurity(){

  const captureStatus = $("captureStatus");

  if($("visibilityStatus")){
    if(document.hidden){
      setSecurityStatus("visibilityStatus", "APP HIDDEN", "red");
    }
    else{
      setSecurityStatus("visibilityStatus", "APP VISIBLE", "green");
    }
  }

  if(captureStatus){
    setSecurityStatus(
      "captureStatus",
      "NO BROWSER CAPTURE SIGNAL",
      "green"
    );
  }

}

function setupCameraSecurity(){

  $("cameraCheckButton")?.addEventListener("click", startFrontCamera);

  $("stopCameraButton")?.addEventListener("click", () => {
    stopFrontCamera();
    addSecurity("Front camera security check stopped.");
    save();
  });

  document.addEventListener("visibilitychange", () => {

    checkCaptureSecurity();

    if(document.hidden && state.settings.screenSecurity){
      addSecurity("App visibility changed.");
      save();
    }

  });

  window.addEventListener("blur",  () => {
    if(state.settings.screenSecurity) checkCaptureSecurity();
  });

  window.addEventListener("focus", () => checkCaptureSecurity());

  checkCaptureSecurity();

}


/* ================= HISTORY ================= */

function renderHistory(){

  const box = $("historyList");
  if(!box) return;

  if(!state.transactions.length){
    box.innerHTML = `<div class="panel muted">No transactions yet.</div>`;
    return;
  }

  box.innerHTML =

    state.transactions

    .map(transaction => {

      const direction =
        transaction.type === "Deposit to BEAST" ||
        transaction.type === "Agent Deposit" ||
        transaction.type === "Buyer Payment"
          ? "+" : "-";

      return `
        <div class="list-item">
          <strong>${escapeHTML(transaction.type)}</strong>
          <span>${direction} ${money(transaction.amount)}</span>
          <small>
            ${escapeHTML(transaction.description)}<br>
            Recipient: ${escapeHTML(transaction.recipientName || transaction.destination || "-")}<br>
            Source: ${escapeHTML(SOURCE_NAMES[transaction.source] || transaction.source || "-")}<br>
            Reference: ${escapeHTML(transaction.reference)}<br>
            ${dateText(transaction.createdAt)}<br>
            BEAST fee: ${money(transaction.fee)} · Provider: ${money(transaction.providerCost)}
          </small>
        </div>
      `;

    })

    .join("");

}


/* ================= PROFILE ================= */

function renderProfile(){

  const box = $("profileDetails");
  if(!box) return;

  box.innerHTML = `
    <div class="list-item">
      <strong>${escapeHTML(state.user.name || "Not registered")}</strong>
      <small>
        BEAST ID: ${escapeHTML(state.user.beastId || "-")}<br>
        Phone: ${escapeHTML(state.user.phone || "-")}<br>
        International: ${escapeHTML(internationalPhone(state.user.phone) || "-")}<br>
        National ID: ${escapeHTML(state.user.nationalId || "-")}<br>
        Total balance: ${money(totalBalance())}<br>
        PIN storage: <b>salted SHA-256 hash</b>
      </small>
    </div>
  `;

}


/* ================= ADMIN ================= */

function renderAdmin(){

  const locked = $("adminLocked");
  const dashboard = $("adminDashboard");

  if(!locked || !dashboard) return;

  if(state.adminUnlocked){

    locked.classList.add("hidden");
    dashboard.classList.remove("hidden");

    $("ownerFees").textContent          = money(state.owner.fees);
    $("ownerProviderCosts").textContent = money(state.owner.providerCosts);
    $("ownerNetRevenue").textContent    = money(state.owner.fees - state.owner.providerCosts);
    $("ownerTransactions").textContent  = state.owner.transactions;
    $("ownerVolume").textContent        = money(state.owner.volume);

  }

}

function setupAdmin(){

  $("adminLoginButton")?.addEventListener("click", () => {

    if($("adminPassword").value !== DEMO_ADMIN_PASSWORD){
      toast("Incorrect admin password.");
      return;
    }

    state.adminUnlocked = true;
    save();
    renderAdmin();

    $("adminPassword").value = "";
    toast("BEAST Admin unlocked.");

  });

}


/* ================= BALANCE CHECK ================= */

function setupBalance(){

  $("loginButton")?.addEventListener("click", () => {

    const account = normalizePhone($("loginAccount").value);
    const name = $("loginName").value.trim();

    if(
      account !== state.user.phone ||
      name.toLowerCase() !== state.user.name.toLowerCase()
    ){
      toast("Identity details do not match.");
      return;
    }

    $("loginBalance").classList.remove("hidden");

    $("loginBalance").innerHTML = `
      <b>${escapeHTML(state.user.name)}</b><br>
      BEAST ID: ${escapeHTML(state.user.beastId)}<br>
      Phone: ${escapeHTML(internationalPhone(state.user.phone))}<br><br>
      <strong style="font-size:22px">${money(totalBalance())}</strong>
    `;

  });

}


/* ================= SETTINGS ================= */

function setupSettings(){

  $("darkModeButton")?.addEventListener("click", () => setTheme("dark"));
  $("lightModeButton")?.addEventListener("click", () => setTheme("light"));

  $("notificationsToggle")?.addEventListener("change", event => {
    state.settings.notifications = event.target.checked;
    save();
  });

  $("screenSecurityToggle")?.addEventListener("change", event => {
    state.settings.screenSecurity = event.target.checked;
    save();
  });

  $("biometricToggle")?.addEventListener("change", event => {
    state.settings.biometric = event.target.checked;
    save();
  });

  $("changePinButton")?.addEventListener("click", async () => {

    const oldPin = $("oldPin").value;
    const newPin = $("newPin").value;
    const confirmPin = $("confirmNewPin").value;

    const ok = await verifyPin(oldPin);

    if(!ok){
      toast("Current PIN is incorrect.");
      addSecurity("Failed PIN change attempt.");
      save();
      return;
    }

    if(!/^\d{4}$/.test(newPin) || newPin !== confirmPin){
      toast("New PIN must contain 4 matching digits.");
      return;
    }

    await setPin(newPin);
    addSecurity("BEAST PIN changed.");
    save();

    toast("BEAST PIN changed successfully.");

    $("oldPin").value = "";
    $("newPin").value = "";
    $("confirmNewPin").value = "";

  });

  $("resetDemo")?.addEventListener("click", () => {

    if(!confirm("Reset all BEAST demo data?")) return;

    localStorage.removeItem(STORAGE_KEY);
    location.reload();

  });

}


/* ================= MENU ================= */

function setupMenu(){

  $("menuButton")?.addEventListener("click", openMenu);
  $("closeMenu")?.addEventListener("click", closeMenu);
  $("drawerBackdrop")?.addEventListener("click", closeMenu);

  document.querySelectorAll("[data-menu]").forEach(button => {

    button.addEventListener("click", () => {

      const target = button.dataset.menu;

      if(target === "logout"){
        toast("Demo session ended.");
        closeMenu();
        return;
      }

      showScreen(target);

    });

  });

  $("notificationButton")?.addEventListener("click", () => showScreen("notifications"));

  $("refreshBalance")?.addEventListener("click", () => {
    renderEverything();
    toast("Balance refreshed.");
  });

}


/* ================= RENDER HOME ================= */

function renderHome(){

  if(!state.registered) return;

  if($("welcomeText")){
    $("welcomeText").textContent = `Welcome, ${state.user.name}.`;
  }

  if($("dashboardBeastId")){
    $("dashboardBeastId").textContent = state.user.beastId;
  }

  if($("menuUser")){
    $("menuUser").textContent = state.user.name;
  }

  if($("totalBalance")){
    $("totalBalance").textContent = money(totalBalance());
  }

}

function renderSettings(){

  if($("notificationsToggle")){
    $("notificationsToggle").checked = state.settings.notifications;
  }

  if($("screenSecurityToggle")){
    $("screenSecurityToggle").checked = state.settings.screenSecurity;
  }

  if($("biometricToggle")){
    $("biometricToggle").checked = state.settings.biometric;
  }

}


/* ================= RENDER ALL ================= */

function renderEverything(){

  renderHome();

  renderSources("sourceList");
  renderSources("beastOwnSourceList");

  renderHistory();
  renderNotifications();
  renderSecurity();
  renderProfile();
  renderAdmin();
  renderSettings();

  fillSourceSelects();
  setupCostPreview();

  updateDepositPreview();
  updateNotificationBadge();
  checkCaptureSecurity();
  markNotificationsReadIfOpen();

  renderReceiveSellerLine();
  updateReceiveBackButton();

}


/* ================= START ================= */

async function initialize(){

  await buildDemoBuyerHashes();

  setupRegistration();
  setupMenu();
  setupSend();
  setupReceiveTabs();
  setupBuyerFlow();
  setupWithdraw();
  setupLipa();
  setupPin();
  setupAdmin();
  setupBalance();
  setupSettings();
  setupSourceManager();
  setupCameraSecurity();

  $("performDepositButton")?.addEventListener("click", performDeposit);
  $("depositSource")?.addEventListener("change", updateDepositPreview);
  $("depositAmount")?.addEventListener("input", updateDepositPreview);
  $("verifyAgentDeposit")?.addEventListener("click", verifyAgentDeposit);
  $("agentDepositButton")?.addEventListener("click", agentDeposit);

  loadTheme();

  if(state.registered){
    $("registrationScreen")?.classList.remove("active");
    $("homeScreen")?.classList.add("active");
  }

  resetBuyerFlow();
  renderEverything();
  resetAutoLock();

}


initialize();

});