/* =========================================================
   MONEY TRANSFER BEAST
   CURRENT CUSTOMER + OWNER/ADMIN SYSTEM
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const KEY = "mtb_beast_v7";
  const REG_KEY = "mtb_beast_registration_v4";
  const ADMIN_KEY = "mtb_beast_admin_v1";

  /* =======================================================
     HELPERS
  ======================================================= */

  const $ = id => document.getElementById(id);

  const money = value =>
    "KES " + Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const money0 = value =>
    "KES " + Math.round(Number(value || 0)).toLocaleString("en-KE");

  function toast(message) {
    const el = $("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, 3000);
  }

  function nowText() {
    return new Date().toLocaleString("en-KE");
  }

  function reference() {
    return "BEAST-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.floor(100 + Math.random() * 900);
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
    return /^07\d{8}$|^01\d{8}$/.test(
      normalizeKenyanPhone(phone)
    );
  }

  function generateBeastId(name) {
    const clean = String(name || "USER")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 5) || "USER";

    return "BEAST" +
      clean +
      Math.floor(100 + Math.random() * 900);
  }

  /* =======================================================
     DEFAULT SOURCES
     ======================================================= */

  function defaultSources() {
    return [

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

    ];
  }

  /* =======================================================
     STATE
     ======================================================= */

  const defaultState = {
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

    sources: defaultSources(),

    history: [],

    admin: {
      customerCount: 0,
      activeCustomers: 0,
      providerCosts: 0,
      beastFees: 0,
      refunds: 0,
      revenue: 0,
      customers: [],
      transactions: [],
      revenueRecords: [],
      securityAlerts: []
    }
  };

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(KEY)
      );

      if (!saved) return structuredClone(defaultState);

      return {
        ...structuredClone(defaultState),
        ...saved,
        settings: {
          ...defaultState.settings,
          ...(saved.settings || {})
        },
        sources:
          Array.isArray(saved.sources) && saved.sources.length
            ? saved.sources
            : defaultSources(),

        history:
          Array.isArray(saved.history)
            ? saved.history
            : [],

        admin: {
          ...defaultState.admin,
          ...(saved.admin || {}),
          customers:
            Array.isArray(saved.admin?.customers)
              ? saved.admin.customers
              : [],

          transactions:
            Array.isArray(saved.admin?.transactions)
              ? saved.admin.transactions
              : [],

          revenueRecords:
            Array.isArray(saved.admin?.revenueRecords)
              ? saved.admin.revenueRecords
              : [],

          securityAlerts:
            Array.isArray(saved.admin?.securityAlerts)
              ? saved.admin.securityAlerts
              : []
        }
      };

    } catch {
      return structuredClone(defaultState);
    }
  }

  let state = loadState();

  /* =======================================================
     REGISTRATION
     ======================================================= */

  function loadRegistration() {

    try {

      const reg = JSON.parse(
        localStorage.getItem(REG_KEY)
      );

      if (reg && reg.registered) {

        state.registered = true;
        state.fullName = reg.fullName || state.fullName;
        state.phone = reg.phone || state.phone;
        state.nationalId = reg.nationalId || state.nationalId;
        state.beastId = reg.beastId || state.beastId;
        state.beastPin = reg.beastPin || state.beastPin;

        save();

        showApp();

        return;
      }

    } catch {}

    $("registrationScreen")?.classList.remove("hidden");
    $("beastApp")?.classList.add("hidden");
  }

  function showRegistrationStep(step) {

    [1, 2, 3].forEach(n => {
      $("registrationStep" + n)?.classList.toggle(
        "hidden",
        n !== step
      );

      $("progress" + n)?.classList.toggle(
        "active",
        n <= step
      );
    });

  }

  function saveRegistration() {

    localStorage.setItem(
      REG_KEY,
      JSON.stringify({
        registered: true,
        fullName: state.fullName,
        phone: state.phone,
        nationalId: state.nationalId,
        beastId: state.beastId,
        beastPin: state.beastPin
      })
    );

  }

  $("registrationNext1")?.addEventListener("click", () => {

    const name = $("registrationName").value.trim();
    const phone = normalizeKenyanPhone(
      $("registrationPhone").value
    );
    const nationalId =
      $("registrationId").value.trim();

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

    state.fullName = name;
    state.phone = phone;
    state.nationalId = nationalId;

    if (!state.beastId) {
      state.beastId = generateBeastId(name);
    }

    $("registrationSummaryName").textContent =
      state.fullName;

    $("registrationSummaryPhone").textContent =
      state.phone;

    $("registrationSummaryId").textContent =
      state.nationalId;

    $("registrationBeastId").textContent =
      state.beastId;

    showRegistrationStep(2);

  });


  $("registrationBack1")?.addEventListener(
    "click",
    () => showRegistrationStep(1)
  );


  $("registrationNext2")?.addEventListener(
    "click",
    () => {

      const pin =
        $("registrationPin").value.trim();

      const confirm =
        $("registrationPinConfirm").value.trim();

      if (!/^\d{4,6}$/.test(pin)) {
        toast("PIN must contain 4 to 6 digits.");
        return;
      }

      if (pin !== confirm) {
        toast("PIN confirmation does not match.");
        return;
      }

      state.beastPin = pin;

      $("registrationSummaryName").textContent =
        state.fullName;

      $("registrationSummaryPhone").textContent =
        state.phone;

      $("registrationSummaryId").textContent =
        state.nationalId;

      $("registrationBeastId").textContent =
        state.beastId;

      showRegistrationStep(3);

    }
  );


  $("registrationBack2")?.addEventListener(
    "click",
    () => showRegistrationStep(2)
  );


  $("registrationFinish")?.addEventListener(
    "click",
    () => {

      state.registered = true;

      saveRegistration();
      save();

      showApp();

      toast(
        "Congratulations 🎉 Your BEAST account is ready."
      );

    }
  );


  /* =======================================================
     CUSTOMER APP
     ======================================================= */

  function showApp() {

    $("registrationScreen")?.classList.add("hidden");
    $("beastApp")?.classList.remove("hidden");
    $("adminScreen")?.classList.add("hidden");

    updateDashboard();
    renderSourcePicker();
    renderHistory();

  }


  function updateDashboard() {

    $("dashboardBalance").textContent =
      money(state.balance);

    $("dashboardBeastId").textContent =
      state.beastId || "—";

    $("dashboardName").textContent =
      state.fullName || "—";

    applyTheme();

  }


  /* =======================================================
     THEME
     ======================================================= */

  function applyTheme() {

    document.body.classList.toggle(
      "light-mode",
      !state.dark
    );

    $("themeSwitch")?.classList.toggle(
      "on",
      !state.dark
    );

  }

  $("toggleTheme")?.addEventListener(
    "click",
    () => {

      state.dark = !state.dark;

      save();
      applyTheme();

    }
  );


  /* =======================================================
     NAVIGATION
     ======================================================= */

  document.querySelectorAll(
    ".nav-btn[data-panel]"
  ).forEach(button => {

    button.addEventListener("click", () => {

      const target = button.dataset.panel;

      document.querySelectorAll(
        ".panel"
      ).forEach(panel => {
        panel.classList.add("hidden");
      });

      $(target)?.classList.remove("hidden");

      document.querySelectorAll(
        ".main-nav .nav-btn"
      ).forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      if (target === "historyPanel") {
        renderHistory();
      }

    });

  });


  /* =======================================================
     SOURCES
     ======================================================= */

  let selectedSendSource =
    state.sources[0]?.id || null;

  let selectedLipaSource =
    state.sources[0]?.id || null;

  let selectedWithdrawSource =
    state.sources[0]?.id || null;

  let selectedBuyerSource =
    state.sources[0]?.id || null;

  function sourceById(id) {
    return state.sources.find(
      s => s.id === id
    );
  }

  function sourceLabel(source) {

    if (!source) return "Unknown";

    return `
      <div>
        <div class="source-title">
          ${source.provider}
        </div>

        <div class="source-detail">
          ${source.number} • ${source.label}
        </div>
      </div>

      <div class="source-balance">
        ${money(source.balance)}
      </div>
    `;
  }


  function renderSourcePicker() {

    const container =
      $("sendSourcePicker");

    if (!container) return;

    container.innerHTML = `
      <div class="label">
        Payment Source
      </div>

      <div class="source-grid">
        ${state.sources.map(source => `
          <button
            class="source-card ${
              selectedSendSource === source.id
                ? "selected"
                : ""
            }"
            data-send-source="${source.id}"
          >
            ${sourceLabel(source)}
          </button>
        `).join("")}
      </div>
    `;

    container
      .querySelectorAll("[data-send-source]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedSendSource =
              button.dataset.sendSource;

            renderSourcePicker();

            updateSendFee();

          }
        );

      });

  }


  /* =======================================================
     PROVIDER COST ENGINE
     ======================================================= */

  /*
    IMPORTANT:
    These are provider-cost records, not BEAST revenue.

    M-PESA cross-network B2C published bands are used
    where applicable. Actual production integration must
    determine the exact tariff for the specific M-PESA
    product/API transaction.
  */

  const MPESA_CROSS_NETWORK = [

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

  function mpesaCrossNetworkFee(amount) {

    const n = Number(amount || 0);

    for (const band of MPESA_CROSS_NETWORK) {

      if (n >= band[0] && n <= band[1]) {
        return band[2];
      }

    }

    return 0;
  }


  /*
    Airtel Money tariffs vary by transaction type.
    Until the exact production Airtel API tariff is
    connected, we do NOT invent a current amount.
  */

  function providerCost(source, amount, type) {

    if (!source) return 0;

    const n = Number(amount || 0);

    if (!n) return 0;

    if (source.type === "M-PESA") {

      if (
        type === "send-cross-network" ||
        type === "send"
      ) {
        return mpesaCrossNetworkFee(n);
      }

      return 0;
    }

    if (source.type === "Airtel Money") {

      /*
        Exact current Airtel production tariff should
        come from the applicable Airtel Money product/API.
      */

      return 0;
    }

    if (source.type === "Bank") {

      return 0;
    }

    if (source.type === "Card") {

      return 0;
    }

    if (source.type === "BEAST Wallet") {

      return 0;
    }

    return 0;
  }


  /* =======================================================
     BEAST PLATFORM FEE
     ======================================================= */

  /*
    BEAST's own fee is intentionally separate from
    provider costs.

    Current prototype policy:
      1 - 1,000     = KES 7
      1,001 - 10k   = KES 30
      Above 10k     = KES 0 until owner configures it.

    This can be changed later from the Admin system.
  */

  function beastFee(amount) {

    const n = Number(amount || 0);

    if (n <= 0) return 0;

    if (n <= 1000) return 7;

    if (n <= 10000) return 30;

    return 0;
  }


  function feeData(source, amount, type) {

    const n = Number(amount || 0);

    const pCost =
      providerCost(
        source,
        n,
        type
      );

    const bFee =
      beastFee(n);

    return {
      amount: n,
      providerCost: pCost,
      beastFee: bFee,
      total: n + pCost + bFee
    };

  }


  function feeSummaryHTML(data) {

    if (!data || !data.amount) {
      return "";
    }

    return `
      <div class="fee-summary">

        <div class="fee-row">
          <span>Amount</span>
          <strong>${money(data.amount)}</strong>
        </div>

        <div class="fee-row">
          <span>Provider cost</span>
          <strong>${money(data.providerCost)}</strong>
        </div>

        <div class="fee-row">
          <span>BEAST fee</span>
          <strong>${money(data.beastFee)}</strong>
        </div>

        <div class="fee-row total">
          <span>Total</span>
          <strong>${money(data.total)}</strong>
        </div>

      </div>
    `;

  }


  /* =======================================================
     SEND
     ======================================================= */

  function updateSendFee() {

    const amount =
      Number($("sendAmount")?.value || 0);

    const source =
      sourceById(selectedSendSource);

    if (!amount || !source) {

      $("sendFeeSummary").innerHTML = "";

      return;
    }

    const data =
      feeData(
        source,
        amount,
        "send"
      );

    $("sendFeeSummary").innerHTML =
      feeSummaryHTML(data);

  }


  $("sendAmount")?.addEventListener(
    "input",
    updateSendFee
  );


  let verifiedRecipient = false;


  $("verifyRecipient")?.addEventListener(
    "click",
    () => {

      const value =
        $("sendRecipient").value.trim();

      if (!value) {
        toast("Enter recipient number/account.");
        return;
      }

      verifiedRecipient = true;

      $("recipientName").textContent =
        "KRISH DEMO RECIPIENT";

      $("recipientVerification")
        ?.classList.remove("hidden");

      toast("Recipient verified.");

    }
  );


  $("sendButton")?.addEventListener(
    "click",
    () => {

      const source =
        sourceById(selectedSendSource);

      const amount =
        Number($("sendAmount").value || 0);

      if (!verifiedRecipient) {
        toast("Verify the recipient first.");
        return;
      }

      if (!amount || amount <= 0) {
        toast("Enter a valid amount.");
        return;
      }

      if (!source) {
        toast("Select a payment source.");
        return;
      }

      const fees =
        feeData(
          source,
          amount,
          "send"
        );

      if (source.balance < fees.total) {
        toast(
          `Insufficient ${source.type} balance.`
        );
        return;
      }

      openPinModal({
        type: "send",
        amount,
        source,
        fees
      });

    }
  );


  /* =======================================================
     PIN MODAL
     ======================================================= */

  let pendingTransaction = null;

  function openPinModal(transaction) {

    pendingTransaction = transaction;

    const fees =
      transaction.fees;

    $("pinSummary").innerHTML = `
      <div class="fee-row">
        <span>Amount</span>
        <strong>${money(fees.amount)}</strong>
      </div>

      <div class="fee-row">
        <span>Provider cost</span>
        <strong>${money(fees.providerCost)}</strong>
      </div>

      <div class="fee-row">
        <span>BEAST fee</span>
        <strong>${money(fees.beastFee)}</strong>
      </div>

      <div class="fee-row total">
        <span>Total</span>
        <strong>${money(fees.total)}</strong>
      </div>
    `;

    $("transactionPin").value = "";

    $("pinModal")
      ?.classList.remove("hidden");

  }


  $("transactionPinConfirm")
    ?.addEventListener(
      "click",
      () => {

        const pin =
          $("transactionPin").value;

        if (pin !== state.beastPin) {
          toast("Incorrect BEAST PIN.");
          return;
        }

        if (!pendingTransaction) {
          closeModal("pinModal");
          return;
        }

        completeTransaction(
          pendingTransaction
        );

        pendingTransaction = null;

        closeModal("pinModal");

      }
    );


  function completeTransaction(tx) {

    const source = tx.source;
    const fees = tx.fees;

    if (source.balance < fees.total) {
      toast("Insufficient balance.");
      return;
    }

    source.balance -= fees.total;

    state.balance =
      Math.max(
        0,
        state.balance - fees.total
      );

    const record = {

      id: reference(),

      type: tx.type,

      amount: fees.amount,

      providerCost: fees.providerCost,

      fee: fees.beastFee,

      total: fees.total,

      source: source.provider,

      recipient:
        $("recipientName")?.textContent ||
        "Recipient",

      status: "SUCCESS",

      date: nowText()

    };

    state.history.unshift(record);

    recordAdminTransaction(record);

    save();

    updateDashboard();

    renderSourcePicker();

    renderHistory();

    toast(
      `Transaction successful. ${money(fees.total)} deducted.`
    );

  }


  /* =======================================================
     RECEIVE SELL
     ======================================================= */

  let receiveMode = "paybill";

  $("receivePaybillOption")
    ?.addEventListener(
      "click",
      () => {

        receiveMode = "paybill";

        renderReceiveDetails();

      }
    );


  $("receiveTillOption")
    ?.addEventListener(
      "click",
      () => {

        receiveMode = "till";

        renderReceiveDetails();

      }
    );


  $("receivePochiOption")
    ?.addEventListener(
      "click",
      () => {

        receiveMode = "pochi";

        renderReceiveDetails();

      }
    );


  function renderReceiveDetails() {

    let html = "";

    if (receiveMode === "paybill") {

      html = `
        <div class="field">
          <label class="label">
            Business Number
          </label>
          <input id="receiveBusiness"
                 type="text"
                 placeholder="Business number">
        </div>

        <div class="field">
          <label class="label">
            Account Number
          </label>
          <input id="receiveAccount"
                 type="text"
                 placeholder="Account number">
        </div>
      `;

    }

    if (receiveMode === "till") {

      html = `
        <div class="field">
          <label class="label">
            Till Number
          </label>
          <input id="receiveTill"
                 type="text"
                 placeholder="Till number">
        </div>
      `;

    }

    if (receiveMode === "pochi") {

      html = `
        <div class="field">
          <label class="label">
            Seller Phone Number
          </label>
          <input id="receiveSellerPhone"
                 type="tel"
                 placeholder="0712345678">
        </div>
      `;

    }

    $("receiveDetails").innerHTML =
      html;

  }


  function receiveSellerName() {

    if (receiveMode === "paybill") {
      return "KRISH DEMO BUSINESS";
    }

    if (receiveMode === "till") {
      return "KRISH DEMO SHOP";
    }

    return "KRISH DEMO SELLER";
  }


  $("verifyReceiveDetails")
    ?.addEventListener(
      "click",
      () => {

        const amount =
          Number(
            $("receiveAmount").value || 0
          );

        if (!amount || amount <= 0) {
          toast("Enter the payment amount.");
          return;
        }

        const seller =
          receiveSellerName();

        $("receiveDetails").insertAdjacentHTML(
          "beforeend",
          `
            <div class="verification-box">

              <div class="label">
                Verified Seller
              </div>

              <div class="verification-name">
                ${seller}
              </div>

            </div>
          `
        );

        $("buyerSourceSection")
          ?.classList.remove("hidden");

        renderBuyerSourcePicker();

        updateReceiveFee();

        toast(
          "Seller verified. Buyer authorization required."
        );

      }
    );


  function renderBuyerSourcePicker() {

    const container =
      $("buyerSourcePicker");

    if (!container) return;

    container.innerHTML = `
      <div class="source-grid">
        ${state.sources.map(source => `
          <button
            class="source-card ${
              selectedBuyerSource === source.id
                ? "selected"
                : ""
            }"
            data-buyer-source="${source.id}"
          >
            ${sourceLabel(source)}
          </button>
        `).join("")}
      </div>
    `;

    container
      .querySelectorAll("[data-buyer-source]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedBuyerSource =
              button.dataset.buyerSource;

            renderBuyerSourcePicker();

            updateReceiveFee();

          }
        );

      });

  }


  function updateReceiveFee() {

    const amount =
      Number(
        $("receiveAmount")?.value || 0
      );

    const source =
      sourceById(selectedBuyerSource);

    if (!amount || !source) {
      $("receiveFeeSummary").innerHTML = "";
      return;
    }

    const fees =
      feeData(
        source,
        amount,
        "send"
      );

    $("receiveFeeSummary").innerHTML =
      feeSummaryHTML(fees);

  }


  $("receiveAmount")
    ?.addEventListener(
      "input",
      updateReceiveFee
    );


  $("buyerUnavailable")
    ?.addEventListener(
      "click",
      () => {

        toast(
          "Use secure buyer identity verification."
        );

        openBuyerLogin();

      }
    );


  function openBuyerLogin() {

    $("buyerLoginPhone").value = "";
    $("buyerLoginBeastId").value = "";
    $("buyerLoginPin").value = "";

    $("buyerLoginModal")
      ?.classList.remove("hidden");

  }


  $("buyerLoginContinue")
    ?.addEventListener(
      "click",
      () => {

        const phone =
          normalizeKenyanPhone(
            $("buyerLoginPhone").value
          );

        const id =
          $("buyerLoginBeastId").value.trim();

        const pin =
          $("buyerLoginPin").value;

        if (
          phone !== state.phone ||
          id.toUpperCase() !==
            String(state.beastId).toUpperCase() ||
          pin !== state.beastPin
        ) {

          toast(
            "Buyer login details are incorrect."
          );

          return;

        }

        closeModal("buyerLoginModal");

        openSellerApproval();

      }
    );


  function openSellerApproval() {

    const amount =
      Number(
        $("receiveAmount").value || 0
      );

    $("sellerApprovalAmount")
      .textContent = money(amount);

    $("sellerApprovalSeller")
      .textContent = receiveSellerName();

    $("sellerApprovalModal")
      ?.classList.remove("hidden");

  }


  $("sellerReject")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "sellerApprovalModal"
        );

        toast(
          "Seller rejected the payment."
        );

      }
    );


  $("sellerApprove")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "sellerApprovalModal"
        );

        openFinalAuthorization();

      }
    );


  function openFinalAuthorization() {

    const amount =
      Number(
        $("receiveAmount").value || 0
      );

    const source =
      sourceById(selectedBuyerSource);

    const fees =
      feeData(
        source,
        amount,
        "send"
      );

    pendingReceive = {
      amount,
      source,
      fees,
      seller: receiveSellerName()
    };

    $("finalAuthorizationSummary")
      .innerHTML =
      feeSummaryHTML(fees);

    $("finalAuthorizationPin").value = "";

    $("finalAuthorizationModal")
      ?.classList.remove("hidden");

  }


  let pendingReceive = null;


  $("finalAuthorizationButton")
    ?.addEventListener(
      "click",
      () => {

        const pin =
          $("finalAuthorizationPin").value;

        if (pin !== state.beastPin) {
          toast("Incorrect BEAST PIN.");
          return;
        }

        if (!pendingReceive) return;

        completeReceiveTransaction(
          pendingReceive
        );

        pendingReceive = null;

        closeModal(
          "finalAuthorizationModal"
        );

      }
    );


  function completeReceiveTransaction(tx) {

    const source = tx.source;
    const fees = tx.fees;

    if (source.balance < fees.total) {
      toast("Buyer source has insufficient funds.");
      return;
    }

    source.balance -= fees.total;

    state.balance =
      Math.max(
        0,
        state.balance - fees.total
      );

    const record = {

      id: reference(),

      type: "RECEIVE / SELL",

      amount: tx.amount,

      providerCost: fees.providerCost,

      fee: fees.beastFee,

      total: fees.total,

      source: source.provider,

      recipient: tx.seller,

      status: "SUCCESS",

      date: nowText()

    };

    state.history.unshift(record);

    recordAdminTransaction(record);

    save();

    updateDashboard();

    renderSourcePicker();

    renderHistory();

    toast(
      "Payment completed successfully."
    );

  }


  /* =======================================================
     RECEIVE WITHDRAW
     ======================================================= */

  $("receiveWithdrawTab")
    ?.addEventListener(
      "click",
      () => {

        $("receiveSell")
          ?.classList.add("hidden");

        $("receiveWithdraw")
          ?.classList.remove("hidden");

        $("receiveSellTab")
          ?.classList.remove("active");

        $("receiveWithdrawTab")
          ?.classList.add("active");

        renderWithdrawSourcePicker();

      }
    );


  $("receiveSellTab")
    ?.addEventListener(
      "click",
      () => {

        $("receiveWithdraw")
          ?.classList.add("hidden");

        $("receiveSell")
          ?.classList.remove("hidden");

        $("receiveWithdrawTab")
          ?.classList.remove("active");

        $("receiveSellTab")
          ?.classList.add("active");

      }
    );


  function renderWithdrawSourcePicker() {

    const container =
      $("withdrawSourcePicker");

    if (!container) return;

    container.innerHTML = `
      <div class="source-grid">
        ${state.sources.map(source => `
          <button
            class="source-card ${
              selectedWithdrawSource === source.id
                ? "selected"
                : ""
            }"
            data-withdraw-source="${source.id}"
          >
            ${sourceLabel(source)}
          </button>
        `).join("")}
      </div>
    `;

    container
      .querySelectorAll(
        "[data-withdraw-source]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedWithdrawSource =
              button.dataset.withdrawSource;

            renderWithdrawSourcePicker();

            renderWithdrawDetails();

            updateWithdrawFee();

          }
        );

      });

    renderWithdrawDetails();

  }


  function renderWithdrawDetails() {

    const source =
      sourceById(selectedWithdrawSource);

    if (!source) return;

    $("withdrawSourceDetails")
      .innerHTML = `
        <div class="verification-box">
          <div class="label">
            Selected source
          </div>

          <div class="verification-name">
            ${source.provider}
          </div>

          <div class="muted small">
            ${source.number} •
            Balance ${money(source.balance)}
          </div>
        </div>
      `;

  }


  $("verifyWithdrawal")
    ?.addEventListener(
      "click",
      () => {

        const agent =
          $("withdrawAgent").value.trim();

        if (!validKenyanPhone(agent)) {
          toast(
            "Enter a valid Kenyan agent number."
          );
          return;
        }

        toast("Agent details verified.");

      }
    );


  function updateWithdrawFee() {

    const amount =
      Number(
        $("withdrawAmount")?.value || 0
      );

    const source =
      sourceById(selectedWithdrawSource);

    if (!amount || !source) {
      $("withdrawFeeSummary").innerHTML = "";
      return;
    }

    const fees =
      feeData(
        source,
        amount,
        "withdraw"
      );

    $("withdrawFeeSummary").innerHTML =
      feeSummaryHTML(fees);

  }


  $("withdrawAmount")
    ?.addEventListener(
      "input",
      updateWithdrawFee
    );


  $("withdrawButton")
    ?.addEventListener(
      "click",
      () => {

        const amount =
          Number(
            $("withdrawAmount").value || 0
          );

        const source =
          sourceById(selectedWithdrawSource);

        if (!source || !amount) {
          toast("Enter a valid withdrawal amount.");
          return;
        }

        const fees =
          feeData(
            source,
            amount,
            "withdraw"
          );

        if (source.balance < fees.total) {
          toast("Insufficient source balance.");
          return;
        }

        openPinModal({
          type: "withdraw",
          amount,
          source,
          fees
        });

      }
    );


  /* =======================================================
     LIPA NA
     ======================================================= */

  let lipaMode = "pochi";


  $("lipaPochi")
    ?.addEventListener(
      "click",
      () => {

        lipaMode = "pochi";

        renderLipaDetails();

      }
    );


  $("lipaTill")
    ?.addEventListener(
      "click",
      () => {

        lipaMode = "till";

        renderLipaDetails();

      }
    );


  $("lipaPaybill")
    ?.addEventListener(
      "click",
      () => {

        lipaMode = "paybill";

        renderLipaDetails();

      }
    );


  function renderLipaDetails() {

    let html = "";

    if (lipaMode === "pochi") {

      html = `
        <div class="field">
          <label class="label">
            Phone Number
          </label>

          <input id="lipaTarget"
                 type="tel"
                 placeholder="0712345678">
        </div>
      `;

    }

    if (lipaMode === "till") {

      html = `
        <div class="field">
          <label class="label">
            Till Number
          </label>

          <input id="lipaTarget"
                 type="text"
                 placeholder="Till number">
        </div>
      `;

    }

    if (lipaMode === "paybill") {

      html = `
        <div class="field">
          <label class="label">
            Business Number
          </label>

          <input id="lipaTarget"
                 type="text"
                 placeholder="Business number">
        </div>

        <div class="field">
          <label class="label">
            Account Number
          </label>

          <input id="lipaAccount"
                 type="text"
                 placeholder="Account number">
        </div>
      `;

    }

    $("lipaDetails").innerHTML =
      html;

  }


  function renderLipaSourcePicker() {

    const container =
      $("lipaSourcePicker");

    if (!container) return;

    container.innerHTML = `
      <div class="label">
        Pay From
      </div>

      <div class="source-grid">
        ${state.sources.map(source => `
          <button
            class="source-card ${
              selectedLipaSource === source.id
                ? "selected"
                : ""
            }"
            data-lipa-source="${source.id}"
          >
            ${sourceLabel(source)}
          </button>
        `).join("")}
      </div>
    `;

    container
      .querySelectorAll("[data-lipa-source]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectedLipaSource =
              button.dataset.lipaSource;

            renderLipaSourcePicker();

            updateLipaFee();

          }
        );

      });

  }


  function updateLipaFee() {

    const amount =
      Number(
        $("lipaAmount")?.value || 0
      );

    const source =
      sourceById(selectedLipaSource);

    if (!amount || !source) {
      $("lipaFeeSummary").innerHTML = "";
      return;
    }

    const fees =
      feeData(
        source,
        amount,
        "lipa"
      );

    $("lipaFeeSummary").innerHTML =
      feeSummaryHTML(fees);

  }


  $("lipaAmount")
    ?.addEventListener(
      "input",
      updateLipaFee
    );


  $("verifyLipa")
    ?.addEventListener(
      "click",
      () => {

        const target =
          $("lipaTarget")?.value.trim();

        if (!target) {
          toast("Enter payment details.");
          return;
        }

        toast("Payment details verified.");

      }
    );


  $("lipaButton")
    ?.addEventListener(
      "click",
      () => {

        const amount =
          Number(
            $("lipaAmount").value || 0
          );

        const source =
          sourceById(selectedLipaSource);

        if (!amount || !source) {
          toast("Enter amount and select source.");
          return;
        }

        const fees =
          feeData(
            source,
            amount,
            "lipa"
          );

        if (source.balance < fees.total) {
          toast("Insufficient source balance.");
          return;
        }

        openPinModal({
          type: "LIPA NA",
          amount,
          source,
          fees
        });

      }
    );


  /* =======================================================
     HISTORY
     ======================================================= */

  function renderHistory() {

    const container =
      $("historyList");

    if (!container) return;

    if (!state.history.length) {

      container.innerHTML = `
        <div class="muted">
          No transactions yet.
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.history.map(tx => `

        <div class="history-item">

          <div class="history-top">

            <div>
              <div class="history-title">
                ${tx.type}
              </div>

              <div class="history-meta">
                ${tx.source || "Source"}
              </div>
            </div>

            <div class="history-amount">
              ${money(tx.amount)}
            </div>

          </div>

          <div class="history-meta">

            Fee:
            ${money(tx.fee || 0)}

            <br>

            Provider cost:
            ${money(tx.providerCost || 0)}

            <br>

            Total:
            ${money(tx.total || tx.amount)}

            <br>

            ${tx.recipient || ""}

            <br>

            ${tx.id}

            <br>

            ${tx.date}

          </div>

          <div style="margin-top:9px;">
            <span class="status success">
              ${tx.status || "SUCCESS"}
            </span>
          </div>

        </div>

      `).join("");

  }


  /* =======================================================
     ADMIN DATA
     ======================================================= */

  function adminSave() {
    localStorage.setItem(
      ADMIN_KEY,
      JSON.stringify(state.admin)
    );
  }


  function recordAdminTransaction(record) {

    state.admin.transactions.unshift(record);

    state.admin.beastFees +=
      Number(record.fee || 0);

    state.admin.providerCosts +=
      Number(record.providerCost || 0);

    state.admin.revenue +=
      Number(record.fee || 0);

    state.admin.revenueRecords.unshift({

      id: record.id,

      amount: record.fee || 0,

      providerCost:
        record.providerCost || 0,

      net:
        Number(record.fee || 0) -
        Number(record.providerCost || 0),

      date: record.date,

      type: record.type

    });

    adminSave();

  }


  function syncAdminCustomer() {

    if (!state.registered) return;

    const existing =
      state.admin.customers.find(
        c => c.beastId === state.beastId
      );

    if (!existing) {

      state.admin.customers.push({

        name: state.fullName,

        phone: state.phone,

        beastId: state.beastId,

        status: "ACTIVE",

        balance: state.balance,

        registeredAt: nowText()

      });

    } else {

      existing.name =
        state.fullName;

      existing.phone =
        state.phone;

      existing.balance =
        state.balance;

      existing.status =
        "ACTIVE";

    }

    state.admin.customerCount =
      state.admin.customers.length;

    state.admin.activeCustomers =
      state.admin.customers.filter(
        c => c.status === "ACTIVE"
      ).length;

    adminSave();

  }


  /* =======================================================
     ADMIN LOGIN
     ======================================================= */

  /*
    DEMO ONLY.

    Production must use a backend authentication system,
    MFA and secure password/PIN storage.

    Demo:
      Owner ID: BEASTADMIN
      PIN: 999999
  */

  $("openAdminLogin")
    ?.addEventListener(
      "click",
      () => {

        $("adminLoginModal")
          ?.classList.remove("hidden");

      }
    );


  $("adminLoginButton")
    ?.addEventListener(
      "click",
      () => {

        const username =
          $("adminUsername")
            .value.trim()
            .toUpperCase();

        const pin =
          $("adminPin").value.trim();

        if (
          username !== "BEASTADMIN" ||
          pin !== "999999"
        ) {

          toast(
            "Invalid Owner login."
          );

          return;

        }

        closeModal("adminLoginModal");

        openAdminDashboard();

      }
    );


  function openAdminDashboard() {

    syncAdminCustomer();

    $("beastApp")
      ?.classList.add("hidden");

    $("registrationScreen")
      ?.classList.add("hidden");

    $("adminScreen")
      ?.classList.remove("hidden");

    renderAdminDashboard();

  }


  $("adminLogoutButton")
    ?.addEventListener(
      "click",
      () => {

        $("adminScreen")
          ?.classList.add("hidden");

        showApp();

        toast(
          "Owner dashboard closed."
        );

      }
    );


  /* =======================================================
     ADMIN NAVIGATION
     ======================================================= */

  document.querySelectorAll(
    "[data-admin-panel]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const target =
          button.dataset.adminPanel;

        document.querySelectorAll(
          ".admin-panel"
        ).forEach(panel => {
          panel.classList.add("hidden");
        });

        $(target)?.classList.remove("hidden");

        document.querySelectorAll(
          ".admin-side-btn"
        ).forEach(btn => {
          btn.classList.remove("active");
        });

        button.classList.add("active");

        renderAdminDashboard();

      }
    );

  });


  /* =======================================================
     ADMIN DASHBOARD
     ======================================================= */

  function renderAdminDashboard() {

    syncAdminCustomer();

    const admin =
      state.admin;

    const totalFees =
      admin.beastFees || 0;

    const providerCosts =
      admin.providerCosts || 0;

    const refunds =
      admin.refunds || 0;

    const net =
      totalFees -
      providerCosts -
      refunds;


    if ($("adminCustomerCount"))
      $("adminCustomerCount").textContent =
        admin.customerCount;

    if ($("adminActiveCustomers"))
      $("adminActiveCustomers").textContent =
        admin.activeCustomers;

    if ($("adminTransactionCount"))
      $("adminTransactionCount").textContent =
        admin.transactions.length;

    if ($("adminFeeTotal"))
      $("adminFeeTotal").textContent =
        money0(totalFees);

    if ($("adminRevenueBalance"))
      $("adminRevenueBalance").textContent =
        money(totalFees);

    if ($("adminGrossFees"))
      $("adminGrossFees").textContent =
        money0(totalFees);

    if ($("adminProviderCosts"))
      $("adminProviderCosts").textContent =
        money0(providerCosts);

    if ($("adminRefunds"))
      $("adminRefunds").textContent =
        money0(refunds);

    if ($("adminNetRevenue"))
      $("adminNetRevenue").textContent =
        money0(net);

    if ($("feeFlowProvider"))
      $("feeFlowProvider").textContent =
        money0(providerCosts);

    if ($("feeFlowBeast"))
      $("feeFlowBeast").textContent =
        money0(totalFees);

    if ($("feeFlowRevenue"))
      $("feeFlowRevenue").textContent =
        money0(net);

    if ($("revenuePageTotal"))
      $("revenuePageTotal").textContent =
        money0(totalFees);

    if ($("revenuePageNet"))
      $("revenuePageNet").textContent =
        money0(net);

    renderAdminCustomers();
    renderAdminTransactions();
    renderAdminRevenue();
    renderAdminSecurity();

  }


  /* =======================================================
     ADMIN CUSTOMERS
     ======================================================= */

  function renderAdminCustomers() {

    const table =
      $("adminCustomersTable");

    if (!table) return;

    const search =
      (
        $("adminCustomerSearch")
          ?.value || ""
      ).toLowerCase();

    const customers =
      state.admin.customers.filter(
        customer =>
          customer.name
            .toLowerCase()
            .includes(search) ||

          customer.phone
            .toLowerCase()
            .includes(search) ||

          customer.beastId
            .toLowerCase()
            .includes(search)
      );

    table.innerHTML =
      customers.map(c => `

        <tr>

          <td>
            ${c.name}
          </td>

          <td>
            ${c.phone}
          </td>

          <td>
            ${c.beastId}
          </td>

          <td>
            <span class="status success">
              ${c.status}
            </span>
          </td>

          <td>
            ${money(c.balance)}
          </td>

        </tr>

      `).join("");

  }


  $("adminCustomerSearch")
    ?.addEventListener(
      "input",
      renderAdminCustomers
    );


  /* =======================================================
     ADMIN TRANSACTIONS
     ======================================================= */

  function renderAdminTransactions() {

    const table =
      $("adminTransactionsTable");

    if (!table) return;

    if (!state.admin.transactions.length) {

      table.innerHTML = `
        <tr>
          <td colspan="7"
              class="muted">
            No transactions recorded.
          </td>
        </tr>
      `;

      return;
    }

    table.innerHTML =
      state.admin.transactions
        .map(tx => `

          <tr>

            <td>
              ${tx.id}
            </td>

            <td>
              ${tx.type}
            </td>

            <td>
              ${money(tx.amount)}
            </td>

            <td>
              ${money(tx.fee || 0)}
            </td>

            <td>
              ${tx.source || "—"}
            </td>

            <td>
              <span class="status success">
                ${tx.status}
              </span>
            </td>

            <td>
              ${tx.date}
            </td>

          </tr>

        `)
        .join("");

  }


  /* =======================================================
     ADMIN REVENUE
     ======================================================= */

  function renderAdminRevenue() {

    const container =
      $("adminRevenueList");

    if (!container) return;

    if (!state.admin.revenueRecords.length) {

      container.innerHTML = `
        <div class="muted">
          No revenue records yet.
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.admin.revenueRecords
        .map(record => `

          <div class="history-item">

            <div class="history-top">

              <div>
                <div class="history-title">
                  BEAST Fee
                </div>

                <div class="history-meta">
                  ${record.type}
                </div>
              </div>

              <div class="history-amount">
                ${money(record.amount)}
              </div>

            </div>

            <div class="history-meta">

              Provider cost:
              ${money(record.providerCost)}

              <br>

              Net recorded:
              ${money(record.net)}

              <br>

              Reference:
              ${record.id}

              <br>

              ${record.date}

            </div>

          </div>

        `)
        .join("");

  }


  /* =======================================================
     ADMIN SECURITY
     ======================================================= */

  function renderAdminSecurity() {

    const container =
      $("adminSecurityAlerts");

    if (!container) return;

    if (!state.admin.securityAlerts.length) {

      container.innerHTML = `
        <div class="alert-item">

          <div class="alert-title">
            Security monitoring active
          </div>

          <div class="alert-description">
            No recorded security events.
          </div>

        </div>
      `;

      return;
    }

    container.innerHTML =
      state.admin.securityAlerts
        .map(alert => `

          <div class="alert-item ${alert.level}">

            <div class="alert-title">
              ${alert.title}
            </div>

            <div class="alert-description">
              ${alert.description}
              <br>
              ${alert.date}
            </div>

          </div>

        `)
        .join("");

  }


  /* =======================================================
     ADMIN AI
     ======================================================= */

  function adminAIAnswer(question) {

    const q =
      String(question || "")
        .toLowerCase()
        .trim();

    const admin =
      state.admin;

    const totalFees =
      admin.beastFees || 0;

    const providerCosts =
      admin.providerCosts || 0;

    const net =
      totalFees -
      providerCosts -
      (admin.refunds || 0);


    if (
      q.includes("customer") ||
      q.includes("people") ||
      q.includes("registered")
    ) {

      return `
        BEAST currently has
        <strong>${admin.customerCount}</strong>
        recorded registered customer(s).
      `;

    }


    if (
      q.includes("active")
    ) {

      return `
        There are
        <strong>${admin.activeCustomers}</strong>
        recorded active customer(s).
      `;

    }


    if (
      q.includes("transaction") ||
      q.includes("transactions")
    ) {

      return `
        The system has recorded
        <strong>${admin.transactions.length}</strong>
        transaction(s).
      `;

    }


    if (
      q.includes("fee") ||
      q.includes("fees")
    ) {

      return `
        Recorded BEAST platform fees are
        <strong>${money(totalFees)}</strong>.
      `;

    }


    if (
      q.includes("provider") ||
      q.includes("cost")
    ) {

      return `
        Recorded provider costs are
        <strong>${money(providerCosts)}</strong>.
        These are tracked separately from BEAST revenue.
      `;

    }


    if (
      q.includes("revenue") ||
      q.includes("profit")
    ) {

      return `
        Recorded gross BEAST fees:
        <strong>${money(totalFees)}</strong><br>
        Provider costs:
        <strong>${money(providerCosts)}</strong><br>
        Recorded net:
        <strong>${money(net)}</strong>.
      `;

    }


    if (
      q.includes("today") ||
      q.includes("report")
    ) {

      return `
        <strong>BEAST Operations Report</strong><br><br>

        Customers:
        ${admin.customerCount}<br>

        Transactions:
        ${admin.transactions.length}<br>

        BEAST fees:
        ${money(totalFees)}<br>

        Provider costs:
        ${money(providerCosts)}<br>

        Net recorded:
        ${money(net)}
      `;

    }


    if (
      q.includes("security") ||
      q.includes("suspicious")
    ) {

      return `
        There are
        <strong>${admin.securityAlerts.length}</strong>
        recorded security alert(s).
        Review the Security section for details.
      `;

    }


    return `
      I can analyze customers, transactions,
      BEAST fees, provider costs, revenue and
      security.

      Try asking:
      <br><br>
      “How many customers registered?”
      <br>
      “How much are the fees?”
      <br>
      “Show today's report.”
    `;

  }


  function sendAdminAI(inputId, outputId) {

    const input =
      $(inputId);

    const output =
      $(outputId);

    if (!input || !output) return;

    const question =
      input.value.trim();

    if (!question) return;

    output.innerHTML =
      adminAIAnswer(question);

    input.value = "";

  }


  $("adminAISend")
    ?.addEventListener(
      "click",
      () => {

        sendAdminAI(
          "adminAIInput",
          "adminAIMessage"
        );

      }
    );


  $("adminAIInput")
    ?.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          sendAdminAI(
            "adminAIInput",
            "adminAIMessage"
          );

        }

      }
    );


  $("adminAISendFull")
    ?.addEventListener(
      "click",
      () => {

        sendAdminAI(
          "adminAIInputFull",
          "adminAIChat"
        );

      }
    );


  $("adminAIInputFull")
    ?.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          sendAdminAI(
            "adminAIInputFull",
            "adminAIChat"
          );

        }

      }
    );


  /* =======================================================
     SETTINGS
     ======================================================= */

  $("openSettings")
    ?.addEventListener(
      "click",
      () => {

        $("settingsModal")
          ?.classList.remove("hidden");

      }
    );


  $("toggleSecurityAlerts")
    ?.addEventListener(
      "click",
      () => {

        state.settings.securityAlerts =
          !state.settings.securityAlerts;

        $("securitySwitch")
          ?.classList.toggle(
            "on",
            state.settings.securityAlerts
          );

        save();

      }
    );


  $("toggleNotifications")
    ?.addEventListener(
      "click",
      () => {

        state.settings.notifications =
          !state.settings.notifications;

        $("notificationSwitch")
          ?.classList.toggle(
            "on",
            state.settings.notifications
          );

        save();

      }
    );


  document.querySelectorAll(
    "[data-setting]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const setting =
          button.dataset.setting;

        renderSettingsSubPage(setting);

        $("settingsSubModal")
          ?.classList.remove("hidden");

      }
    );

  });


  function renderSettingsSubPage(setting) {

    const title =
      $("settingsSubTitle");

    const content =
      $("settingsSubContent");

    if (!title || !content) return;


    if (setting === "personal") {

      title.textContent =
        "Personal Details";

      content.innerHTML = `
        <div class="verification-box">

          <div class="label">
            Full Name
          </div>

          <div class="verification-name">
            ${state.fullName}
          </div>

          <div class="label"
               style="margin-top:13px;">
            Phone
          </div>

          <div class="verification-name">
            ${state.phone}
          </div>

          <div class="label"
               style="margin-top:13px;">
            BEAST ID
          </div>

          <div class="verification-name">
            ${state.beastId}
          </div>

        </div>
      `;

      return;
    }


    if (setting === "lines") {

      title.textContent =
        "Line Management";

      content.innerHTML = `
        <div class="source-grid">

          ${state.sources
            .filter(s =>
              s.type === "M-PESA" ||
              s.type === "Airtel Money"
            )
            .map(s => `
              <div class="source-card">

                ${sourceLabel(s)}

              </div>
            `)
            .join("")}

        </div>

        <button class="btn btn-secondary"
                style="margin-top:12px;"
                onclick="toast('Line management is ready for backend integration.')">
          + ADD / MANAGE LINE
        </button>
      `;

      return;
    }


    if (setting === "pin") {

      title.textContent =
        "Change BEAST PIN";

      content.innerHTML = `

        <div class="field">

          <label class="label">
            Current PIN
          </label>

          <input id="oldPin"
                 type="password"
                 inputmode="numeric"
                 maxlength="6">

        </div>

        <div class="field">

          <label class="label">
            New PIN
          </label>

          <input id="newPin"
                 type="password"
                 inputmode="numeric"
                 maxlength="6">

        </div>

        <button class="btn btn-primary"
                id="changePinButton">
          CHANGE PIN
        </button>
      `;

      setTimeout(() => {

        $("changePinButton")
          ?.addEventListener(
            "click",
            () => {

              const oldPin =
                $("oldPin").value;

              const newPin =
                $("newPin").value;

              if (oldPin !== state.beastPin) {
                toast("Current PIN is incorrect.");
                return;
              }

              if (!/^\d{4,6}$/.test(newPin)) {
                toast("New PIN must be 4 to 6 digits.");
                return;
              }

              state.beastPin = newPin;

              save();
              saveRegistration();

              toast("BEAST PIN changed.");

              closeModal(
                "settingsSubModal"
              );

            }
          );

      }, 0);

      return;
    }


    if (
      setting === "mpesa" ||
      setting === "airtel" ||
      setting === "banks" ||
      setting === "cards" ||
      setting === "wallet"
    ) {

      const map = {
        mpesa: "M-PESA",
        airtel: "Airtel Money",
        banks: "Bank",
        cards: "Card",
        wallet: "BEAST Wallet"
      };

      const type =
        map[setting];

      title.textContent =
        type;

      const sources =
        state.sources.filter(
          s => s.type === type
        );

      content.innerHTML =
        `<div class="source-grid">
          ${sources.map(s => `
            <div class="source-card">
              ${sourceLabel(s)}
            </div>
          `).join("")}
        </div>`;

      return;
    }

  }


  $("logoutButton")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "settingsModal"
        );

        $("beastApp")
          ?.classList.add("hidden");

        $("registrationScreen")
          ?.classList.remove("hidden");

        toast(
          "Logged out of BEAST."
        );

      }
    );


  /* =======================================================
     MODALS
     ======================================================= */

  function closeModal(id) {

    $(id)?.classList.add("hidden");

  }


  document.querySelectorAll(
    "[data-close]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {

        closeModal(
          button.dataset.close
        );

      }
    );

  });


  document.querySelectorAll(
    ".modal"
  ).forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (event.target === modal) {
          modal.classList.add("hidden");
        }

      }
    );

  });


  /* =======================================================
     SECURITY VISIBILITY MONITOR
     ======================================================= */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden &&
        state.settings.securityAlerts
      ) {

        state.admin.securityAlerts.unshift({

          title:
            "Session visibility changed",

          description:
            "The BEAST browser session became hidden.",

          level:
            "warning",

          date:
            nowText()

        });

        state.admin.securityAlerts =
          state.admin.securityAlerts.slice(0, 50);

        adminSave();

      }

    }
  );


  /* =======================================================
     INITIALIZATION
     ======================================================= */

  if (!state.balance) {

    state.balance =
      state.sources.reduce(
        (sum, source) =>
          sum + Number(source.balance || 0),
        0
      );

  }

  renderLipaDetails();
  renderReceiveDetails();

  loadRegistration();

  syncAdminCustomer();

  save();

});