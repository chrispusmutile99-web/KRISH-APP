document.addEventListener("DOMContentLoaded", () => {

/* =========================================================
MONEY TRANSFER BEAST
Customer + Owner/Admin + Fee/Revenue + BEAST AI
DEMO / LOCAL STORAGE VERSION
========================================================= */

const KEY = "mtb_beast_v7";
const REG_KEY = "mtb_beast_registration_v5";

const DEFAULT_STATE = {
registered: false,
fullName: "",
phone: "",
nationalId: "",
beastId: "",
beastPin: "",
balance: 0,
dark: true,

settings: {
  securityAlerts: true,
  notifications: true
},

sources: [
  {
    id: "mpesa1",
    type: "M-PESA",
    provider: "Safaricom M-PESA",
    number: "0712345678",
    label: "Primary Line",
    balance: 2500
  },
  {
    id: "mpesa2",
    type: "M-PESA",
    provider: "Safaricom M-PESA",
    number: "0798765432",
    label: "Secondary Line",
    balance: 1200
  },
  {
    id: "airtel1",
    type: "Airtel Money",
    provider: "Airtel Money",
    number: "0734567890",
    label: "Primary Line",
    balance: 1500
  },
  {
    id: "airtel2",
    type: "Airtel Money",
    provider: "Airtel Money",
    number: "0787654321",
    label: "Secondary Line",
    balance: 900
  },
  {
    id: "bank1",
    type: "Bank",
    provider: "KCB Bank",
    number: "KCB •••• 4582",
    label: "Savings",
    balance: 8500
  },
  {
    id: "bank2",
    type: "Bank",
    provider: "Equity Bank",
    number: "Equity •••• 9134",
    label: "Current",
    balance: 4200
  },
  {
    id: "bank3",
    type: "Bank",
    provider: "Co-operative Bank",
    number: "Co-operative •••• 2210",
    label: "Savings",
    balance: 6700
  },
  {
    id: "card1",
    type: "Card",
    provider: "BEAST Visa",
    number: "BEAST Visa •••• 4821",
    label: "Debit",
    balance: 3000
  },
  {
    id: "card2",
    type: "Card",
    provider: "M-PESA Card",
    number: "M-PESA Card •••• 7720",
    label: "Prepaid",
    balance: 1800
  },
  {
    id: "card3",
    type: "Card",
    provider: "Demo Mastercard",
    number: "Mastercard •••• 1188",
    label: "Debit",
    balance: 2200
  },
  {
    id: "wallet1",
    type: "BEAST Wallet",
    provider: "BEAST Wallet",
    number: "Main Wallet",
    label: "Personal Wallet",
    balance: 5000
  }
],

history: [],

ownerLedger: {
  beastFees: 0,
  providerCosts: 0,
  refunds: 0,
  transactions: []
},

securityLogs: []

};

/* =========================================================
STATE
========================================================= */

let state = loadState();

let selectedSendSource = null;
let selectedReceiveSource = null;
let selectedWithdrawSource = null;
let selectedLipaSource = null;

let receiveMethod = "paybill";
let lipaMethod = "paybill";

let pendingReceive = null;
let pendingPinCallback = null;

let currentAdminSection = "overview";

/* =========================================================
HELPERS
========================================================= */

function clone(obj) {
return JSON.parse(JSON.stringify(obj));
}

function mergeState(base, saved) {
const result = clone(base);

if (!saved || typeof saved !== "object") {
  return result;
}

Object.keys(saved).forEach(key => {
  if (key === "settings") {
    result.settings = {
      ...result.settings,
      ...(saved.settings || {})
    };
  } else if (key === "ownerLedger") {
    result.ownerLedger = {
      ...result.ownerLedger,
      ...(saved.ownerLedger || {}),
      transactions:
        Array.isArray(saved.ownerLedger?.transactions)
          ? saved.ownerLedger.transactions
          : []
    };
  } else if (key === "sources") {
    if (Array.isArray(saved.sources)) {
      result.sources = saved.sources;
    }
  } else if (key === "history") {
    result.history = Array.isArray(saved.history)
      ? saved.history
      : [];
  } else if (key === "securityLogs") {
    result.securityLogs = Array.isArray(saved.securityLogs)
      ? saved.securityLogs
      : [];
  } else {
    result[key] = saved[key];
  }
});

return result;

}

function loadState() {
try {
const saved = JSON.parse(localStorage.getItem(KEY));
return mergeState(DEFAULT_STATE, saved);
} catch (error) {
return clone(DEFAULT_STATE);
}
}

function saveState() {
localStorage.setItem(KEY, JSON.stringify(state));

localStorage.setItem(
  REG_KEY,
  JSON.stringify({
    registered: state.registered,
    fullName: state.fullName,
    phone: state.phone,
    nationalId: state.nationalId,
    beastId: state.beastId
  })
);

}

function $(id) {
return document.getElementById(id);
}

function money(value) {
const number = Number(value || 0);

return new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(number);

}

function shortMoney(value) {
return "KES ${money(value)}";
}

function escapeHTML(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function now() {
return new Date().toLocaleString("en-KE", {
dateStyle: "medium",
timeStyle: "short"
});
}

function reference() {
return "BT" +
Date.now().toString().slice(-8) +
Math.floor(Math.random() * 90 + 10);
}

function amountValue(id) {
const el = $(id);
return Number(el?.value || 0);
}

function sourceById(id) {
return state.sources.find(source => source.id === id) || null;
}

function maskNumber(number) {
const value = String(number || "");

if (value.length <= 4) {
  return value;
}

return value.slice(0, 3) +
  "••••" +
  value.slice(-3);

}

function toast(message, type = "normal") {
const el = $("toast");

if (!el) return;

el.textContent = message;
el.className = `toast show ${type}`;

clearTimeout(window.__beastToastTimer);

window.__beastToastTimer = setTimeout(() => {
  el.className = "toast";
}, 3000);

}

function normalizeKenyanPhone(phone) {
let value = String(phone || "").replace(/\s+/g, "");

if (value.startsWith("+254")) {
  value = "0" + value.slice(4);
} else if (value.startsWith("254")) {
  value = "0" + value.slice(3);
}

return value;

}

function validKenyanPhone(phone) {
const normalized = normalizeKenyanPhone(phone);

return /^(07|01)\d{8}$/.test(normalized);

}

function generateBeastId() {
let id;

do {
  id =
    "BEAST" +
    Math.floor(100000 + Math.random() * 900000);
} while (id === state.beastId);

return id;

}

function formatProvider(provider) {
return provider || "BEAST Demo Provider";
}

/* =========================================================
FEE ENGINE
========================================================= */

/*
BEAST platform fee:
KES 1 - 1,000       = KES 5
KES 1,001 - 10,000  = KES 10
KES 10,001+         = KES 15

 Provider cost is kept separate.

 The Safaricom figures below are treated as a configurable
 business/API cost model, NOT as ordinary consumer M-PESA
 Send Money charges.

*/

const PROVIDER_COSTS = {
SAFARICOM_API_B2C: [
{ max: 100, fee: 0 },
{ max: 1500, fee: 5 },
{ max: 5000, fee: 9 },
{ max: 20000, fee: 11 },
{ max: 250000, fee: 13 }
],

AIRTEL_API: []

};

function calculateBeastFee(type, amount) {
amount = Number(amount || 0);

if (amount <= 0) return 0;

if (amount <= 1000) return 5;

if (amount <= 10000) return 10;

return 15;

}

function providerTableFee(table, amount) {
for (const band of table) {
if (amount <= band.max) {
return band.fee;
}
}

return 0;

}

function getProviderRoute(type, source) {

const sourceType = source?.type || "";
const provider = source?.provider || sourceType || "Unknown";

if (sourceType === "M-PESA") {
  return {
    provider: "Safaricom M-PESA",
    route: `${String(type).toUpperCase()} / M-PESA`,
    costModel: "Safaricom business/API demo schedule",
    configured: true
  };
}

if (sourceType === "Airtel Money") {
  return {
    provider: "Airtel Money",
    route: `${String(type).toUpperCase()} / AIRTEL MONEY`,
    costModel: "Provider contract/API cost not configured",
    configured: false
  };
}

if (sourceType === "Bank") {
  return {
    provider,
    route: `${String(type).toUpperCase()} / BANK`,
    costModel: "Bank provider cost not configured",
    configured: false
  };
}

if (sourceType === "Card") {
  return {
    provider,
    route: `${String(type).toUpperCase()} / CARD`,
    costModel: "Card provider cost not configured",
    configured: false
  };
}

if (sourceType === "BEAST Wallet") {
  return {
    provider: "BEAST Wallet",
    route: `${String(type).toUpperCase()} / BEAST WALLET`,
    costModel: "Internal demo route",
    configured: true
  };
}

return {
  provider,
  route: String(type).toUpperCase(),
  costModel: "Not configured",
  configured: false
};

}

function calculateProviderFee(type, amount, source) {

amount = Number(amount || 0);

if (amount <= 0) {
  return 0;
}

const route = getProviderRoute(type, source);

if (
  source?.type === "M-PESA" &&
  route.configured
) {
  return providerTableFee(
    PROVIDER_COSTS.SAFARICOM_API_B2C,
    amount
  );
}

/*
  Do not pretend unknown provider contracts are free.
  The demo uses zero until a provider-specific contract
  cost is configured.
*/

return 0;

}

function getFeeBreakdown(type, amount, source) {

amount = Number(amount || 0);

const route = getProviderRoute(type, source);

const providerFee =
  calculateProviderFee(type, amount, source);

const beastFee =
  calculateBeastFee(type, amount);

return {
  amount,
  providerFee,
  beastFee,
  total: amount + providerFee + beastFee,
  recipientReceives: amount,
  provider: route.provider,
  route: route.route,
  providerCostStatus: route.costModel
};

}

/* =========================================================
FEE SUMMARY
========================================================= */

function renderFeeSummary(id, fees) {

const el = $(id);

if (!el) return;

if (!fees || Number(fees.amount) <= 0) {
  el.innerHTML = "";
  return;
}

const status =
  fees.providerCostStatus &&
  fees.providerCostStatus !== "Safaricom business/API demo schedule"
    ? `<div class="fee-note">${escapeHTML(fees.providerCostStatus)}</div>`
    : "";

el.innerHTML = `
  <div class="fee-row">
    <span>Amount</span>
    <strong>KES ${money(fees.amount)}</strong>
  </div>

  <div class="fee-row">
    <span>Provider cost</span>
    <strong>KES ${money(fees.providerFee)}</strong>
  </div>

  <div class="fee-row">
    <span>BEAST platform fee</span>
    <strong>KES ${money(fees.beastFee)}</strong>
  </div>

  <div class="fee-row">
    <span>Recipient receives</span>
    <strong>KES ${money(fees.recipientReceives)}</strong>
  </div>

  <div class="fee-row total">
    <span>Total debit</span>
    <strong>KES ${money(fees.total)}</strong>
  </div>

  ${status}
`;

}

/* =========================================================
REGISTRATION
========================================================= */

function showRegistrationStep(step) {

[1, 2, 3].forEach(number => {

  const section = $(`registrationStep${number}`);
  const dot = $(`progressDot${number}`);

  if (section) {
    section.classList.toggle(
      "active",
      number === step
    );
  }

  if (dot) {
    dot.classList.toggle(
      "active",
      number === step
    );

    dot.classList.toggle(
      "done",
      number < step
    );
  }
});

}

function registrationMessage(message) {
const el = $("registrationMessage");

if (el) {
  el.textContent = message || "";
}

}

function setupRegistration() {

showRegistrationStep(1);

const next1 = $("registrationNext1");
const next2 = $("registrationNext2");
const back1 = $("registrationBack1");
const back2 = $("registrationBack2");
const finish = $("registrationFinish");

if (next1) {
  next1.addEventListener("click", () => {

    registrationMessage("");

    const name =
      $("registrationName")?.value.trim() || "";

    const phone =
      normalizeKenyanPhone(
        $("registrationPhone")?.value.trim() || ""
      );

    const nationalId =
      $("registrationId")?.value.trim() || "";

    if (name.length < 3) {
      registrationMessage(
        "Please enter your full name."
      );
      return;
    }

    if (!validKenyanPhone(phone)) {
      registrationMessage(
        "Enter a valid Kenyan phone number."
      );
      return;
    }

    if (nationalId.length < 5) {
      registrationMessage(
        "Enter your National ID."
      );
      return;
    }

    $("registrationPhone").value = phone;

    showRegistrationStep(2);
  });
}

if (back1) {
  back1.addEventListener("click", () => {
    registrationMessage("");
    showRegistrationStep(1);
  });
}

if (next2) {
  next2.addEventListener("click", () => {

    registrationMessage("");

    const pin =
      $("registrationPin")?.value.trim() || "";

    const confirmPin =
      $("registrationPinConfirm")?.value.trim() || "";

    if (!/^\d{4,6}$/.test(pin)) {
      registrationMessage(
        "BEAST PIN must contain 4–6 digits."
      );
      return;
    }

    if (pin !== confirmPin) {
      registrationMessage(
        "BEAST PIN confirmation does not match."
      );
      return;
    }

    const name =
      $("registrationName")?.value.trim() || "";

    const phone =
      normalizeKenyanPhone(
        $("registrationPhone")?.value.trim() || ""
      );

    const nationalId =
      $("registrationId")?.value.trim() || "";

    $("registrationSummaryName").textContent =
      name;

    $("registrationSummaryPhone").textContent =
      phone;

    $("registrationSummaryId").textContent =
      nationalId;

    const beastId = generateBeastId();

    $("registrationBeastId").textContent =
      beastId;

    showRegistrationStep(3);
  });
}

if (back2) {
  back2.addEventListener("click", () => {
    registrationMessage("");
    showRegistrationStep(2);
  });
}

if (finish) {
  finish.addEventListener("click", () => {

    registrationMessage("");

    const name =
      $("registrationName")?.value.trim() || "";

    const phone =
      normalizeKenyanPhone(
        $("registrationPhone")?.value.trim() || ""
      );

    const nationalId =
      $("registrationId")?.value.trim() || "";

    const pin =
      $("registrationPin")?.value.trim() || "";

    const beastId =
      $("registrationBeastId")?.textContent.trim() || "";

    if (!name || !validKenyanPhone(phone)) {
      registrationMessage(
        "Registration information is incomplete."
      );
      showRegistrationStep(1);
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      registrationMessage(
        "Invalid BEAST PIN."
      );
      showRegistrationStep(2);
      return;
    }

    if (!beastId || beastId === "—") {
      registrationMessage(
        "BEAST ID could not be generated."
      );
      return;
    }

    state.registered = true;
    state.fullName = name;
    state.phone = phone;
    state.nationalId = nationalId;
    state.beastPin = pin;
    state.beastId = beastId;

    saveState();

    showApp();

    toast(
      "BEAST account created successfully.",
      "success"
    );
  });
}

}

/* =========================================================
APP VISIBILITY
========================================================= */

function showApp() {

$("registrationScreen")?.classList.add("hidden");
$("beastApp")?.classList.remove("hidden");
$("adminScreen")?.classList.add("hidden");

renderDashboard();
renderAllSourcePickers();
renderHistory();
renderSettings();

}

function showRegistration() {

$("registrationScreen")?.classList.remove("hidden");
$("beastApp")?.classList.add("hidden");
$("adminScreen")?.classList.add("hidden");

showRegistrationStep(1);

}

/* =========================================================
DASHBOARD
========================================================= */

function calculateTotalBalance() {

return state.sources.reduce(
  (total, source) =>
    total + Number(source.balance || 0),
  0
);

}

function renderDashboard() {

if ($("dashboardName")) {
  $("dashboardName").textContent =
    state.fullName || "BEAST USER";
}

if ($("dashboardBalance")) {
  $("dashboardBalance").textContent =
    shortMoney(calculateTotalBalance());
}

if ($("dashboardBeastId")) {
  $("dashboardBeastId").textContent =
    state.beastId || "—";
}

}

/* =========================================================
SOURCE PICKERS
========================================================= */

function renderSourcePicker(id, selectedId, onSelect) {

const container = $(id);

if (!container) return;

container.innerHTML = state.sources.map(source => {

  const active =
    source.id === selectedId
      ? "active"
      : "";

  return `
    <button
      type="button"
      class="source-card ${active}"
      data-source-id="${escapeHTML(source.id)}"
    >
      <strong>${escapeHTML(source.provider)}</strong>
      <span>${escapeHTML(source.label)} · ${escapeHTML(maskNumber(source.number))}</span>
      <span class="source-balance">
        KES ${money(source.balance)}
      </span>
    </button>
  `;
}).join("");

container
  .querySelectorAll(".source-card")
  .forEach(button => {

    button.addEventListener("click", () => {

      const sourceId =
        button.dataset.sourceId;

      onSelect(sourceId);

      renderAllSourcePickers();
      updateFeeSummaries();
    });
  });

}

function renderAllSourcePickers() {

renderSourcePicker(
  "sendSourcePicker",
  selectedSendSource,
  id => {
    selectedSendSource = id;
  }
);

renderSourcePicker(
  "receiveSourcePicker",
  selectedReceiveSource,
  id => {
    selectedReceiveSource = id;
  }
);

renderSourcePicker(
  "withdrawSourcePicker",
  selectedWithdrawSource,
  id => {
    selectedWithdrawSource = id;
  }
);

renderSourcePicker(
  "lipaSourcePicker",
  selectedLipaSource,
  id => {
    selectedLipaSource = id;
  }
);

}

/* =========================================================
SEND
========================================================= */

function setupSend() {

$("verifyRecipientButton")?.addEventListener(
  "click",
  verifyRecipient
);

$("sendRecipient")?.addEventListener(
  "input",
  () => {
    $("recipientVerification")
      ?.classList.add("hidden");
  }
);

$("sendAmount")?.addEventListener(
  "input",
  updateFeeSummaries
);

$("sendButton")?.addEventListener(
  "click",
  beginSend
);

}

function verifyRecipient() {

const phone =
  normalizeKenyanPhone(
    $("sendRecipient")?.value.trim() || ""
  );

if (!validKenyanPhone(phone)) {
  toast(
    "Enter a valid Kenyan recipient number.",
    "error"
  );
  return;
}

$("sendRecipient").value = phone;

$("recipientName").textContent =
  "KRISH DEMO RECIPIENT";

$("recipientVerification")
  ?.classList.remove("hidden");

toast(
  "Recipient verified.",
  "success"
);

}

function beginSend() {

const source =
  sourceById(selectedSendSource);

const recipient =
  normalizeKenyanPhone(
    $("sendRecipient")?.value.trim() || ""
  );

const amount =
  amountValue("sendAmount");

if (!source) {
  toast(
    "Select a payment source.",
    "error"
  );
  return;
}

if (!validKenyanPhone(recipient)) {
  toast(
    "Verify a valid recipient first.",
    "error"
  );
  return;
}

if (amount <= 0) {
  toast(
    "Enter a valid amount.",
    "error"
  );
  return;
}

const fees =
  getFeeBreakdown(
    "SEND",
    amount,
    source
  );

if (source.balance < fees.total) {
  toast(
    "Insufficient source balance.",
    "error"
  );
  return;
}

openPinModal(
  "Authorize Send Money",
  fees,
  () => completeSendTransaction(
    source,
    recipient,
    fees
  )
);

}

function completeSendTransaction(
source,
recipient,
fees
) {

source.balance -= fees.total;

const tx = recordTransaction({
  type: "SEND",
  provider: fees.provider,
  route: fees.route,
  source: source.provider,
  recipient: recipient,
  amount: fees.amount,
  providerFee: fees.providerFee,
  beastFee: fees.beastFee,
  total: fees.total,
  status: "COMPLETED"
});

recordRevenue(
  fees,
  {
    ...tx
  }
);

saveState();

renderDashboard();
renderAllSourcePickers();
renderHistory();

$("sendAmount").value = "";

updateFeeSummaries();

toast(
  `KES ${money(fees.amount)} sent successfully.`,
  "success"
);

}

/* =========================================================
RECEIVE / SELL
========================================================= */

function setupReceive() {

document
  .querySelectorAll(".receive-option")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".receive-option")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      receiveMethod =
        button.dataset.receiveMethod ||
        "paybill";

      renderReceiveForm();
    });
  });

$("verifySellerButton")?.addEventListener(
  "click",
  verifySeller
);

$("receiveAmount")?.addEventListener(
  "input",
  updateFeeSummaries
);

$("receiveButton")?.addEventListener(
  "click",
  beginReceive
);

$("verifyWithdrawButton")?.addEventListener(
  "click",
  verifyWithdrawal
);

$("withdrawAmount")?.addEventListener(
  "input",
  updateFeeSummaries
);

$("withdrawButton")?.addEventListener(
  "click",
  beginWithdraw
);

}

function renderReceiveForm() {

const sellPanel =
  $("sellReceivePanel");

const withdrawPanel =
  $("withdrawPanel");

if (receiveMethod === "withdraw") {

  sellPanel?.classList.add("hidden");
  withdrawPanel?.classList.remove("hidden");

} else {

  sellPanel?.classList.remove("hidden");
  withdrawPanel?.classList.add("hidden");
}

updateFeeSummaries();

}

function verifySeller() {

const seller =
  $("receiveSeller")?.value.trim() || "";

if (seller.length < 4) {
  toast(
    "Enter a valid seller or business number.",
    "error"
  );
  return;
}

$("sellerName").textContent =
  receiveMethod === "paybill"
    ? "KRISH DEMO BUSINESS"
    : receiveMethod === "buygoods"
      ? "KRISH DEMO SHOP"
      : "KRISH DEMO POCHI";

$("sellerVerification")
  ?.classList.remove("hidden");

toast(
  "Seller verified.",
  "success"
);

}

function beginReceive() {

const source =
  sourceById(selectedReceiveSource);

const seller =
  $("receiveSeller")?.value.trim() || "";

const amount =
  amountValue("receiveAmount");

if (!source) {
  toast(
    "Select a payment source.",
    "error"
  );
  return;
}

if (seller.length < 4) {
  toast(
    "Verify the seller first.",
    "error"
  );
  return;
}

if (amount <= 0) {
  toast(
    "Enter a valid amount.",
    "error"
  );
  return;
}

const fees =
  getFeeBreakdown(
    `RECEIVE-${receiveMethod}`,
    amount,
    source
  );

if (source.balance < fees.total) {
  toast(
    "Insufficient source balance.",
    "error"
  );
  return;
}

pendingReceive = {
  sourceId: source.id,
  seller,
  amount,
  fees,
  method: receiveMethod
};

openBuyerLogin();

}

/* =========================================================
BUYER LOGIN
========================================================= */

function openBuyerLogin() {

$("buyerLoginModal")
  ?.classList.remove("hidden");

$("buyerLoginPhone").value =
  state.phone || "";

$("buyerLoginBeastId").value =
  state.beastId || "";

$("buyerLoginPin").value = "";

}

function setupBuyerLogin() {

$("buyerLoginClose")?.addEventListener(
  "click",
  () => {
    $("buyerLoginModal")
      ?.classList.add("hidden");
  }
);

$("buyerLoginContinue")?.addEventListener(
  "click",
  continueBuyerLogin
);

$("buyerUnavailableButton")?.addEventListener(
  "click",
  () => {
    toast(
      "Use secure terminal/agent verification in the production version.",
      "normal"
    );
  }
);

}

function continueBuyerLogin() {

const phone =
  normalizeKenyanPhone(
    $("buyerLoginPhone")?.value.trim() || ""
  );

const beastId =
  $("buyerLoginBeastId")?.value.trim() || "";

const pin =
  $("buyerLoginPin")?.value.trim() || "";

if (
  phone !== normalizeKenyanPhone(state.phone) ||
  beastId !== state.beastId ||
  pin !== state.beastPin
) {
  toast(
    "Buyer login details are incorrect.",
    "error"
  );
  return;
}

$("buyerLoginModal")
  ?.classList.add("hidden");

openSellerApproval();

}

/* =========================================================
SELLER APPROVAL
========================================================= */

function openSellerApproval() {

if (!pendingReceive) {
  toast(
    "No pending payment found.",
    "error"
  );
  return;
}

const details =
  $("sellerApprovalDetails");

if (details) {

  details.innerHTML = `
    <div>
      <span>Seller</span>
      <strong>${escapeHTML(
        $("sellerName")?.textContent || "Verified Seller"
      )}</strong>
    </div>

    <div>
      <span>Amount</span>
      <strong>KES ${money(
        pendingReceive.fees.amount
      )}</strong>
    </div>

    <div>
      <span>Total debit</span>
      <strong>KES ${money(
        pendingReceive.fees.total
      )}</strong>
    </div>
  `;
}

$("sellerApprovalModal")
  ?.classList.remove("hidden");

}

function setupSellerApproval() {

$("sellerRejectButton")?.addEventListener(
  "click",
  () => {

    pendingReceive = null;

    $("sellerApprovalModal")
      ?.classList.add("hidden");

    toast(
      "Seller rejected the payment.",
      "error"
    );
  }
);

$("sellerApproveButton")?.addEventListener(
  "click",
  () => {

    $("sellerApprovalModal")
      ?.classList.add("hidden");

    openFinalAuthorization();
  }
);

}

/* =========================================================
FINAL AUTHORIZATION
========================================================= */

function openFinalAuthorization() {

if (!pendingReceive) return;

const details =
  $("finalAuthorizationSummary");

if (details) {

  details.innerHTML = `
    <div>
      <span>Seller</span>
      <strong>${escapeHTML(
        $("sellerName")?.textContent || "Verified Seller"
      )}</strong>
    </div>

    <div>
      <span>Amount</span>
      <strong>KES ${money(
        pendingReceive.fees.amount
      )}</strong>
    </div>

    <div>
      <span>BEAST fee</span>
      <strong>KES ${money(
        pendingReceive.fees.beastFee
      )}</strong>
    </div>

    <div>
      <span>Total debit</span>
      <strong>KES ${money(
        pendingReceive.fees.total
      )}</strong>
    </div>
  `;
}

$("finalAuthorizationPin").value = "";

$("finalAuthorizationModal")
  ?.classList.remove("hidden");

}

function setupFinalAuthorization() {

$("finalAuthorizationButton")
  ?.addEventListener(
    "click",
    finalReceiveAuthorization
  );

}

function finalReceiveAuthorization() {

const pin =
  $("finalAuthorizationPin")
    ?.value.trim() || "";

if (pin !== state.beastPin) {

  toast(
    "Incorrect BEAST PIN.",
    "error"
  );

  return;
}

$("finalAuthorizationModal")
  ?.classList.add("hidden");

completeReceiveTransaction();

}

function completeReceiveTransaction() {

if (!pendingReceive) return;

const source =
  sourceById(
    pendingReceive.sourceId
  );

if (!source) {
  toast(
    "Payment source is no longer available.",
    "error"
  );

  pendingReceive = null;
  return;
}

const fees =
  pendingReceive.fees;

if (source.balance < fees.total) {

  toast(
    "Insufficient source balance.",
    "error"
  );

  pendingReceive = null;
  return;
}

source.balance -= fees.total;

const tx = recordTransaction({
  type: "RECEIVE / SELL",
  provider: fees.provider,
  route: fees.route,
  source: source.provider,
  recipient:
    $("sellerName")?.textContent ||
    "Verified Seller",
  amount: fees.amount,
  providerFee: fees.providerFee,
  beastFee: fees.beastFee,
  total: fees.total,
  status: "COMPLETED"
});

recordRevenue(
  fees,
  {
    ...tx
  }
);

saveState();

renderDashboard();
renderAllSourcePickers();
renderHistory();

$("receiveAmount").value = "";

updateFeeSummaries();

pendingReceive = null;

toast(
  "Payment completed successfully.",
  "success"
);

}

/* =========================================================
WITHDRAW
========================================================= */

function verifyWithdrawal() {

const agent =
  normalizeKenyanPhone(
    $("withdrawAgent")?.value.trim() || ""
  );

if (!validKenyanPhone(agent)) {
  toast(
    "Enter a valid Kenyan agent number.",
    "error"
  );
  return;
}

$("withdrawAgent").value = agent;

$("withdrawAgentName").textContent =
  "KRISH DEMO VERIFIED AGENT";

$("withdrawVerification")
  ?.classList.remove("hidden");

toast(
  "Agent verified.",
  "success"
);

}

function beginWithdraw() {

const source =
  sourceById(selectedWithdrawSource);

const agent =
  normalizeKenyanPhone(
    $("withdrawAgent")?.value.trim() || ""
  );

const amount =
  amountValue("withdrawAmount");

if (!source) {
  toast(
    "Select a withdrawal source.",
    "error"
  );
  return;
}

if (!validKenyanPhone(agent)) {
  toast(
    "Verify the agent first.",
    "error"
  );
  return;
}

if (amount <= 0) {
  toast(
    "Enter a valid amount.",
    "error"
  );
  return;
}

const fees =
  getFeeBreakdown(
    "WITHDRAW",
    amount,
    source
  );

if (source.balance < fees.total) {
  toast(
    "Insufficient source balance.",
    "error"
  );
  return;
}

openPinModal(
  "Authorize Withdrawal",
  fees,
  () => {

    source.balance -= fees.total;

    const tx = recordTransaction({
      type: "WITHDRAW",
      provider: fees.provider,
      route: fees.route,
      source: source.provider,
      recipient:
        `Agent ${agent}`,
      amount: fees.amount,
      providerFee: fees.providerFee,
      beastFee: fees.beastFee,
      total: fees.total,
      status: "COMPLETED"
    });

    recordRevenue(
      fees,
      {
        ...tx
      }
    );

    saveState();

    renderDashboard();
    renderAllSourcePickers();
    renderHistory();

    $("withdrawAmount").value = "";

    updateFeeSummaries();

    toast(
      "Withdrawal completed.",
      "success"
    );
  }
);

}

/* =========================================================
LIPA NA
========================================================= */

function setupLipa() {

document
  .querySelectorAll("[data-lipa-method]")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll("[data-lipa-method]")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      lipaMethod =
        button.dataset.lipaMethod ||
        "paybill";

      updateFeeSummaries();
    });
  });

$("verifyLipaButton")?.addEventListener(
  "click",
  verifyLipaDestination
);

$("lipaAmount")?.addEventListener(
  "input",
  updateFeeSummaries
);

$("lipaButton")?.addEventListener(
  "click",
  beginLipa
);

}

function verifyLipaDestination() {

const destination =
  $("lipaDestination")?.value.trim() || "";

if (destination.length < 4) {
  toast(
    "Enter a valid destination.",
    "error"
  );
  return;
}

$("lipaDestinationName").textContent =
  lipaMethod === "paybill"
    ? "KRISH DEMO PAYBILL"
    : lipaMethod === "buygoods"
      ? "KRISH DEMO BUSINESS"
      : "KRISH DEMO POCHI";

$("lipaVerification")
  ?.classList.remove("hidden");

toast(
  "Destination verified.",
  "success"
);

}

function beginLipa() {

const source =
  sourceById(selectedLipaSource);

const destination =
  $("lipaDestination")?.value.trim() || "";

const amount =
  amountValue("lipaAmount");

if (!source) {
  toast(
    "Select a payment source.",
    "error"
  );
  return;
}

if (destination.length < 4) {
  toast(
    "Verify the destination first.",
    "error"
  );
  return;
}

if (amount <= 0) {
  toast(
    "Enter a valid amount.",
    "error"
  );
  return;
}

const fees =
  getFeeBreakdown(
    `LIPA-${lipaMethod}`,
    amount,
    source
  );

if (source.balance < fees.total) {
  toast(
    "Insufficient source balance.",
    "error"
  );
  return;
}

openPinModal(
  "Authorize Lipa Na",
  fees,
  () => {

    source.balance -= fees.total;

    const tx = recordTransaction({
      type: "LIPA NA",
      provider: fees.provider,
      route: fees.route,
      source: source.provider,
      recipient:
        $("lipaDestinationName")?.textContent ||
        destination,
      amount: fees.amount,
      providerFee: fees.providerFee,
      beastFee: fees.beastFee,
      total: fees.total,
      status: "COMPLETED"
    });

    recordRevenue(
      fees,
      {
        ...tx
      }
    );

    saveState();

    renderDashboard();
    renderAllSourcePickers();
    renderHistory();

    $("lipaAmount").value = "";

    updateFeeSummaries();

    toast(
      "Payment completed.",
      "success"
    );
  }
);

}

/* =========================================================
PIN AUTHORIZATION
========================================================= */

function setupPin() {

$("pinModalClose")?.addEventListener(
  "click",
  closePinModal
);

$("confirmPinButton")?.addEventListener(
  "click",
  confirmPin
);

}

function openPinModal(title, fees, callback) {

pendingPinCallback = callback;

$("pinModalTitle").textContent =
  title || "Authorize Transaction";

renderFeeSummary(
  "pinTransactionSummary",
  fees
);

$("transactionPin").value = "";

$("pinModal")
  ?.classList.remove("hidden");

setTimeout(() => {
  $("transactionPin")?.focus();
}, 100);

}

function closePinModal() {

$("pinModal")
  ?.classList.add("hidden");

pendingPinCallback = null;

}

function confirmPin() {

const pin =
  $("transactionPin")
    ?.value.trim() || "";

if (pin !== state.beastPin) {

  toast(
    "Incorrect BEAST PIN.",
    "error"
  );

  return;
}

const callback =
  pendingPinCallback;

closePinModal();

if (typeof callback === "function") {
  callback();
}

}

/* =========================================================
FEE UPDATES
========================================================= */

function updateFeeSummaries() {

const sendSource =
  sourceById(selectedSendSource);

const sendAmount =
  amountValue("sendAmount");

renderFeeSummary(
  "sendFeeSummary",
  sendSource && sendAmount > 0
    ? getFeeBreakdown(
        "SEND",
        sendAmount,
        sendSource
      )
    : null
);


const receiveSource =
  sourceById(selectedReceiveSource);

const receiveAmount =
  amountValue("receiveAmount");

renderFeeSummary(
  "receiveFeeSummary",
  receiveSource && receiveAmount > 0
    ? getFeeBreakdown(
        `RECEIVE-${receiveMethod}`,
        receiveAmount,
        receiveSource
      )
    : null
);


const withdrawSource =
  sourceById(selectedWithdrawSource);

const withdrawAmount =
  amountValue("withdrawAmount");

renderFeeSummary(
  "withdrawFeeSummary",
  withdrawSource && withdrawAmount > 0
    ? getFeeBreakdown(
        "WITHDRAW",
        withdrawAmount,
        withdrawSource
      )
    : null
);


const lipaSource =
  sourceById(selectedLipaSource);

const lipaAmount =
  amountValue("lipaAmount");

renderFeeSummary(
  "lipaFeeSummary",
  lipaSource && lipaAmount > 0
    ? getFeeBreakdown(
        `LIPA-${lipaMethod}`,
        lipaAmount,
        lipaSource
      )
    : null
);

}

/* =========================================================
TRANSACTION HISTORY
========================================================= */

function recordTransaction(data) {

const transaction = {
  id: reference(),
  reference: reference(),
  date: now(),
  timestamp: Date.now(),

  type: data.type || "TRANSACTION",

  provider:
    data.provider ||
    "BEAST Demo Provider",

  route:
    data.route ||
    "BEAST DEMO",

  source:
    data.source ||
    "",

  recipient:
    data.recipient ||
    "",

  amount:
    Number(data.amount || 0),

  providerFee:
    Number(data.providerFee || 0),

  beastFee:
    Number(data.beastFee || 0),

  total:
    Number(data.total || 0),

  netBeastRevenue:
    Number(data.beastFee || 0) -
    Number(data.providerFee || 0),

  status:
    data.status ||
    "COMPLETED"
};

state.history.unshift(transaction);

if (state.history.length > 300) {
  state.history =
    state.history.slice(0, 300);
}

return transaction;

}

function recordRevenue(fees, transactionMeta = {}) {

const beastFee =
  Number(fees?.beastFee || 0);

const providerFee =
  Number(fees?.providerFee || 0);

const netRevenue =
  beastFee - providerFee;

state.ownerLedger.beastFees +=
  beastFee;

state.ownerLedger.providerCosts +=
  providerFee;

state.ownerLedger.transactions.unshift({
  reference:
    transactionMeta.reference ||
    transactionMeta.id ||
    reference(),

  id:
    transactionMeta.id ||
    "",

  date:
    transactionMeta.date ||
    now(),

  timestamp:
    transactionMeta.timestamp ||
    Date.now(),

  type:
    transactionMeta.type ||
    "TRANSACTION",

  provider:
    fees.provider ||
    transactionMeta.provider ||
    "",

  route:
    fees.route ||
    transactionMeta.route ||
    "",

  amount:
    Number(fees.amount || 0),

  providerFee,

  beastFee,

  total:
    Number(fees.total || 0),

  netBeastRevenue:
    netRevenue,

  status:
    transactionMeta.status ||
    "COMPLETED"
});

if (
  state.ownerLedger.transactions.length >
  500
) {
  state.ownerLedger.transactions =
    state.ownerLedger.transactions.slice(
      0,
      500
    );
}

}

function renderHistory() {

const container =
  $("historyList");

if (!container) return;

if (!state.history.length) {

  container.innerHTML = `
    <div class="form-card">
      <p class="muted">
        No transactions yet.
      </p>
    </div>
  `;

  return;
}

container.innerHTML =
  state.history.map(tx => {

    const positive =
      [
        "RECEIVE"
      ].includes(tx.type);

    return `
      <div class="history-item">

        <div>
          <strong>
            ${escapeHTML(tx.type)}
          </strong>

          <small>
            ${escapeHTML(tx.provider)}
            · ${escapeHTML(tx.route)}
          </small>

          <small>
            ${escapeHTML(tx.date)}
            · ${escapeHTML(tx.reference)}
          </small>

          <small>
            BEAST fee:
            KES ${money(tx.beastFee)}
            · Provider:
            KES ${money(tx.providerFee)}
          </small>
        </div>

        <div
          class="history-amount ${
            positive
              ? "positive"
              : "negative"
          }"
        >
          ${positive ? "+" : "-"}
          KES ${money(tx.total)}
        </div>

      </div>
    `;
  }).join("");

}

/* =========================================================
MAIN NAVIGATION
========================================================= */

function setupMainNavigation() {

document
  .querySelectorAll("[data-page]")
  .forEach(button => {

    button.addEventListener("click", () => {

      const page =
        button.dataset.page;

      if (!page) return;

      document
        .querySelectorAll(".app-page")
        .forEach(section =>
          section.classList.remove("active")
        );

      $(page)?.classList.add("active");

      document
        .querySelectorAll(
          ".main-tab,.bottom-nav-btn"
        )
        .forEach(item => {

          item.classList.toggle(
            "active",
            item.dataset.page === page
          );
        });

      updateFeeSummaries();
    });
  });

}

/* =========================================================
SETTINGS
========================================================= */

function setupSettings() {

$("settingsButton")?.addEventListener(
  "click",
  () => {
    renderSettings();
    $("settingsModal")
      ?.classList.remove("hidden");
  }
);

$("settingsClose")?.addEventListener(
  "click",
  () => {
    $("settingsModal")
      ?.classList.add("hidden");
  }
);

$("settingsSubClose")?.addEventListener(
  "click",
  () => {
    $("settingsSubModal")
      ?.classList.add("hidden");
  }
);

document
  .querySelectorAll("[data-setting]")
  .forEach(button => {

    button.addEventListener("click", () => {

      renderSettingsSubPage(
        button.dataset.setting
      );

      $("settingsSubModal")
        ?.classList.remove("hidden");
    });
  });

$("lightModeToggle")
  ?.addEventListener(
    "change",
    event => {

      state.dark =
        !event.target.checked;

      applyTheme();
      saveState();
    }
  );

$("securityAlertsToggle")
  ?.addEventListener(
    "change",
    event => {

      state.settings.securityAlerts =
        event.target.checked;

      saveState();
    }
  );

$("notificationsToggle")
  ?.addEventListener(
    "change",
    event => {

      state.settings.notifications =
        event.target.checked;

      saveState();
    }
  );

$("logoutButton")?.addEventListener(
  "click",
  () => {

    $("settingsModal")
      ?.classList.add("hidden");

    toast(
      "Demo logout completed.",
      "success"
    );
  }
);

$("ownerDashboardButton")
  ?.addEventListener(
    "click",
    () => {

      $("settingsModal")
        ?.classList.add("hidden");

      $("ownerLoginModal")
        ?.classList.remove("hidden");
    }
  );

}

function renderSettings() {

if ($("lightModeToggle")) {
  $("lightModeToggle").checked =
    !state.dark;
}

if ($("securityAlertsToggle")) {
  $("securityAlertsToggle").checked =
    Boolean(
      state.settings.securityAlerts
    );
}

if ($("notificationsToggle")) {
  $("notificationsToggle").checked =
    Boolean(
      state.settings.notifications
    );
}

}

function renderSettingsSubPage(type) {

const title =
  $("settingsSubTitle");

const content =
  $("settingsSubContent");

if (!title || !content) return;

const pages = {

  personal: {
    title: "Personal Details",
    html: `
      <div class="summary-box">
        <div>
          <span>Full name</span>
          <strong>${escapeHTML(state.fullName)}</strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>${escapeHTML(state.phone)}</strong>
        </div>
        <div>
          <span>National ID</span>
          <strong>${escapeHTML(state.nationalId)}</strong>
        </div>
        <div>
          <span>BEAST ID</span>
          <strong>${escapeHTML(state.beastId)}</strong>
        </div>
      </div>
    `
  },

  lines: {
    title: "Line Management",
    html: renderSourceType("M-PESA")
  },

  mpesa: {
    title: "M-PESA",
    html: renderSourceType("M-PESA")
  },

  airtel: {
    title: "Airtel Money",
    html: renderSourceType("Airtel Money")
  },

  bank: {
    title: "Bank Accounts",
    html: renderSourceType("Bank")
  },

  card: {
    title: "Cards",
    html: renderSourceType("Card")
  },

  wallet: {
    title: "BEAST Wallet",
    html: renderSourceType("BEAST Wallet")
  },

  pin: {
    title: "Change BEAST PIN",
    html: `
      <label>Current PIN</label>
      <input id="oldPin" type="password" inputmode="numeric">

      <label>New PIN</label>
      <input id="newPin" type="password" inputmode="numeric" maxlength="6">

      <label>Confirm new PIN</label>
      <input id="confirmNewPin" type="password" inputmode="numeric" maxlength="6">

      <button id="changePinButton" class="primary-btn">
        CHANGE PIN
      </button>
    `
  }

};

const page =
  pages[type] || pages.personal;

title.textContent =
  page.title;

content.innerHTML =
  page.html;

if (type === "pin") {

  $("changePinButton")
    ?.addEventListener(
      "click",
      changePin
    );
}

}

function renderSourceType(type) {

const sources =
  state.sources.filter(
    source => source.type === type
  );

if (!sources.length) {
  return `
    <p class="muted">
      No ${escapeHTML(type)} accounts connected.
    </p>
  `;
}

return `
  <div class="source-picker">
    ${sources.map(source => `
      <div class="source-card">
        <strong>${escapeHTML(source.provider)}</strong>
        <span>${escapeHTML(source.label)}</span>
        <span>${escapeHTML(maskNumber(source.number))}</span>
        <span class="source-balance">
          KES ${money(source.balance)}
        </span>
      </div>
    `).join("")}
  </div>
`;

}

function changePin() {

const oldPin =
  $("oldPin")?.value.trim() || "";

const newPin =
  $("newPin")?.value.trim() || "";

const confirmPin =
  $("confirmNewPin")?.value.trim() || "";

if (oldPin !== state.beastPin) {
  toast(
    "Current PIN is incorrect.",
    "error"
  );
  return;
}

if (!/^\d{4,6}$/.test(newPin)) {
  toast(
    "New PIN must contain 4–6 digits.",
    "error"
  );
  return;
}

if (newPin !== confirmPin) {
  toast(
    "New PIN confirmation does not match.",
    "error"
  );
  return;
}

state.beastPin = newPin;

saveState();

$("settingsSubModal")
  ?.classList.add("hidden");

toast(
  "BEAST PIN changed successfully.",
  "success"
);

}

/* =========================================================
THEME
========================================================= */

function applyTheme() {

document.body.classList.toggle(
  "light-mode",
  !state.dark
);

}

/* =========================================================
SECURITY
========================================================= */

function logSecurityEvent(message) {

if (!state.settings.securityAlerts) {
  return;
}

state.securityLogs.unshift({
  id: reference(),
  message,
  date: now(),
  timestamp: Date.now()
});

if (state.securityLogs.length > 200) {
  state.securityLogs =
    state.securityLogs.slice(0, 200);
}

saveState();

}

function setupSecurity() {

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "hidden"
    ) {

      logSecurityEvent(
        "Session visibility changed."
      );
    }
  }
);

}

/* =========================================================
OWNER LOGIN
========================================================= */

function setupOwnerLogin() {

$("ownerLoginClose")
  ?.addEventListener(
    "click",
    () => {
      $("ownerLoginModal")
        ?.classList.add("hidden");
    }
  );

$("ownerLoginButton")
  ?.addEventListener(
    "click",
    ownerLogin
  );

$("adminBackButton")
  ?.addEventListener(
    "click",
    () => {

      $("adminScreen")
        ?.classList.add("hidden");

      $("beastApp")
        ?.classList.remove("hidden");

      renderDashboard();
    }
  );

}

function ownerLogin() {

const id =
  $("ownerLoginId")
    ?.value.trim() || "";

const pin =
  $("ownerLoginPin")
    ?.value.trim() || "";

/*
  Demo owner credentials only.
  Production must use secure backend
  authentication.
*/

if (
  id !== "BEASTADMIN" ||
  pin !== "999999"
) {

  toast(
    "Owner credentials are incorrect.",
    "error"
  );

  return;
}

$("ownerLoginModal")
  ?.classList.add("hidden");

$("beastApp")
  ?.classList.add("hidden");

$("adminScreen")
  ?.classList.remove("hidden");

logSecurityEvent(
  "Owner dashboard login."
);

renderAdmin();

toast(
  "Owner dashboard opened.",
  "success"
);

}

/* =========================================================
ADMIN NAVIGATION
========================================================= */

function setupAdminNavigation() {

document
  .querySelectorAll(
    "[data-admin-section]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        currentAdminSection =
          button.dataset.adminSection ||
          "overview";

        renderAdminSection();
      }
    );
  });

$("adminCustomerSearch")
  ?.addEventListener(
    "input",
    renderAdminCustomers
  );

}

function renderAdmin() {
renderAdminSection();
renderAdminStats();
renderAdminCustomers();
renderAdminTransactions();
renderAdminRevenue();
renderAdminSecurity();
}

function renderAdminSection() {

const sectionMap = {
  overview: "adminOverview",
  customers: "adminCustomers",
  transactions: "adminTransactions",
  revenue: "adminRevenue",
  security: "adminSecurity",
  ai: "adminAI"
};

document
  .querySelectorAll(".admin-section")
  .forEach(section =>
    section.classList.remove("active")
  );

$(sectionMap[currentAdminSection])
  ?.classList.add("active");

document
  .querySelectorAll(
    "[data-admin-section]"
  )
  .forEach(button =>
    button.classList.toggle(
      "active",
      button.dataset.adminSection ===
      currentAdminSection
    )
  );

}

/* =========================================================
ADMIN STATS
========================================================= */

function renderAdminStats() {

const transactions =
  state.ownerLedger.transactions || [];

const gross =
  Number(
    state.ownerLedger.beastFees || 0
  );

if ($("adminCustomerCount")) {
  $("adminCustomerCount")
    .textContent =
    state.registered ? "1" : "0";
}

if ($("adminActiveCustomers")) {
  $("adminActiveCustomers")
    .textContent =
    state.registered ? "1" : "0";
}

if ($("adminTransactionCount")) {
  $("adminTransactionCount")
    .textContent =
    transactions.length;
}

if ($("adminFeeTotal")) {
  $("adminFeeTotal")
    .textContent =
    shortMoney(gross);
}

if ($("feeFlowProvider")) {
  $("feeFlowProvider")
    .textContent =
    shortMoney(
      state.ownerLedger.providerCosts
    );
}

if ($("feeFlowBeast")) {
  $("feeFlowBeast")
    .textContent =
    shortMoney(gross);
}

if ($("feeFlowRevenue")) {

  const net =
    gross -
    Number(
      state.ownerLedger.providerCosts || 0
    ) -
    Number(
      state.ownerLedger.refunds || 0
    );

  $("feeFlowRevenue")
    .textContent =
    shortMoney(net);
}

}

/* =========================================================
ADMIN CUSTOMERS
========================================================= */

function renderAdminCustomers() {

const table =
  $("adminCustomersTable");

if (!table) return;

const search =
  $("adminCustomerSearch")
    ?.value.trim()
    .toLowerCase() || "";

if (!state.registered) {

  table.innerHTML = `
    <tr>
      <td colspan="4">
        No registered customer.
      </td>
    </tr>
  `;

  return;
}

const customer = {
  name: state.fullName,
  phone: state.phone,
  beastId: state.beastId,
  status: "ACTIVE"
};

const haystack =
  `${customer.name} ${customer.phone} ${customer.beastId}`
    .toLowerCase();

if (
  search &&
  !haystack.includes(search)
) {

  table.innerHTML = `
    <tr>
      <td colspan="4">
        No matching customer.
      </td>
    </tr>
  `;

  return;
}

table.innerHTML = `
  <tr>
    <td>${escapeHTML(customer.name)}</td>
    <td>${escapeHTML(customer.phone)}</td>
    <td>${escapeHTML(customer.beastId)}</td>
    <td>${customer.status}</td>
  </tr>
`;

}

/* =========================================================
ADMIN TRANSACTIONS
========================================================= */

function renderAdminTransactions() {

const table =
  $("adminTransactionsTable");

if (!table) return;

const transactions =
  state.ownerLedger.transactions || [];

if (!transactions.length) {

  table.innerHTML = `
    <tr>
      <td colspan="7">
        No transactions yet.
      </td>
    </tr>
  `;

  return;
}

table.innerHTML =
  transactions.map(tx => `
    <tr>
      <td>${escapeHTML(tx.reference)}</td>
      <td>${escapeHTML(tx.type)}</td>
      <td>${escapeHTML(tx.provider)}</td>
      <td>KES ${money(tx.amount)}</td>
      <td>KES ${money(tx.beastFee)}</td>
      <td>KES ${money(tx.providerFee)}</td>
      <td>${escapeHTML(tx.status)}</td>
    </tr>
  `).join("");

}

/* =========================================================
ADMIN REVENUE
========================================================= */

function renderAdminRevenue() {

const gross =
  Number(
    state.ownerLedger.beastFees || 0
  );

const providerCosts =
  Number(
    state.ownerLedger.providerCosts || 0
  );

const refunds =
  Number(
    state.ownerLedger.refunds || 0
  );

const net =
  gross -
  providerCosts -
  refunds;

if ($("adminGrossFees")) {
  $("adminGrossFees")
    .textContent =
    shortMoney(gross);
}

if ($("adminProviderCosts")) {
  $("adminProviderCosts")
    .textContent =
    shortMoney(providerCosts);
}

if ($("adminRefunds")) {
  $("adminRefunds")
    .textContent =
    shortMoney(refunds);
}

if ($("adminNetRevenue")) {
  $("adminNetRevenue")
    .textContent =
    shortMoney(net);
}

if ($("adminRevenueBalance")) {
  $("adminRevenueBalance")
    .textContent =
    shortMoney(net);
}

const list =
  $("adminRevenueList");

if (list) {

  const transactions =
    state.ownerLedger.transactions || [];

  list.innerHTML =
    transactions.slice(0, 20).map(tx => `
      <div class="history-item">
        <div>
          <strong>
            ${escapeHTML(tx.type)}
          </strong>

          <small>
            ${escapeHTML(tx.reference)}
            · ${escapeHTML(tx.date)}
          </small>
        </div>

        <div class="history-amount positive">
          KES ${money(tx.netBeastRevenue)}
        </div>
      </div>
    `).join("") || `
      <p class="muted">
        No revenue records yet.
      </p>
    `;
}

}

/* =========================================================
ADMIN SECURITY
========================================================= */

function renderAdminSecurity() {

const container =
  $("adminSecurityAlerts");

if (!container) return;

if (!state.securityLogs.length) {

  container.innerHTML = `
    <p class="muted">
      No security events recorded.
    </p>
  `;

  return;
}

container.innerHTML =
  state.securityLogs
    .slice(0, 50)
    .map(log => `
      <div class="history-item">
        <div>
          <strong>
            Security event
          </strong>

          <small>
            ${escapeHTML(log.message)}
          </small>

          <small>
            ${escapeHTML(log.date)}
          </small>
        </div>
      </div>
    `)
    .join("");

}

/* =========================================================
BEAST AI
========================================================= */

function setupAdminAI() {

$("adminAISend")
  ?.addEventListener(
    "click",
    sendAIQuestion
  );

$("adminAIInput")
  ?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        sendAIQuestion();
      }
    }
  );

document
  .querySelectorAll("[data-ai-question]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const question =
          button.dataset.aiQuestion || "";

        if ($("adminAIInput")) {
          $("adminAIInput").value =
            question;
        }

        sendAIQuestion();
      }
    );
  });

}

function addAIMessage(text, user = false) {

const chat =
  $("adminAIChat");

if (!chat) return;

const message =
  document.createElement("div");

message.className =
  `ai-message ${user ? "user" : ""}`;

message.textContent =
  text;

chat.appendChild(message);

chat.scrollTop =
  chat.scrollHeight;

}

function sendAIQuestion() {

const input =
  $("adminAIInput");

if (!input) return;

const question =
  input.value.trim();

if (!question) return;

addAIMessage(
  question,
  true
);

input.value = "";

const lower =
  question.toLowerCase();

const gross =
  Number(
    state.ownerLedger.beastFees || 0
  );

const providerCosts =
  Number(
    state.ownerLedger.providerCosts || 0
  );

const refunds =
  Number(
    state.ownerLedger.refunds || 0
  );

const net =
  gross -
  providerCosts -
  refunds;

let answer =
  "BEAST AI: I can analyze the local demo operations data.";

if (
  lower.includes("revenue") ||
  lower.includes("income")
) {

  answer =
    `Gross BEAST fees are KES ${money(gross)}. ` +
    `Provider costs are KES ${money(providerCosts)}. ` +
    `Refunds are KES ${money(refunds)}. ` +
    `Current demo net revenue is KES ${money(net)}.`;
}

else if (
  lower.includes("transaction")
) {

  answer =
    `The demo has ${
      state.ownerLedger.transactions.length
    } recorded transactions.`;
}

else if (
  lower.includes("provider")
) {

  answer =
    `Recorded provider costs are KES ${money(providerCosts)}.`;
}

else if (
  lower.includes("security")
) {

  answer =
    `There are ${
      state.securityLogs.length
    } recorded security events.`;
}

else if (
  lower.includes("customer")
) {

  answer =
    state.registered
      ? `There is 1 locally registered demo customer: ${state.fullName}.`
      : "There are no locally registered demo customers.";
}

addAIMessage(answer);

if ($("adminAIMessage")) {
  $("adminAIMessage").textContent =
    answer;
}

}

/* =========================================================
INITIALIZATION
========================================================= */

function initializeSources() {

if (!state.sources.length) {
  return;
}

selectedSendSource =
  state.sources[0].id;

selectedReceiveSource =
  state.sources[0].id;

selectedWithdrawSource =
  state.sources[0].id;

selectedLipaSource =
  state.sources[0].id;

}

function initialize() {

setupRegistration();

setupSend();

setupReceive();

setupBuyerLogin();

setupSellerApproval();

setupFinalAuthorization();

setupLipa();

setupPin();

setupMainNavigation();

setupSettings();

setupSecurity();

setupOwnerLogin();

setupAdminNavigation();

setupAdminAI();

initializeSources();

renderReceiveForm();

applyTheme();

renderSettings();

renderAllSourcePickers();

renderDashboard();

renderHistory();

/*
  Important:
  Existing registered accounts remain registered.
  New accounts use the fixed registration flow.
*/

if (state.registered) {
  showApp();
} else {
  showRegistration();
}

}

initialize();

});