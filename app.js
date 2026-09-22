/* =========================================================
   MONEY TRANSFER BEAST
   app.js
   DEMO ONLY — NO REAL MONEY MOVEMENT
   ========================================================= */

const DEMO_PIN = "1234";
const DEMO_PASSWORD = "beast123";

const STORAGE_KEY = "money_transfer_beast_demo_v4";

const defaultState = {
  balance: 5000,
  history: [],
  darkMode: false,
  receiveLoggedIn: false
};

let state = loadState();
let pendingTransaction = null;
let cameraStream = null;


/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return {
        ...defaultState,
        ...JSON.parse(saved)
      };
    }
  } catch (error) {
    console.warn("Could not load saved demo data.");
  }

  return { ...defaultState };
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function money(amount) {
  return `KSh ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function nowDate() {
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

function transactionId() {
  return (
    "BEAST-" +
    Date.now().toString().slice(-8)
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validPhone(value) {
  return /^(?:07|01)\d{8}$/.test(
    String(value).replace(/\s+/g, "")
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

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


/* =========================================================
   BALANCE
   ========================================================= */

function updateBalance() {
  $("balance").textContent = money(state.balance);
  $("historyBalance").textContent = money(state.balance);
  $("historyCount").textContent = state.history.length;
}


/* =========================================================
   PANEL NAVIGATION
   ========================================================= */

document.querySelectorAll(".quick-btn").forEach(button => {

  button.addEventListener("click", () => {

    const panelId = button.dataset.panel;

    document.querySelectorAll(".panel").forEach(panel => {
      panel.classList.add("hidden");
    });

    const panel = $(panelId);

    if (panel) {
      panel.classList.remove("hidden");

      window.scrollTo({
        top: panel.offsetTop - 80,
        behavior: "smooth"
      });
    }

  });

});


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

  document.body.classList.toggle(
    "dark",
    state.darkMode
  );

  $("themeBtn").textContent =
    state.darkMode ? "🌙" : "☀️";
}

$("themeBtn").addEventListener("click", () => {

  state.darkMode = !state.darkMode;

  saveState();
  applyTheme();

});


/* =========================================================
   COPY BEAST ID
   ========================================================= */

$("copyBeastBtn").addEventListener("click", async () => {

  const id = $("beastId").textContent;

  try {

    await navigator.clipboard.writeText(id);

    showToast("BEAST ID copied.");

  } catch {

    showToast("BEAST ID: " + id);

  }

});


/* =========================================================
   SEND MONEY
   ========================================================= */

let sendVerified = false;

$("verifySendBtn").addEventListener("click", () => {

  const phone = $("sendPhone").value.trim();

  if (!validPhone(phone)) {
    sendVerified = false;

    $("sendRecipientBox").classList.add("hidden");
    $("sendBtn").disabled = true;

    showToast("Enter a valid Kenyan phone number.");
    return;
  }

  sendVerified = true;

  $("sendRecipientName").textContent =
    "JANE WANJIKU KAMAU";

  $("sendRecipientId").textContent =
    "BEAST-20481 • VERIFIED";

  $("sendRecipientBox").classList.remove("hidden");

  checkSendReady();

  showToast("Recipient verified.");
});

function checkSendReady() {

  const amount = Number($("sendAmount").value);

  $("sendBtn").disabled = !(
    sendVerified &&
    amount > 0 &&
    amount <= state.balance
  );
}

$("sendAmount").addEventListener(
  "input",
  checkSendReady
);

$("sendBtn").addEventListener("click", () => {

  const amount = Number($("sendAmount").value);

  if (!sendVerified) {
    showToast("Verify the recipient first.");
    return;
  }

  if (!validAmount(amount)) {
    showToast("Insufficient demo balance or invalid amount.");
    return;
  }

  const source = $("sendSource").value;

  openAuthorization({
    type: "SEND MONEY",
    title: "Send Money",
    recipient: "JANE WANJIKU KAMAU",
    destination: $("sendPhone").value.trim(),
    amount,
    source,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   LIPA NA BEAST MODE TABS
   ========================================================= */

document.querySelectorAll(".mode-tab").forEach(tab => {

  tab.addEventListener("click", () => {

    const mode = tab.dataset.lipaMode;

    document.querySelectorAll(".mode-tab")
      .forEach(item => item.classList.remove("active"));

    tab.classList.add("active");

    document.querySelectorAll(".lipa-mode")
      .forEach(item => item.classList.add("hidden"));

    $(mode + "Mode").classList.remove("hidden");

  });

});


/* =========================================================
   POCHI
   ========================================================= */

let pochiVerified = false;

$("verifyPochiBtn").addEventListener("click", () => {

  const phone = $("pochiPhone").value.trim();

  if (!validPhone(phone)) {

    pochiVerified = false;

    $("pochiVerifyBox").classList.add("hidden");
    $("pochiBtn").disabled = true;

    showToast("Enter a valid Pochi phone number.");
    return;
  }

  pochiVerified = true;

  $("pochiName").textContent =
    "BEAST BUSINESS • MAMA SHOP";

  $("pochiId").textContent =
    phone + " • VERIFIED";

  $("pochiVerifyBox").classList.remove("hidden");

  checkPochiReady();

  showToast("Pochi business verified.");
});

function checkPochiReady() {

  const amount = Number($("pochiAmount").value);
  const pin = $("pochiPin").value;

  $("pochiBtn").disabled = !(
    pochiVerified &&
    amount > 0 &&
    amount <= state.balance &&
    pin.length === 4
  );
}

$("pochiAmount").addEventListener(
  "input",
  checkPochiReady
);

$("pochiPin").addEventListener(
  "input",
  checkPochiReady
);

$("pochiBtn").addEventListener("click", () => {

  const amount = Number($("pochiAmount").value);

  if (!validAmount(amount)) {
    showToast("Invalid amount or insufficient balance.");
    return;
  }

  openAuthorization({
    type: "POCHI PAYMENT",
    title: "Pochi la Biashara",
    recipient: "BEAST BUSINESS • MAMA SHOP",
    destination: $("pochiPhone").value.trim(),
    amount,
    source: $("pochiSource").value,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   TILL
   ========================================================= */

let tillVerified = false;

$("verifyTillBtn").addEventListener("click", () => {

  const till = $("tillNumber").value.trim();

  if (!/^\d{5,10}$/.test(till)) {

    tillVerified = false;

    $("tillVerifyBox").classList.add("hidden");
    $("tillBtn").disabled = true;

    showToast("Enter a valid Till number.");
    return;
  }

  tillVerified = true;

  $("tillName").textContent =
    "BEAST SUPERMARKET LTD";

  $("tillId").textContent =
    "Till " + till + " • VERIFIED";

  $("tillVerifyBox").classList.remove("hidden");

  checkTillReady();

  showToast("Till verified.");
});

function checkTillReady() {

  const amount = Number($("tillAmount").value);
  const pin = $("tillPin").value;

  $("tillBtn").disabled = !(
    tillVerified &&
    amount > 0 &&
    amount <= state.balance &&
    pin.length === 4
  );
}

$("tillAmount").addEventListener(
  "input",
  checkTillReady
);

$("tillPin").addEventListener(
  "input",
  checkTillReady
);

$("tillBtn").addEventListener("click", () => {

  const amount = Number($("tillAmount").value);

  if (!validAmount(amount)) {
    showToast("Invalid amount or insufficient balance.");
    return;
  }

  openAuthorization({
    type: "TILL PAYMENT",
    title: "Till Payment",
    recipient: "BEAST SUPERMARKET LTD",
    destination: "Till " + $("tillNumber").value.trim(),
    amount,
    source: $("tillSource").value,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   PAYBILL
   ========================================================= */

let paybillVerified = false;

$("verifyPaybillBtn").addEventListener("click", () => {

  const business = $("paybillBusiness").value.trim();
  const account = $("paybillAccount").value.trim();

  if (
    !/^\d{5,10}$/.test(business) ||
    account.length < 3
  ) {

    paybillVerified = false;

    $("paybillVerifyBox").classList.add("hidden");
    $("paybillBtn").disabled = true;

    showToast("Enter a valid Business and Account number.");
    return;
  }

  paybillVerified = true;

  $("paybillName").textContent =
    "KENYA POWER DEMO";

  $("paybillId").textContent =
    "Business " + business +
    " • Account " + account;

  $("paybillVerifyBox").classList.remove("hidden");

  checkPaybillReady();

  showToast("PayBill verified.");
});

function checkPaybillReady() {

  const amount = Number($("paybillAmount").value);
  const pin = $("paybillPin").value;

  $("paybillBtn").disabled = !(
    paybillVerified &&
    amount > 0 &&
    amount <= state.balance &&
    pin.length === 4
  );
}

$("paybillAmount").addEventListener(
  "input",
  checkPaybillReady
);

$("paybillPin").addEventListener(
  "input",
  checkPaybillReady
);

$("paybillBtn").addEventListener("click", () => {

  const amount = Number($("paybillAmount").value);

  if (!validAmount(amount)) {
    showToast("Invalid amount or insufficient balance.");
    return;
  }

  openAuthorization({
    type: "PAYBILL",
    title: "PayBill",
    recipient: "KENYA POWER DEMO",
    destination:
      "Business " +
      $("paybillBusiness").value.trim() +
      " • Account " +
      $("paybillAccount").value.trim(),
    amount,
    source: $("paybillSource").value,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   BILLS
   ========================================================= */

let billVerified = false;

$("verifyBillBtn").addEventListener("click", () => {

  const account = $("billAccount").value.trim();
  const type = $("billType").value;

  if (!type || account.length < 5) {

    billVerified = false;

    $("billVerifyBox").classList.add("hidden");
    $("billBtn").disabled = true;

    showToast("Select a bill and enter the account number.");
    return;
  }

  billVerified = true;

  $("billName").textContent =
    type + " DEMO ACCOUNT";

  $("billId").textContent =
    account + " • VERIFIED";

  $("billVerifyBox").classList.remove("hidden");

  checkBillReady();

  showToast("Bill account verified.");
});

function checkBillReady() {

  const amount = Number($("billAmount").value);

  $("billBtn").disabled = !(
    billVerified &&
    amount > 0 &&
    amount <= state.balance
  );
}

$("billAmount").addEventListener(
  "input",
  checkBillReady
);

$("billBtn").addEventListener("click", () => {

  const amount = Number($("billAmount").value);

  if (!validAmount(amount)) {
    showToast("Invalid amount or insufficient balance.");
    return;
  }

  openAuthorization({
    type: "BILL PAYMENT",
    title: $("billType").value,
    recipient: $("billType").value + " DEMO ACCOUNT",
    destination: $("billAccount").value.trim(),
    amount,
    source: $("billSource").value,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   RECEIVE LOGIN
   ========================================================= */

$("receiveLoginBtn").addEventListener("click", () => {

  const code = $("receiveLoginCode").value.trim();
  const password = $("receivePassword").value;

  if (!code || !password) {
    showToast("Enter your login code and password.");
    return;
  }

  /*
    DEMO LOGIN
    Code can be BEAST-20481 or a phone number.
  */

  const validCode =
    code.toUpperCase() === "BEAST-20481" ||
    validPhone(code);

  if (!validCode || password !== DEMO_PASSWORD) {

    showToast(
      "Demo login failed. Use BEAST-20481 / beast123."
    );

    return;
  }

  state.receiveLoggedIn = true;
  saveState();

  $("receiveLogin").classList.add("hidden");
  $("receiveTransfer").classList.remove("hidden");

  $("receiveUserLabel").textContent =
    "BEAST-20481 • SECURE SESSION";

  showToast("Secure login successful.");

});


/* =========================================================
   RECEIVE RECIPIENT
   ========================================================= */

let receiveVerified = false;

$("verifyReceiveBtn").addEventListener("click", () => {

  const recipient =
    $("receiveRecipient").value.trim();

  if (
    !validPhone(recipient) &&
    !/^BEAST-\d{3,}$/i.test(recipient)
  ) {

    receiveVerified = false;

    $("receiveVerifyBox").classList.add("hidden");
    $("receiveTransferBtn").disabled = true;

    showToast("Enter a valid phone number or BEAST ID.");
    return;
  }

  receiveVerified = true;

  $("receiveRecipientName").textContent =
    "JOHN KAMAU MWANGI";

  $("receiveRecipientId").textContent =
    recipient + " • VERIFIED";

  $("receiveVerifyBox").classList.remove("hidden");

  checkReceiveReady();

  showToast("Recipient verified.");
});

function checkReceiveReady() {

  const amount = Number(
    $("receiveAmount").value
  );

  $("receiveTransferBtn").disabled = !(
    receiveVerified &&
    amount > 0 &&
    amount <= state.balance
  );
}

$("receiveAmount").addEventListener(
  "input",
  checkReceiveReady
);

$("receiveTransferBtn").addEventListener(
  "click",
  () => {

    const amount =
      Number($("receiveAmount").value);

    if (!validAmount(amount)) {
      showToast("Invalid amount or insufficient balance.");
      return;
    }

    openAuthorization({
      type: "RECEIVE TRANSFER",
      title: "Secure Transfer",
      recipient: "JOHN KAMAU MWANGI",
      destination:
        $("receiveRecipient").value.trim(),
      amount,
      source:
        $("receiveSource").value,
      fee: calculateFee(amount)
    });

  }
);


/* =========================================================
   WITHDRAW
   ========================================================= */

let agentVerified = false;

$("verifyAgentBtn").addEventListener("click", () => {

  const phone =
    $("withdrawPhone").value.trim();

  if (!validPhone(phone)) {

    agentVerified = false;

    $("agentVerifyBox").classList.add("hidden");
    $("withdrawBtn").disabled = true;

    showToast("Enter a valid agent phone number.");
    return;
  }

  agentVerified = true;

  $("agentName").textContent =
    "BEAST AGENT • PETER KAMAU";

  $("agentId").textContent =
    phone + " • VERIFIED AGENT";

  $("agentVerifyBox").classList.remove("hidden");

  checkWithdrawReady();

  showToast("Agent verified.");
});

function checkWithdrawReady() {

  const amount =
    Number($("withdrawAmount").value);

  $("withdrawBtn").disabled = !(
    agentVerified &&
    amount > 0 &&
    amount <= state.balance
  );
}

$("withdrawAmount").addEventListener(
  "input",
  checkWithdrawReady
);

$("withdrawBtn").addEventListener("click", () => {

  const amount =
    Number($("withdrawAmount").value);

  if (!validAmount(amount)) {
    showToast("Invalid amount or insufficient balance.");
    return;
  }

  openAuthorization({
    type: "WITHDRAW",
    title: "Agent Withdrawal",
    recipient: "BEAST AGENT • PETER KAMAU",
    destination:
      $("withdrawPhone").value.trim(),
    amount,
    source:
      $("withdrawSource").value,
    fee: calculateFee(amount)
  });

});


/* =========================================================
   FEES
   ========================================================= */

function calculateFee(amount) {

  /*
    DEMO FEE MODEL
    Under KSh 1,000 = KSh 7
    KSh 1,000 - KSh 10,000 = KSh 30
  */

  if (amount < 1000) {
    return 7;
  }

  if (amount <= 10000) {
    return 30;
  }

  return 50;
}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function openAuthorization(transaction) {

  pendingTransaction = transaction;

  const total =
    transaction.amount + transaction.fee;

  $("authDetails").innerHTML = `

    <div class="auth-row">
      <span>Transaction</span>
      <strong>${escapeHTML(transaction.type)}</strong>
    </div>

    <div class="auth-row">
      <span>Recipient</span>
      <strong>${escapeHTML(transaction.recipient)}</strong>
    </div>

    <div class="auth-row">
      <span>Destination</span>
      <strong>${escapeHTML(transaction.destination)}</strong>
    </div>

    <div class="auth-row">
      <span>Amount</span>
      <strong>${money(transaction.amount)}</strong>
    </div>

    <div class="auth-row">
      <span>Fee</span>
      <strong>${money(transaction.fee)}</strong>
    </div>

    <div class="auth-row">
      <span>Total</span>
      <strong>${money(total)}</strong>
    </div>

    <div class="auth-row">
      <span>Pay From</span>
      <strong>${escapeHTML(transaction.source)}</strong>
    </div>

  `;

  $("authPin").value = "";

  $("authModal").classList.remove("hidden");

}


/* =========================================================
   CLOSE AUTH MODAL
   ========================================================= */

$("closeModalBtn").addEventListener("click", () => {

  $("authModal").classList.add("hidden");

  pendingTransaction = null;

});


/* =========================================================
   COMPLETE AUTHORIZATION
   ========================================================= */

$("confirmAuthBtn").addEventListener("click", () => {

  if (!pendingTransaction) {
    showToast("No transaction waiting for authorization.");
    return;
  }

  const pin = $("authPin").value;

  if (pin !== DEMO_PIN) {

    showToast(
      "Authorization failed. Demo PIN is 1234."
    );

    return;
  }

  completeTransaction(pendingTransaction);

});


/* =========================================================
   COMPLETE TRANSACTION
   ========================================================= */

function completeTransaction(transaction) {

  const total =
    transaction.amount + transaction.fee;

  if (total > state.balance) {

    showToast(
      "Insufficient demo balance including fee."
    );

    return;
  }

  state.balance -= total;

  const timestamp = nowDate();

  const record = {
    id: transactionId(),

    type: transaction.type,

    title: transaction.title,

    recipient: transaction.recipient,

    destination: transaction.destination,

    amount: transaction.amount,

    fee: transaction.fee,

    total,

    source: transaction.source,

    date: timestamp.date,

    time: timestamp.time,

    balanceAfter: state.balance,

    status: "Successful"
  };

  state.history.unshift(record);

  saveState();

  updateBalance();

  renderHistory();

  $("authModal").classList.add("hidden");

  pendingTransaction = null;

  showReceipt(record);

}


/* =========================================================
   RECEIPT
   ========================================================= */

function showReceipt(record) {

  $("receiptDetails").innerHTML = `

    <div class="receipt-row">
      <span>Status</span>
      <strong>✓ Successful</strong>
    </div>

    <div class="receipt-row">
      <span>Transaction ID</span>
      <strong>${escapeHTML(record.id)}</strong>
    </div>

    <div class="receipt-row">
      <span>Type</span>
      <strong>${escapeHTML(record.type)}</strong>
    </div>

    <div class="receipt-row">
      <span>Recipient</span>
      <strong>${escapeHTML(record.recipient)}</strong>
    </div>

    <div class="receipt-row">
      <span>Destination</span>
      <strong>${escapeHTML(record.destination)}</strong>
    </div>

    <div class="receipt-row">
      <span>Amount</span>
      <strong>${money(record.amount)}</strong>
    </div>

    <div class="receipt-row">
      <span>Fee</span>
      <strong>${money(record.fee)}</strong>
    </div>

    <div class="receipt-row">
      <span>Total</span>
      <strong>${money(record.total)}</strong>
    </div>

    <div class="receipt-row">
      <span>Payment Source</span>
      <strong>${escapeHTML(record.source)}</strong>
    </div>

    <div class="receipt-row">
      <span>Date</span>
      <strong>${escapeHTML(record.date)}</strong>
    </div>

    <div class="receipt-row">
      <span>Time</span>
      <strong>${escapeHTML(record.time)}</strong>
    </div>

    <div class="receipt-row">
      <span>Balance After</span>
      <strong>${money(record.balanceAfter)}</strong>
    </div>

  `;

  $("receiptModal").classList.remove("hidden");

}


/* =========================================================
   RECEIPT CLOSE
   ========================================================= */

function closeReceipt() {
  $("receiptModal").classList.add("hidden");
}

$("closeReceiptBtn").addEventListener(
  "click",
  closeReceipt
);

$("receiptDoneBtn").addEventListener(
  "click",
  closeReceipt
);


/* =========================================================
   HISTORY
   ========================================================= */

function historyIcon(type) {

  if (type.includes("SEND")) return "💸";
  if (type.includes("POCHI")) return "📱";
  if (type.includes("TILL")) return "🏪";
  if (type.includes("PAYBILL")) return "🧾";
  if (type.includes("BILL")) return "📄";
  if (type.includes("WITHDRAW")) return "🏧";
  if (type.includes("RECEIVE")) return "📥";

  return "💰";
}

function renderHistory() {

  const list = $("historyList");
  const empty = $("emptyHistory");

  $("historyCount").textContent =
    state.history.length;

  $("historyBalance").textContent =
    money(state.balance);

  if (!state.history.length) {

    list.innerHTML = "";
    empty.classList.remove("hidden");

    return;
  }

  empty.classList.add("hidden");

  list.innerHTML =
    state.history.map((item, index) => {

      const sign = "-";

      return `

        <div
          class="history-item"
          data-history-index="${index}"
        >

          <div class="history-icon">
            ${historyIcon(item.type)}
          </div>

          <div class="history-main">

            <strong>
              ${escapeHTML(item.recipient)}
            </strong>

            <small>
              ${escapeHTML(item.type)}
              • ${escapeHTML(item.date)}
              • ${escapeHTML(item.time)}
            </small>

            <small>
              ${escapeHTML(item.destination)}
              • ${escapeHTML(item.source)}
            </small>

          </div>

          <div class="history-amount">

            <strong>
              ${sign}${money(item.total)}
            </strong>

            <small>
              ✓ ${escapeHTML(item.status)}
            </small>

          </div>

        </div>

      `;

    }).join("");

  document
    .querySelectorAll(".history-item")
    .forEach(item => {

      item.addEventListener("click", () => {

        const index =
          Number(item.dataset.historyIndex);

        const transaction =
          state.history[index];

        if (transaction) {
          showReceipt(transaction);
        }

      });

    });

}


/* =========================================================
   CAMERA CHECK
   ========================================================= */

$("cameraBtn").addEventListener("click", async () => {

  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {

    showToast(
      "Camera access is not supported by this browser."
    );

    return;
  }

  try {

    cameraStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user"
        },
        audio: false
      });

    const video =
      $("cameraPreview");

    video.srcObject = cameraStream;
    video.style.display = "block";

    $("cameraPlaceholder").style.display =
      "none";

    $("cameraBtn").textContent =
      "✓ CAMERA CHECK ACTIVE";

    showToast(
      "Front camera environment check active."
    );

  } catch (error) {

    showToast(
      "Camera permission was not granted."
    );

  }

});


/* =========================================================
   INITIALIZE
   ========================================================= */

applyTheme();
updateBalance();
renderHistory();


/* =========================================================
   RESTORE RECEIVE SESSION
   ========================================================= */

if (state.receiveLoggedIn) {

  $("receiveLogin").classList.add("hidden");

  $("receiveTransfer").classList.remove("hidden");

  $("receiveUserLabel").textContent =
    "BEAST-20481 • SECURE SESSION";

}


/* =========================================================
   PREVENT REAL PIN LOOK-ALIKE USE
   ========================================================= */

document.querySelectorAll(
  "#pochiPin, #tillPin, #paybillPin"
).forEach(input => {

  input.addEventListener("input", () => {

    if (input.value.length === 4) {

      showToast(
        "Demo PIN entered. Never use your real M-PESA PIN here."
      );

    }

  });

});


/* =========================================================
   DEBUG / DEMO RESET
   =========================================================

   To reset the demo manually from browser console:

   localStorage.removeItem("money_transfer_beast_demo_v4");
   location.reload();

   ========================================================= */