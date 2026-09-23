/* =========================================================
   MONEY TRANSFER BEAST
   Complete replacement app.js
   Registration + BEAST ID + Tariffs + Transactions
   DEMO PROTOTYPE ONLY
   ========================================================= */

const KEY = "mtb_beast_v3";
const REG_KEY = "mtb_beast_registration";
const DEMO_PIN = "1234";

/* =========================================================
   DEFAULT DATA
   ========================================================= */

const DEFAULT_SOURCES = {
  MPESA: [
    { id: "mpesa1", name: "M-PESA 0712345678", number: "0712345678", type: "M-PESA", role: "Primary", balance: 5000 },
    { id: "mpesa2", name: "M-PESA 0798765432", number: "0798765432", type: "M-PESA", role: "Secondary", balance: 2500 }
  ],

  AIRTEL: [
    { id: "airtel1", name: "Airtel Money 0734567890", number: "0734567890", type: "AIRTEL", role: "Primary", balance: 3000 },
    { id: "airtel2", name: "Airtel Money 0787654321", number: "0787654321", type: "AIRTEL", role: "Secondary", balance: 1500 }
  ],

  BANK: [
    { id: "bank1", name: "KCB •••• 4582", number: "4582", type: "BANK", role: "Primary", balance: 10000 },
    { id: "bank2", name: "Equity •••• 9134", number: "9134", type: "BANK", role: "Secondary", balance: 7500 },
    { id: "bank3", name: "Co-operative Bank •••• 2210", number: "2210", type: "BANK", role: "Secondary", balance: 5000 }
  ],

  CARD: [
    { id: "card1", name: "BEAST Visa •••• 4821", number: "4821", type: "CARD", role: "Primary", balance: 8000 },
    { id: "card2", name: "M-PESA Card •••• 7720", number: "7720", type: "CARD", role: "Secondary", balance: 3500 },
    { id: "card3", name: "Demo Mastercard •••• 1188", number: "1188", type: "CARD", role: "Secondary", balance: 2000 }
  ],

  WALLET: [
    { id: "wallet1", name: "BEAST Wallet Main", number: "BEAST", type: "WALLET", role: "Primary", balance: 5000 },
    { id: "wallet2", name: "M-PESA Wallet 0712345678", number: "0712345678", type: "WALLET", role: "Secondary", balance: 2000 },
    { id: "wallet3", name: "Airtel Money Wallet 0798765432", number: "0798765432", type: "WALLET", role: "Secondary", balance: 2000 }
  ]
};

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

  sources: JSON.parse(JSON.stringify(DEFAULT_SOURCES))
};


/* =========================================================
   REGISTRATION STATE
   ========================================================= */

let registration = {
  fullName: "",
  phone: "",
  nationalId: "",
  beastPin: "",
  beastId: ""
};


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function money(value) {
  const n = Number(value || 0);
  return "KES " + n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function numberValue(value) {
  return Number(String(value || "").replace(/,/g, "")) || 0;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
        sources: saved.sources || JSON.parse(JSON.stringify(DEFAULT_SOURCES))
      };
    }
  } catch (e) {
    console.warn("Could not load BEAST state", e);
  }
}

function loadRegistration() {
  try {
    const saved = JSON.parse(localStorage.getItem(REG_KEY));

    if (saved && typeof saved === "object") {
      registration = {
        ...registration,
        ...saved
      };
    }
  } catch (e) {
    console.warn("Could not load registration", e);
  }
}

function saveRegistration() {
  localStorage.setItem(REG_KEY, JSON.stringify(registration));
}

function toast(message) {
  let box = document.getElementById("beastToast");

  if (!box) {
    box = document.createElement("div");
    box.id = "beastToast";
    box.style.cssText = `
      position:fixed;
      left:50%;
      bottom:25px;
      transform:translateX(-50%);
      background:#111;
      color:#fff;
      padding:13px 18px;
      border-radius:12px;
      z-index:99999;
      font-size:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.3);
      max-width:90%;
      text-align:center;
    `;
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}


/* =========================================================
   BEAST ID
   ========================================================= */

function generateBeastId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return "BEAST-KE-" + random;
}


/* =========================================================
   REGISTRATION UI
   ========================================================= */

function showRegistrationStep(step) {
  document.querySelectorAll(".registration-step").forEach(el => {
    el.style.display = "none";
  });

  const target = document.getElementById("registrationStep" + step);

  if (target) {
    target.style.display = "block";
  }

  document.querySelectorAll(".progress-dot").forEach((dot, index) => {
    const number = index + 1;

    dot.classList.toggle("active", number === step);
    dot.classList.toggle("completed", number < step);
  });
}

function showRegistration() {
  const registrationScreen = document.getElementById("registrationScreen");
  const beastApp = document.getElementById("beastApp");

  if (registrationScreen) {
    registrationScreen.style.display = "block";
  }

  if (beastApp) {
    beastApp.style.display = "none";
  }

  showRegistrationStep(1);
}

function showApp() {
  const registrationScreen = document.getElementById("registrationScreen");
  const beastApp = document.getElementById("beastApp");

  if (registrationScreen) {
    registrationScreen.style.display = "none";
  }

  if (beastApp) {
    beastApp.style.display = "block";
  }

  updateDashboard();
}

function validateStep1() {
  const nameEl = document.getElementById("registrationName");
  const phoneEl = document.getElementById("registrationPhone");
  const idEl = document.getElementById("registrationId");

  const name = nameEl ? nameEl.value.trim() : "";
  const phone = phoneEl ? phoneEl.value.trim() : "";
  const nationalId = idEl ? idEl.value.trim() : "";

  if (name.length < 3) {
    toast("Enter your full name.");
    return false;
  }

  if (!/^0\d{9}$/.test(phone)) {
    toast("Enter a valid 10-digit Kenyan phone number.");
    return false;
  }

  if (!/^\d{5,12}$/.test(nationalId)) {
    toast("Enter a valid National ID number.");
    return false;
  }

  registration.fullName = name;
  registration.phone = phone;
  registration.nationalId = nationalId;

  const pinEl = document.getElementById("registrationPin");
  const pinConfirmEl = document.getElementById("registrationPinConfirm");

  if (pinEl && pinConfirmEl) {
    const pin = pinEl.value.trim();
    const confirm = pinConfirmEl.value.trim();

    if (pin || confirm) {
      if (!/^\d{4}$/.test(pin)) {
        toast("BEAST PIN must be 4 digits.");
        return false;
      }

      if (pin !== confirm) {
        toast("BEAST PINs do not match.");
        return false;
      }

      registration.beastPin = pin;
    }
  }

  return true;
}

function populateRegistrationSummary() {
  const name = document.getElementById("registrationSummaryName");
  const phone = document.getElementById("registrationSummaryPhone");
  const id = document.getElementById("registrationSummaryId");

  if (name) name.textContent = registration.fullName;
  if (phone) phone.textContent = registration.phone;
  if (id) id.textContent = registration.nationalId;

  if (!registration.beastId) {
    registration.beastId = generateBeastId();
  }

  const beastId = document.getElementById("registrationBeastId");

  if (beastId) {
    beastId.textContent = registration.beastId;
  }
}

function completeRegistration() {
  registration.beastId = registration.beastId || generateBeastId();

  if (!registration.beastPin) {
    registration.beastPin = DEMO_PIN;
  }

  saveRegistration();

  localStorage.setItem("mtb_beast_registered", "true");

  const dashboardName = document.getElementById("dashboardName");

  if (dashboardName) {
    dashboardName.textContent = registration.fullName;
  }

  toast("BEAST account created successfully.");

  setTimeout(() => {
    showApp();
  }, 500);
}


/* =========================================================
   REGISTRATION EVENTS
   ========================================================= */

function setupRegistration() {
  const next1 = document.getElementById("registrationNext1");

  if (next1) {
    next1.onclick = function(e) {
      e.preventDefault();

      if (!validateStep1()) return;

      populateRegistrationSummary();
      showRegistrationStep(2);
    };
  }

  const back1 = document.getElementById("registrationBack1");

  if (back1) {
    back1.onclick = function(e) {
      e.preventDefault();
      showRegistrationStep(1);
    };
  }

  const next2 = document.getElementById("registrationNext2");

  if (next2) {
    next2.onclick = function(e) {
      e.preventDefault();

      populateRegistrationSummary();
      showRegistrationStep(3);
    };
  }

  const finish = document.getElementById("registrationFinish");

  if (finish) {
    finish.onclick = function(e) {
      e.preventDefault();
      completeRegistration();
    };
  }

  const terms = document.getElementById("registrationTerms");
  const robot = document.getElementById("registrationRobot");

  if (finish) {
    finish.addEventListener("click", function(e) {
      if (terms && !terms.checked) {
        e.preventDefault();
        toast("Please accept the BEAST Rules & Terms.");
        return;
      }

      if (robot && !robot.checked) {
        e.preventDefault();
        toast("Please confirm that you are not a robot.");
        return;
      }
    }, true);
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {
  const dashboardName = document.getElementById("dashboardName");

  if (dashboardName) {
    dashboardName.textContent =
      registration.fullName || "BEAST USER";
  }

  const balanceEls = document.querySelectorAll(
    "#balance, .balance-value, [data-beast-balance]"
  );

  balanceEls.forEach(el => {
    el.textContent = money(state.balance);
  });

  const beastIdEls = document.querySelectorAll(
    "#beastId, [data-beast-id]"
  );

  beastIdEls.forEach(el => {
    el.textContent = registration.beastId || "BEAST-KE-DEMO";
  });
}

function updateBalance(amount) {
  state.balance = Number(amount) || 0;
  save();
  updateDashboard();
}


/* =========================================================
   M-PESA TARIFF
   Official tariff values previously configured for prototype
   ========================================================= */

const MPESA_SEND_TARIFF = [
  [1, 100, 0],
  [101, 500, 7],
  [501, 1000, 13],
  [1001, 1500, 23],
  [1501, 2500, 33],
  [2501, 3500, 53],
  [3501, 5000, 57],
  [5001, 7500, 78],
  [7501, 10000, 90],
  [10001, 15000, 100],
  [15001, 20000, 105],
  [20001, 250000, 108]
];


/* =========================================================
   AIRTEL TARIFF TABLE
   Configured prototype bands
   ========================================================= */

const AIRTEL_OTHER_NETWORK_SEND_TARIFF = [
  [1, 100, 0],
  [101, 500, 6],
  [501, 1000, 11],
  [1001, 1500, 20],
  [1501, 2500, 30],
  [2501, 3500, 50],
  [3501, 5000, 50],
  [5001, 7500, 70],
  [7501, 10000, 80],
  [10001, 15000, 90],
  [15001, 25000, 95],
  [25001, 35000, 100],
  [35001, 250000, 105]
];

const AIRTEL_BANK_WALLET_TARIFF = [
  [0, 9, 0, 0],
  [10, 49, 0, 0],
  [50, 100, 0, 0],
  [101, 500, 4, 4],
  [501, 1000, 4, 9],
  [1001, 1500, 4, 12],
  [1501, 2500, 6, 13],
  [2501, 3500, 6, 20],
  [3501, 5000, 7, 20],
  [5001, 7500, 8, 33],
  [7501, 10000, 8, 37],
  [10001, 15000, 8, 57],
  [15001, 20000, 9, 62],
  [20001, 25000, 9, 67],
  [25001, 30000, 10, 72],
  [30001, 35000, 10, 83]
];


/* =========================================================
   TARIFF CALCULATOR
   ========================================================= */

function findBand(table, amount) {
  const value = numberValue(amount);

  for (const band of table) {
    if (value >= band[0] && value <= band[1]) {
      return band;
    }
  }

  return null;
}

function calculateTariff(amount, provider, operation, destinationProvider) {
  const value = numberValue(amount);

  if (value <= 0) {
    return {
      fee: 0,
      label: "No amount entered"
    };
  }

  provider = String(provider || "").toUpperCase();
  operation = String(operation || "send").toLowerCase();
  destinationProvider =
    String(destinationProvider || "").toUpperCase();

  /* M-PESA SEND */
  if (provider === "MPESA" && operation === "send") {
    const band = findBand(MPESA_SEND_TARIFF, value);

    if (!band) {
      return {
        fee: null,
        label: "Above configured M-PESA limit"
      };
    }

    return {
      fee: band[2],
      label: "M-PESA send tariff"
    };
  }

  /* AIRTEL TO AIRTEL */
  if (
    provider === "AIRTEL" &&
    operation === "send" &&
    destinationProvider === "AIRTEL"
  ) {
    return {
      fee: 0,
      label: "Airtel → Airtel"
    };
  }

  /* AIRTEL TO OTHER NETWORK */
  if (provider === "AIRTEL" && operation === "send") {
    const band = findBand(
      AIRTEL_OTHER_NETWORK_SEND_TARIFF,
      value
    );

    if (!band) {
      return {
        fee: null,
        label: "Above configured Airtel limit"
      };
    }

    return {
      fee: band[2],
      label: "Airtel other-network tariff"
    };
  }

  /* AIRTEL BANK/WALLET */
  if (
    provider === "AIRTEL" &&
    (
      operation === "banktowallet" ||
      operation === "wallettobank"
    )
  ) {
    const band = findBand(
      AIRTEL_BANK_WALLET_TARIFF,
      value
    );

    if (!band) {
      return {
        fee: null,
        label: "Above configured Airtel bank/wallet limit"
      };
    }

    return {
      fee:
        operation === "banktowallet"
          ? band[2]
          : band[3],
      label:
        operation === "banktowallet"
          ? "Airtel bank → wallet"
          : "Airtel wallet → bank"
    };
  }

  /* BEAST DEMO INTERNAL TRANSFER */
  return {
    fee: 0,
    label: "BEAST demo transfer"
  };
}


/* Backwards-compatible M-PESA fee helper */

function feeFor(amount) {
  const result = calculateTariff(
    amount,
    "MPESA",
    "send"
  );

  return result.fee === null ? 0 : result.fee;
}


/* =========================================================
   TARIFF PREVIEW
   ========================================================= */

function renderTariffPreview() {
  const amountEl = document.getElementById("sendAmount");
  const sourceEl = document.getElementById("sendSource");
  const previewEl = document.getElementById("sendTariffPreview");

  if (!amountEl || !previewEl) return;

  const amount = numberValue(amountEl.value);

  if (!amount) {
    previewEl.textContent = "";
    return;
  }

  let provider = "MPESA";

  if (sourceEl) {
    const value = String(sourceEl.value || "").toUpperCase();

    if (value.includes("AIRTEL")) {
      provider = "AIRTEL";
    } else if (value.includes("BANK")) {
      provider = "BANK";
    } else if (value.includes("CARD")) {
      provider = "CARD";
    } else if (value.includes("WALLET")) {
      provider = "WALLET";
    }
  }

  const result = calculateTariff(
    amount,
    provider,
    "send"
  );

  if (result.fee === null) {
    previewEl.textContent =
      result.label;
    return;
  }

  const total = amount + result.fee;

  previewEl.textContent =
    `Fee: ${money(result.fee)} • Total: ${money(total)} • ${result.label}`;
}


/* =========================================================
   SOURCE PICKER
   ========================================================= */

function getSourceGroup(sourceValue) {
  const value = String(sourceValue || "").toUpperCase();

  if (value.includes("AIRTEL")) return "AIRTEL";
  if (value.includes("BANK")) return "BANK";
  if (value.includes("CARD")) return "CARD";
  if (value.includes("WALLET")) return "WALLET";

  return "MPESA";
}

function getSourceList(sourceValue) {
  return state.sources[getSourceGroup(sourceValue)] || [];
}

function renderSourcePicker(targetId, sourceType) {
  const target = document.getElementById(targetId);

  if (!target) return;

  const group = getSourceGroup(sourceType);
  const list = state.sources[group] || [];

  target.innerHTML = list.map(source => `
    <option value="${escapeHTML(source.id)}">
      ${escapeHTML(source.name)} — ${money(source.balance)}
    </option>
  `).join("");
}


/* =========================================================
   AUTHORIZATION MODAL
   ========================================================= */

function requestAuthorization(details, callback) {
  const existing = document.getElementById("beastAuthModal");

  if (existing) existing.remove();

  const modal = document.createElement("div");

  modal.id = "beastAuthModal";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.72);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:99990;
    padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      width:min(430px,100%);
      background:#fff;
      color:#111;
      border-radius:20px;
      padding:22px;
      box-shadow:0 20px 70px rgba(0,0,0,.4);
    ">
      <h2 style="margin-top:0;">Authorize Transaction</h2>

      <div style="
        background:#f4f4f4;
        padding:14px;
        border-radius:12px;
        margin:14px 0;
      ">
        ${escapeHTML(details)}
      </div>

      <label style="display:block;margin-bottom:7px;">
        BEAST PIN
      </label>

      <input
        id="beastAuthPin"
        type="password"
        inputmode="numeric"
        maxlength="4"
        placeholder="Enter 4-digit PIN"
        style="
          width:100%;
          box-sizing:border-box;
          padding:13px;
          border:1px solid #ccc;
          border-radius:10px;
          margin-bottom:12px;
        "
      >

      <div style="display:flex;gap:10px;">
        <button id="beastAuthCancel"
          style="flex:1;padding:13px;border:0;border-radius:10px;">
          CANCEL
        </button>

        <button id="beastAuthConfirm"
          style="flex:1;padding:13px;border:0;border-radius:10px;background:#111;color:#fff;">
          AUTHORIZE
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("beastAuthCancel").onclick = () => {
    modal.remove();
  };

  document.getElementById("beastAuthConfirm").onclick = () => {
    const entered =
      document.getElementById("beastAuthPin").value.trim();

    const correctPin =
      registration.beastPin || DEMO_PIN;

    if (entered !== correctPin) {
      toast("Incorrect BEAST PIN.");
      return;
    }

    modal.remove();

    if (typeof callback === "function") {
      callback();
    }
  };
}


/* =========================================================
   RECIPIENT VERIFICATION
   ========================================================= */

function demoRecipientName(number) {
  const cleaned = String(number || "")
    .replace(/\D/g, "");

  const names = {
    "0712345678": "KRISH TEST USER",
    "0798765432": "BEAST DEMO ACCOUNT",
    "0734567890": "AIRTEL TEST USER",
    "0787654321": "BEAST SECONDARY USER"
  };

  return names[cleaned] || "Verified BEAST Recipient";
}

function verifyRecipient(number, outputId) {
  const name = demoRecipientName(number);

  const output = document.getElementById(outputId);

  if (output) {
    output.textContent =
      "Recipient: " + name;
    output.style.display = "block";
  }

  return name;
}


/* =========================================================
   SEND MONEY
   ========================================================= */

function setupSend() {
  const amountEl = document.getElementById("sendAmount");
  const sourceEl = document.getElementById("sendSource");

  if (amountEl) {
    amountEl.addEventListener(
      "input",
      renderTariffPreview
    );
  }

  if (sourceEl) {
    sourceEl.addEventListener(
      "change",
      renderTariffPreview
    );
  }

  const verifyButton =
    document.getElementById("verifyRecipient") ||
    document.getElementById("sendVerify");

  if (verifyButton) {
    verifyButton.onclick = function(e) {
      e.preventDefault();

      const numberEl =
        document.getElementById("sendRecipient") ||
        document.getElementById("recipientNumber") ||
        document.getElementById("sendPhone");

      if (!numberEl || !numberEl.value.trim()) {
        toast("Enter the recipient phone number.");
        return;
      }

      verifyRecipient(
        numberEl.value.trim(),
        "recipientVerified"
      );
    };
  }

  const sendButton =
    document.getElementById("sendMoney") ||
    document.getElementById("confirmSend") ||
    document.getElementById("sendSubmit");

  if (sendButton) {
    sendButton.onclick = function(e) {
      e.preventDefault();

      const numberEl =
        document.getElementById("sendRecipient") ||
        document.getElementById("recipientNumber") ||
        document.getElementById("sendPhone");

      const amountEl =
        document.getElementById("sendAmount");

      const sourceEl =
        document.getElementById("sendSource");

      const number =
        numberEl ? numberEl.value.trim() : "";

      const amount =
        amountEl ? numberValue(amountEl.value) : 0;

      const source =
        sourceEl ? sourceEl.value : "M-PESA";

      if (!number) {
        toast("Enter the recipient number.");
        return;
      }

      if (amount <= 0) {
        toast("Enter a valid amount.");
        return;
      }

      const provider = getSourceGroup(source);

      let destinationProvider = "";

      if (/^07\d{8}$/.test(number)) {
        destinationProvider =
          number.startsWith("07")
            ? "MPESA"
            : "";
      }

      const tariff = calculateTariff(
        amount,
        provider,
        "send",
        destinationProvider
      );

      if (tariff.fee === null) {
        toast(tariff.label);
        return;
      }

      const fee = tariff.fee;
      const total = amount + fee;

      if (total > state.balance) {
        toast("Insufficient BEAST demo balance.");
        return;
      }

      const recipientName =
        demoRecipientName(number);

      requestAuthorization(
        `Send ${money(amount)} to ${recipientName}<br>
         Fee: ${money(fee)}<br>
         Total: ${money(total)}<br>
         ${escapeHTML(tariff.label)}`,
        function() {
          completeSend({
            number,
            recipientName,
            amount,
            fee,
            total,
            source,
            tariff: tariff.label
          });
        }
      );
    };
  }
}

function completeSend(data) {
  state.balance -= data.total;

  state.history.unshift({
    id: Date.now(),
    type: "SEND",
    status: "COMPLETED",
    amount: data.amount,
    fee: data.fee,
    total: data.total,
    recipient: data.recipientName,
    number: data.number,
    source: data.source,
    tariff: data.tariff,
    date: new Date().toLocaleString()
  });

  save();
  updateDashboard();

  toast(
    `Payment sent successfully. ${money(data.total)}`
  );

  renderHistory();
}


/* =========================================================
   RECEIVE / SELL
   ========================================================= */

function setupReceiveSell() {
  const button =
    document.getElementById("receiveSellSubmit") ||
    document.getElementById("sellSubmit");

  if (!button) return;

  button.onclick = function(e) {
    e.preventDefault();

    const typeEl =
      document.getElementById("receiveSellType") ||
      document.getElementById("sellType");

    const valueEl =
      document.getElementById("receiveSellValue") ||
      document.getElementById("sellValue");

    const amountEl =
      document.getElementById("receiveSellAmount") ||
      document.getElementById("sellAmount");

    const type =
      typeEl ? typeEl.value : "paybill";

    const value =
      valueEl ? valueEl.value.trim() : "";

    const amount =
      amountEl ? numberValue(amountEl.value) : 0;

    if (!value) {
      toast("Enter the payment details.");
      return;
    }

    if (amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    requestAuthorization(
      `Receive payment<br>
       Type: ${escapeHTML(type)}<br>
       Reference: ${escapeHTML(value)}<br>
       Amount: ${money(amount)}`,
      function() {
        state.balance += amount;

        state.history.unshift({
          id: Date.now(),
          type: "RECEIVE",
          status: "COMPLETED",
          amount,
          fee: 0,
          total: amount,
          reference: value,
          method: type,
          date: new Date().toLocaleString()
        });

        save();
        updateDashboard();
        renderHistory();

        toast(
          `Payment received: ${money(amount)}`
        );
      }
    );
  };
}


/* =========================================================
   WITHDRAW
   ========================================================= */

function setupWithdraw() {
  const button =
    document.getElementById("withdrawSubmit") ||
    document.getElementById("confirmWithdraw") ||
    document.getElementById("withdrawMoney");

  if (!button) return;

  button.onclick = function(e) {
    e.preventDefault();

    const amountEl =
      document.getElementById("withdrawAmount");

    const agentEl =
      document.getElementById("agentNumber");

    const storeEl =
      document.getElementById("storeNumber");

    const sourceEl =
      document.getElementById("withdrawSource");

    const amount =
      amountEl ? numberValue(amountEl.value) : 0;

    const agent =
      agentEl ? agentEl.value.trim() : "";

    const store =
      storeEl ? storeEl.value.trim() : "";

    const source =
      sourceEl ? sourceEl.value : "M-PESA";

    if (amount <= 0) {
      toast("Enter a valid withdrawal amount.");
      return;
    }

    if (
      (
        source.toUpperCase().includes("MPESA") ||
        source.toUpperCase().includes("AIRTEL")
      ) &&
      !agent
    ) {
      toast("Enter the agent number.");
      return;
    }

    if (
      (
        source.toUpperCase().includes("MPESA") ||
        source.toUpperCase().includes("AIRTEL")
      ) &&
      !store
    ) {
      toast("Enter the store number.");
      return;
    }

    if (amount > state.balance) {
      toast("Insufficient BEAST demo balance.");
      return;
    }

    const fee = 0;
    const total = amount + fee;

    requestAuthorization(
      `Withdraw ${money(amount)}<br>
       Source: ${escapeHTML(source)}<br>
       Agent: ${escapeHTML(agent || "N/A")}<br>
       Store: ${escapeHTML(store || "N/A")}<br>
       Withdrawal fee: ${money(fee)}`,
      function() {
        state.balance -= total;

        state.history.unshift({
          id: Date.now(),
          type: "WITHDRAW",
          status: "COMPLETED",
          amount,
          fee,
          total,
          source,
          agent,
          store,
          tariff: "Demo withdrawal fee",
          date: new Date().toLocaleString()
        });

        save();
        updateDashboard();
        renderHistory();

        toast(
          `Withdrawal completed: ${money(amount)}`
        );
      }
    );
  };
}


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {
  const containers = document.querySelectorAll(
    "#historyList, .history-list, [data-beast-history]"
  );

  containers.forEach(container => {
    if (!state.history.length) {
      container.innerHTML =
        `<div class="empty-state">No transactions yet.</div>`;
      return;
    }

    container.innerHTML = state.history
      .slice(0, 50)
      .map(item => `
        <div class="history-item">
          <div>
            <strong>
              ${escapeHTML(item.type)}
            </strong>

            <div>
              ${escapeHTML(
                item.recipient ||
                item.reference ||
                item.source ||
                ""
              )}
            </div>

            <small>
              ${escapeHTML(item.date || "")}
            </small>
          </div>

          <div>
            <strong>
              ${money(item.amount)}
            </strong>

            <small>
              ${escapeHTML(item.status || "")}
            </small>
          </div>
        </div>
      `)
      .join("");
  });
}


/* =========================================================
   SETTINGS / DARK MODE
   ========================================================= */

function setupSettings() {
  const darkButton =
    document.getElementById("darkMode") ||
    document.getElementById("darkModeToggle");

  if (darkButton) {
    darkButton.onclick = function() {
      state.dark = !state.dark;

      document.body.classList.toggle(
        "dark-mode",
        state.dark
      );

      save();
    };
  }

  document.body.classList.toggle(
    "dark-mode",
    !!state.dark
  );
}


/* =========================================================
   COPY BEAST ID
   ========================================================= */

function setupCopyBeastId() {
  const buttons =
    document.querySelectorAll(
      "#copyBeastId, [data-copy-beast-id]"
    );

  buttons.forEach(button => {
    button.onclick = async function(e) {
      e.preventDefault();

      const id =
        registration.beastId || "BEAST-KE-DEMO";

      try {
        await navigator.clipboard.writeText(id);
        toast("BEAST ID copied.");
      } catch {
        toast(id);
      }
    };
  });
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {
  const buttons =
    document.querySelectorAll(
      "#logout, [data-beast-logout]"
    );

  buttons.forEach(button => {
    button.onclick = function(e) {
      e.preventDefault();

      sessionStorage.removeItem("beast_logged_in");

      toast("Logged out.");

      setTimeout(() => {
        showRegistration();
      }, 400);
    };
  });
}


/* =========================================================
   SECURITY / VISIBILITY PROTECTION
   ========================================================= */

function setupVisibilityProtection() {
  document.addEventListener(
    "visibilitychange",
    function() {
      if (!state.settings.screenProtection) return;

      if (document.hidden) {
        document.body.classList.add(
          "beast-screen-hidden"
        );
      } else {
        document.body.classList.remove(
          "beast-screen-hidden"
        );
      }
    }
  );

  window.addEventListener(
    "blur",
    function() {
      if (!state.settings.screenProtection) return;

      document.body.classList.add(
        "beast-screen-hidden"
      );
    }
  );

  window.addEventListener(
    "focus",
    function() {
      document.body.classList.remove(
        "beast-screen-hidden"
      );
    }
  );
}


/* =========================================================
   MENU / PANELS
   ========================================================= */

function setupMenus() {
  document.querySelectorAll(
    "[data-panel], [data-open-panel]"
  ).forEach(button => {
    button.addEventListener("click", function(e) {
      e.preventDefault();

      const target =
        button.dataset.panel ||
        button.dataset.openPanel;

      const panel =
        document.getElementById(target);

      if (panel) {
        panel.classList.toggle("open");
      }
    });
  });

  document.querySelectorAll(
    "[data-close-panel]"
  ).forEach(button => {
    button.addEventListener("click", function(e) {
      e.preventDefault();

      const target =
        button.dataset.closePanel;

      const panel =
        document.getElementById(target);

      if (panel) {
        panel.classList.remove("open");
      }
    });
  });
}


/* =========================================================
   TARIFF GLOBAL API
   ========================================================= */

window.BEAST_TARIFF = {
  mpesa: MPESA_SEND_TARIFF,
  airtelOtherNetwork:
    AIRTEL_OTHER_NETWORK_SEND_TARIFF,
  airtelBankWallet:
    AIRTEL_BANK_WALLET_TARIFF,

  calculate: calculateTariff,
  feeFor
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

function init() {
  load();
  loadRegistration();

  setupRegistration();
  setupSend();
  setupReceiveSell();
  setupWithdraw();
  setupSettings();
  setupCopyBeastId();
  setupLogout();
  setupVisibilityProtection();
  setupMenus();

  renderHistory();
  renderTariffPreview();
  updateDashboard();

  const registered =
    localStorage.getItem("mtb_beast_registered") === "true" ||
    !!registration.beastId;

  if (registered) {
    showApp();
  } else {
    showRegistration();
  }
}


/* =========================================================
   START APP
   ========================================================= */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init
  );
} else {
  init();
}