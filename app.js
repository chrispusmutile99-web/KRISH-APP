/* =========================================================
   MONEY TRANSFER BEAST
   app.js
   Demo / prototype only
   ========================================================= */

const KEY = "mtb_beast_v4";
const REG_KEY = "mtb_beast_registration_v2";


/* =========================================================
   DEFAULT FINANCIAL SOURCES
   ========================================================= */

const DEFAULT_SOURCES = [

  {
    id: "mpesa1",
    provider: "M-PESA",
    label: "0712345678",
    type: "mobile",
    balance: 2500
  },

  {
    id: "mpesa2",
    provider: "M-PESA",
    label: "0798765432",
    type: "mobile",
    balance: 1200
  },

  {
    id: "airtel1",
    provider: "Airtel Money",
    label: "0734567890",
    type: "mobile",
    balance: 1500
  },

  {
    id: "bank1",
    provider: "KCB",
    label: "•••• 4582",
    type: "bank",
    balance: 8500
  },

  {
    id: "bank2",
    provider: "Equity",
    label: "•••• 9134",
    type: "bank",
    balance: 4200
  },

  {
    id: "card1",
    provider: "BEAST Visa",
    label: "•••• 4821",
    type: "card",
    balance: 3000
  },

  {
    id: "wallet1",
    provider: "BEAST Wallet",
    label: "Main wallet",
    type: "wallet",
    balance: 5000
  }

];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let state = {

  balance: 5000,

  history: [],

  settings: {
    securityAlerts: true,
    notifications: true,
    screenProtection: true
  },

  sources: DEFAULT_SOURCES,

  registered: false,

  fullName: "",
  phone: "",
  nationalId: "",
  beastId: "",
  beastPin: ""

};


/* =========================================================
   RECEIVE SECURITY STATE
   ========================================================= */

let receiveVerified = false;

let pendingReceive = null;

let buyerAuthenticated = false;

let sellerApproved = false;

let finalAuthorizationCallback = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);


function money(amount) {

  return "KES " + Number(amount || 0).toLocaleString(
    "en-KE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );

}


function save() {

  localStorage.setItem(
    KEY,
    JSON.stringify(state)
  );

}


function load() {

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(KEY)
      );

    if (stored) {

      state = {

        ...state,

        ...stored,

        settings: {
          ...state.settings,
          ...(stored.settings || {})
        },

        sources:
          stored.sources || DEFAULT_SOURCES

      };

    }

  } catch (error) {

    console.log(
      "State loading error:",
      error
    );

  }

}


function toast(message) {

  const element = $("toast");

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer =
    setTimeout(
      () => {
        element.classList.remove("show");
      },
      2800
    );

}


function updateBalance() {

  $("balance").textContent =
    money(state.balance);

}


function normalizeKenyanPhone(value) {

  const phone =
    String(value || "")
      .replace(/\s+/g, "");

  if (/^07\d{8}$/.test(phone)) {

    return phone;

  }

  if (/^\+2547\d{8}$/.test(phone)) {

    return "0" + phone.slice(4);

  }

  if (/^2547\d{8}$/.test(phone)) {

    return "0" + phone.slice(3);

  }

  return null;

}


function validPin(value) {

  return /^\d{4}$/.test(value);

}


function generateBeastId(phone) {

  return (
    "BST-" +
    phone.slice(-4) +
    "-" +
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );

}


/* =========================================================
   REGISTRATION STORAGE
   ========================================================= */

function getRegistration() {

  try {

    return JSON.parse(
      localStorage.getItem(REG_KEY)
    ) || null;

  } catch (error) {

    return null;

  }

}


/* =========================================================
   REGISTRATION UI
   ========================================================= */

function showRegistrationStep(step) {

  const steps = [
    "registrationStep1",
    "registrationStep2",
    "registrationStep3"
  ];

  steps.forEach(
    (id, index) => {

      $(id).classList.toggle(
        "hidden",
        index + 1 !== step
      );

    }
  );


  document
    .querySelectorAll(".progress-dot")
    .forEach(
      (dot, index) => {

        dot.classList.toggle(
          "active",
          index < step
        );

      }
    );

}


function showRegistration() {

  $("registrationScreen")
    .classList.remove("hidden");

  $("beastApp")
    .classList.add("hidden");

  showRegistrationStep(1);

}


function showDashboard() {

  $("registrationScreen")
    .classList.add("hidden");

  $("beastApp")
    .classList.remove("hidden");


  $("dashboardName").textContent =
    state.fullName || "User";


  $("dashboardBeastId").textContent =
    state.beastId || "—";


  updateBalance();

  renderHistory();

}


function beginRegistration() {

  const registration =
    getRegistration();


  if (
    registration &&
    registration.registered &&
    registration.beastPin
  ) {

    state = {

      ...state,

      ...registration,

      registered: true

    };

    save();

    showDashboard();

    return;

  }


  showRegistration();

}


/* =========================================================
   REGISTRATION VALIDATION
   ========================================================= */

function validateRegistrationStep1() {

  const name =
    $("registrationName")
      .value
      .trim();


  const phone =
    normalizeKenyanPhone(
      $("registrationPhone").value
    );


  const nationalId =
    $("registrationId")
      .value
      .trim();


  if (name.length < 3) {

    toast(
      "Enter your full name."
    );

    return false;

  }


  if (!phone) {

    toast(
      "Enter a valid Kenyan mobile number."
    );

    return false;

  }


  if (!/^\d{5,15}$/.test(nationalId)) {

    toast(
      "Enter a valid National ID number."
    );

    return false;

  }


  state.fullName = name;

  state.phone = phone;

  state.nationalId = nationalId;


  return true;

}


function validateRegistrationStep2() {

  const pin =
    $("registrationPin").value;


  const confirmPin =
    $("registrationPinConfirm").value;


  if (!validPin(pin)) {

    toast(
      "BEAST PIN must contain exactly 4 digits."
    );

    return false;

  }


  if (pin !== confirmPin) {

    toast(
      "PIN confirmation does not match."
    );

    return false;

  }


  state.beastPin = pin;


  return true;

}


/* =========================================================
   FINISH REGISTRATION
   ========================================================= */

function finishRegistration() {

  state.registered = true;


  if (!state.beastId) {

    state.beastId =
      generateBeastId(
        state.phone
      );

  }


  const registration = {

    registered: true,

    fullName: state.fullName,

    phone: state.phone,

    nationalId: state.nationalId,

    beastId: state.beastId,

    beastPin: state.beastPin

  };


  localStorage.setItem(
    REG_KEY,
    JSON.stringify(registration)
  );


  save();

  showDashboard();

  toast(
    "BEAST account created successfully."
  );

}


/* =========================================================
   PANEL MANAGEMENT
   ========================================================= */

function openPanel(panelId) {

  document
    .querySelectorAll(".panel")
    .forEach(
      panel =>
        panel.classList.add("hidden")
    );


  $(panelId)
    .classList.remove("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function closeAllPanels() {

  document
    .querySelectorAll(".panel")
    .forEach(
      panel =>
        panel.classList.add("hidden")
    );

}


/* =========================================================
   RECEIVE TYPE
   ========================================================= */

function renderReceiveFields() {

  const type =
    $("receiveType").value;


  let html = "";


  if (type === "paybill") {

    html = `

      <label>
        Business Number

        <input
          id="receiveNumber"
          type="text"
          inputmode="numeric"
          placeholder="Business number"
        >

      </label>

      <label>
        Account Number

        <input
          id="receiveAccount"
          type="text"
          placeholder="Account number"
        >

      </label>

    `;

  }


  if (type === "buygoods") {

    html = `

      <label>
        Till Number

        <input
          id="receiveNumber"
          type="text"
          inputmode="numeric"
          placeholder="Till number"
        >

      </label>

    `;

  }


  if (type === "pochi") {

    html = `

      <label>
        Seller Phone Number

        <input
          id="receiveNumber"
          type="tel"
          inputmode="tel"
          placeholder="0712345678"
        >

      </label>

    `;

  }


  $("receiveFields").innerHTML =
    html;


  receiveVerified = false;

  $("receiveVerifyResult")
    .classList.add("hidden");

}


/* =========================================================
   VERIFY SELLER
   ========================================================= */

function verifyReceiveDetails() {

  const type =
    $("receiveType").value;


  const number =
    $("receiveNumber")?.value
      .trim() || "";


  if (!number) {

    toast(
      "Enter the payment details first."
    );

    return;

  }


  if (
    type === "paybill" &&
    !$("receiveAccount")
      .value
      .trim()
  ) {

    toast(
      "Enter the account number."
    );

    return;

  }


  let sellerName =
    "KRISH DEMO SELLER";


  if (type === "paybill") {

    sellerName =
      "KRISH DEMO BUSINESS";

  }


  if (type === "buygoods") {

    sellerName =
      "KRISH DEMO SHOP";

  }


  if (type === "pochi") {

    sellerName =
      "KRISH DEMO SELLER";

  }


  receiveVerified = true;


  $("receiveVerifyResult").innerHTML = `

    <strong>
      ✓ Seller Verified
    </strong>

    <br>

    Seller:
    ${sellerName}

    <br>

    Type:
    ${type.toUpperCase()}

    <br>

    <small>
      DEMO VERIFICATION ONLY
    </small>

  `;


  $("receiveVerifyResult")
    .classList.remove("hidden");


  toast(
    "Seller details verified."
  );

}


/* =========================================================
   BUYER LOGIN
   ========================================================= */

function openBuyerLogin() {

  if (!receiveVerified) {

    toast(
      "Verify the seller/payment details first."
    );

    return;

  }


  const amount =
    Number(
      $("receiveAmount").value
    );


  if (!amount || amount <= 0) {

    toast(
      "Enter a valid amount."
    );

    return;

  }


  pendingReceive = {

    type:
      $("receiveType").value,

    amount,

    number:
      $("receiveNumber").value,

    account:
      $("receiveAccount")?.value || "",

    seller:
      $("receiveVerifyResult")
        .innerText

  };


  buyerAuthenticated = false;

  sellerApproved = false;


  $("buyerLoginIdentity").value = "";

  $("buyerLoginName").value = "";

  $("buyerLoginPin").value = "";


  $("buyerLoginModal")
    .classList.remove("hidden");


  setTimeout(
    () =>
      $("buyerLoginIdentity")
        .focus(),
    100
  );

}


function buyerLoginContinue() {

  const identity =
    $("buyerLoginIdentity")
      .value
      .trim();


  const name =
    $("buyerLoginName")
      .value
      .trim();


  const pin =
    $("buyerLoginPin")
      .value;


  const phone =
    normalizeKenyanPhone(
      identity
    );


  const identityMatches =
    identity === state.beastId ||
    phone === state.phone;


  if (!identityMatches) {

    toast(
      "Phone or BEAST ID does not match."
    );

    return;

  }


  if (
    name.toLowerCase() !==
    state.fullName.toLowerCase()
  ) {

    toast(
      "Full name does not match."
    );

    return;

  }


  if (pin !== state.beastPin) {

    toast(
      "Incorrect BEAST PIN."
    );

    return;

  }


  buyerAuthenticated = true;


  $("buyerLoginModal")
    .classList.add("hidden");


  toast(
    "Buyer login successful."
  );


  requestSellerApproval();

}


/* =========================================================
   SELLER APPROVAL
   ========================================================= */

function requestSellerApproval() {

  if (!buyerAuthenticated) {

    toast(
      "Buyer authentication is required."
    );

    return;

  }


  const amount =
    money(
      pendingReceive.amount
    );


  $("sellerApprovalText").textContent =
    `Buyer is requesting ${amount}. Review the verified seller/payment details and approve or reject the request.`;


  $("sellerApprovalModal")
    .classList.remove("hidden");


  toast(
    "Seller approval requested."
  );

}


/* =========================================================
   SELLER APPROVES
   ========================================================= */

function sellerApprove() {

  if (!pendingReceive) {

    toast(
      "No pending payment."
    );

    return;

  }


  sellerApproved = true;


  $("sellerApprovalModal")
    .classList.add("hidden");


  toast(
    "Seller approved. Buyer re-login required."
  );


  /*
    IMPORTANT SECURITY FLOW:

    Seller approval is NOT the final transaction.

    The buyer must now authenticate again.
  */


  openBuyerReLogin();

}


/* =========================================================
   SELLER REJECTS
   ========================================================= */

function sellerReject() {

  $("sellerApprovalModal")
    .classList.add("hidden");


  pendingReceive = null;

  buyerAuthenticated = false;

  sellerApproved = false;


  toast(
    "Seller rejected the payment."
  );

}


/* =========================================================
   BUYER RE-LOGIN
   ========================================================= */

function openBuyerReLogin() {

  $("reLoginIdentity").value =
    state.phone || "";

  $("reLoginName").value =
    state.fullName || "";

  $("reLoginPin").value = "";


  $("buyerReLoginModal")
    .classList.remove("hidden");


  setTimeout(
    () =>
      $("reLoginPin")
        .focus(),
    100
  );

}


/* =========================================================
   BUYER RE-LOGIN VALIDATION
   ========================================================= */

function buyerReLoginContinue() {

  if (!sellerApproved) {

    toast(
      "Seller approval has not been received."
    );

    return;

  }


  const identity =
    $("reLoginIdentity")
      .value
      .trim();


  const name =
    $("reLoginName")
      .value
      .trim();


  const pin =
    $("reLoginPin")
      .value;


  const phone =
    normalizeKenyanPhone(
      identity
    );


  const identityMatches =
    identity === state.beastId ||
    phone === state.phone;


  if (!identityMatches) {

    toast(
      "Phone or BEAST ID does not match."
    );

    return;

  }


  if (
    name.toLowerCase() !==
    state.fullName.toLowerCase()
  ) {

    toast(
      "Full name does not match."
    );

    return;

  }


  if (pin !== state.beastPin) {

    toast(
      "Incorrect BEAST PIN."
    );

    return;

  }


  $("buyerReLoginModal")
    .classList.add("hidden");


  toast(
    "Buyer re-login successful."
  );


  /*
    One more authorization step is intentionally
    required before the transaction is completed.
  */


  requestFinalAuthorization();

}


/* =========================================================
   FINAL AUTHORIZATION
   ========================================================= */

function requestFinalAuthorization() {

  $("authTitle").textContent =
    "Final Authorization";


  $("authDescription").textContent =
    "Seller approval and buyer re-login succeeded. Enter the BEAST PIN again to complete the payment.";


  $("authPin").value = "";


  finalAuthorizationCallback =
    completeReceiveTransaction;


  $("authModal")
    .classList.remove("hidden");


  setTimeout(
    () =>
      $("authPin").focus(),
    100
  );

}


/* =========================================================
   FINAL AUTHORIZATION CHECK
   ========================================================= */

function authorizeFinalTransaction() {

  const pin =
    $("authPin").value;


  if (pin !== state.beastPin) {

    toast(
      "Incorrect BEAST PIN."
    );

    return;

  }


  const callback =
    finalAuthorizationCallback;


  finalAuthorizationCallback = null;


  $("authModal")
    .classList.add("hidden");


  if (callback) {

    callback();

  }

}


/* =========================================================
   COMPLETE RECEIVE TRANSACTION
   ========================================================= */

function completeReceiveTransaction() {

  if (!pendingReceive) {

    toast(
      "No pending transaction."
    );

    return;

  }


  if (
    !buyerAuthenticated ||
    !sellerApproved
  ) {

    toast(
      "Security approval sequence incomplete."
    );

    return;

  }


  const amount =
    pendingReceive.amount;


  /*
    Demo behaviour:
    Receive increases the BEAST balance.
  */


  state.balance += amount;


  state.history.unshift({

    type: "RECEIVE",

    amount,

    details:
      `Seller approved • ${pendingReceive.type.toUpperCase()}`,

    status:
      "COMPLETED",

    time:
      new Date().toLocaleString()

  });


  save();

  updateBalance();

  renderHistory();


  pendingReceive = null;

  receiveVerified = false;

  buyerAuthenticated = false;

  sellerApproved = false;


  $("receiveAmount").value = "";

  $("receiveVerifyResult")
    .classList.add("hidden");


  toast(
    "Payment completed successfully."
  );

}


/* =========================================================
   SEND
   ========================================================= */

function verifyRecipient() {

  const phone =
    normalizeKenyanPhone(
      $("sendRecipient").value
    );


  if (!phone) {

    toast(
      "Enter a valid Kenyan mobile number."
    );

    return;

  }


  $("recipientResult").innerHTML = `

    <strong>
      ✓ Recipient Verified
    </strong>

    <br>

    KRISH DEMO RECIPIENT

    <br>

    <small>
      ${phone} • DEMO ONLY
    </small>

  `;


  $("recipientResult")
    .classList.remove("hidden");


  toast(
    "Recipient name verified."
  );

}


function sendMoney() {

  const recipient =
    normalizeKenyanPhone(
      $("sendRecipient").value
    );


  const amount =
    Number(
      $("sendAmount").value
    );


  if (!recipient) {

    toast(
      "Enter a valid recipient."
    );

    return;

  }


  if (
    $("recipientResult")
      .classList
      .contains("hidden")
  ) {

    toast(
      "Verify the recipient first."
    );

    return;

  }


  if (!amount || amount <= 0) {

    toast(
      "Enter a valid amount."
    );

    return;

  }


  if (amount > state.balance) {

    toast(
      "Insufficient BEAST balance."
    );

    return;

  }


  requestStandardAuthorization(
    "Send Authorization",
    "Enter your BEAST PIN to authorize this demo transfer.",
    () => {

      state.balance -= amount;


      state.history.unshift({

        type: "SEND",

        amount,

        details:
          `To ${recipient} • KRISH DEMO RECIPIENT`,

        status:
          "COMPLETED",

        time:
          new Date().toLocaleString()

      });


      save();

      updateBalance();

      renderHistory();


      toast(
        "Demo transfer completed."
      );

    }
  );

}


/* =========================================================
   STANDARD AUTHORIZATION
   ========================================================= */

function requestStandardAuthorization(
  title,
  description,
  callback
) {

  $("authTitle").textContent =
    title;


  $("authDescription").textContent =
    description;


  $("authPin").value = "";


  finalAuthorizationCallback =
    callback;


  $("authModal")
    .classList.remove("hidden");

}


/* =========================================================
   WITHDRAW
   ========================================================= */

function verifyWithdraw() {

  const agent =
    $("withdrawAgent")
      .value
      .trim();


  const store =
    $("withdrawStore")
      .value
      .trim();


  if (!agent) {

    toast(
      "Enter the agent number."
    );

    return;

  }


  if (!store) {

    toast(
      "Enter the store number."
    );

    return;

  }


  $("withdrawResult").innerHTML = `

    <strong>
      ✓ Withdrawal Details Verified
    </strong>

    <br>

    Agent:
    ${agent}

    <br>

    Store:
    ${store}

    <br>

    <small>
      DEMO TERMINAL VERIFICATION
    </small>

  `;


  $("withdrawResult")
    .classList.remove("hidden");


  toast(
    "Withdrawal details verified."
  );

}


function withdrawMoney() {

  const amount =
    Number(
      $("withdrawAmount").value
    );


  if (!amount || amount <= 0) {

    toast(
      "Enter a valid amount."
    );

    return;

  }


  if (
    $("withdrawResult")
      .classList
      .contains("hidden")
  ) {

    toast(
      "Verify withdrawal details first."
    );

    return;

  }


  if (amount > state.balance) {

    toast(
      "Insufficient BEAST balance."
    );

    return;

  }


  const sourceId =
    $("withdrawSource").value;


  const source =
    state.sources.find(
      item => item.id === sourceId
    );


  if (!source) {

    toast(
      "Select a valid withdrawal source."
    );

    return;

  }


  requestStandardAuthorization(
    "Withdrawal Authorization",
    "Enter your BEAST PIN to authorize this demo withdrawal.",
    () => {

      state.balance -= amount;


      state.history.unshift({

        type: "WITHDRAW",

        amount,

        details:
          `${source.provider} • Agent ${$("withdrawAgent").value}`,

        status:
          "DEMO COMPLETED",

        time:
          new Date().toLocaleString()

      });


      save();

      updateBalance();

      renderHistory();


      toast(
        "Demo withdrawal authorized."
      );

    }
  );

}


/* =========================================================
   LIPA NA
   ========================================================= */

function renderLipaFields() {

  const type =
    $("lipaType").value;


  const container =
    $("lipaFields");


  if (type === "pochi") {

    container.innerHTML = `

      <label>
        Phone Number

        <input
          id="lipaNumber"
          type="tel"
          inputmode="tel"
          placeholder="0712345678"
        >

      </label>

    `;

  }


  if (type === "buygoods") {

    container.innerHTML = `

      <label>
        Till Number

        <input
          id="lipaNumber"
          type="text"
          inputmode="numeric"
          placeholder="Till number"
        >

      </label>

    `;

  }


  if (type === "paybill") {

    container.innerHTML = `

      <label>
        Business Number

        <input
          id="lipaNumber"
          type="text"
          inputmode="numeric"
          placeholder="Business number"
        >

      </label>

      <label>
        Account Number

        <input
          id="lipaAccount"
          type="text"
          placeholder="Account number"
        >

      </label>

    `;

  }

}


function verifyLipa() {

  const number =
    $("lipaNumber")?.value
      .trim();


  if (!number) {

    toast(
      "Enter the payment details."
    );

    return;

  }


  toast(
    "Payment details verified in demo mode."
  );

}


function payLipa() {

  const amount =
    Number(
      $("lipaAmount").value
    );


  if (!amount || amount <= 0) {

    toast(
      "Enter a valid amount."
    );

    return;

  }


  if (amount > state.balance) {

    toast(
      "Insufficient BEAST balance."
    );

    return;

  }


  requestStandardAuthorization(
    "Lipa Na Authorization",
    "Enter your BEAST PIN to authorize this demo payment.",
    () => {

      state.balance -= amount;


      state.history.unshift({

        type: "LIPA NA",

        amount,

        details:
          `${$("lipaType").value.toUpperCase()} • Demo payment`,

        status:
          "COMPLETED",

        time:
          new Date().toLocaleString()

      });


      save();

      updateBalance();

      renderHistory();


      $("lipaAmount").value = "";


      toast(
        "Demo Lipa Na payment completed."
      );

    }
  );

}


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {

  const list =
    $("historyList");


  if (!state.history.length) {

    list.innerHTML = `

      <p class="muted">
        No transactions yet.
      </p>

    `;

    return;

  }


  list.innerHTML =
    state.history
      .slice(0, 30)
      .map(
        transaction => `

          <div class="history-item">

            <strong>
              ${transaction.type}
              •
              ${money(transaction.amount)}
            </strong>

            <span>
              ${transaction.details || ""}
            </span>

            <span>
              ${transaction.status}
              •
              ${transaction.time}
            </span>

          </div>

        `
      )
      .join("");

}


/* =========================================================
   MODAL CLOSE
   ========================================================= */

function closeAuthModal() {

  $("authModal")
    .classList.add("hidden");

  finalAuthorizationCallback =
    null;

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  localStorage.removeItem(KEY);

  localStorage.removeItem(REG_KEY);


  state = {

    balance: 5000,

    history: [],

    settings: {
      securityAlerts: true,
      notifications: true,
      screenProtection: true
    },

    sources:
      DEFAULT_SOURCES,

    registered: false,

    fullName: "",
    phone: "",
    nationalId: "",
    beastId: "",
    beastPin: ""

  };


  $("settingsModal")
    .classList.add("hidden");


  closeAllPanels();

  showRegistration();

  toast(
    "Logged out."
  );

}


/* =========================================================
   SECURITY / VISIBILITY
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden &&
      state.settings.screenProtection
    ) {

      toast(
        "Security protection active."
      );

    }

  }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    load();


    /* ---------- Registration ---------- */

    $("registrationNext1")
      .addEventListener(
        "click",
        () => {

          if (
            validateRegistrationStep1()
          ) {

            showRegistrationStep(2);

          }

        }
      );


    $("registrationBack1")
      .addEventListener(
        "click",
        () => {

          showRegistrationStep(1);

        }
      );


    $("registrationNext2")
      .addEventListener(
        "click",
        () => {

          if (
            !validateRegistrationStep2()
          ) {

            return;

          }


          $("registrationSummaryName")
            .textContent =
            state.fullName;


          $("registrationSummaryPhone")
            .textContent =
            state.phone;


          $("registrationSummaryId")
            .textContent =
            state.nationalId;


          state.beastId =
            state.beastId ||
            generateBeastId(
              state.phone
            );


          $("registrationBeastId")
            .textContent =
            state.beastId;


          save();

          showRegistrationStep(3);

        }
      );


    $("registrationFinish")
      .addEventListener(
        "click",
        finishRegistration
      );


    /* ---------- Main Menu ---------- */

    document
      .querySelectorAll(".menu-card")
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              openPanel(
                button.dataset.panel
              );

            }
          );

        }
      );


    document
      .querySelectorAll("[data-close]")
      .forEach(
        button => {

          button.addEventListener(
            "click",
            closeAllPanels
          );

        }
      );


    /* ---------- Receive Tabs ---------- */

    document
      .querySelectorAll("[data-receive-tab]")
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              document
                .querySelectorAll(
                  "[data-receive-tab]"
                )
                .forEach(
                  tab =>
                    tab.classList.remove(
                      "active"
                    )
                );


              button.classList.add(
                "active"
              );


              const sell =
                button.dataset
                  .receiveTab === "sell";


              $("receiveSell")
                .classList.toggle(
                  "hidden",
                  !sell
                );


              $("receiveWithdraw")
                .classList.toggle(
                  "hidden",
                  sell
                );

            }
          );

        }
      );


    /* ---------- Receive ---------- */

    $("receiveType")
      .addEventListener(
        "change",
        renderReceiveFields
      );


    $("verifyReceivePayment")
      .addEventListener(
        "click",
        verifyReceiveDetails
      );


    $("buyerLoginBtn")
      .addEventListener(
        "click",
        openBuyerLogin
      );


    $("buyerLoginContinue")
      .addEventListener(
        "click",
        buyerLoginContinue
      );


    $("buyerLoginCancel")
      .addEventListener(
        "click",
        () => {

          $("buyerLoginModal")
            .classList.add("hidden");

        }
      );


    $("sellerApproveBtn")
      .addEventListener(
        "click",
        sellerApprove
      );


    $("sellerRejectBtn")
      .addEventListener(
        "click",
        sellerReject
      );


    $("reLoginContinue")
      .addEventListener(
        "click",
        buyerReLoginContinue
      );


    /* ---------- Authorization ---------- */

    $("authorizeBtn")
      .addEventListener(
        "click",
        authorizeFinalTransaction
      );


    $("cancelAuth")
      .addEventListener(
        "click",
        closeAuthModal
      );


    /* ---------- Send ---------- */

    $("verifyRecipient")
      .addEventListener(
        "click",
        verifyRecipient
      );


    $("sendBtn")
      .addEventListener(
        "click",
        sendMoney
      );


    /* ---------- Withdraw ---------- */

    $("verifyWithdraw")
      .addEventListener(
        "click",
        verifyWithdraw
      );


    $("withdrawBtn")
      .addEventListener(
        "click",
        withdrawMoney
      );


    /* ---------- Lipa Na ---------- */

    $("lipaType")
      .addEventListener(
        "change",
        renderLipaFields
      );


    $("lipaVerifyBtn")
      .addEventListener(
        "click",
        verifyLipa
      );


    $("lipaPayBtn")
      .addEventListener(
        "click",
        payLipa
      );


    /* ---------- Settings ---------- */

    $("settingsBtn")
      .addEventListener(
        "click",
        () => {

          $("settingsModal")
            .classList.remove(
              "hidden"
            );

        }
      );


    $("closeSettings")
      .addEventListener(
        "click",
        () => {

          $("settingsModal")
            .classList.add(
              "hidden"
            );

        }
      );


    $("logoutBtn")
      .addEventListener(
        "click",
        logout
      );


    $("securityToggle")
      .addEventListener(
        "change",
        event => {

          state.settings.securityAlerts =
            event.target.checked;

          save();

        }
      );


    $("notificationToggle")
      .addEventListener(
        "change",
        event => {

          state.settings.notifications =
            event.target.checked;

          save();

        }
      );


    /* ---------- Start ---------- */

    renderReceiveFields();

    renderLipaFields();

    renderHistory();

    updateBalance();

    beginRegistration();

  }
);