const KEY = "mtb_beast_final";
const DEMO_PIN = "1234";

const DEFAULT_SOURCES = {
  "M-PESA": [
    ["0712345678", "Primary"],
    ["0798765432", "Secondary"]
  ],
  "AIRTEL": [
    ["0734567890", "Primary"],
    ["0787654321", "Secondary"]
  ],
  "BANK": [
    ["KCB •••• 4582", "KCB Account"],
    ["Equity •••• 9134", "Equity Account"],
    ["Co-operative •••• 2210", "Co-op Account"]
  ],
  "CARD": [
    ["BEAST Visa •••• 4821", "Visa"],
    ["M-PESA Card •••• 7720", "M-PESA Card"],
    ["Demo Mastercard •••• 1188", "Mastercard"]
  ],
  "WALLET": [
    ["BEAST Wallet Main", "Wallet"],
    ["M-PESA Wallet 0712345678", "M-PESA Wallet"],
    ["Airtel Money Wallet 0798765432", "Airtel Wallet"]
  ]
};

let state =
  JSON.parse(localStorage.getItem(KEY) || "null") || {
    balance: 5000,
    history: [],
    dark: false,
    settings: {
      securityAlerts: true,
      notifications: true,
      screenProtection: true
    },
    sources: DEFAULT_SOURCES
  };

state.sources = {
  ...DEFAULT_SOURCES,
  ...(state.sources || {})
};

let sendVerified = false;
let receiveWithdrawVerified = false;
let generalWithdrawVerified = false;
let receiveTerminalVerified = false;

let pendingAuth = null;

let receiveSession = false;

let currentLoginType = "PHONE";
let currentLipa = "POCHI";
let currentReceive = "BILL";

/* ------------------------------
   HELPERS
------------------------------ */

const $ = id => document.getElementById(id);

const money = amount =>
  "KES " +
  Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function toast(message) {
  const element = $("toast");

  element.textContent = message;
  element.classList.add("show");

  setTimeout(() => {
    element.classList.remove("show");
  }, 2400);
}

function feeFor(amount) {
  amount = Number(amount) || 0;

  if (amount < 1000) return 7;
  if (amount <= 10000) return 30;

  return 50;
}

function renderBalance() {
  $("balance").textContent = money(state.balance);
}

function updateBalance(amount) {
  state.balance = Math.max(
    0,
    state.balance + Number(amount)
  );

  save();
  renderBalance();
}

function addHistory(type, details, amount) {
  state.history.push({
    type,
    details,
    amount: money(amount),
    time: new Date().toLocaleString()
  });

  save();
  renderHistory();
}

function renderHistory() {
  const element = $("historyList");

  if (!state.history.length) {
    element.innerHTML =
      '<div class="empty-state">No transactions yet.</div>';

    return;
  }

  element.innerHTML = state.history
    .slice()
    .reverse()
    .map(
      item => `
        <div class="history-item">
          <b>${item.type}</b>
          <div>${item.details}</div>
          <small>${item.time} • ${item.amount}</small>
        </div>
      `
    )
    .join("");
}

/* ------------------------------
   PANELS
------------------------------ */

function openPanel(id) {
  document
    .querySelectorAll(".panel")
    .forEach(panel =>
      panel.classList.remove("active-panel")
    );

  $(id).classList.add("active-panel");

  closeMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ------------------------------
   MENU
------------------------------ */

function openMenu() {
  $("sideMenu").classList.add("open");
  $("menuOverlay").classList.add("show");
}

function closeMenu() {
  $("sideMenu").classList.remove("open");
  $("menuOverlay").classList.remove("show");
}

$("menuBtn").onclick = openMenu;
$("closeMenu").onclick = closeMenu;
$("menuOverlay").onclick = closeMenu;

document
  .querySelectorAll(".menu-item[data-open]")
  .forEach(button => {
    button.onclick = () =>
      openPanel(button.dataset.open);
  });

$("menuTheme").onclick = () => {
  state.dark = !state.dark;

  document.body.classList.toggle(
    "dark",
    state.dark
  );

  save();
  closeMenu();
};

/* ------------------------------
   QUICK SERVICES
------------------------------ */

document
  .querySelectorAll(".service-card")
  .forEach(button => {
    button.onclick = () => {
      const panel = button.dataset.panel;

      openPanel(panel);

      if (
        panel === "receivePanel" &&
        !receiveSession
      ) {
        openBuyerLogin();
      }
    };
  });

$("copyBeastId").onclick = () => {
  const id = $("beastId").textContent;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(id);
  }

  toast("BEAST ID copied");
};

/* ------------------------------
   SOURCE PICKER
------------------------------ */

function renderPicker(
  pickerId,
  group,
  onSelect
) {
  const box = $(pickerId);
  const list = state.sources[group] || [];

  box.innerHTML = list
    .map(
      (source, index) => `
        <button
          class="source-option ${
            index === 0 ? "selected" : ""
          }"
          data-index="${index}">
          <b>${source[0]}</b><br>
          <small>${source[1]}</small>
        </button>
      `
    )
    .join("");

  box.dataset.selected = "0";

  box
    .querySelectorAll(".source-option")
    .forEach(button => {
      button.onclick = () => {
        box
          .querySelectorAll(".source-option")
          .forEach(item =>
            item.classList.remove("selected")
          );

        button.classList.add("selected");

        box.dataset.selected =
          button.dataset.index;

        if (onSelect) {
          onSelect(
            list[Number(button.dataset.index)]
          );
        }
      };
    });
}

function selectedSource(pickerId, group) {
  const box = $(pickerId);
  const list = state.sources[group] || [];

  return (
    list[Number(box.dataset.selected || 0)] ||
    list[0]
  );
}

/* ------------------------------
   AUTHORIZATION MODAL
------------------------------ */

function showAuth(title, description, callback) {
  pendingAuth = callback;

  $("authTitle").textContent = title;
  $("authDescription").textContent =
    description;

  $("authPin").value = "";

  $("authModal").classList.remove("hidden");

  setTimeout(() => {
    $("authPin").focus();
  }, 50);
}

function closeAuth() {
  $("authModal").classList.add("hidden");
  pendingAuth = null;
}

function completeWithAuth(
  title,
  description,
  callback
) {
  showAuth(
    title,
    description,
    () => {
      callback();
      closeAuth();
    }
  );
}

$("authClose").onclick = closeAuth;

$("authorizeBtn").onclick = () => {
  if ($("authPin").value !== DEMO_PIN) {
    toast("Wrong demo PIN");
    return;
  }

  const callback = pendingAuth;

  closeAuth();

  if (callback) {
    callback();
  }
};

/* ------------------------------
   SEND MONEY
------------------------------ */

$("verifySendRecipient").onclick = () => {
  const phone = $("sendPhone").value.trim();

  if (!phone) {
    toast("Enter receiver number");
    return;
  }

  sendVerified = true;

  $("sendRecipientResult").innerHTML = `
    ✓ Recipient verified<br>
    <b>${phone}</b><br>
    <small>KRISH TEST RECIPIENT</small>
  `;

  $("sendRecipientResult")
    .classList.remove("hidden");

  toast("Recipient verified");
};

function setupSendSource() {
  renderPicker(
    "sendSourcePicker",
    $("sendSource").value
  );
}

$("sendSource").onchange =
  setupSendSource;

$("sendBtn").onclick = () => {
  const amount =
    Number($("sendAmount").value);

  if (!sendVerified) {
    toast("Verify recipient first");
    return;
  }

  if (!amount || amount <= 0) {
    toast("Enter amount");
    return;
  }

  const fee = feeFor(amount);
  const total = amount + fee;

  if (total > state.balance) {
    toast("Insufficient demo balance");
    return;
  }

  completeWithAuth(
    "AUTHORIZE SEND",
    `Send ${money(amount)} + ${money(fee)} fee?`,
    () => {
      updateBalance(-total);

      addHistory(
        "SEND",
        `To ${$("sendPhone").value} • Fee ${money(
          fee
        )}`,
        amount
      );

      receipt("SEND", amount, fee);

      sendVerified = false;

      $("sendRecipientResult")
        .classList.add("hidden");
    }
  );
};

/* ------------------------------
   LIPA NA
------------------------------ */

document
  .querySelectorAll(".lipa-tab")
  .forEach(button => {
    button.onclick = () => {
      currentLipa =
        button.dataset.type;

      document
        .querySelectorAll(".lipa-tab")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      renderLipa();
    };
  });

function renderLipa() {
  const form = $("lipaForm");

  if (currentLipa === "BILL") {
    form.innerHTML = `
      <div class="field">
        <label>Business Number</label>
        <input
          id="lipaBusiness"
          placeholder="600000">
      </div>

      <div class="field">
        <label>Account Number</label>
        <input
          id="lipaAccount"
          placeholder="ACCOUNT-001">
      </div>
    `;
  } else {
    const label =
      currentLipa === "POCHI"
        ? "Phone Number"
        : "Till Number";

    const placeholder =
      currentLipa === "POCHI"
        ? "0712345678"
        : "123456";

    form.innerHTML = `
      <div class="field">
        <label>${label}</label>
        <input
          id="lipaTarget"
          placeholder="${placeholder}">
      </div>
    `;
  }

  form.innerHTML += `
    <div class="field">
      <label>Amount</label>

      <div class="amount-input">
        <span>KES</span>
        <input
          id="lipaAmount"
          type="number"
          min="1"
          placeholder="0.00">
      </div>
    </div>

    <button
      id="lipaVerify"
      class="secondary-btn">
      VERIFY DETAILS
    </button>

    <div
      id="lipaResult"
      class="verify-box hidden">
    </div>

    <button
      id="lipaPay"
      class="primary-btn">
      PAY NOW
    </button>
  `;

  let verified = false;

  $("lipaVerify").onclick = () => {
    verified = true;

    $("lipaResult").textContent =
      "✓ Payment details verified";

    $("lipaResult")
      .classList.remove("hidden");
  };

  $("lipaPay").onclick = () => {
    const amount =
      Number($("lipaAmount").value);

    if (!verified) {
      toast("Verify details first");
      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter amount");
      return;
    }

    const fee = feeFor(amount);
    const total = amount + fee;

    if (total > state.balance) {
      toast("Insufficient demo balance");
      return;
    }

    completeWithAuth(
      "AUTHORIZE PAYMENT",
      `Pay ${money(amount)} + ${money(fee)} fee?`,
      () => {
        updateBalance(-total);

        addHistory(
          "LIPA NA",
          `${currentLipa} • Fee ${money(fee)}`,
          amount
        );

        receipt(
          "LIPA NA",
          amount,
          fee
        );
      }
    );
  };
}

/* ------------------------------
   RECEIVE LOGIN
------------------------------ */

function openBuyerLogin() {
  $("buyerLoginModal")
    .classList.remove("hidden");

  $("loginIdentifier").value = "";
  $("loginPassword").value = "";

  setTimeout(() => {
    $("loginIdentifier").focus();
  }, 50);
}

function closeBuyerLogin() {
  $("buyerLoginModal")
    .classList.add("hidden");
}

$("receiveLoginBtn").onclick =
  openBuyerLogin;

$("buyerLoginClose").onclick =
  closeBuyerLogin;

/* LOGIN TYPE */

document
  .querySelectorAll(".login-tab")
  .forEach(button => {
    button.onclick = () => {
      currentLoginType =
        button.dataset.loginType;

      document
        .querySelectorAll(".login-tab")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      const labels = {
        PHONE: [
          "Phone Number",
          "0712345678"
        ],

        BEAST: [
          "BEAST ID",
          "BEAST-TEST-001"
        ],

        ACCOUNT: [
          "Account Number",
          "4582"
        ]
      };

      $("loginIdentifierLabel")
        .textContent =
        labels[currentLoginType][0];

      $("loginIdentifier").placeholder =
        labels[currentLoginType][1];
    };
  });

/* BUYER LOGIN CONFIRM */

$("buyerLoginConfirm").onclick = () => {
  const identifier =
    $("loginIdentifier")
      .value
      .trim();

  const password =
    $("loginPassword")
      .value
      .trim();

  let valid = false;

  if (
    currentLoginType === "PHONE" &&
    identifier === "0712345678"
  ) {
    valid = true;
  }

  if (
    currentLoginType === "BEAST" &&
    identifier.toUpperCase() ===
      "BEAST-TEST-001"
  ) {
    valid = true;
  }

  if (
    currentLoginType === "ACCOUNT" &&
    identifier === "4582"
  ) {
    valid = true;
  }

  if (!valid || password !== DEMO_PIN) {
    toast(
      "Login details not verified. Demo PIN is 1234."
    );

    return;
  }

  /*
    RECEIVE SESSION STARTS ONLY AFTER
    SUCCESSFUL BUYER LOGIN
  */

  receiveSession = true;

  closeBuyerLogin();

  $("receiveLocked")
    .classList.add("hidden");

  $("receiveContent")
    .classList.remove("hidden");

  receiveTerminalVerified = false;

  toast(
    "Buyer verified. Receive opened."
  );
};

/* ------------------------------
   RECEIVE TERMINAL
------------------------------ */

$("receiveDeviceVerify").onclick =
  () => {
    receiveTerminalVerified = true;

    $("receiveSecurityAlert")
      .querySelector("span")
      .textContent =
      "✓ Terminal verified for this Receive session.";

    toast("Terminal verified");
  };

/* ------------------------------
   RECEIVE SELL / PAYMENT
------------------------------ */

document
  .querySelectorAll(".receive-option")
  .forEach(button => {
    button.onclick = () => {
      currentReceive =
        button.dataset.receiveType;

      document
        .querySelectorAll(".receive-option")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      renderReceiveSell();
    };
  });

function renderReceiveSell() {
  const form =
    $("receiveSellForm");

  if (currentReceive === "BILL") {
    form.innerHTML = `
      <div class="detail-card">

        <div class="field">
          <label>Business Number</label>
          <input
            id="receiveBusiness"
            placeholder="600000">
        </div>

        <div class="field">
          <label>Account Number</label>
          <input
            id="receiveAccount"
            placeholder="ACCOUNT-001">
        </div>

        <button
          class="secondary-btn"
          id="receiveSellVerify">
          VERIFY DETAILS
        </button>

        <div
          id="receiveSellResult"
          class="verify-box hidden">
        </div>

      </div>
    `;
  }

  else if (currentReceive === "TILL") {
    form.innerHTML = `
      <div class="detail-card">

        <div class="field">
          <label>Till Number</label>
          <input
            id="receiveTill"
            placeholder="123456">
        </div>

        <button
          class="secondary-btn"
          id="receiveSellVerify">
          VERIFY DETAILS
        </button>

        <div
          id="receiveSellResult"
          class="verify-box hidden">
        </div>

      </div>
    `;
  }

  else {
    form.innerHTML = `
      <div class="detail-card">

        <div class="field">
          <label>Phone Number</label>
          <input
            id="receivePochi"
            inputmode="tel"
            placeholder="0712345678">
        </div>

        <button
          class="secondary-btn"
          id="receiveSellVerify">
          VERIFY DETAILS
        </button>

        <div
          id="receiveSellResult"
          class="verify-box hidden">
        </div>

      </div>
    `;
  }

  form.innerHTML += `
    <div class="field">
      <label>Amount Received</label>

      <div class="amount-input">
        <span>KES</span>

        <input
          id="receiveSellAmount"
          type="number"
          min="1"
          placeholder="0.00">
      </div>
    </div>

    <button
      id="receiveSellBtn"
      class="primary-btn">
      CONFIRM RECEIVE
    </button>
  `;

  let verified = false;

  $("receiveSellVerify").onclick =
    () => {
      verified = true;

      $("receiveSellResult")
        .textContent =
        "✓ Details verified";

      $("receiveSellResult")
        .classList.remove("hidden");
    };

  $("receiveSellBtn").onclick =
    () => {
      const amount =
        Number(
          $("receiveSellAmount").value
        );

      if (!verified) {
        toast(
          "Verify payment details first"
        );

        return;
      }

      if (!amount || amount <= 0) {
        toast("Enter amount");
        return;
      }

      completeWithAuth(
        "AUTHORIZE RECEIVE",
        `Receive ${money(amount)} into the demo account?`,
        () => {
          updateBalance(amount);

          addHistory(
            "RECEIVE",
            `${currentReceive} payment`,
            amount
          );

          receipt(
            "RECEIVE",
            amount,
            0
          );

          /*
            IMPORTANT:
            After Receive is completed,
            the Receive session is destroyed.
          */

          logoutReceive();
        }
      );
    };
}

renderReceiveSell();

/* ------------------------------
   AGENT DETAILS
------------------------------ */

function agentHTML(id) {
  return `
    <div class="detail-card">

      <div class="field">
        <label>Agent Number</label>

        <input
          id="${id}Number"
          inputmode="tel"
          placeholder="0712345678">
      </div>

      <div class="field">
        <label>Store Number</label>

        <input
          id="${id}Store"
          placeholder="STORE-001">
      </div>

      <button
        class="secondary-btn"
        id="${id}Verify">
        VERIFY WITHDRAWAL DETAILS
      </button>

      <div
        id="${id}VerifyResult"
        class="verify-box hidden">
      </div>

    </div>
  `;
}

function setupAgent(id) {
  $(id).innerHTML =
    agentHTML(id);

  $(id + "Verify").onclick =
    () => verifyAgent(id);
}

function verifyAgent(id) {
  const agent =
    $(id + "Number");

  const store =
    $(id + "Store");

  const result =
    $(id + "VerifyResult");

  if (
    !agent ||
    !store ||
    !agent.value.trim() ||
    !store.value.trim()
  ) {
    toast(
      "Enter agent and store number"
    );

    return;
  }

  result.innerHTML =
    "✓ Agent and store details verified.";

  result.classList.remove("hidden");

  if (id === "receiveAgentDetails") {
    receiveWithdrawVerified = true;
  }

  if (id === "withdrawAgentDetails") {
    generalWithdrawVerified = true;
  }
}

/* ------------------------------
   RECEIVE WITHDRAW SOURCE
------------------------------ */

function setupWithdrawSource(
  selectId,
  pickerId,
  agentId
) {
  const group =
    $(selectId).value;

  renderPicker(
    pickerId,
    group
  );

  if (
    group === "M-PESA" ||
    group === "AIRTEL"
  ) {
    setupAgent(agentId);
  } else {
    $(agentId).innerHTML = `
      <div class="detail-card">
        ✓ Selected linked account/card/wallet
        will be used.
      </div>
    `;
  }
}

$("receiveWithdrawSource").onchange =
  () => {
    receiveWithdrawVerified = false;

    setupWithdrawSource(
      "receiveWithdrawSource",
      "receiveWithdrawSourcePicker",
      "receiveAgentDetails"
    );
  };

/* RECEIVE WITHDRAW */

$("receiveWithdrawBtn").onclick =
  () => {
    if (!receiveSession) {
      openBuyerLogin();
      return;
    }

    const group =
      $("receiveWithdrawSource").value;

    const amount =
      Number(
        $("receiveWithdrawAmount").value
      );

    if (!receiveTerminalVerified) {
      toast(
        "Verify this terminal first"
      );

      return;
    }

    if (
      (group === "M-PESA" ||
        group === "AIRTEL") &&
      !receiveWithdrawVerified
    ) {
      toast(
        "Verify agent and store details first"
      );

      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter amount");
      return;
    }

    if (amount > state.balance) {
      toast(
        "Insufficient demo balance"
      );

      return;
    }

    completeWithAuth(
      "AUTHORIZE WITHDRAWAL",
      `Withdraw ${money(amount)} from the selected source?`,
      () => {
        updateBalance(-amount);

        const source =
          selectedSource(
            "receiveWithdrawSourcePicker",
            group
          );

        addHistory(
          "AGENT WITHDRAW",
          `${group} • ${
            source?.[0] || ""
          }`,
          amount
        );

        receipt(
          "AGENT WITHDRAW",
          amount,
          0
        );

        /*
          Automatically end the
          Receive session after completion.
        */

        logoutReceive();
      }
    );
  };

/* ------------------------------
   GENERAL WITHDRAW
------------------------------ */

$("withdrawSource").onchange =
  () => {
    generalWithdrawVerified = false;

    setupWithdrawSource(
      "withdrawSource",
      "withdrawSourcePicker",
      "withdrawAgentDetails"
    );
  };

$("withdrawBtn").onclick =
  () => {
    const group =
      $("withdrawSource").value;

    const amount =
      Number(
        $("withdrawAmount").value
      );

    if (
      (group === "M-PESA" ||
        group === "AIRTEL") &&
      !generalWithdrawVerified
    ) {
      toast(
        "Verify agent and store details first"
      );

      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter amount");
      return;
    }

    if (amount > state.balance) {
      toast(
        "Insufficient demo balance"
      );

      return;
    }

    completeWithAuth(
      "AUTHORIZE WITHDRAWAL",
      `Withdraw ${money(amount)}?`,
      () => {
        updateBalance(-amount);

        const source =
          selectedSource(
            "withdrawSourcePicker",
            group
          );

        addHistory(
          "WITHDRAW",
          `${group} • ${
            source?.[0] || ""
          }`,
          amount
        );

        receipt(
          "WITHDRAW",
          amount,
          0
        );
      }
    );
  };

/* ------------------------------
   RECEIVE AUTO LOGOUT
------------------------------ */

function logoutReceive() {
  receiveSession = false;

  receiveTerminalVerified = false;
  receiveWithdrawVerified = false;

  /*
    Hide Receive immediately after
    the completed transaction.
  */

  $("receiveContent")
    .classList.add("hidden");

  $("receiveLocked")
    .classList.remove("hidden");

  /*
    Clear sensitive Receive fields.
  */

  const ids = [
    "receiveSellAmount",
    "receiveWithdrawAmount"
  ];

  ids.forEach(id => {
    if ($(id)) {
      $(id).value = "";
    }
  });

  /*
    Return automatically to
    the buyer login screen.
  */

  setTimeout(() => {
    openBuyerLogin();
  }, 500);
}

/* ------------------------------
   RECEIPT
------------------------------ */

function receipt(
  type,
  amount,
  fee
) {
  $("receiptContent").innerHTML = `
    <div class="receipt-row">
      <span>Type</span>
      <b>${type}</b>
    </div>

    <div class="receipt-row">
      <span>Amount</span>
      <b>${money(amount)}</b>
    </div>

    <div class="receipt-row">
      <span>Fee</span>
      <b>${money(fee)}</b>
    </div>

    <div class="receipt-row">
      <span>Time</span>
      <b>${new Date().toLocaleTimeString()}</b>
    </div>
  `;

  $("receiptModal")
    .classList.remove("hidden");
}

$("receiptClose").onclick =
  () =>
    $("receiptModal")
      .classList.add("hidden");

$("receiptDone").onclick =
  () =>
    $("receiptModal")
      .classList.add("hidden");

/* ------------------------------
   SETTINGS
------------------------------ */

[
  "securityAlertsToggle",
  "notificationsToggle",
  "screenProtectionToggle"
].forEach(id => {
  $(id).onchange = () => {
    state.settings = {
      securityAlerts:
        $("securityAlertsToggle").checked,

      notifications:
        $("notificationsToggle").checked,

      screenProtection:
        $("screenProtectionToggle").checked
    };

    save();
  };
});

/* ------------------------------
   BROWSER SECURITY
------------------------------ */

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      state.settings.screenProtection &&
      document.hidden
    ) {
      toast(
        "Session paused while page is hidden."
      );
    }
  }
);

window.addEventListener(
  "blur",
  () => {
    if (
      state.settings.screenProtection
    ) {
      toast(
        "Security check: terminal focus lost."
      );
    }
  }
);

/*
  NOTE:
  A normal GitHub Pages browser cannot
  universally detect Android screenshots
  or every screen-recording method.
  Strong OS-level protection belongs in
  a future native Android app.
*/

/* ------------------------------
   STARTUP
------------------------------ */

document.body.classList.toggle(
  "dark",
  state.dark
);

renderBalance();
renderHistory();

setupSendSource();

setupWithdrawSource(
  "withdrawSource",
  "withdrawSourcePicker",
  "withdrawAgentDetails"
);

setupWithdrawSource(
  "receiveWithdrawSource",
  "receiveWithdrawSourcePicker",
  "receiveAgentDetails"
);