/* =========================================================
   MONEY TRANSFER BEAST — DEMO APP ENGINE
   ========================================================= */

const KEY = "mtb_test_v2";
const DEMO_PIN = "1234";
const BUYER_PASSWORD = "beast123";

const DEFAULT_SOURCES = {
  mpesa: [
    {
      id: "mpesa-1",
      name: "M-PESA",
      detail: "0712345678 • Primary"
    }
  ],

  banks: [
    {
      id: "bank-1",
      name: "KCB Bank",
      detail: "Account •••• 4582"
    },
    {
      id: "bank-2",
      name: "Equity Bank",
      detail: "Account •••• 9134"
    },
    {
      id: "bank-3",
      name: "Co-operative Bank",
      detail: "Account •••• 2210"
    }
  ],

  wallets: [
    {
      id: "wallet-1",
      name: "BEAST Wallet",
      detail: "Wallet • Available balance"
    },
    {
      id: "wallet-2",
      name: "M-PESA Wallet",
      detail: "0712345678"
    },
    {
      id: "wallet-3",
      name: "Airtel Money Wallet",
      detail: "0798765432"
    }
  ],

  cards: [
    {
      id: "card-1",
      name: "BEAST Visa",
      detail: "Card •••• 4821"
    },
    {
      id: "card-2",
      name: "M-PESA Card",
      detail: "Card •••• 7720"
    },
    {
      id: "card-3",
      name: "Demo Mastercard",
      detail: "Card •••• 1188"
    }
  ]
};


const DEFAULT_STATE = {
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


let storedState = null;

try {
  storedState = JSON.parse(localStorage.getItem(KEY) || "null");
} catch {
  storedState = null;
}


let state = {
  ...DEFAULT_STATE,
  ...(storedState || {})
};

state.settings = {
  ...DEFAULT_STATE.settings,
  ...(storedState?.settings || {})
};

state.sources = {
  ...DEFAULT_SOURCES,
  ...(storedState?.sources || {})
};


let pending = null;
let receiveSession = false;
let receiveDeviceVerified = false;
let receiveSecurityShown = false;
let cameraStream = null;

const $ = id => document.getElementById(id);


/* =========================================================
   HELPERS
   ========================================================= */

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}


function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}


function toast(message) {
  const t = $("toast");

  if (!t) return;

  t.textContent = message;
  t.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    t.classList.remove("show");
  }, 2800);
}


function validPhone(value) {
  return /^(07|01)\d{8}$/.test(
    String(value).replace(/\s/g, "")
  );
}


function validAmount(value) {
  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= state.balance
  );
}


function validStore(value) {
  return /^\d{4,10}$/.test(String(value).trim());
}


function validBusiness(value) {
  return /^\d{5,10}$/.test(String(value).trim());
}


function timeNow() {
  const d = new Date();

  return {
    date: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),

    time: d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  };
}


function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}


function fee(amount) {
  const value = Number(amount);

  if (value < 1000) return 7;
  if (value <= 10000) return 30;

  return 50;
}


function updateBalance() {
  if ($("balance")) {
    $("balance").textContent = money(state.balance);
  }

  if ($("historyBalance")) {
    $("historyBalance").textContent = money(state.balance);
  }

  if ($("historyCount")) {
    $("historyCount").textContent = state.history.length;
  }
}


/* =========================================================
   PANELS
   ========================================================= */

function showPanel(id) {
  document
    .querySelectorAll(".panel")
    .forEach(panel => panel.classList.add("hidden"));

  const panel = $(id);

  if (!panel) return;

  panel.classList.remove("hidden");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


document
  .querySelectorAll(".quick-btn")
  .forEach(button => {
    button.onclick = () => {
      showPanel(button.dataset.panel);
    };
  });


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {
  document.body.classList.toggle("dark", state.dark);

  if ($("themeBtn")) {
    $("themeBtn").textContent =
      state.dark ? "🌙" : "☀️";
  }
}


$("themeBtn").onclick = () => {
  state.dark = !state.dark;

  applyTheme();
  save();
};


if ($("settingsThemeBtn")) {
  $("settingsThemeBtn").onclick = () => {
    state.dark = !state.dark;

    applyTheme();
    save();

    toast(
      state.dark
        ? "Dark mode enabled."
        : "Light mode enabled."
    );
  };
}


/* =========================================================
   COPY BEAST ID
   ========================================================= */

$("copyBeastBtn").onclick = async () => {

  const id = $("beastId").textContent;

  try {
    await navigator.clipboard.writeText(id);
    toast("BEAST ID copied.");
  } catch {
    toast(id);
  }
};


/* =========================================================
   SOURCE PICKER
   ========================================================= */

function sourceTypeKey(source) {

  if (source === "Bank Account") {
    return "banks";
  }

  if (source === "BEAST Wallet") {
    return "wallets";
  }

  if (source === "BEAST Card") {
    return "cards";
  }

  return "mpesa";
}


function renderSourcePicker(
  containerId,
  source,
  pickerKey,
  defaultSelected = true
) {

  const container = $(containerId);

  if (!container) return;

  const key = sourceTypeKey(source);
  const items = state.sources[key] || [];

  if (!items.length) {
    container.innerHTML =
      `<div class="empty-state">No linked sources available.</div>`;

    container.classList.remove("hidden");

    return;
  }


  container.innerHTML = items.map(
    (item, index) => {

      const selected =
        defaultSelected && index === 0
          ? "selected"
          : "";

      const checked =
        defaultSelected && index === 0
          ? "checked"
          : "";

      return `
        <label class="source-option ${selected}">
          <input
            type="radio"
            name="${pickerKey}"
            value="${esc(item.id)}"
            ${checked}
          >

          <span class="source-option-content">
            <strong>${esc(item.name)}</strong>
            <small>${esc(item.detail)}</small>
          </span>
        </label>
      `;
    }
  ).join("");


  container.classList.remove("hidden");


  container
    .querySelectorAll(".source-option")
    .forEach(option => {

      const radio = option.querySelector("input");

      radio.onchange = () => {

        container
          .querySelectorAll(".source-option")
          .forEach(x =>
            x.classList.remove("selected")
          );

        option.classList.add("selected");
      };
    });
}


function hidePicker(id) {
  const element = $(id);

  if (element) {
    element.classList.add("hidden");
    element.innerHTML = "";
  }
}


function getSelectedSource(
  selectId,
  pickerId,
  pickerKey
) {

  const source = $(selectId)?.value || "M-PESA";

  const picker = $(pickerId);

  if (!picker || picker.classList.contains("hidden")) {
    return source;
  }

  const selected =
    picker.querySelector(
      `input[name="${pickerKey}"]:checked`
    );

  if (!selected) {
    return source;
  }

  const key = sourceTypeKey(source);

  const item =
    (state.sources[key] || [])
      .find(x => x.id === selected.value);

  if (!item) {
    return source;
  }

  return `${source} • ${item.name} • ${item.detail}`;
}


function connectSourceSelector(
  selectId,
  pickerId,
  pickerKey
) {

  const select = $(selectId);

  if (!select) return;

  const refresh = () => {

    const source = select.value;

    renderSourcePicker(
      pickerId,
      source,
      pickerKey
    );
  };

  select.onchange = refresh;

  refresh();
}


/* =========================================================
   SEND MONEY
   ========================================================= */

let sendVerified = false;


$("verifySendBtn").onclick = () => {

  const phone = $("sendPhone").value.trim();

  if (!validPhone(phone)) {

    sendVerified = false;

    $("sendRecipientBox")
      .classList.add("hidden");

    $("sendBtn").disabled = true;

    return toast(
      "Enter a valid Kenyan phone number."
    );
  }


  sendVerified = true;

  $("sendRecipientName").textContent =
    "JANE WANJIKU KAMAU";

  $("sendRecipientId").textContent =
    `${phone} • VERIFIED`;

  $("sendRecipientBox")
    .classList.remove("hidden");

  checkSend();

  toast("Recipient verified.");
};


function checkSend() {

  $("sendBtn").disabled = !(
    sendVerified &&
    validAmount($("sendAmount").value)
  );
}


$("sendAmount").oninput = checkSend;


$("sendBtn").onclick = () => {

  const amount =
    Number($("sendAmount").value);

  if (!validAmount(amount)) {
    return toast(
      "Invalid amount or balance."
    );
  }

  openAuth({
    type: "SEND MONEY",
    title: "Send Money",
    recipient: "JANE WANJIKU KAMAU",
    destination: $("sendPhone").value,
    amount,
    source: getSelectedSource(
      "sendSource",
      "sendSourcePicker",
      "sendSourceOptions"
    )
  });
};


connectSourceSelector(
  "sendSource",
  "sendSourcePicker",
  "sendSourceOptions"
);


/* =========================================================
   LIPA NA TABS
   ========================================================= */

document
  .querySelectorAll(".mode-tab")
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(".mode-tab")
        .forEach(x =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      document
        .querySelectorAll(".lipa-mode")
        .forEach(x =>
          x.classList.add("hidden")
        );

      const target =
        $(button.dataset.lipaMode + "Mode");

      if (target) {
        target.classList.remove("hidden");
      }
    };
  });


/* =========================================================
   BUSINESS PAYMENT ENGINE
   ========================================================= */

function setupBusinessPayment(config) {

  let verified = false;

  $(config.verifyId).onclick = () => {

    if (!config.validator()) {

      verified = false;

      $(config.boxId)
        .classList.add("hidden");

      $(config.buttonId).disabled = true;

      return toast(
        "Enter valid business details."
      );
    }


    verified = true;

    $(config.nameId).textContent =
      config.name();

    $(config.destinationId).textContent =
      config.destination();

    $(config.boxId)
      .classList.remove("hidden");

    check();

    toast("Business destination verified.");
  };


  function check() {

    const amount =
      Number($(config.amountId).value);

    const pin =
      config.pinId
        ? $(config.pinId).value
        : "1234";

    $(config.buttonId).disabled = !(
      verified &&
      amount > 0 &&
      amount <= state.balance &&
      pin.length === 4
    );
  }


  $(config.amountId).oninput = check;

  if (config.pinId) {
    $(config.pinId).oninput = check;
  }


  $(config.buttonId).onclick = () => {

    const amount =
      Number($(config.amountId).value);

    if (!validAmount(amount)) {
      return toast(
        "Invalid amount or balance."
      );
    }


    openAuth({
      type: config.type,
      title: config.title,
      recipient: config.name(),
      destination: config.destination(),
      amount,
      source: getSelectedSource(
        config.sourceId,
        config.pickerId,
        config.pickerKey
      )
    });
  };


  connectSourceSelector(
    config.sourceId,
    config.pickerId,
    config.pickerKey
  );
}


setupBusinessPayment({
  verifyId: "verifyPochiBtn",
  boxId: "pochiVerifyBox",
  nameId: "pochiName",
  destinationId: "pochiId",
  buttonId: "pochiBtn",
  amountId: "pochiAmount",
  pinId: "pochiPin",
  sourceId: "pochiSource",
  pickerId: "pochiSourcePicker",
  pickerKey: "pochiSourceOptions",
  type: "POCHI PAYMENT",
  title: "Pochi Payment",

  validator: () =>
    validPhone($("pochiPhone").value),

  name: () =>
    "BEAST BUSINESS • MAMA SHOP",

  destination: () =>
    $("pochiPhone").value
});


setupBusinessPayment({
  verifyId: "verifyTillBtn",
  boxId: "tillVerifyBox",
  nameId: "tillName",
  destinationId: "tillId",
  buttonId: "tillBtn",
  amountId: "tillAmount",
  pinId: "tillPin",
  sourceId: "tillSource",
  pickerId: "tillSourcePicker",
  pickerKey: "tillSourceOptions",
  type: "TILL PAYMENT",
  title: "Till Payment",

  validator: () =>
    /^\d{5,10}$/.test(
      $("tillNumber").value.trim()
    ),

  name: () =>
    "BEAST SUPERMARKET LTD",

  destination: () =>
    "Till " + $("tillNumber").value
});


setupBusinessPayment({
  verifyId: "verifyPaybillBtn",
  boxId: "paybillVerifyBox",
  nameId: "paybillName",
  destinationId: "paybillId",
  buttonId: "paybillBtn",
  amountId: "paybillAmount",
  pinId: "paybillPin",
  sourceId: "paybillSource",
  pickerId: "paybillSourcePicker",
  pickerKey: "paybillSourceOptions",
  type: "PAYBILL",
  title: "Pay Bill",

  validator: () =>
    validBusiness(
      $("paybillBusiness").value
    ) &&
    $("paybillAccount")
      .value
      .trim()
      .length >= 3,

  name: () =>
    "KENYA POWER DEMO",

  destination: () =>
    `Business ${
      $("paybillBusiness").value
    } • Account ${
      $("paybillAccount").value
    }`
});


/* =========================================================
   RECEIVE SECURITY
   ========================================================= */

function deviceId() {

  let id =
    localStorage.getItem(
      "mtb_demo_device_id"
    );

  if (!id) {

    id =
      "DEVICE-" +
      Math.random()
        .toString(36)
        .slice(2, 12);

    localStorage.setItem(
      "mtb_demo_device_id",
      id
    );
  }

  return id;
}


function isTrustedDevice() {

  return state.trustedDevices.includes(
    deviceId()
  );
}


function showReceiveSecurityAlert() {

  if (!state.settings.securityAlerts) {
    receiveDeviceVerified = true;
    return;
  }

  if (isTrustedDevice()) {
    receiveDeviceVerified = true;
    return;
  }

  receiveDeviceVerified = false;

  $("receiveSecurityAlert")
    .classList.remove("hidden");

  receiveSecurityShown = true;
}


$("verifyDeviceBtn").onclick = () => {

  const id = deviceId();

  if (!state.trustedDevices.includes(id)) {
    state.trustedDevices.push(id);
  }

  save();

  receiveDeviceVerified = true;

  $("receiveSecurityAlert")
    .classList.add("hidden");

  toast(
    "Device verified for this demo session."
  );

  checkReceive();
};


/* =========================================================
   RECEIVE LOGIN
   ========================================================= */

$("receiveLoginBtn").onclick = () => {

  const id =
    $("receiveLoginCode")
      .value
      .trim();

  const password =
    $("receivePassword")
      .value;

  const validIdentity =
    id.toUpperCase().includes("BEAST-") ||
    validPhone(id);

  if (
    !validIdentity ||
    password !== BUYER_PASSWORD
  ) {

    return toast(
      "Demo login: 0700000001 / beast123"
    );
  }


  receiveSession = true;

  $("receiveLogin")
    .classList.add("hidden");

  $("receiveTransfer")
    .classList.remove("hidden");

  $("receiveUserLabel").textContent =
    `${id} • TEMPORARY SESSION`;

  showReceiveSecurityAlert();

  toast("Buyer authenticated.");
};


let receiveVerified = false;


$("verifyReceiveBtn").onclick = () => {

  const destination =
    $("receiveRecipient")
      .value
      .trim();

  if (!destination) {

    receiveVerified = false;

    $("receiveVerifyBox")
      .classList.add("hidden");

    return toast(
      "Enter a destination."
    );
  }


  receiveVerified = true;

  $("receiveRecipientName")
    .textContent =
    "VERIFIED BUSINESS / RECIPIENT";

  $("receiveRecipientId")
    .textContent =
    `${destination} • VERIFIED`;

  $("receiveVerifyBox")
    .classList.remove("hidden");

  checkReceive();

  toast("Destination verified.");
};


function checkReceive() {

  const valid =
    receiveVerified &&
    receiveDeviceVerified &&
    validAmount(
      $("receiveAmount").value
    );

  $("receiveTransferBtn").disabled =
    !valid;
}


$("receiveAmount").oninput =
  checkReceive;


$("receiveDestinationType").onchange =
  () => {

    receiveVerified = false;

    $("receiveVerifyBox")
      .classList.add("hidden");

    $("receiveTransferBtn").disabled =
      true;
  };


$("receiveTransferBtn").onclick = () => {

  if (!receiveDeviceVerified) {

    return toast(
      "Verify this device before continuing."
    );
  }

  const amount =
    Number($("receiveAmount").value);

  if (!validAmount(amount)) {

    return toast(
      "Invalid amount or balance."
    );
  }


  openAuth({
    type:
      "RECEIVE TERMINAL PAYMENT",

    title:
      $("receiveDestinationType").value,

    recipient:
      "VERIFIED BUSINESS / RECIPIENT",

    destination:
      $("receiveRecipient").value,

    amount,

    source: getSelectedSource(
      "receiveSource",
      "receiveSourcePicker",
      "receiveSourceOptions"
    ),

    receiveSession: true
  });
};


connectSourceSelector(
  "receiveSource",
  "receiveSourcePicker",
  "receiveSourceOptions"
);


/* =========================================================
   RECEIVE ACTION SWITCHING
   ========================================================= */

function hideReceiveSpecialBoxes() {

  $("receiveWithdrawBox")
    .classList.add("hidden");

  $("receivePaybillBox")
    .classList.add("hidden");

  $("normalReceiveBox")
    .classList.remove("hidden");
}


$("receiveWithdrawAction").onclick = () => {

  if (!receiveSession) {
    return toast(
      "Customer must be authenticated first."
    );
  }

  $("receiveWithdrawBox")
    .classList.remove("hidden");

  $("receivePaybillBox")
    .classList.add("hidden");

  $("normalReceiveBox")
    .classList.add("hidden");
};


$("receivePaybillAction").onclick = () => {

  if (!receiveSession) {
    return toast(
      "Customer must be authenticated first."
    );
  }

  $("receivePaybillBox")
    .classList.remove("hidden");

  $("receiveWithdrawBox")
    .classList.add("hidden");

  $("normalReceiveBox")
    .classList.add("hidden");
};


/* =========================================================
   RECEIVE WITHDRAW
   AGENT + STORE TOGETHER
   ========================================================= */

let receiveWithdrawVerified = false;


$("verifyReceiveWithdrawBtn").onclick = () => {

  const agent =
    $("receiveAgentNumber")
      .value
      .trim();

  const store =
    $("receiveStoreNumber")
      .value
      .trim();


  if (
    !validPhone(agent) ||
    !validStore(store)
  ) {

    receiveWithdrawVerified = false;

    $("receiveWithdrawVerifyBox")
      .classList.add("hidden");

    $("receiveWithdrawBtn").disabled =
      true;

    return toast(
      "Enter both Agent Number and Store Number."
    );
  }


  receiveWithdrawVerified = true;

  $("receiveWithdrawVerifyBox")
    .classList.remove("hidden");

  checkReceiveWithdraw();

  toast(
    "Agent + Store verified together."
  );
};


function checkReceiveWithdraw() {

  $("receiveWithdrawBtn").disabled = !(
    receiveWithdrawVerified &&
    receiveDeviceVerified &&
    validAmount(
      $("receiveWithdrawAmount").value
    )
  );
}


$("receiveWithdrawAmount").oninput =
  checkReceiveWithdraw;


$("receiveWithdrawBtn").onclick = () => {

  if (!receiveDeviceVerified) {
    return toast(
      "Verify this device first."
    );
  }

  const amount =
    Number($("receiveWithdrawAmount").value);

  if (!validAmount(amount)) {
    return toast(
      "Invalid amount or balance."
    );
  }


  openAuth({
    type: "RECEIVE WITHDRAWAL",
    title: "M-PESA Agent Withdrawal",

    recipient:
      "BEAST AGENT • VERIFIED",

    destination:
      `Agent ${
        $("receiveAgentNumber").value
      } • Store ${
        $("receiveStoreNumber").value
      }`,

    amount,

    source:
      "M-PESA • Agent + Store",

    receiveSession: true
  });
};


/* =========================================================
   RECEIVE PAY BILL
   BUSINESS + ACCOUNT TOGETHER
   ========================================================= */

let receivePaybillVerified = false;


$("verifyReceivePaybillBtn").onclick = () => {

  const business =
    $("receiveBusinessNumber")
      .value
      .trim();

  const account =
    $("receiveAccountNumber")
      .value
      .trim();


  if (
    !validBusiness(business) ||
    account.length < 3
  ) {

    receivePaybillVerified = false;

    $("receivePaybillVerifyBox")
      .classList.add("hidden");

    $("receivePaybillBtn").disabled =
      true;

    return toast(
      "Enter both Business Number and Account Number."
    );
  }


  receivePaybillVerified = true;

  $("receivePaybillVerifyBox")
    .classList.remove("hidden");

  checkReceivePaybill();

  toast(
    "Business + Account verified together."
  );
};


function checkReceivePaybill() {

  $("receivePaybillBtn").disabled = !(
    receivePaybillVerified &&
    receiveDeviceVerified &&
    validAmount(
      $("receivePaybillAmount").value
    )
  );
}


$("receivePaybillAmount").oninput =
  checkReceivePaybill;


$("receivePaybillBtn").onclick = () => {

  if (!receiveDeviceVerified) {
    return toast(
      "Verify this device first."
    );
  }

  const amount =
    Number($("receivePaybillAmount").value);

  if (!validAmount(amount)) {
    return toast(
      "Invalid amount or balance."
    );
  }


  openAuth({
    type: "RECEIVE PAY BILL",

    title: "Pay Bill",

    recipient:
      "VERIFIED BUSINESS",

    destination:
      `Business ${
        $("receiveBusinessNumber").value
      } • Account ${
        $("receiveAccountNumber").value
      }`,

    amount,

    source:
      "M-PESA / LINKED SOURCE",

    receiveSession: true
  });
};


/* =========================================================
   END RECEIVE SESSION
   ========================================================= */

$("receiveLogoutBtn").onclick =
  () => endReceive();


function endReceive() {

  receiveSession = false;
  receiveDeviceVerified = false;
  receiveVerified = false;
  receiveWithdrawVerified = false;
  receivePaybillVerified = false;

  $("receiveLogin")
    .classList.remove("hidden");

  $("receiveTransfer")
    .classList.add("hidden");

  $("receiveSecurityAlert")
    .classList.add("hidden");

  $("receiveLoginCode").value = "";
  $("receivePassword").value = "";
  $("receiveRecipient").value = "";
  $("receiveAmount").value = "";

  $("receiveAgentNumber").value = "";
  $("receiveStoreNumber").value = "";
  $("receiveWithdrawAmount").value = "";

  $("receiveBusinessNumber").value = "";
  $("receiveAccountNumber").value = "";
  $("receivePaybillAmount").value = "";

  $("receiveVerifyBox")
    .classList.add("hidden");

  $("receiveWithdrawVerifyBox")
    .classList.add("hidden");

  $("receivePaybillVerifyBox")
    .classList.add("hidden");

  $("receiveTransferBtn").disabled =
    true;

  $("receiveWithdrawBtn").disabled =
    true;

  $("receivePaybillBtn").disabled =
    true;

  hideReceiveSpecialBoxes();

  toast(
    "Buyer session ended. Receive is locked."
  );
}


/* =========================================================
   NORMAL WITHDRAW
   ========================================================= */

let withdrawVerified = false;


function refreshWithdrawSource() {

  const source =
    $("withdrawSource").value;


  $("mpesaWithdrawBox")
    .classList.toggle(
      "hidden",
      source !== "M-PESA"
    );

  $("bankWithdrawBox")
    .classList.toggle(
      "hidden",
      source !== "Bank Account"
    );

  $("walletWithdrawBox")
    .classList.toggle(
      "hidden",
      source !== "BEAST Wallet"
    );

  $("cardWithdrawBox")
    .classList.toggle(
      "hidden",
      source !== "BEAST Card"
    );


  withdrawVerified =
    source !== "M-PESA";

  if (source === "Bank Account") {

    renderSourcePicker(
      "withdrawBankPicker",
      "Bank Account",
      "withdrawBankOptions"
    );
  }


  if (source === "BEAST Wallet") {

    renderSourcePicker(
      "withdrawWalletPicker",
      "BEAST Wallet",
      "withdrawWalletOptions"
    );
  }


  if (source === "BEAST Card") {

    renderSourcePicker(
      "withdrawCardPicker",
      "BEAST Card",
      "withdrawCardOptions"
    );
  }


  checkWithdraw();
}


$("withdrawSource").onchange =
  refreshWithdrawSource;


/* =========================================================
   M-PESA WITHDRAW
   SINGLE VERIFICATION AFTER STORE
   ========================================================= */

$("verifyWithdrawDetailsBtn").onclick =
  () => {

    const agent =
      $("withdrawAgentNumber")
        .value
        .trim();

    const store =
      $("withdrawStoreNumber")
        .value
        .trim();


    if (
      !validPhone(agent) ||
      !validStore(store)
    ) {

      withdrawVerified = false;

      $("withdrawVerifyBox")
        .classList.add("hidden");

      $("withdrawBtn").disabled =
        true;

      return toast(
        "Enter both Agent Number and Store Number."
      );
    }


    withdrawVerified = true;

    $("withdrawAgentName")
      .textContent =
      "BEAST AGENT • PETER KAMAU";

    $("withdrawVerificationText")
      .textContent =
      `Agent ${agent} + Store ${store} verified together.`;

    $("withdrawVerifyBox")
      .classList.remove("hidden");

    checkWithdraw();

    toast(
      "Agent + Store withdrawal verified."
    );
  };


function getWithdrawSource() {

  const source =
    $("withdrawSource").value;


  if (source === "M-PESA") {

    return (
      `M-PESA • Agent ${
        $("withdrawAgentNumber").value
      } • Store ${
        $("withdrawStoreNumber").value
      }`
    );
  }


  if (source === "Bank Account") {

    return getSelectedSource(
      "withdrawSource",
      "withdrawBankPicker",
      "withdrawBankOptions"
    );
  }


  if (source === "BEAST Wallet") {

    return getSelectedSource(
      "withdrawSource",
      "withdrawWalletPicker",
      "withdrawWalletOptions"
    );
  }


  if (source === "BEAST Card") {

    return getSelectedSource(
      "withdrawSource",
      "withdrawCardPicker",
      "withdrawCardOptions"
    );
  }


  return source;
}


function checkWithdraw() {

  const amount =
    Number($("withdrawAmount").value);

  $("withdrawBtn").disabled = !(
    withdrawVerified &&
    amount > 0 &&
    amount <= state.balance
  );
}


$("withdrawAmount").oninput =
  checkWithdraw;


$("withdrawBtn").onclick = () => {

  const amount =
    Number($("withdrawAmount").value);

  if (!validAmount(amount)) {

    return toast(
      "Invalid amount or balance."
    );
  }


  const source =
    $("withdrawSource").value;


  let destination =
    "Selected linked source";


  let recipient =
    "BEAST ACCOUNT HOLDER";


  if (source === "M-PESA") {

    recipient =
      "BEAST AGENT • PETER KAMAU";

    destination =
      `Agent ${
        $("withdrawAgentNumber").value
      } • Store ${
        $("withdrawStoreNumber").value
      }`;
  }


  openAuth({

    type: "WITHDRAWAL",

    title:
      source === "M-PESA"
        ? "M-PESA Agent Withdrawal"
        : "Linked Source Withdrawal",

    recipient,

    destination,

    amount,

    source:
      getWithdrawSource()
  });
};


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function openAuth(transaction) {

  pending = {
    ...transaction,
    fee: fee(transaction.amount)
  };


  $("authDetails").innerHTML = `

    <div class="auth-row">
      <span>Type</span>
      <strong>${esc(transaction.type)}</strong>
    </div>

    <div class="auth-row">
      <span>Recipient</span>
      <strong>${esc(transaction.recipient)}</strong>
    </div>

    <div class="auth-row">
      <span>Destination</span>
      <strong>${esc(transaction.destination)}</strong>
    </div>

    <div class="auth-row">
      <span>Amount</span>
      <strong>${money(transaction.amount)}</strong>
    </div>

    <div class="auth-row">
      <span>Fee</span>
      <strong>${money(pending.fee)}</strong>
    </div>

    <div class="auth-row">
      <span>Total</span>
      <strong>${money(
        transaction.amount + pending.fee
      )}</strong>
    </div>

    <div class="auth-row">
      <span>Source</span>
      <strong>${esc(transaction.source)}</strong>
    </div>

  `;


  $("authPin").value = "";

  $("authModal")
    .classList.remove("hidden");
}


$("closeModalBtn").onclick = () => {

  $("authModal")
    .classList.add("hidden");

  pending = null;
};


$("confirmAuthBtn").onclick = () => {

  if (!pending) return;

  if (
    $("authPin").value !== DEMO_PIN
  ) {

    return toast(
      "Wrong demo PIN. Use 1234."
    );
  }

  completeTransaction(pending);
};


/* =========================================================
   COMPLETE TRANSACTION
   ========================================================= */

function completeTransaction(transaction) {

  const total =
    transaction.amount +
    transaction.fee;


  if (total > state.balance) {

    return toast(
      "Insufficient demo balance including fee."
    );
  }


  const currentTime = timeNow();


  const receipt = {

    id:
      "BEAST-" +
      Date.now()
        .toString()
        .slice(-8),

    ...transaction,

    date:
      currentTime.date,

    time:
      currentTime.time,

    total,

    balanceAfter:
      state.balance - total,

    status:
      "Successful"
  };


  state.balance -= total;

  state.history.unshift(receipt);

  save();

  updateBalance();

  renderHistory();


  $("authModal")
    .classList.add("hidden");

  pending = null;


  showReceipt(receipt);


  if (state.settings.notifications) {

    toast(
      `${transaction.type} successful • ${money(total)}`
    );
  }


  if (transaction.receiveSession) {
    endReceive();
  }
}


/* =========================================================
   RECEIPT
   ========================================================= */

function showReceipt(receipt) {

  $("receiptDetails").innerHTML = `

    <div class="receipt-row">
      <span>Status</span>
      <strong>✓ ${esc(receipt.status)}</strong>
    </div>

    <div class="receipt-row">
      <span>Transaction ID</span>
      <strong>${esc(receipt.id)}</strong>
    </div>

    <div class="receipt-row">
      <span>Type</span>
      <strong>${esc(receipt.type)}</strong>
    </div>

    <div class="receipt-row">
      <span>Recipient</span>
      <strong>${esc(receipt.recipient)}</strong>
    </div>

    <div class="receipt-row">
      <span>Destination</span>
      <strong>${esc(receipt.destination)}</strong>
    </div>

    <div class="receipt-row">
      <span>Amount</span>
      <strong>${money(receipt.amount)}</strong>
    </div>

    <div class="receipt-row">
      <span>Fee</span>
      <strong>${money(receipt.fee)}</strong>
    </div>

    <div class="receipt-row">
      <span>Total</span>
      <strong>${money(receipt.total)}</strong>
    </div>

    <div class="receipt-row">
      <span>Source</span>
      <strong>${esc(receipt.source)}</strong>
    </div>

    <div class="receipt-row">
      <span>Date</span>
      <strong>${esc(receipt.date)}</strong>
    </div>

    <div class="receipt-row">
      <span>Time</span>
      <strong>${esc(receipt.time)}</strong>
    </div>

    <div class="receipt-row">
      <span>Balance After</span>
      <strong>${money(receipt.balanceAfter)}</strong>
    </div>

  `;


  $("receiptModal")
    .classList.remove("hidden");
}


$("closeReceiptBtn").onclick =
  $("receiptDoneBtn").onclick =
  () => {

    $("receiptModal")
      .classList.add("hidden");
  };


/* =========================================================
   HISTORY
   ========================================================= */

function transactionIcon(type) {

  if (type.includes("SEND")) return "💸";
  if (type.includes("POCHI")) return "📱";
  if (type.includes("TILL")) return "🏪";
  if (type.includes("PAYBILL")) return "🧾";
  if (type.includes("WITHDRAW")) return "🏧";
  return "📥";
}


function renderHistory() {

  const list =
    $("historyList");

  const empty =
    $("emptyHistory");


  if (!state.history.length) {

    list.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  list.innerHTML =
    state.history.map(
      (receipt, index) => `

        <div
          class="history-item"
          data-index="${index}"
        >

          <div class="history-icon">
            ${transactionIcon(receipt.type)}
          </div>

          <div class="history-main">

            <strong>
              ${esc(receipt.recipient)}
            </strong>

            <small>
              ${esc(receipt.type)}
              •
              ${esc(receipt.date)}
              •
              ${esc(receipt.time)}
            </small>

            <small>
              ${esc(receipt.destination)}
              •
              ${esc(receipt.source)}
            </small>

          </div>

          <div class="history-amount">

            <strong>
              -${money(receipt.total)}
            </strong>

            <small>
              ✓ ${esc(receipt.status)}
            </small>

          </div>

        </div>

      `
    ).join("");


  document
    .querySelectorAll(".history-item")
    .forEach(item => {

      item.onclick = () => {

        const index =
          Number(item.dataset.index);

        showReceipt(
          state.history[index]
        );
      };
    });
}


/* =========================================================
   CAMERA SECURITY CHECK
   ========================================================= */

$("cameraBtn").onclick =
  async () => {

    try {

      cameraStream =
        await navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: "user"
            },
            audio: false
          });


      $("cameraPreview").srcObject =
        cameraStream;

      $("cameraPreview")
        .style.display = "block";

      $("cameraPlaceholder")
        .style.display = "none";

      $("cameraBtn").textContent =
        "✓ CAMERA CHECK ACTIVE";

      toast(
        "Camera permission granted for demo check."
      );

    } catch {

      toast(
        "Camera permission was not granted."
      );
    }
  };


/* =========================================================
   SETTINGS
   ========================================================= */

function loadSettings() {

  $("securityAlertToggle").checked =
    state.settings.securityAlerts;

  $("notificationToggle").checked =
    state.settings.notifications;

  $("screenProtectionToggle").checked =
    state.settings.screenProtection;
}


$("securityAlertToggle").onchange =
  event => {

    state.settings.securityAlerts =
      event.target.checked;

    save();

    toast(
      event.target.checked
        ? "Security alerts enabled."
        : "Security alerts disabled."
    );
  };


$("notificationToggle").onchange =
  event => {

    state.settings.notifications =
      event.target.checked;

    save();

    toast(
      event.target.checked
        ? "Transaction notifications enabled."
        : "Transaction notifications disabled."
    );
  };


$("screenProtectionToggle").onchange =
  event => {

    state.settings.screenProtection =
      event.target.checked;

    save();

    toast(
      event.target.checked
        ? "Screen protection enabled."
        : "Screen protection disabled."
    );
  };


/* =========================================================
   BASIC SCREEN-PROTECTION DEMO
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden &&
      state.settings.screenProtection
    ) {

      document.title =
        "🔒 MONEY TRANSFER BEAST";
    } else {

      document.title =
        "MONEY TRANSFER BEAST";
    }
  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

applyTheme();

loadSettings();

updateBalance();

renderHistory();

refreshWithdrawSource();

connectSourceSelector(
  "sendSource",
  "sendSourcePicker",
  "sendSourceOptions"
);

console.log(
  "MONEY TRANSFER BEAST demo engine loaded."
);