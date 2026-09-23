/* =========================================================
   MONEY TRANSFER BEAST — app.js
   Demo / prototype only
   Registration + Dashboard
   Demo PIN after registration is the PIN created by user
   ========================================================= */

const KEY = "mtb_beast_v3";
const REG_KEY = "mtb_beast_registration";

const DEFAULT_SOURCES = {
  MPESA: [
    { id: "mpesa1", name: "0712345678", label: "Primary" },
    { id: "mpesa2", name: "0798765432", label: "Secondary" }
  ],

  AIRTEL: [
    { id: "airtel1", name: "0734567890", label: "Primary" },
    { id: "airtel2", name: "0787654321", label: "Secondary" }
  ],

  BANK: [
    { id: "bank1", name: "KCB •••• 4582", label: "KCB" },
    { id: "bank2", name: "Equity •••• 9134", label: "Equity" },
    { id: "bank3", name: "Co-operative Bank •••• 2210", label: "Co-operative Bank" }
  ],

  CARD: [
    { id: "card1", name: "BEAST Visa •••• 4821", label: "BEAST Visa" },
    { id: "card2", name: "M-PESA Card •••• 7720", label: "M-PESA Card" },
    { id: "card3", name: "Demo Mastercard •••• 1188", label: "Demo Mastercard" }
  ],

  WALLET: [
    { id: "wallet1", name: "BEAST Wallet • Main wallet", label: "BEAST Wallet" },
    { id: "wallet2", name: "M-PESA Wallet • 0712345678", label: "M-PESA Wallet" },
    { id: "wallet3", name: "Airtel Money Wallet • 0798765432", label: "Airtel Wallet" }
  ]
};


/* =========================================================
   STATE
   ========================================================= */

let state = {
  balance: 5000,
  history: [],
  dark: false,

  settings: {
    securityAlerts: true,
    notifications: true,
    screenProtection: true
  },

  trustedDevices: [],

  sources: DEFAULT_SOURCES,

  registered: false,
  fullName: "",
  phone: "",
  nationalId: "",
  beastId: "",
  beastPin: ""
};


let currentLipaType = "pochi";
let currentReceiveType = "paybill";

let lipaVerified = false;
let receiveWithdrawVerified = false;
let generalWithdrawVerified = false;

let selectedSendSource = null;
let selectedReceiveWithdrawSource = null;
let selectedWithdrawSource = null;

let pendingTransaction = null;


/* =========================================================
   HELPERS
   ========================================================= */

function money(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}


function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}


function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (saved && typeof saved === "object") {
      state = {
        ...state,
        ...saved,
        settings: {
          ...state.settings,
          ...(saved.settings || {})
        },
        sources: saved.sources || DEFAULT_SOURCES
      };
    }
  } catch (error) {
    console.warn("Could not load BEAST state.", error);
  }
}


function toast(message) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(window.__beastToast);

  window.__beastToast = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}


function feeFor(amount) {
  const value = Number(amount || 0);

  if (value < 1000) return 7;
  if (value <= 10000) return 30;

  return 30;
}


function updateBalance() {
  const el = document.getElementById("balance");

  if (el) {
    el.textContent = money(state.balance);
  }
}


function openPanel(id) {
  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.remove("active-panel");
  });

  const panel = document.getElementById(id);

  if (panel) {
    panel.classList.add("active-panel");
  }

  document.querySelectorAll(".service-card").forEach(card => {
    card.classList.toggle(
      "active",
      card.dataset.panel === id
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function openMenu() {
  document.getElementById("sideMenu")?.classList.add("open");
  document.getElementById("menuOverlay")?.classList.add("show");
}


function closeMenu() {
  document.getElementById("sideMenu")?.classList.remove("open");
  document.getElementById("menuOverlay")?.classList.remove("show");
}


/* =========================================================
   REGISTRATION
   ========================================================= */

function getRegistration() {
  try {
    return JSON.parse(
      localStorage.getItem(REG_KEY) || "null"
    );
  } catch {
    return null;
  }
}


function generateBeastId() {
  const number = Math.floor(
    100000 + Math.random() * 900000
  );

  return `BEAST-KE-${number}`;
}


function showRegistrationStep(step) {

  document.querySelectorAll(".registration-step").forEach(el => {
    el.classList.remove("active");
  });

  const target = document.getElementById(
    `registrationStep${step}`
  );

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".progress-dot").forEach((dot, index) => {
    dot.classList.toggle(
      "active",
      index < step
    );
  });
}


function validateRegistrationStep1() {

  const name =
    document.getElementById("registrationName")?.value.trim();

  const phone =
    document.getElementById("registrationPhone")?.value.trim();

  const id =
    document.getElementById("registrationId")?.value.trim();

  if (!name) {
    toast("Enter your full name.");
    return false;
  }

  if (!/^[0-9+ ]{9,15}$/.test(phone)) {
    toast("Enter a valid phone number.");
    return false;
  }

  if (!/^[0-9]{5,15}$/.test(id)) {
    toast("Enter a valid National ID number.");
    return false;
  }

  return true;
}


function validateRegistrationStep2() {

  const pin =
    document.getElementById("registrationPin")?.value.trim();

  const confirm =
    document.getElementById("registrationPinConfirm")?.value.trim();

  if (!/^[0-9]{4}$/.test(pin)) {
    toast("BEAST PIN must contain 4 digits.");
    return false;
  }

  if (pin !== confirm) {
    toast("BEAST PINs do not match.");
    return false;
  }

  return true;
}


function beginRegistration() {

  const existing = getRegistration();

  if (existing?.registered) {

    state.registered = true;
    state.fullName = existing.fullName || "";
    state.phone = existing.phone || "";
    state.nationalId = existing.nationalId || "";
    state.beastId = existing.beastId || "";
    state.beastPin = existing.beastPin || "";

    save();

    showDashboard();

    return;
  }

  showRegistration();
}


function showRegistration() {

  const screen =
    document.getElementById("registrationScreen");

  const app =
    document.getElementById("beastApp");

  if (screen) {
    screen.style.display = "flex";
  }

  if (app) {
    app.style.display = "none";
  }

  showRegistrationStep(1);
}


function showDashboard() {

  const screen =
    document.getElementById("registrationScreen");

  const app =
    document.getElementById("beastApp");

  if (screen) {
    screen.style.display = "none";
  }

  if (app) {
    app.style.display = "block";
  }

  const name =
    document.getElementById("dashboardName");

  const beastId =
    document.getElementById("beastId");

  if (name && state.fullName) {
    name.textContent = state.fullName;
  }

  if (beastId && state.beastId) {
    beastId.textContent = state.beastId;
  }

  updateBalance();
}


document.getElementById("registrationNext1")
  ?.addEventListener("click", () => {

    if (!validateRegistrationStep1()) {
      return;
    }

    showRegistrationStep(2);
  });


document.getElementById("registrationBack1")
  ?.addEventListener("click", () => {
    showRegistrationStep(1);
  });


document.getElementById("registrationNext2")
  ?.addEventListener("click", () => {

    if (!validateRegistrationStep2()) {
      return;
    }

    const name =
      document.getElementById("registrationName").value.trim();

    const phone =
      document.getElementById("registrationPhone").value.trim();

    const nationalId =
      document.getElementById("registrationId").value.trim();

    const pin =
      document.getElementById("registrationPin").value.trim();

    state.fullName = name;
    state.phone = phone;
    state.nationalId = nationalId;
    state.beastPin = pin;
    state.beastId = generateBeastId();
    state.registered = true;

    localStorage.setItem(
      REG_KEY,
      JSON.stringify({
        registered: true,
        fullName: name,
        phone,
        nationalId,
        beastId: state.beastId,
        beastPin: pin
      })
    );

    document.getElementById(
      "registrationSummaryName"
    ).textContent = name;

    document.getElementById(
      "registrationSummaryPhone"
    ).textContent = phone;

    document.getElementById(
      "registrationSummaryId"
    ).textContent = nationalId;

    document.getElementById(
      "registrationBeastId"
    ).textContent = state.beastId;

    save();

    showRegistrationStep(3);

    toast("Identity verified in demo mode.");
  });


document.getElementById("registrationFinish")
  ?.addEventListener("click", () => {

    showDashboard();

    toast("Welcome to MONEY TRANSFER BEAST.");
  });


/* =========================================================
   SOURCE PICKER
   ========================================================= */

function renderSourcePicker(
  containerId,
  sourceType,
  selectedId,
  callback
) {

  const container =
    document.getElementById(containerId);

  if (!container) return;

  const items =
    state.sources[sourceType] || [];

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        No saved ${sourceType.toLowerCase()} sources.
      </div>
    `;

    return;
  }

  container.innerHTML = items.map(item => `
    <button
      type="button"
      class="source-option ${
        selectedId === item.id ? "selected" : ""
      }"
      data-source-id="${item.id}"
    >
      <strong>${item.name}</strong>
      <small>${item.label}</small>
    </button>
  `).join("");

  container.querySelectorAll(".source-option").forEach(btn => {

    btn.addEventListener("click", () => {

      const id = btn.dataset.sourceId;

      callback(id);

      container
        .querySelectorAll(".source-option")
        .forEach(option => {
          option.classList.toggle(
            "selected",
            option.dataset.sourceId === id
          );
        });
    });

  });
}


function selectedSource(sourceType, id) {

  return (state.sources[sourceType] || [])
    .find(item => item.id === id);
}


/* =========================================================
   SEND — PAY FROM
   ========================================================= */

function renderSendSourcePicker() {

  const type =
    document.getElementById("sendSource")?.value;

  selectedSendSource = null;

  if (!type) {

    const container =
      document.getElementById("sendSourcePicker");

    if (container) {
      container.innerHTML = "";
    }

    return;
  }

  renderSourcePicker(
    "sendSourcePicker",
    type,
    null,
    id => {
      selectedSendSource = id;
    }
  );
}


document.getElementById("sendSource")
  ?.addEventListener("change", renderSendSourcePicker);


/* =========================================================
   SEND
   ========================================================= */

document.getElementById("verifySendRecipient")
  ?.addEventListener("click", () => {

    const phone =
      document.getElementById("sendPhone")?.value.trim();

    const result =
      document.getElementById("sendRecipientResult");

    if (!phone) {
      toast("Enter the receiver phone number.");
      return;
    }

    if (result) {

      result.classList.remove("hidden");

      result.innerHTML = `
        <strong>✓ Recipient verified</strong>
        <span>KRISH TEST RECIPIENT</span>
        <small>${phone}</small>
      `;
    }

    toast("Recipient verified.");
  });


document.getElementById("sendBtn")
  ?.addEventListener("click", () => {

    const phone =
      document.getElementById("sendPhone")?.value.trim();

    const amount =
      Number(
        document.getElementById("sendAmount")?.value
      );

    const sourceType =
      document.getElementById("sendSource")?.value;

    if (!phone) {
      toast("Verify the recipient first.");
      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    if (!sourceType) {
      toast("Select a payment source.");
      return;
    }

    if (!selectedSendSource) {
      toast("Select the exact source to pay from.");
      return;
    }

    const fee = feeFor(amount);

    if (amount + fee > state.balance) {
      toast("Insufficient demo balance.");
      return;
    }

    requestAuthorization({
      type: "send",
      title: "Send Money",
      amount,
      fee,
      source: selectedSource(
        sourceType,
        selectedSendSource
      ),
      destination: phone
    });

  });


/* =========================================================
   LIPA NA
   ========================================================= */

function renderLipaForm() {

  const form =
    document.getElementById("lipaForm");

  if (!form) return;

  lipaVerified = false;

  if (currentLipaType === "pochi") {

    form.innerHTML = `

      <div class="field">
        <label>Phone Number</label>

        <input
          id="lipaPhone"
          type="tel"
          inputmode="tel"
          placeholder="07XXXXXXXX"
        >
      </div>

      <button
        id="verifyLipa"
        class="secondary-btn"
      >
        VERIFY PHONE
      </button>

      <div id="lipaVerification" class="verify-box hidden"></div>

      <div class="field">
        <label>Amount</label>

        <div class="amount-input">
          <span>KES</span>
          <input
            id="lipaAmount"
            type="number"
            min="1"
            placeholder="0"
          >
        </div>
      </div>

      <button
        id="lipaSubmit"
        class="primary-btn"
      >
        PAY
      </button>
    `;

  } else if (currentLipaType === "buygoods") {

    form.innerHTML = `

      <div class="field">
        <label>Till Number</label>

        <input
          id="lipaTill"
          type="text"
          inputmode="numeric"
          placeholder="Enter Till Number"
        >
      </div>

      <button
        id="verifyLipa"
        class="secondary-btn"
      >
        VERIFY TILL
      </button>

      <div id="lipaVerification" class="verify-box hidden"></div>

      <div class="field">
        <label>Amount</label>

        <div class="amount-input">
          <span>KES</span>
          <input
            id="lipaAmount"
            type="number"
            min="1"
            placeholder="0"
          >
        </div>
      </div>

      <button
        id="lipaSubmit"
        class="primary-btn"
      >
        PAY
      </button>
    `;

  } else {

    form.innerHTML = `

      <div class="field">
        <label>Business Number</label>

        <input
          id="lipaBusiness"
          type="text"
          inputmode="numeric"
          placeholder="Business Number"
        >
      </div>

      <div class="field">
        <label>Account Number</label>

        <input
          id="lipaAccount"
          type="text"
          placeholder="Account Number"
        >
      </div>

      <button
        id="verifyLipa"
        class="secondary-btn"
      >
        VERIFY PAYMENT DETAILS
      </button>

      <div
        id="lipaVerification"
        class="verify-box hidden"
      ></div>

      <div class="field">
        <label>Amount</label>

        <div class="amount-input">
          <span>KES</span>

          <input
            id="lipaAmount"
            type="number"
            min="1"
            placeholder="0"
          >
        </div>
      </div>

      <button
        id="lipaSubmit"
        class="primary-btn"
      >
        PAY BILL
      </button>
    `;
  }

  document.getElementById("verifyLipa")
    ?.addEventListener("click", verifyLipa);

  document.getElementById("lipaSubmit")
    ?.addEventListener("click", submitLipa);
}


function verifyLipa() {

  let valid = false;
  let destination = "";

  if (currentLipaType === "pochi") {

    destination =
      document.getElementById("lipaPhone")?.value.trim();

    valid = !!destination;

  } else if (currentLipaType === "buygoods") {

    destination =
      document.getElementById("lipaTill")?.value.trim();

    valid = !!destination;

  } else {

    const business =
      document.getElementById("lipaBusiness")?.value.trim();

    const account =
      document.getElementById("lipaAccount")?.value.trim();

    valid = !!business && !!account;

    destination =
      `${business} / ${account}`;
  }

  const result =
    document.getElementById("lipaVerification");

  if (!valid) {
    toast("Enter all payment details.");
    return;
  }

  lipaVerified = true;

  if (result) {

    result.classList.remove("hidden");

    result.innerHTML = `
      <strong>✓ Payment details verified</strong>
      <span>${destination}</span>
    `;
  }

  toast("Payment details verified.");
}


function submitLipa() {

  if (!lipaVerified) {
    toast("Verify payment details first.");
    return;
  }

  const amount =
    Number(
      document.getElementById("lipaAmount")?.value
    );

  if (!amount || amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  const fee = feeFor(amount);

  if (amount + fee > state.balance) {
    toast("Insufficient demo balance.");
    return;
  }

  requestAuthorization({
    type: "lipa",
    title: "Lipa Na",
    amount,
    fee,
    source: {
      name: "BEAST Demo Balance"
    },
    destination: currentLipaType
  });
}


document.querySelectorAll(".lipa-tab")
  .forEach(tab => {

    tab.addEventListener("click", () => {

      document.querySelectorAll(".lipa-tab")
        .forEach(t => t.classList.remove("active"));

      tab.classList.add("active");

      currentLipaType =
        tab.dataset.type;

      renderLipaForm();
    });

  });


/* =========================================================
   RECEIVE — SELL / RECEIVE PAYMENT
   ========================================================= */

function renderReceiveSellForm() {

  const form =
    document.getElementById("receiveSellForm");

  if (!form) return;

  if (currentReceiveType === "paybill") {

    form.innerHTML = `

      <div class="detail-card">

        <div class="field">
          <label>Business Number</label>

          <input
            id="receiveBusiness"
            type="text"
            inputmode="numeric"
            placeholder="Business Number"
          >
        </div>

        <div class="field">
          <label>Account Number</label>

          <input
            id="receiveAccount"
            type="text"
            placeholder="Account Number"
          >
        </div>

        <button
          id="verifyReceivePayment"
          class="secondary-btn"
        >
          VERIFY PAYMENT DETAILS
        </button>

      </div>

    `;

  } else if (currentReceiveType === "goods") {

    form.innerHTML = `

      <div class="detail-card">

        <div class="field">
          <label>Till Number</label>

          <input
            id="receiveTill"
            type="text"
            inputmode="numeric"
            placeholder="Till Number"
          >
        </div>

        <button
          id="verifyReceivePayment"
          class="secondary-btn"
        >
          VERIFY TILL
        </button>

      </div>

    `;

  } else {

    form.innerHTML = `

      <div class="detail-card">

        <div class="field">
          <label>Phone Number</label>

          <input
            id="receivePochi"
            type="tel"
            inputmode="tel"
            placeholder="07XXXXXXXX"
          >
        </div>

        <button
          id="verifyReceivePayment"
          class="secondary-btn"
        >
          VERIFY PHONE
        </button>

      </div>

    `;
  }

  document.getElementById("verifyReceivePayment")
    ?.addEventListener("click", verifyReceivePayment);
}


function verifyReceivePayment() {

  let valid = false;
  let destination = "";

  if (currentReceiveType === "paybill") {

    const business =
      document.getElementById("receiveBusiness")?.value.trim();

    const account =
      document.getElementById("receiveAccount")?.value.trim();

    valid = !!business && !!account;

    destination =
      `${business} / ${account}`;

  } else if (currentReceiveType === "goods") {

    destination =
      document.getElementById("receiveTill")?.value.trim();

    valid = !!destination;

  } else {

    destination =
      document.getElementById("receivePochi")?.value.trim();

    valid = !!destination;
  }

  if (!valid) {
    toast("Enter all payment details.");
    return;
  }

  requestAuthorization({
    type: "receive",
    title: "Receive Payment",
    amount: 0,
    fee: 0,
    source: {
      name: "Buyer Payment"
    },
    destination
  });
}


/* =========================================================
   RECEIVE OPTIONS
   ========================================================= */

document.querySelectorAll(".receive-option")
  .forEach(option => {

    option.addEventListener("click", () => {

      document.querySelectorAll(".receive-option")
        .forEach(o => o.classList.remove("active"));

      option.classList.add("active");

      currentReceiveType =
        option.dataset.receiveType;

      renderReceiveSellForm();
    });

  });


/* =========================================================
   RECEIVE WITHDRAW SOURCE
   ========================================================= */

function renderReceiveWithdrawSource() {

  const type =
    document.getElementById(
      "receiveWithdrawSource"
    )?.value;

  const container =
    document.getElementById(
      "receiveWithdrawSourcePicker"
    );

  const agent =
    document.getElementById(
      "receiveAgentDetails"
    );

  selectedReceiveWithdrawSource = null;
  receiveWithdrawVerified = false;

  if (!type) {

    if (container) container.innerHTML = "";
    if (agent) agent.innerHTML = "";

    return;
  }

  renderSourcePicker(
    "receiveWithdrawSourcePicker",
    type,
    null,
    id => {

      selectedReceiveWithdrawSource = id;

      if (
        type === "MPESA" ||
        type === "AIRTEL"
      ) {
        renderReceiveAgentDetails();
      }
    }
  );

  if (
    type === "MPESA" ||
    type === "AIRTEL"
  ) {
    renderReceiveAgentDetails();
  } else if (agent) {
    agent.innerHTML = "";
  }
}


function renderReceiveAgentDetails() {

  const container =
    document.getElementById(
      "receiveAgentDetails"
    );

  if (!container) return;

  container.innerHTML = `

    <div class="detail-card">

      <div class="field">
        <label>Agent Number</label>

        <input
          id="receiveAgentNumber"
          type="tel"
          inputmode="tel"
          placeholder="Agent Number"
        >
      </div>

      <div class="field">
        <label>Store Number</label>

        <input
          id="receiveStoreNumber"
          type="text"
          inputmode="numeric"
          placeholder="Store Number"
        >
      </div>

      <button
        id="receiveAgentDetailsVerify"
        class="secondary-btn"
      >
        VERIFY WITHDRAWAL DETAILS
      </button>

      <div
        id="receiveAgentVerification"
        class="verify-box hidden"
      ></div>

    </div>
  `;

  document.getElementById(
    "receiveAgentDetailsVerify"
  )?.addEventListener("click", () => {

    const agent =
      document.getElementById(
        "receiveAgentNumber"
      )?.value.trim();

    const store =
      document.getElementById(
        "receiveStoreNumber"
      )?.value.trim();

    if (!agent || !store) {
      toast("Enter Agent Number and Store Number.");
      return;
    }

    receiveWithdrawVerified = true;

    const result =
      document.getElementById(
        "receiveAgentVerification"
      );

    if (result) {

      result.classList.remove("hidden");

      result.innerHTML = `
        <strong>✓ Withdrawal details verified</strong>
        <span>Agent: ${agent}</span>
        <span>Store: ${store}</span>
      `;
    }

    toast("Agent and Store verified.");
  });
}


document.getElementById(
  "receiveWithdrawSource"
)?.addEventListener(
  "change",
  renderReceiveWithdrawSource
);


/* =========================================================
   RECEIVE WITHDRAW
   ========================================================= */

document.getElementById("receiveWithdrawBtn")
  ?.addEventListener("click", () => {

    const sourceType =
      document.getElementById(
        "receiveWithdrawSource"
      )?.value;

    const amount =
      Number(
        document.getElementById(
          "receiveWithdrawAmount"
        )?.value
      );

    if (!sourceType) {
      toast("Select a withdrawal source.");
      return;
    }

    if (!selectedReceiveWithdrawSource) {
      toast("Select the exact source.");
      return;
    }

    if (
      (sourceType === "MPESA" ||
       sourceType === "AIRTEL") &&
      !receiveWithdrawVerified
    ) {
      toast("Verify Agent Number and Store Number first.");
      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    if (amount > state.balance) {
      toast("Insufficient demo balance.");
      return;
    }

    requestAuthorization({
      type: "withdraw",
      title: "Receive Withdrawal",
      amount,
      fee: 0,
      source: selectedSource(
        sourceType,
        selectedReceiveWithdrawSource
      ),
      destination: "Agent withdrawal"
    });

  });


/* =========================================================
   GENERAL WITHDRAW
   ========================================================= */

function renderGeneralWithdrawSource() {

  const type =
    document.getElementById(
      "withdrawSource"
    )?.value;

  selectedWithdrawSource = null;
  generalWithdrawVerified = false;

  const container =
    document.getElementById(
      "withdrawSourcePicker"
    );

  const agent =
    document.getElementById(
      "withdrawAgentDetails"
    );

  if (!type) {

    if (container) container.innerHTML = "";
    if (agent) agent.innerHTML = "";

    return;
  }

  renderSourcePicker(
    "withdrawSourcePicker",
    type,
    null,
    id => {
      selectedWithdrawSource = id;
    }
  );

  if (
    type === "MPESA" ||
    type === "AIRTEL"
  ) {

    if (agent) {

      agent.innerHTML = `

        <div class="detail-card">

          <div class="field">
            <label>Agent Number</label>

            <input
              id="withdrawAgentNumber"
              type="tel"
              inputmode="tel"
              placeholder="Agent Number"
            >
          </div>

          <div class="field">
            <label>Store Number</label>

            <input
              id="withdrawStoreNumber"
              type="text"
              inputmode="numeric"
              placeholder="Store Number"
            >
          </div>

          <button
            id="withdrawAgentDetailsVerify"
            class="secondary-btn"
          >
            VERIFY WITHDRAWAL DETAILS
          </button>

          <div
            id="withdrawAgentVerification"
            class="verify-box hidden"
          ></div>

        </div>
      `;

      document.getElementById(
        "withdrawAgentDetailsVerify"
      )?.addEventListener("click", () => {

        const agentNumber =
          document.getElementById(
            "withdrawAgentNumber"
          )?.value.trim();

        const storeNumber =
          document.getElementById(
            "withdrawStoreNumber"
          )?.value.trim();

        if (!agentNumber || !storeNumber) {
          toast("Enter Agent Number and Store Number.");
          return;
        }

        generalWithdrawVerified = true;

        const result =
          document.getElementById(
            "withdrawAgentVerification"
          );

        if (result) {

          result.classList.remove("hidden");

          result.innerHTML = `
            <strong>✓ Withdrawal details verified</strong>
            <span>Agent: ${agentNumber}</span>
            <span>Store: ${storeNumber}</span>
          `;
        }

        toast("Agent and Store verified.");
      });
    }

  } else if (agent) {
    agent.innerHTML = "";
  }
}


document.getElementById("withdrawSource")
  ?.addEventListener(
    "change",
    renderGeneralWithdrawSource
  );


document.getElementById("withdrawBtn")
  ?.addEventListener("click", () => {

    const sourceType =
      document.getElementById(
        "withdrawSource"
      )?.value;

    const amount =
      Number(
        document.getElementById(
          "withdrawAmount"
        )?.value
      );

    if (!sourceType) {
      toast("Select a withdrawal source.");
      return;
    }

    if (!selectedWithdrawSource) {
      toast("Select the exact source.");
      return;
    }

    if (
      (sourceType === "MPESA" ||
       sourceType === "AIRTEL") &&
      !generalWithdrawVerified
    ) {
      toast("Verify Agent Number and Store Number first.");
      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    if (amount > state.balance) {
      toast("Insufficient demo balance.");
      return;
    }

    requestAuthorization({
      type: "withdraw",
      title: "Withdraw",
      amount,
      fee: 0,
      source: selectedSource(
        sourceType,
        selectedWithdrawSource
      ),
      destination: "Agent withdrawal"
    });

  });


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function requestAuthorization(transaction) {

  pendingTransaction = transaction;

  const modal =
    document.getElementById("authModal");

  const description =
    document.getElementById(
      "authDescription"
    );

  const pin =
    document.getElementById("authPin");

  if (description) {

    description.textContent =
      `${transaction.title}: ${money(
        transaction.amount
      )}. Enter your BEAST PIN to authorize.`;
  }

  if (pin) {
    pin.value = "";
  }

  modal?.classList.remove("hidden");
}


document.getElementById("authorizeBtn")
  ?.addEventListener("click", () => {

    if (!pendingTransaction) {
      toast("No pending transaction.");
      return;
    }

    const pin =
      document.getElementById(
        "authPin"
      )?.value.trim();

    if (!pin || pin !== state.beastPin) {
      toast("Incorrect BEAST PIN.");
      return;
    }

    completeTransaction(
      pendingTransaction
    );

    pendingTransaction = null;

    document.getElementById(
      "authModal"
    )?.classList.add("hidden");

  });


/* =========================================================
   TRANSACTION COMPLETION
   ========================================================= */

function completeTransaction(tx) {

  if (
    tx.type === "send" ||
    tx.type === "lipa" ||
    tx.type === "withdraw"
  ) {

    state.balance -=
      Number(tx.amount || 0) +
      Number(tx.fee || 0);

    addHistory({
      title: tx.title,
      amount: -Number(tx.amount || 0),
      fee: Number(tx.fee || 0),
      source: tx.source?.name || "BEAST",
      destination: tx.destination || ""
    });

  } else if (tx.type === "receive") {

    state.balance +=
      Number(tx.amount || 0);

    addHistory({
      title: tx.title,
      amount: Number(tx.amount || 0),
      fee: 0,
      source: "Buyer Payment",
      destination: tx.destination || ""
    });
  }

  save();
  updateBalance();

  showReceipt(tx);
  notifyTransaction(tx);
}


/* =========================================================
   TRANSACTION MOVEMENT NOTIFICATION
   Receive-specific notifications are kept here.
   ========================================================= */

function notifyTransaction(tx) {

  if (!state.settings.notifications) {
    return;
  }

  if (tx.type === "receive") {

    toast(
      `Receive movement: ${money(
        tx.amount
      )} received.`
    );

    return;
  }

  toast(
    `${tx.title} completed: ${money(
      tx.amount
    )}`
  );
}


/* =========================================================
   HISTORY
   ========================================================= */

function addHistory(item) {

  state.history.unshift({
    ...item,
    date: new Date().toISOString()
  });

  state.history =
    state.history.slice(0, 100);

  renderHistory();
}


function renderHistory() {

  const list =
    document.getElementById(
      "historyList"
    );

  if (!list) return;

  if (!state.history.length) {

    list.innerHTML = `
      <div class="empty-state">
        No transactions yet.
      </div>
    `;

    return;
  }

  list.innerHTML =
    state.history.map(item => {

      const positive =
        Number(item.amount) >= 0;

      const date =
        new Date(item.date)
          .toLocaleString("en-KE");

      return `

        <div class="history-item">

          <div>

            <strong>
              ${item.title}
            </strong>

            <small>
              ${date}
            </small>

            <small>
              ${item.source || ""}
            </small>

          </div>

          <div class="${
            positive
              ? "history-positive"
              : "history-negative"
          }">

            <strong>
              ${positive ? "+" : "-"}
              ${money(Math.abs(item.amount))}
            </strong>

            ${
              item.fee
                ? `<small>Fee ${money(item.fee)}</small>`
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

function showReceipt(tx) {

  const content =
    document.getElementById(
      "receiptContent"
    );

  if (!content) return;

  const source =
    tx.source?.name ||
    "BEAST";

  content.innerHTML = `

    <div class="receipt-row">
      <span>Transaction</span>
      <strong>${tx.title}</strong>
    </div>

    <div class="receipt-row">
      <span>Amount</span>
      <strong>${money(tx.amount)}</strong>
    </div>

    <div class="receipt-row">
      <span>Source</span>
      <strong>${source}</strong>
    </div>

    <div class="receipt-row">
      <span>Destination</span>
      <strong>${tx.destination || "—"}</strong>
    </div>

    <div class="receipt-row">
      <span>Fee</span>
      <strong>${money(tx.fee || 0)}</strong>
    </div>

  `;

  document.getElementById(
    "receiptModal"
  )?.classList.remove("hidden");
}


/* =========================================================
   MODALS
   ========================================================= */

document.addEventListener("click", event => {

  const close =
    event.target.closest(".modal-close");

  if (!close) return;

  const id =
    close.dataset.close;

  if (id) {
    document.getElementById(id)
      ?.classList.add("hidden");
  }
});


/* =========================================================
   MENU
   ========================================================= */

document.getElementById("menuBtn")
  ?.addEventListener(
    "click",
    openMenu
  );


document.getElementById("closeMenu")
  ?.addEventListener(
    "click",
    closeMenu
  );


document.getElementById("menuOverlay")
  ?.addEventListener(
    "click",
    closeMenu
  );


document.querySelectorAll(".menu-item[data-open]")
  .forEach(item => {

    item.addEventListener("click", () => {

      closeMenu();

      openPanel(
        item.dataset.open
      );
    });

  });


/* =========================================================
   QUICK SERVICE CARDS
   ========================================================= */

document.querySelectorAll(
  ".service-card[data-panel]"
).forEach(card => {

  card.addEventListener("click", () => {

    openPanel(
      card.dataset.panel
    );
  });

});


/* =========================================================
   BEAST ID COPY
   ========================================================= */

document.getElementById("copyBeastId")
  ?.addEventListener("click", async () => {

    const id =
      document.getElementById(
        "beastId"
      )?.textContent.trim();

    if (!id) return;

    try {

      await navigator.clipboard.writeText(id);

      toast("BEAST ID copied.");

    } catch {

      toast(id);
    }

  });


/* =========================================================
   SETTINGS
   ========================================================= */

function loadSettings() {

  const security =
    document.getElementById(
      "securityAlertsToggle"
    );

  const notifications =
    document.getElementById(
      "notificationsToggle"
    );

  const protection =
    document.getElementById(
      "screenProtectionToggle"
    );

  if (security) {
    security.checked =
      state.settings.securityAlerts;
  }

  if (notifications) {
    notifications.checked =
      state.settings.notifications;
  }

  if (protection) {
    protection.checked =
      state.settings.screenProtection;
  }
}


document.getElementById(
  "securityAlertsToggle"
)?.addEventListener(
  "change",
  event => {

    state.settings.securityAlerts =
      event.target.checked;

    save();
  }
);


document.getElementById(
  "notificationsToggle"
)?.addEventListener(
  "change",
  event => {

    state.settings.notifications =
      event.target.checked;

    save();
  }
);


document.getElementById(
  "screenProtectionToggle"
)?.addEventListener(
  "change",
  event => {

    state.settings.screenProtection =
      event.target.checked;

    save();
  }
);


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

  document.body.classList.toggle(
    "dark",
    state.dark
  );
}


document.getElementById("menuTheme")
  ?.addEventListener("click", () => {

    state.dark = !state.dark;

    applyTheme();
    save();

    closeMenu();
  });


/* =========================================================
   RECEIVE TERMINAL
   ========================================================= */

document.getElementById(
  "receiveDeviceVerify"
)?.addEventListener(
  "click",
  () => {

    toast(
      "Receive terminal verification completed in demo mode."
    );

  }
);


/* =========================================================
   SCREEN / VISIBILITY SECURITY
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden &&
      state.settings.screenProtection
    ) {

      toast(
        "Secure activity paused while the app is hidden."
      );
    }

  }
);


window.addEventListener(
  "blur",
  () => {

    if (state.settings.screenProtection) {

      toast(
        "Secure activity paused."
      );
    }

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

load();

applyTheme();

loadSettings();

renderHistory();

renderLipaForm();

renderReceiveSellForm();

renderSendSourcePicker();

if (
  document.getElementById(
    "receiveWithdrawSource"
  )?.value
) {
  renderReceiveWithdrawSource();
}

if (
  document.getElementById(
    "withdrawSource"
  )?.value
) {
  renderGeneralWithdrawSource();
}

updateBalance();

beginRegistration();