/* =========================================================
   MONEY TRANSFER BEAST — app.js
   Demo / prototype only
   Demo PIN: 1234
   ========================================================= */

const KEY = "mtb_beast_v3";
const DEMO_PIN = "1234";

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

const $ = id => document.getElementById(id);

function money(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
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

function feeFor(amount) {
  if (amount < 1000) return 7;
  if (amount <= 10000) return 30;
  return 50;
}

function updateBalance() {
  if ($("balance")) {
    $("balance").textContent = money(state.balance);
  }
}

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
   SOURCE PICKERS
   ========================================================= */

function renderSourcePicker(type, pickerId, selectedId = null) {
  const picker = $(pickerId);
  if (!picker) return;

  const list = state.sources[type] || [];

  picker.innerHTML = "";

  if (!list.length) {
    picker.innerHTML = `<div class="empty-state">No linked sources found.</div>`;
    picker.classList.remove("hidden");
    return;
  }

  list.forEach((source, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "source-option";

    if ((selectedId && source.id === selectedId) || (!selectedId && index === 0)) {
      button.classList.add("selected");
      picker.dataset.selected = source.id;
    }

    button.dataset.sourceId = source.id;
    button.textContent = source.label;

    button.addEventListener("click", () => {
      picker.querySelectorAll(".source-option").forEach(x => {
        x.classList.remove("selected");
      });

      button.classList.add("selected");
      picker.dataset.selected = source.id;
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
    const found = state.sources[type].find(item => item.id === id);
    if (found) return found;
  }

  return null;
}

function showSourcePicker(type, pickerId) {
  renderSourcePicker(type, pickerId);
}

/* =========================================================
   SEND
   ========================================================= */

let sendRecipientVerified = false;

$("verifySendRecipient")?.addEventListener("click", () => {
  const phone = $("sendPhone")?.value.trim();

  if (!phone || phone.length < 9) {
    toast("Enter a valid recipient phone number.");
    return;
  }

  sendRecipientVerified = true;

  $("sendRecipientResult")?.classList.remove("hidden");

  if ($("sendRecipientResult")) {
    $("sendRecipientResult").innerHTML = `
      <strong>Recipient verified</strong>
      <br>
      KRISH TEST RECIPIENT
      <br>
      <small>${phone}</small>
    `;
  }

  toast("Recipient verified.");
});

$("sendSource")?.addEventListener("change", e => {
  showSourcePicker(e.target.value, "sendSourcePicker");
});

$("sendBtn")?.addEventListener("click", () => {
  if (!sendRecipientVerified) {
    toast("Verify the recipient first.");
    return;
  }

  const phone = $("sendPhone")?.value.trim();
  const amount = Number($("sendAmount")?.value);
  const source = $("sendSource")?.value;

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

  const selected = selectedSource("sendSourcePicker");

  requestAuthorization({
    type: "send",
    amount,
    fee: feeFor(amount),
    description: `Send to ${phone}`,
    source: selected?.label || source
  });
});

/* =========================================================
   LIPA NA
   ========================================================= */

let currentLipaType = "pochi";
let lipaVerified = false;

document.querySelectorAll(".lipa-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".lipa-tab").forEach(x => {
      x.classList.remove("active");
    });

    tab.classList.add("active");
    currentLipaType = tab.dataset.type;
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
        <input id="lipaPhone" inputmode="tel" placeholder="0712345678">
      </div>

      <button class="secondary-btn" id="verifyLipa">
        VERIFY NUMBER
      </button>

      <div id="lipaResult" class="verify-box hidden"></div>

      <div class="field">
        <label>Amount</label>
        <input id="lipaAmount" class="amount-input"
          type="number" min="1" placeholder="KES 0">
      </div>

      <button class="primary-btn" id="lipaPay">
        PAY WITH POCHI
      </button>
    `;
  }

  if (currentLipaType === "buygoods") {
    form.innerHTML = `
      <div class="field">
        <label>Till Number</label>
        <input id="lipaTill" inputmode="numeric" placeholder="123456">
      </div>

      <button class="secondary-btn" id="verifyLipa">
        VERIFY TILL
      </button>

      <div id="lipaResult" class="verify-box hidden"></div>

      <div class="field">
        <label>Amount</label>
        <input id="lipaAmount" class="amount-input"
          type="number" min="1" placeholder="KES 0">
      </div>

      <button class="primary-btn" id="lipaPay">
        PAY BUY GOODS
      </button>
    `;
  }

  if (currentLipaType === "paybill") {
    form.innerHTML = `
      <div class="field">
        <label>Business Number</label>
        <input id="lipaBusiness" inputmode="numeric"
          placeholder="Business Number">
      </div>

      <div class="field">
        <label>Account Number</label>
        <input id="lipaAccount" placeholder="Account Number">
      </div>

      <button class="secondary-btn" id="verifyLipa">
        VERIFY PAYMENT DETAILS
      </button>

      <div id="lipaResult" class="verify-box hidden"></div>

      <div class="field">
        <label>Amount</label>
        <input id="lipaAmount" class="amount-input"
          type="number" min="1" placeholder="KES 0">
      </div>

      <button class="primary-btn" id="lipaPay">
        PAY BILL
      </button>
    `;
  }

  $("verifyLipa")?.addEventListener("click", verifyLipa);
  $("lipaPay")?.addEventListener("click", submitLipa);
}

function verifyLipa() {
  if (currentLipaType === "pochi") {
    const value = $("lipaPhone")?.value.trim();

    if (!value) {
      toast("Enter the Pochi phone number.");
      return;
    }
  }

  if (currentLipaType === "buygoods") {
    const value = $("lipaTill")?.value.trim();

    if (!value) {
      toast("Enter the Till Number.");
      return;
    }
  }

  if (currentLipaType === "paybill") {
    const business = $("lipaBusiness")?.value.trim();
    const account = $("lipaAccount")?.value.trim();

    if (!business || !account) {
      toast("Enter both Business Number and Account Number.");
      return;
    }
  }

  lipaVerified = true;

  const result = $("lipaResult");
  result?.classList.remove("hidden");

  if (result) {
    result.innerHTML = `
      <strong>Payment details verified</strong>
      <br>
      Ready for authorization.
    `;
  }

  toast("Payment details verified.");
}

function submitLipa() {
  if (!lipaVerified) {
    toast("Verify payment details first.");
    return;
  }

  const amount = Number($("lipaAmount")?.value);

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  if (amount > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  let description = "Lipa Na payment";

  if (currentLipaType === "pochi") {
    description = `Pochi • ${$("lipaPhone").value}`;
  }

  if (currentLipaType === "buygoods") {
    description = `Buy Goods • Till ${$("lipaTill").value}`;
  }

  if (currentLipaType === "paybill") {
    description =
      `Pay Bill • ${$("lipaBusiness").value} / ${$("lipaAccount").value}`;
  }

  requestAuthorization({
    type: "lipa",
    amount,
    fee: feeFor(amount),
    description,
    source: "Selected BEAST source"
  });
}

/* =========================================================
   RECEIVE — SELL / RECEIVE PAYMENT
   ========================================================= */

let receiveSellType = "paybill";
let receiveSellVerified = false;

document.querySelectorAll(".receive-option").forEach(option => {
  option.addEventListener("click", () => {
    document.querySelectorAll(".receive-option").forEach(x => {
      x.classList.remove("active");
    });

    option.classList.add("active");

    receiveSellType = option.dataset.receiveType;
    receiveSellVerified = false;

    renderReceiveSellForm();
  });
});

function renderReceiveSellForm() {
  const form = $("receiveSellForm");
  if (!form) return;

  if (receiveSellType === "paybill") {
    form.innerHTML = `
      <div class="detail-card">
        <div class="field">
          <label>Business Number</label>
          <input id="receiveBusiness" inputmode="numeric"
            placeholder="Business Number">
        </div>

        <div class="field">
          <label>Account Number</label>
          <input id="receiveAccount"
            placeholder="Account Number">
        </div>

        <button class="secondary-btn" id="verifyReceiveSell">
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

        <button class="primary-btn" id="receiveSellBtn">
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

        <button class="secondary-btn" id="verifyReceiveSell">
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

        <button class="primary-btn" id="receiveSellBtn">
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

        <button class="secondary-btn" id="verifyReceiveSell">
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

        <button class="primary-btn" id="receiveSellBtn">
          RECEIVE PAYMENT
        </button>
      </div>
    `;
  }

  $("verifyReceiveSell")?.addEventListener(
    "click",
    verifyReceiveSell
  );

  $("receiveSellBtn")?.addEventListener(
    "click",
    submitReceiveSell
  );
}

function verifyReceiveSell() {
  let valid = false;

  if (receiveSellType === "paybill") {
    valid =
      Boolean($("receiveBusiness")?.value.trim()) &&
      Boolean($("receiveAccount")?.value.trim());
  }

  if (receiveSellType === "buygoods") {
    valid = Boolean($("receiveTill")?.value.trim());
  }

  if (receiveSellType === "pochi") {
    valid = Boolean($("receivePhone")?.value.trim());
  }

  if (!valid) {
    toast("Enter all required payment details.");
    return;
  }

  receiveSellVerified = true;

  const result = $("receiveSellResult");
  result?.classList.remove("hidden");

  if (result) {
    result.innerHTML = `
      <strong>Details verified</strong>
      <br>
      Ready for customer authorization.
    `;
  }

  toast("Payment details verified.");
}

function submitReceiveSell() {
  if (!receiveSellVerified) {
    toast("Verify the payment details first.");
    return;
  }

  const amount = Number($("receiveSellAmount")?.value);

  if (!amount || amount <= 0) {
    toast("Enter the amount received.");
    return;
  }

  requestAuthorization({
    type: "receive",
    amount,
    fee: 0,
    description: `Receive • ${receiveSellType.toUpperCase()}`,
    source: "Customer payment"
  });
}

/* =========================================================
   RECEIVE — WITHDRAW
   ========================================================= */

let receiveWithdrawVerified = false;

$("receiveWithdrawSource")?.addEventListener("change", e => {
  receiveWithdrawVerified = false;

  renderWithdrawSource(
    e.target.value,
    "receiveWithdrawSourcePicker",
    "receiveAgentDetails"
  );
});

function renderWithdrawSource(type, pickerId, agentId) {
  if (!type) {
    $(pickerId)?.classList.add("hidden");

    if ($(agentId)) {
      $(agentId).innerHTML = "";
    }

    return;
  }

  renderSourcePicker(type, pickerId);

  const agent = $(agentId);

  if (!agent) return;

  if (type === "MPESA" || type === "AIRTEL") {
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

    $(`${agentId}Verify`)?.addEventListener("click", () => {
      verifyWithdrawAgent(agentId);
    });
  } else {
    agent.innerHTML = `
      <div class="verify-box">
        <strong>Source selected</strong>
        <br>
        No agent/store details required for this source.
      </div>
    `;
  }

  agent.classList.remove("hidden");
}

function verifyWithdrawAgent(agentId) {
  const agent = $(`${agentId}Agent`)?.value.trim();
  const store = $(`${agentId}Store`)?.value.trim();

  if (!agent || !store) {
    toast("Enter Agent Number and Store Number.");
    return;
  }

  receiveWithdrawVerified = true;

  const result = $(`${agentId}VerifyResult`);
  result?.classList.remove("hidden");

  if (result) {
    result.innerHTML = `
      <strong>Withdrawal details verified</strong>
      <br>
      Agent and Store confirmed.
    `;
  }

  toast("Withdrawal details verified.");
}

$("receiveWithdrawBtn")?.addEventListener("click", () => {
  const sourceType = $("receiveWithdrawSource")?.value;
  const amount = Number($("receiveWithdrawAmount")?.value);

  if (!sourceType) {
    toast("Select the withdrawal source.");
    return;
  }

  const source = selectedSource("receiveWithdrawSourcePicker");

  if (!source) {
    toast("Select the exact source or line.");
    return;
  }

  if (
    (sourceType === "MPESA" || sourceType === "AIRTEL") &&
    !receiveWithdrawVerified
  ) {
    toast("Verify Agent Number and Store Number first.");
    return;
  }

  if (!amount || amount <= 0) {
    toast("Enter a valid withdrawal amount.");
    return;
  }

  if (amount > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  requestAuthorization({
    type: "withdraw",
    amount,
    fee: feeFor(amount),
    description: `Agent withdrawal • ${source.label}`,
    source: source.label
  });
});

/* =========================================================
   GENERAL WITHDRAW
   ========================================================= */

let generalWithdrawVerified = false;

$("withdrawSource")?.addEventListener("change", e => {
  generalWithdrawVerified = false;

  renderWithdrawSource(
    e.target.value,
    "withdrawSourcePicker",
    "withdrawAgentDetails"
  );
});

$("withdrawBtn")?.addEventListener("click", () => {
  const sourceType = $("withdrawSource")?.value;
  const amount = Number($("withdrawAmount")?.value);

  if (!sourceType) {
    toast("Select the withdrawal source.");
    return;
  }

  const source = selectedSource("withdrawSourcePicker");

  if (!source) {
    toast("Select the exact source or line.");
    return;
  }

  if (
    (sourceType === "MPESA" || sourceType === "AIRTEL") &&
    !generalWithdrawVerified
  ) {
    toast("Verify Agent Number and Store Number first.");
    return;
  }

  if (!amount || amount <= 0) {
    toast("Enter a valid withdrawal amount.");
    return;
  }

  if (amount > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  requestAuthorization({
    type: "withdraw",
    amount,
    fee: feeFor(amount),
    description: `Withdrawal • ${source.label}`,
    source: source.label
  });
});

/* Fix the general agent verification flag */
document.addEventListener("click", event => {
  if (event.target?.id === "withdrawAgentDetailsVerify") {
    generalWithdrawVerified = true;
  }
});

/* =========================================================
   AUTHORIZATION
   ========================================================= */

let pendingTransaction = null;

function requestAuthorization(transaction) {
  pendingTransaction = transaction;

  const modal = $("authModal");

  if (!modal) return;

  $("authDescription").textContent =
    `${transaction.description} • ${money(transaction.amount)}`;

  $("authPin").value = "";

  modal.classList.remove("hidden");

  setTimeout(() => {
    $("authPin")?.focus();
  }, 100);
}

$("authorizeBtn")?.addEventListener("click", authorizeTransaction);

$("authPin")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    authorizeTransaction();
  }
});

function authorizeTransaction() {
  if (!pendingTransaction) return;

  const pin = $("authPin")?.value || "";

  if (pin !== DEMO_PIN) {
    toast("Incorrect demo PIN.");
    return;
  }

  completeTransaction(pendingTransaction);

  pendingTransaction = null;
  $("authModal")?.classList.add("hidden");
}

/* =========================================================
   COMPLETE TRANSACTION
   ========================================================= */

function completeTransaction(tx) {
  const fee = Number(tx.fee || 0);

  if (tx.type === "receive") {
    state.balance += Number(tx.amount);

    addHistory({
      type: "receive",
      title: tx.description,
      amount: Number(tx.amount),
      fee: 0,
      source: tx.source
    });

    updateBalance();
    showReceipt({
      title: "Payment Received",
      amount: tx.amount,
      fee: 0,
      total: tx.amount,
      source: tx.source
    });

    save();
    return;
  }

  const total = Number(tx.amount) + fee;

  if (total > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  state.balance -= total;

  addHistory({
    type: tx.type,
    title: tx.description,
    amount: Number(tx.amount),
    fee,
    source: tx.source
  });

  updateBalance();

  showReceipt({
    title: tx.type === "withdraw"
      ? "Withdrawal Complete"
      : tx.type === "lipa"
        ? "Payment Complete"
        : "Transfer Complete",
    amount: tx.amount,
    fee,
    total,
    source: tx.source
  });

  save();
}

/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(item) {
  state.history.unshift({
    id: Date.now(),
    date: new Date().toLocaleString("en-KE"),
    ...item
  });

  state.history = state.history.slice(0, 100);
  renderHistory();
}

function renderHistory() {
  const list = $("historyList");
  if (!list) return;

  if (!state.history.length) {
    list.innerHTML = `
      <div class="empty-state">
        No transactions yet.
      </div>
    `;
    return;
  }

  list.innerHTML = state.history.map(item => {
    const positive = item.type === "receive";

    return `
      <div class="history-item">
        <div>
          <strong>${escapeHTML(item.title)}</strong>
          <small>
            ${escapeHTML(item.date)}
            <br>
            ${escapeHTML(item.source || "")}
          </small>
        </div>

        <div>
          <strong>
            ${positive ? "+" : "-"}${money(item.amount)}
          </strong>

          ${
            item.fee
              ? `<small>Fee: ${money(item.fee)}</small>`
              : ""
          }
        </div>
      </div>
    `;
  }).join("");
}

/* =========================================================
   RECEIPT
   ========================================================= */

function showReceipt(data) {
  const modal = $("receiptModal");
  const content = $("receiptContent");

  if (!modal || !content) return;

  content.innerHTML = `
    <div class="success-icon">✓</div>

    <h3>${escapeHTML(data.title)}</h3>

    <div class="receipt-row">
      <span>Amount</span>
      <strong>${money(data.amount)}</strong>
    </div>

    <div class="receipt-row">
      <span>Fee</span>
      <strong>${money(data.fee)}</strong>
    </div>

    <div class="receipt-row">
      <span>Total</span>
      <strong>${money(data.total)}</strong>
    </div>

    <div class="receipt-row">
      <span>Source</span>
      <strong>${escapeHTML(data.source || "")}</strong>
    </div>

    <div class="receipt-row">
      <span>Status</span>
      <strong>COMPLETED</strong>
    </div>
  `;

  modal.classList.remove("hidden");
}

document.querySelectorAll(".modal-close").forEach(button => {
  button.addEventListener("click", () => {
    button.closest(".modal")?.classList.add("hidden");
  });
});

/* =========================================================
   SECURITY
   ========================================================= */

$("receiveDeviceVerify")?.addEventListener("click", () => {
  const alertBox = $("receiveSecurityAlert");

  if (alertBox) {
    alertBox.innerHTML = `
      <strong>Terminal verified ✓</strong>
      <br>
      Secure activity may continue on this terminal.
    `;
  }

  toast("Terminal verified.");
});

/*
  Browser limitation:
  A static website cannot reliably detect every Android
  screenshot or screen-recording method.

  We can pause sensitive activity when the page loses
  visibility/focus, but this is NOT universal screenshot
  detection.
*/

document.addEventListener("visibilitychange", () => {
  if (!state.settings.screenProtection) return;

  if (document.hidden) {
    document.title = "PAUSED • MONEY TRANSFER BEAST";
    toast("Secure activity paused.");
  } else {
    document.title = "MONEY TRANSFER BEAST";
  }
});

window.addEventListener("blur", () => {
  if (!state.settings.screenProtection) return;

  toast("Secure activity paused.");
});

/* =========================================================
   SETTINGS
   ========================================================= */

function updateSettingsUI() {
  if ($("securityAlertsToggle")) {
    $("securityAlertsToggle").checked =
      state.settings.securityAlerts;
  }

  if ($("notificationsToggle")) {
    $("notificationsToggle").checked =
      state.settings.notifications;
  }

  if ($("screenProtectionToggle")) {
    $("screenProtectionToggle").checked =
      state.settings.screenProtection;
  }
}

$("securityAlertsToggle")?.addEventListener("change", e => {
  state.settings.securityAlerts = e.target.checked;
  save();
});

$("notificationsToggle")?.addEventListener("change", e => {
  state.settings.notifications = e.target.checked;
  save();
});

$("screenProtectionToggle")?.addEventListener("change", e => {
  state.settings.screenProtection = e.target.checked;
  save();
});

/* =========================================================
   DARK / LIGHT MODE
   ========================================================= */

function applyTheme() {
  document.body.classList.toggle("dark", state.dark);

  if ($("menuTheme")) {
    $("menuTheme").textContent =
      state.dark ? "☀️ Light Mode" : "🌙 Dark Mode";
  }
}

$("menuTheme")?.addEventListener("click", () => {
  state.dark = !state.dark;
  applyTheme();
  save();
});

/* =========================================================
   MENU
   ========================================================= */

$("menuBtn")?.addEventListener("click", openMenu);
$("closeMenu")?.addEventListener("click", closeMenu);
$("menuOverlay")?.addEventListener("click", closeMenu);

document.querySelectorAll(".menu-item[data-open]").forEach(item => {
  item.addEventListener("click", () => {
    openPanel(item.dataset.open);
  });
});

/* =========================================================
   QUICK SERVICE CARDS
   ========================================================= */

document.querySelectorAll(".service-card[data-panel]").forEach(card => {
  card.addEventListener("click", () => {
    openPanel(card.dataset.panel);
  });
});

/* =========================================================
   BEAST ID COPY
   ========================================================= */

$("copyBeastId")?.addEventListener("click", async () => {
  const id = $("beastId")?.textContent.trim();

  try {
    await navigator.clipboard.writeText(id);
    toast("BEAST ID copied.");
  } catch {
    toast("BEAST ID: " + id);
  }
});

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
      $("sendSource").value || "MPESA",
      "sendSourcePicker"
    );
  }

  if ($("receiveWithdrawSource")?.value) {
    renderWithdrawSource(
      $("receiveWithdrawSource").value,
      "receiveWithdrawSourcePicker",
      "receiveAgentDetails"
    );
  }

  if ($("withdrawSource")?.value) {
    renderWithdrawSource(
      $("withdrawSource").value,
      "withdrawSourcePicker",
      "withdrawAgentDetails"
    );
  }
}

init();