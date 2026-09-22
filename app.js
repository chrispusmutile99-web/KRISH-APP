/* MONEY TRANSFER BEAST — TEST ENGINE */
const KEY="mtb_test_v1";
const DEMO_PIN="1234";
const BUYER_PASSWORD="beast123";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{balance:5000,history:[],dark:false};
let pending=null,receiveSession=false,cameraStream=null;
const $=id=>document.getElementById(id);
const money=n=>`KSh ${Number(n).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const toast=m=>{let t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.x);toast.x=setTimeout(()=>t.classList.remove("show"),2600)};
const validPhone=v=>/^(07|01)\d{8}$/.test(String(v).replace(/\s/g,""));
const validAmount=v=>Number(v)>0&&Number(v)<=state.balance;
function time(){let d=new Date();return{date:d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),time:d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fee(a){return a<1000?7:a<=10000?30:50}
function update(){ $("balance").textContent=money(state.balance);$("historyBalance").textContent=money(state.balance);$("historyCount").textContent=state.history.length}
function showPanel(id){document.querySelectorAll(".panel").forEach(x=>x.classList.add("hidden"));$(id)?.classList.remove("hidden");$(id)?.scrollIntoView({behavior:"smooth",block:"start"})}
document.querySelectorAll(".quick-btn").forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));
$("themeBtn").onclick=()=>{state.dark=!state.dark;document.body.classList.toggle("dark",state.dark);$("themeBtn").textContent=state.dark?"🌙":"☀️";save()};
$("copyBeastBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("beastId").textContent);toast("BEAST ID copied.")}catch{toast($("beastId").textContent)}};

let sv=false;
$("verifySendBtn").onclick=()=>{let p=$("sendPhone").value.trim();if(!validPhone(p)){sv=false;$("sendRecipientBox").classList.add("hidden");$("sendBtn").disabled=true;return toast("Enter a valid Kenyan phone number.")}sv=true;$("sendRecipientName").textContent="JANE WANJIKU KAMAU";$("sendRecipientId").textContent=p+" • VERIFIED";$("sendRecipientBox").classList.remove("hidden");checkSend();toast("Recipient verified.")};
function checkSend(){$("sendBtn").disabled=!(sv&&validAmount($("sendAmount").value))}
$("sendAmount").oninput=checkSend;
$("sendBtn").onclick=()=>{let a=Number($("sendAmount").value);if(!validAmount(a))return toast("Invalid amount or balance.");openAuth({type:"SEND MONEY",title:"Send Money",recipient:"JANE WANJIKU KAMAU",destination:$("sendPhone").value,amount:a,source:$("sendSource").value})};

document.querySelectorAll(".mode-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".mode-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".lipa-mode").forEach(x=>x.classList.add("hidden"));$(b.dataset.lipaMode+"Mode").classList.remove("hidden")});

function setupBusiness(prefix,verifyId,boxId,nameId,idId,btnId,amountId,pinId,type,title,sourceId,validator,values){
let ok=false;
$(verifyId).onclick=()=>{let value=validator();if(!value){ok=false;$(boxId).classList.add("hidden");$(btnId).disabled=true;return toast("Enter valid business details.")}ok=true;$(nameId).textContent=values.name;$(idId).textContent=values.id();$(boxId).classList.remove("hidden");check();toast("Business destination verified.")};
function check(){let a=Number($(amountId).value);let p=pinId?$(pinId).value:"1234";$(btnId).disabled=!(ok&&a>0&&a<=state.balance&&p.length===4)}
$(amountId).oninput=check;if(pinId)$(pinId).oninput=check;
$(btnId).onclick=()=>{let a=Number($(amountId).value);if(!validAmount(a))return toast("Invalid amount or balance.");openAuth({type,title,recipient:values.name,destination:values.id(),amount:a,source:$(sourceId).value})}
}
setupBusiness("pochi","verifyPochiBtn","pochiVerifyBox","pochiName","pochiId","pochiBtn","pochiAmount","pochiPin","POCHI PAYMENT","Pochi la Biashara","pochiSource",()=>validPhone($("pochiPhone").value),{name:"BEAST BUSINESS • MAMA SHOP",id:()=>$("pochiPhone").value});
setupBusiness("till","verifyTillBtn","tillVerifyBox","tillName","tillId","tillBtn","tillAmount","tillPin","TILL PAYMENT","Till Payment","tillSource",()=>/^\d{5,10}$/.test($("tillNumber").value),{name:"BEAST SUPERMARKET LTD",id:()=> "Till "+$("tillNumber").value});
setupBusiness("paybill","verifyPaybillBtn","paybillVerifyBox","paybillName","paybillId","paybillBtn","paybillAmount","paybillPin","PAYBILL","PayBill","paybillSource",()=>/^\d{5,10}$/.test($("paybillBusiness").value)&&$("paybillAccount").value.trim().length>=3,{name:"KENYA POWER DEMO",id:()=> "Business "+$("paybillBusiness").value+" • Account "+$("paybillAccount").value});

$("receiveLoginBtn").onclick=()=>{let id=$("receiveLoginCode").value.trim();if(!((id.toUpperCase().includes("BEAST-"))||validPhone(id))||$("receivePassword").value!==BUYER_PASSWORD)return toast("Demo login: 0700000001 / beast123");receiveSession=true;$("receiveLogin").classList.add("hidden");$("receiveTransfer").classList.remove("hidden");$("receiveUserLabel").textContent=id+" • TEMPORARY SESSION";toast("Buyer authenticated.")};
let rv=false;
$("verifyReceiveBtn").onclick=()=>{let r=$("receiveRecipient").value.trim();if(!r){rv=false;$("receiveVerifyBox").classList.add("hidden");return toast("Enter a destination.")}rv=true;$("receiveRecipientName").textContent="VERIFIED BUSINESS / RECIPIENT";$("receiveRecipientId").textContent=r+" • VERIFIED";$("receiveVerifyBox").classList.remove("hidden");checkReceive();toast("Destination verified.")};
function checkReceive(){$("receiveTransferBtn").disabled=!(rv&&Number($("receiveAmount").value)>0)}
$("receiveAmount").oninput=checkReceive;
$("receiveTransferBtn").onclick=()=>{let a=Number($("receiveAmount").value);if(!validAmount(a))return toast("Invalid amount or balance.");openAuth({type:"RECEIVE TERMINAL PAYMENT",title:$("receiveDestinationType").value,recipient:"VERIFIED BUSINESS / RECIPIENT",destination:$("receiveRecipient").value,amount:a,source:$("receiveSource").value,receiveSession:true})};
$("receiveLogoutBtn").onclick=()=>endReceive();
function endReceive(){receiveSession=false;rv=false;$("receiveLogin").classList.remove("hidden");$("receiveTransfer").classList.add("hidden");$("receiveLoginCode").value="";$("receivePassword").value="";$("receiveRecipient").value="";$("receiveAmount").value="";$("receiveVerifyBox").classList.add("hidden");$("receiveTransferBtn").disabled=true;toast("Buyer session ended. Receive is locked.")}

let av=false;
$("verifyAgentBtn").onclick=()=>{let p=$("withdrawPhone").value.trim();if(!validPhone(p)){av=false;$("agentVerifyBox").classList.add("hidden");$("withdrawBtn").disabled=true;return toast("Enter valid agent number.")}av=true;$("agentName").textContent="BEAST AGENT • PETER KAMAU";$("agentId").textContent=p+" • VERIFIED AGENT";$("agentVerifyBox").classList.remove("hidden");checkW();toast("Agent verified.")};
function checkW(){$("withdrawBtn").disabled=!(av&&validAmount($("withdrawAmount").value))}
$("withdrawAmount").oninput=checkW;
$("withdrawBtn").onclick=()=>{let a=Number($("withdrawAmount").value);if(!validAmount(a))return toast("Invalid amount or balance.");openAuth({type:"WITHDRAWAL",title:"Agent Withdrawal",recipient:"BEAST AGENT • PETER KAMAU",destination:$("withdrawPhone").value,amount:a,source:$("withdrawSource").value})};

function openAuth(t){pending={...t,fee:fee(t.amount)};$("authDetails").innerHTML=`<div class="auth-row"><span>Type</span><strong>${esc(t.type)}</strong></div><div class="auth-row"><span>Recipient</span><strong>${esc(t.recipient)}</strong></div><div class="auth-row"><span>Destination</span><strong>${esc(t.destination)}</strong></div><div class="auth-row"><span>Amount</span><strong>${money(t.amount)}</strong></div><div class="auth-row"><span>Fee</span><strong>${money(pending.fee)}</strong></div><div class="auth-row"><span>Total</span><strong>${money(t.amount+pending.fee)}</strong></div><div class="auth-row"><span>Source</span><strong>${esc(t.source)}</strong></div>`;$("authPin").value="";$("authModal").classList.remove("hidden")}
$("closeModalBtn").onclick=()=>{$("authModal").classList.add("hidden");pending=null};
$("confirmAuthBtn").onclick=()=>{if(!pending)return;if($("authPin").value!==DEMO_PIN)return toast("Wrong demo PIN. Use 1234.");complete(pending)};
function complete(t){let total=t.amount+t.fee;if(total>state.balance)return toast("Insufficient demo balance including fee.");state.balance-=total;let x=time(),r={id:"BEAST-"+Date.now().toString().slice(-8),...t,date:x.date,time:x.time,total,balanceAfter:state.balance,status:"Successful"};state.history.unshift(r);save();update();renderHistory();$("authModal").classList.add("hidden");pending=null;showReceipt(r);if(t.receiveSession)endReceive()}
function showReceipt(r){$("receiptDetails").innerHTML=`<div class="receipt-row"><span>Status</span><strong>✓ ${esc(r.status)}</strong></div><div class="receipt-row"><span>Transaction ID</span><strong>${esc(r.id)}</strong></div><div class="receipt-row"><span>Type</span><strong>${esc(r.type)}</strong></div><div class="receipt-row"><span>Recipient</span><strong>${esc(r.recipient)}</strong></div><div class="receipt-row"><span>Destination</span><strong>${esc(r.destination)}</strong></div><div class="receipt-row"><span>Amount</span><strong>${money(r.amount)}</strong></div><div class="receipt-row"><span>Fee</span><strong>${money(r.fee)}</strong></div><div class="receipt-row"><span>Total</span><strong>${money(r.total)}</strong></div><div class="receipt-row"><span>Source</span><strong>${esc(r.source)}</strong></div><div class="receipt-row"><span>Date</span><strong>${esc(r.date)}</strong></div><div class="receipt-row"><span>Time</span><strong>${esc(r.time)}</strong></div><div class="receipt-row"><span>Balance After</span><strong>${money(r.balanceAfter)}</strong></div>`;$("receiptModal").classList.remove("hidden")}
$("closeReceiptBtn").onclick=$("receiptDoneBtn").onclick=()=>$("receiptModal").classList.add("hidden");

function icon(t){if(t.includes("SEND"))return"💸";if(t.includes("POCHI"))return"📱";if(t.includes("TILL"))return"🏪";if(t.includes("PAYBILL"))return"🧾";if(t.includes("WITHDRAW"))return"🏧";return"📥"}
function renderHistory(){let l=$("historyList"),e=$("emptyHistory");if(!state.history.length){l.innerHTML="";e.classList.remove("hidden");return}e.classList.add("hidden");l.innerHTML=state.history.map((r,i)=>`<div class="history-item" data-i="${i}"><div class="history-icon">${icon(r.type)}</div><div class="history-main"><strong>${esc(r.recipient)}</strong><small>${esc(r.type)} • ${esc(r.date)} • ${esc(r.time)}</small><small>${esc(r.destination)} • ${esc(r.source)}</small></div><div class="history-amount"><strong>-${money(r.total)}</strong><small>✓ ${esc(r.status)}</small></div></div>`).join("");document.querySelectorAll(".history-item").forEach(x=>x.onclick=()=>showReceipt(state.history[Number(x.dataset.i)]))}
$("cameraBtn").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("cameraPreview").srcObject=cameraStream;$("cameraPreview").style.display="block";$("cameraPlaceholder").style.display="none";$("cameraBtn").textContent="✓ CAMERA CHECK ACTIVE";toast("Camera permission granted for demo check.")}catch{toast("Camera permission was not granted.")}};
document.body.classList.toggle("dark",state.dark);$("themeBtn").textContent=state.dark?"🌙":"☀️";update();renderHistory();
