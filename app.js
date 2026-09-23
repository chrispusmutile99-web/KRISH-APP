/* =========================================================
   MONEY TRANSFER BEAST v6
   Demo / Prototype
   ========================================================= */

const KEY = "mtb_beast_v6";
const REG_KEY = "mtb_beast_registration_v4";

let state = null;

let selectedSendSource = "mpesa1";
let selectedReceiveSource = "mpesa1";
let selectedLipaSource = "mpesa1";

let currentSellType = "paybill";
let currentLipaType = "pochi";

let receiveSeller = null;
let receiveVerified = false;
let sendRecipientVerified = false;
let lipaVerified = false;
let withdrawalVerified = false;

let toastTimer = null;


/* =========================================================
   DEFAULT DATA
   ========================================================= */

const DEFAULT_SOURCES = [
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
    accountType: "Savings",
    balance: 8500
  },
  {
    id: "bank2",
    type: "Bank",
    provider: "Equity Bank",
    number: "Equity •••• 9134",
    accountType: "Current",
    balance: 4200
  },
  {
    id: "bank3",
    type: "Bank",
    provider: "Co-operative Bank",
    number: "Co-operative •••• 2210",
    accountType: "Savings",
    balance: 6700
  },
  {
    id: "card1",
    type: "Card",
    provider: "BEAST Visa",
    number: "BEAST Visa •••• 4821",
    cardType: "Debit",
    network: "Visa",
    balance: 3000
  },
  {
    id: "card2",
    type: "Card",
    provider: "M-PESA Card",
    number: "M-PESA Card •••• 7720",
    cardType: "Prepaid",
    network: "Visa",
    balance: 1800
  },
  {
    id: "card3",
    type: "Card",
    provider: "Demo Mastercard",
    number: "Mastercard •••• 1188",
    cardType: "Debit",
    network: "Mastercard",
    balance: 2200
  },
  {
    id: "wallet1",
    type: "BEAST Wallet",
    provider: "BEAST Wallet",
    number: "Main Wallet",
    walletType: "Personal Wallet",
    balance: 5000
  }
];


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(message) {
  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function nowText() {
  return new Date().toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function reference(prefix = "BEAST") {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   PHONE
   ========================================================= */

function normalizeKenyanPhone(value) {
  let phone = String(value || "")
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (phone.startsWith("+254")) {
    phone = "0" + phone.slice(4);
  }

  if (phone.startsWith("254")) {
    phone = "0" + phone.slice(3);
  }

  return phone;
}

function validKenyanPhone(value) {
  return /^07\d{8}$|^01\d{8}$/.test(
    normalizeKenyanPhone(value)
  );
}


/* =========================================================
   BEAST ID
   ========================================================= */

function generateBeastId(name) {
  const first = String(name || "USER")
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 5);

  const digits = Math.floor(
    100 + Math.random() * 900
  );

  return `BEAST${first}${digits}`;
}


/* =========================================================
   LOAD STATE
   ========================================================= */

function loadState() {

  const stored = localStorage.getItem(KEY);

  if (stored) {
    try {
      state = JSON.parse(stored);
    } catch {
      state = null;
    }
  }

  if (!state) {

    state = {
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

      sources: DEFAULT_SOURCES.map(x => ({ ...x })),

      history: []
    };
  }

  state.sources ||= DEFAULT_SOURCES.map(x => ({ ...x }));
  state.history ||= [];

  state.settings ||= {
    securityAlerts: true,
    notifications: true
  };
}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

  document.body.classList.toggle(
    "light-mode",
    !state.dark
  );

  const toggle = $("lightModeToggle");

  if (toggle) {
    toggle.checked = !state.dark;
  }
}


/* =========================================================
   REGISTRATION
   ========================================================= */

function setupRegistration() {

  const regScreen = $("registrationScreen");
  const app = $("beastApp");

  if (!regScreen || !app) return;

  if (state.registered) {
    regScreen.classList.add("hidden");
    app.classList.remove("hidden");

    updateDashboard();
    renderAllSources();
    return;
  }

  regScreen.classList.remove("hidden");
  app.classList.add("hidden");

  const step1 = $("registrationStep1");
  const step2 = $("registrationStep2");
  const step3 = $("registrationStep3");

  const dot1 = $("dot1");
  const dot2 = $("dot2");
  const dot3 = $("dot3");

  function showStep(number) {

    [step1, step2, step3].forEach(
      step => step.classList.remove("active")
    );

    [dot1, dot2, dot3].forEach(
      dot => dot.classList.remove("active")
    );

    if (number === 1) {
      step1.classList.add("active");
      dot1.classList.add("active");
    }

    if (number === 2) {
      step2.classList.add("active");
      dot1.classList.add("active");
      dot2.classList.add("active");
    }

    if (number === 3) {
      step3.classList.add("active");
      dot1.classList.add("active");
      dot2.classList.add("active");
      dot3.classList.add("active");
    }
  }

  $("registrationNext1").onclick = () => {

    const name = $("registrationName").value.trim();
    const phone = normalizeKenyanPhone(
      $("registrationPhone").value
    );
    const nationalId = $("registrationId").value.trim();

    if (!name) {
      toast("Enter your full name.");
      return;
    }

    if (!validKenyanPhone(phone)) {
      toast("Enter a valid Kenyan phone number.");
      return;
    }

    if (!nationalId) {
      toast("Enter your National ID.");
      return;
    }

    $("registrationPhone").value = phone;

    showStep(2);
  };


  $("registrationBack1").onclick = () => {
    showStep(1);
  };


  $("registrationNext2").onclick = () => {

    const pin = $("registrationPin").value;
    const confirm = $("registrationPinConfirm").value;

    if (!/^\d{4,6}$/.test(pin)) {
      toast("BEAST PIN must contain 4–6 digits.");
      return;
    }

    if (pin !== confirm) {
      toast("PIN confirmation does not match.");
      return;
    }

    const name = $("registrationName").value.trim();
    const phone = normalizeKenyanPhone(
      $("registrationPhone").value
    );
    const nationalId = $("registrationId").value.trim();

    const beastId = generateBeastId(name);

    $("registrationSummaryName").textContent = name;
    $("registrationSummaryPhone").textContent = phone;
    $("registrationSummaryId").textContent = nationalId;
    $("registrationBeastId").textContent = beastId;

    showStep(3);
  };


  $("registrationBack2").onclick = () => {
    showStep(2);
  };


  $("registrationFinish").onclick = () => {

    const name = $("registrationName").value.trim();
    const phone = normalizeKenyanPhone(
      $("registrationPhone").value
    );
    const nationalId = $("registrationId").value.trim();
    const pin = $("registrationPin").value;

    const beastId =
      $("registrationBeastId").textContent.trim();

    state.registered = true;
    state.fullName = name;
    state.phone = phone;
    state.nationalId = nationalId;
    state.beastId = beastId;
    state.beastPin = pin;

    if (!state.sources?.length) {
      state.sources = DEFAULT_SOURCES.map(x => ({ ...x }));
    }

    state.balance = state.sources.reduce(
      (sum, source) => sum + Number(source.balance || 0),
      0
    );

    localStorage.setItem(
      REG_KEY,
      JSON.stringify({
        fullName: name,
        phone,
        nationalId,
        beastId
      })
    );

    save();

    regScreen.classList.add("hidden");
    app.classList.remove("hidden");

    updateDashboard();
    renderAllSources();

    toast("🎉 BEAST account created successfully.");
  };
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

  $("dashboardName").textContent =
    state.fullName || "BEAST USER";

  $("dashboardBeastId").textContent =
    state.beastId || "BEAST123";

  $("dashboardBalance").textContent =
    money(state.balance);
}


/* =========================================================
   SOURCE ICON
   ========================================================= */

function sourceIcon(type) {

  if (type === "M-PESA") return "🟢";
  if (type === "Airtel Money") return "🔴";
  if (type === "Bank") return "🏦";
  if (type === "Card") return "💳";
  if (type === "BEAST Wallet") return "🦁";

  return "💰";
}


/* =========================================================
   SOURCE DETAILS
   ========================================================= */

function renderSourceDetails(source, container) {

  if (!container || !source) return;

  let html = `
    <h4>${escapeHTML(sourceIcon(source.type))} 
        ${escapeHTML(source.provider)}</h4>
  `;

  html += `
    <div class="detail-row">
      <span>Type</span>
      <strong>${escapeHTML(source.type)}</strong>
    </div>
  `;

  html += `
    <div class="detail-row">
      <span>Account / Number</span>
      <strong>${escapeHTML(source.number)}</strong>
    </div>
  `;

  if (source.label) {
    html += `
      <div class="detail-row">
        <span>Line</span>
        <strong>${escapeHTML(source.label)}</strong>
      </div>
    `;
  }

  if (source.accountType) {
    html += `
      <div class="detail-row">
        <span>Account Type</span>
        <strong>${escapeHTML(source.accountType)}</strong>
      </div>
    `;
  }

  if (source.cardType) {
    html += `
      <div class="detail-row">
        <span>Card Type</span>
        <strong>${escapeHTML(source.cardType)}</strong>
      </div>
    `;
  }

  if (source.network) {
    html += `
      <div class="detail-row">
        <span>Network</span>
        <strong>${escapeHTML(source.network)}</strong>
      </div>
    `;
  }

  if (source.walletType) {
    html += `
      <div class="detail-row">
        <span>Wallet Type</span>
        <strong>${escapeHTML(source.walletType)}</strong>
      </div>
    `;
  }

  html += `
    <div class="detail-row">
      <span>Available Balance</span>
      <strong>KES ${money(source.balance)}</strong>
    </div>
  `;

  container.innerHTML = html;
  container.classList.remove("hidden");
}


/* =========================================================
   SOURCE PICKER
   ========================================================= */

function renderSourcePicker(containerId, selectedId, callback) {

  const container = $(containerId);

  if (!container) return;

  container.innerHTML = "";

  state.sources.forEach(source => {

    const card = document.createElement("div");

    card.className =
      "source-card" +
      (source.id === selectedId ? " selected" : "");

    card.innerHTML = `
      <div class="source-icon">
        ${sourceIcon(source.type)}
      </div>

      <div class="source-name">
        ${escapeHTML(source.provider)}
      </div>

      <div class="source-number">
        ${escapeHTML(source.number)}
      </div>

      <div class="source-balance">
        KES ${money(source.balance)}
      </div>
    `;

    card.onclick = () => {

      callback(source);

      renderSourcePicker(
        containerId,
        source.id,
        callback
      );
    };

    container.appendChild(card);
  });
}


/* =========================================================
   SEND SOURCE
   ========================================================= */

function renderSendSourcePicker() {

  renderSourcePicker(
    "sendSourcePicker",
    selectedSendSource,
    source => {

      selectedSendSource = source.id;

      renderSourceDetails(
        source,
        $("sendSourceDetails")
      );
    }
  );

  const source = getSource(selectedSendSource);

  renderSourceDetails(
    source,
    $("sendSourceDetails")
  );
}


/* =========================================================
   BUYER SOURCE
   ========================================================= */

function renderBuyerSourcePicker() {

  renderSourcePicker(
    "buyerSourcePicker",
    selectedReceiveSource,
    source => {

      selectedReceiveSource = source.id;

      renderSourceDetails(
        source,
        $("buyerSourceDetails")
      );
    }
  );

  const source = getSource(selectedReceiveSource);

  renderSourceDetails(
    source,
    $("buyerSourceDetails")
  );
}


/* =========================================================
   WITHDRAW SOURCE
   ========================================================= */

function renderWithdrawSourcePicker() {

  renderSourcePicker(
    "withdrawSourcePicker",
    selectedReceiveSource,
    source => {

      selectedReceiveSource = source.id;

      renderSourceDetails(
        source,
        $("withdrawSourceDetails")
      );
    }
  );

  const source = getSource(selectedReceiveSource);

  renderSourceDetails(
    source,
    $("withdrawSourceDetails")
  );
}


/* =========================================================
   LIPA SOURCE
   ========================================================= */

function renderLipaSourcePicker() {

  renderSourcePicker(
    "lipaSourcePicker",
    selectedLipaSource,
    source => {

      selectedLipaSource = source.id;

      renderSourceDetails(
        source,
        $("lipaSourceDetails")
      );
    }
  );

  const source = getSource(selectedLipaSource);

  renderSourceDetails(
    source,
    $("lipaSourceDetails")
  );
}


/* =========================================================
   GET SOURCE
   ========================================================= */

function getSource(id) {
  return state.sources.find(
    source => source.id === id
  );
}


/* =========================================================
   RENDER ALL SOURCES
   ========================================================= */

function renderAllSources() {

  renderSendSourcePicker();
  renderBuyerSourcePicker();
  renderWithdrawSourcePicker();
  renderLipaSourcePicker();
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  document.querySelectorAll(
    ".nav-btn, .bottom-nav-btn"
  ).forEach(button => {

    button.addEventListener("click", () => {

      const panelId =
        button.dataset.panel;

      if (!panelId) {
        openSettings();
        return;
      }

      showPanel(panelId);
    });
  });
}

function showPanel(panelId) {

  document.querySelectorAll(".panel")
    .forEach(panel => {
      panel.classList.remove("active");
    });

  const panel = $(panelId);

  if (panel) {
    panel.classList.add("active");
  }

  document.querySelectorAll(
    ".nav-btn, .bottom-nav-btn"
  ).forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.panel === panelId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SEND
   ========================================================= */

function setupSend() {

  $("verifyRecipientBtn").onclick = () => {

    const recipient =
      normalizeKenyanPhone(
        $("sendRecipient").value
      );

    if (
      !validKenyanPhone(recipient) &&
      recipient.length < 6
    ) {
      toast("Enter a valid recipient number/account.");
      return;
    }

    sendRecipientVerified = true;

    $("recipientVerification").innerHTML = `
      <strong>✓ RECIPIENT VERIFIED</strong>
      <span>
        KRISH DEMO RECIPIENT
      </span>
    `;

    $("recipientVerification")
      .classList.remove("hidden");

    toast("Recipient verified.");
  };


  $("sendMoneyBtn").onclick = () => {

    if (!sendRecipientVerified) {
      toast("Verify the recipient first.");
      return;
    }

    const amount =
      Number($("sendAmount").value);

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    const source =
      getSource(selectedSendSource);

    if (!source) {
      toast("Select a payment source.");
      return;
    }

    if (source.balance < amount) {
      toast("Insufficient source balance.");
      return;
    }

    openFinalSendAuthorization(
      amount,
      source
    );
  };
}


/* =========================================================
   SEND AUTH
   ========================================================= */

function openFinalSendAuthorization(amount, source) {

  const pin = prompt(
    "BEAST SECURITY\n\nEnter your BEAST PIN to authorize this demo transfer:"
  );

  if (pin === null) return;

  if (pin !== state.beastPin) {
    toast("Invalid BEAST PIN.");
    return;
  }

  completeSendTransaction(
    amount,
    source
  );
}


function completeSendTransaction(amount, source) {

  source.balance -= amount;
  state.balance -= amount;

  state.history.unshift({
    title: "Money Sent",
    amount: -amount,
    source: source.provider,
    recipient: "KRISH DEMO RECIPIENT",
    status: "Completed",
    reference: reference("SEND"),
    date: nowText()
  });

  save();

  $("sendAmount").value = "";
  $("sendRecipient").value = "";

  sendRecipientVerified = false;

  $("recipientVerification")
    .classList.add("hidden");

  updateDashboard();
  renderAllSources();
  renderHistory();

  toast(
    `✓ KES ${money(amount)} sent successfully.`
  );
}


/* =========================================================
   RECEIVE SELL OPTIONS
   ========================================================= */

function setupReceiveOptions() {

  document.querySelectorAll(
    ".sell-option"
  ).forEach(button => {

    button.onclick = () => {

      document.querySelectorAll(
        ".sell-option"
      ).forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");

      currentSellType =
        button.dataset.sellType;

      $("receivePaybillFields")
        .classList.toggle(
          "hidden",
          currentSellType !== "paybill"
        );

      $("receiveBuygoodsFields")
        .classList.toggle(
          "hidden",
          currentSellType !== "buygoods"
        );

      $("receivePochiFields")
        .classList.toggle(
          "hidden",
          currentSellType !== "pochi"
        );

      resetReceiveVerification();
    };
  });
}


/* =========================================================
   VERIFY SELLER
   ========================================================= */

function setupReceive() {

  $("verifyReceiveBtn").onclick = () => {

    let valid = false;

    if (currentSellType === "paybill") {

      valid =
        $("receiveBusinessNumber").value.trim() &&
        $("receiveAccountNumber").value.trim();

      receiveSeller =
        "KRISH DEMO BUSINESS";
    }

    if (currentSellType === "buygoods") {

      valid =
        $("receiveTillNumber").value.trim();

      receiveSeller =
        "KRISH DEMO SHOP";
    }

    if (currentSellType === "pochi") {

      const phone =
        normalizeKenyanPhone(
          $("receiveSellerPhone").value
        );

      valid = validKenyanPhone(phone);

      receiveSeller =
        "KRISH DEMO SELLER";
    }

    if (!valid) {
      toast("Enter the seller details first.");
      return;
    }

    receiveVerified = true;

    $("receiveSellerVerification").innerHTML = `
      <strong>✓ SELLER VERIFIED</strong>
      <span>
        ${escapeHTML(receiveSeller)}
      </span>
    `;

    $("receiveSellerVerification")
      .classList.remove("hidden");

    $("buyerFundingSection")
      .classList.remove("hidden");

    renderBuyerSourcePicker();

    toast("Seller verified.");
  };


  $("buyerNoPhoneCardBtn").onclick = () => {
    openBuyerLogin();
  };


  $("buyerLoginBtn").onclick = () => {
    openBuyerLogin();
  };
}


/* =========================================================
   RECEIVE RESET
   ========================================================= */

function resetReceiveVerification() {

  receiveVerified = false;
  receiveSeller = null;

  $("receiveSellerVerification")
    .classList.add("hidden");

  $("buyerFundingSection")
    .classList.add("hidden");
}


/* =========================================================
   BUYER LOGIN
   ========================================================= */

function openBuyerLogin() {

  if (!receiveVerified) {
    toast("Verify the seller first.");
    return;
  }

  $("buyerLoginPhone").value = "";
  $("buyerLoginBeastId").value = "";
  $("buyerLoginPin").value = "";

  $("buyerLoginModal")
    .classList.remove("hidden");
}


function setupBuyerLogin() {

  $("buyerLoginContinue").onclick = () => {

    const phone =
      normalizeKenyanPhone(
        $("buyerLoginPhone").value
      );

    const beastId =
      $("buyerLoginBeastId")
        .value
        .trim()
        .toUpperCase();

    const pin =
      $("buyerLoginPin").value;

    if (phone !== state.phone) {
      toast("Invalid registered phone number.");
      return;
    }

    if (beastId !== state.beastId.toUpperCase()) {
      toast("Invalid BEAST ID.");
      return;
    }

    if (pin !== state.beastPin) {
      toast("Invalid BEAST PIN.");
      return;
    }

    closeModal("buyerLoginModal");

    requestSellerApproval();
  };
}


/* =========================================================
   SELLER APPROVAL
   ========================================================= */

function requestSellerApproval() {

  const amount =
    Number($("receiveAmount").value);

  if (!amount || amount <= 0) {
    toast("Enter the payment amount first.");
    return;
  }

  const source =
    getSource(selectedReceiveSource);

  if (!source) {
    toast("Select a buyer payment source.");
    return;
  }

  if (source.balance < amount) {
    toast("Insufficient buyer source balance.");
    return;
  }

  $("sellerApprovalDetails").innerHTML = `
    <div class="detail-row">
      <span>Seller</span>
      <strong>${escapeHTML(receiveSeller)}</strong>
    </div>

    <div class="detail-row">
      <span>Amount</span>
      <strong>KES ${money(amount)}</strong>
    </div>

    <div class="detail-row">
      <span>Source</span>
      <strong>${escapeHTML(source.provider)}</strong>
    </div>
  `;

  $("sellerApprovalModal")
    .classList.remove("hidden");
}


/* =========================================================
   SELLER APPROVAL BUTTONS
   ========================================================= */

function setupSellerApproval() {

  $("sellerRejectBtn").onclick = () => {

    closeModal("sellerApprovalModal");

    toast("Seller rejected the payment.");
  };


  $("sellerApproveBtn").onclick = () => {

    closeModal("sellerApprovalModal");

    openFinalReceiveAuthorization();
  };
}


/* =========================================================
   FINAL RECEIVE AUTH
   ========================================================= */

function openFinalReceiveAuthorization() {

  const amount =
    Number($("receiveAmount").value);

  const source =
    getSource(selectedReceiveSource);

  if (!source) {
    toast("Payment source unavailable.");
    return;
  }

  $("finalAuthDetails").innerHTML = `
    <div class="detail-row">
      <span>Seller</span>
      <strong>${escapeHTML(receiveSeller)}</strong>
    </div>

    <div class="detail-row">
      <span>Amount</span>
      <strong>KES ${money(amount)}</strong>
    </div>

    <div class="detail-row">
      <span>Source</span>
      <strong>${escapeHTML(source.provider)}</strong>
    </div>

    <div class="detail-row">
      <span>Status</span>
      <strong style="color:var(--success)">
        Seller Approved
      </strong>
    </div>
  `;

  $("finalAuthPin").value = "";

  $("finalAuthModal")
    .classList.remove("hidden");
}


function setupFinalAuthorization() {

  $("finalAuthContinue").onclick = () => {

    const pin =
      $("finalAuthPin").value;

    if (pin !== state.beastPin) {
      toast("Invalid BEAST PIN.");
      return;
    }

    completeReceiveTransaction();
  };
}


/* =========================================================
   RECEIVE COMPLETE
   ========================================================= */

function completeReceiveTransaction() {

  const amount =
    Number($("receiveAmount").value);

  const source =
    getSource(selectedReceiveSource);

  if (!source || !amount || amount <= 0) {
    toast("Invalid payment.");
    return;
  }

  if (source.balance < amount) {
    toast("Insufficient source balance.");
    closeModal("finalAuthModal");
    return;
  }

  source.balance -= amount;

  state.balance -= amount;

  state.history.unshift({
    title: "Payment Made",
    amount: -amount,
    source: source.provider,
    recipient: receiveSeller,
    status: "Completed",
    reference: reference("PAY"),
    date: nowText()
  });

  save();

  closeModal("finalAuthModal");

  $("receiveAmount").value = "";

  updateDashboard();
  renderAllSources();
  renderHistory();

  toast(
    `✓ Payment of KES ${money(amount)} completed.`
  );

  resetReceiveVerification();
}


/* =========================================================
   WITHDRAW
   ========================================================= */

function setupWithdrawal() {

  $("verifyWithdrawalBtn").onclick = () => {

    const agent =
      normalizeKenyanPhone(
        $("withdrawAgentNumber").value
      );

    if (!validKenyanPhone(agent)) {
      toast("Enter a valid agent number.");
      return;
    }

    withdrawalVerified = true;

    $("withdrawVerification").innerHTML = `
      <strong>✓ AGENT VERIFIED</strong>
      <span>
        KRISH DEMO AGENT<br>
        Agent: ${escapeHTML(agent)}
      </span>
    `;

    $("withdrawVerification")
      .classList.remove("hidden");

    toast("Agent details verified.");
  };


  $("withdrawBtn").onclick = () => {

    if (!withdrawalVerified) {
      toast("Verify the agent first.");
      return;
    }

    const amount =
      Number($("withdrawAmount").value);

    const source =
      getSource(selectedReceiveSource);

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    if (!source) {
      toast("Select a withdrawal source.");
      return;
    }

    if (source.balance < amount) {
      toast("Insufficient source balance.");
      return;
    }

    const pin = prompt(
      "BEAST SECURITY\n\nEnter your BEAST PIN:"
    );

    if (pin === null) return;

    if (pin !== state.beastPin) {
      toast("Invalid BEAST PIN.");
      return;
    }

    source.balance -= amount;
    state.balance -= amount;

    state.history.unshift({
      title: "Agent Withdrawal",
      amount: -amount,
      source: source.provider,
      recipient: "KRISH DEMO AGENT",
      status: "Completed",
      reference: reference("OUT"),
      date: nowText()
    });

    save();

    $("withdrawAmount").value = "";

    updateDashboard();
    renderAllSources();
    renderHistory();

    toast(
      `✓ KES ${money(amount)} withdrawal completed.`
    );
  };
}


/* =========================================================
   LIPA OPTIONS
   ========================================================= */

function setupLipaOptions() {

  document.querySelectorAll(
    ".lipa-option"
  ).forEach(button => {

    button.onclick = () => {

      document.querySelectorAll(
        ".lipa-option"
      ).forEach(item =>
        item.classList.remove("active")
      );

      button.classList.add("active");

      currentLipaType =
        button.dataset.lipaType;

      renderLipaFields();
    };
  });

  renderLipaFields();
}


function renderLipaFields() {

  const container =
    $("lipaFields");

  if (!container) return;

  if (currentLipaType === "pochi") {

    container.innerHTML = `
      <label>Seller Phone Number</label>
      <input id="lipaPochiPhone"
             type="tel"
             placeholder="0712345678">
    `;
  }

  if (currentLipaType === "buygoods") {

    container.innerHTML = `
      <label>Till Number</label>
      <input id="lipaTill"
             type="text"
             placeholder="Enter Till Number">
    `;
  }

  if (currentLipaType === "paybill") {

    container.innerHTML = `
      <label>Business Number</label>
      <input id="lipaBusiness"
             type="text"
             placeholder="Enter Business Number">

      <label>Account Number</label>
      <input id="lipaAccount"
             type="text"
             placeholder="Enter Account Number">
    `;
  }

  lipaVerified = false;

  $("lipaVerification")
    .classList.add("hidden");

  renderLipaSourcePicker();
}


/* =========================================================
   LIPA VERIFY
   ========================================================= */

function setupLipa() {

  $("verifyLipaBtn").onclick = () => {

    let valid = false;
    let seller = "";

    if (currentLipaType === "pochi") {

      const phone =
        normalizeKenyanPhone(
          $("lipaPochiPhone").value
        );

      valid = validKenyanPhone(phone);
      seller = "KRISH DEMO SELLER";
    }

    if (currentLipaType === "buygoods") {

      valid =
        $("lipaTill").value.trim().length >= 3;

      seller = "KRISH DEMO SHOP";
    }

    if (currentLipaType === "paybill") {

      valid =
        $("lipaBusiness").value.trim() &&
        $("lipaAccount").value.trim();

      seller = "KRISH DEMO BUSINESS";
    }

    if (!valid) {
      toast("Enter valid payment details.");
      return;
    }

    lipaVerified = true;

    $("lipaVerification").innerHTML = `
      <strong>✓ PAYMENT TARGET VERIFIED</strong>
      <span>${escapeHTML(seller)}</span>
    `;

    $("lipaVerification")
      .classList.remove("hidden");

    $("lipaVerification")
      .dataset.seller = seller;

    toast("Payment target verified.");
  };


  $("lipaPayBtn").onclick = () => {

    if (!lipaVerified) {
      toast("Verify the payment target first.");
      return;
    }

    const amount =
      Number($("lipaAmount").value);

    const source =
      getSource(selectedLipaSource);

    if (!amount || amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    if (!source) {
      toast("Select a payment source.");
      return;
    }

    if (source.balance < amount) {
      toast("Insufficient source balance.");
      return;
    }

    const pin = prompt(
      "BEAST SECURITY\n\nEnter your BEAST PIN to authorize:"
    );

    if (pin === null) return;

    if (pin !== state.beastPin) {
      toast("Invalid BEAST PIN.");
      return;
    }

    const seller =
      $("lipaVerification").dataset.seller ||
      "KRISH DEMO SELLER";

    source.balance -= amount;
    state.balance -= amount;

    state.history.unshift({
      title: "Lipa Na Payment",
      amount: -amount,
      source: source.provider,
      recipient: seller,
      status: "Completed",
      reference: reference("LIPA"),
      date: nowText()
    });

    save();

    $("lipaAmount").value = "";

    updateDashboard();
    renderAllSources();
    renderHistory();

    toast(
      `✓ KES ${money(amount)} paid successfully.`
    );
  };
}


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {

  const container =
    $("historyList");

  if (!container) return;

  if (!state.history.length) {

    container.innerHTML = `
      <div class="history-empty">
        No transactions yet.
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.history.map(item => {

      const amount =
        Number(item.amount || 0);

      const sign =
        amount < 0 ? "-" : "+";

      return `
        <div class="history-item">

          <div class="history-main">

            <div>
              <div class="history-title">
                ${escapeHTML(item.title)}
              </div>

              <div class="history-date">
                ${escapeHTML(item.date)}
              </div>
            </div>

            <div class="history-amount">
              ${sign} KES ${money(Math.abs(amount))}
            </div>

          </div>

          <div class="history-meta">

            <span class="history-tag">
              ${escapeHTML(item.source)}
            </span>

            <span class="history-tag">
              ${escapeHTML(item.recipient)}
            </span>

            <span class="history-tag">
              ${escapeHTML(item.status)}
            </span>

            <span class="history-tag">
              ${escapeHTML(item.reference)}
            </span>

          </div>

        </div>
      `;
    }).join("");
}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

  $("settingsModal")
    .classList.remove("hidden");
}


function setupSettings() {

  $("settingsBtn").onclick =
    openSettings;

  $("bottomSettingsBtn").onclick =
    openSettings;


  $("lightModeToggle").onchange = event => {

    state.dark =
      !event.target.checked;

    applyTheme();
    save();

    toast(
      state.dark
        ? "Dark Mode enabled."
        : "Light Mode enabled."
    );
  };


  $("securityAlertsToggle").onchange =
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


  $("notificationsToggle").onchange =
    event => {

      state.settings.notifications =
        event.target.checked;

      save();

      toast(
        event.target.checked
          ? "Notifications enabled."
          : "Notifications disabled."
      );
    };


  $("logoutBtn").onclick = () => {

    closeModal("settingsModal");

    state.registered = false;

    save();

    location.reload();
  };


  document.querySelectorAll(
    "[data-settings-page]"
  ).forEach(button => {

    button.onclick = () => {

      openSettingsSubPage(
        button.dataset.settingsPage
      );
    };
  });


  document.querySelectorAll(
    "[data-close]"
  ).forEach(button => {

    button.onclick = () => {

      closeModal(
        button.dataset.close
      );
    };
  });
}


/* =========================================================
   SETTINGS SUB-PAGES
   ========================================================= */

function openSettingsSubPage(page) {

  const container =
    $("settingsSubContent");

  let title = "";
  let icon = "";
  let content = "";


  /* PERSONAL */
  if (page === "personal") {

    title = "Personal Details";
    icon = "👤";

    content = `
      <div class="info-card">
        <strong>Full Name</strong>
        <span>${escapeHTML(state.fullName)}</span>
      </div>

      <div class="info-card">
        <strong>Registered Phone</strong>
        <span>${escapeHTML(state.phone)}</span>
      </div>

      <div class="info-card">
        <strong>National ID</strong>
        <span>${escapeHTML(state.nationalId)}</span>
      </div>

      <div class="info-card">
        <strong>BEAST ID</strong>
        <span>${escapeHTML(state.beastId)}</span>
      </div>
    `;
  }


  /* LINES */
  if (page === "lines") {

    title = "Line Management";
    icon = "📱";

    const lines =
      state.sources.filter(
        source =>
          source.type === "M-PESA" ||
          source.type === "Airtel Money"
      );

    content = lines.map(source => `
      <div class="info-card">

        <strong>
          ${sourceIcon(source.type)}
          ${escapeHTML(source.provider)}
        </strong>

        <span>
          ${escapeHTML(source.number)}
        </span>

        <span class="service-balance">
          KES ${money(source.balance)}
        </span>

        ${
          source.label === "Primary Line"
            ? `<span class="primary-tag">PRIMARY</span>`
            : `<span class="line-status">CONNECTED</span>`
        }

      </div>
    `).join("");

    content += `
      <button class="secondary-btn full"
              onclick="toast('Demo: Add Line feature ready for backend integration.')">
        + ADD NEW LINE
      </button>
    `;
  }


  /* M-PESA */
  if (page === "mpesa") {

    title = "M-PESA";
    icon = "🟢";

    content =
      serviceCards(
        state.sources.filter(
          source => source.type === "M-PESA"
        )
      );
  }


  /* AIRTEL */
  if (page === "airtel") {

    title = "Airtel Money";
    icon = "🔴";

    content =
      serviceCards(
        state.sources.filter(
          source => source.type === "Airtel Money"
        )
      );
  }


  /* BANKS */
  if (page === "banks") {

    title = "Bank Accounts";
    icon = "🏦";

    content =
      serviceCards(
        state.sources.filter(
          source => source.type === "Bank"
        )
      );
  }


  /* CARDS */
  if (page === "cards") {

    title = "Cards";
    icon = "💳";

    content =
      serviceCards(
        state.sources.filter(
          source => source.type === "Card"
        )
      );
  }


  /* WALLET */
  if (page === "wallet") {

    title = "BEAST Wallet";
    icon = "🦁";

    content =
      serviceCards(
        state.sources.filter(
          source => source.type === "BEAST Wallet"
        )
      );
  }


  /* CHANGE PIN */
  if (page === "pin") {

    title = "Change BEAST PIN";
    icon = "🔐";

    content = `
      <p class="muted">
        Create a new 4–6 digit authorization PIN.
      </p>

      <label>Current BEAST PIN</label>
      <input id="oldPin"
             type="password"
             inputmode="numeric"
             maxlength="6"
             placeholder="Current PIN">

      <label>New BEAST PIN</label>
      <input id="newPin"
             type="password"
             inputmode="numeric"
             maxlength="6"
             placeholder="New PIN">

      <label>Confirm New PIN</label>
      <input id="confirmNewPin"
             type="password"
             inputmode="numeric"
             maxlength="6"
             placeholder="Confirm new PIN">

      <button id="saveNewPin"
              class="primary-btn full">
        CHANGE PIN
      </button>
    `;
  }


  container.innerHTML = `
    <div class="sub-page-title">
      <span>${icon}</span>
      <h2>${title}</h2>
    </div>

    ${content}
  `;

  $("settingsSubModal")
    .classList.remove("hidden");


  if (page === "pin") {

    $("saveNewPin").onclick = () => {

      const oldPin =
        $("oldPin").value;

      const newPin =
        $("newPin").value;

      const confirm =
        $("confirmNewPin").value;

      if (oldPin !== state.beastPin) {
        toast("Current PIN is incorrect.");
        return;
      }

      if (!/^\d{4,6}$/.test(newPin)) {
        toast("New PIN must contain 4–6 digits.");
        return;
      }

      if (newPin !== confirm) {
        toast("New PINs do not match.");
        return;
      }

      state.beastPin = newPin;

      save();

      closeModal("settingsSubModal");

      toast("✓ BEAST PIN changed successfully.");
    };
  }
}


/* =========================================================
   SERVICE CARDS
   ========================================================= */

function serviceCards(sources) {

  if (!sources.length) {

    return `
      <div class="history-empty">
        No connected service.
      </div>
    `;
  }

  return sources.map(source => {

    let extra = "";

    if (source.accountType) {
      extra += `
        <span>
          Account: ${escapeHTML(source.accountType)}
        </span>
      `;
    }

    if (source.cardType) {
      extra += `
        <span>
          Card: ${escapeHTML(source.cardType)}
        </span>
      `;
    }

    if (source.network) {
      extra += `
        <span>
          Network: ${escapeHTML(source.network)}
        </span>
      `;
    }

    if (source.walletType) {
      extra += `
        <span>
          Wallet: ${escapeHTML(source.walletType)}
        </span>
      `;
    }

    return `
      <div class="info-card">

        <strong>
          ${sourceIcon(source.type)}
          ${escapeHTML(source.provider)}
        </strong>

        <span>
          ${escapeHTML(source.number)}
        </span>

        ${extra}

        <span class="service-balance">
          KES ${money(source.balance)}
        </span>

        <span class="line-status">
          CONNECTED
        </span>

      </div>
    `;
  }).join("");
}


/* =========================================================
   MODALS
   ========================================================= */

function closeModal(id) {

  const modal = $(id);

  if (modal) {
    modal.classList.add("hidden");
  }
}


/* =========================================================
   SECURITY VISIBILITY CHECK
   ========================================================= */

function setupVisibilitySecurity() {

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden &&
        state.settings.securityAlerts &&
        state.registered
      ) {
        toast(
          "🛡️ BEAST security: session temporarily hidden."
        );
      }
    }
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadState();

    applyTheme();

    setupRegistration();

    setupNavigation();

    setupSend();

    setupReceiveOptions();

    setupReceive();

    setupBuyerLogin();

    setupSellerApproval();

    setupFinalAuthorization();

    setupWithdrawal();

    setupLipaOptions();

    setupLipa();

    setupSettings();

    setupVisibilitySecurity();

    renderHistory();

    updateDashboard();

    if (state.registered) {
      renderAllSources();
    }

  }
);