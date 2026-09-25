/* =========================================================
   MONEY TRANSFER BEAST
   app.js
   DEMO / PROTOTYPE ONLY
   No real M-PESA, bank, card or Airtel transactions.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */

  const STORAGE_KEY = "money_transfer_beast_demo_v10";
  const THEME_KEY = "money_transfer_beast_theme";

  const DEMO_PASSWORD = "beast123";
  const STARTING_BALANCE = 5000;

  const SOURCE_NAMES = {
    mpesa: "M-PESA",
    airtel: "Airtel Money",
    bank: "Bank Account",
    card: "Card",
    wallet: "BEAST Wallet"
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = id => document.getElementById(id);

  const qsa = selector =>
    Array.from(document.querySelectorAll(selector));

  function money(value) {
    return (Number(value) || 0).toLocaleString("en-KE", {
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

  function inputValue(id) {
    const element = $(id);
    return element ? String(element.value || "").trim() : "";
  }

  function normalizePhone(phone) {
    let value = String(phone || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "");

    if (value.startsWith("+254")) {
      value = value.substring(1);
    }

    if (value.startsWith("0")) {
      value = "254" + value.substring(1);
    }

    return value;
  }

  function displayPhone(phone) {
    const value = normalizePhone(phone);

    if (/^254\d{9}$/.test(value)) {
      return "0" + value.substring(3);
    }

    return phone || "—";
  }

  function validKenyanPhone(phone) {
    return /^(?:2547\d{8}|2541\d{8}|07\d{8}|01\d{8})$/
      .test(normalizePhone(phone));
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDate(value) {
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

  function generateReference(prefix = "BT") {
    return `${prefix}${Date.now().toString().slice(-8)}${randomNumber(3)}`;
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function show(element) {
    if (!element) return;

    element.classList.remove("hidden");
    element.style.display = "";
  }

  function hide(element) {
    if (!element) return;

    element.classList.add("hidden");
    element.style.display = "none";
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

    sources: {
      mpesa: {
        name: "M-PESA",
        balance: STARTING_BALANCE,
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
      biometric: false,
      notifications: true,
      screenSecurity: true
    },

    theme: "dark"
  };

  function clone(object) {
    return JSON.parse(JSON.stringify(object));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return clone(defaultState);
      }

      const parsed = JSON.parse(saved);

      return mergeState(
        clone(defaultState),
        parsed
      );

    } catch (error) {
      console.error(error);
      return clone(defaultState);
    }
  }

  function mergeState(base, saved) {
    Object.keys(saved || {}).forEach(key => {

      if (
        saved[key] &&
        typeof saved[key] === "object" &&
        !Array.isArray(saved[key]) &&
        base[key] &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        base[key] = {
          ...base[key],
          ...saved[key]
        };
      } else {
        base[key] = saved[key];
      }

    });

    return base;
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  /* =========================================================
     TOAST
  ========================================================= */

  function toast(message, type = "success") {

    let element = $("beastToast");

    if (!element) {
      element = document.createElement("div");
      element.id = "beastToast";
      element.className = "beast-toast";
      document.body.appendChild(element);
    }

    element.textContent = message;
    element.dataset.type = type;

    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.classList.remove("show");
    }, 3000);
  }

  /* =========================================================
     FEES
  ========================================================= */

  function beastFeeFor(amount) {

    const value = Number(amount) || 0;

    if (value <= 0) {
      return 0;
    }

    if (value <= 1000) {
      return 7;
    }

    if (value <= 10000) {
      return 30;
    }

    return 50;
  }

  function providerCostFor(amount, provider) {

    const value = Number(amount) || 0;

    if (provider === "wallet") {
      return 0;
    }

    if (provider === "mpesa") {
      if (value <= 100) return 0;
      if (value <= 1500) return 5;
      if (value <= 5000) return 9;
      if (value <= 20000) return 11;
      if (value <= 250000) return 13;

      return 20;
    }

    if (provider === "airtel") {
      return value <= 1500 ? 5 : 10;
    }

    if (provider === "bank") {
      return value <= 10000 ? 3 : 10;
    }

    if (provider === "card") {
      return value <= 10000 ? 8 : 15;
    }

    return 0;
  }

  function calculateCosts(amount, provider) {

    const numericAmount =
      Number(amount) || 0;

    const beastFee =
      beastFeeFor(numericAmount);

    const providerCost =
      providerCostFor(
        numericAmount,
        provider
      );

    return {
      amount: numericAmount,
      beastFee,
      providerCost,
      total:
        numericAmount + beastFee
    };
  }

  /* =========================================================
     BALANCE
  ========================================================= */

  function getTotalBalance() {

    return Object.values(state.sources)
      .reduce(
        (total, source) =>
          total + Number(source.balance || 0),
        0
      );
  }

  function updateDashboard() {

    const total =
      getTotalBalance();

    state.balance = total;

    [
      "balanceAmount",
      "dashboardBalance",
      "mainBalance",
      "walletBalance",
      "accountBalance"
    ].forEach(id => {
      if ($(id)) {
        setText(
          id,
          shortMoney(total)
        );
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
    updateNotifications();
    updateOwnerDashboard();

    saveState();
  }

  function updateSourceDisplays() {

    qsa("[data-source-balance]")
      .forEach(element => {

        const key =
          element.dataset.sourceBalance;

        const source =
          state.sources[key];

        if (source) {
          element.textContent =
            shortMoney(source.balance);
        }
      });

    qsa("[data-source]")
      .forEach(element => {

        element.classList.toggle(
          "selected",
          element.dataset.source ===
          state.selectedSource
        );
      });
  }

  function selectSource(key) {

    if (!state.sources[key]) {
      toast(
        "Payment source not found.",
        "error"
      );
      return;
    }

    if (!state.sources[key].enabled) {
      toast(
        `${SOURCE_NAMES[key]} is not connected.`,
        "error"
      );
      return;
    }

    state.selectedSource = key;

    saveState();

    updateSourceDisplays();

    qsa("[data-selected-source]")
      .forEach(element => {
        element.textContent =
          SOURCE_NAMES[key];
      });

    toast(
      `${SOURCE_NAMES[key]} selected.`
    );
  }

  /* =========================================================
     REGISTRATION
  ========================================================= */

  function registrationMessage(message) {

    const element =
      $("registrationMessage");

    if (element) {
      element.textContent = message;
    }
  }

  function registrationStep(step) {

    [
      $("registrationStep1"),
      $("registrationStep2"),
      $("registrationStep3")
    ].forEach((element, index) => {

      if (!element) return;

      const active =
        index + 1 === step;

      element.classList.toggle(
        "active",
        active
      );

      element.style.display =
        active ? "" : "none";
    });

    [
      $("progressDot1"),
      $("progressDot2"),
      $("progressDot3")
    ].forEach((dot, index) => {

      if (!dot) return;

      dot.classList.toggle(
        "active",
        index + 1 <= step
      );

      dot.classList.toggle(
        "completed",
        index + 1 < step
      );
    });
  }

  function setupRegistration() {

    if (!$("registrationScreen")) {
      return;
    }

    registrationStep(1);

    $("registrationNext1")
      ?.addEventListener("click", () => {

        registrationMessage("");

        const name =
          inputValue("registrationName");

        const phone =
          inputValue("registrationPhone");

        const id =
          inputValue("registrationId");

        if (name.length < 3) {
          registrationMessage(
            "Enter your full name."
          );
          return;
        }

        if (!validKenyanPhone(phone)) {
          registrationMessage(
            "Enter a valid Kenyan phone number."
          );
          return;
        }

        if (id.length < 5) {
          registrationMessage(
            "Enter your National ID."
          );
          return;
        }

        state.user.name = name;
        state.user.phone =
          normalizePhone(phone);
        state.user.nationalId = id;

        if (!state.user.beastId) {
          state.user.beastId =
            generateBeastId();
        }

        setText(
          "registrationSummaryName",
          name
        );

        setText(
          "registrationSummaryPhone",
          displayPhone(phone)
        );

        setText(
          "registrationSummaryId",
          id
        );

        setText(
          "registrationBeastId",
          state.user.beastId
        );

        saveState();

        registrationStep(2);
      });

    $("registrationNext2")
      ?.addEventListener("click", () => {

        registrationMessage("");

        const pin =
          inputValue("registrationPin");

        const confirm =
          inputValue(
            "registrationPinConfirm"
          );

        if (!/^\d{4}$/.test(pin)) {
          registrationMessage(
            "BEAST PIN must contain exactly 4 digits."
          );
          return;
        }

        if (pin !== confirm) {
          registrationMessage(
            "PINs do not match."
          );
          return;
        }

        state.user.pin = pin;

        saveState();

        registrationStep(3);
      });

    $("registrationBack1")
      ?.addEventListener(
        "click",
        () => registrationStep(1)
      );

    $("registrationBack2")
      ?.addEventListener(
        "click",
        () => registrationStep(2)
      );

    $("registrationFinish")
      ?.addEventListener("click", () => {

        if (!state.user.name ||
            !state.user.phone ||
            !state.user.nationalId ||
            !state.user.pin) {

          registrationMessage(
            "Complete all registration steps."
          );

          return;
        }

        state.registered = true;

        state.notifications.unshift({
          id: generateReference("NT"),
          title: "BEAST account created",
          message:
            "Your MONEY TRANSFER BEAST account was created.",
          createdAt: nowISO(),
          read: false
        });

        saveState();

        toast(
          "BEAST account created successfully."
        );

        setTimeout(() => {
          showDashboard();
        }, 300);
      });
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function showScreen(id) {

    const target = $(id);

    if (!target) return;

    qsa(
      ".screen, .app-screen, [data-screen]"
    ).forEach(screen => {

      if (screen === target) {
        screen.classList.add("active");
        screen.classList.remove("hidden");
        screen.style.display = "";
      } else {
        screen.classList.remove("active");
      }

    });

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function showDashboard() {

    hide(
      $("registrationScreen")
    );

    const ids = [
      "dashboardScreen",
      "mainScreen",
      "homeScreen",
      "appScreen"
    ];

    const target =
      ids.find(id => $(id));

    if (target) {
      showScreen(target);
    }

    updateDashboard();
  }

  function setupNavigation() {

    qsa("[data-go]")
      .forEach(button => {

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
      });

    qsa("[data-action='home']")
      .forEach(button => {
        button.addEventListener(
          "click",
          showDashboard
        );
      });

    qsa("[data-action='history']")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            showScreen("historyScreen");
            updateHistory();
          }
        );
      });

    qsa("[data-action='settings']")
      .forEach(button => {
        button.addEventListener(
          "click",
          () => showScreen("settingsScreen")
        );
      });

    qsa("[data-action='notifications']")
      .forEach(button => {
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

    qsa("[data-source]")
      .forEach(element => {
        element.addEventListener(
          "click",
          () => selectSource(
            element.dataset.source
          )
        );
      });
  }

  /* =========================================================
     RECIPIENT VERIFICATION
  ========================================================= */

  function verifyRecipient(phone) {

    if (!validKenyanPhone(phone)) {
      return null;
    }

    const normalized =
      normalizePhone(phone);

    if (
      normalized ===
      normalizePhone(state.user.phone)
    ) {

      return {
        name: state.user.name,
        phone: displayPhone(phone),
        beastId: state.user.beastId
      };
    }

    const demoNames = {
      "254712345678":
        "Demo BEAST Customer",

      "254720000000":
        "John Kamau",

      "254711111111":
        "Mary Wanjiku",

      "254799999999":
        "Peter Otieno"
    };

    return {
      name:
        demoNames[normalized] ||
        "Verified BEAST Recipient",

      phone:
        displayPhone(phone),

      beastId:
        `BEAST-${normalized.slice(-6)}`
    };
  }

  function setupSend() {

    qsa(
      "#verifyRecipient, #verifyReceiver, #verifySendRecipient"
    ).forEach(button => {

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
            toast(
              "Enter a valid Kenyan recipient number.",
              "error"
            );
            return;
          }

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

          qsa(
            "#recipientVerification, .recipient-verification"
          ).forEach(show);

          toast(
            `Recipient verified: ${recipient.name}`
          );
        }
      );
    });

    qsa(
      "#sendMoneyButton, #confirmSend, #sendButton, #submitSend"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const phone =
            inputValue("sendPhone") ||
            inputValue("recipientPhone") ||
            inputValue("receiverPhone");

          const amount =
            Number(
              inputValue("sendAmount") ||
              inputValue("transferAmount") ||
              inputValue("amount")
            );

          const recipient =
            verifyRecipient(phone);

          if (!recipient) {
            toast(
              "Verify the recipient first.",
              "error"
            );
            return;
          }

          if (amount <= 0) {
            toast(
              "Enter a valid amount.",
              "error"
            );
            return;
          }

          authorize(() => {

            sendMoney(
              phone,
              amount,
              state.selectedSource,
              recipient
            );

          });
        }
      );
    });
  }

  function sendMoney(
    phone,
    amount,
    sourceKey,
    recipient
  ) {

    const source =
      state.sources[sourceKey];

    if (!source) {
      toast(
        "Payment source unavailable.",
        "error"
      );
      return;
    }

    const costs =
      calculateCosts(
        amount,
        sourceKey
      );

    if (
      Number(source.balance) <
      costs.total
    ) {

      toast(
        `Insufficient balance. Required ${shortMoney(costs.total)}.`,
        "error"
      );

      return;
    }

    source.balance -=
      costs.total;

    const transaction =
      recordTransaction({
        type: "send",
        amount,
        fee: costs.beastFee,
        providerCost:
          costs.providerCost,
        source: sourceKey,
        recipient:
          normalizePhone(phone),
        recipientName:
          recipient.name,
        description:
          `Money sent to ${recipient.name}`
      });

    addNotification(
      "Money sent",
      `${shortMoney(amount)} sent to ${recipient.name}.`
    );

    addSecurityEvent(
      "Transfer completed",
      `Money sent to ${recipient.phone}.`
    );

    updateDashboard();

    clearInput("sendPhone");
    clearInput("recipientPhone");
    clearInput("receiverPhone");
    clearInput("sendAmount");

    qsa(
      "#recipientVerification, .recipient-verification"
    ).forEach(hide);

    toast(
      `${shortMoney(amount)} sent successfully.`
    );
  }

  /* =========================================================
     LIPA NA
  ========================================================= */

  function setupLipaNa() {

    qsa(
      "#lipaPayButton, #payBillButton, #confirmLipa, #submitLipa"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const destination =
            inputValue("lipaNumber") ||
            inputValue("tillNumber") ||
            inputValue("paybillNumber") ||
            inputValue("businessNumber");

          const amount =
            Number(
              inputValue("lipaAmount") ||
              inputValue("billAmount") ||
              inputValue("paymentAmount")
            );

          if (!destination) {
            toast(
              "Enter the business, Till or PayBill number.",
              "error"
            );
            return;
          }

          if (amount <= 0) {
            toast(
              "Enter a valid amount.",
              "error"
            );
            return;
          }

          authorize(() => {

            const sourceKey =
              state.selectedSource;

            const source =
              state.sources[sourceKey];

            const costs =
              calculateCosts(
                amount,
                sourceKey
              );

            if (
              !source ||
              source.balance <
              costs.total
            ) {

              toast(
                "Insufficient balance.",
                "error"
              );

              return;
            }

            source.balance -=
              costs.total;

            recordTransaction({
              type: "lipa_na",
              amount,
              fee: costs.beastFee,
              providerCost:
                costs.providerCost,
              source: sourceKey,
              recipient: destination,
              recipientName:
                "Verified Business",
              description:
                `Lipa Na payment to ${destination}`
            });

            addNotification(
              "Lipa Na payment",
              `${shortMoney(amount)} paid successfully.`
            );

            updateDashboard();

            clearInput("lipaNumber");
            clearInput("tillNumber");
            clearInput("paybillNumber");
            clearInput("businessNumber");
            clearInput("lipaAmount");
            clearInput("billAmount");
            clearInput("paymentAmount");

            toast(
              "Lipa Na payment completed."
            );
          });
        }
      );
    });
  }

  /* =========================================================
     WITHDRAW
  ========================================================= */

  function setupWithdraw() {

    qsa(
      "#verifyAgent, #verifyWithdrawAgent"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const agent =
            inputValue("agentNumber") ||
            inputValue("withdrawAgent");

          if (!validKenyanPhone(agent)) {
            toast(
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

          qsa(
            "#withdrawVerification, .withdraw-verification"
          ).forEach(show);

          toast(
            "Agent verified."
          );
        }
      );
    });

    qsa(
      "#withdrawButton, #confirmWithdraw, #submitWithdraw"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const agent =
            inputValue("agentNumber") ||
            inputValue("withdrawAgent");

          const amount =
            Number(
              inputValue("withdrawAmount") ||
              inputValue("withdrawalAmount")
            );

          if (!validKenyanPhone(agent)) {
            toast(
              "Verify the agent first.",
              "error"
            );
            return;
          }

          if (amount <= 0) {
            toast(
              "Enter a valid withdrawal amount.",
              "error"
            );
            return;
          }

          authorize(() => {

            const source =
              state.sources[
                state.selectedSource
              ];

            const fee =
              beastFeeFor(amount);

            const total =
              amount + fee;

            if (
              !source ||
              source.balance < total
            ) {

              toast(
                `Insufficient balance. Required ${shortMoney(total)}.`,
                "error"
              );

              return;
            }

            source.balance -= total;

            recordTransaction({
              type: "withdraw",
              amount,
              fee,
              providerCost:
                providerCostFor(
                  amount,
                  state.selectedSource
                ),
              source:
                state.selectedSource,
              recipient:
                normalizePhone(agent),
              recipientName:
                "BEAST Agent",
              description:
                `Withdrawal through agent ${displayPhone(agent)}`
            });

            addNotification(
              "Withdrawal completed",
              `${shortMoney(amount)} withdrawn through agent.`
            );

            updateDashboard();

            toast(
              "Withdrawal completed successfully."
            );
          });
        }
      );
    });
  }

  /* =========================================================
     RECEIVE
  ========================================================= */

  function setupReceive() {

    qsa(
      "#verifySeller, #sellerVerifyButton, #verifyMerchant"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const seller =
            inputValue("sellerNumber") ||
            inputValue("sellerAccount") ||
            inputValue("merchantNumber");

          if (!seller) {
            toast(
              "Enter seller/business number.",
              "error"
            );
            return;
          }

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

          toast(
            "Seller verified."
          );
        }
      );
    });
  }

  /* =========================================================
     PIN AUTHORIZATION
  ========================================================= */

  let pendingAuthorization = null;

  function authorize(callback) {

    pendingAuthorization =
      callback;

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
        pin === state.user.pin
      ) {
        callback();
      } else {
        toast(
          "Authorization failed.",
          "error"
        );
      }

      return;
    }

    show(modal);

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

    hide(modal);

    pendingAuthorization = null;
  }

  function setupPinAuthorization() {

    qsa(
      "#confirmPin, #authorizeButton, #submitPin, #pinConfirm"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const pin =
            inputValue("authorizationPin") ||
            inputValue("pinInput") ||
            inputValue("beastPinInput");

          if (
            !state.user.pin ||
            pin !== state.user.pin
          ) {

            addSecurityEvent(
              "Failed authorization",
              "Incorrect BEAST PIN entered.",
              "warning"
            );

            toast(
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

    qsa(
      "#cancelPin, #closePinModal, #authorizationCancel"
    ).forEach(button => {

      button.addEventListener(
        "click",
        closePinModal
      );
    });
  }

  /* =========================================================
     TRANSACTIONS
  ========================================================= */

  function recordTransaction(data) {

    const transaction = {
      id: generateReference(),
      reference: generateReference(),
      createdAt: nowISO(),
      status: "completed",
      ...data
    };

    state.transactions.unshift(
      transaction
    );

    state.owner.transactions += 1;

    state.owner.beastFees +=
      Number(data.fee || 0);

    state.owner.providerCosts +=
      Number(data.providerCost || 0);

    state.owner.volume +=
      Number(data.amount || 0);

    saveState();

    return transaction;
  }

  /* =========================================================
     HISTORY
  ========================================================= */

  function transactionLabel(tx) {

    switch (tx.type) {

      case "send":
        return "Money Transfer";

      case "lipa_na":
        return "Lipa Na";

      case "withdraw":
        return "Withdrawal";

      case "receive":
        return "Money Received";

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

    containers.forEach(container => {

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
          .map(tx => {

            const outgoing =
              [
                "send",
                "lipa_na",
                "withdraw"
              ].includes(tx.type);

            return `
              <div class="transaction-item">

                <div class="transaction-main">

                  <strong>
                    ${escapeHTML(
                      transactionLabel(tx)
                    )}
                  </strong>

                  <small>
                    ${escapeHTML(
                      tx.description || ""
                    )}
                  </small>

                  <small>
                    ${escapeHTML(
                      formatDate(tx.createdAt)
                    )}
                  </small>

                </div>

                <div class="transaction-amount ${
                  outgoing
                    ? "outgoing"
                    : "incoming"
                }">

                  ${outgoing ? "−" : "+"}
                  ${escapeHTML(
                    shortMoney(tx.amount)
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

  function addNotification(
    title,
    message
  ) {

    if (
      state.settings.notifications === false
    ) {
      return;
    }

    state.notifications.unshift({
      id: generateReference("NT"),
      title,
      message,
      createdAt: nowISO(),
      read: false
    });

    state.notifications =
      state.notifications.slice(0, 100);

    saveState();

    updateNotifications();
  }

  function updateNotifications() {

    const unread =
      state.notifications.filter(
        item => !item.read
      ).length;

    qsa(
      "[data-notification-count]"
    ).forEach(element => {

      element.textContent =
        String(unread);

      element.style.display =
        unread ? "" : "none";
    });

    const containers = [
      $("notificationList"),
      $("notificationsList")
    ].filter(Boolean);

    containers.forEach(container => {

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
          .map(item => `
            <div class="notification-item ${
              item.read ? "read" : "unread"
            }">

              <strong>
                ${escapeHTML(item.title)}
              </strong>

              <p>
                ${escapeHTML(item.message)}
              </p>

              <small>
                ${escapeHTML(
                  formatDate(item.createdAt)
                )}
              </small>

            </div>
          `)
          .join("");
    });
  }

  function markNotificationsRead() {

    state.notifications.forEach(
      item => {
        item.read = true;
      }
    );

    saveState();
    updateNotifications();
  }

  /* =========================================================
     SECURITY
  ========================================================= */

  function addSecurityEvent(
    title,
    message,
    severity = "info"
  ) {

    state.securityEvents.unshift({
      id: generateReference("SEC"),
      title,
      message,
      severity,
      createdAt: nowISO()
    });

    state.securityEvents =
      state.securityEvents.slice(0, 100);

    saveState();

    updateSecurity();
  }

  function updateSecurity() {

    const containers = [
      $("securityEvents"),
      $("securityLog"),
      $("securityList")
    ].filter(Boolean);

    containers.forEach(container => {

      container.innerHTML =
        state.securityEvents
          .slice(0, 50)
          .map(event => `
            <div class="security-event ${escapeHTML(
              event.severity
            )}">

              <strong>
                ${escapeHTML(event.title)}
              </strong>

              <p>
                ${escapeHTML(event.message)}
              </p>

              <small>
                ${escapeHTML(
                  formatDate(event.createdAt)
                )}
              </small>

            </div>
          `)
          .join("");
    });
  }

  /* =========================================================
     SCREEN SECURITY
  ========================================================= */

  function setupSecurity() {

    if (
      state.settings.screenSecurity === false
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
            "BEAST application moved to the background.",
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
          "BEAST application focus changed.",
          "warning"
        );
      }
    );
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

    localStorage.setItem(
      THEME_KEY,
      theme
    );

    saveState();

    qsa("[data-theme-toggle]")
      .forEach(button => {

        button.textContent =
          theme === "dark"
            ? "Light Mode"
            : "Dark Mode";
      });
  }

  function setupSettings() {

    const saved =
      localStorage.getItem(THEME_KEY);

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      state.theme = saved;
    }

    applyTheme(state.theme);

    qsa("[data-theme-toggle]")
      .forEach(button => {

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

    $("notificationsToggle")
      ?.addEventListener(
        "change",
        event => {

          state.settings.notifications =
            event.target.checked;

          saveState();
        }
      );

    $("screenSecurityToggle")
      ?.addEventListener(
        "change",
        event => {

          state.settings.screenSecurity =
            event.target.checked;

          saveState();
        }
      );

    $("biometricToggle")
      ?.addEventListener(
        "change",
        event => {

          state.settings.biometric =
            event.target.checked;

          saveState();
        }
      );

    qsa(
      "#resetDemo, #resetDemoButton, #clearDemo"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (
            confirm(
              "Reset MONEY TRANSFER BEAST demo data?"
            )
          ) {

            localStorage.removeItem(
              STORAGE_KEY
            );

            localStorage.removeItem(
              THEME_KEY
            );

            location.reload();
          }
        }
      );
    });
  }

  /* =========================================================
     OWNER / ADMIN
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

    setText(
      "ownerVolume",
      shortMoney(
        state.owner.volume || 0
      )
    );

    const net =
      Number(state.owner.beastFees || 0) -
      Number(state.owner.providerCosts || 0);

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

    qsa(
      "#ownerLoginButton, #adminLoginButton"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const password =
            inputValue("ownerPassword") ||
            inputValue("adminPassword");

          if (
            password !== DEMO_PASSWORD
          ) {

            toast(
              "Owner password is incorrect.",
              "error"
            );

            return;
          }

          toast(
            "Owner dashboard unlocked."
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
    });
  }

  /* =========================================================
     PIN CHANGE
  ========================================================= */

  function setupPinChange() {

    $("changePinButton")
      ?.addEventListener(
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

            toast(
              "Current BEAST PIN is incorrect.",
              "error"
            );

            return;
          }

          if (!/^\d{4}$/.test(newPin)) {

            toast(
              "New PIN must contain 4 digits.",
              "error"
            );

            return;
          }

          if (newPin !== confirmPin) {

            toast(
              "New PINs do not match.",
              "error"
            );

            return;
          }

          state.user.pin = newPin;

          saveState();

          toast(
            "BEAST PIN changed successfully."
          );
        }
      );
  }

  /* =========================================================
     LOGIN / BALANCE CHECK
  ========================================================= */

  function setupLogin() {

    qsa(
      "#loginButton, #customerLoginButton"
    ).forEach(button => {

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

            toast(
              "Enter account/phone number and full name.",
              "error"
            );

            return;
          }

          const accountMatches =
            normalizePhone(account) ===
            normalizePhone(state.user.phone) ||
            account === state.user.beastId;

          const nameMatches =
            name.toLowerCase() ===
            state.user.name.toLowerCase();

          if (
            !accountMatches ||
            !nameMatches
          ) {

            toast(
              "Account details could not be verified.",
              "error"
            );

            return;
          }

          setText(
            "loginBalance",
            shortMoney(
              getTotalBalance()
            )
          );

          toast(
            `Account verified. Balance: ${shortMoney(
              getTotalBalance()
            )}`
          );
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
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          toast(
            "Session ended."
          );

          showDashboard();
        }
      );
    });
  }

  /* =========================================================
     BALANCE REFRESH
  ========================================================= */

  function setupRefresh() {

    qsa(
      "#refreshBalance, [data-action='refresh-balance']"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          updateDashboard();

          toast(
            "Balance refreshed."
          );
        }
      );
    });
  }

  /* =========================================================
     CAMERA
  ========================================================= */

  function setupCamera() {

    qsa(
      "[data-action='camera'], #openCamera, #cameraButton"
    ).forEach(button => {

      button.addEventListener(
        "click",
        () => {

          toast(
            "Camera/QR scanner will be connected in the mobile version.",
            "info"
          );
        }
      );
    });
  }

  /* =========================================================
     FORM PROTECTION
  ========================================================= */

  function preventForms() {

    qsa("form").forEach(form => {

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

    setupRegistration();
    setupNavigation();
    setupSend();
    setupLipaNa();
    setupWithdraw();
    setupReceive();
    setupPinAuthorization();
    setupSettings();
    setupPinChange();
    setupOwnerLogin();
    setupSecurity();
    setupLogin();
    setupLogout();
    setupRefresh();
    setupCamera();
    preventForms();

    updateDashboard();
    updateNotifications();
    updateSecurity();

    if (state.registered) {

      hide(
        $("registrationScreen")
      );

      showDashboard();

    } else {

      show(
        $("registrationScreen")
      );

      registrationStep(1);
    }

    console.log(
      "MONEY TRANSFER BEAST loaded successfully."
    );
  }

  initialize();

});