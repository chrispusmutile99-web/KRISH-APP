document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================================
     MONEY TRANSFER BEAST
     Clean Demo Application
     ========================================================= */

  const STORAGE_KEY = "money_transfer_beast_demo_v8";
  const THEME_KEY = "money_transfer_beast_theme";

  const DEMO_PIN = "1234";
  const DEMO_PASSWORD = "beast123";

  const STARTING_BALANCE = 5000;

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function money(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function shortMoney(value) {
    return `KES ${money(value)}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function randomNumber(length = 6) {
    let result = "";

    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }

    return result;
  }

  function generateBeastId() {
    return `BEAST-${randomNumber(6)}`;
  }

  function generateReference() {
    return `BT${Date.now().toString().slice(-8)}${randomNumber(3)}`;
  }

  function validKenyanPhone(phone) {
    const cleaned = String(phone || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

    return /^(?:2547\d{8}|07\d{8}|01\d{8})$/.test(cleaned);
  }

  function normalizePhone(phone) {
    let value = String(phone || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

    if (value.startsWith("+254")) {
      value = value.slice(1);
    }

    if (value.startsWith("254")) {
      return value;
    }

    if (value.startsWith("0")) {
      return `254${value.slice(1)}`;
    }

    return value;
  }

  function displayPhone(phone) {
    const normalized = normalizePhone(phone);

    if (normalized.startsWith("254") && normalized.length === 12) {
      return `0${normalized.slice(3)}`;
    }

    return phone || "—";
  }

  function showElement(element) {
    if (!element) return;
    element.classList.remove("hidden");
    element.style.display = "";
  }

  function hideElement(element) {
    if (!element) return;
    element.classList.add("hidden");
    element.style.display = "none";
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function setHTML(id, value) {
    const element = $(id);

    if (element) {
      element.innerHTML = value;
    }
  }

  function inputValue(id) {
    const element = $(id);
    return element ? String(element.value || "").trim() : "";
  }

  function clearInput(id) {
    const element = $(id);
    if (element) element.value = "";
  }

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

    balance: STARTING_BALANCE,

    sources: {
      mpesa: {
        name: "M-PESA",
        balance: STARTING_BALANCE,
        enabled: true
      },

      airtel: {
        name: "Airtel Money",
        balance: 0,
        enabled: false
      },

      bank: {
        name: "Bank Account",
        balance: 0,
        enabled: false
      },

      card: {
        name: "Card",
        balance: 0,
        enabled: false
      },

      wallet: {
        name: "BEAST Wallet",
        balance: 0,
        enabled: true
      }
    },

    selectedSource: "mpesa",

    receiveLoggedIn: false,
    receiveSellerVerified: false,

    transactions: [],

    notifications: [],

    securityEvents: [],

    owner: {
      beastFees: 0,
      providerCosts: 0,
      refunds: 0,
      transactions: 0
    },

    settings: {
      biometric: false,
      notifications: true,
      screenSecurity: true
    },

    theme: "dark"
  };

  let state = loadState();

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeState(base, saved) {
    if (!saved || typeof saved !== "object") {
      return deepClone(base);
    }

    const merged = deepClone(base);

    Object.keys(saved).forEach((key) => {
      if (
        saved[key] &&
        typeof saved[key] === "object" &&
        !Array.isArray(saved[key]) &&
        merged[key] &&
        typeof merged[key] === "object" &&
        !Array.isArray(merged[key])
      ) {
        merged[key] = {
          ...merged[key],
          ...saved[key]
        };
      } else {
        merged[key] = saved[key];
      }
    });

    return merged;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return deepClone(defaultState);
      }

      const parsed = JSON.parse(raw);

      return mergeState(defaultState, parsed);
    } catch (error) {
      console.error("MONEY TRANSFER BEAST: failed to load state", error);
      return deepClone(defaultState);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error("MONEY TRANSFER BEAST: failed to save state", error);
    }
  }

  function resetState() {
    state = deepClone(defaultState);
    saveState();
    location.reload();
  }

  /* =========================================================
     TOAST / MESSAGES
     ========================================================= */

  function showToast(message, type = "info") {
    let toast = $("beastToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "beastToast";
      toast.className = "beast-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  function registrationMessage(message, type = "error") {
    const element = $("registrationMessage");

    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  function allScreens() {
    return qsa(
      ".screen, .app-screen, [data-screen]"
    );
  }

  function showScreen(id) {
    const target = $(id);

    if (!target) return;

    allScreens().forEach((screen) => {
      if (screen === target) {
        screen.classList.add("active");
        screen.classList.remove("hidden");
        screen.style.display = "";
      } else {
        if (
          screen.classList.contains("screen") ||
          screen.classList.contains("app-screen") ||
          screen.hasAttribute("data-screen")
        ) {
          screen.classList.remove("active");
        }
      }
    });

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function hideRegistration() {
    const screen = $("registrationScreen");

    if (screen) {
      hideElement(screen);
    }
  }

  function showDashboard() {
    hideRegistration();

    const candidates = [
      "dashboardScreen",
      "mainScreen",
      "homeScreen",
      "appScreen"
    ];

    for (const id of candidates) {
      if ($(id)) {
        showScreen(id);
        break;
      }
    }

    updateDashboard();
  }

  /* =========================================================
     REGISTRATION
     ========================================================= */

  function showRegistrationStep(step) {
    const steps = [
      $("registrationStep1"),
      $("registrationStep2"),
      $("registrationStep3")
    ];

    steps.forEach((element, index) => {
      if (!element) return;

      const active = index + 1 === step;

      element.classList.toggle(
        "active",
        active
      );

      if (active) {
        element.style.display = "";
      } else {
        element.style.display = "none";
      }
    });

    const dots = [
      $("progressDot1"),
      $("progressDot2"),
      $("progressDot3")
    ];

    dots.forEach((dot, index) => {
      if (!dot) return;

      const number = index + 1;

      dot.classList.toggle(
        "active",
        number <= step
      );

      dot.classList.toggle(
        "completed",
        number < step
      );
    });
  }

  function setupRegistration() {
    const registrationScreen = $("registrationScreen");

    if (!registrationScreen) {
      return;
    }

    showRegistrationStep(1);

    const next1 = $("registrationNext1");

    if (next1) {
      next1.addEventListener("click", () => {
        registrationMessage("");

        const name = inputValue("registrationName");
        const phone = inputValue("registrationPhone");
        const nationalId = inputValue("registrationId");

        if (name.length < 3) {
          registrationMessage(
            "Please enter your full name."
          );
          return;
        }

        if (!validKenyanPhone(phone)) {
          registrationMessage(
            "Enter a valid Kenyan phone number."
          );
          return;
        }

        if (nationalId.length < 5) {
          registrationMessage(
            "Enter a valid National ID."
          );
          return;
        }

        state.user.name = name;
        state.user.phone = normalizePhone(phone);
        state.user.nationalId = nationalId;

        if (!state.user.beastId) {
          state.user.beastId = generateBeastId();
        }

        saveState();

        setText(
          "registrationSummaryName",
          state.user.name
        );

        setText(
          "registrationSummaryPhone",
          displayPhone(state.user.phone)
        );

        setText(
          "registrationSummaryId",
          state.user.nationalId
        );

        setText(
          "registrationBeastId",
          state.user.beastId
        );

        showRegistrationStep(2);
      });
    }

    const next2 = $("registrationNext2");

    if (next2) {
      next2.addEventListener("click", () => {
        registrationMessage("");

        const pin = inputValue("registrationPin");
        const confirmPin = inputValue(
          "registrationPinConfirm"
        );

        if (!/^\d{4}$/.test(pin)) {
          registrationMessage(
            "BEAST PIN must contain exactly 4 digits."
          );
          return;
        }

        if (pin !== confirmPin) {
          registrationMessage(
            "The BEAST PINs do not match."
          );
          return;
        }

        state.user.pin = pin;

        saveState();

        setText(
          "registrationSummaryName",
          state.user.name
        );

        setText(
          "registrationSummaryPhone",
          displayPhone(state.user.phone)
        );

        setText(
          "registrationSummaryId",
          state.user.nationalId
        );

        setText(
          "registrationBeastId",
          state.user.beastId
        );

        showRegistrationStep(3);
      });
    }

    const back1 = $("registrationBack1");

    if (back1) {
      back1.addEventListener("click", () => {
        registrationMessage("");
        showRegistrationStep(1);
      });
    }

    const back2 = $("registrationBack2");

    if (back2) {
      back2.addEventListener("click", () => {
        registrationMessage("");
        showRegistrationStep(2);
      });
    }

    const finish = $("registrationFinish");

    if (finish) {
      finish.addEventListener("click", () => {
        registrationMessage("");

        if (!state.user.name) {
          registrationMessage(
            "Complete your registration first."
          );
          showRegistrationStep(1);
          return;
        }

        if (!state.user.pin) {
          registrationMessage(
            "Create your BEAST PIN first."
          );
          showRegistrationStep(2);
          return;
        }

        state.registered = true;

        if (!state.balance) {
          state.balance = STARTING_BALANCE;
        }

        if (
          !state.sources.mpesa ||
          !Number.isFinite(state.sources.mpesa.balance)
        ) {
          state.sources.mpesa = {
            name: "M-PESA",
            balance: STARTING_BALANCE,
            enabled: true
          };
        }

        state.notifications.unshift({
          id: generateReference(),
          type: "account",
          title: "BEAST account created",
          message: `Welcome ${state.user.name}.`,
          createdAt: nowISO(),
          read: false
        });

        saveState();

        showToast(
          "BEAST account created successfully.",
          "success"
        );

        setTimeout(() => {
          showDashboard();
        }, 400);
      });
    }
  }

  function updateRegistrationSummary() {
    setText(
      "registrationSummaryName",
      state.user.name || "—"
    );

    setText(
      "registrationSummaryPhone",
      displayPhone(state.user.phone)
    );

    setText(
      "registrationSummaryId",
      state.user.nationalId || "—"
    );

    setText(
      "registrationBeastId",
      state.user.beastId || "—"
    );
  }

  /* =========================================================
     BALANCE / DASHBOARD
     ========================================================= */

  function getTotalBalance() {
    let total = 0;

    Object.values(state.sources || {}).forEach((source) => {
      if (source && Number.isFinite(Number(source.balance))) {
        total += Number(source.balance);
      }
    });

    return total;
  }

  function syncMainBalance() {
    if (
      state.sources &&
      state.sources[state.selectedSource]
    ) {
      state.balance = Number(
        state.sources[state.selectedSource].balance
      ) || 0;
    }

    saveState();
  }

  function updateDashboard() {
    syncMainBalance();

    const total = getTotalBalance();

    const balanceIds = [
      "balanceAmount",
      "dashboardBalance",
      "mainBalance",
      "walletBalance",
      "accountBalance"
    ];

    balanceIds.forEach((id) => {
      if ($(id)) {
        setText(id, shortMoney(total));
      }
    });

    setText(
      "userName",
      state.user.name || "BEAST USER"
    );

    setText(
      "profileName",
      state.user.name || "BEAST USER"
    );

    setText(
      "beastIdDisplay",
      state.user.beastId || "—"
    );

    setText(
      "phoneDisplay",
      displayPhone(state.user.phone)
    );

    updateSourceDisplays();
    updateHistory();
    updateOwnerDashboard();
    updateNotificationDisplays();
  }

  function updateSourceDisplays() {
    const sourceElements = qsa(
      "[data-source-balance]"
    );

    sourceElements.forEach((element) => {
      const sourceKey =
        element.dataset.sourceBalance;

      const source = state.sources[sourceKey];

      if (source) {
        element.textContent = shortMoney(
          source.balance
        );
      }
    });

    qsa("[data-source]").forEach((element) => {
      const sourceKey = element.dataset.source;

      element.classList.toggle(
        "selected",
        sourceKey === state.selectedSource
      );
    });
  }

  /* =========================================================
     SOURCE SELECTION
     ========================================================= */

  function selectSource(sourceKey) {
    if (!state.sources[sourceKey]) {
      showToast(
        "Payment source is not available.",
        "error"
      );
      return;
    }

    if (!state.sources[sourceKey].enabled) {
      showToast(
        `${state.sources[sourceKey].name} is not connected.`,
        "error"
      );
      return;
    }

    state.selectedSource = sourceKey;

    syncMainBalance();
    saveState();

    updateSourceDisplays();

    qsa(
      "[data-selected-source]"
    ).forEach((element) => {
      element.textContent =
        state.sources[sourceKey].name;
    });

    showToast(
      `${state.sources[sourceKey].name} selected.`,
      "success"
    );
  }

  function setupSourceSelectors() {
    qsa("[data-source]").forEach((element) => {
      element.addEventListener("click", () => {
        selectSource(
          element.dataset.source
        );
      });
    });

    qsa(".source-option").forEach((element) => {
      element.addEventListener("click", () => {
        const key =
          element.dataset.source ||
          element.dataset.sourceKey;

        if (key) {
          selectSource(key);
        }
      });
    });
  }

  /* =========================================================
     BEAST FEES
     ========================================================= */

  function beastFeeFor(amount) {
    const value = Number(amount) || 0;

    if (value <= 0) {
      return 0;
    }

    if (value <= 1000) {
      return 5;
    }

    if (value <= 10000) {
      return 10;
    }

    return 15;
  }

  function providerCostFor(
    amount,
    provider = "mpesa"
  ) {
    const value = Number(amount) || 0;

    if (provider !== "mpesa") {
      return 0;
    }

    if (value <= 100) return 0;
    if (value <= 1500) return 5;
    if (value <= 5000) return 9;
    if (value <= 20000) return 11;
    if (value <= 250000) return 13;

    return 13;
  }

  function calculateTransactionCost(
    amount,
    provider = "mpesa"
  ) {
    const beastFee = beastFeeFor(amount);
    const providerCost = providerCostFor(
      amount,
      provider
    );

    return {
      beastFee,
      providerCost,
      total: Number(amount) + beastFee
    };
  }

  /* =========================================================
     TRANSACTIONS
     ========================================================= */

  function recordTransaction({
    type = "payment",
    amount = 0,
    fee = 0,
    providerCost = 0,
    source = state.selectedSource,
    recipient = "",
    recipientName = "",
    status = "completed",
    description = "",
    metadata = {}
  }) {
    const numericAmount =
      Number(amount) || 0;

    const transaction = {
      id: generateReference(),
      reference: generateReference(),
      type,
      amount: numericAmount,
      fee: Number(fee) || 0,
      providerCost: Number(providerCost) || 0,
      source,
      recipient,
      recipientName,
      status,
      description,
      metadata,
      createdAt: nowISO()
    };

    state.transactions.unshift(
      transaction
    );

    state.owner.transactions += 1;
    state.owner.beastFees +=
      Number(fee) || 0;

    state.owner.providerCosts +=
      Number(providerCost) || 0;

    saveState();

    return transaction;
  }

  /* =========================================================
     SEND MONEY
     ========================================================= */

  function getSendFields() {
    return {
      phone:
        inputValue("sendPhone") ||
        inputValue("recipientPhone") ||
        inputValue("receiverPhone"),

      amount:
        inputValue("sendAmount") ||
        inputValue("transferAmount") ||
        inputValue("amount"),

      source:
        inputValue("sendSource") ||
        state.selectedSource
    };
  }

  function verifyRecipient(phone) {
    const normalized = normalizePhone(phone);

    if (!validKenyanPhone(phone)) {
      return null;
    }

    if (
      normalizePhone(state.user.phone) ===
      normalized
    ) {
      return {
        name: state.user.name,
        phone: displayPhone(phone),
        beastId: state.user.beastId
      };
    }

    return {
      name: "Verified BEAST Recipient",
      phone: displayPhone(phone),
      beastId: `BEAST-${normalized.slice(-6)}`
    };
  }

  function showRecipientConfirmation(
    recipient
  ) {
    setText(
      "recipientName",
      recipient.name
    );

    setText(
      "recipientPhoneDisplay",
      recipient.phone
    );

    setText(
      "verifiedRecipientName",
      recipient.name
    );

    setText(
      "verifiedRecipientPhone",
      recipient.phone
    );

    showToast(
      `Recipient verified: ${recipient.name}`,
      "success"
    );
  }

  function performSend(
    phone,
    amount,
    sourceKey,
    recipientName = ""
  ) {
    const source =
      state.sources[sourceKey];

    if (!source) {
      showToast(
        "Select a valid payment source.",
        "error"
      );
      return false;
    }

    const numericAmount =
      Number(amount) || 0;

    if (numericAmount <= 0) {
      showToast(
        "Enter a valid amount.",
        "error"
      );
      return false;
    }

    const costs =
      calculateTransactionCost(
        numericAmount,
        sourceKey
      );

    const total =
      costs.total;

    if (Number(source.balance) < total) {
      showToast(
        `Insufficient balance. Required ${shortMoney(total)}.`,
        "error"
      );
      return false;
    }

    source.balance =
      Number(source.balance) - total;

    syncMainBalance();

    const transaction =
      recordTransaction({
        type: "send",
        amount: numericAmount,
        fee: costs.beastFee,
        providerCost: costs.providerCost,
        source: sourceKey,
        recipient: normalizePhone(phone),
        recipientName,
        description: `Money sent to ${recipientName || displayPhone(phone)}`
      });

    state.notifications.unshift({
      id: transaction.id,
      type: "transaction",
      title: "Money sent",
      message: `${shortMoney(numericAmount)} sent successfully.`,
      createdAt: nowISO(),
      read: false
    });

    saveState();
    updateDashboard();

    showToast(
      `Payment successful. ${shortMoney(numericAmount)} sent.`,
      "success"
    );

    return true;
  }

  function setupSend() {
    const verifyButtons = [
      $("verifyRecipient"),
      $("verifyReceiver"),
      $("verifySendRecipient")
    ].filter(Boolean);

    verifyButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const phone =
            inputValue("sendPhone") ||
            inputValue("recipientPhone") ||
            inputValue("receiverPhone");

          const recipient =
            verifyRecipient(phone);

          if (!recipient) {
            showToast(
              "Enter a valid Kenyan recipient number.",
              "error"
            );
            return;
          }

          showRecipientConfirmation(
            recipient
          );
        }
      );
    });

    const sendButtons = [
      $("sendMoneyButton"),
      $("confirmSend"),
      $("sendButton"),
      $("submitSend")
    ].filter(Boolean);

    sendButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const fields =
            getSendFields();

          const recipient =
            verifyRecipient(fields.phone);

          if (!recipient) {
            showToast(
              "Verify the recipient first.",
              "error"
            );
            return;
          }

          performSend(
            fields.phone,
            fields.amount,
            fields.source,
            recipient.name
          );
        }
      );
    });

    qsa("[data-send-source]").forEach(
      (element) => {
        element.addEventListener(
          "click",
          () => {
            selectSource(
              element.dataset.sendSource
            );
          }
        );
      }
    );
  }

  /* =========================================================
     LIPA NA
     ========================================================= */

  function setupLipaNa() {
    const payButtons = [
      $("lipaPayButton"),
      $("payBillButton"),
      $("confirmLipa"),
      $("submitLipa")
    ].filter(Boolean);

    payButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const number =
            inputValue("lipaNumber") ||
            inputValue("tillNumber") ||
            inputValue("paybillNumber") ||
            inputValue("businessNumber");

          const amount =
            inputValue("lipaAmount") ||
            inputValue("billAmount") ||
            inputValue("paymentAmount");

          if (!number) {
            showToast(
              "Enter the business, Till or PayBill number.",
              "error"
            );
            return;
          }

          const numericAmount =
            Number(amount) || 0;

          if (numericAmount <= 0) {
            showToast(
              "Enter a valid payment amount.",
              "error"
            );
            return;
          }

          const sourceKey =
            state.selectedSource;

          const source =
            state.sources[sourceKey];

          const costs =
            calculateTransactionCost(
              numericAmount,
              sourceKey
            );

          if (
            !source ||
            source.balance <
              costs.total
          ) {
            showToast(
              "Insufficient balance.",
              "error"
            );
            return;
          }

          source.balance -=
            costs.total;

          const transaction =
            recordTransaction({
              type: "lipa_na",
              amount: numericAmount,
              fee: costs.beastFee,
              providerCost:
                costs.providerCost,
              source: sourceKey,
              recipient: number,
              recipientName:
                "Business / Merchant",
              description:
                `Lipa Na payment to ${number}`
            });

          state.notifications.unshift({
            id: transaction.id,
            type: "transaction",
            title: "Lipa Na payment",
            message: `${shortMoney(numericAmount)} paid successfully.`,
            createdAt: nowISO(),
            read: false
          });

          saveState();
          updateDashboard();

          showToast(
            "Lipa Na payment completed.",
            "success"
          );
        }
      );
    });
  }

  /* =========================================================
     WITHDRAW
     ========================================================= */

  function setupWithdraw() {
    const verifyButtons = [
      $("verifyAgent"),
      $("verifyWithdrawAgent")
    ].filter(Boolean);

    verifyButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const agent =
            inputValue("agentNumber") ||
            inputValue("withdrawAgent");

          if (!validKenyanPhone(agent)) {
            showToast(
              "Enter a valid Kenyan agent number.",
              "error"
            );
            return;
          }

          setText(
            "verifiedAgent",
            displayPhone(agent)
          );

          setText(
            "agentName",
            "Verified BEAST Agent"
          );

          showToast(
            "Agent verified.",
            "success"
          );
        }
      );
    });

    const withdrawButtons = [
      $("withdrawButton"),
      $("confirmWithdraw"),
      $("submitWithdraw")
    ].filter(Boolean);

    withdrawButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const agent =
            inputValue("agentNumber") ||
            inputValue("withdrawAgent");

          const amount =
            inputValue("withdrawAmount") ||
            inputValue("withdrawalAmount");

          const numericAmount =
            Number(amount) || 0;

          if (!validKenyanPhone(agent)) {
            showToast(
              "Verify the agent number.",
              "error"
            );
            return;
          }

          if (numericAmount <= 0) {
            showToast(
              "Enter a valid withdrawal amount.",
              "error"
            );
            return;
          }

          const source =
            state.sources[state.selectedSource];

          const fee =
            beastFeeFor(numericAmount);

          const total =
            numericAmount + fee;

          if (!source || source.balance < total) {
            showToast(
              `Insufficient balance. Required ${shortMoney(total)}.`,
              "error"
            );
            return;
          }

          source.balance -= total;

          const transaction =
            recordTransaction({
              type: "withdraw",
              amount: numericAmount,
              fee,
              providerCost: 0,
              source: state.selectedSource,
              recipient:
                normalizePhone(agent),
              recipientName:
                "BEAST Agent",
              description:
                `Withdrawal through agent ${displayPhone(agent)}`
            });

          state.notifications.unshift({
            id: transaction.id,
            type: "transaction",
            title: "Withdrawal completed",
            message: `${shortMoney(numericAmount)} withdrawn.`,
            createdAt: nowISO(),
            read: false
          });

          saveState();
          updateDashboard();

          showToast(
            "Withdrawal completed successfully.",
            "success"
          );
        }
      );
    });
  }

  /* =========================================================
     RECEIVE / SELL
     ========================================================= */

  function setupReceive() {
    const loginButtons = [
      $("buyerLoginButton"),
      $("receiveLoginButton"),
      $("loginBuyer")
    ].filter(Boolean);

    loginButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const account =
            inputValue("buyerAccount") ||
            inputValue("receiveAccount") ||
            inputValue("loginAccount");

          const password =
            inputValue("buyerPassword") ||
            inputValue("receivePassword") ||
            inputValue("loginPassword");

          const normalized =
            normalizePhone(account);

          const validAccount =
            account === "BEAST-20481" ||
            normalized ===
              normalizePhone(state.user.phone) ||
            validKenyanPhone(account);

          if (
            !validAccount ||
            password !== DEMO_PASSWORD
          ) {
            showToast(
              "Buyer login details are not valid.",
              "error"
            );
            return;
          }

          state.receiveLoggedIn = true;
          saveState();

          showToast(
            "Buyer verified.",
            "success"
          );

          updateReceiveUI();
        }
      );
    });

    const verifySellerButtons = [
      $("verifySeller"),
      $("sellerVerifyButton"),
      $("verifyMerchant")
    ].filter(Boolean);

    verifySellerButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const seller =
            inputValue("sellerNumber") ||
            inputValue("sellerAccount") ||
            inputValue("merchantNumber");

          if (!seller) {
            showToast(
              "Enter the seller number.",
              "error"
            );
            return;
          }

          state.receiveSellerVerified = true;

          setText(
            "sellerName",
            "Verified Seller"
          );

          setText(
            "verifiedSellerName",
            "Verified Seller"
          );

          setText(
            "verifiedSellerNumber",
            seller
          );

          saveState();

          showToast(
            "Seller verified.",
            "success"
          );

          updateReceiveUI();
        }
      );
    });

    const sellerApprovalButtons = [
      $("sellerApprove"),
      $("approvePayment"),
      $("sellerApprovalButton")
    ].filter(Boolean);

    sellerApprovalButtons.forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            if (!state.receiveLoggedIn) {
              showToast(
                "Buyer verification is required.",
                "error"
              );
              return;
            }

            if (
              !state.receiveSellerVerified
            ) {
              showToast(
                "Verify the seller first.",
                "error"
              );
              return;
            }

            showToast(
              "Seller approval received.",
              "success"
            );
          }
        );
      }
    );
  }

  function updateReceiveUI() {
    qsa(
      "[data-receive-logged-in]"
    ).forEach((element) => {
      element.textContent =
        state.receiveLoggedIn
          ? "Verified"
          : "Not verified";
    });

    qsa(
      "[data-seller-verified]"
    ).forEach((element) => {
      element.textContent =
        state.receiveSellerVerified
          ? "Verified"
          : "Not verified";
    });
  }

  /* =========================================================
     PIN AUTHORIZATION
     ========================================================= */

  let pendingAuthorization = null;

  function openPinModal(callback) {
    pendingAuthorization = callback;

    const modal =
      $("pinModal") ||
      $("authorizationModal") ||
      $("authModal");

    if (!modal) {
      const pin =
        window.prompt(
          "Enter your BEAST PIN"
        );

      if (
        pin &&
        pin === state.user.pin
      ) {
        if (callback) callback();
      } else {
        showToast(
          "Authorization failed.",
          "error"
        );
      }

      return;
    }

    showElement(modal);

    const pinInput =
      $("authorizationPin") ||
      $("pinInput") ||
      $("beastPinInput");

    if (pinInput) {
      pinInput.value = "";
      pinInput.focus();
    }
  }

  function closePinModal() {
    const modal =
      $("pinModal") ||
      $("authorizationModal") ||
      $("authModal");

    hideElement(modal);

    pendingAuthorization = null;
  }

  function setupPinAuthorization() {
    const confirmButtons = [
      $("confirmPin"),
      $("authorizeButton"),
      $("submitPin"),
      $("pinConfirm")
    ].filter(Boolean);

    confirmButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const pin =
            inputValue("authorizationPin") ||
            inputValue("pinInput") ||
            inputValue("beastPinInput");

          const expected =
            state.user.pin ||
            DEMO_PIN;

          if (pin !== expected) {
            showToast(
              "Incorrect BEAST PIN.",
              "error"
            );
            return;
          }

          const callback =
            pendingAuthorization;

          closePinModal();

          if (callback) {
            callback();
          }
        }
      );
    });

    const cancelButtons = [
      $("cancelPin"),
      $("closePinModal"),
      $("authorizationCancel")
    ].filter(Boolean);

    cancelButtons.forEach((button) => {
      button.addEventListener(
        "click",
        closePinModal
      );
    });
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function transactionLabel(transaction) {
    switch (transaction.type) {
      case "send":
        return "Money Transfer";

      case "lipa_na":
        return "Lipa Na";

      case "withdraw":
        return "Withdrawal";

      case "receive":
        return "Received Money";

      default:
        return "Transaction";
    }
  }

  function updateHistory() {
    const containers = [
      $("historyList"),
      $("transactionHistory"),
      $("historyContainer")
    ].filter(Boolean);

    containers.forEach((container) => {
      if (!state.transactions.length) {
        container.innerHTML = `
          <div class="empty-state">
            No transactions yet.
          </div>
        `;
        return;
      }

      container.innerHTML =
        state.transactions
          .slice(0, 100)
          .map((transaction) => {
            const outgoing =
              [
                "send",
                "lipa_na",
                "withdraw"
              ].includes(
                transaction.type
              );

            const sign =
              outgoing ? "-" : "+";

            return `
              <div class="transaction-item">
                <div class="transaction-main">
                  <strong>
                    ${escapeHTML(
                      transactionLabel(
                        transaction
                      )
                    )}
                  </strong>

                  <small>
                    ${escapeHTML(
                      transaction.description ||
                        ""
                    )}
                  </small>

                  <small>
                    ${escapeHTML(
                      formatDate(
                        transaction.createdAt
                      )
                    )}
                  </small>
                </div>

                <div class="transaction-amount ${
                  outgoing
                    ? "outgoing"
                    : "incoming"
                }">
                  ${sign} ${escapeHTML(
                    shortMoney(
                      transaction.amount
                    )
                  )}
                </div>
              </div>
            `;
          })
          .join("");
    });
  }

  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

  function updateNotificationDisplays() {
    const unread =
      state.notifications.filter(
        (item) => !item.read
      ).length;

    qsa(
      "[data-notification-count]"
    ).forEach((element) => {
      element.textContent = String(unread);
      element.style.display =
        unread > 0 ? "" : "none";
    });

    const containers = [
      $("notificationList"),
      $("notificationsList")
    ].filter(Boolean);

    containers.forEach((container) => {
      if (!state.notifications.length) {
        container.innerHTML = `
          <div class="empty-state">
            No notifications.
          </div>
        `;
        return;
      }

      container.innerHTML =
        state.notifications
          .slice(0, 50)
          .map(
            (item) => `
              <div class="notification-item ${
                item.read ? "read" : "unread"
              }">
                <strong>
                  ${escapeHTML(
                    item.title
                  )}
                </strong>
                <p>
                  ${escapeHTML(
                    item.message
                  )}
                </p>
                <small>
                  ${escapeHTML(
                    formatDate(
                      item.createdAt
                    )
                  )}
                </small>
              </div>
            `
          )
          .join("");
    });
  }

  function markNotificationsRead() {
    state.notifications.forEach(
      (item) => {
        item.read = true;
      }
    );

    saveState();
    updateNotificationDisplays();
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function applyTheme(theme) {
    state.theme = theme;

    document.documentElement.dataset.theme =
      theme;

    document.body.dataset.theme =
      theme;

    try {
      localStorage.setItem(
        THEME_KEY,
        theme
      );
    } catch (_) {}

    qsa(
      "[data-theme-toggle]"
    ).forEach((button) => {
      button.textContent =
        theme === "light"
          ? "Dark Mode"
          : "Light Mode";
    });

    saveState();
  }

  function setupSettings() {
    const savedTheme =
      localStorage.getItem(
        THEME_KEY
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      state.theme = savedTheme;
    }

    applyTheme(state.theme);

    qsa(
      "[data-theme-toggle]"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          applyTheme(
            state.theme === "dark"
              ? "light"
              : "dark"
          );
        }
      );
    });

    const themeButtons = [
      $("darkModeButton"),
      $("lightModeButton")
    ].filter(Boolean);

    themeButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const theme =
            button.id ===
            "lightModeButton"
              ? "light"
              : "dark";

          applyTheme(theme);
        }
      );
    });

    const biometric =
      $("biometricToggle");

    if (biometric) {
      biometric.checked =
        !!state.settings.biometric;

      biometric.addEventListener(
        "change",
        () => {
          state.settings.biometric =
            biometric.checked;

          saveState();
        }
      );
    }

    const notifications =
      $("notificationsToggle");

    if (notifications) {
      notifications.checked =
        !!state.settings.notifications;

      notifications.addEventListener(
        "change",
        () => {
          state.settings.notifications =
            notifications.checked;

          saveState();
        }
      );
    }

    const screenSecurity =
      $("screenSecurityToggle");

    if (screenSecurity) {
      screenSecurity.checked =
        !!state.settings.screenSecurity;

      screenSecurity.addEventListener(
        "change",
        () => {
          state.settings.screenSecurity =
            screenSecurity.checked;

          saveState();
        }
      );
    }

    const resetButtons = [
      $("resetDemo"),
      $("resetDemoButton"),
      $("clearDemo")
    ].filter(Boolean);

    resetButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const confirmed =
            window.confirm(
              "Reset the MONEY TRANSFER BEAST demo?"
            );

          if (confirmed) {
            resetState();
          }
        }
      );
    });
  }

  /* =========================================================
     PIN CHANGE
     ========================================================= */

  function setupPinChange() {
    const changeButton =
      $("changePinButton");

    if (!changeButton) return;

    changeButton.addEventListener(
      "click",
      () => {
        const oldPin =
          inputValue("oldPin");

        const newPin =
          inputValue("newPin");

        const confirmPin =
          inputValue("confirmNewPin");

        if (
          oldPin !== state.user.pin
        ) {
          showToast(
            "Current BEAST PIN is incorrect.",
            "error"
          );
          return;
        }

        if (!/^\d{4}$/.test(newPin)) {
          showToast(
            "New PIN must contain 4 digits.",
            "error"
          );
          return;
        }

        if (newPin !== confirmPin) {
          showToast(
            "New PINs do not match.",
            "error"
          );
          return;
        }

        state.user.pin = newPin;

        saveState();

        showToast(
          "BEAST PIN changed successfully.",
          "success"
        );
      }
    );
  }

  /* =========================================================
     MENU / NAVIGATION BUTTONS
     ========================================================= */

  function setupNavigation() {
    qsa("[data-go]").forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const target =
              button.dataset.go;

            if (target) {
              showScreen(target);
            }
          }
        );
      }
    );

    const menuButton =
      $("menuButton") ||
      $("hamburgerButton") ||
      $("openMenu");

    const menu =
      $("sideMenu") ||
      $("menuPanel") ||
      $("navigationMenu");

    if (menuButton && menu) {
      menuButton.addEventListener(
        "click",
        () => {
          menu.classList.toggle("open");
          menu.classList.toggle("active");
        }
      );
    }

    qsa(
      "[data-close-menu]"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          if (menu) {
            menu.classList.remove(
              "open",
              "active"
            );
          }
        }
      );
    });

    qsa(
      "[data-action='home']"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        showDashboard
      );
    });

    qsa(
      "[data-action='history']"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showScreen("historyScreen");
          updateHistory();
        }
      );
    });

    qsa(
      "[data-action='settings']"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showScreen("settingsScreen");
        }
      );
    });

    qsa(
      "[data-action='notifications']"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showScreen(
            "notificationsScreen"
          );

          markNotificationsRead();
        }
      );
    });
  }

  /* =========================================================
     LOGOUT
     ========================================================= */

  function setupLogout() {
    qsa(
      "[data-action='logout'], #logoutButton, #logout"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          state.receiveLoggedIn = false;
          state.receiveSellerVerified =
            false;

          saveState();

          showToast(
            "Session ended.",
            "success"
          );

          showDashboard();
        }
      );
    });
  }

  /* =========================================================
     OWNER / ADMIN DEMO
     ========================================================= */

  function updateOwnerDashboard() {
    setText(
      "ownerTransactions",
      String(
        state.owner.transactions || 0
      )
    );

    setText(
      "ownerFees",
      shortMoney(
        state.owner.beastFees || 0
      )
    );

    setText(
      "ownerProviderCosts",
      shortMoney(
        state.owner.providerCosts || 0
      )
    );

    const net =
      Number(state.owner.beastFees || 0) -
      Number(
        state.owner.providerCosts || 0
      );

    setText(
      "ownerNetRevenue",
      shortMoney(net)
    );

    setText(
      "adminRevenue",
      shortMoney(net)
    );
  }

  function setupOwnerLogin() {
    const button =
      $("ownerLoginButton") ||
      $("adminLoginButton");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        const password =
          inputValue("ownerPassword") ||
          inputValue("adminPassword");

        if (
          password !== DEMO_PASSWORD
        ) {
          showToast(
            "Owner password is incorrect.",
            "error"
          );
          return;
        }

        showToast(
          "Owner dashboard unlocked.",
          "success"
        );

        const screen =
          $("ownerDashboardScreen") ||
          $("adminDashboardScreen");

        if (screen) {
          showScreen(screen.id);
        }

        updateOwnerDashboard();
      }
    );
  }

  /* =========================================================
     SECURITY
     ========================================================= */

  function addSecurityEvent(
    title,
    message,
    severity = "info"
  ) {
    const event = {
      id: generateReference(),
      title,
      message,
      severity,
      createdAt: nowISO()
    };

    state.securityEvents.unshift(
      event
    );

    saveState();

    updateSecurityDisplays();
  }

  function updateSecurityDisplays() {
    const containers = [
      $("securityEvents"),
      $("securityLog"),
      $("securityList")
    ].filter(Boolean);

    containers.forEach((container) => {
      container.innerHTML =
        state.securityEvents
          .slice(0, 50)
          .map(
            (event) => `
              <div class="security-event ${escapeHTML(
                event.severity
              )}">
                <strong>
                  ${escapeHTML(
                    event.title
                  )}
                </strong>
                <p>
                  ${escapeHTML(
                    event.message
                  )}
                </p>
                <small>
                  ${escapeHTML(
                    formatDate(
                      event.createdAt
                    )
                  )}
                </small>
              </div>
            `
          )
          .join("");
    });
  }

  function setupSecurityProtection() {
    if (
      !state.settings.screenSecurity
    ) {
      return;
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          addSecurityEvent(
            "Security Alert",
            "The BEAST application was moved to the background.",
            "warning"
          );
        }
      }
    );

    window.addEventListener(
      "blur",
      () => {
        addSecurityEvent(
          "Security Alert",
          "Application focus changed.",
          "warning"
        );
      }
    );
  }

  /* =========================================================
     CAMERA / QR PLACEHOLDER
     ========================================================= */

  function setupCameraButtons() {
    qsa(
      "[data-action='camera'], #openCamera, #cameraButton"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          showToast(
            "Camera scanner is available for the future mobile version.",
            "info"
          );
        }
      );
    });
  }

  /* =========================================================
     DEMO LOGIN
     ========================================================= */

  function setupDemoLogin() {
    qsa(
      "#loginButton, #customerLoginButton"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const account =
            inputValue("loginAccount") ||
            inputValue("accountNumber") ||
            inputValue("phoneNumber");

          const name =
            inputValue("loginName") ||
            inputValue("fullName");

          if (!account || !name) {
            showToast(
              "Enter your account/phone number and full name.",
              "error"
            );
            return;
          }

          if (
            normalizePhone(account) !==
              normalizePhone(
                state.user.phone
              ) &&
            account !== state.user.beastId
          ) {
            showToast(
              "Account could not be verified.",
              "error"
            );
            return;
          }

          if (
            name.toLowerCase() !==
            String(
              state.user.name
            ).toLowerCase()
          ) {
            showToast(
              "Full name does not match.",
              "error"
            );
            return;
          }

          showToast(
            `Account verified. Balance: ${shortMoney(
              getTotalBalance()
            )}`,
            "success"
          );

          setText(
            "loginBalance",
            shortMoney(
              getTotalBalance()
            )
          );
        }
      );
    });
  }

  /* =========================================================
     BALANCE REFRESH
     ========================================================= */

  function setupBalanceRefresh() {
    qsa(
      "#refreshBalance, [data-action='refresh-balance']"
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          updateDashboard();

          showToast(
            "Balance refreshed.",
            "success"
          );
        }
      );
    });
  }

  /* =========================================================
     FORM SUBMISSION PROTECTION
     ========================================================= */

  function preventUnexpectedFormSubmission() {
    qsa("form").forEach((form) => {
      form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
        }
      );
    });
  }

  /* =========================================================
     INITIAL UI
     ========================================================= */

  function initializeRegistrationState() {
    const registration =
      $("registrationScreen");

    if (!registration) {
      return;
    }

    updateRegistrationSummary();

    if (state.registered) {
      hideRegistration();
      showDashboard();
    } else {
      showElement(registration);
      showRegistrationStep(1);
    }
  }

  function initialize() {
    console.log(
      "MONEY TRANSFER BEAST initializing..."
    );

    setupRegistration();
    setupSourceSelectors();
    setupSend();
    setupLipaNa();
    setupWithdraw();
    setupReceive();
    setupPinAuthorization();
    setupSettings();
    setupPinChange();
    setupNavigation();
    setupLogout();
    setupOwnerLogin();
    setupSecurityProtection();
    setupCameraButtons();
    setupDemoLogin();
    setupBalanceRefresh();

    preventUnexpectedFormSubmission();

    updateDashboard();
    updateRegistrationSummary();
    updateReceiveUI();
    updateSecurityDisplays();

    initializeRegistrationState();

    console.log(
      "MONEY TRANSFER BEAST initialized successfully."
    );
  }

  /* =========================================================
     START
     ========================================================= */

  initialize();
});