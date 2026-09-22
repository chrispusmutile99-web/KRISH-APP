const KEY = "mtb_beast_v3";
const DEMO_PIN = "1234";

const DEFAULT_SOURCES = {
  "M-PESA": [
    { id: "mp1", name: "M-PESA", detail: "0712345678 • Primary" },
    { id: "mp2", name: "M-PESA", detail: "0798765432 • Secondary" }
  ],

  "AIRTEL": [
    { id: "air1", name: "Airtel Money", detail: "0734567890 • Primary" },
    { id: "air2", name: "Airtel Money", detail: "0787654321 • Secondary" }
  ],

  "BANK": [
    { id: "bank1", name: "KCB Bank", detail: "•••• 4582" },
    { id: "bank2", name: "Equity Bank", detail: "•••• 9134" },
    { id: "bank3", name: "Co-operative Bank", detail: "•••• 2210" }
  ],

  "CARD": [
    { id: "card1", name: "BEAST Visa", detail: "•••• 4821" },
    { id: "card2", name: "M-PESA Card", detail: "•••• 7720" },
    { id: "card3", name: "Demo Mastercard", detail: "•••• 1188" }
  ],

  "WALLET": [
    { id: "wallet1", name: "BEAST Wallet", detail: "Main wallet" },
    { id: "wallet2", name: "M-PESA Wallet", detail: "0712345678" },
    { id: "wallet3", name: "Airtel Money Wallet", detail: "0798765432" }
  ]
};

let state = loadState();

let pendingTransaction = null;
let selectedSources = {};
let receiveSellType = "bill";
let receiveDeviceVerified = false;
let receiveWithdrawVerified = false;
let generalWithdrawVerified = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch (_) {}

  return {
    balance: 5000,
    history: [],
    dark: false,
    settings: {
      securityAlerts: true,
      notifications: true,
      screenProtection: true
    },
    sources: DEFAULT_SOURCES
  };
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

const $ = id => document.getElementById(id);

function money(value) {
  return `KES ${Number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function feeFor(amount) {
  amount = Number(amount);

  if (amount < 1000) return 7;
  if (amount <= 10000) return 30;
  return 50;
}

function updateBalance() {
  $("balance").textContent = money(state.balance);
}

function openPanel(id) {
  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.remove("active-panel");
  });

  const target = $(id);
  if (target) target.classList.add("active-panel");

  document.querySelectorAll(".service-card").forEach(card => {
    card.classList.toggle("active", card.dataset.panel === id);
  });

  closeMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSourcePicker(selectId, pickerId, selectedKey) {
  const select = $(selectId);
  const picker = $(pickerId);

  if (!select || !picker) return;

  const source = select.value;
  picker.innerHTML = "";

  if (!source) return;

  const list = state.sources[source] || [];

  list.forEach(item => {
    const button = document.createElement("button");
    button.className = "source-option";
    button.type = "button";

    const current = selectedSources[selectedKey];

    if (current === item.id) {
      button.classList.add("selected");
    }

    button.innerHTML = `
      <strong>${item.name}</strong>
      <small>${item.detail}</small>
    `;

    button.addEventListener("click", () => {
      selectedSources[selectedKey] = item.id;
      renderSourcePicker(selectId, pickerId, selectedKey);
    });

    picker.appendChild(button);
  });
}

function getSelectedSource(sourceType, selectedKey) {
  const id = selectedSources[selectedKey];
  const list = state.sources[sourceType] || [];
  return list.find(x => x.id === id) || null;
}

function showAuth(description, callback) {
  pendingTransaction = callback;
  $("authDescription").textContent = description;
  $("authPin").value = "";
  $("authModal").classList.remove("hidden");
  setTimeout(() => $("authPin").focus(), 100);
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function completeTransaction(type, amount, details, source) {
  amount = Number(amount);
  const fee = feeFor(amount);
  const total = amount + fee;

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  if (total > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  state.balance -= total;

  state.history.unshift({
    type,
    amount,
    fee,
    total,
    details,
    source: source ? `${source.name} — ${source.detail}` : "Selected source",
    time: new Date().toLocaleString()
  });

  saveState();
  updateBalance();
  renderHistory();

  showReceipt({
    type,
    amount,
    fee,
    total,
    details,
    source: source ? `${source.name} — ${source.detail}` : "Selected source"
  });

  if (state.settings.notifications) {
    toast("Transaction completed successfully.");
  }
}

function showReceipt(tx) {
  $("receiptContent").innerHTML = `
    <div class="receipt-row">
      <span>Type</span>
      <strong>${tx.type}</strong>
    </div>
    <div class="receipt-row">
      <span>Amount</span>
      <strong>${money(tx.amount)}</strong>
    </div>
    <div class="receipt-row">
      <span>Fee</span>
      <strong>${money(tx.fee)}</strong>
    </div>
    <div class="receipt-row">
      <span>Total</span>
      <strong>${money(tx.total)}</strong>
    </div>
    <div class="receipt-row">
      <span>Source</span>
      <strong>${tx.source}</strong>
    </div>
    <div class="receipt-row">
      <span>Details</span>
      <strong>${tx.details}</strong>
    </div>
  `;

  $("receiptModal").classList.remove("hidden");
}

function renderHistory() {
  const list = $("historyList");

  if (!state.history.length) {
    list.innerHTML = `<div class="empty-state">No transactions yet.</div>`;
    return;
  }

  list.innerHTML = state.history.map(tx => `
    <div class="history-item">
      <strong>${tx.type} — ${money(tx.amount)}</strong>
      <small>${tx.details}</small>
      <small>Source: ${tx.source}</small>
      <small>Fee: ${money(tx.fee)} • ${tx.time}</small>
    </div>
  `).join("");
}

/* MENU */

function openMenu() {
  $("sideMenu").classList.add("open");
  $("menuOverlay").classList.add("show");
}

function closeMenu() {
  $("sideMenu").classList.remove("open");
  $("menuOverlay").classList.remove("show");
}

$("menuBtn").addEventListener("click", openMenu);
$("closeMenu").addEventListener("click", closeMenu);
$("menuOverlay").addEventListener("click", closeMenu);

document.querySelectorAll(".menu-item[data-open]").forEach(button => {
  button.addEventListener("click", () => {
    openPanel(button.dataset.open);
  });
});

$("menuTheme").addEventListener("click", () => {
  state.dark = !state.dark;
  document.body.classList.toggle("dark", state.dark);
  saveState();
  toast(state.dark ? "Dark mode enabled." : "Light mode enabled.");
});

/* QUICK SERVICES */

document.querySelectorAll(".service-card").forEach(card => {
  card.addEventListener("click", () => {
    openPanel(card.dataset.panel);
  });
});

/* COPY ID */

$("copyBeastId").addEventListener("click", async () => {
  const id = $("beastId").textContent;

  try {
    await navigator.clipboard.writeText(id);
    toast("BEAST ID copied.");
  } catch (_) {
    toast(id);
  }
});

/* SEND */

$("sendSource").addEventListener("change", () => {
  renderSourcePicker("sendSource", "sendSourcePicker", "send");
});

$("verifySendRecipient").addEventListener("click", () => {
  const phone = $("sendPhone").value.trim();

  if (!phone) {
    toast("Enter the receiver number.");
    return;
  }

  $("sendRecipientResult").classList.remove("hidden");
  $("sendRecipientResult").innerHTML = `
    <strong>✓ Recipient verified</strong><br>
    KRISH DEMO RECIPIENT<br>
    <small>${phone}</small>
  `;
});

$("sendBtn").addEventListener("click", () => {
  const phone = $("sendPhone").value.trim();
  const amount = Number($("sendAmount").value);
  const sourceType = $("sendSource").value;
  const source = getSelectedSource(sourceType, "send");

  if (!phone) return toast("Enter receiver number.");
  if (!$("sendRecipientResult").classList.contains("hidden") === false) {
    return toast("Verify the recipient first.");
  }
  if (!amount) return toast("Enter amount.");
  if (!sourceType) return toast("Select payment source.");
  if (!source) return toast("Select a specific source.");

  showAuth("Confirm the Send Money transaction with your BEAST PIN.", () => {
    completeTransaction(
      "SEND MONEY",
      amount,
      `Receiver ${phone}`,
      source
    );
  });
});

/* LIPA NA */

function renderLipa(type = "pochi") {
  const form = $("lipaForm");

  if (type === "bill") {
    form.innerHTML = `
      <div class="field">
        <label>Business Number</label>
        <input id="lipaBusiness" type="tel" placeholder="Enter business number">
      </div>

      <div class="field">
        <label>Account Number</label>
        <input id="lipaAccount" type="text" placeholder="Enter account number">
      </div>

      <button id="verifyLipa" class="secondary-btn">VERIFY BUSINESS + ACCOUNT</button>
      <div id="lipaVerify" class="verify-box hidden"></div>

      ${lipaAmountSourceHTML()}
    `;
  }

  if (type === "till") {
    form.innerHTML = `
      <div class="field">
        <label>Till Number</label>
        <input id="lipaTill" type="tel" placeholder="Enter till number">
      </div>

      <button id="verifyLipa" class="secondary-btn">VERIFY TILL</button>
      <div id="lipaVerify" class="verify-box hidden"></div>

      ${lipaAmountSourceHTML()}
    `;
  }

  if (type === "pochi") {
    form.innerHTML = `
      <div class="field">
        <label>Phone Number</label>
        <input id="lipaPhone" type="tel" placeholder="07XXXXXXXX">
      </div>

      <button id="verifyLipa" class="secondary-btn">VERIFY PHONE</button>
      <div id="lipaVerify" class="verify-box hidden"></div>

      ${lipaAmountSourceHTML()}
    `;
  }

  $("verifyLipa").addEventListener("click", () => {
    $("lipaVerify").classList.remove("hidden");
    $("lipaVerify").innerHTML =
      "<strong>✓ Destination verified</strong><br>KRISH DEMO MERCHANT";
  });

  $("lipaSource").addEventListener("change", () => {
    renderSourcePicker("lipaSource", "lipaSourcePicker", "lipa");
  });

  $("lipaPayBtn").addEventListener("click", () => {
    if ($("lipaVerify").classList.contains("hidden")) {
      return toast("Verify the destination first.");
    }

    const amount = Number($("lipaAmount").value);
    const sourceType = $("lipaSource").value;
    const source = getSelectedSource(sourceType, "lipa");

    if (!amount) return toast("Enter amount.");
    if (!sourceType) return toast("Select payment source.");
    if (!source) return toast("Select a specific source.");

    let detail = "Merchant payment";

    if (type === "bill") {
      detail = `Pay Bill ${$("lipaBusiness").value} / ${$("lipaAccount").value}`;
    }

    if (type === "till") {
      detail = `Till ${$("lipaTill").value}`;
    }

    if (type === "pochi") {
      detail = `Pochi ${$("lipaPhone").value}`;
    }

    showAuth("Enter your BEAST PIN to authorize the merchant payment.", () => {
      completeTransaction("LIPA NA", amount, detail, source);
    });
  });
}

function lipaAmountSourceHTML() {
  return `
    <div class="field">
      <label>Amount</label>
      <div class="amount-input">
        <span>KES</span>
        <input id="lipaAmount" type="number" placeholder="0">
      </div>
    </div>

    <div class="field">
      <label>Pay From</label>
      <select id="lipaSource">
        <option value="">Select source</option>
        <option value="M-PESA">M-PESA</option>
        <option value="AIRTEL">Airtel Money</option>
        <option value="BANK">Bank Account</option>
        <option value="CARD">Card</option>
        <option value="WALLET">BEAST Wallet</option>
      </select>
    </div>

    <div id="lipaSourcePicker" class="source-picker"></div>

    <button id="lipaPayBtn" class="primary-btn">PAY</button>
  `;
}

document.querySelectorAll(".lipa-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".lipa-tab").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    renderLipa(tab.dataset.type);
  });
});

/* RECEIVE SELL */

function renderReceiveSell(type = "bill") {
  receiveSellType = type;

  const form = $("receiveSellForm");

  if (type === "bill") {
    form.innerHTML = `
      <div class="detail-card">
        <h4>Pay Bill Details</h4>

        <div class="field">
          <label>Business Number</label>
          <input id="receiveBusiness" type="tel" placeholder="Business number">
        </div>

        <div class="field">
          <label>Account Number</label>
          <input id="receiveAccount" type="text" placeholder="Account number">
        </div>

        <button id="verifyReceiveSell" class="secondary-btn">
          VERIFY BUSINESS + ACCOUNT
        </button>

        <div id="receiveSellVerify" class="verify-box hidden"></div>

        <div class="field">
          <label>Amount</label>
          <div class="amount-input">
            <span>KES</span>
            <input id="receiveSellAmount" type="number" placeholder="0">
          </div>
        </div>

        <button id="receiveSellBtn" class="primary-btn">
          RECEIVE PAYMENT
        </button>
      </div>
    `;
  }

  if (type === "goods") {
    form.innerHTML = `
      <div class="detail-card">
        <h4>Buy Goods Details</h4>

        <div class="field">
          <label>Till Number</label>
          <input id="receiveTill" type="tel" placeholder="Till number">
        </div>

        <button id="verifyReceiveSell" class="secondary-btn">
          VERIFY TILL
        </button>

        <div id="receiveSellVerify" class="verify-box hidden"></div>

        <div class="field">
          <label>Amount</label>
          <div class="amount-input">
            <span>KES</span>
            <input id="receiveSellAmount" type="number" placeholder="0">
          </div>
        </div>

        <button id="receiveSellBtn" class="primary-btn">
          RECEIVE PAYMENT
        </button>
      </div>
    `;
  }

  if (type === "pochi") {
    form.innerHTML = `
      <div class="detail-card">
        <h4>Pochi Details</h4>

        <div class="field">
          <label>Phone Number</label>
          <input id="receivePhone" type="tel" placeholder="07XXXXXXXX">
        </div>

        <button id="verifyReceiveSell" class="secondary-btn">
          VERIFY PHONE
        </button>

        <div id="receiveSellVerify" class="verify-box hidden"></div>

        <div class="field">
          <label>Amount</label>
          <div class="amount-input">
            <span>KES</span>
            <input id="receiveSellAmount" type="number" placeholder="0">
          </div>
        </div>

        <button id="receiveSellBtn" class="primary-btn">
          RECEIVE PAYMENT
        </button>
      </div>
    `;
  }

  $("verifyReceiveSell").addEventListener("click", () => {
    $("receiveSellVerify").classList.remove("hidden");
    $("receiveSellVerify").innerHTML =
      "<strong>✓ Destination verified</strong><br>DEMO CUSTOMER / MERCHANT";
  });

  $("receiveSellBtn").addEventListener("click", () => {
    if (!receiveDeviceVerified) {
      return toast("Verify this terminal first.");
    }

    if ($("receiveSellVerify").classList.contains("hidden")) {
      return toast("Verify the destination first.");
    }

    const amount = Number($("receiveSellAmount").value);

    if (!amount) return toast("Enter amount.");

    let details = "Receive payment";

    if (type === "bill") {
      details = `Pay Bill ${$("receiveBusiness").value} / ${$("receiveAccount").value}`;
    }

    if (type === "goods") {
      details = `Till ${$("receiveTill").value}`;
    }

    if (type === "pochi") {
      details = `Pochi ${$("receivePhone").value}`;
    }

    showAuth("Buyer/customer authorization is required before the demo transaction completes.", () => {
      /*
       * DEMO:
       * This simulates money being received by the merchant.
       * A production implementation would use a secure payment-provider API.
       */
      state.balance += amount;

      state.history.unshift({
        type: "RECEIVE / SELL",
        amount,
        fee: 0,
        total: amount,
        details,
        source: "Buyer payment",
        time: new Date().toLocaleString()
      });

      saveState();
      updateBalance();
      renderHistory();

      showReceipt({
        type: "RECEIVE / SELL",
        amount,
        fee: 0,
        total: amount,
        details,
        source: "Buyer payment"
      });
    });
  });
}

document.querySelectorAll(".receive-option").forEach(option => {
  option.addEventListener("click", () => {
    document.querySelectorAll(".receive-option")
      .forEach(x => x.classList.remove("active"));

    option.classList.add("active");
    renderReceiveSell(option.dataset.receiveType);
  });
});

/* RECEIVE TERMINAL VERIFICATION */

$("receiveDeviceVerify").addEventListener("click", () => {
  receiveDeviceVerified = true;

  $("receiveSecurityAlert").innerHTML = `
    <strong>✓ Secure terminal verified</strong>
    <p>
      The demo terminal is authorized to continue Receive operations.
    </p>
  `;

  toast("Terminal verified.");
});

/* RECEIVE WITHDRAW */

$("receiveWithdrawSource").addEventListener("change", () => {
  receiveWithdrawVerified = false;

  const source = $("receiveWithdrawSource").value;

  renderSourcePicker(
    "receiveWithdrawSource",
    "receiveWithdrawSourcePicker",
    "receiveWithdraw"
  );

  const details = $("receiveAgentDetails");

  if (!source) {
    details.innerHTML = "";
    return;
  }

  if (source === "M-PESA" || source === "AIRTEL") {
    details.innerHTML = `
      <div class="detail-card">
        <h4>Agent Withdrawal Details</h4>

        <div class="field">
          <label>Agent Number</label>
          <input id="receiveAgent" type="tel" placeholder="Agent phone number">
        </div>

        <div class="field">
          <label>Store Number</label>
          <input id="receiveStore" type="tel" placeholder="Store number">
        </div>

        <button id="verifyReceiveWithdraw" class="secondary-btn">
          VERIFY WITHDRAWAL DETAILS
        </button>

        <div id="receiveWithdrawVerify" class="verify-box hidden"></div>
      </div>
    `;

    $("verifyReceiveWithdraw").addEventListener("click", () => {
      const agent = $("receiveAgent").value.trim();
      const store = $("receiveStore").value.trim();

      if (!agent || !store) {
        return toast("Enter both Agent and Store numbers.");
      }

      receiveWithdrawVerified = true;

      $("receiveWithdrawVerify").classList.remove("hidden");
      $("receiveWithdrawVerify").innerHTML =
        "<strong>✓ Withdrawal details verified</strong><br>Agent + Store confirmed.";
    });
  } else {
    details.innerHTML = `
      <div class="verify-box">
        <strong>✓ Source selected</strong><br>
        Choose the specific account/card/wallet above.
      </div>
    `;
  }
});

$("receiveWithdrawBtn").addEventListener("click", () => {
  if (!receiveDeviceVerified) {
    return toast("Verify this terminal first.");
  }

  const sourceType = $("receiveWithdrawSource").value;
  const source = getSelectedSource(sourceType, "receiveWithdraw");
  const amount = Number($("receiveWithdrawAmount").value);

  if (!sourceType) return toast("Select withdrawal source.");
  if (!source) return toast("Select a specific source.");
  if (!amount) return toast("Enter amount.");

  if (sourceType === "M-PESA" || sourceType === "AIRTEL") {
    if (!receiveWithdrawVerified) {
      return toast("Verify Agent + Store details first.");
    }
  }

  let details = `Withdraw from ${source.name}`;

  if (sourceType === "M-PESA" || sourceType === "AIRTEL") {
    details += ` • Agent ${$("receiveAgent").value} • Store ${$("receiveStore").value}`;
  }

  showAuth("Authorize this Receive withdrawal with your BEAST PIN.", () => {
    completeTransaction(
      "RECEIVE / WITHDRAW",
      amount,
      details,
      source
    );
  });
});

/* GENERAL WITHDRAW */

$("withdrawSource").addEventListener("change", () => {
  generalWithdrawVerified = false;

  renderSourcePicker(
    "withdrawSource",
    "withdrawSourcePicker",
    "generalWithdraw"
  );

  const source = $("withdrawSource").value;
  const details = $("withdrawAgentDetails");

  if (source === "M-PESA" || source === "AIRTEL") {
    details.innerHTML = `
      <div class="detail-card">
        <h4>Agent Withdrawal Details</h4>

        <div class="field">
          <label>Agent Number</label>
          <input id="generalAgent" type="tel" placeholder="Agent phone number">
        </div>

        <div class="field">
          <label>Store Number</label>
          <input id="generalStore" type="tel" placeholder="Store number">
        </div>

        <button id="verifyGeneralWithdraw" class="secondary-btn">
          VERIFY WITHDRAWAL DETAILS
        </button>

        <div id="generalWithdrawVerify" class="verify-box hidden"></div>
      </div>
    `;

    $("verifyGeneralWithdraw").addEventListener("click", () => {
      const agent = $("generalAgent").value.trim();
      const store = $("generalStore").value.trim();

      if (!agent || !store) {
        return toast("Enter both Agent and Store numbers.");
      }

      generalWithdrawVerified = true;

      $("generalWithdrawVerify").classList.remove("hidden");
      $("generalWithdrawVerify").innerHTML =
        "<strong>✓ Withdrawal details verified</strong>";
    });
  } else {
    details.innerHTML = "";
  }
});

$("withdrawBtn").addEventListener("click", () => {
  const sourceType = $("withdrawSource").value;
  const source = getSelectedSource(sourceType, "generalWithdraw");
  const amount = Number($("withdrawAmount").value);

  if (!sourceType) return toast("Select withdrawal source.");
  if (!source) return toast("Select a specific source.");
  if (!amount) return toast("Enter amount.");

  if (sourceType === "M-PESA" || sourceType === "AIRTEL") {
    if (!generalWithdrawVerified) {
      return toast("Verify Agent + Store details first.");
    }
  }

  let details = `Withdraw from ${source.name}`;

  if (sourceType === "M-PESA" || sourceType === "AIRTEL") {
    details += ` • Agent ${$("generalAgent").value} • Store ${$("generalStore").value}`;
  }

  showAuth("Authorize the withdrawal with your BEAST PIN.", () => {
    completeTransaction(
      "WITHDRAW",
      amount,
      details,
      source
    );
  });
});

/* AUTHORIZATION */

$("authorizeBtn").addEventListener("click", () => {
  const pin = $("authPin").value;

  if (pin !== DEMO_PIN) {
    toast("Incorrect demo PIN.");
    return;
  }

  const callback = pendingTransaction;
  pendingTransaction = null;

  closeModal("authModal");

  if (callback) callback();
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeModal(button.dataset.close);
  });
});

/* SETTINGS */

$("securityAlertsToggle").addEventListener("change", e => {
  state.settings.securityAlerts = e.target.checked;
  saveState();
});

$("notificationsToggle").addEventListener("change", e => {
  state.settings.notifications = e.target.checked;
  saveState();
});

$("screenProtectionToggle").addEventListener("change", e => {
  state.settings.screenProtection = e.target.checked;
  saveState();
});

/*
 * Browser limitation:
 * A normal website cannot universally detect Android screenshots
 * or every form of screen recording.
 *
 * This visibility check provides a basic demo protection signal.
 */
document.addEventListener("visibilitychange", () => {
  if (!state.settings.screenProtection) return;

  if (document.hidden) {
    document.title = "🔒 BEAST SECURE — PAUSED";
    toast("Secure activity paused.");
  } else {
    document.title = "MONEY TRANSFER BEAST";
  }
});

/* INITIALIZE */

document.body.classList.toggle("dark", state.dark);

$("securityAlertsToggle").checked = state.settings.securityAlerts;
$("notificationsToggle").checked = state.settings.notifications;
$("screenProtectionToggle").checked = state.settings.screenProtection;

updateBalance();
renderHistory();
renderLipa("pochi");
renderReceiveSell("bill");