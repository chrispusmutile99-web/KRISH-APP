"use strict";

const KEY = "mtb_beast_v5";
const REG_KEY = "mtb_beast_registration_v3";

const DEFAULT_SOURCES = [
  {
    id: "mpesa1",
    category: "M-PESA",
    provider: "Safaricom M-PESA",
    name: "0712345678",
    type: "Primary Line",
    balance: 2500
  },
  {
    id: "mpesa2",
    category: "M-PESA",
    provider: "Safaricom M-PESA",
    name: "0798765432",
    type: "Secondary Line",
    balance: 1200
  },
  {
    id: "airtel1",
    category: "Airtel Money",
    provider: "Airtel Money",
    name: "0734567890",
    type: "Primary Line",
    balance: 1500
  },
  {
    id: "airtel2",
    category: "Airtel Money",
    provider: "Airtel Money",
    name: "0787654321",
    type: "Secondary Line",
    balance: 900
  },
  {
    id: "bank1",
    category: "Bank",
    provider: "KCB Bank",
    name: "KCB •••• 4582",
    accountType: "Savings",
    balance: 8500
  },
  {
    id: "bank2",
    category: "Bank",
    provider: "Equity Bank",
    name: "Equity •••• 9134",
    accountType: "Current",
    balance: 4200
  },
  {
    id: "bank3",
    category: "Bank",
    provider: "Co-operative Bank",
    name: "Co-operative •••• 2210",
    accountType: "Savings",
    balance: 6700
  },
  {
    id: "card1",
    category: "Card",
    provider: "BEAST Visa",
    name: "BEAST Visa •••• 4821",
    cardType: "Debit",
    network: "Visa",
    balance: 3000
  },
  {
    id: "card2",
    category: "Card",
    provider: "M-PESA Card",
    name: "M-PESA Card •••• 7720",
    cardType: "Prepaid",
    network: "Visa",
    balance: 1800
  },
  {
    id: "card3",
    category: "Card",
    provider: "Demo Mastercard",
    name: "Mastercard •••• 1188",
    cardType: "Debit",
    network: "Mastercard",
    balance: 2200
  },
  {
    id: "wallet1",
    category: "BEAST Wallet",
    provider: "BEAST Wallet",
    name: "Main Wallet",
    walletType: "BEAST Wallet",
    balance: 5000
  }
];

let state = {
  registered: false,
  fullName: "",
  phone: "",
  nationalId: "",
  beastId: "",
  beastPin: "",
  balance: 5000,

  dark: true,

  settings: {
    securityAlerts: true,
    notifications: true
  },

  sources: DEFAULT_SOURCES,
  history: []
};

let currentReceiveType = "paybill";
let currentLipaType = "pochi";

let selectedSendSource = null;
let selectedReceiveSource = null;

let receiveSellVerified = false;
let receiveWithdrawVerified = false;

let pendingTransaction = null;


/* =========================
   STORAGE
========================= */

function save() {
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

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (saved) {
      state = {
        ...state,
        ...saved,
        settings: {
          ...state.settings,
          ...(saved.settings || {})
        }
      };
    }
  } catch (e) {
    console.warn("Could not load saved data.");
  }

  if (!Array.isArray(state.sources) || !state.sources.length) {
    state.sources = DEFAULT_SOURCES;
  }

  if (!Array.isArray(state.history)) {
    state.history = [];
  }
}


/* =========================
   HELPERS
========================= */

function money(amount) {
  return "KES " + Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function toast(message) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

function normalizeKenyanPhone(value) {
  let phone = String(value || "").replace(/\s+/g, "");

  if (phone.startsWith("+254")) {
    phone = "0" + phone.slice(4);
  }

  if (phone.startsWith("254")) {
    phone = "0" + phone.slice(3);
  }

  return phone;
}

function validKenyanPhone(value) {
  const phone = normalizeKenyanPhone(value);
  return /^07\d{8}$/.test(phone) || /^01\d{8}$/.test(phone);
}

function generateBeastId() {
  return "BEAST-" + Math.floor(100000 + Math.random() * 900000);
}

function updateBalance() {
  const el = document.getElementById("balanceDisplay");

  if (el) {
    el.textContent = money(state.balance);
  }
}

function getSource(id) {
  return state.sources.find(s => s.id === id);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}


/* =========================
   THEME
========================= */

function applyTheme() {
  document.body.classList.toggle("light-mode", state.dark === false);

  const toggle = document.getElementById("lightModeToggle");

  if (toggle) {
    toggle.checked = state.dark === false;
  }
}


/* =========================
   REGISTRATION
========================= */

function showRegistrationStep(step) {

  [1, 2, 3].forEach(number => {

    const section = document.getElementById(
      "registrationStep" + number
    );

    const dot = document.getElementById(
      "dot" + number
    );

    if (section) {
      section.classList.toggle("hidden", number !== step);
    }

    if (dot) {
      dot.classList.toggle("active", number <= step);
    }
  });
}


function validateRegistrationStep1() {

  const name = document.getElementById("registrationName").value.trim();
  const phone = normalizeKenyanPhone(
    document.getElementById("registrationPhone").value
  );
  const nationalId =
    document.getElementById("registrationId").value.trim();

  if (name.length < 3) {
    toast("Enter your full name.");
    return false;
  }

  if (!validKenyanPhone(phone)) {
    toast("Enter a valid Kenyan phone number.");
    return false;
  }

  if (nationalId.length < 5) {
    toast("Enter your National ID number.");
    return false;
  }

  state.fullName = name;
  state.phone = phone;
  state.nationalId = nationalId;

  document.getElementById("registrationSummaryName").textContent = name;
  document.getElementById("registrationSummaryPhone").textContent = phone;
  document.getElementById("registrationSummaryId").textContent =
    "••••" + nationalId.slice(-4);

  showRegistrationStep(2);

  return true;
}


function validateRegistrationStep2() {

  const pin =
    document.getElementById("registrationPin").value.trim();

  const confirm =
    document.getElementById("registrationPinConfirm").value.trim();

  if (!/^\d{4,6}$/.test(pin)) {
    toast("BEAST PIN must contain 4–6 digits.");
    return false;
  }

  if (pin !== confirm) {
    toast("BEAST PINs do not match.");
    return false;
  }

  state.beastPin = pin;

  if (!state.beastId) {
    state.beastId = generateBeastId();
  }

  document.getElementById("registrationBeastId").textContent =
    state.beastId;

  save();

  showRegistrationStep(3);

  return true;
}


function finishRegistration() {

  state.registered = true;

  save();

  showDashboard();

  toast("BEAST account created successfully.");
}


function beginRegistration() {

  if (state.registered && state.beastId) {
    showDashboard();
  } else {
    document.getElementById("registrationScreen")
      .classList.remove("hidden");

    document.getElementById("beastApp")
      .classList.add("hidden");

    showRegistrationStep(1);
  }
}


function showDashboard() {

  document.getElementById("registrationScreen")
    .classList.add("hidden");

  document.getElementById("beastApp")
    .classList.remove("hidden");

  document.getElementById("dashboardName").textContent =
    state.fullName || "BEAST USER";

  document.getElementById("beastIdDisplay").textContent =
    state.beastId || "—";

  updateBalance();
}


/* =========================
   NAVIGATION
========================= */

function openPanel(panelId) {

  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  const panel = document.getElementById(panelId);

  if (panel) {
    panel.classList.add("active");
  }

  const nav = document.querySelector(
    `.nav-btn[data-panel="${panelId}"]`
  );

  if (nav) {
    nav.classList.add("active");
  }
}


/* =========================
   SOURCE RENDERING
========================= */

function sourceDescription(source) {

  if (source.category === "Bank") {
    return `${source.provider} • ${source.accountType} • ${source.name}`;
  }

  if (source.category === "Card") {
    return `${source.provider} • ${source.cardType} • ${source.network} • ${source.name}`;
  }

  if (source.category === "M-PESA" ||
      source.category === "Airtel Money") {
    return `${source.provider} • ${source.type} • ${source.name}`;
  }

  if (source.category === "BEAST Wallet") {
    return `${source.provider} • ${source.walletType}`;
  }

  return source.name;
}


function renderSourceDetails(source, containerId) {

  const container = document.getElementById(containerId);

  if (!container || !source) return;

  let rows = "";

  rows += `
    <div class="source-detail-row">
      <span>Provider</span>
      <strong>${source.provider}</strong>
    </div>
  `;

  if (source.category === "Bank") {

    rows += `
      <div class="source-detail-row">
        <span>Bank</span>
        <strong>${source.provider}</strong>
      </div>

      <div class="source-detail-row">
        <span>Account</span>
        <strong>${source.name}</strong>
      </div>

      <div class="source-detail-row">
        <span>Account Type</span>
        <strong>${source.accountType}</strong>
      </div>
    `;

  } else if (
    source.category === "Card"
  ) {

    rows += `
      <div class="source-detail-row">
        <span>Card</span>
        <strong>${source.name}</strong>
      </div>

      <div class="source-detail-row">
        <span>Card Type</span>
        <strong>${source.cardType}</strong>
      </div>

      <div class="source-detail-row">
        <span>Network</span>
        <strong>${source.network}</strong>
      </div>
    `;

  } else if (
    source.category === "M-PESA" ||
    source.category === "Airtel Money"
  ) {

    rows += `
      <div class="source-detail-row">
        <span>Line</span>
        <strong>${source.name}</strong>
      </div>

      <div class="source-detail-row">
        <span>Line Type</span>
        <strong>${source.type}</strong>
      </div>
    `;

  } else if (
    source.category === "BEAST Wallet"
  ) {

    rows += `
      <div class="source-detail-row">
        <span>Wallet Type</span>
        <strong>${source.walletType}</strong>
      </div>
    `;
  }

  rows += `
    <div class="source-detail-row">
      <span>Available Balance</span>
      <strong class="source-balance">${money(source.balance)}</strong>
    </div>
  `;

  container.innerHTML = `
    <div class="source-details">
      <h4>Selected Funding Source</h4>
      ${rows}
    </div>
  `;
}


function renderSourcePicker(containerId, selectedId, callback) {

  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  state.sources.forEach(source => {

    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "source-card" +
      (source.id === selectedId ? " active" : "");

    button.innerHTML = `
      <strong>${source.category}</strong>
      <small>${sourceDescription(source)}</small>
      <small class="source-balance">${money(source.balance)}</small>
    `;

    button.addEventListener("click", () => {

      callback(source.id);

      renderSourcePicker(
        containerId,
        source.id,
        callback
      );
    });

    container.appendChild(button);
  });
}


function renderSendSourcePicker() {

  renderSourcePicker(
    "sendSource",
    selectedSendSource,
    id => {
      selectedSendSource = id;
    }
  );
}


function renderReceiveWithdrawSource() {

  renderSourcePicker(
    "receiveWithdrawSource",
    selectedReceiveSource,
    id => {

      selectedReceiveSource = id;

      renderSourceDetails(
        getSource(id),
        "receiveWithdrawDetails"
      );
    }
  );
}


/* =========================
   SEND
========================= */

function verifyRecipient() {

  const value =
    document.getElementById("sendRecipient").value.trim();

  const result =
    document.getElementById("recipientResult");

  if (!value) {
    toast("Enter recipient number or account.");
    return;
  }

  result.classList.remove("hidden");

  result.innerHTML = `
    <strong>✓ Recipient verified</strong>
    <span>
      KRISH DEMO RECIPIENT • ${value}
    </span>
  `;
}


function sendMoney() {

  const recipient =
    document.getElementById("sendRecipient").value.trim();

  const amount =
    Number(document.getElementById("sendAmount").value);

  const result =
    document.getElementById("recipientResult");

  if (!selectedSendSource) {
    toast("Select a payment source.");
    return;
  }

  if (!recipient) {
    toast("Enter recipient.");
    return;
  }

  if (!result || result.classList.contains("hidden")) {
    toast("Verify the recipient first.");
    return;
  }

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  const source = getSource(selectedSendSource);

  if (!source) {
    toast("Selected source not found.");
    return;
  }

  if (amount > source.balance) {
    toast("Insufficient balance in selected source.");
    return;
  }

  pendingTransaction = {
    type: "send",
    amount,
    sourceId: source.id,
    sourceName: source.name,
    recipient,
    description: `Send from ${source.category}`
  };

  document.getElementById("authDescription").textContent =
    `Authorize ${money(amount)} from ${sourceDescription(source)}.`;

  document.getElementById("authPin").value = "";

  openModal("authModal");
}


/* =========================
   RECEIVE SELL
========================= */

function renderReceiveSellForm() {

  const container =
    document.getElementById("receiveSellForm");

  if (!container) return;

  receiveSellVerified = false;

  let html = "";

  if (currentReceiveType === "paybill") {

    html = `
      <label>Business Number</label>
      <input id="receiveBusinessNumber"
             placeholder="Business number">

      <label>Account Number</label>
      <input id="receiveAccountNumber"
             placeholder="Account number">
    `;

  } else if (currentReceiveType === "buygoods") {

    html = `
      <label>Till Number</label>
      <input id="receiveTillNumber"
             placeholder="Till number">
    `;

  } else {

    html = `
      <label>Phone Number</label>
      <input id="receivePochiPhone"
             type="tel"
             placeholder="0712345678">
    `;
  }

  html += `
    <button id="verifyReceiveBtn"
            class="secondary-btn full">
      VERIFY SELLER / PAYMENT DETAILS
    </button>

    <div id="receiveSellResult"
         class="verification-result hidden"></div>

    <div id="receiveBuyerSourceArea"
         class="hidden">

      <h3>Buyer Funding Source</h3>

      <p class="muted">
        Select the account, wallet, M-PESA line or card
        that will fund this purchase.
      </p>

      <div id="buyerSourcePicker"
           class="source-picker"></div>

      <div id="buyerSourceDetails"></div>

      <button id="buyerNoPhoneCardBtn"
              class="secondary-btn full">
        📱 I DON'T HAVE MY PHONE / CARD
      </button>

      <label>Amount</label>

      <div class="amount-input">
        <span>KES</span>
        <input id="receivePaymentAmount"
               type="number"
               min="1"
               placeholder="0">
      </div>

      <button id="buyerLoginBtn"
              class="primary-btn full">
        LOGIN & CONTINUE PAYMENT
      </button>

    </div>
  `;

  container.innerHTML = html;

  document
    .getElementById("verifyReceiveBtn")
    .addEventListener("click", verifyReceiveDetails);

  document
    .getElementById("buyerLoginBtn")
    .addEventListener("click", openBuyerLogin);

  document
    .getElementById("buyerNoPhoneCardBtn")
    .addEventListener("click", openBuyerLogin);
}


function verifyReceiveDetails() {

  let value = "";

  if (currentReceiveType === "paybill") {

    const business =
      document.getElementById("receiveBusinessNumber").value.trim();

    const account =
      document.getElementById("receiveAccountNumber").value.trim();

    if (!business || !account) {
      toast("Enter business and account number.");
      return;
    }

    value = `Business ${business} • Account ${account}`;

  } else if (currentReceiveType === "buygoods") {

    value =
      document.getElementById("receiveTillNumber").value.trim();

    if (!value) {
      toast("Enter till number.");
      return;
    }

  } else {

    value =
      normalizeKenyanPhone(
        document.getElementById("receivePochiPhone").value
      );

    if (!validKenyanPhone(value)) {
      toast("Enter a valid Kenyan phone number.");
      return;
    }
  }

  const names = {
    paybill: "KRISH DEMO BUSINESS",
    buygoods: "KRISH DEMO SHOP",
    pochi: "KRISH DEMO SELLER"
  };

  const result =
    document.getElementById("receiveSellResult");

  result.classList.remove("hidden");

  result.innerHTML = `
    <strong>✓ Seller verified</strong>
    <span>
      ${names[currentReceiveType]} • ${value}
    </span>
  `;

  receiveSellVerified = true;

  const area =
    document.getElementById("receiveBuyerSourceArea");

  area.classList.remove("hidden");

  renderBuyerSourcePicker();
}


function renderBuyerSourcePicker() {

  renderSourcePicker(
    "buyerSourcePicker",
    selectedReceiveSource,
    id => {

      selectedReceiveSource = id;

      renderSourceDetails(
        getSource(id),
        "buyerSourceDetails"
      );
    }
  );
}


/* =========================
   BUYER LOGIN
========================= */

function openBuyerLogin() {

  if (!receiveSellVerified) {
    toast("Verify the seller first.");
    return;
  }

  const amount =
    Number(
      document.getElementById("receivePaymentAmount").value
    );

  if (!amount || amount <= 0) {
    toast("Enter payment amount first.");
    return;
  }

  if (!selectedReceiveSource) {
    toast("Select the buyer's funding source.");
    return;
  }

  const source = getSource(selectedReceiveSource);

  if (!source) {
    toast("Funding source not found.");
    return;
  }

  if (amount > source.balance) {
    toast("Insufficient balance in selected source.");
    return;
  }

  pendingTransaction = {
    type: "receive",
    amount,
    sourceId: source.id,
    sourceName: source.name,
    seller: "KRISH DEMO SELLER",
    receiveType: currentReceiveType
  };

  document.getElementById("buyerLoginPhone").value = "";
  document.getElementById("buyerLoginBeastId").value = "";
  document.getElementById("buyerLoginPin").value = "";

  openModal("buyerLoginModal");
}


function validateBuyerCredentials(phone, beastId, pin) {

  return (
    normalizeKenyanPhone(phone) ===
      normalizeKenyanPhone(state.phone) &&
    beastId.trim().toUpperCase() ===
      state.beastId.toUpperCase() &&
    pin === state.beastPin
  );
}


function buyerLoginContinue() {

  const phone =
    document.getElementById("buyerLoginPhone").value;

  const beastId =
    document.getElementById("buyerLoginBeastId").value;

  const pin =
    document.getElementById("buyerLoginPin").value;

  if (!validateBuyerCredentials(phone, beastId, pin)) {
    toast("Buyer login details are incorrect.");
    return;
  }

  closeModal("buyerLoginModal");

  requestSellerApproval();
}


/* =========================
   SELLER APPROVAL
========================= */

function requestSellerApproval() {

  const details =
    document.getElementById("sellerApprovalDetails");

  details.innerHTML = `
    <div>
      <span>Buyer</span>
      <strong>Verified BEAST User</strong>
    </div>

    <div>
      <span>Seller</span>
      <strong>${pendingTransaction.seller}</strong>
    </div>

    <div>
      <span>Source</span>
      <strong>${pendingTransaction.sourceName}</strong>
    </div>

    <div>
      <span>Amount</span>
      <strong>${money(pendingTransaction.amount)}</strong>
    </div>
  `;

  openModal("sellerApprovalModal");
}


function sellerReject() {

  closeModal("sellerApprovalModal");

  pendingTransaction = null;

  toast("Seller rejected the payment request.");
}


function sellerApprove() {

  closeModal("sellerApprovalModal");

  toast("Seller approved. Buyer re-login required.");

  setTimeout(() => {
    openBuyerReLogin();
  }, 500);
}


/* =========================
   BUYER RE-LOGIN
========================= */

function openBuyerReLogin() {

  document.getElementById("buyerReLoginPhone").value = "";
  document.getElementById("buyerReLoginBeastId").value = "";
  document.getElementById("buyerReLoginPin").value = "";

  openModal("buyerReLoginModal");
}


function buyerReLoginContinue() {

  const phone =
    document.getElementById("buyerReLoginPhone").value;

  const beastId =
    document.getElementById("buyerReLoginBeastId").value;

  const pin =
    document.getElementById("buyerReLoginPin").value;

  if (!validateBuyerCredentials(phone, beastId, pin)) {
    toast("Re-login authentication failed.");
    return;
  }

  closeModal("buyerReLoginModal");

  requestFinalAuthorization();
}


/* =========================
   AUTHORIZATION
========================= */

function requestFinalAuthorization() {

  document.getElementById("authDescription").textContent =
    `Final authorization required for ${money(
      pendingTransaction.amount
    )}.`;

  document.getElementById("authPin").value = "";

  openModal("authModal");
}


function authorizeTransaction() {

  const pin =
    document.getElementById("authPin").value;

  if (pin !== state.beastPin) {
    toast("Incorrect BEAST PIN.");
    return;
  }

  if (!pendingTransaction) {
    closeModal("authModal");
    return;
  }

  if (pendingTransaction.type === "send") {
    completeSendTransaction();
  }

  if (pendingTransaction.type === "receive") {
    completeReceiveTransaction();
  }

  if (pendingTransaction.type === "withdraw") {
    completeWithdrawTransaction();
  }

  if (pendingTransaction.type === "lipa") {
    completeLipaTransaction();
  }
}


/* =========================
   COMPLETE SEND
========================= */

function completeSendTransaction() {

  const tx = pendingTransaction;
  const source = getSource(tx.sourceId);

  if (!source) {
    toast("Source no longer available.");
    closeModal("authModal");
    return;
  }

  if (source.balance < tx.amount) {
    toast("Insufficient source balance.");
    closeModal("authModal");
    return;
  }

  source.balance -= tx.amount;

  state.balance = Math.max(
    0,
    state.balance - tx.amount
  );

  addHistory({
    direction: "out",
    title: "Money Sent",
    amount: tx.amount,
    source: sourceDescription(source),
    recipient: tx.recipient,
    status: "Completed"
  });

  save();
  updateBalance();
  renderSendSourcePicker();
  renderHistory();

  closeModal("authModal");

  document.getElementById("sendAmount").value = "";
  document.getElementById("sendRecipient").value = "";

  document.getElementById("recipientResult")
    .classList.add("hidden");

  selectedSendSource = null;

  toast("Money sent successfully.");

  pendingTransaction = null;
}


/* =========================
   COMPLETE RECEIVE
========================= */

function completeReceiveTransaction() {

  const tx = pendingTransaction;
  const source = getSource(tx.sourceId);

  if (!source) {
    toast("Funding source unavailable.");
    closeModal("authModal");
    return;
  }

  if (source.balance < tx.amount) {
    toast("Buyer source balance changed.");
    closeModal("authModal");
    return;
  }

  /*
    DEMO ONLY:
    In a real implementation, the backend/payment provider
    would authorize and debit the buyer's actual source.
  */

  source.balance -= tx.amount;

  state.balance += tx.amount;

  addHistory({
    direction: "in",
    title: "Payment Received",
    amount: tx.amount,
    source: sourceDescription(source),
    recipient: tx.seller,
    status: "Completed"
  });

  save();
  updateBalance();
  renderHistory();

  closeModal("authModal");

  toast(
    `${money(tx.amount)} payment completed.`
  );

  pendingTransaction = null;

  selectedReceiveSource = null;
}


/* =========================
   WITHDRAW
========================= */

function verifyReceiveWithdraw() {

  if (!selectedReceiveSource) {
    toast("Select the source first.");
    return;
  }

  const agent =
    document.getElementById("receiveAgentNumber")
      .value.trim();

  const store =
    document.getElementById("receiveStoreNumber")
      .value.trim();

  if (!agent || !store) {
    toast("Enter agent and store number.");
    return;
  }

  const source = getSource(selectedReceiveSource);

  if (!source) {
    toast("Source not found.");
    return;
  }

  const result =
    document.getElementById("receiveWithdrawResult");

  result.classList.remove("hidden");

  result.innerHTML = `
    <strong>✓ Withdrawal details verified</strong>
    <span>
      ${sourceDescription(source)}
      • Agent ${agent}
      • Store ${store}
    </span>
  `;

  receiveWithdrawVerified = true;
}


function withdrawMoney() {

  if (!receiveWithdrawVerified) {
    toast("Verify withdrawal details first.");
    return;
  }

  const amount =
    Number(
      document.getElementById("receiveWithdrawAmount").value
    );

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  const source = getSource(selectedReceiveSource);

  if (!source) {
    toast("Source not found.");
    return;
  }

  if (amount > source.balance) {
    toast("Insufficient balance.");
    return;
  }

  pendingTransaction = {
    type: "withdraw",
    amount,
    sourceId: source.id,
    sourceName: sourceDescription(source)
  };

  document.getElementById("authDescription").textContent =
    `Authorize withdrawal of ${money(amount)} from ${sourceDescription(source)}.`;

  document.getElementById("authPin").value = "";

  openModal("authModal");
}


function completeWithdrawTransaction() {

  const tx = pendingTransaction;
  const source = getSource(tx.sourceId);

  if (!source || source.balance < tx.amount) {
    toast("Insufficient balance.");
    closeModal("authModal");
    return;
  }

  source.balance -= tx.amount;

  state.balance = Math.max(
    0,
    state.balance - tx.amount
  );

  addHistory({
    direction: "out",
    title: "Withdrawal",
    amount: tx.amount,
    source: tx.sourceName,
    recipient: "Agent / Store",
    status: "Demo Completed"
  });

  save();
  updateBalance();
  renderHistory();

  closeModal("authModal");

  document.getElementById("receiveWithdrawAmount").value = "";

  toast("Withdrawal completed in demo mode.");

  pendingTransaction = null;
}


/* =========================
   LIPA NA
========================= */

function renderLipaForm() {

  const container =
    document.getElementById("lipaForm");

  if (!container) return;

  let html = "";

  if (currentLipaType === "paybill") {

    html = `
      <label>Business Number</label>
      <input id="lipaBusiness" placeholder="Business number">

      <label>Account Number</label>
      <input id="lipaAccount" placeholder="Account number">
    `;

  } else if (currentLipaType === "buygoods") {

    html = `
      <label>Till Number</label>
      <input id="lipaTill" placeholder="Till number">
    `;

  } else {

    html = `
      <label>Pochi Phone Number</label>
      <input id="lipaPhone"
             type="tel"
             placeholder="0712345678">
    `;
  }

  html += `
    <label>Amount</label>

    <div class="amount-input">
      <span>KES</span>
      <input id="lipaAmount"
             type="number"
             min="1"
             placeholder="0">
    </div>

    <label>Payment Source</label>

    <div id="lipaSourcePicker"
         class="source-picker"></div>

    <button id="lipaVerifyBtn"
            class="secondary-btn full">
      VERIFY PAYMENT DETAILS
    </button>

    <div id="lipaResult"
         class="verification-result hidden"></div>

    <button id="lipaPayBtn"
            class="primary-btn full">
      AUTHORIZE PAYMENT
    </button>
  `;

  container.innerHTML = html;

  renderSourcePicker(
    "lipaSourcePicker",
    null,
    id => {
      document
        .getElementById("lipaSourcePicker")
        .dataset.selected = id;
    }
  );

  document
    .getElementById("lipaVerifyBtn")
    .addEventListener("click", verifyLipa);

  document
    .getElementById("lipaPayBtn")
    .addEventListener("click", payLipa);
}


function verifyLipa() {

  const result =
    document.getElementById("lipaResult");

  let target = "";

  if (currentLipaType === "paybill") {

    const business =
      document.getElementById("lipaBusiness").value.trim();

    const account =
      document.getElementById("lipaAccount").value.trim();

    if (!business || !account) {
      toast("Enter business and account.");
      return;
    }

    target =
      `Business ${business} • Account ${account}`;

  } else if (currentLipaType === "buygoods") {

    target =
      document.getElementById("lipaTill").value.trim();

    if (!target) {
      toast("Enter till number.");
      return;
    }

  } else {

    target =
      document.getElementById("lipaPhone").value.trim();

    if (!validKenyanPhone(target)) {
      toast("Enter a valid phone number.");
      return;
    }
  }

  result.classList.remove("hidden");

  result.innerHTML = `
    <strong>✓ Payment destination verified</strong>
    <span>${target}</span>
  `;
}


function payLipa() {

  const result =
    document.getElementById("lipaResult");

  if (!result || result.classList.contains("hidden")) {
    toast("Verify payment details first.");
    return;
  }

  const amount =
    Number(
      document.getElementById("lipaAmount").value
    );

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  const picker =
    document.getElementById("lipaSourcePicker");

  const sourceId =
    picker.dataset.selected;

  if (!sourceId) {
    toast("Select payment source.");
    return;
  }

  const source = getSource(sourceId);

  if (!source || source.balance < amount) {
    toast("Insufficient source balance.");
    return;
  }

  pendingTransaction = {
    type: "lipa",
    amount,
    sourceId,
    sourceName: sourceDescription(source)
  };

  document.getElementById("authDescription").textContent =
    `Authorize ${money(amount)} Lipa Na payment from ${sourceDescription(source)}.`;

  document.getElementById("authPin").value = "";

  openModal("authModal");
}


function completeLipaTransaction() {

  const tx = pendingTransaction;
  const source = getSource(tx.sourceId);

  if (!source || source.balance < tx.amount) {
    toast("Insufficient source balance.");
    closeModal("authModal");
    return;
  }

  source.balance -= tx.amount;

  state.balance = Math.max(
    0,
    state.balance - tx.amount
  );

  addHistory({
    direction: "out",
    title: "Lipa Na Payment",
    amount: tx.amount,
    source: tx.sourceName,
    recipient: currentLipaType.toUpperCase(),
    status: "Completed"
  });

  save();
  updateBalance();
  renderHistory();
  renderLipaForm();

  closeModal("authModal");

  toast("Lipa Na payment completed.");

  pendingTransaction = null;
}


/* =========================
   HISTORY
========================= */

function addHistory(item) {

  state.history.unshift({
    ...item,
    reference:
      "BT" +
      Date.now().toString().slice(-10),

    date:
      new Date().toLocaleString("en-KE")
  });

  if (state.history.length > 100) {
    state.history =
      state.history.slice(0, 100);
  }
}


function renderHistory() {

  const container =
    document.getElementById("historyList");

  if (!container) return;

  if (!state.history.length) {

    container.innerHTML = `
      <div class="history-item">
        <strong>No transactions yet</strong>
        <small>Your demo transaction history will appear here.</small>
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.history.map(item => {

      const positive =
        item.direction === "in";

      return `
        <div class="history-item">

          <div class="history-item-top">
            <div>
              <strong>${item.title}</strong>
              <small>${item.date}</small>
            </div>

            <strong class="${
              positive
                ? "history-positive"
                : "history-negative"
            }">
              ${positive ? "+" : "-"}${money(item.amount)}
            </strong>
          </div>

          <small>
            Source: ${item.source}
          </small>

          <br>

          <small>
            To/From: ${item.recipient}
          </small>

          <br>

          <small>
            ${item.status} • ${item.reference}
          </small>

        </div>
      `;

    }).join("");
}


/* =========================
   SETTINGS
========================= */

function openSettings() {

  document.getElementById("securityAlertsToggle").checked =
    !!state.settings.securityAlerts;

  document.getElementById("notificationsToggle").checked =
    !!state.settings.notifications;

  document.getElementById("lightModeToggle").checked =
    state.dark === false;

  openModal("settingsModal");
}


function logout() {

  state.registered = false;

  save();

  closeModal("settingsModal");

  document.getElementById("beastApp")
    .classList.add("hidden");

  document.getElementById("registrationScreen")
    .classList.remove("hidden");

  document.getElementById("registrationName").value = "";
  document.getElementById("registrationPhone").value = "";
  document.getElementById("registrationId").value = "";
  document.getElementById("registrationPin").value = "";
  document.getElementById("registrationPinConfirm").value = "";

  showRegistrationStep(1);

  toast("Logged out.");
}


/* =========================
   EVENTS
========================= */

document.addEventListener("DOMContentLoaded", () => {

  load();
  applyTheme();

  /* Registration */

  document
    .getElementById("registrationNext1")
    .addEventListener(
      "click",
      validateRegistrationStep1
    );

  document
    .getElementById("registrationBack1")
    .addEventListener(
      "click",
      () => showRegistrationStep(1)
    );

  document
    .getElementById("registrationNext2")
    .addEventListener(
      "click",
      validateRegistrationStep2
    );

  document
    .getElementById("registrationBack2")
    .addEventListener(
      "click",
      () => showRegistrationStep(2)
    );

  document
    .getElementById("registrationFinish")
    .addEventListener(
      "click",
      finishRegistration
    );


  /* Navigation */

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener("click", () => {

        openPanel(
          button.dataset.panel
        );

      });

    });


  /* Send */

  document
    .getElementById("verifyRecipientBtn")
    .addEventListener(
      "click",
      verifyRecipient
    );

  document
    .getElementById("sendBtn")
    .addEventListener(
      "click",
      sendMoney
    );


  /* Receive tabs */

  document
    .getElementById("receiveSellTab")
    .addEventListener("click", () => {

      document
        .getElementById("receiveSellTab")
        .classList.add("active");

      document
        .getElementById("receiveWithdrawTab")
        .classList.remove("active");

      document
        .getElementById("receiveSellSection")
        .classList.remove("hidden");

      document
        .getElementById("receiveWithdrawSection")
        .classList.add("hidden");

    });


  document
    .getElementById("receiveWithdrawTab")
    .addEventListener("click", () => {

      document
        .getElementById("receiveWithdrawTab")
        .classList.add("active");

      document
        .getElementById("receiveSellTab")
        .classList.remove("active");

      document
        .getElementById("receiveSellSection")
        .classList.add("hidden");

      document
        .getElementById("receiveWithdrawSection")
        .classList.remove("hidden");

      renderReceiveWithdrawSource();

    });


  /* Receive types */

  document
    .querySelectorAll(".receive-option")
    .forEach(button => {

      if (button.dataset.receiveType) {

        button.addEventListener("click", () => {

          document
            .querySelectorAll("[data-receive-type]")
            .forEach(x =>
              x.classList.remove("active")
            );

          button.classList.add("active");

          currentReceiveType =
            button.dataset.receiveType;

          renderReceiveSellForm();

        });

      }

    });


  /* Lipa */

  document
    .querySelectorAll(".lipa-option")
    .forEach(button => {

      button.addEventListener("click", () => {

        document
          .querySelectorAll(".lipa-option")
          .forEach(x =>
            x.classList.remove("active")
          );

        button.classList.add("active");

        currentLipaType =
          button.dataset.lipaType;

        renderLipaForm();

      });

    });


  /* Withdraw */

  document
    .getElementById("verifyReceiveWithdrawBtn")
    .addEventListener(
      "click",
      verifyReceiveWithdraw
    );

  document
    .getElementById("receiveWithdrawBtn")
    .addEventListener(
      "click",
      withdrawMoney
    );


  /* Buyer */

  document
    .getElementById("buyerLoginContinue")
    .addEventListener(
      "click",
      buyerLoginContinue
    );

  document
    .getElementById("sellerApproveBtn")
    .addEventListener(
      "click",
      sellerApprove
    );

  document
    .getElementById("sellerRejectBtn")
    .addEventListener(
      "click",
      sellerReject
    );

  document
    .getElementById("buyerReLoginContinue")
    .addEventListener(
      "click",
      buyerReLoginContinue
    );


  /* Final authorization */

  document
    .getElementById("authorizeBtn")
    .addEventListener(
      "click",
      authorizeTransaction
    );


  /* Settings */

  document
    .getElementById("settingsBtn")
    .addEventListener(
      "click",
      openSettings
    );

  document
    .getElementById("lightModeToggle")
    .addEventListener("change", event => {

      state.dark = !event.target.checked;

      save();
      applyTheme();

    });


  document
    .getElementById("securityAlertsToggle")
    .addEventListener("change", event => {

      state.settings.securityAlerts =
        event.target.checked;

      save();

    });


  document
    .getElementById("notificationsToggle")
    .addEventListener("change", event => {

      state.settings.notifications =
        event.target.checked;

      save();

    });


  document
    .getElementById("logoutBtn")
    .addEventListener(
      "click",
      logout
    );


  /* Close buttons */

  document
    .querySelectorAll("[data-close]")
    .forEach(button => {

      button.addEventListener("click", () => {

        closeModal(
          button.dataset.close
        );

      });

    });


  /* Security visibility */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden &&
        state.settings.securityAlerts
      ) {
        toast(
          "Security alert: BEAST session was hidden."
        );
      }

    }
  );


  /* Initial render */

  renderSendSourcePicker();
  renderReceiveSellForm();
  renderReceiveWithdrawSource();
  renderLipaForm();
  renderHistory();
  updateBalance();

  beginRegistration();

});