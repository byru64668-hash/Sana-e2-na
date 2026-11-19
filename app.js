const $=s=>document.querySelector(s);
const DB_KEY="schooltrack_eapihs_v1", CFG_KEY="schooltrack_supabase_config", SESSION_KEY="schooltrack_session";
let state={items:[],reports:[],history:[],queue:[]},role="guest",adminToken=null;
const load=()=>{try{state={...state,...JSON.parse(localStorage.getItem(DB_KEY)||"{}")}}catch(e){}};
const save=()=>localStorage.setItem(DB_KEY,JSON.stringify(state));
const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG_KEY)||"{}")}catch(e){return {}}};
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)};
const stamp=()=>new Date().toLocaleString();
const record=(action,detail)=>{state.history.unshift({action,detail,at:stamp()});state.history=state.history.slice(0,200);save();render()};
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function render(){
 const items=state.items;
 $("#totalCount").textContent=items.reduce((a,x)=>a+Number(x.quantity||0),0);
 $("#availableCount").textContent=items.reduce((a,x)=>a+Number(x.available??x.quantity??0),0);
 $("#borrowedCount").textContent=items.reduce((a,x)=>a+Number(x.borrowed||0),0);
 $("#repairCount").textContent=items.filter(x=>x.condition==="Needs Repair").length;
 $("#missingCount").textContent=items.filter(x=>x.condition==="Missing").length;
 $("#lowCount").textContent=items.filter(x=>Number(x.available??x.quantity??0)<=Number(x.threshold??2)).length;
 const q=($("#searchBox")?.value||"").toLowerCase();
 $("#inventoryList").innerHTML=items.filter(x=>(x.name+" "+x.category).toLowerCase().includes(q)).map(x=>`<article class="item"><div><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.category)} · ${escapeHtml(x.location||"No location")}</p><p>Available: ${x.available??x.quantity} | Borrowed: ${x.borrowed||0} | Condition: ${escapeHtml(x.condition)}</p><small>Responsible: ${escapeHtml(x.responsible||"Not assigned")}</small></div><div class="item-actions">${role==="admin"?`<button class="secondary" data-act="borrow" data-id="${x.id}">Borrow</button><button class="secondary" data-act="return" data-id="${x.id}">Return</button><button class="secondary" data-act="repair" data-id="${x.id}">Repair</button><button class="danger" data-act="delete" data-id="${x.id}">Delete</button>`:""}</div></article>`).join("")||'<div class="panel-card empty">No inventory items found.</div>';
 $("#recentActivity").innerHTML=state.history.slice(0,5).map(h=>`<p><b>${escapeHtml(h.action)}</b> — ${escapeHtml(h.detail)} <small>${escapeHtml(h.at)}</small></p>`).join("")||"No activity yet.";
 $("#historyList").innerHTML=state.history.map(h=>`<p><b>${escapeHtml(h.action)}</b> — ${escapeHtml(h.detail)} <small>${escapeHtml(h.at)}</small></p>`).join("")||"No history yet.";
 $("#reportList").innerHTML=state.reports.map(r=>`<article class="item"><div><b>${escapeHtml(r.type)}</b><p>${escapeHtml(r.details)}</p><small>${escapeHtml(r.item||"No related item")} · ${escapeHtml(r.status)} · ${escapeHtml(r.at)}</small></div></article>`).join("")||"No reports yet.";
 $("#roleLabel").textContent=role==="admin"?"Administrator":"Guest";
}
function queueChange(type,payload){state.queue.push({id:crypto.randomUUID(),type,payload,created_at:new Date().toISOString()});save()}
function showApp(){ $("#accessPanel").classList.add("hidden");$("#app").classList.remove("hidden");render(); }
function setPage(page){document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$("#page-"+page).classList.remove("hidden");document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page))}
async function api(action,data={}){
 const c=cfg();if(!c.url||!c.key)throw new Error("Add your Supabase URL and anon key in Account settings first.");
 const res=await fetch(c.url.replace(/\/$/,"")+"/functions/v1/schooltrack-api",{method:"POST",headers:{"Content-Type":"application/json","apikey":c.key,"Authorization":"Bearer "+(adminToken||c.key)},body:JSON.stringify({action,data,token:adminToken})});
 const out=await res.json();if(!res.ok||out.error)throw new Error(out.error||"Request failed");return out;
}
async function sync(){
 const c=cfg();if(!navigator.onLine){$("#syncMessage").textContent="Offline: changes remain saved on this device.";toast("Offline — saved locally");return}
 if(!c.url||!c.key){$("#syncMessage").textContent="Supabase is not configured yet. Local data is safe on this device.";toast("Configure Supabase to share data");return}
 try{
   const result=await api("sync",{items:state.items,reports:state.reports,history:state.history,queue:state.queue});
   if(result.items)state.items=result.items;if(result.reports)state.reports=result.reports;
   state.queue=[];save();render();$("#syncMessage").textContent="Last successful sync: "+stamp();toast("Synchronization completed");
 }catch(e){$("#syncMessage").textContent="Sync not completed: "+e.message;toast("Sync pending — local data retained")}
}
$("#guestBtn").onclick=()=>{role="guest";showApp()};
$("#adminBtn").onclick=()=>{$("#dialog").classList.remove("hidden");$("#adminCode").value="";$("#adminCode").focus()};
$("#cancelDialog").onclick=()=>$("#dialog").classList.add("hidden");
$("#confirmDialog").onclick=async()=>{const code=$("#adminCode").value;if(!code)return toast("Enter the admin code");try{const r=await api("admin_login",{code});adminToken=r.token;role="admin";$("#dialog").classList.add("hidden");showApp();toast("Admin access verified")}catch(e){toast("Admin sign-in failed: "+e.message)}};
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>setPage(b.dataset.page));
$("#itemForm").onsubmit=e=>{e.preventDefault();if(role!=="admin")return toast("Admin access required");const f=new FormData(e.target);const item={id:crypto.randomUUID(),name:f.get("name").trim(),category:f.get("category"),quantity:Number(f.get("quantity")),available:Number(f.get("quantity")),borrowed:0,condition:f.get("condition"),location:f.get("location"),responsible:f.get("responsible"),threshold:Number(f.get("threshold")),updated_at:new Date().toISOString()};state.items.push(item);queueChange("upsert_item",item);save();record("Item added",item.name);e.target.reset();toast("Saved locally; sync when online");setPage("inventory")};
$("#inventoryList").onclick=e=>{const b=e.target.closest("button[data-act]");if(!b)return;if(role!=="admin")return toast("Admin access required");const item=state.items.find(x=>x.id===b.dataset.id);if(!item)return;const act=b.dataset.act;
 if(act==="delete"){if(!confirm("Delete "+item.name+"?"))return;state.items=state.items.filter(x=>x.id!==item.id);queueChange("delete_item",{id:item.id});record("Item deleted",item.name)}
 if(act==="borrow"){if(Number(item.available??item.quantity)<=0)return toast("Out of stock");item.available=Number(item.available??item.quantity)-1;item.borrowed=Number(item.borrowed||0)+1;queueChange("upsert_item",item);record("Item borrowed",item.name)}
 if(act==="return"){if(Number(item.borrowed||0)<=0)return toast("No borrowed quantity");item.borrowed--;item.available=Number(item.available??0)+1;queueChange("upsert_item",item);record("Item returned",item.name)}
 if(act==="repair"){item.condition="Needs Repair";queueChange("upsert_item",item);record("Sent for repair",item.name)}
 save();render();
};
$("#reportForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const r={id:crypto.randomUUID(),type:f.get("type"),item:f.get("item"),details:f.get("details").trim(),status:"Pending",at:stamp()};state.reports.unshift(r);queueChange("new_report",r);save();record("Report submitted",r.type);e.target.reset();toast("Report saved on this device")};
$("#searchBox").oninput=render;
$("#syncBtn").onclick=sync;window.addEventListener("online",()=>{$("#networkState").textContent="Online";sync()});window.addEventListener("offline",()=>$("#networkState").textContent="Offline");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("schooltrack_theme",document.body.classList.contains("dark")?"dark":"light")};
$("#saveConfig").onclick=()=>{localStorage.setItem(CFG_KEY,JSON.stringify({url:$("#projectUrl").value.trim(),key:$("#anonKey").value.trim()}));toast("Connection settings saved");};
$("#logoutBtn").onclick=()=>{role="guest";adminToken=null;$("#app").classList.add("hidden");$("#accessPanel").classList.remove("hidden");toast("Signed out")};
$("#exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="SchoolTrack-EAPIHS-backup.json";a.click();URL.revokeObjectURL(a.href)};
$("#restoreBtn").onclick=()=>{const file=$("#restoreFile").files[0];if(!file)return toast("Choose a backup file");const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!data||!Array.isArray(data.items))throw Error("Invalid backup");if(role!=="admin")throw Error("Admin access required to restore inventory");state={items:data.items||[],reports:data.reports||[],history:data.history||[],queue:data.queue||[]};save();render();toast("Backup restored locally")}catch(e){toast(e.message)}};r.readAsText(file)};
if(localStorage.getItem("schooltrack_theme")==="dark")document.body.classList.add("dark");
load();$("#networkState").textContent=navigator.onLine?"Online":"Offline";
const c=cfg();$("#projectUrl").value=c.url||"";$("#anonKey").value=c.key||"";
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
setTimeout(()=>$("#splash").classList.add("done"),900);
