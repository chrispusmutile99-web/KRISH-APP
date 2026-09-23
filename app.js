/* =========================================================
MONEY TRANSFER BEAST — app.js
DEMO / PROTOTYPE ONLY
Demo PIN: 1234

TARIFF ENGINE

- M-PESA send-money tariff
- Airtel Money Airtel-to-Airtel = FREE
- Airtel Money to other networks tariff
- Airtel bank <-> wallet tariff
- Withdrawal tariff kept separate
  ========================================================= */

const KEY = "mtb_beast_v3";
const DEMO_PIN = "1234";

/* =========================================================
SAVED SOURCES
========================================================= */

const DEFAULT_SOURCES = {
MPESA: [
{ id: "mpesa1", label: "0712345678 • Primary" },
{ id: "mpesa2", label: "0798765432 • Secondary" }
],

AIRTEL: [
{ id: "airtel1", label: "0734567890 • Primary" },
{ id: "airtel2", label: "0787654321 • Secondary" }
],

BANK: [
{ id: "bank1", label: "KCB Bank •••• 4582" },
{ id: "bank2", label: "Equity Bank •••• 9134" },
{ id: "bank3", label: "Co-operative Bank •••• 2210" }
],

CARD: [
{ id: "card1", label: "BEAST Visa •••• 4821" },
{ id: "card2", label: "M-PESA Card •••• 7720" },
{ id: "card3", label: "Demo Mastercard •••• 1188" }
],

WALLET: [
{ id: "wallet1", label: "BEAST Wallet • Main wallet" },
{ id: "wallet2", label: "M-PESA Wallet • 0712345678" },
{ id: "wallet3", label: "Airtel Money Wallet • 0798765432" }
]
};

/* =========================================================
STATE
========================================================= */

let state = JSON.parse(localStorage.getItem(KEY)) || {
balance: 5000,
history: [],
dark: false,

settings: {
securityAlerts: true,
notifications: true,
screenProtection: true
},

trustedDevices: [],

sources: DEFAULT_SOURCES
};

/* =========================================================
BASIC HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function money(value) {
return "KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}";
}

function save() {
localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(message) {
const el = $("toast");
if (!el) return;

el.textContent = message;
el.classList.add("show");

clearTimeout(window.__toastTimer);

window.__toastTimer = setTimeout(() => {
el.classList.remove("show");
}, 2800);
}

function updateBalance() {
if ($("balance")) {
$("balance").textContent = money(state.balance);
}
}

function escapeHTML(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

/* =========================================================
PANEL / MENU
========================================================= */

function openPanel(panelId) {
document.querySelectorAll(".panel").forEach(panel => {
panel.classList.remove("active-panel");
});

const panel = $(panelId);

if (panel) {
panel.classList.add("active-panel");

window.scrollTo({
  top: 0,
  behavior: "smooth"
});

}

closeMenu();
}

function openMenu() {
$("sideMenu")?.classList.add("open");
$("menuOverlay")?.classList.add("show");
}

function closeMenu() {
$("sideMenu")?.classList.remove("open");
$("menuOverlay")?.classList.remove("show");
}

/* =========================================================
TARIFF ENGINE

These tables are kept in one place so they can be updated
independently when providers officially change tariffs.

Amounts are KES.

NOTE:
This is a DEMO tariff calculator.
Before production, tariffs must be synchronized against
the live provider tariff/API/contract.
========================================================= */

/* ---------------------------------------------------------
SAFARICOM M-PESA SEND MONEY
--------------------------------------------------------- */

const MPESA_SEND_TARIFF = [
{ min: 1, max: 100, fee: 0 },
{ min: 101, max: 500, fee: 7 },
{ min: 501, max: 1000, fee: 13 },
{ min: 1001, max: 1500, fee: 23 },
{ min: 1501, max: 2500, fee: 33 },
{ min: 2501, max: 3500, fee: 53 },
{ min: 3501, max: 5000, fee: 57 },
{ min: 5001, max: 7500, fee: 78 },
{ min: 7501, max: 10000, fee: 90 },
{ min: 10001, max: 15000, fee: 100 },
{ min: 15001, max: 20000, fee: 105 },
{ min: 20001, max: 250000, fee: 108 }
];

/* ---------------------------------------------------------
AIRTEL MONEY → OTHER NETWORKS
--------------------------------------------------------- */

const AIRTEL_OTHER_NETWORK_SEND_TARIFF = [
{ min: 1, max: 49, fee: 0 },
{ min: 50, max: 100, fee: 0 },
{ min: 101, max: 500, fee: 6 },
{ min: 501, max: 1000, fee: 11 },
{ min: 1001, max: 1500, fee: 20 },
{ min: 1501, max: 2500, fee: 30 },
{ min: 2501, max: 3500, fee: 50 },
{ min: 3501, max: 5000, fee: 50 },
{ min: 5001, max: 7500, fee: 70 },
{ min: 7501, max: 10000, fee: 80 },
{ min: 10001, max: 15000, fee: 90 },
{ min: 15001, max: 25000, fee: 95 },
{ min: 25001, max: 35000, fee: 100 },
{ min: 35001, max: 250000, fee: 105 }
];

/* ---------------------------------------------------------
AIRTEL MONEY → AIRTE L MONEY
--------------------------------------------------------- */

function airtelToAirtelFee() {
return 0;
}

/* ---------------------------------------------------------
AIRTEL BANK ↔ WALLET
--------------------------------------------------------- */

const AIRTEL_BANK_WALLET_TARIFF = [
{ min: 0, max: 9, bankToWallet: 0, walletToBank: 0 },
{ min: 10, max: 49, bankToWallet: 0, walletToBank: 0 },
{ min: 50, max: 100, bankToWallet: 0, walletToBank: 0 },
{ min: 101, max: 500, bankToWallet: 4, walletToBank: 4 },
{ min: 501, max: 1000, bankToWallet: 4, walletToBank: 9 },
{ min: 1001, max: 1500, bankToWallet: 4, walletToBank: 12 },
{ min: 1501, max: 2500, bankToWallet: 6, walletToBank: 13 },
{ min: 2501, max: 3500, bankToWallet: 6, walletToBank: 20 },
{ min: 3501, max: 5000, bankToWallet: 7, walletToBank: 20 },
{ min: 5001, max: 7500, bankToWallet: 8, walletToBank: 33 },
{ min: 7501, max: 10000, bankToWallet: 8, walletToBank: 37 },
{ min: 10001, max: 15000, bankToWallet: 8, walletToBank: 57 },
{ min: 15001, max: 20000, bankToWallet: 9, walletToBank: 62 },
{ min: 20001, max: 25000, bankToWallet: 9, walletToBank: 67 },
{ min: 25001, max: 30000, bankToWallet: 10, walletToBank: 72 },
{ min: 30001, max: 35000, bankToWallet: 10, walletToBank: 83 }
];

/* ---------------------------------------------------------
LOOKUP
--------------------------------------------------------- */

function findTariff(table, amount) {
const value = Number(amount);

if (!Number.isFinite(value) || value < 0) {
return null;
}

return table.find(row =>
value >= row.min &&
value <= row.max
) || null;
}

/* ---------------------------------------------------------
MAIN FEE FUNCTION
--------------------------------------------------------- */

function calculateTariff({
provider = "",
transaction = "send",
amount = 0,
destinationNetwork = "OTHER"
}) {
const value = Number(amount);

if (!Number.isFinite(value) || value <= 0) {
return {
fee: 0,
total: 0,
label: "Enter amount",
valid: false
};
}

/* M-PESA */

if (
provider === "MPESA" &&
transaction === "send"
) {
const row = findTariff(MPESA_SEND_TARIFF, value);

if (!row) {
  return {
    fee: 0,
    total: value,
    label: "Above M-PESA demo send limit",
    valid: false
  };
}

return {
  fee: row.fee,
  total: value + row.fee,
  label: "M-PESA Send Money",
  valid: true
};

}

/* AIRTEL */

if (
provider === "AIRTEL" &&
transaction === "send"
) {
if (
destinationNetwork === "AIRTEL" ||
destinationNetwork === "AIRTEL MONEY"
) {
return {
fee: airtelToAirtelFee(),
total: value,
label: "Airtel → Airtel",
valid: value <= 250000
};
}

const row = findTariff(
  AIRTEL_OTHER_NETWORK_SEND_TARIFF,
  value
);

if (!row) {
  return {
    fee: 0,
    total: value,
    label: "Above Airtel demo send limit",
    valid: false
  };
}

return {
  fee: row.fee,
  total: value + row.fee,
  label: "Airtel → Other Network",
  valid: true
};

}

/* AIRTEL BANK → WALLET */

if (
provider === "AIRTEL_BANK" &&
transaction === "bankToWallet"
) {
const row = findTariff(
AIRTEL_BANK_WALLET_TARIFF,
value
);

if (!row) {
  return {
    fee: 0,
    total: value,
    label: "Above available Airtel bank tariff",
    valid: false
  };
}

return {
  fee: row.bankToWallet,
  total: value + row.bankToWallet,
  label: "Bank → Airtel Money",
  valid: true
};

}

/* AIRTEL WALLET → BANK */

if (
provider === "AIRTEL_BANK" &&
transaction === "walletToBank"
) {
const row = findTariff(
AIRTEL_BANK_WALLET_TARIFF,
value
);

if (!row) {
  return {
    fee: 0,
    total: value,
    label: "Above available Airtel bank tariff",
    valid: false
  };
}

return {
  fee: row.walletToBank,
  total: value + row.walletToBank,
  label: "Airtel Money → Bank",
  valid: true
};

}

/* BEAST INTERNAL / OTHER DEMO SOURCES */

return {
fee: 0,
total: value,
label: "BEAST demo transaction",
valid: true
};
}

/* ---------------------------------------------------------
BACKWARD-COMPATIBLE FEE FUNCTION
--------------------------------------------------------- */

function feeFor(amount) {
const result = calculateTariff({
provider: "MPESA",
transaction: "send",
amount
});

return result.fee;
}

/* =========================================================
SOURCE PICKERS
========================================================= */

function renderSourcePicker(
type,
pickerId,
selectedId = null
) {
const picker = $(pickerId);

if (!picker) return;

const normalizedType =
type === "M-PESA" ? "MPESA" : type;

const list =
state.sources[normalizedType] || [];

picker.innerHTML = "";

if (!list.length) {
picker.innerHTML =
"<div class="empty-state">No linked sources found.</div>";

picker.classList.remove("hidden");
return;

}

list.forEach((source, index) => {
const button = document.createElement("button");

button.type = "button";
button.className = "source-option";

if (
  (selectedId && source.id === selectedId) ||
  (!selectedId && index === 0)
) {
  button.classList.add("selected");
  picker.dataset.selected = source.id;
}

button.dataset.sourceId = source.id;
button.textContent = source.label;

button.addEventListener("click", () => {
  picker
    .querySelectorAll(".source-option")
    .forEach(x => x.classList.remove("selected"));

  button.classList.add("selected");

  picker.dataset.selected =
    source.id;
});

picker.appendChild(button);

});

picker.classList.remove("hidden");
}

function selectedSource(pickerId) {
const picker = $(pickerId);

if (!picker) return null;

const id = picker.dataset.selected;

if (!id) return null;

for (const type of Object.keys(state.sources)) {
const found =
state.sources[type].find(
item => item.id === id
);

if (found) return found;

}

return null;
}

function showSourcePicker(type, pickerId) {
renderSourcePicker(type, pickerId);
}

/* =========================================================
TARIFF PREVIEW
========================================================= */

function renderTariffPreview({
amount,
provider,
transaction = "send",
destinationNetwork = "OTHER",
targetId
}) {
const target = $(targetId);

if (!target) return;

const result = calculateTariff({
provider,
transaction,
amount,
destinationNetwork
});

if (!result.valid) {
target.classList.add("hidden");
return;
}

target.classList.remove("hidden");

target.innerHTML = "<strong>Transaction Cost</strong> <br> ${escapeHTML(result.label)} <br> Fee: <strong>${money(result.fee)}</strong> <br> Total: <strong>${money(result.total)}</strong>";
}

/* =========================================================
SEND
========================================================= */

let sendRecipientVerified = false;

$("verifySendRecipient")?.addEventListener(
"click",
() => {
const phone =
$("sendPhone")?.value.trim();

if (!phone || phone.length < 9) {
  toast(
    "Enter a valid recipient phone number."
  );
  return;
}

sendRecipientVerified = true;

$("sendRecipientResult")
  ?.classList.remove("hidden");

if ($("sendRecipientResult")) {
  $("sendRecipientResult").innerHTML = `
    <strong>Recipient verified</strong>
    <br>
    KRISH TEST RECIPIENT
    <br>
    <small>${escapeHTML(phone)}</small>
  `;
}

toast("Recipient verified.");

}
);

$("sendSource")?.addEventListener(
"change",
e => {
showSourcePicker(
e.target.value,
"sendSourcePicker"
);

updateSendTariffPreview();

}
);

$("sendAmount")?.addEventListener(
"input",
updateSendTariffPreview
);

function updateSendTariffPreview() {
const source =
$("sendSource")?.value;

const amount =
Number($("sendAmount")?.value);

let provider = "";

if (source === "M-PESA") {
provider = "MPESA";
}

if (source === "AIRTEL") {
provider = "AIRTEL";
}

if (!provider || !amount) {
$("sendTariffPreview")
?.classList.add("hidden");

return;

}

renderTariffPreview({
amount,
provider,
transaction: "send",
targetId: "sendTariffPreview"
});
}

$("sendBtn")?.addEventListener(
"click",
() => {
if (!sendRecipientVerified) {
toast("Verify the recipient first.");
return;
}

const phone =
  $("sendPhone")?.value.trim();

const amount =
  Number($("sendAmount")?.value);

const source =
  $("sendSource")?.value;

if (!amount || amount <= 0) {
  toast("Enter a valid amount.");
  return;
}

if (amount > state.balance) {
  toast("Insufficient demo balance.");
  return;
}

if (!source) {
  toast("Select a payment source.");
  return;
}

const selected =
  selectedSource("sendSourcePicker");

let provider = "";

if (source === "M-PESA") {
  provider = "MPESA";
}

if (source === "AIRTEL") {
  provider = "AIRTEL";
}

const tariff =
  provider
    ? calculateTariff({
        provider,
        transaction: "send",
        amount
      })
    : {
        fee: 0,
        total: amount,
        valid: true,
        label: "BEAST demo transaction"
      };

if (!tariff.valid) {
  toast(
    "This amount is outside the supported demo tariff range."
  );
  return;
}

requestAuthorization({
  type: "send",
  amount,
  fee: tariff.fee,
  description:
    `Send to ${phone}`,
  source:
    selected?.label || source,
  tariffLabel:
    tariff.label
});

}
);

/* =========================================================
LIPA NA
========================================================= */

let currentLipaType = "pochi";
let lipaVerified = false;

document.querySelectorAll(".lipa-tab")
.forEach(tab => {
tab.addEventListener("click", () => {

  document.querySelectorAll(".lipa-tab")
    .forEach(x =>
      x.classList.remove("active")
    );

  tab.classList.add("active");

  currentLipaType =
    tab.dataset.type;

  /*
    Your HTML currently uses:
    data-type="till"
    data-type="bill"

    Normalize those names.
  */

  if (currentLipaType === "till") {
    currentLipaType = "buygoods";
  }

  if (currentLipaType === "bill") {
    currentLipaType = "paybill";
  }

  lipaVerified = false;

  renderLipaForm();
});

});

function renderLipaForm() {
const form = $("lipaForm");

if (!form) return;

if (currentLipaType === "pochi") {
form.innerHTML = `
<div class="field">
<label>Phone Number</label>
<input id="lipaPhone"
inputmode="tel"
placeholder="0712345678">
</div>

  <button class="secondary-btn"
    id="verifyLipa">
    VERIFY NUMBER
  </button>

  <div id="lipaResult"
    class="verify-box hidden"></div>

  <div class="field">
    <label>Amount</label>
    <input id="lipaAmount"
      class="amount-input"
      type="number"
      min="1"
      placeholder="KES 0">
  </div>

  <button class="primary-btn"
    id="lipaPay">
    PAY WITH POCHI
  </button>
`;

}

if (currentLipaType === "buygoods") {
form.innerHTML = `
<div class="field">
<label>Till Number</label>
<input id="lipaTill"
inputmode="numeric"
placeholder="123456">
</div>

  <button class="secondary-btn"
    id="verifyLipa">
    VERIFY TILL
  </button>

  <div id="lipaResult"
    class="verify-box hidden"></div>

  <div class="field">
    <label>Amount</label>
    <input id="lipaAmount"
      class="amount-input"
      type="number"
      min="1"
      placeholder="KES 0">
  </div>

  <button class="primary-btn"
    id="lipaPay">
    PAY BUY GOODS
  </button>
`;

}

if (currentLipaType === "paybill") {
form.innerHTML = `
<div class="field">
<label>Business Number</label>
<input id="lipaBusiness"
inputmode="numeric"
placeholder="Business Number">
</div>

  <div class="field">
    <label>Account Number</label>
    <input id="lipaAccount"
      placeholder="Account Number">
  </div>

  <button class="secondary-btn"
    id="verifyLipa">
    VERIFY PAYMENT DETAILS
  </button>

  <div id="lipaResult"
    class="verify-box hidden"></div>

  <div class="field">
    <label>Amount</label>
    <input id="lipaAmount"
      class="amount-input"
      type="number"
      min="1"
      placeholder="KES 0">
  </div>

  <button class="primary-btn"
    id="lipaPay">
    PAY BILL
  </button>
`;

}

$("verifyLipa")
?.addEventListener(
"click",
verifyLipa
);

$("lipaPay")
?.addEventListener(
"click",
submitLipa
);
}

function verifyLipa() {
if (currentLipaType === "pochi") {
const value =
$("lipaPhone")?.value.trim();

if (!value) {
  toast(
    "Enter the Pochi phone number."
  );
  return;
}

}

if (currentLipaType === "buygoods") {
const value =
$("lipaTill")?.value.trim();

if (!value) {
  toast("Enter the Till Number.");
  return;
}

}

if (currentLipaType === "paybill") {
const business =
$("lipaBusiness")?.value.trim();

const account =
  $("lipaAccount")?.value.trim();

if (!business || !account) {
  toast(
    "Enter both Business Number and Account Number."
  );
  return;
}

}

lipaVerified = true;

const result =
$("lipaResult");

result?.classList.remove("hidden");

if (result) {
result.innerHTML = "<strong>Payment details verified</strong> <br> Ready for authorization.";
}

toast(
"Payment details verified."
);
}

function submitLipa() {
if (!lipaVerified) {
toast(
"Verify payment details first."
);
return;
}

const amount =
Number($("lipaAmount")?.value);

if (!amount || amount <= 0) {
toast("Enter a valid amount.");
return;
}

if (amount > state.balance) {
toast(
"Insufficient demo balance."
);
return;
}

let description =
"Lipa Na payment";

if (currentLipaType === "pochi") {
description =
"Pochi • ${$("lipaPhone").value}";
}

if (currentLipaType === "buygoods") {
description =
"Buy Goods • Till ${$("lipaTill").value}";
}

if (currentLipaType === "paybill") {
description =
"Pay Bill • ${$("lipaBusiness").value} / ${$("lipaAccount").value}";
}

requestAuthorization({
type: "lipa",
amount,
fee: 0,
description,
source: "Selected BEAST source",
tariffLabel:
"Merchant payment demo"
});
}

/* =========================================================
RECEIVE — SELL / RECEIVE PAYMENT
========================================================= */

let receiveSellType = "paybill";
let receiveSellVerified = false;

document.querySelectorAll(".receive-option")
.forEach(option => {

option.addEventListener(
  "click",
  () => {

    document.querySelectorAll(
      ".receive-option"
    ).forEach(x =>
      x.classList.remove("active")
    );

    option.classList.add("active");

    receiveSellType =
      option.dataset.receiveType;

    if (receiveSellType === "bill") {
      receiveSellType = "paybill";
    }

    if (receiveSellType === "goods") {
      receiveSellType = "buygoods";
    }

    receiveSellVerified = false;

    renderReceiveSellForm();
  }
);

});

function renderReceiveSellForm() {
const form =
$("receiveSellForm");

if (!form) return;

if (receiveSellType === "paybill") {
form.innerHTML = `
<div class="detail-card">

    <div class="field">
      <label>Business Number</label>
      <input id="receiveBusiness"
        inputmode="numeric"
        placeholder="Business Number">
    </div>

    <div class="field">
      <label>Account Number</label>
      <input id="receiveAccount"
        placeholder="Account Number">
    </div>

    <button class="secondary-btn"
      id="verifyReceiveSell">
      VERIFY PAYMENT DETAILS
    </button>

    <div id="receiveSellResult"
      class="verify-box hidden"></div>

    <div class="field">
      <label>Amount Received</label>
      <input id="receiveSellAmount"
        class="amount-input"
        type="number"
        min="1"
        placeholder="KES 0">
    </div>

    <button class="primary-btn"
      id="receiveSellBtn">
      RECEIVE PAYMENT
    </button>

  </div>
`;

}

if (receiveSellType === "buygoods") {
form.innerHTML = `
<div class="detail-card">

    <div class="field">
      <label>Till Number</label>
      <input id="receiveTill"
        inputmode="numeric"
        placeholder="Till Number">
    </div>

    <button class="secondary-btn"
      id="verifyReceiveSell">
      VERIFY TILL
    </button>

    <div id="receiveSellResult"
      class="verify-box hidden"></div>

    <div class="field">
      <label>Amount Received</label>
      <input id="receiveSellAmount"
        class="amount-input"
        type="number"
        min="1"
        placeholder="KES 0">
    </div>

    <button class="primary-btn"
      id="receiveSellBtn">
      RECEIVE PAYMENT
    </button>

  </div>
`;

}

if (receiveSellType === "pochi") {
form.innerHTML = `
<div class="detail-card">

    <div class="field">
      <label>Phone Number</label>
      <input id="receivePhone"
        inputmode="tel"
        placeholder="0712345678">
    </div>

    <button class="secondary-btn"
      id="verifyReceiveSell">
      VERIFY PHONE
    </button>

    <div id="receiveSellResult"
      class="verify-box hidden"></div>

    <div class="field">
      <label>Amount Received</label>
      <input id="receiveSellAmount"
        class="amount-input"
        type="number"
        min="1"
        placeholder="KES 0">
    </div>

    <button class="primary-btn"
      id="receiveSellBtn">
      RECEIVE PAYMENT
    </button>

  </div>
`;

}

$("verifyReceiveSell")
?.addEventListener(
"click",
verifyReceiveSell
);

$("receiveSellBtn")
?.addEventListener(
"click",
submitReceiveSell
);
}

function verifyReceiveSell() {
let valid = false;

if (receiveSellType === "paybill") {
valid =
Boolean(
$("receiveBusiness")
?.value.trim()
) &&
Boolean(
$("receiveAccount")
?.value.trim()
);
}

if (receiveSellType === "buygoods") {
valid =
Boolean(
$("receiveTill")
?.value.trim()
);
}

if (receiveSellType === "pochi") {
valid =
Boolean(
$("receivePhone")
?.value.trim()
);
}

if (!valid) {
toast(
"Enter all required payment details."
);
return;
}

receiveSellVerified = true;

const result =
$("receiveSellResult");

result?.classList.remove(
"hidden"
);

if (result) {
result.innerHTML = "<strong>Details verified</strong> <br> Ready for customer authorization.";
}

toast(
"Payment details verified."
);
}

function submitReceiveSell() {
if (!receiveSellVerified) {
toast(
"Verify the payment details first."
);
return;
}

const amount =
Number(
$("receiveSellAmount")?.value
);

if (!amount || amount <= 0) {
toast(
"Enter the amount received."
);
return;
}

requestAuthorization({
type: "receive",
amount,
fee: 0,
description:
"Receive • ${receiveSellType.toUpperCase()}",
source:
"Customer payment",
tariffLabel:
"Customer payment demo"
});
}

/* =========================================================
RECEIVE — WITHDRAW
========================================================= */

let receiveWithdrawVerified = false;

$("receiveWithdrawSource")
?.addEventListener(
"change",
e => {

  receiveWithdrawVerified = false;

  renderWithdrawSource(
    e.target.value,
    "receiveWithdrawSourcePicker",
    "receiveAgentDetails"
  );
}

);

function renderWithdrawSource(
type,
pickerId,
agentId
) {
if (!type) {

$(pickerId)
  ?.classList.add("hidden");

if ($(agentId)) {
  $(agentId).innerHTML = "";
}

return;

}

const normalized =
type === "M-PESA"
? "MPESA"
: type;

renderSourcePicker(
normalized,
pickerId
);

const agent =
$(agentId);

if (!agent) return;

if (
normalized === "MPESA" ||
normalized === "AIRTEL"
) {

agent.innerHTML = `
  <div class="field">
    <label>Agent Number</label>
    <input id="${agentId}Agent"
      inputmode="tel"
      placeholder="0712345678">
  </div>

  <div class="field">
    <label>Store Number</label>
    <input id="${agentId}Store"
      placeholder="Store Number">
  </div>

  <button class="secondary-btn"
    id="${agentId}Verify">
    VERIFY WITHDRAWAL DETAILS
  </button>

  <div id="${agentId}VerifyResult"
    class="verify-box hidden"></div>
`;

$(`${agentId}Verify`)
  ?.addEventListener(
    "click",
    () => {
      verifyWithdrawAgent(
        agentId
      );
    }
  );

} else {

agent.innerHTML = `
  <div class="verify-box">
    <strong>Source selected</strong>
    <br>
    No agent/store details required
    for this source.
  </div>
`;

}

agent.classList.remove(
"hidden"
);
}

function verifyWithdrawAgent(
agentId
) {
const agent =
$("${agentId}Agent")
?.value.trim();

const store =
$("${agentId}Store")
?.value.trim();

if (!agent || !store) {
toast(
"Enter Agent Number and Store Number."
);
return;
}

receiveWithdrawVerified = true;
generalWithdrawVerified = true;

const result =
$("${agentId}VerifyResult");

result?.classList.remove(
"hidden"
);

if (result) {
result.innerHTML = "<strong>Withdrawal details verified</strong> <br> Agent and Store confirmed.";
}

toast(
"Withdrawal details verified."
);
}

/* =========================================================
RECEIVE WITHDRAW BUTTON
========================================================= */

$("receiveWithdrawBtn")
?.addEventListener(
"click",
() => {

  const sourceType =
    $("receiveWithdrawSource")
      ?.value;

  const amount =
    Number(
      $("receiveWithdrawAmount")
        ?.value
    );

  if (!sourceType) {
    toast(
      "Select the withdrawal source."
    );
    return;
  }

  const normalized =
    sourceType === "M-PESA"
      ? "MPESA"
      : sourceType;

  const source =
    selectedSource(
      "receiveWithdrawSourcePicker"
    );

  if (!source) {
    toast(
      "Select the exact source or line."
    );
    return;
  }

  if (
    (
      normalized === "MPESA" ||
      normalized === "AIRTEL"
    ) &&
    !receiveWithdrawVerified
  ) {
    toast(
      "Verify Agent Number and Store Number first."
    );
    return;
  }

  if (!amount || amount <= 0) {
    toast(
      "Enter a valid withdrawal amount."
    );
    return;
  }

  if (amount > state.balance) {
    toast(
      "Insufficient demo balance."
    );
    return;
  }

  /*
    Withdrawal fees are intentionally not
    guessed from the send-money table.

    They should use the provider's current
    withdrawal tariff when the production
    integration is connected.
  */

  requestAuthorization({
    type: "withdraw",
    amount,
    fee: 0,
    description:
      `Agent withdrawal • ${source.label}`,
    source:
      source.label,
    tariffLabel:
      "Withdrawal fee shown as demo pending live provider tariff"
  });
}

);

/* =========================================================
GENERAL WITHDRAW
========================================================= */

let generalWithdrawVerified = false;

$("withdrawSource")
?.addEventListener(
"change",
e => {

  generalWithdrawVerified = false;

  renderWithdrawSource(
    e.target.value,
    "withdrawSourcePicker",
    "withdrawAgentDetails"
  );
}

);

$("withdrawBtn")
?.addEventListener(
"click",
() => {

  const sourceType =
    $("withdrawSource")
      ?.value;

  const amount =
    Number(
      $("withdrawAmount")
        ?.value
    );

  if (!sourceType) {
    toast(
      "Select the withdrawal source."
    );
    return;
  }

  const normalized =
    sourceType === "M-PESA"
      ? "MPESA"
      : sourceType;

  const source =
    selectedSource(
      "withdrawSourcePicker"
    );

  if (!source) {
    toast(
      "Select the exact source or line."
    );
    return;
  }

  if (
    (
      normalized === "MPESA" ||
      normalized === "AIRTEL"
    ) &&
    !generalWithdrawVerified
  ) {
    toast(
      "Verify Agent Number and Store Number first."
    );
    return;
  }

  if (!amount || amount <= 0) {
    toast(
      "Enter a valid withdrawal amount."
    );
    return;
  }

  if (amount > state.balance) {
    toast(
      "Insufficient demo balance."
    );
    return;
  }

  requestAuthorization({
    type: "withdraw",
    amount,
    fee: 0,
    description:
      `Withdrawal • ${source.label}`,
    source:
      source.label,
    tariffLabel:
      "Withdrawal demo"
  });
}

);

/* =========================================================
AUTHORIZATION
========================================================= */

let pendingTransaction = null;

function requestAuthorization(
transaction
) {
pendingTransaction =
transaction;

const modal =
$("authModal");

if (!modal) return;

let description =
"${transaction.description} • ${money(transaction.amount)}";

if (
transaction.tariffLabel
) {
description +=
" • ${transaction.tariffLabel}";
}

if (
Number(transaction.fee || 0) > 0
) {
description +=
" • Fee ${money(transaction.fee)}";
}

$("authDescription")
.textContent =
description;

$("authPin").value = "";

modal.classList.remove(
"hidden"
);

setTimeout(() => {
$("authPin")?.focus();
}, 100);
}

$("authorizeBtn")
?.addEventListener(
"click",
authorizeTransaction
);

$("authPin")
?.addEventListener(
"keydown",
event => {

  if (event.key === "Enter") {
    authorizeTransaction();
  }
}

);

function authorizeTransaction() {
if (!pendingTransaction) {
return;
}

const pin =
$("authPin")?.value || "";

if (pin !== DEMO_PIN) {
toast(
"Incorrect demo PIN."
);
return;
}

completeTransaction(
pendingTransaction
);

pendingTransaction = null;

$("authModal")
?.classList.add("hidden");
}

/* =========================================================
COMPLETE TRANSACTION
========================================================= */

function completeTransaction(
tx
) {
const fee =
Number(tx.fee || 0);

if (tx.type === "receive") {

state.balance +=
  Number(tx.amount);

addHistory({
  type: "receive",
  title: tx.description,
  amount:
    Number(tx.amount),
  fee: 0,
  source:
    tx.source,
  tariffLabel:
    tx.tariffLabel || ""
});

updateBalance();

showReceipt({
  title:
    "Payment Received",
  amount:
    tx.amount,
  fee: 0,
  total:
    tx.amount,
  source:
    tx.source,
  tariffLabel:
    tx.tariffLabel
});

save();

return;

}

const total =
Number(tx.amount) + fee;

if (total > state.balance) {
toast(
"Insufficient demo balance."
);
return;
}

state.balance -=
total;

addHistory({
type:
tx.type,
title:
tx.description,
amount:
Number(tx.amount),
fee,
source:
tx.source,
tariffLabel:
tx.tariffLabel || ""
});

updateBalance();

showReceipt({
title:
tx.type === "withdraw"
? "Withdrawal Complete"
: tx.type === "lipa"
? "Payment Complete"
: "Transfer Complete",

amount:
  tx.amount,

fee,

total,

source:
  tx.source,

tariffLabel:
  tx.tariffLabel

});

save();
}

/* =========================================================
HISTORY
========================================================= */

function addHistory(item) {
state.history.unshift({
id:
Date.now(),

date:
  new Date()
    .toLocaleString("en-KE"),

...item

});

state.history =
state.history.slice(
0,
100
);

renderHistory();
}

function renderHistory() {
const list =
$("historyList");

if (!list) return;

if (!state.history.length) {
list.innerHTML = "<div class="empty-state"> No transactions yet. </div>";

return;

}

list.innerHTML =
state.history
.map(item => {

    const positive =
      item.type === "receive";

    return `
      <div class="history-item">

        <div>
          <strong>
            ${escapeHTML(
              item.title
            )}
          </strong>

          <small>
            ${escapeHTML(
              item.date
            )}
            <br>

            ${escapeHTML(
              item.source || ""
            )}

            ${
              item.tariffLabel
                ? `
                  <br>
                  ${escapeHTML(
                    item.tariffLabel
                  )}
                `
                : ""
            }
          </small>
        </div>

        <div>
          <strong>
            ${
              positive
                ? "+"
                : "-"
            }${money(
              item.amount
            )}
          </strong>

          ${
            item.fee
              ? `
                <small>
                  Fee:
                  ${money(
                    item.fee
                  )}
                </small>
              `
              : ""
          }
        </div>

      </div>
    `;
  })
  .join("");

}

/* =========================================================
RECEIPT
========================================================= */

function showReceipt(
data
) {
const modal =
$("receiptModal");

const content =
$("receiptContent");

if (!modal || !content) {
return;
}

content.innerHTML = `
<div class="success-icon">
✓
</div>

<h3>
  ${escapeHTML(
    data.title
  )}
</h3>

<div class="receipt-row">
  <span>Amount</span>
  <strong>
    ${money(
      data.amount
    )}
  </strong>
</div>

<div class="receipt-row">
  <span>Fee</span>
  <strong>
    ${money(
      data.fee
    )}
  </strong>
</div>

<div class="receipt-row">
  <span>Total</span>
  <strong>
    ${money(
      data.total
    )}
  </strong>
</div>

${
  data.tariffLabel
    ? `
      <div class="receipt-row">
        <span>Tariff</span>
        <strong>
          ${escapeHTML(
            data.tariffLabel
          )}
        </strong>
      </div>
    `
    : ""
}

<div class="receipt-row">
  <span>Source</span>
  <strong>
    ${escapeHTML(
      data.source || ""
    )}
  </strong>
</div>

<div class="receipt-row">
  <span>Status</span>
  <strong>
    COMPLETED
  </strong>
</div>

`;

modal.classList.remove(
"hidden"
);
}

document.querySelectorAll(
".modal-close"
).forEach(button => {

button.addEventListener(
"click",
() => {
button
.closest(".modal")
?.classList.add(
"hidden"
);
}
);
});

/* =========================================================
SECURITY
========================================================= */

$("receiveDeviceVerify")
?.addEventListener(
"click",
() => {

  const alertBox =
    $("receiveSecurityAlert");

  if (alertBox) {
    alertBox.innerHTML = `
      <strong>
        Terminal verified ✓
      </strong>

      <br>

      Secure activity may continue
      on this terminal.
    `;
  }

  toast(
    "Terminal verified."
  );
}

);

/*
Browser limitation:
A static website cannot reliably detect
every Android screenshot or screen-recording
method.

Visibility/focus protection can pause
sensitive activity, but this is NOT universal
screenshot detection.
*/

document.addEventListener(
"visibilitychange",
() => {

if (
  !state.settings
    .screenProtection
) {
  return;
}

if (document.hidden) {

  document.title =
    "PAUSED • MONEY TRANSFER BEAST";

  toast(
    "Secure activity paused."
  );

} else {

  document.title =
    "MONEY TRANSFER BEAST";
}

}
);

window.addEventListener(
"blur",
() => {

if (
  !state.settings
    .screenProtection
) {
  return;
}

toast(
  "Secure activity paused."
);

}
);

/* =========================================================
SETTINGS
========================================================= */

function updateSettingsUI() {

if ($("securityAlertsToggle")) {
$("securityAlertsToggle")
.checked =
state.settings.securityAlerts;
}

if ($("notificationsToggle")) {
$("notificationsToggle")
.checked =
state.settings.notifications;
}

if ($("screenProtectionToggle")) {
$("screenProtectionToggle")
.checked =
state.settings.screenProtection;
}
}

$("securityAlertsToggle")
?.addEventListener(
"change",
e => {

  state.settings.securityAlerts =
    e.target.checked;

  save();
}

);

$("notificationsToggle")
?.addEventListener(
"change",
e => {

  state.settings.notifications =
    e.target.checked;

  save();
}

);

$("screenProtectionToggle")
?.addEventListener(
"change",
e => {

  state.settings.screenProtection =
    e.target.checked;

  save();
}

);

/* =========================================================
DARK / LIGHT MODE
========================================================= */

function applyTheme() {

document.body.classList.toggle(
"dark",
state.dark
);

if ($("menuTheme")) {

$("menuTheme")
  .textContent =
  state.dark
    ? "☀️ Light Mode"
    : "🌙 Dark Mode";

}
}

$("menuTheme")
?.addEventListener(
"click",
() => {

  state.dark =
    !state.dark;

  applyTheme();

  save();
}

);

/* =========================================================
MENU
========================================================= */

$("menuBtn")
?.addEventListener(
"click",
openMenu
);

$("closeMenu")
?.addEventListener(
"click",
closeMenu
);

$("menuOverlay")
?.addEventListener(
"click",
closeMenu
);

document.querySelectorAll(
".menu-item[data-open]"
).forEach(item => {

item.addEventListener(
"click",
() => {

  openPanel(
    item.dataset.open
  );
}

);
});

/* =========================================================
QUICK SERVICE CARDS
========================================================= */

document.querySelectorAll(
".service-card[data-panel]"
).forEach(card => {

card.addEventListener(
"click",
() => {

  openPanel(
    card.dataset.panel
  );
}

);
});

/* =========================================================
BEAST ID COPY
========================================================= */

$("copyBeastId")
?.addEventListener(
"click",
async () => {

  const id =
    $("beastId")
      ?.textContent
      .trim();

  try {

    await navigator
      .clipboard
      .writeText(id);

    toast(
      "BEAST ID copied."
    );

  } catch {

    toast(
      "BEAST ID: " + id
    );
  }
}

);

/* =========================================================
INITIALIZE
========================================================= */

function init() {

updateBalance();

applyTheme();

updateSettingsUI();

renderHistory();

renderLipaForm();

renderReceiveSellForm();

if ($("sendSource")) {

showSourcePicker(
  $("sendSource")
    .value ||
    "MPESA",

  "sendSourcePicker"
);

updateSendTariffPreview();

}

if (
$("receiveWithdrawSource")
?.value
) {

renderWithdrawSource(
  $("receiveWithdrawSource")
    .value,

  "receiveWithdrawSourcePicker",

  "receiveAgentDetails"
);

}

if (
$("withdrawSource")
?.value
) {

renderWithdrawSource(
  $("withdrawSource")
    .value,

  "withdrawSourcePicker",

  "withdrawAgentDetails"
);

}
}

init();

/* =========================================================
OPTIONAL GLOBAL ACCESS
Useful for testing tariff calculations
in the browser console.
========================================================= */

window.BEAST_TARIFF = {
calculateTariff,
MPESA_SEND_TARIFF,
AIRTEL_OTHER_NETWORK_SEND_TARIFF,
AIRTEL_BANK_WALLET_TARIFF
};