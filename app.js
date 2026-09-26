/* =========================================================
   MONEY TRANSFER BEAST
   DEMO / PROTOTYPE ONLY

   No real M-PESA, Airtel, bank or card transactions.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

"use strict";


/* ================= CONFIG ================= */

const STORAGE_KEY =
  "money_transfer_beast_replacement_v1";

const THEME_KEY =
  "money_transfer_beast_theme";

const DEMO_PASSWORD =
  "beast123";


const SOURCE_NAMES = {

  mpesa: "M-PESA",
  airtel: "Airtel Money",
  bank: "Bank Account",
  card: "Card",
  wallet: "BEAST Wallet"

};


/* ================= STATE ================= */

function defaultState(){

  return {

    registered:false,

    user:{
      name:"",
      phone:"",
      nationalId:"",
      beastId:"",
      pin:""
    },

    sources:{

      mpesa:{
        balance:5000,
        enabled:true,
        account:"0712345678"
      },

      airtel:{
        balance:0,
        enabled:false,
        account:""
      },

      bank:{
        balance:0,
        enabled:false,
        account:""
      },

      card:{
        balance:0,
        enabled:false,
        account:""
      },

      wallet:{
        balance:0,
        enabled:true,
        account:"BEAST-WALLET"
      }

    },

    transactions:[],

    notifications:[],

    securityEvents:[],

    owner:{
      fees:0,
      providerCosts:0,
      transactions:0,
      volume:0
    },

    settings:{
      notifications:true,
      screenSecurity:true,
      biometric:false
    },

    adminUnlocked:false

  };

}


function loadState(){

  try{

    const saved =
      JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

    if(saved){

      return {
        ...defaultState(),
        ...saved
      };

    }

  }catch(error){

    console.error(error);

  }

  return defaultState();

}


const state = loadState();

let pendingAction = null;


/* ================= HELPERS ================= */

function $(id){

  return document.getElementById(id);

}


function money(value){

  return `KES ${Number(value || 0)
    .toLocaleString("en-KE",{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })}`;

}


function normalizePhone(value=""){

  let phone =
    String(value)
    .replace(/\s+/g,"")
    .replace(/-/g,"");

  if(phone.startsWith("+254"))
    phone = "0" + phone.slice(4);

  if(phone.startsWith("254"))
    phone = "0" + phone.slice(3);

  return phone;

}


function validPhone(value){

  return /^07\d{8}$|^01\d{8}$/
    .test(normalizePhone(value));

}


function save(){

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


function randomDigits(length){

  return Math.floor(
    Math.random() * Math.pow(10,length)
  )
  .toString()
  .padStart(length,"0");

}


function generateBeastId(){

  return `BEAST-${randomDigits(6)}`;

}


function generateReference(){

  return `BST-${Date.now()
    .toString()
    .slice(-8)}-${randomDigits(3)}`;

}


function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function dateText(value){

  return new Date(value)
    .toLocaleString("en-KE");

}


function toast(message){

  const element = $("toast");

  element.textContent = message;

  element.classList.add("show");

  setTimeout(() => {

    element.classList.remove("show");

  },2600);

}


/* ================= THEME ================= */

function setTheme(theme){

  document.documentElement.dataset.theme =
    theme;

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  $("darkModeButton")
    ?.classList.toggle(
      "active",
      theme === "dark"
    );

  $("lightModeButton")
    ?.classList.toggle(
      "active",
      theme === "light"
    );

}


function loadTheme(){

  const theme =
    localStorage.getItem(THEME_KEY)
    || "dark";

  setTheme(theme);

}


/* ================= NAVIGATION ================= */

const screenMap = {

  home:"homeScreen",
  send:"sendScreen",
  receive:"receiveScreen",
  withdraw:"withdrawScreen",
  lipa:"lipaScreen",

  history:"historyScreen",
  profile:"profileScreen",
  security:"securityScreen",
  notifications:"notificationsScreen",
  settings:"settingsScreen",

  admin:"adminScreen",
  balance:"balanceScreen",
  beastOwn:"beastOwnScreen"

};


function showScreen(name){

  const screen =
    screenMap[name] || name;

  document
    .querySelectorAll(".app-screen")
    .forEach(element => {

      element.classList.remove("active");

    });


  const target = $(screen);

  if(target){

    target.classList.add("active");

  }


  closeMenu();

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });


  renderEverything();

}


function openMenu(){

  $("menuDrawer")
    .classList.add("open");

  $("drawerBackdrop")
    .classList.add("open");

}


function closeMenu(){

  $("menuDrawer")
    .classList.remove("open");

  $("drawerBackdrop")
    .classList.remove("open");

}


/* ================= REGISTRATION ================= */

function setupRegistration(){

  $("regNext1").onclick = () => {

    const name =
      $("regName").value.trim();

    const phone =
      normalizePhone(
        $("regPhone").value
      );

    const nationalId =
      $("regNationalId").value.trim();


    if(name.length < 2){

      toast("Enter your full name.");

      return;

    }


    if(!validPhone(phone)){

      toast("Enter a valid Kenyan phone number.");

      return;

    }


    if(nationalId.length < 5){

      toast("Enter your National ID.");

      return;

    }


    state.user.name = name;
    state.user.phone = phone;
    state.user.nationalId = nationalId;


    $("regStep1")
      .classList.add("hidden");

    $("regStep2")
      .classList.remove("hidden");


    document
      .querySelectorAll(".step")[1]
      .classList.add("active");

  };


  $("regNext2").onclick = () => {

    const pin =
      $("regPin").value;

    const confirmPin =
      $("regPin2").value;


    if(!/^\d{4}$/.test(pin)){

      toast("PIN must contain 4 digits.");

      return;

    }


    if(pin !== confirmPin){

      toast("PINs do not match.");

      return;

    }


    state.user.pin = pin;


    $("registrationSummary").innerHTML = `

      <b>${escapeHTML(state.user.name)}</b><br>

      Phone:
      ${escapeHTML(state.user.phone)}
      <br>

      National ID:
      ${escapeHTML(state.user.nationalId)}

      <br><br>

      Your BEAST ID will be generated
      after confirmation.

    `;


    $("regStep2")
      .classList.add("hidden");

    $("regStep3")
      .classList.remove("hidden");


    document
      .querySelectorAll(".step")[2]
      .classList.add("active");

  };


  $("finishRegistration").onclick = () => {

    state.user.beastId =
      generateBeastId();

    state.registered = true;


    addNotification(
      "BEAST ID created",
      `Your BEAST ID is ${state.user.beastId}.`
    );


    addSecurity(
      "New BEAST registration completed."
    );


    save();

    toast("BEAST account created.");

    showScreen("home");

  };

}


/* ================= BALANCE ================= */

function totalBalance(){

  return Object.values(
    state.sources
  )
  .reduce(
    (total,source) => {

      return total +
        (source.enabled
          ? Number(source.balance)
          : 0);

    },
    0
  );

}


/* ================= SOURCE CARDS ================= */

function renderSources(containerId){

  const container =
    $(containerId);

  if(!container) return;


  container.innerHTML =
    Object.entries(state.sources)
    .map(([key,source]) => {

      const icon =
        key === "mpesa" ? "📱" :
        key === "airtel" ? "📲" :
        key === "bank" ? "🏦" :
        key === "card" ? "💳" :
        "🐾";


      return `

        <div class="source-card">

          <div class="source-top">

            <span class="source-icon">
              ${icon}
            </span>

            <span class="pill ${
              source.enabled
              ? "green"
              : "red"
            }">

              ${
                source.enabled
                ? "ACTIVE"
                : "OFF"
              }

            </span>

          </div>


          <div>

            <strong>
              ${SOURCE_NAMES[key]}
            </strong>

            <small>
              ${
                escapeHTML(
                  source.account ||
                  "Not linked"
                )
              }
            </small>

          </div>


          <strong>
            ${money(source.balance)}
          </strong>

        </div>

      `;

    })
    .join("");

}


/* ================= SOURCE SELECTS ================= */

function fillSourceSelects(){

  [
    "sendSource",
    "receiveSource",
    "withdrawSource",
    "lipaSource"
  ]
  .forEach(id => {

    const select = $(id);

    if(!select) return;


    select.innerHTML =
      Object.entries(state.sources)
      .filter(([,source]) =>
        source.enabled
      )
      .map(([key]) => {

        return `

          <option value="${key}">
            ${SOURCE_NAMES[key]}
          </option>

        `;

      })
      .join("");

  });

}


/* ================= FEES ================= */

function beastFee(amount){

  amount = Number(amount || 0);

  if(amount <= 0)
    return 0;

  if(amount <= 1000)
    return 7;

  if(amount <= 10000)
    return 30;

  return 50;

}


function providerCost(source,amount){

  amount = Number(amount || 0);


  if(source === "wallet")
    return 0;


  if(source === "mpesa"){

    if(amount <= 100)
      return 0;

    if(amount <= 1500)
      return 5;

    if(amount <= 5000)
      return 9;

    if(amount <= 20000)
      return 11;

    if(amount <= 250000)
      return 13;

    return 20;

  }


  if(source === "airtel")
    return amount <= 1500 ? 5 : 10;


  if(source === "bank")
    return amount <= 10000 ? 3 : 10;


  if(source === "card")
    return amount <= 10000 ? 8 : 15;


  return 0;

}


function costPreview(
  source,
  amount
){

  amount =
    Number(amount || 0);

  const fee =
    beastFee(amount);

  const provider =
    providerCost(
      source,
      amount
    );

  const total =
    amount +
    fee +
    provider;


  return `

    <b>Cost preview</b>

    <br>

    Amount:
    ${money(amount)}

    <br>

    BEAST fee:
    ${money(fee)}

    <br>

    Provider cost:
    ${money(provider)}

    <br><br>

    <strong>
      Total deducted:
      ${money(total)}
    </strong>

  `;

}


function setupCostPreview(){

  const setups = [

    [
      "sendCostPreview",
      "sendSource",
      "sendAmount"
    ],

    [
      "receiveCostPreview",
      "receiveSource",
      "receiveAmount"
    ],

    [
      "withdrawCostPreview",
      "withdrawSource",
      "withdrawAmount"
    ],

    [
      "lipaCostPreview",
      "lipaSource",
      "lipaAmount"
    ]

  ];


  setups.forEach(
    ([preview,source,amount]) => {

      const update = () => {

        const box = $(preview);

        if(!box) return;

        box.innerHTML =
          costPreview(
            $(source)?.value,
            $(amount)?.value
          );

      };


      $(source)?.addEventListener(
        "change",
        update
      );

      $(amount)?.addEventListener(
        "input",
        update
      );


      update();

    }
  );

}


/* ================= RECIPIENT ================= */

function getRecipient(phone){

  phone =
    normalizePhone(phone);


  if(!validPhone(phone))
    return null;


  const demoNames = {

    "0720000000":
      "John Kamau",

    "0711111111":
      "Mary Wanjiku",

    "0799999999":
      "Peter Otieno"

  };


  if(phone === state.user.phone){

    return {

      name:state.user.name,
      phone,
      beastId:state.user.beastId,
      own:true

    };

  }


  return {

    name:
      demoNames[phone]
      || "Verified BEAST Recipient",

    phone,

    beastId:
      `BEAST-${phone.slice(-6)}`,

    own:false

  };

}


function displayVerification(
  id,
  data,
  title
){

  const box = $(id);

  if(!box) return;


  box.classList.remove("hidden");


  box.innerHTML = `

    <strong>
      ✓ ${title}
    </strong>

    ${escapeHTML(data.name)}

    <br>

    ${escapeHTML(data.phone || data.id)}

    <br>

    <small>
      ${escapeHTML(
        data.beastId ||
        "Verified destination"
      )}
    </small>

  `;

}


/* ================= SEND ================= */

function setupSend(){

  $("verifyRecipient").onclick = () => {

    const recipient =
      getRecipient(
        $("sendPhone").value
      );


    if(!recipient){

      toast(
        "Enter a valid recipient phone."
      );

      return;

    }


    if(recipient.own){

      toast(
        "You cannot send to yourself."
      );

      return;

    }


    displayVerification(
      "recipientVerification",
      recipient,
      "Verified recipient"
    );

  };


  $("sendMoneyButton").onclick = () => {

    const recipient =
      getRecipient(
        $("sendPhone").value
      );

    const amount =
      Number(
        $("sendAmount").value
      );

    const source =
      $("sendSource").value;


    if(!recipient || recipient.own){

      toast(
        "Verify a valid recipient first."
      );

      return;

    }


    if(amount <= 0){

      toast(
        "Enter an amount."
      );

      return;

    }


    authorize(
      "Send money",
      () => {

        completeTransaction({

          type:"Send",

          amount,

          source,

          recipient:
            recipient.phone,

          recipientName:
            recipient.name,

          description:
            `Send to ${recipient.name}`

        });

      }
    );

  };

}


/* ================= RECEIVE ================= */

function receiveDestinationFields(){

  const type =
    $("receiveDestinationType")
    .value;


  const fields = {

    pochi:`

      <label>

        Pochi phone / business number

        <input
          id="receiveDestNumber"
          placeholder="0712345678">

      </label>

    `,

    till:`

      <label>

        Till number

        <input
          id="receiveDestNumber"
          placeholder="123456">

      </label>

    `,

    paybill:`

      <div class="two-col">

        <label>

          PayBill number

          <input
            id="receiveDestNumber"
            placeholder="123456">

        </label>


        <label>

          Account number

          <input
            id="receiveAccountNumber"
            placeholder="Account">

        </label>

      </div>

    `,

    bank:`

      <div class="two-col">

        <label>

          Bank account

          <input
            id="receiveDestNumber"
            placeholder="Account number">

        </label>


        <label>

          Bank name

          <input
            id="receiveBankName"
            placeholder="Bank">

        </label>

      </div>

    `,

    card:`

      <label>

        Card / merchant reference

        <input
          id="receiveDestNumber"
          placeholder="Merchant reference">

      </label>

    `,

    other:`

      <label>

        BEAST ID / phone

        <input
          id="receiveDestNumber"
          placeholder="BEAST ID or phone">

      </label>

    `

  };


  $("receiveDestinationFields")
    .innerHTML =
      fields[type];

}


function getReceiveDestination(){

  const type =
    $("receiveDestinationType")
    .value;

  const value =
    (
      $("receiveDestNumber")
      ?.value || ""
    ).trim();


  if(!value){

    return {
      valid:false
    };

  }


  let name =
    "Verified BEAST Seller";


  if(type === "pochi"){

    if(!validPhone(value))
      return {valid:false};

    const recipient =
      getRecipient(value);

    name =
      recipient?.name
      || "Verified Pochi Seller";

  }


  if(type === "till")
    name = "Verified Till Merchant";


  if(type === "paybill")
    name = "Verified PayBill Business";


  if(type === "bank"){

    name =
      `Verified ${
        $("receiveBankName")
        ?.value || "Bank"
      } Account`;

  }


  if(type === "card")
    name = "Verified Card Merchant";


  if(type === "other"){

    const recipient =
      getRecipient(value);

    name =
      recipient?.name
      || "Verified BEAST Account";

  }


  return {

    valid:true,

    type,

    id:value,

    name

  };

}


function setupReceive(){

  $("receiveDestinationType")
    .addEventListener(
      "change",
      receiveDestinationFields
    );


  receiveDestinationFields();


  $("verifyBuyer").onclick = () => {

    const phone =
      normalizePhone(
        $("buyerPhone").value
      );

    const nationalId =
      $("buyerNationalId")
      .value
      .trim();

    const password =
      $("buyerPassword")
      .value;


    if(
      !validPhone(phone) ||
      phone !== state.user.phone
    ){

      toast(
        "Buyer phone verification failed."
      );

      return;

    }


    if(
      nationalId !==
      state.user.nationalId
    ){

      toast(
        "National ID verification failed."
      );

      return;

    }


    if(password !== DEMO_PASSWORD){

      toast(
        "Demo buyer password is incorrect."
      );

      return;

    }


    $("buyerVerification")
      .classList.remove("hidden");


    $("buyerVerification")
      .innerHTML = `

        <strong>
          ✓ Buyer verified
        </strong>

        ${escapeHTML(state.user.name)}

        <br>

        ${escapeHTML(state.user.phone)}

        <br>

        Buyer can authorize payment
        without exposing seller balance.

      `;


    toast("Buyer verified.");

  };


  $("verifyReceiveDestination")
    .onclick = () => {

      const destination =
        getReceiveDestination();


      if(!destination.valid){

        toast(
          "Enter valid destination details."
        );

        return;

      }


      displayVerification(
        "receiveDestinationVerification",
        {
          name:destination.name,
          phone:destination.id,
          beastId:"Destination verified"
        },
        "Verified destination"
      );


      toast(
        "Destination verified."
      );

    };


  $("buyerPayButton").onclick = () => {

    if(
      $("buyerVerification")
      .classList
      .contains("hidden")
    ){

      toast(
        "Verify buyer first."
      );

      return;

    }


    if(
      $("receiveDestinationVerification")
      .classList
      .contains("hidden")
    ){

      toast(
        "Verify destination first."
      );

      return;

    }


    const destination =
      getReceiveDestination();

    const amount =
      Number(
        $("receiveAmount").value
      );

    const source =
      $("receiveSource").value;


    if(!destination.valid){

      toast(
        "Enter destination."
      );

      return;

    }


    if(amount <= 0){

      toast(
        "Enter an amount."
      );

      return;

    }


    authorize(
      "Buyer payment",
      () => {

        completeTransaction({

          type:"Buyer Payment",

          amount,

          source,

          recipient:
            destination.id,

          recipientName:
            destination.name,

          description:
            `Buyer payment to ${destination.name}`

        });

      }
    );

  };

}


/* ================= WITHDRAW ================= */

function setupWithdraw(){

  $("verifyAgent").onclick = () => {

    const number =
      normalizePhone(
        $("agentNumber").value
      );


    if(!validPhone(number)){

      toast(
        "Enter a valid agent number."
      );

      return;

    }


    $("agentVerification")
      .classList.remove("hidden");


    $("agentVerification")
      .innerHTML = `

        <strong>
          ✓ Verified BEAST Agent
        </strong>

        ${escapeHTML(number)}

        <br>

        Store:
        ${escapeHTML(
          $("withdrawStore").value
          || "Main agent"
        )}

        <br>

        <small>
          Agent balance is not shown.
        </small>

      `;

  };


  $("withdrawButton").onclick = () => {

    if(
      $("agentVerification")
      .classList
      .contains("hidden")
    ){

      toast(
        "Verify the agent first."
      );

      return;

    }


    const amount =
      Number(
        $("withdrawAmount").value
      );

    const source =
      $("withdrawSource").value;


    if(amount <= 0){

      toast(
        "Enter an amount."
      );

      return;

    }


    authorize(
      "Agent withdrawal",
      () => {

        completeTransaction({

          type:"Withdraw",

          amount,

          source,

          recipient:
            normalizePhone(
              $("agentNumber").value
            ),

          recipientName:
            "Verified BEAST Agent",

          description:
            "Agent cash withdrawal"

        });

      }
    );

  };

}


/* ================= LIPA NA ================= */

function lipaFields(){

  const type =
    $("lipaType").value;


  if(type === "paybill"){

    $("lipaDestinationFields")
      .innerHTML = `

        <div class="two-col">

          <label>

            PayBill number

            <input
              id="lipaDestNumber"
              placeholder="123456">

          </label>


          <label>

            Account number

            <input
              id="lipaAccount"
              placeholder="Account">

          </label>

        </div>

      `;

  }

  else if(type === "till"){

    $("lipaDestinationFields")
      .innerHTML = `

        <label>

          Till number

          <input
            id="lipaDestNumber"
            placeholder="123456">

        </label>

      `;

  }

  else{

    $("lipaDestinationFields")
      .innerHTML = `

        <label>

          Business / account reference

          <input
            id="lipaDestNumber"
            placeholder="Business reference">

        </label>

      `;

  }

}


function setupLipa(){

  $("lipaType")
    .addEventListener(
      "change",
      lipaFields
    );


  lipaFields();


  $("verifyLipa").onclick = () => {

    const value =
      (
        $("lipaDestNumber")
        ?.value || ""
      ).trim();


    if(value.length < 4){

      toast(
        "Enter destination."
      );

      return;

    }


    $("lipaVerification")
      .classList
      .remove("hidden");


    $("lipaVerification")
      .innerHTML = `

        <strong>
          ✓ Verified destination
        </strong>

        Business:
        ${escapeHTML(value)}

        <br>

        Method:
        ${SOURCE_NAMES[
          $("lipaMethod").value
        ]}

      `;

  };


  $("lipaPayButton").onclick = () => {

    if(
      $("lipaVerification")
      .classList
      .contains("hidden")
    ){

      toast(
        "Verify destination first."
      );

      return;

    }


    const amount =
      Number(
        $("lipaAmount").value
      );

    const source =
      $("lipaSource").value;


    if(amount <= 0){

      toast(
        "Enter an amount."
      );

      return;

    }


    authorize(
      "Lipa Na payment",
      () => {

        completeTransaction({

          type:"Lipa Na",

          amount,

          source,

          recipient:
            $("lipaDestNumber").value,

          recipientName:
            "Verified Business",

          description:
            `${$("lipaType").value} payment`

        });

      }
    );

  };

}


/* ================= PIN AUTHORIZATION ================= */

function authorize(
  purpose,
  callback
){

  pendingAction =
    callback;


  $("pinPurpose")
    .textContent =
      purpose;


  $("authorizationPin").value = "";

  $("pinModal")
    .classList
    .remove("hidden");


  setTimeout(
    () => {
      $("authorizationPin")
        .focus();
    },
    100
  );

}


function closePin(){

  pendingAction = null;

  $("pinModal")
    .classList
    .add("hidden");

}


function setupPin(){

  $("confirmPin").onclick = () => {

    const pin =
      $("authorizationPin").value;


    if(pin !== state.user.pin){

      addSecurity(
        "Failed BEAST PIN authorization attempt."
      );

      save();

      toast(
        "Incorrect BEAST PIN."
      );

      return;

    }


    const action =
      pendingAction;


    closePin();


    if(action)
      action();

  };


  $("cancelPin").onclick =
    closePin;

  $("closePinModal").onclick =
    closePin;

}


/* ================= COMPLETE TRANSACTION ================= */

function completeTransaction(data){

  const amount =
    Number(data.amount);

  const fee =
    beastFee(amount);

  const provider =
    providerCost(
      data.source,
      amount
    );

  const total =
    amount +
    fee +
    provider;


  const source =
    state.sources[
      data.source
    ];


  if(!source ||
     !source.enabled){

    toast(
      "Selected payment source is not enabled."
    );

    return;

  }


  if(source.balance < total){

    toast(
      `Insufficient ${
        SOURCE_NAMES[data.source]
      } balance. Need ${money(total)}.`
    );

    return;

  }


  source.balance -= total;


  state.owner.fees += fee;

  state.owner.providerCosts +=
    provider;

  state.owner.transactions++;

  state.owner.volume += amount;


  const transaction = {

    reference:
      generateReference(),

    createdAt:
      new Date().toISOString(),

    status:"completed",

    type:data.type,

    amount,

    fee,

    providerCost:provider,

    totalDeducted:total,

    source:data.source,

    recipient:data.recipient,

    recipientName:
      data.recipientName,

    description:
      data.description

  };


  state.transactions.unshift(
    transaction
  );


  addNotification(
    `${data.type} completed`,
    `${money(amount)} sent to ${data.recipientName}. Ref ${transaction.reference}.`
  );


  addSecurity(
    `${data.type} authorized from ${SOURCE_NAMES[data.source]}.`
  );


  save();


  toast(
    `${data.type} completed. ${money(total)} deducted.`
  );


  if(data.type === "Send"){

    $("sendPhone").value="";
    $("sendAmount").value="";

    $("recipientVerification")
      .classList
      .add("hidden");

  }


  if(data.type === "Buyer Payment"){

    $("receiveAmount").value="";

    $("receiveDestinationVerification")
      .classList
      .add("hidden");

  }


  renderEverything();

}


/* ================= NOTIFICATIONS ================= */

function addNotification(
  title,
  message
){

  state.notifications.unshift({

    title,

    message,

    createdAt:
      new Date().toISOString(),

    read:false

  });


  state.notifications =
    state.notifications.slice(0,100);


  save();

}


function renderNotifications(){

  const box =
    $("notificationList");

  if(!box) return;


  if(!state.notifications.length){

    box.innerHTML =
      `<div class="panel muted">
        No notifications yet.
      </div>`;

    return;

  }


  box.innerHTML =
    state.notifications
    .map(notification => `

      <div class="list-item">

        <strong>
          ${escapeHTML(
            notification.title
          )}
        </strong>

        <small>

          ${escapeHTML(
            notification.message
          )}

          <br>

          ${dateText(
            notification.createdAt
          )}

        </small>

      </div>

    `)
    .join("");


  state.notifications
    .forEach(n => n.read=true);


  save();

  updateNotificationBadge();

}


function updateNotificationBadge(){

  const unread =
    state.notifications
    .filter(n => !n.read)
    .length;


  $("notificationBadge")
    .textContent =
      unread;

}


/* ================= SECURITY ================= */

function addSecurity(message){

  state.securityEvents.unshift({

    message,

    createdAt:
      new Date().toISOString()

  });


  state.securityEvents =
    state.securityEvents.slice(0,100);

}


function renderSecurity(){

  const box =
    $("securityList");

  if(!box) return;


  if(!state.securityEvents.length){

    box.innerHTML =
      `<div class="muted">
        No security events.
      </div>`;

    return;

  }


  box.innerHTML =
    state.securityEvents
    .map(event => `

      <div class="list-item">

        <strong>
          Security event
        </strong>

        <small>

          ${escapeHTML(
            event.message
          )}

          <br>

          ${dateText(
            event.createdAt
          )}

        </small>

      </div>

    `)
    .join("");

}


/* ================= HISTORY ================= */

function renderHistory(){

  const box =
    $("historyList");

  if(!box) return;


  if(!state.transactions.length){

    box.innerHTML =
      `<div class="panel muted">
        No transactions yet.
      </div>`;

    return;

  }


  box.innerHTML =
    state.transactions
    .map(transaction => `

      <div class="list-item">

        <strong>
          ${escapeHTML(
            transaction.type
          )}
        </strong>

        <span>
          -
          ${money(
            transaction.totalDeducted
          )}
        </span>


        <small>

          ${escapeHTML(
            transaction.description
          )}

          <br>

          Recipient:
          ${escapeHTML(
            transaction.recipientName
          )}

          <br>

          Source:
          ${
            SOURCE_NAMES[
              transaction.source
            ]
          }

          <br>

          Reference:
          ${escapeHTML(
            transaction.reference
          )}

          <br>

          ${dateText(
            transaction.createdAt
          )}

          <br>

          BEAST fee:
          ${money(transaction.fee)}

          ·

          Provider:
          ${money(
            transaction.providerCost
          )}

        </small>

      </div>

    `)
    .join("");

}


/* ================= PROFILE ================= */

function renderProfile(){

  const box =
    $("profileDetails");

  if(!box) return;


  box.innerHTML = `

    <div class="list-item">

      <strong>
        ${escapeHTML(
          state.user.name ||
          "Not registered"
        )}
      </strong>

      <small>

        BEAST ID:
        ${escapeHTML(
          state.user.beastId ||
          "-"
        )}

        <br>

        Phone:
        ${escapeHTML(
          state.user.phone ||
          "-"
        )}

        <br>

        National ID:
        ${escapeHTML(
          state.user.nationalId ||
          "-"
        )}

        <br>

        Total balance:
        ${money(totalBalance())}

      </small>

    </div>

  `;

}


/* ================= ADMIN ================= */

function renderAdmin(){

  const locked =
    $("adminLocked");

  const dashboard =
    $("adminDashboard");


  if(state.adminUnlocked){

    locked.classList.add("hidden");

    dashboard.classList.remove(
      "hidden"
    );


    $("ownerFees")
      .textContent =
      money(state.owner.fees);


    $("ownerProviderCosts")
      .textContent =
      money(
        state.owner.providerCosts
      );


    $("ownerNetRevenue")
      .textContent =
      money(
        state.owner.fees -
        state.owner.providerCosts
      );


    $("ownerTransactions")
      .textContent =
      state.owner.transactions;


    $("ownerVolume")
      .textContent =
      money(
        state.owner.volume
      );

  }

}


function setupAdmin(){

  $("adminLoginButton").onclick =
    () => {

      if(
        $("adminPassword").value !==
        DEMO_PASSWORD
      ){

        toast(
          "Incorrect admin password."
        );

        return;

      }


      state.adminUnlocked = true;

      save();

      renderAdmin();

      toast(
        "BEAST Admin unlocked."
      );

    };

}


/* ================= BALANCE CHECK ================= */

function setupBalance(){

  $("loginButton").onclick = () => {

    const account =
      normalizePhone(
        $("loginAccount").value
      );

    const name =
      $("loginName")
      .value
      .trim();


    if(
      account !== state.user.phone ||
      name.toLowerCase() !==
      state.user.name.toLowerCase()
    ){

      toast(
        "Identity details do not match."
      );

      return;

    }


    $("loginBalance")
      .classList
      .remove("hidden");


    $("loginBalance").innerHTML = `

      <b>
        ${escapeHTML(
          state.user.name
        )}
      </b>

      <br>

      BEAST ID:
      ${escapeHTML(
        state.user.beastId
      )}

      <br><br>

      <strong style="font-size:22px">
        ${money(totalBalance())}
      </strong>

    `;

  };

}


/* ================= SETTINGS ================= */

function setupSettings(){

  $("darkModeButton").onclick =
    () => setTheme("dark");


  $("lightModeButton").onclick =
    () => setTheme("light");


  $("notificationsToggle")
    .onchange =
    event => {

      state.settings.notifications =
        event.target.checked;

      save();

    };


  $("screenSecurityToggle")
    .onchange =
    event => {

      state.settings.screenSecurity =
        event.target.checked;

      save();

    };


  $("biometricToggle")
    .onchange =
    event => {

      state.settings.biometric =
        event.target.checked;

      save();

    };


  $("changePinButton").onclick =
    () => {

      const oldPin =
        $("oldPin").value;

      const newPin =
        $("newPin").value;

      const confirmPin =
        $("confirmNewPin").value;


      if(oldPin !== state.user.pin){

        toast(
          "Current PIN is incorrect."
        );

        return;

      }


      if(
        !/^\d{4}$/.test(newPin) ||
        newPin !== confirmPin
      ){

        toast(
          "New PIN must contain 4 matching digits."
        );

        return;

      }


      state.user.pin =
        newPin;


      addSecurity(
        "BEAST PIN changed."
      );


      save();

      toast(
        "BEAST PIN changed successfully."
      );


      $("oldPin").value="";
      $("newPin").value="";
      $("confirmNewPin").value="";

    };


  $("resetDemo").onclick =
    () => {

      if(
        !confirm(
          "Reset all BEAST demo data?"
        )
      ) return;


      localStorage.removeItem(
        STORAGE_KEY
      );


      location.reload();

    };

}


/* ================= MENU ================= */

function setupMenu(){

  $("menuButton").onclick =
    openMenu;


  $("closeMenu").onclick =
    closeMenu;


  $("drawerBackdrop").onclick =
    closeMenu;


  document
    .querySelectorAll("[data-menu]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.menu;


          if(target === "logout"){

            toast(
              "Demo session ended."
            );

            closeMenu();

            return;

          }


          showScreen(target);

        }
      );

    });


  $("notificationButton").onclick =
    () => showScreen(
      "notifications"
    );


  $("refreshBalance").onclick =
    () => {

      renderEverything();

      toast(
        "Balance refreshed."
      );

    };

}


/* ================= VISIBILITY SECURITY ================= */

function setupSecurity(){

  document.addEventListener(
    "visibilitychange",
    () => {

      if(
        document.hidden &&
        state.settings.screenSecurity
      ){

        addSecurity(
          "App visibility changed."
        );

        save();

      }

    }
  );

}


/* ================= RENDER ALL ================= */

function renderHome(){

  if(!state.registered)
    return;


  $("welcomeText")
    .textContent =
    `Welcome, ${state.user.name}.`;


  $("dashboardBeastId")
    .textContent =
    state.user.beastId;


  $("menuUser")
    .textContent =
    state.user.name;


  $("totalBalance")
    .textContent =
    money(totalBalance());

}


function renderSettings(){

  $("notificationsToggle")
    .checked =
    state.settings.notifications;


  $("screenSecurityToggle")
    .checked =
    state.settings.screenSecurity;


  $("biometricToggle")
    .checked =
    state.settings.biometric;

}


function renderEverything(){

  renderHome();

  renderSources(
    "sourceList"
  );

  renderSources(
    "beastOwnSourceList"
  );

  renderHistory();

  renderNotifications();

  renderSecurity();

  renderProfile();

  renderAdmin();

  renderSettings();

  fillSourceSelects();

  setupCostPreview();

  updateNotificationBadge();

}


/* ================= START ================= */

function initialize(){

  setupRegistration();

  setupMenu();

  setupSend();

  setupReceive();

  setupWithdraw();

  setupLipa();

  setupPin();

  setupAdmin();

  setupBalance();

  setupSettings();

  setupSecurity();

  loadTheme();


  if(state.registered){

    $("registrationScreen")
      .classList
      .remove("active");

    $("homeScreen")
      .classList
      .add("active");

  }


  renderEverything();


  console.log(
    "MONEY TRANSFER BEAST loaded."
  );

}


initialize();

});