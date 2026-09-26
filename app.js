/* =========================================================
   MONEY TRANSFER BEAST 🇰🇪
   app.js
   Kenya-first prototype
   All transactions are SIMULATED.
   ========================================================= */

"use strict";

/* =========================================================
   BASIC STATE
   ========================================================= */

const state = {
  balance: 10000,
  beastId: "BEAST-000001",
  phone: "+254700000000",

  verifiedRecipient: null,

  transactions: [],

  notifications: [
    {
      icon: "🔐",
      title: "Security ready",
      text: "BEAST security monitoring is active."
    }
  ]
};


/* =========================================================
   ELEMENT HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function money(amount) {
  return `KES ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function show(id) {
  $(id)?.classList.remove("hidden");
}

function hide(id) {
  $(id)?.classList.add("hidden");
}

function toast(message) {
  const box = $("toast");

  if (!box) return;

  box.textContent = message;
  box.classList.remove("hidden");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
}


/* =========================================================
   RENDER BALANCE
   ========================================================= */

function renderBalance() {
  $("mainBalance").textContent =
    state.balance.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
}


/* =========================================================
   PHONE NUMBER HANDLING
   Kenya:
   07XXXXXXXX
   01XXXXXXXX
   +2547XXXXXXXX
   +2541XXXXXXXX
   ========================================================= */

function normalizeKenyanPhone(value) {

  let phone = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (phone.startsWith("07") || phone.startsWith("01")) {
    return "+254" + phone.substring(1);
  }

  if (phone.startsWith("2547") || phone.startsWith("2541")) {
    return "+" + phone;
  }

  if (phone.startsWith("+2547") || phone.startsWith("+2541")) {
    return phone;
  }

  return null;
}


function isValidKenyanPhone(phone) {
  return /^\+254[71]\d{8}$/.test(phone);
}


/* =========================================================
   DEMO RECIPIENT DATABASE
   ========================================================= */

const demoRecipients = {
  "+254712345678": "KRISH MUTILE",
  "+254701234567": "BEAST TEST USER",
  "+254711111111": "JAMES OTIENO",
  "+254722222222": "MARY WANJIKU",
  "+254733333333": "BRIAN KAMAU",
  "+254755555555": "FAITH NJERI",
  "+254799999999": "TEST MERCHANT"
};


/* =========================================================
   VERIFY RECIPIENT
   ========================================================= */

function verifyRecipient() {

  const input = $("recipientNumber").value;
  const phone = normalizeKenyanPhone(input);

  if (!phone || !isValidKenyanPhone(phone)) {

    hide("recipientResult");

    toast(
      "Enter a valid Kenyan number: 07XXXXXXXX, 01XXXXXXXX or +254XXXXXXXXX"
    );

    return;
  }

  const name =
    demoRecipients[phone] || "BEAST VERIFIED USER";

  state.verifiedRecipient = {
    phone,
    name
  };

  $("recipientName").textContent = name;
  $("recipientDisplayNumber").textContent = phone;

  show("recipientResult");

  toast(`Recipient verified: ${name}`);
}


/* =========================================================
   FEE ENGINE
   Prototype design fees
   ========================================================= */

function calculateFee(source, amount) {

  amount = Number(amount) || 0;

  if (amount <= 0) return 0;

  switch (source) {

    case "beast":
      return 0;

    case "mpesa":
      return 5;

    case "airtel":
      return 5;

    case "tkash":
      return 10;

    case "bank":
      return 15;

    case "card":
      return amount * 0.015;

    default:
      return 0;
  }
}


function updateSendFee() {

  const amount = Number($("sendAmount").value) || 0;
  const source = $("sendSource").value;

  const fee = calculateFee(source, amount);
  const total = amount + fee;

  $("sendFee").textContent = money(fee);
  $("sendTotal").textContent = money(total);
}


/* =========================================================
   AUTHORIZATION MODAL
   ========================================================= */

function openAuthorization() {

  if (!state.verifiedRecipient) {
    toast("Verify the recipient first.");
    return;
  }

  const amount = Number($("sendAmount").value) || 0;

  if (amount <= 0) {
    toast("Enter a valid amount.");
    return;
  }

  const source = $("sendSource").value;
  const fee = calculateFee(source, amount);

  if (source === "beast" && amount + fee > state.balance) {
    toast("Insufficient BEAST Wallet balance.");
    return;
  }

  $("authRecipient").textContent =
    state.verifiedRecipient.name;

  $("authAmount").textContent =
    money(amount);

  $("authFee").textContent =
    money(fee);

  $("transactionPin").value = "";

  show("authModal");
}


/* =========================================================
   AUTHORIZE SEND
   ========================================================= */

function authorizeSend() {

  const pin = $("transactionPin").value.trim();

  if (!/^\d{4,6}$/.test(pin)) {
    toast("Enter your 4–6 digit BEAST PIN.");
    return;
  }

  const amount = Number($("sendAmount").value) || 0;
  const source = $("sendSource").value;
  const fee = calculateFee(source, amount);

  if (source === "beast" && amount + fee > state.balance) {
    hide("authModal");
    toast("Insufficient BEAST Wallet balance.");
    return;
  }

  if (source === "beast") {
    state.balance -= amount + fee;
  }

  const transaction = {
    id: "BST-" + Date.now().toString().slice(-8),
    type: "Send",
    recipient: state.verifiedRecipient.name,
    phone: state.verifiedRecipient.phone,
    amount,
    fee,
    source,
    status: "Completed",
    time: new Date()
  };

  state.transactions.unshift(transaction);

  addNotification(
    "📤",
    "Money sent",
    `${money(amount)} sent to ${state.verifiedRecipient.name}.`
  );

  hide("authModal");

  $("sendAmount").value = "";
  $("recipientNumber").value = "";

  state.verifiedRecipient = null;

  hide("recipientResult");

  renderBalance();
  renderTransactions();
  renderNotifications();
  updateSendFee();

  toast("✓ Transaction completed successfully.");
}


/* =========================================================
   DEPOSIT
   ========================================================= */

function depositMoney() {

  const amount = Number($("depositAmount").value) || 0;
  const source = $("depositSource").value;

  if (amount <= 0) {
    toast("Enter a valid deposit amount.");
    return;
  }

  state.balance += amount;

  state.transactions.unshift({
    id: "BST-" + Date.now().toString().slice(-8),
    type: "Deposit",
    recipient: "BEAST Wallet",
    amount,
    fee: 0,
    source,
    status: "Completed",
    time: new Date()
  });

  addNotification(
    "💰",
    "Deposit received",
    `${money(amount)} added from ${source}.`
  );

  $("depositAmount").value = "";

  renderBalance();
  renderTransactions();
  renderNotifications();

  toast(`✓ ${money(amount)} deposited.`);
}


/* =========================================================
   WITHDRAW
   ========================================================= */

function withdrawMoney() {

  const amount = Number($("withdrawAmount").value) || 0;
  const method = $("withdrawMethod").value;

  if (amount <= 0) {
    toast("Enter a valid withdrawal amount.");
    return;
  }

  const fee = amount >= 10000 ? 30 : 20;
  const total = amount + fee;

  if (total > state.balance) {
    toast("Insufficient BEAST Wallet balance.");
    return;
  }

  state.balance -= total;

  state.transactions.unshift({
    id: "BST-" + Date.now().toString().slice(-8),
    type: "Withdrawal",
    recipient: method,
    amount,
    fee,
    source: "BEAST Wallet",
    status: "Completed",
    time: new Date()
  });

  addNotification(
    "🏧",
    "Withdrawal completed",
    `${money(amount)} withdrawn via ${method}.`
  );

  $("withdrawAmount").value = "";

  renderBalance();
  renderTransactions();
  renderNotifications();

  toast(`✓ ${money(amount)} withdrawn.`);
}


/* =========================================================
   TRANSACTION HISTORY
   ========================================================= */

function renderTransactions() {

  const list = $("transactionList");

  if (!list) return;

  if (state.transactions.length === 0) {

    list.innerHTML = `
      <div class="empty-state">
        <span>📭</span>
        <strong>No transactions yet</strong>
        <small>Your BEAST activity will appear here.</small>
      </div>
    `;

    return;
  }

  list.innerHTML = state.transactions
    .slice(0, 20)
    .map(tx => {

      const outgoing =
        tx.type === "Send" ||
        tx.type === "Withdrawal";

      const sign = outgoing ? "-" : "+";

      const date = tx.time instanceof Date
        ? tx.time
        : new Date(tx.time);

      return `
        <div class="transaction-item">

          <div class="transaction-info">

            <strong>
              ${tx.type}
              ${tx.recipient ? " • " + tx.recipient : ""}
            </strong>

            <small>
              ${tx.id}
              • ${date.toLocaleString("en-KE")}
            </small>

            <small>
              Source: ${tx.source || "BEAST"}
              • Fee: ${money(tx.fee || 0)}
              • ${tx.status}
            </small>

          </div>

          <div class="transaction-amount ${outgoing ? "out" : "in"}">
            ${sign}${money(tx.amount)}
          </div>

        </div>
      `;

    })
    .join("");
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function addNotification(icon, title, text) {

  state.notifications.unshift({
    icon,
    title,
    text
  });

  state.notifications =
    state.notifications.slice(0, 20);
}


function renderNotifications() {

  const list = $("notificationList");

  if (!list) return;

  list.innerHTML = state.notifications
    .map(notification => `
      <div class="notification-item">

        <span>${notification.icon}</span>

        <div>
          <strong>${notification.title}</strong>
          <small>${notification.text}</small>
        </div>

      </div>
    `)
    .join("");
}


/* =========================================================
   NAVIGATION / SCROLL
   ========================================================= */

function scrollToSection(id) {

  const element = $(id);

  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


document.querySelectorAll("[data-target]")
  .forEach(button => {

    button.addEventListener("click", () => {

      const target = button.dataset.target;

      scrollToSection(target);
    });

  });


/* =========================================================
   M-PESA LIPA NA
   ========================================================= */

document.querySelectorAll(
  '[data-action="mpesa-lipa"]'
).forEach(button => {

  button.addEventListener("click", () => {

    const panel = $("mpesaLipaPanel");

    if (!panel) return;

    panel.classList.toggle("hidden");
  });

});


/* =========================================================
   LIPA NA OPTIONS
   ========================================================= */

document.querySelectorAll(".option-btn")
  .forEach(button => {

    button.addEventListener("click", () => {

      const type = button.textContent.trim();

      toast(`${type} selected.`);

      scrollToSection("paySection");
    });

  });


/* =========================================================
   VERIFY RECIPIENT BUTTON
   ========================================================= */

$("verifyRecipientBtn")
  ?.addEventListener("click", verifyRecipient);


/* =========================================================
   PHONE INPUT
   ========================================================= */

$("recipientNumber")
  ?.addEventListener("input", () => {

    state.verifiedRecipient = null;

    hide("recipientResult");

  });


/* =========================================================
   SEND FEE
   ========================================================= */

$("sendAmount")
  ?.addEventListener("input", updateSendFee);

$("sendSource")
  ?.addEventListener("change", updateSendFee);


/* =========================================================
   SEND BUTTON
   ========================================================= */

$("sendMoneyBtn")
  ?.addEventListener("click", openAuthorization);


/* =========================================================
   AUTHORIZATION
   ========================================================= */

$("authorizeBtn")
  ?.addEventListener("click", authorizeSend);

$("closeAuthModal")
  ?.addEventListener("click", () => {
    hide("authModal");
  });


$("authModal")
  ?.addEventListener("click", (event) => {

    if (event.target.id === "authModal") {
      hide("authModal");
    }

  });


/* =========================================================
   DEPOSIT
   ========================================================= */

$("depositBtn")
  ?.addEventListener("click", depositMoney);


/* =========================================================
   WITHDRAW
   ========================================================= */

$("withdrawBtn")
  ?.addEventListener("click", withdrawMoney);


/* =========================================================
   COPY RECEIVE NUMBER
   ========================================================= */

$("copyReceiveBtn")
  ?.addEventListener("click", async () => {

    try {

      await navigator.clipboard.writeText(
        state.phone
      );

      toast("✓ BEAST phone number copied.");

    } catch {

      toast(state.phone);

    }

  });


/* =========================================================
   HEADER BUTTONS
   ========================================================= */

$("notificationBtn")
  ?.addEventListener("click", () => {

    scrollToSection("notificationsSection");

  });


$("securityBtn")
  ?.addEventListener("click", () => {

    scrollToSection("securitySection");

  });


/* =========================================================
   SECURITY BUTTONS
   ========================================================= */

document.querySelectorAll(
  ".security-list button"
).forEach(button => {

  button.addEventListener("click", () => {

    const action = button.textContent.trim();

    if (action.includes("Freeze")) {

      const confirmed =
        confirm(
          "Freeze BEAST account in this prototype?"
        );

      if (confirmed) {

        addNotification(
          "❄️",
          "Account freeze requested",
          "Account protection mode has been activated in the prototype."
        );

        renderNotifications();

        toast("Account protection mode activated.");

      }

      return;
    }

    toast(`${action} selected.`);

  });

});


/* =========================================================
   SETTINGS
   ========================================================= */

document.querySelectorAll(
  ".settings-row"
).forEach(button => {

  button.addEventListener("click", () => {

    toast(
      `${button.textContent.trim()} selected.`
    );

  });

});


/* =========================================================
   BUSINESS / AGENT / BANK / CARD ACTIONS
   ========================================================= */

document.querySelectorAll(
  ".large-option, .bank-services button, .wallet-actions button, .card-types span"
).forEach(element => {

  element.addEventListener("click", () => {

    if (
      element.tagName === "SPAN"
    ) {
      toast(`${element.textContent.trim()} selected.`);
      return;
    }

    const text =
      element.childNodes[0]?.textContent?.trim() ||
      element.textContent.trim();

    toast(`${text} selected.`);

  });

});


/* =========================================================
   M-PESA / AIRTEL / T-KASH ACTIONS
   ========================================================= */

document.querySelectorAll(
  ".provider-actions button"
).forEach(button => {

  button.addEventListener("click", () => {

    const action =
      button.textContent.trim();

    if (action === "Lipa Na") return;

    toast(`${action} selected.`);

  });

});


/* =========================================================
   CLEAR NOTIFICATIONS
   ========================================================= */

document.querySelectorAll(
  ".section-title .small-btn"
).forEach(button => {

  if (button.textContent.trim() === "CLEAR") {

    button.addEventListener("click", () => {

      state.notifications = [];

      renderNotifications();

      toast("Notifications cleared.");

    });

  }

});


/* =========================================================
   HOME BUTTON
   ========================================================= */

document.querySelector(".nav-home")
  ?.addEventListener("click", () => {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  });


/* =========================================================
   DEMO DATA
   ========================================================= */

function addDemoTransactions() {

  state.transactions = [

    {
      id: "BST-10000001",
      type: "Deposit",
      recipient: "BEAST Wallet",
      amount: 10000,
      fee: 0,
      source: "BEAST Demo",
      status: "Completed",
      time: new Date(Date.now() - 3600000)
    }

  ];
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeBeast() {

  $("beastId").textContent =
    state.beastId;

  $("accountPhone").textContent =
    state.phone;

  $("receivePhone").textContent =
    state.phone;

  renderBalance();

  renderTransactions();

  renderNotifications();

  updateSendFee();

  console.log(
    "MONEY TRANSFER BEAST 🇰🇪 initialized."
  );

}


/* =========================================================
   START
   ========================================================= */

initializeBeast();