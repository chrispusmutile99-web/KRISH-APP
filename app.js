/* =========================================================
   MONEY TRANSFER BEAST
   app.js
   DEMO / PROTOTYPE ONLY
   No real M-PESA, bank, card or Airtel transactions.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const STORAGE_KEY = "money_transfer_beast_demo_v11";
  const THEME_KEY = "money_transfer_beast_theme";
  const DEMO_PASSWORD = "beast123";

  const $ = (id) => document.getElementById(id);

  const q = (selector, root = document) =>
    root.querySelector(selector);

  const qa = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  /* =========================================================
     STATE
  ========================================================= */

  const defaultState = {
    registered: false,

    user: null,

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
        enabled: false,
        account: ""
      },

      bank: {
        name: "Bank Account",
        balance: 0,
        enabled: false,
        account: ""
      },

      card: {
        name: "Card",
        balance: 0,
        enabled: false,
        account: ""
      },

      wallet: {
        name: "BEAST Wallet",
        balance: 0,
        enabled: true,
        account: "BEAST-WALLET"
      }
    },

    selectedSource: "mpesa",

    transactions: [],

    notifications: [],

    securityEvents: [],

    owner: {
      beastFees: 0,
      providerCosts: 0,
      transactions: 0,
      volume: 0
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
      structuredClone(defaultState);
  } catch (error) {
    state = structuredClone(defaultState);
  }

  /* =========================================================
     HELPERS
  ========================================================= */

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const money = (value) =>
    Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const shortMoney = (value) =>
    `KES ${money(value)}`;

  function toast(message) {
    const element = $("toast");

    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window.__beastToast);

    window.__beastToast = setTimeout(() => {
      element.classList.remove("show");
    }, 2400);
  }

  function show(element) {
    if (!element) return;

    element.classList.remove("hidden");
    element.style.display = "";
  }

  function hide(element) {
    if (!element) return;

    element.classList.add("hidden");
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

  function validPhone(value) {
    return /^(?:0|254)7\d{8}$/.test(
      String(value || "").replace(/\s+/g, "")
    );
  }

  function generateBeastId() {
    return `BEAST-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  function generateReference(prefix = "BT") {
    return `${prefix}${Date.now()
      .toString()
      .slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
  }

  /* =========================================================
     BEAST FEE SYSTEM
  ========================================================= */

  function beastFeeFor(amount) {
    amount = Number(amount) || 0;

    if (amount <= 1000) {
      return 7;
    }

    if (amount <= 10000) {
      return 30;
    }

    return 50;
  }

  /* =========================================================
     PROVIDER COST SYSTEM
  ========================================================= */

  function providerCost(source, amount) {
    amount = Number(amount) || 0;

    if (source === "mpesa") {
      if (amount <= 100) return 0;
      if (amount <= 1500) return 5;
      if (amount <= 5000) return 9;
      if (amount <= 20000) return 11;
      if (amount <= 250000) return 13;

      return 20;
    }

    if (source === "airtel") {
      return amount <= 1500 ? 5 : 10;
    }

    if (source === "bank") {
      return amount <= 10000 ? 3 : 10;
    }

    if (source === "card") {
      return amount <= 10000 ? 8 : 15;
    }

    return 0;
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function showScreen(id) {
    const screens = qa(".app-screen");

    screens.forEach((screen) => {
      screen.classList.toggle(
        "active",
        screen.id === id
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showDashboard() {
    showScreen("dashboardScreen");
  }

  function goHome() {
    if (state.registered) {
      showDashboard();
    } else {
      showScreen("registrationScreen");
    }
  }

  /* =========================================================
     RECIPIENT VERIFICATION
  ========================================================= */

  function findRecipient(phone) {
    const normalized = normalizePhone(phone);

    const demoRecipients = {
      "254712345678": [
        "Demo BEAST Customer",
        "BEAST-DEMO"
      ],

      "254720000000": [
        "John Kamau",
        "BEAST-720000"
      ],

      "254711111111": [
        "Mary Wanjiku",
        "BEAST-711111"
      ],

      "254799999999": [
        "Peter Otieno",
        "BEAST-799999"
      ]
    };

    if (
      state.user &&
      normalizePhone(state.user.phone) === normalized
    ) {
      return [
        state.user.name,
        state.user.beastId
      ];
    }

    if (demoRecipients[normalized]) {
      return demoRecipients[normalized];
    }

    return [
      "Verified BEAST Recipient",
      `BEAST-${normalized.slice(-6)}`
    ];
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  function addNotification(title, body) {
    if (!state.settings.notifications) {
      return;
    }

    state.notifications.unshift({
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false
    });

    state.notifications =
      state.notifications.slice(0, 100);
  }

  /* =========================================================
     SECURITY
  ========================================================= */

  function addSecurity(text) {
    state.securityEvents.unshift({
      text,
      createdAt: new Date().toISOString()
    });

    state.securityEvents =
      state.securityEvents.slice(0, 100);
  }

  /* =========================================================
     TRANSACTIONS
  ========================================================= */

  function recordTransaction({
    type,
    amount,
    source,
    recipient,
    recipientName,
    description,
    fee,
    providerCost
  }) {
    const transaction = {
      id: Date.now(),

      reference: generateReference(
        type.substring(0, 3).toUpperCase()
      ),

      createdAt: new Date().toISOString(),

      status: "completed",

      type,

      amount: Number(amount),

      fee: Number(fee),

      providerCost: Number(providerCost),

      source,

      recipient,

      recipientName,

      description
    };

    state.transactions.unshift(transaction);

    state.owner.transactions += 1;

    state.owner.volume += Number(amount);

    state.owner.beastFees += Number(fee);

    state.owner.providerCosts +=
      Number(providerCost);

    state.transactions =
      state.transactions.slice(0, 100);
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  function updateDashboard() {
    if (!state.user) return;

    if ($("dashboardName")) {
      $("dashboardName").textContent =
        state.user.name;
    }

    if ($("dashboardBeastId")) {
      $("dashboardBeastId").textContent =
        state.user.beastId;
    }

    if ($("dashboardPhone")) {
      $("dashboardPhone").textContent =
        state.user.phone;
    }

    if ($("profileName")) {
      $("profileName").textContent =
        state.user.name;
    }

    if ($("profilePhone")) {
      $("profilePhone").textContent =
        state.user.phone;
    }

    if ($("profileBeastId")) {
      $("profileBeastId").textContent =
        state.user.beastId;
    }

    if ($("receiveProfileName")) {
      $("receiveProfileName").textContent =
        state.user.name;
    }

    if ($("receiveBeastId")) {
      $("receiveBeastId").textContent =
        state.user.beastId;
    }

    if ($("receiveNumber")) {
      $("receiveNumber").value =
        state.user.phone;
    }

    const totalBalance =
      Object.values(state.sources)
        .reduce(
          (total, source) =>
            total +
            (source.enabled
              ? Number(source.balance)
              : 0),
          0
        );

    if ($("dashboardBalance")) {
      $("dashboardBalance").textContent =
        shortMoney(totalBalance);
    }

    renderSources();
    renderOwn();
    renderOwner();
    updateSelects();
  }

  /* =========================================================
     BEAST OWN / LINKED ACCOUNTS
  ========================================================= */

  function renderSources() {
    const container = $("sourceList");

    if (!container) return;

    container.innerHTML =
      Object.entries(state.sources)
        .map(([key, source]) => `
          <button
            type="button"
            class="source-item ${
              state.selectedSource === key
                ? "selected"
                : ""
            }"
            data-source="${key}"
          >
            <b>${source.name}</b>
            <span>
              ${
                source.enabled
                  ? shortMoney(source.balance)
                  : "Not linked"
              }
            </span>
          </button>
        `)
        .join("");

    qa("[data-source]").forEach((button) => {
      button.onclick = () => {
        state.selectedSource =
          button.dataset.source;

        save();

        renderSources();
        updateSelects();
      };
    });
  }

  function renderOwn() {
    const container =
      $("beastOwnContent");

    if (!container) return;

    container.innerHTML =
      Object.values(state.sources)
        .map(
          (source) => `
            <div class="transaction">
              <div>
                <b>${source.name}</b>
                <small>
                  ${
                    source.account ||
                    "Not linked"
                  }
                </small>
              </div>

              <strong>
                ${
                  source.enabled
                    ? shortMoney(source.balance)
                    : "—"
                }
              </strong>
            </div>
          `
        )
        .join("");
  }

  /* =========================================================
     SOURCE SELECTORS
  ========================================================= */

  function updateSelects() {
    ["sendSource", "lipaSource"].forEach(
      (id) => {
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
                  ${source.name} •
                  ${shortMoney(source.balance)}
                </option>
              `
            )
            .join("");
      }
    );
  }

  /* =========================================================
     OWNER / ADMIN
  ========================================================= */

  function renderOwner() {
    if ($("ownerFees")) {
      $("ownerFees").textContent =
        shortMoney(
          state.owner.beastFees
        );
    }

    if ($("ownerProviderCosts")) {
      $("ownerProviderCosts").textContent =
        shortMoney(
          state.owner.providerCosts
        );
    }

    if ($("ownerVolume")) {
      $("ownerVolume").textContent =
        shortMoney(
          state.owner.volume
        );
    }

    if ($("ownerTransactions")) {
      $("ownerTransactions").textContent =
        state.owner.transactions;
    }

    if ($("ownerNetRevenue")) {
      $("ownerNetRevenue").textContent =
        shortMoney(
          state.owner.beastFees -
          state.owner.providerCosts
        );
    }

    if ($("adminRevenue")) {
      $("adminRevenue").textContent =
        shortMoney(
          state.owner.beastFees -
          state.owner.providerCosts
        );
    }
  }

  /* =========================================================
     HISTORY
  ========================================================= */

  function renderHistory() {
    const container =
      $("historyList");

    if (!container) return;

    if (!state.transactions.length) {
      container.innerHTML = `
        <div class="card">
          <p class="muted">
            No transactions yet.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.transactions
        .slice(0, 100)
        .map(
          (transaction) => `
            <div class="transaction">
              <div>
                <b>
                  ${transaction.type}
                </b>

                <small>
                  ${
                    transaction.recipientName ||
                    transaction.recipient ||
                    "—"
                  }
                  •
                  ${new Date(
                    transaction.createdAt
                  ).toLocaleString()}
                </small>

                <small>
                  ${transaction.reference}
                  •
                  ${transaction.source}
                </small>
              </div>

              <strong>
                - ${shortMoney(
                  transaction.amount
                )}
              </strong>
            </div>
          `
        )
        .join("");
  }

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  function renderNotifications() {
    const container =
      $("notificationList");

    if (container) {
      if (!state.notifications.length) {
        container.innerHTML = `
          <div class="card">
            <p class="muted">
              No notifications.
            </p>
          </div>
        `;
      } else {
        container.innerHTML =
          state.notifications
            .map(
              (notification) => `
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
      }
    }

    const unread =
      state.notifications.filter(
        (notification) =>
          !notification.read
      ).length;

    qa(
      "[data-notification-count]"
    ).forEach(
      (element) => {
        element.textContent = unread;
      }
    );
  }

  /* =========================================================
     SECURITY EVENTS
  ========================================================= */

  function renderSecurity() {
    const container =
      $("securityList");

    if (!container) return;

    if (!state.securityEvents.length) {
      container.innerHTML = `
        <p class="muted">
          No security events.
        </p>
      `;

      return;
    }

    container.innerHTML =
      state.securityEvents
        .map(
          (event) => `
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
     REGISTRATION
  ========================================================= */

  function registrationStep(step) {
    qa(
      "[data-registration-step]"
    ).forEach((element) => {
      element.classList.toggle(
        "hidden",
        Number(
          element.dataset.registrationStep
        ) !== step
      );
    });

    qa(".step-dots i").forEach(
      (dot, index) => {
        dot.classList.toggle(
          "active",
          index < step
        );
      }
    );
  }

  function setupRegistration() {
    const next1 =
      $("registrationNext1");

    const next2 =
      $("registrationNext2");

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
          name.length < 2 ||
          !validPhone(phone) ||
          nationalId.length < 4
        ) {
          toast(
            "Enter valid name, Kenyan phone and National ID"
          );

          return;
        }

        state.user = {
          name,
          phone,
          nationalId,
          beastId: generateBeastId(),
          pin: ""
        };

        if ($("registrationSummary")) {
          $("registrationSummary").innerHTML = `
            <p>
              <b>Name:</b>
              ${name}
            </p>

            <p>
              <b>Phone:</b>
              ${phone}
            </p>

            <p>
              <b>National ID:</b>
              ${nationalId}
            </p>

            <p>
              <b>BEAST ID:</b>
              ${state.user.beastId}
            </p>
          `;
        }

        registrationStep(2);
      };
    }

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
            "PIN must be 4 matching digits"
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
          "New BEAST account registered"
        );

        save();

        updateDashboard();

        showDashboard();

        toast(
          "BEAST account created"
        );
      };
    }

    qa(
      "[data-registration-back]"
    ).forEach((button) => {
      button.onclick = () => {
        registrationStep(
          Number(
            button.dataset.registrationBack
          )
        );
      };
    });
  }

  /* =========================================================
     NAVIGATION BUTTONS
  ========================================================= */

  function setupNavigation() {
    qa("[data-go]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const target =
              button.dataset.go;

            if (!target) return;

            showScreen(target);

            if (
              target ===
              "historyScreen"
            ) {
              renderHistory();
            }

            if (
              target ===
              "notificationsScreen"
            ) {
              renderNotifications();
            }
          }
        );
      }
    );

    qa("[data-action]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset.action;

            switch (action) {
              case "home":
                goHome();
                break;

              case "history":
                renderHistory();
                showScreen(
                  "historyScreen"
                );
                break;

              case "settings":
                showScreen(
                  "settingsScreen"
                );
                break;

              case "notifications":
                state.notifications.forEach(
                  (notification) => {
                    notification.read = true;
                  }
                );

                save();
                renderNotifications();

                showScreen(
                  "notificationsScreen"
                );

                break;

              case "refresh-balance":
                updateDashboard();
                toast(
                  "Balance refreshed"
                );
                break;

              case "logout":
                toast(
                  "Session ended"
                );

                goHome();
                break;

              case "copy-receive":
                if (
                  navigator.clipboard &&
                  $("receiveNumber")
                ) {
                  navigator.clipboard.writeText(
                    $("receiveNumber").value
                  );
                }

                toast(
                  "Number copied"
                );

                break;

              case "camera":
                toast(
                  "Camera / QR feature is a prototype placeholder"
                );
                break;
            }
          }
        );
      }
    );
  }

  /* =========================================================
     SEND MONEY
  ========================================================= */

  function verifyRecipient() {
    const phone =
      $("sendPhone")?.value.trim();

    if (!validPhone(phone)) {
      toast(
        "Enter a valid Kenyan phone number"
      );

      return;
    }

    const [
      name,
      beastId
    ] = findRecipient(phone);

    const box =
      $("recipientVerification");

    if (!box) return;

    box.innerHTML = `
      <b>✓ ${name}</b>
      <br>
      <small>
        ${phone} • ${beastId}
      </small>
    `;

    show(box);
  }

  function setupSend() {
    const verify =
      $("verifyRecipient");

    if (verify) {
      verify.onclick =
        verifyRecipient;
    }

    const amount =
      $("sendAmount");

    if (amount) {
      amount.oninput = () => {
        if ($("sendFee")) {
          $("sendFee").textContent =
            shortMoney(
              beastFeeFor(
                amount.value
              )
            );
        }
      };
    }

    const sendButton =
      $("sendMoneyButton");

    if (sendButton) {
      sendButton.onclick = () =>
        authorize("send");
    }
  }

  function sendMoney() {
    const phone =
      $("sendPhone")?.value.trim();

    const source =
      $("sendSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("sendAmount")?.value
      );

    const selected =
      state.sources[source];

    if (
      !validPhone(phone) ||
      !amount ||
      amount <= 0
    ) {
      toast(
        "Enter recipient and amount"
      );

      return;
    }

    if (
      !selected ||
      !selected.enabled
    ) {
      toast(
        "Payment source unavailable"
      );

      return;
    }

    const beastFee =
      beastFeeFor(amount);

    const total =
      amount + beastFee;

    if (selected.balance < total) {
      toast(
        "Insufficient balance"
      );

      return;
    }

    const [
      recipientName
    ] = findRecipient(phone);

    const cost =
      providerCost(
        source,
        amount
      );

    selected.balance -= total;

    recordTransaction({
      type: "Send",
      amount,
      source,
      recipient: phone,
      recipientName,
      description:
        "BEAST transfer",
      fee: beastFee,
      providerCost: cost
    });

    addNotification(
      "Money sent",
      `${shortMoney(amount)} sent to ${recipientName}. BEAST fee ${shortMoney(beastFee)}.`
    );

    addSecurity(
      `Transfer authorized to ${recipientName}`
    );

    save();

    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();

    if ($("sendPhone")) {
      $("sendPhone").value = "";
    }

    if ($("sendAmount")) {
      $("sendAmount").value = "";
    }

    hide(
      $("recipientVerification")
    );

    toast(
      "Transfer completed"
    );
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

        if (!validPhone(agent)) {
          toast(
            "Enter a valid agent number"
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
              ${agent}
            </small>
          `;

          show(box);
        }
      };
    }

    const amount =
      $("withdrawAmount");

    if (amount) {
      amount.oninput = () => {
        if ($("withdrawFee")) {
          $("withdrawFee").textContent =
            shortMoney(
              beastFeeFor(
                amount.value
              )
            );
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

  function withdrawMoney() {
    const agent =
      $("agentNumber")?.value.trim();

    const source =
      $("sendSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("withdrawAmount")?.value
      );

    const selected =
      state.sources[source];

    if (
      !validPhone(agent) ||
      !amount ||
      amount <= 0
    ) {
      toast(
        "Enter agent and amount"
      );

      return;
    }

    if (
      !selected ||
      !selected.enabled
    ) {
      toast(
        "Payment source unavailable"
      );

      return;
    }

    const beastFee =
      beastFeeFor(amount);

    const total =
      amount + beastFee;

    if (selected.balance < total) {
      toast(
        "Insufficient balance"
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
      source,
      recipient: agent,
      recipientName:
        "BEAST Agent",
      description:
        "Agent withdrawal",
      fee: beastFee,
      providerCost: cost
    });

    addNotification(
      "Withdrawal completed",
      `${shortMoney(amount)} withdrawn via ${agent}.`
    );

    addSecurity(
      "Withdrawal authorized"
    );

    save();

    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();

    toast(
      "Withdrawal completed"
    );
  }

  /* =========================================================
     LIPA NA
  ========================================================= */

  function setupLipa() {
    const amount =
      $("lipaAmount");

    if (amount) {
      amount.oninput = () => {
        if ($("lipaFee")) {
          $("lipaFee").textContent =
            shortMoney(
              beastFeeFor(
                amount.value
              )
            );
        }
      };
    }

    const button =
      $("lipaPayButton");

    if (button) {
      button.onclick = () =>
        authorize("lipa");
    }
  }

  function lipaNa() {
    const destination =
      $("lipaNumber")
        ?.value.trim();

    const source =
      $("lipaSource")?.value ||
      state.selectedSource;

    const amount =
      Number(
        $("lipaAmount")?.value
      );

    const selected =
      state.sources[source];

    if (
      !destination ||
      !amount ||
      amount <= 0
    ) {
      toast(
        "Enter payment number and amount"
      );

      return;
    }

    if (
      !selected ||
      !selected.enabled
    ) {
      toast(
        "Payment source unavailable"
      );

      return;
    }

    const beastFee =
      beastFeeFor(amount);

    const total =
      amount + beastFee;

    if (selected.balance < total) {
      toast(
        "Insufficient balance"
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
      source,
      recipient: destination,
      recipientName:
        "Merchant",
      description:
        "Business payment",
      fee: beastFee,
      providerCost: cost
    });

    addNotification(
      "Payment completed",
      `${shortMoney(amount)} paid to ${destination}.`
    );

    addSecurity(
      "Lipa Na payment authorized"
    );

    save();

    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();

    toast(
      "Payment completed"
    );
  }

  /* =========================================================
     RECEIVE
  ========================================================= */

  function setupReceive() {
    const verify =
      $("verifySeller");

    if (verify) {
      verify.onclick = () => {
        const number =
          $("sellerNumber")
            ?.value.trim();

        if (!validPhone(number)) {
          toast(
            "Enter a valid number"
          );

          return;
        }

        const box =
          $("sellerVerification");

        if (box) {
          box.innerHTML = `
            <b>
              ✓ Verified Seller
            </b>

            <br>

            <small>
              ${number}
            </small>
          `;

          show(box);
        }
      };
    }
  }

  /* =========================================================
     PIN AUTHORIZATION
  ========================================================= */

  let pendingAction = null;

  function authorize(action) {
    if (!state.user) {
      toast(
        "Create a BEAST account first"
      );

      return;
    }

    pendingAction = action;

    const modal =
      $("pinModal");

    if (modal) {
      show(modal);
    }

    const pin =
      $("authorizationPin");

    if (pin) {
      pin.value = "";
      pin.focus();
    }
  }

  function closePin() {
    hide($("pinModal"));
    pendingAction = null;
  }

  function confirmPin() {
    if (!pendingAction) return;

    const entered =
      $("authorizationPin")
        ?.value || "";

    if (
      entered !== state.user.pin
    ) {
      addSecurity(
        "Failed PIN authorization attempt"
      );

      save();

      renderSecurity();

      closePin();

      toast(
        "Incorrect BEAST PIN"
      );

      return;
    }

    const action =
      pendingAction;

    closePin();

    if (action === "send") {
      sendMoney();
    }

    if (action === "withdraw") {
      withdrawMoney();
    }

    if (action === "lipa") {
      lipaNa();
    }
  }

  /* =========================================================
     OWNER / ADMIN LOGIN
  ========================================================= */

  function setupOwnerLogin() {
    const button =
      $("ownerLoginButton") ||
      $("adminLoginButton");

    if (!button) return;

    button.onclick = () => {
      const password =
        $("ownerPassword")?.value ||
        $("adminPassword")?.value ||
        "";

      if (password !== DEMO_PASSWORD) {
        toast(
          "Incorrect demo password"
        );

        return;
      }

      showScreen(
        $("ownerDashboardScreen")
          ? "ownerDashboardScreen"
          : "adminDashboardScreen"
      );

      renderOwner();

      toast(
        "BEAST Admin unlocked"
      );
    };
  }

  /* =========================================================
     LOGIN / BALANCE CHECK
  ========================================================= */

  function setupLogin() {
    const button =
      $("loginButton") ||
      $("customerLoginButton");

    if (!button) return;

    button.onclick = () => {
      const account =
        normalizePhone(
          $("loginAccount")?.value ||
          $("accountNumber")?.value ||
          $("phoneNumber")?.value ||
          ""
        );

      const name =
        (
          $("loginName")?.value ||
          $("fullName")?.value ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        !state.user ||
        normalizePhone(
          state.user.phone
        ) !== account ||
        state.user.name
          .toLowerCase() !== name
      ) {
        toast(
          "Account details do not match"
        );

        return;
      }

      const totalBalance =
        Object.values(state.sources)
          .reduce(
            (total, source) =>
              total +
              (source.enabled
                ? Number(
                    source.balance
                  )
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
            ${shortMoney(
              totalBalance
            )}
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
    qa(
      "[data-theme-toggle]"
    ).forEach((button) => {
      button.onclick = () => {
        const isLight =
          document.body.dataset.theme ===
          "light";

        document.body.dataset.theme =
          isLight
            ? "dark"
            : "light";

        localStorage.setItem(
          THEME_KEY,
          document.body.dataset.theme
        );
      };
    });

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
        const element = $(id);

        if (!element) return;

        element.checked =
          !!state.settings[key];

        element.onchange = () => {
          state.settings[key] =
            element.checked;

          save();
        };
      }
    );

    const reset =
      $("resetDemo") ||
      $("resetDemoButton") ||
      $("clearDemo");

    if (reset) {
      reset.onclick = () => {
        if (
          confirm(
            "Reset all demo data?"
          )
        ) {
          localStorage.removeItem(
            STORAGE_KEY
          );

          location.reload();
        }
      };
    }
  }

  /* =========================================================
     CHANGE PIN
  ========================================================= */

  function setupPinChange() {
    const button =
      $("changePinButton");

    if (!button) return;

    button.onclick = () => {
      if (!state.user) {
        toast(
          "No BEAST account found"
        );

        return;
      }

      const oldPin =
        $("oldPin")?.value || "";

      const newPin =
        $("newPin")?.value || "";

      const confirmNewPin =
        $("confirmNewPin")
          ?.value || "";

      if (
        oldPin !== state.user.pin
      ) {
        toast(
          "Old PIN is incorrect"
        );

        return;
      }

      if (
        !/^\d{4}$/.test(newPin) ||
        newPin !== confirmNewPin
      ) {
        toast(
          "New PIN must be 4 matching digits"
        );

        return;
      }

      state.user.pin = newPin;

      save();

      toast(
        "BEAST PIN changed"
      );

      showScreen(
        "settingsScreen"
      );
    };
  }

  /* =========================================================
     SECURITY / BACKGROUND DETECTION
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
            "App became hidden/backgrounded"
          );

          save();

          renderSecurity();
        }
      }
    );
  }

  /* =========================================================
     CAMERA PLACEHOLDER
  ========================================================= */

  function setupCamera() {
    qa(
      "[data-action='camera'], #openCamera, #cameraButton"
    ).forEach((button) => {
      button.onclick = () => {
        toast(
          "Camera / QR feature is a prototype placeholder"
        );
      };
    });
  }

  /* =========================================================
     REFRESH BALANCE
  ========================================================= */

  function setupRefresh() {
    qa(
      "[data-action='refresh-balance']"
    ).forEach((button) => {
      button.onclick = () => {
        updateDashboard();

        toast(
          "Balance refreshed"
        );
      };
    });

    if ($("refreshBalance")) {
      $("refreshBalance").onclick =
        () => {
          updateDashboard();

          toast(
            "Balance refreshed"
          );
        };
    }
  }

  /* =========================================================
     PREVENT FORM RELOADS
  ========================================================= */

  function preventForms() {
    qa("form").forEach((form) => {
      form.addEventListener(
        "submit",
        (event) => {
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
    setupWithdraw();
    setupLipa();
    setupReceive();

    const confirmPinButton =
      $("confirmPin") ||
      $("authorizeButton") ||
      $("submitPin") ||
      $("pinConfirm");

    if (confirmPinButton) {
      confirmPinButton.onclick =
        confirmPin;
    }

    const cancelPinButton =
      $("cancelPin") ||
      $("closePinModal") ||
      $("authorizationCancel");

    if (cancelPinButton) {
      cancelPinButton.onclick =
        closePin;
    }

    setupOwnerLogin();
    setupLogin();
    setupSettings();
    setupPinChange();
    setupSecurity();
    setupCamera();
    setupRefresh();
    preventForms();

    updateSelects();
    updateDashboard();
    renderHistory();
    renderNotifications();
    renderSecurity();
    renderOwner();

    if (state.registered) {
      hide(
        $("registrationScreen")
      );

      showDashboard();
    } else {
      showScreen(
        "registrationScreen"
      );

      registrationStep(1);
    }

    console.log(
      "MONEY TRANSFER BEAST loaded successfully."
    );
  }

  initialize();
});