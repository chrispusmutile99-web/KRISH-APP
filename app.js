/* =========================================================
   MONEY TRANSFER BEAST
   app.js
   DEMO / PROTOTYPE ONLY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "money_transfer_beast_demo_v12";
  const THEME_KEY = "money_transfer_beast_theme";
  const DEMO_ADMIN_PASSWORD = "beast123";

  const $ = id => document.getElementById(id);
  const qa = selector => [...document.querySelectorAll(selector)];

  /* =========================================================
     STATE
  ========================================================= */

  const defaultState = {
    registered: false,

    user: {
      name: "",
      phone: "",
      nationalId: "",
      beastId: "",
      pin: ""
    },

    sources: {
      mpesa: {
        name: "M-PESA",
        balance: 5000,
        enabled: true,
        account: "0712345678"
      },

      airtel: {
        name: "Airtel Money",
        balance: 0,
        enabled: true,
        account: ""
      },

      bank: {
        name: "Bank Account",
        balance: 0,
        enabled: true,
        account: ""
      },

      card: {
        name: "Card",
        balance: 0,
        enabled: true,
        account: ""
      },

      wallet: {
        name: "BEAST Wallet",
        balance: 0,
        enabled: true,
        account: "BEAST-WALLET"
      }
    },

    transactions: [],
    notifications: [],
    securityEvents: [],

    owner: {
      fees: 0,
      providerCosts: 0,
      volume: 0,
      count: 0
    },

    settings: {
      notifications: true,
      screenSecurity: true,
      biometric: false
    }
  };

  let state;

  try {
    state =
      JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
      JSON.parse(JSON.stringify(defaultState));
  } catch (error) {
    state =
      JSON.parse(JSON.stringify(defaultState));
  }

  let pendingAction = null;

  /* =========================================================
     STORAGE
  ========================================================= */

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  /* =========================================================
     MONEY
  ========================================================= */

  function money(value) {
    return Number(value || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function kes(value) {
    return `KES ${money(value)}`;
  }

  /* =========================================================
     UI HELPERS
  ========================================================= */

  function show(element) {
    if (!element) return;

    element.classList.remove("hidden");
    element.style.display = "";
  }

  function hide(element) {
    if (!element) return;

    element.classList.add("hidden");
  }

  function toast(message) {
    let box = $("toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      box.className = "toast";
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.classList.add("show");

    clearTimeout(window.beastToastTimer);

    window.beastToastTimer =
      setTimeout(() => {
        box.classList.remove("show");
      }, 2500);
  }

  function normalizePhone(value) {
    let phone = String(value || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

    if (phone.startsWith("+254")) {
      phone = phone.substring(1);
    }

    if (phone.startsWith("0")) {
      phone = "254" + phone.substring(1);
    }

    return phone;
  }

  function validKenyanPhone(value) {
    return /^(?:07|01)\d{8}$/.test(
      String(value || "").replace(/\s/g, "")
    );
  }

  function generateBeastId() {
    return `BEAST-${Math.floor(
      100000 + Math.random() * 900000
    )}`;
  }

  function reference(prefix = "BT") {
    return (
      prefix +
      Date.now().toString().slice(-8) +
      Math.floor(100 + Math.random() * 900)
    );
  }

  /* =========================================================
     BEAST FEE
     ========================================================= */

  function beastFee(amount) {
    amount = Number(amount || 0);

    if (amount <= 1000) return 7;
    if (amount <= 10000) return 30;

    return 50;
  }

  /* =========================================================
     PROVIDER COST
     DEMO ESTIMATION ONLY
     ========================================================= */

  function providerCost(provider, amount) {
    amount = Number(amount || 0);

    if (provider === "mpesa") {
      if (amount <= 100) return 0;
      if (amount <= 1500) return 5;
      if (amount <= 5000) return 9;
      if (amount <= 20000) return 11;
      if (amount <= 250000) return 13;

      return 20;
    }

    if (provider === "airtel") {
      return amount <= 1500 ? 5 : 10;
    }

    if (provider === "bank") {
      return amount <= 10000 ? 3 : 10;
    }

    if (provider === "card") {
      return amount <= 10000 ? 8 : 15;
    }

    return 0;
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function showScreen(screenId) {
    qa(".app-screen").forEach(screen => {
      screen.classList.toggle(
        "active",
        screen.id === screenId
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (screenId === "historyScreen") {
      renderHistory();
    }

    if (screenId === "notificationsScreen") {
      renderNotifications();
    }

    if (
      screenId === "ownerDashboardScreen" ||
      screenId === "adminDashboardScreen"
    ) {
      renderAdmin();
    }
  }

  function home() {
    if (state.registered) {
      showScreen("dashboardScreen");
    } else {
      showScreen("registrationScreen");
    }
  }

  /* =========================================================
     REGISTRATION
  ========================================================= */

  function registrationStep(step) {
    qa("[data-registration-step]").forEach(
      element => {
        element.classList.toggle(
          "hidden",
          Number(element.dataset.registrationStep) !== step
        );
      }
    );
  }

  function setupRegistration() {
    const next1 = $("registrationNext1");

    if (next1) {
      next1.onclick = () => {
        const name =
          $("regName")?.value.trim();

        const phone =
          $("regPhone")?.value.trim();

        const nationalId =
          $("regNationalId")?.value.trim();

        if (
          !name ||
          !validKenyanPhone(phone) ||
          nationalId.length < 4
        ) {
          toast(
            "Enter a valid name, Kenyan phone and National ID."
          );
          return;
        }

        state.user.name = name;
        state.user.phone = phone;
        state.user.nationalId = nationalId;
        state.user.beastId =
          generateBeastId();

        if ($("registrationSummary")) {
          $("registrationSummary").innerHTML = `
            <p><b>Name:</b> ${name}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>National ID:</b> ${nationalId}</p>
            <p><b>BEAST ID:</b> ${state.user.beastId}</p>
          `;
        }

        registrationStep(2);
      };
    }

    const next2 = $("registrationNext2");

    if (next2) {
      next2.onclick = () => {
        const pin =
          $("regPin")?.value || "";

        const confirmPin =
          $("regPinConfirm")?.value || "";

        if (
          !/^\d{4}$/.test(pin) ||
          pin !== confirmPin
        ) {
          toast(
            "PIN must contain 4 matching digits."
          );
          return;
        }

        state.user.pin = pin;

        registrationStep(3);
      };
    }

    const finish =
      $("finishRegistration");

    if (finish) {
      finish.onclick = () => {
        state.registered = true;

        addNotification(
          "BEAST account created",
          `Welcome ${state.user.name}. Your BEAST ID is ${state.user.beastId}.`
        );

        addSecurity(
          "New BEAST account registered."
        );

        save();
        updateDashboard();

        showScreen("dashboardScreen");

        toast(
          "MONEY TRANSFER BEAST account created."
        );
      };
    }

    qa("[data-registration-back]").forEach(
      button => {
        button.onclick = () => {
          registrationStep(
            Number(
              button.dataset.registrationBack
            )
          );
        };
      }
    );
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  function updateDashboard() {
    if (!state.user) return;

    const totalBalance =
      Object.values(state.sources)
        .reduce(
          (sum, source) =>
            sum +
            (source.enabled
              ? Number(source.balance)
              : 0),
          0
        );

    const values = {
      dashboardName: state.user.name,
      dashboardBeastId: state.user.beastId,
      dashboardPhone: state.user.phone,
      profileName: state.user.name,
      profilePhone: state.user.phone,
      profileBeastId: state.user.beastId,
      receiveProfileName: state.user.name,
      receiveBeastId: state.user.beastId,
      dashboardBalance: kes(totalBalance)
    };

    Object.entries(values).forEach(
      ([id, value]) => {
        if ($(id)) {
          $(id).textContent = value;
        }
      }
    );

    if ($("receiveNumber")) {
      $("receiveNumber").value =
        state.user.phone;
    }

    renderSources();
    renderAdmin();
    updateSourceSelectors();
  }

  /* =========================================================
     SQUARE SOURCE CARDS
  ========================================================= */

  function renderSources() {
    const container =
      $("sourceList");

    if (!container) return;

    container.innerHTML =
      Object.entries(state.sources)
        .map(([key, source]) => `
          <button
            type="button"
            class="source-item square-card ${
              source.enabled
                ? ""
                : "disabled"
            }"
            data-source="${key}"
          >
            <span class="source-icon">
              ${
                key === "mpesa"
                  ? "M"
                  : key === "airtel"
                  ? "A"
                  : key === "bank"
                  ? "B"
                  : key === "card"
                  ? "V"
                  : "BE"
              }
            </span>

            <b>${source.name}</b>

            <strong>
              ${
                source.enabled
                  ? kes(source.balance)
                  : "Not linked"
              }
            </strong>
          </button>
        `)
        .join("");

    qa("[data-source]").forEach(
      button => {
        button.onclick = () => {
          const source =
            button.dataset.source;

          if (
            !state.sources[source].enabled
          ) {
            toast(
              "This account is not linked yet."
            );
            return;
          }

          state.selectedSource = source;

          updateSourceSelectors();

          toast(
            `${state.sources[source].name} selected`
          );
        };
      }
    );
  }

  function updateSourceSelectors() {
    [
      "sendSource",
      "receiveSource",
      "lipaSource",
      "withdrawSource"
    ].forEach(id => {
      const select = $(id);

      if (!select) return;

      select.innerHTML =
        Object.entries(state.sources)
          .filter(
            ([, source]) =>
              source.enabled
          )
          .map(
            ([key, source]) => `
              <option
                value="${key}"
                ${
                  key ===
                  state.selectedSource
                    ? "selected"
                    : ""
                }
              >
                ${source.name}
                — ${kes(source.balance)}
              </option>
            `
          )
          .join("");
    });
  }

  /* =========================================================
     TRANSACTION RECORDING
  ========================================================= */

  function recordTransaction(data) {
    const transaction = {
      id: Date.now(),
      reference: reference(
        data.type.substring(0, 3).toUpperCase()
      ),
      createdAt:
        new Date().toISOString(),
      status: "completed",
      ...data
    };

    state.transactions.unshift(
      transaction
    );

    state.transactions =
      state.transactions.slice(0, 100);

    state.owner.count += 1;
    state.owner.volume +=
      Number(data.amount || 0);

    state.owner.fees +=
      Number(data.fee || 0);

    state.owner.providerCosts +=
      Number(data.providerCost || 0);
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  function addNotification(
    title,
    body
  ) {
    state.notifications.unshift({
      title,
      body,
      createdAt:
        new Date().toISOString(),
      read: false
    });

    state.notifications =
      state.notifications.slice(0, 100);
  }

  function renderNotifications() {
    const container =
      $("notificationList");

    if (!container) return;

    if (!state.notifications.length) {
      container.innerHTML =
        "<p>No notifications.</p>";
      return;
    }

    container.innerHTML =
      state.notifications
        .map(
          notification => `
            <div class="notice">
              <b>
                ${notification.title}
              </b>

              <p>
                ${notification.body}
              </p>

              <small>
                ${new Date(
                  notification.createdAt
                ).toLocaleString()}
              </small>
            </div>
          `
        )
        .join("");

    qa("[data-notification-count]")
      .forEach(
        element => {
          element.textContent =
            state.notifications.filter(
              n => !n.read
            ).length;
        }
      );
  }

  /* =========================================================
     SECURITY
  ========================================================= */

  function addSecurity(text) {
    state.securityEvents.unshift({
      text,
      createdAt:
        new Date().toISOString()
    });

    state.securityEvents =
      state.securityEvents.slice(0, 100);
  }

  function renderSecurity() {
    const container =
      $("securityList");

    if (!container) return;

    if (!state.securityEvents.length) {
      container.innerHTML =
        "<p>No security events.</p>";
      return;
    }

    container.innerHTML =
      state.securityEvents
        .map(
          event => `
            <div class="event">
              <b>${event.text}</b>

              <small>
                ${new Date(
                  event.createdAt
                ).toLocaleString()}
              </small>
            </div>
          `
        )
        .join("");
  }

  /* =========================================================
     RECEIVE / BUYER PAYMENT
  ========================================================= */

  function setupReceive() {
    const verifyBuyer =
      $("verifyBuyer");

    if (verifyBuyer) {
      verifyBuyer.onclick =
        verifyBuyerLogin;
    }

    const verifyDestination =
      $("verifyReceiveDestination");

    if (verifyDestination) {
      verifyDestination.onclick =
        verifyBuyerDestination;
    }

    const receiveButton =
      $("receiveMoneyButton") ||
      $("confirmReceive");

    if (receiveButton) {
      receiveButton.onclick = () =>
        authorize("receive");
    }

    const destinationType =
      $("receiveDestinationType");

    if (destinationType) {
      destinationType.onchange =
        renderReceiveDestination;
    }

    renderReceiveDestination();
  }

  function verifyBuyerLogin() {
    const phone =
      $("buyerPhone")
        ?.value.trim();

    const nationalId =
      $("buyerNationalId")
        ?.value.trim();

    const password =
      $("buyerPassword")
        ?.value || "";

    if (
      !validKenyanPhone(phone) ||
      !nationalId ||
      !password
    ) {
      toast(
        "Enter buyer phone, National ID and password."
      );
      return;
    }

    /*
      DEMO LOGIN:
      In the prototype the BEAST PIN is
      used as the demo account password.
    */

    if (
      password !== state.user.pin &&
      password !== "beast123"
    ) {
      toast(
        "Buyer login details are incorrect."
      );
      return;
    }

    const box =
      $("buyerLoginVerification");

    if (box) {
      box.innerHTML = `
        <b>✓ Buyer verified</b>
        <br>
        <small>
          ${phone}
        </small>
      `;

      show(box);
    }

    show(
      $("receiveDestinationSection")
    );

    toast(
      "Buyer verified. Select where the money should go."
    );
  }

  function renderReceiveDestination() {
    const type =
      $("receiveDestinationType")
        ?.value;

    const container =
      $("receiveDestinationFields");

    if (!container) return;

    if (type === "pochi") {
      container.innerHTML = `
        <label>
          Pochi la Biashara phone number
        </label>

        <input
          id="pochiNumber"
          inputmode="numeric"
          placeholder="07XXXXXXXX"
        >
      `;
    }

    else if (type === "till") {
      container.innerHTML = `
        <label>
          Till Number
        </label>

        <input
          id="receiveTill"
          inputmode="numeric"
          placeholder="Enter Till Number"
        >
      `;
    }

    else if (type === "paybill") {
      container.innerHTML = `
        <label>
          Business Number
        </label>

        <input
          id="receiveBusinessNumber"
          inputmode="numeric"
          placeholder="PayBill Business Number"
        >

        <label>
          Account Number
        </label>

        <input
          id="receiveAccountNumber"
          placeholder="Account Number"
        >
      `;
    }

    else if (type === "bank") {
      container.innerHTML = `
        <label>
          Bank
        </label>

        <select id="receiveBank">
          ${bankOptions()}
        </select>

        <label>
          Account Number
        </label>

        <input
          id="receiveBankAccount"
          placeholder="Bank Account Number"
        >

        <label>
          Account Name
        </label>

        <input
          id="receiveBankName"
          placeholder="Account Name"
        >
      `;
    }

    else if (type === "card") {
      container.innerHTML = `
        <label>
          Card Network
        </label>

        <select id="receiveCardType">
          ${cardOptions()}
        </select>

        <label>
          Card Number
        </label>

        <input
          id="receiveCardNumber"
          inputmode="numeric"
          placeholder="Card Number"
        >
      `;
    }

    else {
      container.innerHTML = `
        <label>
          Phone / BEAST ID / Account
        </label>

        <input
          id="receiveOtherNumber"
          placeholder="Enter destination"
        >
      `;
    }
  }

  function verifyBuyerDestination() {
    const type =
      $("receiveDestinationType")
        ?.value;

    let destination = "";

    if (type === "pochi") {
      destination =
        $("pochiNumber")
          ?.value.trim();
    }

    if (type === "till") {
      destination =
        $("receiveTill")
          ?.value.trim();
    }

    if (type === "paybill") {
      destination =
        $("receiveBusinessNumber")
          ?.value.trim();

      const account =
        $("receiveAccountNumber")
          ?.value.trim();

      if (!destination || !account) {
        toast(
          "Enter Business Number and Account Number."
        );
        return;
      }

      destination =
        `${destination} / ${account}`;
    }

    if (type === "bank") {
      const bank =
        $("receiveBank")
          ?.value;

      const account =
        $("receiveBankAccount")
          ?.value.trim();

      if (!bank || !account) {
        toast(
          "Enter bank and account number."
        );
        return;
      }

      destination =
        `${bank} / ${account}`;
    }

    if (type === "card") {
      const card =
        $("receiveCardNumber")
          ?.value.trim();

      if (!card) {
        toast(
          "Enter card number."
        );
        return;
      }

      destination = card;
    }

    if (type === "other") {
      destination =
        $("receiveOtherNumber")
          ?.value.trim();
    }

    if (!destination) {
      toast(
        "Enter destination details."
      );
      return;
    }

    const box =
      $("receiveDestinationVerification");

    if (box) {
      box.innerHTML = `
        <b>
          ✓ Destination verified
        </b>

        <br>

        <small>
          ${type.toUpperCase()}
          • ${destination}
        </small>

        <br><br>

        <small>
          Seller/recipient balance will not
          be displayed to the buyer.
        </small>
      `;

      show(box);
    }

    show(
      $("receiveAmountSection")
    );

    toast(
      "Destination verified."
    );
  }

  function processBuyerPayment() {
    const source =
      $("receiveSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("receiveAmount")?.value
      );

    const type =
      $("receiveDestinationType")
        ?.value ||
      "other";

    const selected =
      state.sources[source];

    if (
      !selected ||
      !selected.enabled
    ) {
      toast(
        "Select a valid payment source."
      );
      return;
    }

    if (
      !amount ||
      amount <= 0
    ) {
      toast(
        "Enter a valid amount."
      );
      return;
    }

    const fee =
      beastFee(amount);

    const total =
      amount + fee;

    if (
      selected.balance < total
    ) {
      toast(
        "Insufficient buyer balance."
      );
      return;
    }

    const destination =
      getReceiveDestination(type);

    if (!destination) {
      toast(
        "Verify the destination first."
      );
      return;
    }

    const cost =
      providerCost(
        source,
        amount
      );

    selected.balance -= total;

    /*
      IMPORTANT:
      We deliberately do not display
      the seller's balance.
    */

    recordTransaction({
      type: "Buyer Payment",
      amount,
      fee,
      providerCost: cost,
      source,
      recipient: destination,
      recipientName:
        "Verified Seller / Recipient",
      description:
        `Payment to ${type}`
    });

    addNotification(
      "Payment completed",
      `${kes(amount)} moved from ${selected.name}. BEAST fee: ${kes(fee)}.`
    );

    addSecurity(
      `Buyer payment authorized to ${type}.`
    );

    save();

    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();

    toast(
      `${kes(amount)} payment completed.`
    );
  }

  function getReceiveDestination(type) {
    if (type === "pochi") {
      return $("pochiNumber")
        ?.value.trim();
    }

    if (type === "till") {
      return $("receiveTill")
        ?.value.trim();
    }

    if (type === "paybill") {
      const business =
        $("receiveBusinessNumber")
          ?.value.trim();

      const account =
        $("receiveAccountNumber")
          ?.value.trim();

      if (!business || !account) {
        return "";
      }

      return `${business}/${account}`;
    }

    if (type === "bank") {
      const bank =
        $("receiveBank")
          ?.value;

      const account =
        $("receiveBankAccount")
          ?.value.trim();

      return bank && account
        ? `${bank}/${account}`
        : "";
    }

    if (type === "card") {
      return $("receiveCardNumber")
        ?.value.trim();
    }

    return $("receiveOtherNumber")
      ?.value.trim();
  }

  /* =========================================================
     WITHDRAW
  ========================================================= */

  function setupWithdraw() {
    const verify =
      $("verifyAgent");

    if (verify) {
      verify.onclick = () => {
        const agent =
          $("agentNumber")
            ?.value.trim();

        const store =
          $("storeNumber")
            ?.value.trim();

        if (!agent || !store) {
          toast(
            "Enter Agent Number and Store Number."
          );
          return;
        }

        const box =
          $("agentVerification");

        if (box) {
          box.innerHTML = `
            <b>
              ✓ Verified BEAST Agent
            </b>

            <br>

            <small>
              Agent: ${agent}
              <br>
              Store: ${store}
            </small>
          `;

          show(box);
        }
      };
    }

    const button =
      $("withdrawButton");

    if (button) {
      button.onclick = () =>
        authorize("withdraw");
    }
  }

  function processWithdraw() {
    const agent =
      $("agentNumber")
        ?.value.trim();

    const store =
      $("storeNumber")
        ?.value.trim();

    const source =
      $("withdrawSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("withdrawAmount")?.value
      );

    if (!agent || !store) {
      toast(
        "Verify agent and store first."
      );
      return;
    }

    if (!amount || amount <= 0) {
      toast(
        "Enter a valid amount."
      );
      return;
    }

    const selected =
      state.sources[source];

    const fee =
      beastFee(amount);

    const total =
      amount + fee;

    if (
      !selected ||
      selected.balance < total
    ) {
      toast(
        "Insufficient balance."
      );
      return;
    }

    const cost =
      providerCost(
        source,
        amount
      );

    selected.balance -= total;

    recordTransaction({
      type: "Withdraw",
      amount,
      fee,
      providerCost: cost,
      source,
      recipient:
        `${agent}/${store}`,
      recipientName:
        "BEAST Agent",
      description:
        "Agent cash withdrawal"
    });

    addNotification(
      "Withdrawal completed",
      `${kes(amount)} withdrawn through agent ${agent}.`
    );

    addSecurity(
      "Agent withdrawal authorized."
    );

    save();

    updateDashboard();
    renderHistory();

    toast(
      "Withdrawal completed."
    );
  }

  /* =========================================================
     LIPA NA
  ========================================================= */

  function setupLipa() {
    const type =
      $("lipaType");

    if (type) {
      type.onchange =
        renderLipaFields;
    }

    const button =
      $("lipaPayButton");

    if (button) {
      button.onclick = () =>
        authorize("lipa");
    }

    renderLipaFields();
  }

  function renderLipaFields() {
    const type =
      $("lipaType")?.value;

    const container =
      $("lipaFields");

    if (!container) return;

    if (type === "mpesa") {
      container.innerHTML = `
        <label>
          M-PESA payment type
        </label>

        <select id="mpesaPaymentType">
          <option value="paybill">
            PayBill
          </option>

          <option value="till">
            Buy Goods / Till
          </option>

          <option value="pochi">
            Pochi la Biashara
          </option>

          <option value="send">
            Send Money
          </option>
        </select>

        <div id="mpesaFields"></div>
      `;

      const select =
        $("mpesaPaymentType");

      select.onchange =
        renderMpesaFields;

      renderMpesaFields();
    }

    else if (type === "airtel") {
      container.innerHTML = `
        <label>
          Airtel Money Number
        </label>

        <input
          id="airtelNumber"
          inputmode="numeric"
          placeholder="01XXXXXXXX"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else if (type === "bank") {
      container.innerHTML = `
        <label>
          Bank
        </label>

        <select id="lipaBank">
          ${bankOptions()}
        </select>

        <label>
          Account Number
        </label>

        <input
          id="lipaBankAccount"
          placeholder="Account Number"
        >

        <label>
          Account Name
        </label>

        <input
          id="lipaBankName"
          placeholder="Account Name"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY BANK
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else if (type === "card") {
      container.innerHTML = `
        <label>
          Card Network
        </label>

        <select id="lipaCardType">
          ${cardOptions()}
        </select>

        <label>
          Card Number
        </label>

        <input
          id="lipaCardNumber"
          inputmode="numeric"
          placeholder="Card Number"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY CARD
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else {
      container.innerHTML = `
        <p>
          Select a payment source.
        </p>
      `;
    }
  }

  function renderMpesaFields() {
    const type =
      $("mpesaPaymentType")
        ?.value;

    const box =
      $("mpesaFields");

    if (!box) return;

    if (type === "paybill") {
      box.innerHTML = `
        <label>
          Business Number
        </label>

        <input
          id="lipaBusinessNumber"
          inputmode="numeric"
          placeholder="Business Number"
        >

        <label>
          Account Number
        </label>

        <input
          id="lipaAccountNumber"
          placeholder="Account Number"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY PAYBILL
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else if (type === "till") {
      box.innerHTML = `
        <label>
          Till Number
        </label>

        <input
          id="lipaTillNumber"
          inputmode="numeric"
          placeholder="Till Number"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY TILL
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else if (type === "pochi") {
      box.innerHTML = `
        <label>
          Pochi Phone Number
        </label>

        <input
          id="lipaPochiNumber"
          inputmode="numeric"
          placeholder="07XXXXXXXX"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY POCHI
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }

    else {
      box.innerHTML = `
        <label>
          Recipient Phone Number
        </label>

        <input
          id="lipaSendNumber"
          inputmode="numeric"
          placeholder="07XXXXXXXX"
        >

        <button
          type="button"
          id="verifyLipaDestination"
        >
          VERIFY NUMBER
        </button>

        <div
          id="lipaVerification"
        ></div>
      `;

      bindLipaVerification();
    }
  }

  function bindLipaVerification() {
    const button =
      $("verifyLipaDestination");

    if (!button) return;

    button.onclick = () => {
      const data =
        getLipaDestination();

      if (!data) {
        toast(
          "Enter complete destination details."
        );
        return;
      }

      const box =
        $("lipaVerification");

      if (box) {
        box.innerHTML = `
          <b>
            ✓ Destination verified
          </b>

          <br>

          <small>
            ${data}
          </small>
        `;

        show(box);
      }

      toast(
        "Lipa Na destination verified."
      );
    };
  }

  function getLipaDestination() {
    const type =
      $("lipaType")?.value;

    if (type === "mpesa") {
      const sub =
        $("mpesaPaymentType")
          ?.value;

      if (sub === "paybill") {
        const business =
          $("lipaBusinessNumber")
            ?.value.trim();

        const account =
          $("lipaAccountNumber")
            ?.value.trim();

        if (!business || !account) {
          return "";
        }

        return `M-PESA PayBill: ${business}/${account}`;
      }

      if (sub === "till") {
        const till =
          $("lipaTillNumber")
            ?.value.trim();

        return till
          ? `M-PESA Till: ${till}`
          : "";
      }

      if (sub === "pochi") {
        const phone =
          $("lipaPochiNumber")
            ?.value.trim();

        return phone
          ? `Pochi: ${phone}`
          : "";
      }

      const phone =
        $("lipaSendNumber")
          ?.value.trim();

      return phone
        ? `M-PESA Send: ${phone}`
        : "";
    }

    if (type === "airtel") {
      const phone =
        $("airtelNumber")
          ?.value.trim();

      return phone
        ? `Airtel Money: ${phone}`
        : "";
    }

    if (type === "bank") {
      const bank =
        $("lipaBank")?.value;

      const account =
        $("lipaBankAccount")
          ?.value.trim();

      return bank && account
        ? `${bank}: ${account}`
        : "";
    }

    if (type === "card") {
      const cardType =
        $("lipaCardType")?.value;

      const card =
        $("lipaCardNumber")
          ?.value.trim();

      return cardType && card
        ? `${cardType}: ${card}`
        : "";
    }

    return "";
  }

  function processLipa() {
    const source =
      $("lipaSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("lipaAmount")?.value
      );

    const destination =
      getLipaDestination();

    if (
      !destination ||
      !amount ||
      amount <= 0
    ) {
      toast(
        "Verify destination and enter amount."
      );
      return;
    }

    const selected =
      state.sources[source];

    const fee =
      beastFee(amount);

    const total =
      amount + fee;

    if (
      !selected ||
      selected.balance < total
    ) {
      toast(
        "Insufficient balance."
      );
      return;
    }

    const cost =
      providerCost(
        source,
        amount
      );

    selected.balance -= total;

    recordTransaction({
      type: "Lipa Na",
      amount,
      fee,
      providerCost: cost,
      source,
      recipient: destination,
      recipientName:
        "Verified Merchant / Recipient",
      description:
        "Lipa Na payment"
    });

    addNotification(
      "Lipa Na payment completed",
      `${kes(amount)} paid. BEAST fee: ${kes(fee)}.`
    );

    addSecurity(
      "Lipa Na payment authorized."
    );

    save();

    updateDashboard();
    renderHistory();

    toast(
      "Lipa Na payment completed."
    );
  }

  /* =========================================================
     BANKS
  ========================================================= */

  function bankOptions() {
    return `
      <option value="Equity Bank">
        Equity Bank
      </option>

      <option value="KCB Bank">
        KCB Bank
      </option>

      <option value="Co-operative Bank">
        Co-operative Bank
      </option>

      <option value="NCBA Bank">
        NCBA Bank
      </option>

      <option value="Absa Bank Kenya">
        Absa Bank Kenya
      </option>

      <option value="Stanbic Bank Kenya">
        Stanbic Bank Kenya
      </option>

      <option value="I&M Bank">
        I&M Bank
      </option>

      <option value="DTB Kenya">
        DTB Kenya
      </option>

      <option value="Family Bank">
        Family Bank
      </option>
    `;
  }

  /* =========================================================
     CARDS
  ========================================================= */

  function cardOptions() {
    return `
      <option value="Visa">
        Visa
      </option>

      <option value="Mastercard">
        Mastercard
      </option>

      <option value="American Express">
        American Express
      </option>

      <option value="Equity Visa">
        Equity Visa
      </option>

      <option value="KCB Visa">
        KCB Visa
      </option>
    `;
  }

  /* =========================================================
     PIN AUTHORIZATION
  ========================================================= */

  function authorize(action) {
    pendingAction = action;

    const modal =
      $("pinModal");

    if (modal) {
      show(modal);

      const input =
        $("authorizationPin");

      if (input) {
        input.value = "";
        setTimeout(
          () => input.focus(),
          100
        );
      }

      return;
    }

    const pin =
      prompt(
        "Enter your 4-digit BEAST PIN"
      );

    processAuthorization(
      pin
    );
  }

  function processAuthorization(pin) {
    if (
      !state.user ||
      pin !== state.user.pin
    ) {
      addSecurity(
        "Failed BEAST PIN authorization attempt."
      );

      save();

      renderSecurity();

      toast(
        "Incorrect BEAST PIN."
      );

      pendingAction = null;

      return;
    }

    const action =
      pendingAction;

    pendingAction = null;

    hide($("pinModal"));

    if (action === "receive") {
      processBuyerPayment();
    }

    if (action === "withdraw") {
      processWithdraw();
    }

    if (action === "lipa") {
      processLipa();
    }

    if (action === "send") {
      processSend();
    }
  }

  function setupPinAuthorization() {
    const confirm =
      $("confirmPin") ||
      $("authorizeButton") ||
      $("submitPin") ||
      $("pinConfirm");

    if (confirm) {
      confirm.onclick = () => {
        processAuthorization(
          $("authorizationPin")
            ?.value || ""
        );
      };
    }

    const cancel =
      $("cancelPin") ||
      $("closePinModal") ||
      $("authorizationCancel");

    if (cancel) {
      cancel.onclick = () => {
        pendingAction = null;
        hide($("pinModal"));
      };
    }
  }

  /* =========================================================
     STANDARD SEND
  ========================================================= */

  function setupSend() {
    const verify =
      $("verifyRecipient");

    if (verify) {
      verify.onclick = () => {
        const phone =
          $("sendPhone")
            ?.value.trim();

        if (!validKenyanPhone(phone)) {
          toast(
            "Enter a valid Kenyan phone number."
          );
          return;
        }

        const box =
          $("recipientVerification");

        if (box) {
          box.innerHTML = `
            <b>
              ✓ Verified BEAST Recipient
            </b>

            <br>

            <small>
              ${phone}
            </small>
          `;

          show(box);
        }
      };
    }

    const button =
      $("sendMoneyButton");

    if (button) {
      button.onclick = () =>
        authorize("send");
    }
  }

  function processSend() {
    const source =
      $("sendSource")?.value ||
      state.selectedSource;

    const phone =
      $("sendPhone")
        ?.value.trim();

    const amount =
      Number(
        $("sendAmount")?.value
      );

    if (
      !validKenyanPhone(phone) ||
      !amount ||
      amount <= 0
    ) {
      toast(
        "Enter recipient and amount."
      );
      return;
    }

    const selected =
      state.sources[source];

    const fee =
      beastFee(amount);

    const total =
      amount + fee;

    if (
      !selected ||
      selected.balance < total
    ) {
      toast(
        "Insufficient balance."
      );
      return;
    }

    const cost =
      providerCost(
        source,
        amount
      );

    selected.balance -= total;

    recordTransaction({
      type: "Send",
      amount,
      fee,
      providerCost: cost,
      source,
      recipient: phone,
      recipientName:
        "Verified BEAST Recipient",
      description:
        "BEAST Send Money"
    });

    addNotification(
      "Money sent",
      `${kes(amount)} sent to ${phone}.`
    );

    addSecurity(
      "Send Money transaction authorized."
    );

    save();

    updateDashboard();
    renderHistory();

    toast(
      "Money sent successfully."
    );
  }

  /* =========================================================
     HISTORY
  ========================================================= */

  function renderHistory() {
    const container =
      $("historyList");

    if (!container) return;

    if (!state.transactions.length) {
      container.innerHTML =
        "<p>No transactions yet.</p>";
      return;
    }

    container.innerHTML =
      state.transactions
        .map(
          transaction => `
            <div class="transaction">
              <div>
                <b>
                  ${transaction.type}
                </b>

                <small>
                  ${transaction.reference}
                </small>

                <small>
                  ${transaction.description}
                </small>

                <small>
                  ${new Date(
                    transaction.createdAt
                  ).toLocaleString()}
                </small>
              </div>

              <strong>
                ${kes(transaction.amount)}
              </strong>
            </div>
          `
        )
        .join("");
  }

  /* =========================================================
     ADMIN
  ========================================================= */

  function setupAdmin() {
    const button =
      $("ownerLoginButton") ||
      $("adminLoginButton");

    if (!button) return;

    button.onclick = () => {
      const password =
        $("ownerPassword")
          ?.value ||
        $("adminPassword")
          ?.value ||
        "";

      if (
        password !==
        DEMO_ADMIN_PASSWORD
      ) {
        toast(
          "Incorrect BEAST Admin password."
        );
        return;
      }

      showScreen(
        $("ownerDashboardScreen")
          ? "ownerDashboardScreen"
          : "adminDashboardScreen"
      );

      toast(
        "BEAST Admin unlocked."
      );
    };
  }

  function renderAdmin() {
    const values = {
      ownerFees:
        kes(state.owner.fees),

      ownerProviderCosts:
        kes(state.owner.providerCosts),

      ownerVolume:
        kes(state.owner.volume),

      ownerTransactions:
        state.owner.count,

      ownerNetRevenue:
        kes(
          state.owner.fees -
          state.owner.providerCosts
        ),

      adminRevenue:
        kes(
          state.owner.fees -
          state.owner.providerCosts
        )
    };

    Object.entries(values).forEach(
      ([id, value]) => {
        if ($(id)) {
          $(id).textContent = value;
        }
      }
    );
  }

  /* =========================================================
     LOGIN / BALANCE
  ========================================================= */

  function setupLogin() {
    const button =
      $("loginButton") ||
      $("customerLoginButton");

    if (!button) return;

    button.onclick = () => {
      const account =
        $("loginAccount")
          ?.value.trim() ||
        $("accountNumber")
          ?.value.trim() ||
        $("phoneNumber")
          ?.value.trim();

      const name =
        (
          $("loginName")
            ?.value ||
          $("fullName")
            ?.value ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        !state.user ||
        normalizePhone(account) !==
          normalizePhone(
            state.user.phone
          ) ||
        name !==
          state.user.name.toLowerCase()
      ) {
        toast(
          "Account details do not match."
        );
        return;
      }

      const total =
        Object.values(
          state.sources
        ).reduce(
          (sum, source) =>
            sum +
            (source.enabled
              ? Number(source.balance)
              : 0),
          0
        );

      const result =
        $("loginBalance");

      if (result) {
        result.innerHTML = `
          <b>
            ${state.user.name}
          </b>

          <br>

          <strong>
            ${kes(total)}
          </strong>

          <br>

          <small>
            ${state.user.beastId}
          </small>
        `;

        show(result);
      }
    };
  }

  /* =========================================================
     SETTINGS
  ========================================================= */

  function setupSettings() {
    qa("[data-theme-toggle]")
      .forEach(button => {
        button.onclick = () => {
          const current =
            document.body.dataset.theme ||
            "dark";

          const next =
            current === "dark"
              ? "light"
              : "dark";

          document.body.dataset.theme =
            next;

          localStorage.setItem(
            THEME_KEY,
            next
          );
        };
      });

    const reset =
      $("resetDemo") ||
      $("resetDemoButton") ||
      $("clearDemo");

    if (reset) {
      reset.onclick = () => {
        if (
          confirm(
            "Reset MONEY TRANSFER BEAST demo?"
          )
        ) {
          localStorage.removeItem(
            STORAGE_KEY
          );

          location.reload();
        }
      };
    }

    [
      [
        "notificationsToggle",
        "notifications"
      ],

      [
        "screenSecurityToggle",
        "screenSecurity"
      ],

      [
        "biometricToggle",
        "biometric"
      ]
    ].forEach(
      ([id, key]) => {
        const input = $(id);

        if (!input) return;

        input.checked =
          !!state.settings[key];

        input.onchange = () => {
          state.settings[key] =
            input.checked;

          save();
        };
      }
    );
  }

  /* =========================================================
     PIN CHANGE
  ========================================================= */

  function setupPinChange() {
    const button =
      $("changePinButton");

    if (!button) return;

    button.onclick = () => {
      const oldPin =
        $("oldPin")?.value || "";

      const newPin =
        $("newPin")?.value || "";

      const confirm =
        $("confirmNewPin")
          ?.value || "";

      if (
        oldPin !== state.user.pin
      ) {
        toast(
          "Old PIN is incorrect."
        );
        return;
      }

      if (
        !/^\d{4}$/.test(newPin) ||
        newPin !== confirm
      ) {
        toast(
          "New PIN must be 4 matching digits."
        );
        return;
      }

      state.user.pin = newPin;

      save();

      toast(
        "BEAST PIN changed."
      );
    };
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  function setupLogout() {
    qa(
      "[data-action='logout'], #logoutButton, #logout"
    ).forEach(button => {
      button.onclick = () => {
        toast(
          "Session ended."
        );

        showScreen(
          "dashboardScreen"
        );
      };
    });
  }

  /* =========================================================
     REFRESH
  ========================================================= */

  function setupRefresh() {
    const refresh =
      $("refreshBalance");

    if (refresh) {
      refresh.onclick = () => {
        updateDashboard();

        toast(
          "Balance refreshed."
        );
      };
    }
  }

  /* =========================================================
     CAMERA / QR
  ========================================================= */

  function setupCamera() {
    qa(
      "[data-action='camera'], #openCamera, #cameraButton"
    ).forEach(button => {
      button.onclick = () => {
        toast(
          "QR / camera feature is currently a prototype."
        );
      };
    });
  }

  /* =========================================================
     SECURITY
  ========================================================= */

  function setupSecurity() {
    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden &&
          state.settings.screenSecurity
        ) {
          addSecurity(
            "BEAST app became hidden."
          );

          save();
        }
      }
    );
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function setupNavigation() {
    qa("[data-go]").forEach(button => {
      button.addEventListener(
        "click",
        () => {
          showScreen(
            button.dataset.go
          );
        }
      );
    });

    qa("[data-action]").forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset.action;

            if (action === "home") {
              home();
            }

            if (action === "history") {
              showScreen(
                "historyScreen"
              );
            }

            if (action === "settings") {
              showScreen(
                "settingsScreen"
              );
            }

            if (
              action ===
              "notifications"
            ) {
              state.notifications.forEach(
                n => {
                  n.read = true;
                }
              );

              save();

              renderNotifications();

              showScreen(
                "notificationsScreen"
              );
            }

            if (
              action ===
              "refresh-balance"
            ) {
              updateDashboard();

              toast(
                "Balance refreshed."
              );
            }
          }
        );
      }
    );
  }

  /* =========================================================
     FORM PROTECTION
  ========================================================= */

  function preventForms() {
    qa("form").forEach(form => {
      form.addEventListener(
        "submit",
        event => {
          event.preventDefault();
        }
      );
    });
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  function initialize() {
    const savedTheme =
      localStorage.getItem(
        THEME_KEY
      );

    if (savedTheme) {
      document.body.dataset.theme =
        savedTheme;
    }

    setupRegistration();
    setupNavigation();
    setupSend();
    setupReceive();
    setupWithdraw();
    setupLipa();
    setupPinAuthorization();
    setupAdmin();
    setupLogin();
    setupSettings();
    setupPinChange();
    setupLogout();
    setupRefresh();
    setupCamera();
    setupSecurity();
    preventForms();

    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();
    renderAdmin();

    if (state.registered) {
      showScreen(
        "dashboardScreen"
      );
    } else {
      showScreen(
        "registrationScreen"
      );

      registrationStep(1);
    }

    console.log(
      "MONEY TRANSFER BEAST loaded."
    );
  }

  initialize();
});