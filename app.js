/* =========================================================
   MONEY TRANSFER BEAST
   DEMO / PROTOTYPE ONLY

   No real M-PESA, Airtel, T-Kash, bank or card
   transactions are performed by this prototype.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

"use strict";


/* ================= CONFIG ================= */

const STORAGE_KEY =
  "money_transfer_beast_replacement_v2";

const THEME_KEY =
  "money_transfer_beast_theme";

const DEMO_PASSWORD =
  "beast123";

/*
  Demo registered Safaricom agents.
  Production version must verify agents through
  an authorized provider/backend.
*/
const REGISTERED_AGENTS = {
  "0712345678": "BEAST Demo Safaricom Agent",
  "0720000000": "Safaricom Registered Agent",
  "0711111111": "Safaricom Registered Agent"
};

const SOURCE_NAMES = {

  mpesa: "M-PESA",

  tkash: "T-Kash",

  airtel: "Airtel Money",

  bank: "Bank Account",

  card: "Card",

  wallet: "BEAST Wallet"

};


const BANK_NAMES = [

  "KCB",

  "Equity Bank",

  "Co-operative Bank",

  "NCBA",

  "Absa Bank",

  "Stanbic Bank",

  "Standard Chartered",

  "DTB",

  "I&M Bank",

  "Family Bank",

  "Postbank",

  "Other"

];


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

      tkash:{
        balance:0,
        enabled:false,
        account:""
      },

      airtel:{
        balance:0,
        enabled:false,
        account:""
      },

      bank:{
        balance:0,
        enabled:false,
        account:"",
        bankName:""
      },

      card:{
        balance:0,
        enabled:false,
        account:"",
        cardName:"",
        last4:""
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

      const base = defaultState();

      return {

        ...base,

        ...saved,

        user:{
          ...base.user,
          ...(saved.user || {})
        },

        sources:{
          ...base.sources,
          ...(saved.sources || {})
        },

        owner:{
          ...base.owner,
          ...(saved.owner || {})
        },

        settings:{
          ...base.settings,
          ...(saved.settings || {})
        }

      };

    }

  }catch(error){

    console.error(error);

  }

  return defaultState();

}


const state = loadState();

let pendingAction = null;

let cameraStream = null;


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


/*
  Converts:
  0712345678
  0112345678
  +254712345678
  +254112345678
  254712345678
  254112345678

  into local Kenyan format.
*/

function normalizePhone(value=""){

  let phone =
    String(value)
    .trim()
    .replace(/\s+/g,"")
    .replace(/-/g,"");

  if(phone.startsWith("+254")){

    phone =
      "0" +
      phone.slice(4);

  }

  else if(phone.startsWith("254")){

    phone =
      "0" +
      phone.slice(3);

  }

  return phone;

}


function validPhone(value){

  return /^(07|01)\d{8}$/
    .test(
      normalizePhone(value)
    );

}


function internationalPhone(value){

  const phone =
    normalizePhone(value);

  if(!validPhone(phone))
    return "";

  return "+254" + phone.slice(1);

}


function save(){

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}


function randomDigits(length){

  return Math.floor(
    Math.random() *
    Math.pow(10,length)
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

  const element =
    $("toast");

  if(!element)
    return;

  element.textContent =
    message;

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

      element.classList.remove(
        "active"
      );

    });


  const target =
    $(screen);

  if(target){

    target.classList.add(
      "active"
    );

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
    ?.classList.add("open");

  $("drawerBackdrop")
    ?.classList.add("open");

}


function closeMenu(){

  $("menuDrawer")
    ?.classList.remove("open");

  $("drawerBackdrop")
    ?.classList.remove("open");

}


/* ================= REGISTRATION ================= */

function setupRegistration(){

  if(!$("regNext1"))
    return;


  $("regNext1").onclick = () => {

    const name =
      $("regName").value.trim();

    const phone =
      normalizePhone(
        $("regPhone").value
      );

    const nationalId =
      $("regNationalId")
      .value
      .trim();


    if(name.length < 2){

      toast(
        "Enter your full name."
      );

      return;

    }


    if(!validPhone(phone)){

      toast(
        "Enter a valid Kenyan phone number."
      );

      return;

    }


    if(nationalId.length < 5){

      toast(
        "Enter your National ID."
      );

      return;

    }


    state.user.name =
      name;

    state.user.phone =
      phone;

    state.user.nationalId =
      nationalId;


    $("regStep1")
      .classList
      .add("hidden");

    $("regStep2")
      .classList
      .remove("hidden");


    document
      .querySelectorAll(".step")[1]
      ?.classList
      .add("active");

  };


  $("regNext2").onclick = () => {

    const pin =
      $("regPin").value;

    const confirmPin =
      $("regPin2").value;


    if(!/^\d{4}$/.test(pin)){

      toast(
        "PIN must contain 4 digits."
      );

      return;

    }


    if(pin !== confirmPin){

      toast(
        "PINs do not match."
      );

      return;

    }


    state.user.pin =
      pin;


    $("registrationSummary")
      .innerHTML = `

        <b>
          ${escapeHTML(
            state.user.name
          )}
        </b><br>

        Phone:
        ${escapeHTML(
          state.user.phone
        )}

        <br>

        International:
        ${escapeHTML(
          internationalPhone(
            state.user.phone
          )
        )}

        <br>

        National ID:
        ${escapeHTML(
          state.user.nationalId
        )}

        <br><br>

        Your BEAST ID will be generated
        after confirmation.

      `;


    $("regStep2")
      .classList
      .add("hidden");

    $("regStep3")
      .classList
      .remove("hidden");


    document
      .querySelectorAll(".step")[2]
      ?.classList
      .add("active");

  };


  $("finishRegistration").onclick = () => {

    state.user.beastId =
      generateBeastId();

    state.registered =
      true;


    addNotification(

      "BEAST ID created",

      `Your BEAST ID is ${state.user.beastId}.`

    );


    addSecurity(
      "New BEAST registration completed."
    );


    save();


    toast(
      "BEAST account created."
    );


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

        (

          source.enabled

          ? Number(
              source.balance
            )

          : 0

        );

    },

    0

  );

}


/* ================= SOURCE CARDS ================= */

function renderSources(containerId){

  const container =
    $(containerId);

  if(!container)
    return;


  container.innerHTML =

    Object.entries(
      state.sources
    )

    .map(([key,source]) => {

      const icon =

        key === "mpesa"
        ? "📱"

        : key === "tkash"
        ? "📲"

        : key === "airtel"
        ? "📲"

        : key === "bank"
        ? "🏦"

        : key === "card"
        ? "💳"

        : "🐾";


      let details =
        source.account ||
        "Not linked";


      if(key === "bank" &&
         source.bankName){

        details =
          `${source.bankName} • ${source.account}`;

      }


      if(key === "card"){

        details =
          source.cardName
          ? `${source.cardName} •••• ${source.last4 || "----"}`
          : "Not linked";

      }


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
              ${escapeHTML(details)}
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

    const select =
      $(id);

    if(!select)
      return;


    const current =
      select.value;


    select.innerHTML =

      Object.entries(
        state.sources
      )

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


    if(
      current &&
      state.sources[current]?.enabled
    ){

      select.value =
        current;

    }

  });

}


/* ================= SOURCE MANAGER ================= */

function setupSourceManager(){

  const type =
    $("sourceType");

  const bankFields =
    $("bankSourceFields");

  const cardFields =
    $("cardSourceFields");


  function updateFields(){

    if(!type)
      return;


    if(bankFields){

      bankFields.classList.toggle(

        "hidden",

        type.value !== "bank"

      );

    }


    if(cardFields){

      cardFields.classList.toggle(

        "hidden",

        type.value !== "card"

      );

    }

  }


  type?.addEventListener(
    "change",
    updateFields
  );


  $("saveSourceButton")?.addEventListener(
    "click",
    () => {

      const sourceType =
        type.value;

      const account =
        $("sourceAccount")
        ?.value
        .trim();


      if(
        sourceType !== "wallet" &&
        !account
      ){

        toast(
          "Enter the account or phone number."
        );

        return;

      }


      if(
        sourceType !== "wallet" &&
        sourceType !== "bank" &&
        sourceType !== "card" &&
        !validPhone(account)
      ){

        toast(
          "Enter a valid Kenyan phone number."
        );

        return;

      }


      const source =
        state.sources[sourceType];


      if(!source){

        toast(
          "Invalid payment source."
        );

        return;

      }


      source.enabled =
        true;


      source.account =
        account;


      if(sourceType === "bank"){

        const bankName =
          $("bankName")
          ?.value
          .trim();


        if(!bankName){

          toast(
            "Select or enter the bank name."
          );

          source.enabled =
            false;

          return;

        }


        source.bankName =
          bankName;

      }


      if(sourceType === "card"){

        const cardName =
          $("cardName")
          ?.value
          .trim();

        const last4 =
          $("cardLast4")
          ?.value
          .trim();


        if(!cardName){

          toast(
            "Enter the card name."
          );

          source.enabled =
            false;

          return;

        }


        if(!/^\d{4}$/.test(last4)){

          toast(
            "Enter the last 4 card digits."
          );

          source.enabled =
            false;

          return;

        }


        source.cardName =
          cardName;

        source.last4 =
          last4;

      }


      const balance =
        Number(
          $("sourceBalance")
          ?.value || 0
        );


      if(balance > 0){

        source.balance =
          balance;

      }


      addSecurity(
        `${SOURCE_NAMES[sourceType]} linked to BEAST.`
      );


      addNotification(

        "Payment source linked",

        `${SOURCE_NAMES[sourceType]} is now linked to your BEAST account.`

      );


      save();


      toast(
        `${SOURCE_NAMES[sourceType]} linked successfully.`
      );


      renderEverything();

    }

  );


  updateFields();

}


/* ================= FEES ================= */

function beastFee(amount){

  amount =
    Number(amount || 0);


  if(amount <= 0)
    return 0;


  if(amount <= 1000)
    return 7;


  if(amount <= 10000)
    return 30;


  return 50;

}


function providerCost(
  source,
  amount
){

  amount =
    Number(amount || 0);


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


  if(source === "tkash")
    return amount <= 1500 ? 5 : 10;


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

        const box =
          $(preview);

        if(!box)
          return;


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
      "Peter Otieno",

    "0112345678":
      "BEAST Demo Business"

  };


  if(phone === state.user.phone){

    return {

      name:
        state.user.name,

      phone,

      beastId:
        state.user.beastId,

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

  const box =
    $(id);

  if(!box)
    return;


  box.classList.remove(
    "hidden"
  );


  box.innerHTML = `

    <strong>
      ✓ ${title}
    </strong>

    ${escapeHTML(data.name)}

    <br>

    ${escapeHTML(
      data.phone || data.id
    )}

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

  $("verifyRecipient")?.addEventListener(
    "click",
    () => {

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

    }
  );


  $("sendMoneyButton")?.addEventListener(
    "click",
    () => {

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


      if(
        !recipient ||
        recipient.own
      ){

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

    }
  );

}


/* ================= RECEIVE DESTINATION ================= */

function receiveDestinationFields(){

  const type =
    $("receiveDestinationType")
    ?.value;


  if(!$("receiveDestinationFields"))
    return;


  const fields = {

    pochi:`

      <label>

        Pochi phone / business number

        <input
          id="receiveDestNumber"
          placeholder="0712345678 or +254712345678">

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
      fields[type] ||
      fields.other;

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
    name =
      "Verified Till Merchant";


  if(type === "paybill")
    name =
      "Verified PayBill Business";


  if(type === "bank"){

    name =
      `Verified ${
        $("receiveBankName")
        ?.value
        || "Bank"
      } Account`;

  }


  if(type === "card")
    name =
      "Verified Card Merchant";


  if(type === "other"){

    if(validPhone(value)){

      const recipient =
        getRecipient(value);

      name =
        recipient?.name
        || "Verified BEAST Account";

    }

    else{

      name =
        "Verified BEAST Account";

    }

  }


  return {

    valid:true,

    type,

    id:value,

    name

  };

}


/* ================= RECEIVE ================= */

function setupReceive(){

  $("receiveDestinationType")
    ?.addEventListener(
      "change",
      receiveDestinationFields
    );


  receiveDestinationFields();


  $("verifyBuyer")?.addEventListener(
    "click",
    () => {

      const phone =
        normalizePhone(
          $("buyerPhone").value
        );

      const nationalId =
        $("buyerNationalId")
        .value
        .trim();

      const password =
        $("buyerPassword").value;


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
        .classList
        .remove("hidden");


      $("buyerVerification")
        .innerHTML = `

          <strong>
            ✓ Buyer verified
          </strong>

          ${escapeHTML(
            state.user.name
          )}

          <br>

          ${escapeHTML(
            state.user.phone
          )}

          <br>

          Buyer can authorize payment
          without exposing seller balance.

        `;


      toast(
        "Buyer verified."
      );

    }
  );


  $("verifyReceiveDestination")
    ?.addEventListener(
      "click",
      () => {

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

            name:
              destination.name,

            phone:
              destination.id,

            beastId:
              "Destination verified"

          },

          "Verified destination"

        );


        toast(
          "Destination verified."
        );

      }
    );


  $("buyerPayButton")?.addEventListener(
    "click",
    () => {

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

    }
  );


  /*
    Deposit to BEAST
  */

  $("depositButton")?.addEventListener(
    "click",
    setupDeposit
  );


  $("depositSource")?.addEventListener(
    "change",
    updateDepositPreview
  );


  $("depositAmount")?.addEventListener(
    "input",
    updateDepositPreview
  );


  updateDepositPreview();


  /*
    Agent Deposit
  */

  $("verifyAgentDeposit")?.addEventListener(
    "click",
    verifyAgentDeposit
  );


  $("agentDepositButton")?.addEventListener(
    "click",
    agentDeposit
  );

}


/* ================= DEPOSIT TO BEAST ================= */

function depositProviderCost(
  source,
  amount
){

  amount =
    Number(amount || 0);


  if(
    source === "wallet"
  )
    return 0;


  if(
    source === "mpesa"
  ){

    if(amount <= 100)
      return 0;

    if(amount <= 1500)
      return 5;

    return 10;

  }


  if(
    source === "tkash" ||
    source === "airtel"
  ){

    return amount <= 1500
      ? 5
      : 10;

  }


  if(source === "bank")
    return amount <= 10000
      ? 3
      : 10;


  if(source === "card")
    return amount <= 10000
      ? 8
      : 15;


  return 0;

}


function updateDepositPreview(){

  const box =
    $("depositCostPreview");

  if(!box)
    return;


  const source =
    $("depositSource")
    ?.value;


  const amount =
    Number(
      $("depositAmount")
      ?.value || 0
    );


  if(amount <= 0){

    box.innerHTML = `

      <b>Deposit preview</b>

      <br>

      Enter an amount to calculate
      the deposit details.

    `;

    return;

  }


  const provider =
    depositProviderCost(
      source,
      amount
    );


  box.innerHTML = `

    <b>Deposit to BEAST</b>

    <br>

    Amount:
    ${money(amount)}

    <br>

    Provider cost:
    ${money(provider)}

    <br><br>

    <strong>
      BEAST receives:
      ${money(
        Math.max(
          0,
          amount - provider
        )
      )}
    </strong>

  `;

}


function setupDeposit(){

  const phone =
    normalizePhone(
      $("depositPhone")
      ?.value || ""
    );


  const source =
    $("depositSource")
    ?.value;


  const amount =
    Number(
      $("depositAmount")
      ?.value || 0
    );


  if(!validPhone(phone)){

    toast(
      "Enter the BEAST customer's valid phone number."
    );

    return;

  }


  if(
    phone !== state.user.phone
  ){

    toast(
      "Demo deposit is available for the registered BEAST customer."
    );

    return;

  }


  if(
    !state.sources[source]
  ){

    toast(
      "Select a valid deposit source."
    );

    return;

  }


  if(source === "wallet"){

    toast(
      "BEAST Wallet cannot deposit into itself."
    );

    return;

  }


  if(amount <= 0){

    toast(
      "Enter a deposit amount."
    );

    return;

  }


  authorize(

    "Deposit to BEAST",

    () => {

      completeDeposit({

        phone,

        source,

        amount

      });

    }

  );

}


function completeDeposit(data){

  const source =
    state.sources[
      data.source
    ];


  if(
    !source ||
    !source.enabled
  ){

    toast(
      "Selected deposit source is not enabled."
    );

    return;

  }


  const provider =
    depositProviderCost(
      data.source,
      data.amount
    );


  const received =
    Math.max(
      0,
      Number(data.amount) -
      provider
    );


  if(
    source.balance <
    Number(data.amount)
  ){

    toast(
      `Insufficient ${SOURCE_NAMES[data.source]} balance.`
    );

    return;

  }


  source.balance -=
    Number(data.amount);


  state.sources.wallet.enabled =
    true;


  state.sources.wallet.balance +=
    received;


  state.owner.providerCosts +=
    provider;


  state.owner.transactions++;


  state.owner.volume +=
    Number(data.amount);


  const transaction = {

    reference:
      generateReference(),

    createdAt:
      new Date().toISOString(),

    status:
      "completed",

    type:
      "Deposit to BEAST",

    amount:
      Number(data.amount),

    fee:0,

    providerCost:
      provider,

    totalDeducted:
      Number(data.amount),

    source:
      data.source,

    destination:
      "BEAST Wallet",

    recipient:
      state.user.phone,

    recipientName:
      state.user.name,

    received:
      received,

    description:
      `Deposit from ${SOURCE_NAMES[data.source]} to BEAST Wallet`

  };


  state.transactions.unshift(
    transaction
  );


  addNotification(

    "Deposit completed",

    `${money(received)} was deposited into your BEAST Wallet from ${SOURCE_NAMES[data.source]}. Ref ${transaction.reference}.`

  );


  addSecurity(

    `BEAST deposit authorized from ${SOURCE_NAMES[data.source]}.`

  );


  save();


  toast(
    `Deposit completed. ${money(received)} added to BEAST Wallet.`
  );


  if($("depositAmount"))
    $("depositAmount").value = "";


  renderEverything();

}


/* ================= AGENT DEPOSIT ================= */

function verifyAgentDeposit(){

  const agent =
    normalizePhone(
      $("agentDepositAgent")
      ?.value || ""
    );


  const customerPhone =
    normalizePhone(
      $("agentDepositPhone")
      ?.value || ""
    );


  const nationalId =
    $("agentDepositNationalId")
    ?.value
    .trim();


  if(!validPhone(agent)){

    toast(
      "Enter a valid Safaricom agent number."
    );

    return;

  }


  if(
    !REGISTERED_AGENTS[agent]
  ){

    $("agentDepositVerification")
      ?.classList
      .remove("hidden");


    if($("agentDepositVerification")){

      $("agentDepositVerification")
        .innerHTML = `

          <strong>
            ✕ Agent not verified
          </strong>

          <br>

          This demo only accepts a
          registered Safaricom agent.

        `;

    }


    toast(
      "Agent verification failed."
    );

    return;

  }


  if(!validPhone(customerPhone)){

    toast(
      "Enter a valid customer phone number."
    );

    return;

  }


  if(
    customerPhone !==
    state.user.phone
  ){

    toast(
      "Customer is not the registered demo BEAST customer."
    );

    return;

  }


  if(
    nationalId !==
    state.user.nationalId
  ){

    toast(
      "Customer National ID does not match."
    );

    return;

  }


  $("agentDepositVerification")
    ?.classList
    .remove("hidden");


  if($("agentDepositVerification")){

    $("agentDepositVerification")
      .innerHTML = `

        <strong>
          ✓ Safaricom agent verified
        </strong>

        <br>

        Agent:
        ${escapeHTML(
          REGISTERED_AGENTS[agent]
        )}

        <br>

        Agent number:
        ${escapeHTML(agent)}

        <br>

        Customer:
        ${escapeHTML(
          state.user.name
        )}

        <br>

        Customer phone:
        ${escapeHTML(
          customerPhone
        )}

        <br>

        National ID verified.

      `;

  }


  addSecurity(
    `Safaricom agent ${agent} verified for BEAST deposit.`
  );


  save();


  toast(
    "Safaricom agent and customer verified."
  );

}


function agentDeposit(){

  const verification =
    $("agentDepositVerification");


  if(
    !verification ||
    verification.classList.contains("hidden")
  ){

    toast(
      "Verify the Safaricom agent and customer first."
    );

    return;

  }


  const agent =
    normalizePhone(
      $("agentDepositAgent")
      .value
    );


  const customerPhone =
    normalizePhone(
      $("agentDepositPhone")
      .value
    );


  const nationalId =
    $("agentDepositNationalId")
    .value
    .trim();


  const amount =
    Number(
      $("agentDepositAmount")
      .value
    );


  const pin =
    $("agentDepositPin")
    .value;


  if(
    !REGISTERED_AGENTS[agent]
  ){

    toast(
      "Agent is not registered."
    );

    return;

  }


  if(
    customerPhone !==
    state.user.phone ||
    nationalId !==
    state.user.nationalId
  ){

    toast(
      "Customer verification failed."
    );

    return;

  }


  if(amount <= 0){

    toast(
      "Enter the deposit amount."
    );

    return;

  }


  if(!/^\d{4}$/.test(pin)){

    toast(
      "Enter the customer's 4-digit BEAST PIN."
    );

    return;

  }


  if(pin !== state.user.pin){

    addSecurity(
      "Failed Agent Deposit PIN authorization attempt."
    );

    save();


    toast(
      "Incorrect BEAST PIN."
    );

    return;

  }


  completeAgentDeposit({

    agent,

    customerPhone,

    amount

  });

}


function completeAgentDeposit(data){

  state.sources.wallet.enabled =
    true;


  state.sources.wallet.balance +=
    Number(data.amount);


  const agentCost =
    0;


  state.owner.providerCosts +=
    agentCost;


  state.owner.transactions++;


  state.owner.volume +=
    Number(data.amount);


  const transaction = {

    reference:
      generateReference(),

    createdAt:
      new Date().toISOString(),

    status:
      "completed",

    type:
      "Agent Deposit",

    amount:
      Number(data.amount),

    fee:0,

    providerCost:
      agentCost,

    totalDeducted:0,

    source:
      "Agent",

    destination:
      "BEAST Wallet",

    recipient:
      data.customerPhone,

    recipientName:
      state.user.name,

    agent:
      data.agent,

    description:
      `Cash deposit through verified Safaricom agent ${data.agent}`

  };


  state.transactions.unshift(
    transaction
  );


  addNotification(

    "Agent deposit completed",

    `${money(data.amount)} was deposited into your BEAST Wallet through a verified Safaricom agent. Ref ${transaction.reference}.`

  );


  addSecurity(

    `Agent deposit authorized through Safaricom agent ${data.agent}.`

  );


  save();


  toast(
    `Agent deposit completed. ${money(data.amount)} added to BEAST Wallet.`
  );


  if($("agentDepositAmount"))
    $("agentDepositAmount").value = "";


  if($("agentDepositPin"))
    $("agentDepositPin").value = "";


  renderEverything();

}


/* ================= WITHDRAW ================= */

function setupWithdraw(){

  $("verifyAgent")?.addEventListener(
    "click",
    () => {

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
        .classList
        .remove("hidden");


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

    }
  );


  $("withdrawButton")?.addEventListener(
    "click",
    () => {

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

    }
  );

}


/* ================= LIPA NA ================= */

function lipaFields(){

  const type =
    $("lipaType")
    ?.value;


  if(!$("lipaDestinationFields"))
    return;


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

  else if(type === "pochi"){

    $("lipaDestinationFields")
      .innerHTML = `

        <label>

          Pochi phone / business number

          <input
            id="lipaDestNumber"
            placeholder="0712345678 or +254712345678">

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
    ?.addEventListener(
      "change",
      lipaFields
    );


  lipaFields();


  $("verifyLipa")?.addEventListener(
    "click",
    () => {

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

        <br>

        Business:
        ${escapeHTML(value)}

        <br>

        Method:
        ${escapeHTML(
          SOURCE_NAMES[
            $("lipaMethod").value
          ]
          || $("lipaMethod").value
        )}

      `;

    }
  );


  $("lipaPayButton")?.addEventListener(
    "click",
    () => {

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
              $("lipaDestNumber")
              .value,

            recipientName:
              "Verified Business",

            description:
              `${$("lipaType").value} payment`

          });

        }

      );

    }
  );

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


  $("authorizationPin")
    .value = "";


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

  pendingAction =
    null;


  $("pinModal")
    .classList
    .add("hidden");

}


function setupPin(){

  $("confirmPin")?.addEventListener(
    "click",
    () => {

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

    }
  );


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


  if(
    !source ||
    !source.enabled
  ){

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


  const balanceBefore =
    source.balance;


  source.balance -=
    total;


  state.owner.fees +=
    fee;


  state.owner.providerCosts +=
    provider;


  state.owner.transactions++;


  state.owner.volume +=
    amount;


  const transaction = {

    reference:
      generateReference(),

    createdAt:
      new Date().toISOString(),

    status:
      "completed",

    type:
      data.type,

    amount,

    fee,

    providerCost:
      provider,

    totalDeducted:
      total,

    source:
      data.source,

    recipient:
      data.recipient,

    recipientName:
      data.recipientName,

    description:
      data.description,

    balanceBefore,

    balanceAfter:
      source.balance

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

    $("sendPhone").value =
      "";

    $("sendAmount").value =
      "";


    $("recipientVerification")
      .classList
      .add("hidden");

  }


  if(data.type === "Buyer Payment"){

    $("receiveAmount").value =
      "";


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
    state.notifications
    .slice(0,100);


  save();

}


function renderNotifications(){

  const box =
    $("notificationList");

  if(!box)
    return;


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
    .forEach(
      n => n.read=true
    );


  save();


  updateNotificationBadge();

}


function updateNotificationBadge(){

  const unread =
    state.notifications
    .filter(
      n => !n.read
    )
    .length;


  if($("notificationBadge")){

    $("notificationBadge")
      .textContent =
      unread;

  }

}


/* ================= SECURITY ================= */

function addSecurity(message){

  state.securityEvents.unshift({

    message,

    createdAt:
      new Date().toISOString()

  });


  state.securityEvents =
    state.securityEvents
    .slice(0,100);

}


function renderSecurity(){

  const box =
    $("securityList");

  if(!box)
    return;


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


/* ================= CAMERA SECURITY ================= */

function setSecurityStatus(
  id,
  text,
  className=""
){

  const element =
    $(id);

  if(!element)
    return;


  element.textContent =
    text;


  element.classList.remove(
    "green",
    "red",
    "blue"
  );


  if(className){

    element.classList.add(
      className
    );

  }

}


async function startFrontCamera(){

  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){

    setSecurityStatus(
      "cameraStatus",
      "Not supported",
      "red"
    );


    toast(
      "This browser does not provide camera access."
    );

    return;

  }


  try{

    if(cameraStream){

      stopFrontCamera();

    }


    setSecurityStatus(
      "cameraStatus",
      "Requesting permission...",
      "blue"
    );


    cameraStream =
      await navigator.mediaDevices.getUserMedia({

        video:{
          facingMode:{
            ideal:"user"
          }
        },

        audio:false

      });


    const video =
      $("securityCameraPreview");


    if(video){

      video.srcObject =
        cameraStream;

      video.classList.remove(
        "hidden"
      );

      await video.play()
        .catch(() => {});

    }


    setSecurityStatus(
      "cameraStatus",
      "FRONT CAMERA ACTIVE",
      "green"
    );


    addSecurity(
      "Front camera security check activated with user permission."
    );


    save();


    toast(
      "Front camera security check is active."
    );

  }catch(error){

    console.error(error);


    setSecurityStatus(
      "cameraStatus",
      "Permission denied / unavailable",
      "red"
    );


    addSecurity(
      "Front camera security check could not start."
    );


    save();


    toast(
      "Camera permission was not granted."
    );

  }

}


function stopFrontCamera(){

  if(cameraStream){

    cameraStream
      .getTracks()
      .forEach(track => {
        track.stop();
      });

    cameraStream =
      null;

  }


  const video =
    $("securityCameraPreview");


  if(video){

    video.pause();

    video.srcObject =
      null;

    video.classList.add(
      "hidden"
    );

  }


  setSecurityStatus(
    "cameraStatus",
    "CAMERA OFF",
    "red"
  );

}


function checkCaptureSecurity(){

  const captureStatus =
    $("captureStatus");


  const visibilityStatus =
    $("visibilityStatus");


  if(visibilityStatus){

    if(document.hidden){

      visibilityStatus.textContent =
        "APP HIDDEN";

      visibilityStatus.classList
        .remove("green","blue");

      visibilityStatus.classList
        .add("red");

    }

    else{

      visibilityStatus.textContent =
        "APP VISIBLE";

      visibilityStatus.classList
        .remove("red","blue");

      visibilityStatus.classList
        .add("green");

    }

  }


  /*
    Browsers intentionally limit reliable
    detection of Android screen recording.

    This does NOT claim to detect every
    recorder application.
  */

  if(captureStatus){

    if(
      "visibilityState" in document &&
      document.visibilityState === "visible"
    ){

      captureStatus.textContent =
        "NO BROWSER CAPTURE SIGNAL";

      captureStatus.classList
        .remove("red","blue");

      captureStatus.classList
        .add("green");

    }

  }

}


function setupCameraSecurity(){

  $("cameraCheckButton")
    ?.addEventListener(
      "click",
      startFrontCamera
    );


  $("stopCameraButton")
    ?.addEventListener(
      "click",
      () => {

        stopFrontCamera();


        addSecurity(
          "Front camera security check stopped."
        );


        save();

      }
    );


  document.addEventListener(
    "visibilitychange",
    () => {

      checkCaptureSecurity();


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


  window.addEventListener(
    "blur",
    () => {

      if(
        state.settings.screenSecurity
      ){

        checkCaptureSecurity();

      }

    }
  );


  window.addEventListener(
    "focus",
    () => {

      checkCaptureSecurity();

    }
  );


  checkCaptureSecurity();

}


/* ================= HISTORY ================= */

function renderHistory(){

  const box =
    $("historyList");

  if(!box)
    return;


  if(!state.transactions.length){

    box.innerHTML =
      `<div class="panel muted">

        No transactions yet.

      </div>`;

    return;

  }


  box.innerHTML =

    state.transactions

    .map(transaction => {

      const direction =
        transaction.type === "Deposit to BEAST" ||
        transaction.type === "Agent Deposit"

        ? "+"

        : "-";


      return `

      <div class="list-item">

        <strong>

          ${escapeHTML(
            transaction.type
          )}

        </strong>


        <span>

          ${direction}

          ${money(
            transaction.amount
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
            || transaction.destination
            || "-"
          )}

          <br>

          Source:
          ${escapeHTML(
            SOURCE_NAMES[
              transaction.source
            ]
            || transaction.source
            || "-"
          )}

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
          ${money(
            transaction.fee
          )}

          ·

          Provider:
          ${money(
            transaction.providerCost
          )}

        </small>

      </div>

      `;

    })

    .join("");

}


/* ================= PROFILE ================= */

function renderProfile(){

  const box =
    $("profileDetails");

  if(!box)
    return;


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

        International:

        ${escapeHTML(
          internationalPhone(
            state.user.phone
          ) ||
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

        ${money(
          totalBalance()
        )}

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


  if(
    !locked ||
    !dashboard
  )
    return;


  if(state.adminUnlocked){

    locked.classList.add(
      "hidden"
    );


    dashboard.classList.remove(
      "hidden"
    );


    $("ownerFees")
      .textContent =
      money(
        state.owner.fees
      );


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

  $("adminLoginButton")
    ?.addEventListener(
      "click",
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


        state.adminUnlocked =
          true;


        save();


        renderAdmin();


        toast(
          "BEAST Admin unlocked."
        );

      }
    );

}


/* ================= BALANCE CHECK ================= */

function setupBalance(){

  $("loginButton")
    ?.addEventListener(
      "click",
      () => {

        const account =
          normalizePhone(
            $("loginAccount").value
          );


        const name =
          $("loginName")
          .value
          .trim();


        if(

          account !==
          state.user.phone

          ||

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


        $("loginBalance")
          .innerHTML = `

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

          <br>

          Phone:
          ${escapeHTML(
            internationalPhone(
              state.user.phone
            )
          )}

          <br><br>

          <strong
            style="font-size:22px"
          >

            ${money(
              totalBalance()
            )}

          </strong>

        `;

      }
    );

}


/* ================= SETTINGS ================= */

function setupSettings(){

  $("darkModeButton")
    ?.addEventListener(
      "click",
      () => setTheme("dark")
    );


  $("lightModeButton")
    ?.addEventListener(
      "click",
      () => setTheme("light")
    );


  $("notificationsToggle")
    ?.addEventListener(
      "change",
      event => {

        state.settings.notifications =
          event.target.checked;


        save();

      }
    );


  $("screenSecurityToggle")
    ?.addEventListener(
      "change",
      event => {

        state.settings.screenSecurity =
          event.target.checked;


        save();

      }
    );


  $("biometricToggle")
    ?.addEventListener(
      "change",
      event => {

        state.settings.biometric =
          event.target.checked;


        save();

      }
    );


  $("changePinButton")
    ?.addEventListener(
      "click",
      () => {

        const oldPin =
          $("oldPin").value;


        const newPin =
          $("newPin").value;


        const confirmPin =
          $("confirmNewPin").value;


        if(
          oldPin !==
          state.user.pin
        ){

          toast(
            "Current PIN is incorrect."
          );

          return;

        }


        if(

          !/^\d{4}$/.test(
            newPin
          )

          ||

          newPin !==
          confirmPin

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


        $("oldPin").value =
          "";

        $("newPin").value =
          "";

        $("confirmNewPin").value =
          "";

      }
    );


  $("resetDemo")
    ?.addEventListener(
      "click",
      () => {

        if(
          !confirm(
            "Reset all BEAST demo data?"
          )
        )
          return;


        localStorage.removeItem(
          STORAGE_KEY
        );


        location.reload();

      }
    );

}


/* ================= MENU ================= */

function setupMenu(){

  $("menuButton")
    ?.addEventListener(
      "click",
      openMenu
    );


  $("closeMenu")
    ?.addEventListener(
      "click",
      closeMenu
    );


  $("drawerBackdrop")
    ?.addEventListener(
      "click",
      closeMenu
    );


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


  $("notificationButton")
    ?.addEventListener(
      "click",
      () => showScreen(
        "notifications"
      )
    );


  $("refreshBalance")
    ?.addEventListener(
      "click",
      () => {

        renderEverything();


        toast(
          "Balance refreshed."
        );

      }
    );

}


/* ================= RENDER HOME ================= */

function renderHome(){

  if(!state.registered)
    return;


  if($("welcomeText")){

    $("welcomeText")
      .textContent =
      `Welcome, ${state.user.name}.`;

  }


  if($("dashboardBeastId")){

    $("dashboardBeastId")
      .textContent =
      state.user.beastId;

  }


  if($("menuUser")){

    $("menuUser")
      .textContent =
      state.user.name;

  }


  if($("totalBalance")){

    $("totalBalance")
      .textContent =
      money(
        totalBalance()
      );

  }

}


function renderSettings(){

  if($("notificationsToggle")){

    $("notificationsToggle")
      .checked =
      state.settings.notifications;

  }


  if($("screenSecurityToggle")){

    $("screenSecurityToggle")
      .checked =
      state.settings.screenSecurity;

  }


  if($("biometricToggle")){

    $("biometricToggle")
      .checked =
      state.settings.biometric;

  }

}


/* ================= RENDER ALL ================= */

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


  updateDepositPreview();


  updateNotificationBadge();


  checkCaptureSecurity();

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

  setupSourceManager();

  setupCameraSecurity();

  loadTheme();


  if(state.registered){

    $("registrationScreen")
      ?.classList
      .remove("active");


    $("homeScreen")
      ?.classList
      .add("active");

  }


  renderEverything();


  console.log(
    "MONEY TRANSFER BEAST loaded."
  );

}


initialize();

});