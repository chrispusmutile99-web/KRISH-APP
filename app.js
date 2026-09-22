/* =========================================================
   MONEY TRANSFER BEAST
   APP.JS
   DEMO / PROTOTYPE ONLY
   ========================================================= */

const DEMO_PIN = "1234";

const STORAGE_KEY = "money_transfer_beast_demo";

const defaultState = {
  balance: 5000,
  history: [],
  darkMode: false
};

let state = loadState();

let currentPanel = "send";

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
    console.log("Storage error:", error);
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
   ELEMENT HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  applyTheme();

  updateBalance();

  renderHistory();

  setupPanelButtons();

  setupSend();

  setupLipa();

  setupBills();

  setupWithdraw();

  setupIdentityButtons();

  setupAuthorization();

  setupCamera();

});


/* =========================================================
   BALANCE
   ========================================================= */

function updateBalance() {

  $("balance").textContent =
    formatMoney(state.balance);

}


function formatMoney(amount) {

  return (
    "KSh " +
    Number(amount).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );

}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

  document.body.classList.toggle(
    "dark",
    state.darkMode
  );

  $("themeBtn").textContent =
    state.darkMode ? "☀️" : "🌙";

}


$("themeBtn").addEventListener(
  "click",
  () => {

    state.darkMode = !state.darkMode;

    saveState();

    applyTheme();

  }
);


/* =========================================================
   PANEL SWITCHING
   ========================================================= */

function setupPanelButtons() {

  document
    .querySelectorAll(".quick-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const panel =
            button.dataset.panel;

          showPanel(panel);

        }
      );

    });

}


function showPanel(panelName) {

  currentPanel = panelName;

  document
    .querySelectorAll(".panel")
    .forEach(panel => {

      panel.classList.remove("active");

    });


  const target =
    $(panelName + "Panel");

  if (target) {
    target.classList.add("active");
  }


  const titles = {

    send: "Send Money",

    lipa: "Lipa na BEAST",

    bills: "Pay Bills",

    receive: "Receive Money",

    withdraw: "Withdraw Cash",

    history: "Transaction History"

  };


  $("panelTitle").textContent =
    titles[panelName] || "Transaction";


  document
    .querySelector(".transaction-card")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}


/* =========================================================
   SEND MONEY
   ========================================================= */

function setupSend() {

  $("verifyRecipient").addEventListener(
    "click",
    verifyRecipient
  );


  $("sendPhone").addEventListener(
    "input",
    () => {

      resetVerification(
        "recipientResult",
        "sendBtn"
      );

    }
  );


  $("sendAmount").addEventListener(
    "input",
    updateSendButton
  );

}


function verifyRecipient() {

  const phone =
    $("sendPhone").value.trim();


  if (!isValidPhone(phone)) {

    showToast(
      "Enter a valid phone number."
    );

    return;

  }


  /*
    DEMO DIRECTORY ONLY.

    In a real BEAST system this name
    must come from a secure backend/provider.
  */

  $("recipientName").textContent =
    "JANE WANJIKU KAMAU";


  $("recipientBeastId").textContent =
    "BEAST-20481";


  $("recipientResult")
    .classList.remove("hidden");


  $("sendBtn").disabled = false;

  showToast(
    "Recipient verified."
  );

}


function updateSendButton() {

  const verified =
    !$("recipientResult")
      .classList.contains("hidden");


  const amount =
    Number($("sendAmount").value);


  $("sendBtn").disabled =
    !verified ||
    !amount ||
    amount <= 0;

}


$("sendBtn").addEventListener(
  "click",
  () => {

    const amount =
      Number($("sendAmount").value);


    if (amount > state.balance) {

      showToast(
        "Insufficient demo balance."
      );

      return;

    }


    pendingTransaction = {

      type: "send",

      title: "Send Money",

      recipient:
        $("recipientName").textContent,

      amount,

      source:
        $("sendSource").value

    };


    openAuthorization();

  }
);


/* =========================================================
   LIPA NA BEAST
   ========================================================= */

function setupLipa() {

  $("verifyMerchant").addEventListener(
    "click",
    verifyMerchant
  );


  $("merchantNumber").addEventListener(
    "input",
    () => {

      resetVerification(
        "merchantResult",
        "lipaBtn"
      );

    }
  );


  $("lipaAmount").addEventListener(
    "input",
    updateLipaButton
  );

}


function verifyMerchant() {

  const number =
    $("merchantNumber").value.trim();


  if (
    number.length < 5 ||
    number.length > 8
  ) {

    showToast(
      "Enter a valid merchant number."
    );

    return;

  }


  $("merchantName").textContent =
    "BEAST STORE LTD";


  $("merchantResult")
    .classList.remove("hidden");


  $("lipaBtn").disabled = false;

  showToast(
    "Merchant verified."
  );

}


function updateLipaButton() {

  const verified =
    !$("merchantResult")
      .classList.contains("hidden");


  const amount =
    Number($("lipaAmount").value);


  $("lipaBtn").disabled =
    !verified ||
    !amount ||
    amount <= 0;

}


$("lipaBtn").addEventListener(
  "click",
  () => {

    const amount =
      Number($("lipaAmount").value);


    if (amount > state.balance) {

      showToast(
        "Insufficient demo balance."
      );

      return;

    }


    pendingTransaction = {

      type: "merchant",

      title: "Lipa na BEAST",

      recipient:
        $("merchantName").textContent,

      amount,

      source:
        $("lipaSource").value

    };


    openAuthorization();

  }
);


/* =========================================================
   BILLS
   ========================================================= */

let billVerified = false;


function setupBills() {

  $("verifyBill").addEventListener(
    "click",
    verifyBill
  );


  $("billAccount").addEventListener(
    "input",
    () => {

      billVerified = false;

      $("billResult")
        .classList.add("hidden");

      $("billBtn").disabled = true;

    }
  );


  $("billAmount").addEventListener(
    "input",
    updateBillButton
  );

}


function verifyBill() {

  const account =
    $("billAccount").value.trim();


  if (account.length < 5) {

    showToast(
      "Enter a valid account number."
    );

    return;

  }


  billVerified = true;


  $("billName").textContent =
    "DEMO BILL ACCOUNT";


  $("billResult")
    .classList.remove("hidden");


  updateBillButton();

  showToast(
    "Bill account verified."
  );

}


function updateBillButton() {

  const amount =
    Number($("billAmount").value);


  $("billBtn").disabled =
    !billVerified ||
    !amount ||
    amount <= 0;

}


$("billBtn").addEventListener(
  "click",
  () => {

    const amount =
      Number($("billAmount").value);


    if (amount > state.balance) {

      showToast(
        "Insufficient demo balance."
      );

      return;

    }


    pendingTransaction = {

      type: "bill",

      title:
        $("billType").value,

      recipient:
        $("billName").textContent,

      amount,

      source:
        $("billSource").value

    };


    openAuthorization();

  }
);


/* =========================================================
   WITHDRAW
   ========================================================= */

function setupWithdraw() {

  $("verifyAgent").addEventListener(
    "click",
    verifyAgent
  );


  $("agentNumber").addEventListener(
    "input",
    () => {

      resetVerification(
        "agentResult",
        "withdrawBtn"
      );

    }
  );


  $("withdrawAmount").addEventListener(
    "input",
    updateWithdrawButton
  );

}


function verifyAgent() {

  const phone =
    $("agentNumber").value.trim();


  if (!isValidPhone(phone)) {

    showToast(
      "Enter a valid agent number."
    );

    return;

  }


  $("agentName").textContent =
    "BEAST AGENT • PETER KAMAU";


  $("agentResult")
    .classList.remove("hidden");


  $("withdrawBtn").disabled = false;

  showToast(
    "Agent verified."
  );

}


function updateWithdrawButton() {

  const verified =
    !$("agentResult")
      .classList.contains("hidden");


  const amount =
    Number($("withdrawAmount").value);


  $("withdrawBtn").disabled =
    !verified ||
    !amount ||
    amount <= 0;

}


$("withdrawBtn").addEventListener(
  "click",
  () => {

    const amount =
      Number($("withdrawAmount").value);


    if (amount > state.balance) {

      showToast(
        "Insufficient demo balance."
      );

      return;

    }


    pendingTransaction = {

      type: "withdraw",

      title: "Cash Withdrawal",

      recipient:
        $("agentName").textContent,

      amount,

      source:
        $("withdrawSource").value

    };


    openAuthorization();

  }
);


/* =========================================================
   PHONE VALIDATION
   ========================================================= */

function isValidPhone(phone) {

  const cleaned =
    phone.replace(/\s+/g, "");


  return /^(\+254|0)7\d{8}$/.test(
    cleaned
  );

}


/* =========================================================
   RESET VERIFICATION
   ========================================================= */

function resetVerification(
  resultId,
  buttonId
) {

  $(resultId)
    .classList.add("hidden");


  $(buttonId).disabled = true;

}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function setupAuthorization() {

  $("closeModal").addEventListener(
    "click",
    closeAuthorization
  );


  $("authorizeBtn").addEventListener(
    "click",
    authorizeTransaction
  );


  $("authPin").addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        authorizeTransaction();
      }

    }
  );

}


function openAuthorization() {

  if (!pendingTransaction) {
    return;
  }


  $("authPin").value = "";


  $("authDescription").textContent =
    `${pendingTransaction.title}: ` +
    `${formatMoney(pendingTransaction.amount)} ` +
    `to ${pendingTransaction.recipient}.`;


  $("authModal")
    .classList.remove("hidden");


  setTimeout(() => {
    $("authPin").focus();
  }, 100);

}


function closeAuthorization() {

  $("authModal")
    .classList.add("hidden");


  pendingTransaction = null;

}


function authorizeTransaction() {

  const pin =
    $("authPin").value.trim();


  if (pin !== DEMO_PIN) {

    showToast(
      "Incorrect demo PIN."
    );

    return;

  }


  if (!pendingTransaction) {

    closeAuthorization();

    return;

  }


  completeTransaction(
    pendingTransaction
  );


  closeAuthorization();

}


/* =========================================================
   COMPLETE TRANSACTION
   ========================================================= */

function completeTransaction(transaction) {

  const amount =
    Number(transaction.amount);


  if (
    !amount ||
    amount <= 0 ||
    amount > state.balance
  ) {

    showToast(
      "Transaction could not be completed."
    );

    return;

  }


  state.balance -= amount;


  const record = {

    id:
      "BEAST-" +
      Date.now()
        .toString()
        .slice(-8),

    type:
      transaction.type,

    title:
      transaction.title,

    recipient:
      transaction.recipient,

    amount,

    source:
      transaction.source,

    date:
      new Date().toLocaleString(
        "en-KE"
      )

  };


  state.history.unshift(record);


  /*
    Keep prototype history manageable.
  */

  state.history =
    state.history.slice(0, 50);


  saveState();


  updateBalance();

  renderHistory();


  showToast(
    `✓ ${transaction.title} successful`
  );


  resetTransactionForms();

}


/* =========================================================
   RESET FORMS
   ========================================================= */

function resetTransactionForms() {

  $("sendPhone").value = "";

  $("sendAmount").value = "";

  $("recipientResult")
    .classList.add("hidden");

  $("sendBtn").disabled = true;


  $("merchantNumber").value = "";

  $("lipaAmount").value = "";

  $("merchantResult")
    .classList.add("hidden");

  $("lipaBtn").disabled = true;


  $("billAccount").value = "";

  $("billAmount").value = "";

  $("billResult")
    .classList.add("hidden");

  $("billBtn").disabled = true;

  billVerified = false;


  $("agentNumber").value = "";

  $("withdrawAmount").value = "";

  $("agentResult")
    .classList.add("hidden");

  $("withdrawBtn").disabled = true;

}


/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {

  const container =
    $("historyList");


  if (!state.history.length) {

    container.innerHTML = `
      <div class="empty-history">
        No transactions yet.
      </div>
    `;

    return;

  }


  container.innerHTML =
    state.history
      .map(transaction => {

        const icon =
          transaction.type === "send"
            ? "💸"
            : transaction.type === "merchant"
              ? "🛒"
              : transaction.type === "bill"
                ? "🧾"
                : "🏧";


        return `

          <div class="history-item">

            <div class="history-left">

              <div class="history-icon">
                ${icon}
              </div>

              <div class="history-info">

                <strong>
                  ${escapeHTML(
                    transaction.title
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    transaction.recipient
                  )}
                  •
                  ${escapeHTML(
                    transaction.source
                  )}
                  <br>
                  ${escapeHTML(
                    transaction.date
                  )}
                </small>

              </div>

            </div>

            <div class="history-amount out">
              -${formatMoney(
                transaction.amount
              )}
            </div>

          </div>

        `;

      })
      .join("");

}


/* =========================================================
   IDENTITY BUTTONS
   ========================================================= */

function setupIdentityButtons() {

  $("copyBeastId").addEventListener(
    "click",
    () => {

      copyText("BEAST-20481");

    }
  );


  $("copyReceiveId").addEventListener(
    "click",
    () => {

      copyText("BEAST-20481");

    }
  );

}


async function copyText(text) {

  try {

    await navigator.clipboard.writeText(
      text
    );

    showToast(
      "BEAST ID copied."
    );

  } catch (error) {

    showToast(
      text
    );

  }

}


/* =========================================================
   CAMERA SECURITY CHECK
   ========================================================= */

function setupCamera() {

  $("cameraBtn").addEventListener(
    "click",
    startCamera
  );


  $("stopCamera").addEventListener(
    "click",
    stopCamera
  );

}


async function startCamera() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showToast(
      "Camera access is not available."
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


    $("cameraVideo").srcObject =
      cameraStream;


    $("cameraArea")
      .classList.remove("hidden");


    $("cameraStatus").textContent =
      "✓ Selfie camera active. Prototype environment check complete.";


    showToast(
      "Camera security check started."
    );


  } catch (error) {

    $("cameraArea")
      .classList.remove("hidden");


    $("cameraStatus").textContent =
      "⚠️ Camera permission was denied or unavailable.";


    showToast(
      "Camera access was not granted."
    );

  }

}


function stopCamera() {

  if (cameraStream) {

    cameraStream
      .getTracks()
      .forEach(track => {
        track.stop();
      });

    cameraStream = null;

  }


  $("cameraVideo").srcObject =
    null;


  $("cameraArea")
    .classList.add("hidden");


  showToast(
    "Camera security check stopped."
  );

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;


function showToast(message) {

  const toast =
    $("toast");


  toast.textContent =
    message;


  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2800);

}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   DEMO RESET
   =========================================================

   Use this from the browser console if you ever want
   to reset the demo:

   localStorage.removeItem("money_transfer_beast_demo");
   location.reload();

   ========================================================= */