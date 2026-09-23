/* =========================================================
   MONEY TRANSFER BEAST
   Customer + Owner/Admin + Fee/Revenue + BEAST AI
   DEMO / LOCAL STORAGE VERSION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     STORAGE
  ======================================================= */

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

  let state = loadState();

  let selectedSendSource = null;
  let selectedReceiveSource = null;
  let selectedWithdrawSource = null;
  let selectedLipaSource = null;

  let receiveMethod = "paybill";
  let pendingReceive = null;

  let currentAdminSection = "overview";


  /* =======================================================
     HELPERS
     ======================================================= */

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(KEY);

      if (!saved) {
        return clone(DEFAULT_STATE);
      }

      const parsed = JSON.parse(saved);

      return {
        ...clone(DEFAULT_STATE),
        ...parsed,
        settings: {
          ...clone(DEFAULT_STATE).settings,
          ...(parsed.settings || {})
        },
        ownerLedger: {
          ...clone(DEFAULT_STATE).ownerLedger,
          ...(parsed.ownerLedger || {})
        },
        sources: parsed.sources || clone(DEFAULT_STATE.sources),
        history: parsed.history || [],
        securityLogs: parsed.securityLogs || []
      };

    } catch (e) {
      return clone(DEFAULT_STATE);
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function $(id) {
    return document.getElementById(id);
  }

  function money(value) {
    return `KES ${Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function shortMoney(value) {
    return `KES ${Number(value || 0).toLocaleString("en-KE", {
      maximumFractionDigits: 2
    })}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function now() {
    return new Date().toLocaleString("en-KE");
  }

  function reference() {
    return "BT" + Date.now().toString().slice(-10);
  }

  function toast(message) {
    const el = $("toast");

    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(window.__beastToast);

    window.__beastToast = setTimeout(() => {
      el.classList.remove("show");
    }, 3000);
  }

  function normalizeKenyanPhone(phone) {
    let p = String(phone || "").replace(/\s+/g, "");

    if (p.startsWith("+254")) {
      p = "0" + p.slice(4);
    }

    if (p.startsWith("254")) {
      p = "0" + p.slice(3);
    }

    return p;
  }

  function validKenyanPhone(phone) {
    return /^(07|01)\d{8}$/.test(normalizeKenyanPhone(phone));
  }

  function generateBeastId() {
    return "BEAST" + Math.floor(100000 + Math.random() * 900000);
  }

  function amountValue(id) {
    return Number($(id)?.value || 0);
  }

  function sourceById(id) {
    return state.sources.find(s => s.id === id);
  }

  function maskNumber(number) {
    const n = String(number || "");

    if (n.length <= 4) return n;

    return n.slice(0, 4) + "••••" + n.slice(-2);
  }


  /* =======================================================
     FEE ENGINE
     ======================================================= */

  /*
     IMPORTANT:
     These are DEMO BEAST fees.

     Provider charges are kept separate.
     Real current Safaricom/Airtel charges must be
     connected through the relevant provider/API/contract
     before production use.
  */

  function calculateBeastFee(type, amount) {
    amount = Number(amount || 0);

    if (amount <= 0) return 0;

    if (amount <= 1000) return 7;

    if (amount <= 10000) return 30;

    /*
      Not inventing a production tariff above 10,000.
      Demo configurable value:
    */
    return 30;
  }

  function calculateProviderFee(type, amount, source) {
    /*
      Demo placeholder.
      Real provider tariff should be connected here.
    */

    amount = Number(amount || 0);

    if (amount <= 0) return 0;

    /*
      Keep provider cost separate from BEAST revenue.
      We deliberately don't pretend this is a current
      provider tariff.
    */

    return 0;
  }

  function getFeeBreakdown(type, amount, source) {
    const providerFee = calculateProviderFee(
      type,
      amount,
      source
    );

    const beastFee = calculateBeastFee(
      type,
      amount
    );

    return {
      amount,
      providerFee,
      beastFee,
      total: amount + providerFee + beastFee
    };
  }


  /* =======================================================
     FEE SUMMARY UI
     ======================================================= */

  function renderFeeSummary(id, breakdown, recipientLabel = "Recipient") {
    const el = $(id);

    if (!el) return;

    if (!breakdown || breakdown.amount <= 0) {
      el.innerHTML = "";
      el.classList.remove("active");
      return;
    }

    el.classList.add("active");

    el.innerHTML = `
      <div class="fee-row">
        <span>Amount</span>
        <strong>${money(breakdown.amount)}</strong>
      </div>

      <div class="fee-row">
        <span>Provider cost</span>
        <strong>${money(breakdown.providerFee)}</strong>
      </div>

      <div class="fee-row revenue">
        <span>BEAST platform fee</span>
        <strong>${money(breakdown.beastFee)}</strong>
      </div>

      <div class="fee-row">
        <span>${escapeHTML(recipientLabel)}</span>
        <strong>${money(breakdown.amount)}</strong>
      </div>

      <div class="fee-row total">
        <span>Total debit</span>
        <strong>${money(breakdown.total)}</strong>
      </div>
    `;
  }


  /* =======================================================
     THEME
     ======================================================= */

  function applyTheme() {
    document.body.classList.toggle(
      "light-mode",
      !state.dark
    );
  }


  /* =======================================================
     REGISTRATION
     ======================================================= */

  function showRegistration() {
    $("registrationScreen")?.classList.remove("hidden");
    $("beastApp")?.classList.add("hidden");
  }

  function showApp() {
    $("registrationScreen")?.classList.add("hidden");
    $("beastApp")?.classList.remove("hidden");

    renderDashboard();
    renderAllSourcePickers();
    renderHistory();
    renderSettings();

    applyTheme();
  }

  function updateRegistrationDots(step) {
    document.querySelectorAll(".progress-dot").forEach((dot, index) => {
      dot.classList.toggle(
        "active",
        index < step
      );
    });
  }

  function showRegistrationStep(number) {
    document.querySelectorAll(".registration-step").forEach(el => {
      el.classList.remove("active");
    });

    $(`registrationStep${number}`)?.classList.add("active");

    updateRegistrationDots(number);
  }

  function setupRegistration() {

    $("registrationNext1")?.addEventListener("click", () => {

      const name = $("registrationName")?.value.trim();
      const phone = normalizeKenyanPhone(
        $("registrationPhone")?.value
      );
      const nationalId = $("registrationId")?.value.trim();

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

      showRegistrationStep(2);
    });


    $("registrationBack1")?.addEventListener(
      "click",
      () => showRegistrationStep(1)
    );


    $("registrationNext2")?.addEventListener("click", () => {

      const pin = $("registrationPin")?.value.trim();
      const confirm = $("registrationPinConfirm")?.value.trim();

      if (!/^\d{4,6}$/.test(pin)) {
        toast("BEAST PIN must contain 4–6 digits.");
        return;
      }

      if (pin !== confirm) {
        toast("PIN confirmation does not match.");
        return;
      }

      const name = $("registrationName")?.value.trim();
      const phone = normalizeKenyanPhone(
        $("registrationPhone")?.value
      );
      const id = $("registrationId")?.value.trim();

      $("registrationSummaryName").textContent = name;
      $("registrationSummaryPhone").textContent = phone;
      $("registrationSummaryId").textContent = id;

      const beastId = generateBeastId();

      $("registrationBeastId").textContent = beastId;

      showRegistrationStep(3);
    });


    $("registrationBack2")?.addEventListener(
      "click",
      () => showRegistrationStep(2)
    );


    $("registrationFinish")?.addEventListener(
      "click",
      () => {

        const name = $("registrationName")?.value.trim();
        const phone = normalizeKenyanPhone(
          $("registrationPhone")?.value
        );
        const nationalId = $("registrationId")?.value.trim();
        const pin = $("registrationPin")?.value.trim();
        const beastId =
          $("registrationBeastId")?.textContent.trim();

        state.registered = true;
        state.fullName = name;
        state.phone = phone;
        state.nationalId = nationalId;
        state.beastPin = pin;
        state.beastId = beastId;

        state.balance = calculateTotalBalance();

        save();

        toast("BEAST account created successfully.");

        showApp();
      }
    );
  }


  /* =======================================================
     DASHBOARD
     ======================================================= */

  function calculateTotalBalance() {
    return state.sources.reduce(
      (sum, source) => sum + Number(source.balance || 0),
      0
    );
  }

  function renderDashboard() {

    state.balance = calculateTotalBalance();

    if ($("dashboardBalance")) {
      $("dashboardBalance").textContent =
        money(state.balance);
    }

    if ($("dashboardBeastId")) {
      $("dashboardBeastId").textContent =
        state.beastId || "BEAST";
    }

    if ($("dashboardName")) {
      $("dashboardName").textContent =
        state.fullName || "BEAST CUSTOMER";
    }
  }


  /* =======================================================
     SOURCE PICKERS
     ======================================================= */

  function sourceHTML(source, selected) {

    return `
      <div
        class="source-card ${selected ? "selected" : ""}"
        data-source-id="${escapeHTML(source.id)}"
      >
        <div class="source-name">
          ${escapeHTML(source.provider)}
        </div>

        <div class="source-number">
          ${escapeHTML(maskNumber(source.number))}
        </div>

        <div class="source-number">
          ${escapeHTML(source.label)}
        </div>

        <div class="source-balance">
          ${money(source.balance)}
        </div>
      </div>
    `;
  }

  function renderSourcePicker(containerId, selectedId, callback) {

    const container = $(containerId);

    if (!container) return;

    container.innerHTML = state.sources
      .map(source => sourceHTML(
        source,
        source.id === selectedId
      ))
      .join("");

    container.querySelectorAll(
      "[data-source-id]"
    ).forEach(card => {

      card.addEventListener("click", () => {

        const id = card.dataset.sourceId;

        callback(id);

        renderSourcePicker(
          containerId,
          id,
          callback
        );
      });

    });
  }

  function renderAllSourcePickers() {

    renderSourcePicker(
      "sendSourcePicker",
      selectedSendSource,
      id => {
        selectedSendSource = id;
        renderSendSourceDetails();
        updateSendFee();
      }
    );

    renderSourcePicker(
      "receiveSourcePicker",
      selectedReceiveSource,
      id => {
        selectedReceiveSource = id;
        renderReceiveSourceDetails();
        updateReceiveFee();
      }
    );

    renderSourcePicker(
      "withdrawSourcePicker",
      selectedWithdrawSource,
      id => {
        selectedWithdrawSource = id;
        renderWithdrawSourceDetails();
        updateWithdrawFee();
      }
    );

    renderSourcePicker(
      "lipaSourcePicker",
      selectedLipaSource,
      id => {
        selectedLipaSource = id;
        renderLipaSourceDetails();
        updateLipaFee();
      }
    );
  }

  function renderSendSourceDetails() {
    renderSourceDetails(
      "sendSourceDetails",
      selectedSendSource
    );
  }

  function renderReceiveSourceDetails() {
    renderSourceDetails(
      "receiveSourceDetails",
      selectedReceiveSource
    );
  }

  function renderWithdrawSourceDetails() {
    renderSourceDetails(
      "withdrawSourceDetails",
      selectedWithdrawSource
    );
  }

  function renderLipaSourceDetails() {
    renderSourceDetails(
      "lipaSourceDetails",
      selectedLipaSource
    );
  }

  function renderSourceDetails(containerId, sourceId) {

    const el = $(containerId);

    if (!el) return;

    const source = sourceById(sourceId);

    if (!source) {
      el.innerHTML =
        `<div class="muted">Select a payment source.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="verify-box">
        <strong>${escapeHTML(source.provider)}</strong>
        <div class="muted">
          ${escapeHTML(source.number)}
          • ${escapeHTML(source.label)}
        </div>
        <div class="source-balance">
          ${money(source.balance)}
        </div>
      </div>
    `;
  }


  /* =======================================================
     SEND
     ======================================================= */

  function setupSend() {

    $("sendVerifyRecipient")?.addEventListener(
      "click",
      verifySendRecipient
    );

    $("sendAmount")?.addEventListener(
      "input",
      updateSendFee
    );

    $("sendButton")?.addEventListener(
      "click",
      beginSend
    );
  }

  function verifySendRecipient() {

    const phone =
      $("sendRecipient")?.value.trim();

    if (!phone) {
      toast("Enter recipient phone/account.");
      return;
    }

    const box = $("sendRecipientVerification");

    if (box) {
      box.innerHTML = `
        <div class="verify-name">
          ✓ KRISH DEMO RECIPIENT
        </div>
        <div class="muted">
          Recipient verified for this demo.
        </div>
      `;
    }

    updateSendFee();
  }

  function updateSendFee() {

    const amount = amountValue("sendAmount");
    const source = sourceById(selectedSendSource);

    renderFeeSummary(
      "sendFeeSummary",
      getFeeBreakdown("send", amount, source)
    );
  }

  function beginSend() {

    const source = sourceById(selectedSendSource);
    const amount = amountValue("sendAmount");
    const recipient =
      $("sendRecipient")?.value.trim();

    if (!source) {
      toast("Select a payment source.");
      return;
    }

    if (!recipient) {
      toast("Enter recipient.");
      return;
    }

    if (amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    const fees =
      getFeeBreakdown("send", amount, source);

    if (source.balance < fees.total) {
      toast("Insufficient source balance.");
      return;
    }

    openPinModal(
      "Confirm Send",
      fees,
      () => completeSendTransaction(
        source,
        amount,
        fees,
        recipient
      )
    );
  }

  function completeSendTransaction(
    source,
    amount,
    fees,
    recipient
  ) {

    source.balance -= fees.total;

    recordTransaction({
      type: "SEND",
      amount,
      source: source.provider,
      recipient,
      providerFee: fees.providerFee,
      beastFee: fees.beastFee,
      total: fees.total,
      status: "SUCCESS"
    });

    recordRevenue(fees);

    save();

    renderDashboard();
    renderAllSourcePickers();
    renderHistory();

    closeAllModals();

    toast("Transfer completed successfully.");
  }


  /* =======================================================
     RECEIVE / SELL
     ======================================================= */

  function setupReceive() {

    document.querySelectorAll(
      "[data-receive-method]"
    ).forEach(button => {

      button.addEventListener("click", () => {

        receiveMethod =
          button.dataset.receiveMethod;

        document.querySelectorAll(
          "[data-receive-method]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        renderReceiveForm();
      });
    });

    $("verifyReceiveDetails")?.addEventListener(
      "click",
      verifyReceiveDetails
    );

    $("receiveAmount")?.addEventListener(
      "input",
      updateReceiveFee
    );

    $("receiveButton")?.addEventListener(
      "click",
      beginReceive
    );

    $("buyerUnavailable")?.addEventListener(
      "click",
      openBuyerLogin
    );

    $("sellerApprove")?.addEventListener(
      "click",
      sellerApprove
    );

    $("sellerReject")?.addEventListener(
      "click",
      () => {
        closeModal("sellerApprovalModal");
        toast("Seller rejected the payment.");
      }
    );

    $("finalAuthorize")?.addEventListener(
      "click",
      finalReceiveAuthorization
    );
  }

  function renderReceiveForm() {

    const fields = $("receiveDynamicFields");

    if (!fields) return;

    if (receiveMethod === "paybill") {

      fields.innerHTML = `
        <div class="input-group">
          <label>Business Number</label>
          <input
            id="receiveBusinessNumber"
            placeholder="e.g. 123456"
          >
        </div>

        <div class="input-group">
          <label>Account Number</label>
          <input
            id="receiveAccountNumber"
            placeholder="Account number"
          >
        </div>
      `;

    } else if (receiveMethod === "buygoods") {

      fields.innerHTML = `
        <div class="input-group">
          <label>Till Number</label>
          <input
            id="receiveTillNumber"
            placeholder="Till number"
          >
        </div>
      `;

    } else {

      fields.innerHTML = `
        <div class="input-group">
          <label>Seller Phone Number</label>
          <input
            id="receiveSellerPhone"
            placeholder="07XXXXXXXX"
          >
        </div>
      `;
    }
  }

  function verifyReceiveDetails() {

    let sellerName = "";
    let destination = "";

    if (receiveMethod === "paybill") {

      const business =
        $("receiveBusinessNumber")?.value.trim();

      const account =
        $("receiveAccountNumber")?.value.trim();

      if (!business || !account) {
        toast("Enter business and account number.");
        return;
      }

      sellerName = "KRISH DEMO BUSINESS";
      destination =
        `${business} / ${account}`;

    } else if (receiveMethod === "buygoods") {

      const till =
        $("receiveTillNumber")?.value.trim();

      if (!till) {
        toast("Enter Till Number.");
        return;
      }

      sellerName = "KRISH DEMO SHOP";
      destination = till;

    } else {

      const phone =
        normalizeKenyanPhone(
          $("receiveSellerPhone")?.value
        );

      if (!validKenyanPhone(phone)) {
        toast("Enter a valid seller phone.");
        return;
      }

      sellerName = "KRISH DEMO SELLER";
      destination = phone;
    }

    pendingReceive = {
      sellerName,
      destination,
      method: receiveMethod
    };

    const box = $("receiveVerification");

    if (box) {
      box.innerHTML = `
        <div class="verify-name">
          ✓ ${escapeHTML(sellerName)}
        </div>

        <div class="muted">
          ${escapeHTML(destination)}
        </div>

        <div class="muted">
          Seller verified. Buyer approval is required.
        </div>
      `;
    }

    $("receiveBuyerArea")?.classList.remove("hidden");

    updateReceiveFee();
  }

  function updateReceiveFee() {

    const amount =
      amountValue("receiveAmount");

    const source =
      sourceById(selectedReceiveSource);

    renderFeeSummary(
      "receiveFeeSummary",
      getFeeBreakdown(
        "receive",
        amount,
        source
      )
    );
  }

  function beginReceive() {

    if (!pendingReceive) {
      toast("Verify the seller first.");
      return;
    }

    const source =
      sourceById(selectedReceiveSource);

    const amount =
      amountValue("receiveAmount");

    if (!source) {
      toast("Select buyer funding source.");
      return;
    }

    if (amount <= 0) {
      toast("Enter a valid amount.");
      return;
    }

    const fees =
      getFeeBreakdown(
        "receive",
        amount,
        source
      );

    if (source.balance < fees.total) {
      toast("Insufficient buyer balance.");
      return;
    }

    openBuyerLogin();
  }

  function openBuyerLogin() {

    openModal("buyerLoginModal");

    const phoneInput = $("buyerPhone");

    if (phoneInput) {
      phoneInput.value = "";
    }

    if ($("buyerBeastId")) {
      $("buyerBeastId").value = "";
    }

    if ($("buyerBeastPin")) {
      $("buyerBeastPin").value = "";
    }
  }

  function buyerLoginContinue() {

    const phone =
      normalizeKenyanPhone(
        $("buyerPhone")?.value
      );

    const beastId =
      $("buyerBeastId")?.value.trim();

    const pin =
      $("buyerBeastPin")?.value.trim();

    if (
      phone !== state.phone ||
      beastId !== state.beastId ||
      pin !== state.beastPin
    ) {
      toast("Invalid buyer login details.");
      return;
    }

    closeModal("buyerLoginModal");

    openModal("sellerApprovalModal");

    addSecurityLog(
      "Buyer login verified",
      "Buyer authentication succeeded."
    );
  }

  function sellerApprove() {

    closeModal("sellerApprovalModal");

    const source =
      sourceById(selectedReceiveSource);

    const amount =
      amountValue("receiveAmount");

    const fees =
      getFeeBreakdown(
        "receive",
        amount,
        source
      );

    if (!source || source.balance < fees.total) {
      toast("Payment can no longer be completed.");
      return;
    }

    openModal("finalAuthorizationModal");
  }

  function finalReceiveAuthorization() {

    const pin =
      $("finalAuthorizationPin")?.value.trim();

    if (pin !== state.beastPin) {
      toast("Incorrect BEAST PIN.");
      return;
    }

    completeReceiveTransaction();
  }

  function completeReceiveTransaction() {

    const source =
      sourceById(selectedReceiveSource);

    const amount =
      amountValue("receiveAmount");

    if (!source || !pendingReceive) return;

    const fees =
      getFeeBreakdown(
        "receive",
        amount,
        source
      );

    if (source.balance < fees.total) {
      toast("Insufficient balance.");
      return;
    }

    source.balance -= fees.total;

    recordTransaction({
      type: "RECEIVE / SELL",
      amount,
      source: source.provider,
      recipient: pendingReceive.sellerName,
      providerFee: fees.providerFee,
      beastFee: fees.beastFee,
      total: fees.total,
      status: "SUCCESS"
    });

    recordRevenue(fees);

    pendingReceive = null;

    save();

    renderDashboard();
    renderAllSourcePickers();
    renderHistory();

    closeAllModals();

    toast("Payment completed successfully.");
  }


  /* =======================================================
     WITHDRAW
     ======================================================= */

  function setupWithdraw() {

    $("verifyWithdrawalDetails")?.addEventListener(
      "click",
      verifyWithdrawalDetails
    );

    $("withdrawAmount")?.addEventListener(
      "input",
      updateWithdrawFee
    );

    $("withdrawButton")?.addEventListener(
      "click",
      beginWithdraw
    );
  }

  function verifyWithdrawalDetails() {

    const agent =
      $("withdrawAgentNumber")?.value.trim();

    const store =
      $("withdrawStoreNumber")?.value.trim();

    if (!agent) {
      toast("Enter agent number.");
      return;
    }

    if (store) {
      toast(
        `Withdrawal terminal ${agent} / ${store} verified.`
      );
    } else {
      toast(
        `Agent ${agent} verified.`
      );
    }
  }

  function updateWithdrawFee() {

    const amount =
      amountValue("withdrawAmount");

    const source =
      sourceById(selectedWithdrawSource);

    renderFeeSummary(
      "withdrawFeeSummary",
      getFeeBreakdown(
        "withdraw",
        amount,
        source
      ),
      "Cash payout"
    );
  }

  function beginWithdraw() {

    const source =
      sourceById(selectedWithdrawSource);

    const amount =
      amountValue("withdrawAmount");

    const agent =
      $("withdrawAgentNumber")?.value.trim();

    if (!source) {
      toast("Select withdrawal source.");
      return;
    }

    if (!agent) {
      toast("Enter agent number.");
      return;
    }

    if (amount <= 0) {
      toast("Enter valid amount.");
      return;
    }

    const fees =
      getFeeBreakdown(
        "withdraw",
        amount,
        source
      );

    if (source.balance < fees.total) {
      toast("Insufficient source balance.");
      return;
    }

    openPinModal(
      "Authorize Withdrawal",
      fees,
      () => {

        source.balance -= fees.total;

        recordTransaction({
          type: "WITHDRAW",
          amount,
          source: source.provider,
          recipient: `Agent ${agent}`,
          providerFee: fees.providerFee,
          beastFee: fees.beastFee,
          total: fees.total,
          status: "SUCCESS"
        });

        recordRevenue(fees);

        save();

        renderDashboard();
        renderAllSourcePickers();
        renderHistory();

        closeAllModals();

        toast(
          `${money(amount)} withdrawal completed.`
        );
      }
    );
  }


  /* =======================================================
     LIPA NA
     ======================================================= */

  function setupLipa() {

    document.querySelectorAll(
      "[data-lipa-method]"
    ).forEach(button => {

      button.addEventListener("click", () => {

        document.querySelectorAll(
          "[data-lipa-method]"
        ).forEach(btn => {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        renderLipaFields(
          button.dataset.lipaMethod
        );
      });
    });

    $("lipaAmount")?.addEventListener(
      "input",
      updateLipaFee
    );

    $("lipaVerify")?.addEventListener(
      "click",
      verifyLipa
    );

    $("lipaButton")?.addEventListener(
      "click",
      beginLipa
    );
  }

  function renderLipaFields(method) {

    const el = $("lipaDynamicFields");

    if (!el) return;

    if (method === "pochi") {

      el.innerHTML = `
        <div class="input-group">
          <label>Pochi Phone Number</label>
          <input
            id="lipaTarget"
            placeholder="07XXXXXXXX"
          >
        </div>
      `;

    } else if (method === "buygoods") {

      el.innerHTML = `
        <div class="input-group">
          <label>Till Number</label>
          <input
            id="lipaTarget"
            placeholder="Till number"
          >
        </div>
      `;

    } else {

      el.innerHTML = `
        <div class="input-group">
          <label>Business Number</label>
          <input
            id="lipaTarget"
            placeholder="Business number"
          >

          <label style="margin-top:12px">
            Account Number
          </label>

          <input
            id="lipaAccount"
            placeholder="Account number"
          >
        </div>
      `;
    }
  }

  function verifyLipa() {

    const target =
      $("lipaTarget")?.value.trim();

    if (!target) {
      toast("Enter payment destination.");
      return;
    }

    const box = $("lipaVerification");

    if (box) {
      box.innerHTML = `
        <div class="verify-name">
          ✓ KRISH DEMO MERCHANT
        </div>

        <div class="muted">
          Destination verified.
        </div>
      `;
    }

    updateLipaFee();
  }

  function updateLipaFee() {

    const amount =
      amountValue("lipaAmount");

    const source =
      sourceById(selectedLipaSource);

    renderFeeSummary(
      "lipaFeeSummary",
      getFeeBreakdown(
        "lipa",
        amount,
        source
      )
    );
  }

  function beginLipa() {

    const source =
      sourceById(selectedLipaSource);

    const amount =
      amountValue("lipaAmount");

    const target =
      $("lipaTarget")?.value.trim();

    if (!source) {
      toast("Select payment source.");
      return;
    }

    if (!target) {
      toast("Verify payment destination.");
      return;
    }

    if (amount <= 0) {
      toast("Enter amount.");
      return;
    }

    const fees =
      getFeeBreakdown(
        "lipa",
        amount,
        source
      );

    if (source.balance < fees.total) {
      toast("Insufficient balance.");
      return;
    }

    openPinModal(
      "Authorize Lipa Na Payment",
      fees,
      () => {

        source.balance -= fees.total;

        recordTransaction({
          type: "LIPA NA",
          amount,
          source: source.provider,
          recipient: target,
          providerFee: fees.providerFee,
          beastFee: fees.beastFee,
          total: fees.total,
          status: "SUCCESS"
        });

        recordRevenue(fees);

        save();

        renderDashboard();
        renderAllSourcePickers();
        renderHistory();

        closeAllModals();

        toast("Lipa Na payment completed.");
      }
    );
  }


  /* =======================================================
     PIN MODAL
     ======================================================= */

  let pinAction = null;

  function openPinModal(title, fees, callback) {

    pinAction = callback;

    if ($("pinModalTitle")) {
      $("pinModalTitle").textContent = title;
    }

    if ($("pinModalAmount")) {
      $("pinModalAmount").textContent =
        money(fees.total);
    }

    if ($("transactionPin")) {
      $("transactionPin").value = "";
    }

    openModal("pinModal");
  }

  function setupPinModal() {

    $("confirmPinButton")?.addEventListener(
      "click",
      () => {

        const pin =
          $("transactionPin")?.value.trim();

        if (pin !== state.beastPin) {
          toast("Incorrect BEAST PIN.");
          return;
        }

        const action = pinAction;

        pinAction = null;

        closeModal("pinModal");

        if (action) {
          action();
        }
      }
    );
  }


  /* =======================================================
     HISTORY
     ======================================================= */

  function recordTransaction(data) {

    const tx = {
      id: reference(),
      date: now(),
      ...data
    };

    state.history.unshift(tx);

    if (state.history.length > 500) {
      state.history =
        state.history.slice(0, 500);
    }
  }

  function recordRevenue(fees) {

    state.ownerLedger.beastFees +=
      Number(fees.beastFee || 0);

    state.ownerLedger.providerCosts +=
      Number(fees.providerFee || 0);

    state.ownerLedger.transactions.unshift({
      date: now(),
      beastFee: fees.beastFee,
      providerFee: fees.providerFee,
      amount: fees.amount,
      total: fees.total
    });
  }

  function renderHistory() {

    const list = $("historyList");

    if (!list) return;

    if (!state.history.length) {

      list.innerHTML = `
        <div class="card" style="padding:20px">
          <div class="muted">
            No transactions yet.
          </div>
        </div>
      `;

      return;
    }

    list.innerHTML = state.history.map(tx => {

      const sign =
        tx.type === "RECEIVE"
          ? "+"
          : "-";

      return `
        <div class="history-item">

          <div class="history-top">

            <div>
              <div class="history-title">
                ${escapeHTML(tx.type)}
              </div>

              <div class="history-meta">
                ${escapeHTML(tx.date)}
              </div>
            </div>

            <div class="history-amount">
              ${sign}${money(tx.amount)}
            </div>

          </div>

          <div class="history-meta">
            Source:
            ${escapeHTML(tx.source || "-")}
          </div>

          <div class="history-meta">
            To:
            ${escapeHTML(tx.recipient || "-")}
          </div>

          <div class="history-meta">
            Fee:
            ${money(tx.beastFee || 0)}
            • Ref:
            ${escapeHTML(tx.id)}
          </div>

          <span class="status-badge status-success">
            ${escapeHTML(tx.status || "SUCCESS")}
          </span>

        </div>
      `;

    }).join("");
  }


  /* =======================================================
     SETTINGS
     ======================================================= */

  function renderSettings() {

    if ($("settingsName")) {
      $("settingsName").textContent =
        state.fullName || "-";
    }

    if ($("settingsPhone")) {
      $("settingsPhone").textContent =
        state.phone || "-";
    }

    if ($("settingsBeastId")) {
      $("settingsBeastId").textContent =
        state.beastId || "-";
    }

    updateSwitch(
      "securityAlertsSwitch",
      state.settings.securityAlerts
    );

    updateSwitch(
      "notificationsSwitch",
      state.settings.notifications
    );
  }

  function updateSwitch(id, value) {

    const el = $(id);

    if (!el) return;

    el.classList.toggle("on", !!value);
  }


  /* =======================================================
     SECURITY LOGS
     ======================================================= */

  function addSecurityLog(title, body) {

    state.securityLogs.unshift({
      title,
      body,
      time: now()
    });

    if (state.securityLogs.length > 200) {
      state.securityLogs =
        state.securityLogs.slice(0, 200);
    }

    save();
  }

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.visibilityState === "hidden" &&
        state.settings.securityAlerts
      ) {

        addSecurityLog(
          "Session visibility changed",
          "BEAST detected that the browser page became hidden."
        );
      }
    }
  );


  /* =======================================================
     MODALS
     ======================================================= */

  function openModal(id) {
    $(id)?.classList.remove("hidden");
  }

  function closeModal(id) {
    $(id)?.classList.add("hidden");
  }

  function closeAllModals() {

    document.querySelectorAll(".modal")
      .forEach(modal => {
        modal.classList.add("hidden");
      });
  }

  document.querySelectorAll(
    "[data-close-modal]"
  ).forEach(button => {

    button.addEventListener("click", () => {

      closeModal(
        button.dataset.closeModal
      );

    });
  });


  /* =======================================================
     MAIN NAV
     ======================================================= */

  function setupMainNavigation() {

    document.querySelectorAll(
      "[data-panel]"
    ).forEach(button => {

      button.addEventListener("click", () => {

        const panel =
          button.dataset.panel;

        document.querySelectorAll(
          ".panel"
        ).forEach(el => {
          el.classList.remove("active");
        });

        $(`${panel}Panel`)?.classList.add(
          "active"
        );

        document.querySelectorAll(
          "[data-panel]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });
      });
    });
  }


  /* =======================================================
     OWNER LOGIN
     ======================================================= */

  function setupOwnerLogin() {

    $("openOwnerDashboard")?.addEventListener(
      "click",
      () => openModal("ownerLoginModal")
    );

    $("ownerLoginButton")?.addEventListener(
      "click",
      ownerLogin
    );
  }

  function ownerLogin() {

    const username =
      $("adminUsername")?.value.trim();

    const pin =
      $("adminPin")?.value.trim();

    /*
      DEMO ONLY credentials.
      Production must use secure backend
      authentication and MFA.
    */

    if (
      username !== "BEASTADMIN" ||
      pin !== "999999"
    ) {
      toast("Invalid Owner/Admin credentials.");
      return;
    }

    closeModal("ownerLoginModal");

    $("beastApp")?.classList.add("hidden");
    $("adminScreen")?.classList.remove("hidden");

    renderAdminDashboard();

    addSecurityLog(
      "Owner dashboard login",
      "Demo administrator session opened."
    );
  }


  /* =======================================================
     ADMIN NAVIGATION
     ======================================================= */

  function setupAdminNavigation() {

    document.querySelectorAll(
      "[data-admin-section]"
    ).forEach(button => {

      button.addEventListener("click", () => {

        currentAdminSection =
          button.dataset.adminSection;

        document.querySelectorAll(
          ".admin-section"
        ).forEach(section => {
          section.classList.remove("active");
        });

        $(`admin${capitalize(
          currentAdminSection
        )}`)?.classList.add("active");

        document.querySelectorAll(
          "[data-admin-section]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        renderAdminDashboard();
      });
    });


    $("adminLogout")?.addEventListener(
      "click",
      logoutAdmin
    );
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() +
      value.slice(1);
  }

  function logoutAdmin() {

    $("adminScreen")?.classList.add("hidden");
    $("beastApp")?.classList.remove("hidden");

    toast("Owner dashboard session closed.");
  }


  /* =======================================================
     ADMIN DASHBOARD
     ======================================================= */

  function renderAdminDashboard() {

    renderAdminStats();
    renderAdminFeeFlow();
    renderAdminCustomers();
    renderAdminTransactions();
    renderAdminRevenue();
    renderAdminSecurity();
    renderAdminAI();
  }

  function registeredCustomerCount() {
    return state.registered ? 1 : 0;
  }

  function renderAdminStats() {

    if ($("adminCustomerCount")) {
      $("adminCustomerCount").textContent =
        registeredCustomerCount();
    }

    if ($("adminActiveCustomers")) {
      $("adminActiveCustomers").textContent =
        registeredCustomerCount();
    }

    if ($("adminTransactionCount")) {
      $("adminTransactionCount").textContent =
        state.history.length;
    }

    if ($("adminFeeTotal")) {
      $("adminFeeTotal").textContent =
        money(state.ownerLedger.beastFees);
    }
  }


  /* =======================================================
     ADMIN FEE FLOW
     ======================================================= */

  function renderAdminFeeFlow() {

    const provider =
      state.ownerLedger.providerCosts || 0;

    const beast =
      state.ownerLedger.beastFees || 0;

    const total =
      provider + beast;

    if ($("feeFlowProvider")) {
      $("feeFlowProvider").textContent =
        money(provider);
    }

    if ($("feeFlowBeast")) {
      $("feeFlowBeast").textContent =
        money(beast);
    }

    if ($("feeFlowRevenue")) {
      $("feeFlowRevenue").textContent =
        money(beast);
    }
  }


  /* =======================================================
     ADMIN CUSTOMERS
     ======================================================= */

  function renderAdminCustomers() {

    const table =
      $("adminCustomersTable");

    if (!table) return;

    if (!state.registered) {

      table.innerHTML = `
        <tr>
          <td colspan="5">
            No registered customers.
          </td>
        </tr>
      `;

      return;
    }

    const search =
      $("adminCustomerSearch")
        ?.value
        .trim()
        .toLowerCase() || "";

    const matches =
      !search ||
      state.fullName.toLowerCase().includes(search) ||
      state.phone.includes(search) ||
      state.beastId.toLowerCase().includes(search);

    if (!matches) {

      table.innerHTML = `
        <tr>
          <td colspan="5">
            No matching customer found.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML = `
      <tr>
        <td>${escapeHTML(state.fullName)}</td>
        <td>${escapeHTML(maskNumber(state.phone))}</td>
        <td>${escapeHTML(state.beastId)}</td>
        <td>${money(state.balance)}</td>
        <td>
          <span class="status-badge status-success">
            ACTIVE
          </span>
        </td>
      </tr>
    `;
  }


  /* =======================================================
     ADMIN TRANSACTIONS
     ======================================================= */

  function renderAdminTransactions() {

    const table =
      $("adminTransactionsTable");

    if (!table) return;

    if (!state.history.length) {

      table.innerHTML = `
        <tr>
          <td colspan="8">
            No transactions recorded.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      state.history
        .slice(0, 100)
        .map(tx => `
          <tr>
            <td>${escapeHTML(tx.id)}</td>
            <td>${escapeHTML(tx.date)}</td>
            <td>${escapeHTML(tx.type)}</td>
            <td>${money(tx.amount)}</td>
            <td>${money(tx.providerFee || 0)}</td>
            <td>${money(tx.beastFee || 0)}</td>
            <td>${money(tx.total || tx.amount)}</td>
            <td>
              <span class="status-badge status-success">
                ${escapeHTML(tx.status || "SUCCESS")}
              </span>
            </td>
          </tr>
        `)
        .join("");
  }


  /* =======================================================
     ADMIN REVENUE
     ======================================================= */

  function renderAdminRevenue() {

    const gross =
      Number(state.ownerLedger.beastFees || 0);

    const provider =
      Number(state.ownerLedger.providerCosts || 0);

    const refunds =
      Number(state.ownerLedger.refunds || 0);

    const net =
      gross - refunds;

    if ($("adminGrossFees")) {
      $("adminGrossFees").textContent =
        money(gross);
    }

    if ($("adminProviderCosts")) {
      $("adminProviderCosts").textContent =
        money(provider);
    }

    if ($("adminRefunds")) {
      $("adminRefunds").textContent =
        money(refunds);
    }

    if ($("adminNetRevenue")) {
      $("adminNetRevenue").textContent =
        money(net);
    }

    if ($("adminRevenueBalance")) {
      $("adminRevenueBalance").textContent =
        money(net);
    }

    const list =
      $("adminRevenueList");

    if (!list) return;

    const entries =
      state.ownerLedger.transactions || [];

    if (!entries.length) {

      list.innerHTML = `
        <div class="muted">
          No BEAST revenue recorded yet.
        </div>
      `;

      return;
    }

    list.innerHTML =
      entries
        .slice(0, 50)
        .map(item => `
          <div class="history-item">

            <div class="history-top">

              <div>
                <div class="history-title">
                  BEAST Platform Fee
                </div>

                <div class="history-meta">
                  ${escapeHTML(item.date)}
                </div>
              </div>

              <div class="history-amount success">
                +${money(item.beastFee)}
              </div>

            </div>

            <div class="history-meta">
              Transaction:
              ${money(item.amount)}
            </div>

            <div class="history-meta">
              Provider cost:
              ${money(item.providerFee)}
            </div>

          </div>
        `)
        .join("");
  }


  /* =======================================================
     ADMIN SECURITY
     ======================================================= */

  function renderAdminSecurity() {

    const el =
      $("adminSecurityAlerts");

    if (!el) return;

    if (!state.securityLogs.length) {

      el.innerHTML = `
        <div class="muted">
          No security alerts recorded.
        </div>
      `;

      return;
    }

    el.innerHTML =
      state.securityLogs
        .slice(0, 50)
        .map(log => `
          <div class="security-alert">

            <div class="security-alert-head">

              <div class="security-alert-title">
                ${escapeHTML(log.title)}
              </div>

              <div class="security-alert-time">
                ${escapeHTML(log.time)}
              </div>

            </div>

            <div class="security-alert-body">
              ${escapeHTML(log.body)}
            </div>

          </div>
        `)
        .join("");
  }


  /* =======================================================
     BEAST AI
     ======================================================= */

  function aiResponse(question) {

    const q =
      String(question || "")
        .toLowerCase();

    const customers =
      registeredCustomerCount();

    const transactions =
      state.history.length;

    const fees =
      state.ownerLedger.beastFees || 0;

    const provider =
      state.ownerLedger.providerCosts || 0;

    if (
      q.includes("customer") ||
      q.includes("people") ||
      q.includes("registered")
    ) {
      return `
        BEAST currently records
        ${customers} registered customer${customers === 1 ? "" : "s"}.
        This demo only stores customers locally.
      `;
    }

    if (
      q.includes("revenue") ||
      q.includes("fee") ||
      q.includes("earn")
    ) {
      return `
        Recorded BEAST platform fees are
        ${money(fees)}.
        Provider costs recorded separately are
        ${money(provider)}.
      `;
    }

    if (
      q.includes("transaction") ||
      q.includes("transfer")
    ) {
      return `
        BEAST has recorded
        ${transactions} transaction${transactions === 1 ? "" : "s"}
        in the local demo ledger.
      `;
    }

    if (
      q.includes("balance") ||
      q.includes("money")
    ) {
      return `
        The registered customer's combined demo
        source balance is ${money(state.balance)}.
      `;
    }

    if (
      q.includes("security") ||
      q.includes("alert")
    ) {
      return `
        There are
        ${state.securityLogs.length}
        security event${state.securityLogs.length === 1 ? "" : "s"}
        recorded in the demo security log.
      `;
    }

    if (
      q.includes("provider") ||
      q.includes("cost")
    ) {
      return `
        Recorded provider costs are
        ${money(provider)}.
        Real provider charges should be supplied by
        the relevant provider/API contract rather than
        assumed by this demo.
      `;
    }

    return `
      I can help you inspect customers,
      transactions, BEAST fees, provider costs,
      revenue, balances and security activity.
    `;
  }

  function addAIMessage(containerId, textValue, user = false) {

    const chat =
      $(containerId);

    if (!chat) return;

    const message =
      document.createElement("div");

    message.className =
      `ai-message ${user ? "user" : "bot"}`;

    message.textContent = textValue;

    chat.appendChild(message);

    chat.scrollTop =
      chat.scrollHeight;
  }

  function sendAIMessage(inputId, chatId) {

    const input = $(inputId);

    if (!input) return;

    const question =
      input.value.trim();

    if (!question) return;

    addAIMessage(
      chatId,
      question,
      true
    );

    input.value = "";

    setTimeout(() => {

      addAIMessage(
        chatId,
        aiResponse(question),
        false
      );

    }, 250);
  }

  function renderAdminAI() {

    if ($("adminAIMessage")) {

      $("adminAIMessage").textContent =
        aiResponse(
          $("adminAIInput")?.value ||
          "Give me an overview."
        );
    }
  }

  function setupAI() {

    $("adminAISend")?.addEventListener(
      "click",
      () => sendAIMessage(
        "adminAIInput",
        "adminAIChat"
      )
    );

    $("adminAISendFull")?.addEventListener(
      "click",
      () => sendAIMessage(
        "adminAIInputFull",
        "adminAIChat"
      )
    );

    $("adminAIInput")?.addEventListener(
      "keydown",
      e => {
        if (e.key === "Enter") {
          sendAIMessage(
            "adminAIInput",
            "adminAIChat"
          );
        }
      }
    );

    $("adminAIInputFull")?.addEventListener(
      "keydown",
      e => {
        if (e.key === "Enter") {
          sendAIMessage(
            "adminAIInputFull",
            "adminAIChat"
          );
        }
      }
    );
  }


  /* =======================================================
     ADMIN SEARCH
     ======================================================= */

  $("adminCustomerSearch")
    ?.addEventListener(
      "input",
      renderAdminCustomers
    );


  /* =======================================================
     SETTINGS BUTTONS
     ======================================================= */

  function setupSettings() {

    $("settingsButton")?.addEventListener(
      "click",
      () => openModal("settingsModal")
    );

    $("securityAlertsToggle")
      ?.addEventListener(
        "click",
        () => {

          state.settings.securityAlerts =
            !state.settings.securityAlerts;

          updateSwitch(
            "securityAlertsSwitch",
            state.settings.securityAlerts
          );

          save();
        }
      );

    $("notificationsToggle")
      ?.addEventListener(
        "click",
        () => {

          state.settings.notifications =
            !state.settings.notifications;

          updateSwitch(
            "notificationsSwitch",
            state.settings.notifications
          );

          save();
        }
      );


    $("lightModeToggle")
      ?.addEventListener(
        "click",
        () => {

          state.dark = !state.dark;

          applyTheme();
          save();

          toast(
            state.dark
              ? "Dark mode enabled."
              : "Light mode enabled."
          );
        }
      );


    $("changePinButton")
      ?.addEventListener(
        "click",
        () => openModal("changePinModal")
      );


    $("saveNewPin")
      ?.addEventListener(
        "click",
        changePin
      );


    $("logoutButton")
      ?.addEventListener(
        "click",
        logoutCustomer
      );
  }

  function changePin() {

    const current =
      $("currentPin")?.value.trim();

    const newPin =
      $("newPin")?.value.trim();

    const confirm =
      $("newPinConfirm")?.value.trim();

    if (current !== state.beastPin) {
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

    closeModal("changePinModal");

    toast("BEAST PIN changed successfully.");
  }

  function logoutCustomer() {

    closeAllModals();

    $("beastApp")?.classList.add("hidden");

    showRegistrationStep(1);

    $("registrationScreen")
      ?.classList.remove("hidden");

    toast("Logged out.");
  }


  /* =======================================================
     SETTINGS SUB-PAGES
     ======================================================= */

  document.querySelectorAll(
    "[data-settings-page]"
  ).forEach(button => {

    button.addEventListener("click", () => {

      const page =
        button.dataset.settingsPage;

      renderSettingsPage(page);

      openModal("settingsSubModal");
    });
  });

  function renderSettingsPage(page) {

    const title =
      $("settingsSubTitle");

    const content =
      $("settingsSubContent");

    if (!content) return;

    const sourceTypes = {
      mpesa: state.sources.filter(
        s => s.type === "M-PESA"
      ),
      airtel: state.sources.filter(
        s => s.type === "Airtel Money"
      ),
      bank: state.sources.filter(
        s => s.type === "Bank"
      ),
      card: state.sources.filter(
        s => s.type === "Card"
      ),
      wallet: state.sources.filter(
        s => s.type === "BEAST Wallet"
      )
    };

    if (page === "personal") {

      if (title) title.textContent =
        "Personal Details";

      content.innerHTML = `
        <div class="verify-box">
          <strong>Full Name</strong>
          <div class="muted">
            ${escapeHTML(state.fullName)}
          </div>
        </div>

        <div class="verify-box">
          <strong>Phone</strong>
          <div class="muted">
            ${escapeHTML(state.phone)}
          </div>
        </div>

        <div class="verify-box">
          <strong>BEAST ID</strong>
          <div class="muted">
            ${escapeHTML(state.beastId)}
          </div>
        </div>
      `;

      return;
    }

    if (page === "line") {

      if (title) title.textContent =
        "Line Management";

      const lines =
        state.sources.filter(
          s =>
            s.type === "M-PESA" ||
            s.type === "Airtel Money"
        );

      content.innerHTML =
        lines.map(s => `
          <div class="settings-item">
            <div>
              <div class="settings-title">
                ${escapeHTML(s.provider)}
              </div>
              <div class="settings-subtitle">
                ${escapeHTML(s.number)}
              </div>
            </div>
            <strong>
              ${money(s.balance)}
            </strong>
          </div>
        `).join("");

      return;
    }

    const list =
      sourceTypes[page] || [];

    if (title) {
      title.textContent =
        page === "mpesa"
          ? "M-PESA"
          : page === "airtel"
          ? "Airtel Money"
          : page === "bank"
          ? "Bank Accounts"
          : page === "card"
          ? "Cards"
          : "BEAST Wallet";
    }

    content.innerHTML =
      list.map(s => `
        <div class="settings-item">

          <div class="settings-item-left">

            <div class="settings-icon">
              ${page === "bank"
                ? "🏦"
                : page === "card"
                ? "💳"
                : page === "wallet"
                ? "👛"
                : "📱"}
            </div>

            <div>
              <div class="settings-title">
                ${escapeHTML(s.provider)}
              </div>

              <div class="settings-subtitle">
                ${escapeHTML(s.number)}
                • ${escapeHTML(s.label)}
              </div>
            </div>

          </div>

          <strong>
            ${money(s.balance)}
          </strong>

        </div>
      `).join("");
  }


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  setupRegistration();
  setupSend();
  setupReceive();
  setupWithdraw();
  setupLipa();
  setupPinModal();
  setupMainNavigation();
  setupSettings();
  setupOwnerLogin();
  setupAdminNavigation();
  setupAI();

  renderReceiveForm();

  applyTheme();

  if (state.registered) {
    showApp();
  } else {
    showRegistration();
  }

  /* Initial dashboard selections */
  if (state.sources.length) {

    selectedSendSource =
      state.sources[0].id;

    selectedReceiveSource =
      state.sources[0].id;

    selectedWithdrawSource =
      state.sources[0].id;

    selectedLipaSource =
      state.sources[0].id;

    renderAllSourcePickers();
  }

  renderDashboard();
  renderHistory();
  renderSettings();

});