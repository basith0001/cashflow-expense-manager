"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness, Menu, Clock3, PieChart, UtensilsCrossed, ShoppingBag, Zap, Car, CheckCircle2,
  CalendarDays, Calculator, ChevronRight, CreditCard, Download, FileText, HandCoins, Home, Upload,
  Plus, ReceiptText, Search, Settings, Trash2, Wallet, X
} from "lucide-react";

type TxType = "income" | "expense" | "transfer" | "clientPayment" | "loanGiven" | "loanRepayment";
type Transaction = {
  id:string; type:TxType; title:string; category:string; account:string; toAccount?:string;
  amount:number; date:string; note?:string; clientId?:string; loanId?:string;
};
type Account = {id:string; name:string; type:string; opening:number};
type Client = {id:string; name:string; project:string; billed:number; received:number; dueDate:string; notes?:string};
type Loan = {id:string; person:string; amount:number; repaid:number; date:string; account:string; purpose:string; expectedDate:string};
type Borrowing = {id:string; person:string; amount:number; repaid:number; date:string; account:string; purpose:string; expectedDate:string};
type Recurring = {id:string; title:string; amount:number; category:string; account:string; nextDate:string; frequency:string};

const STORES=["transactions","accounts","clients","loans","borrowings","recurring"] as const;
const CATEGORIES=["Food","Fuel","Shopping","Home Expenses","Bills","Rent","Subscriptions","Entertainment","Personal","Other"];
const ACCOUNT_OPTIONS=["Cash","KGB","Federal","Axis","Slice Card","ICICI Card","Axis Neo Card","Axis Privillage"];
const ACCOUNT_TYPES=["Cash","Bank account","Credit card","UPI","Wallet"];

async function apiFetch(input:RequestInfo|URL,init?:RequestInit){ return fetch(input,init); }
async function all<T>(store:string):Promise<T[]>{const r=await apiFetch(`/api/data?store=${encodeURIComponent(store)}`,{cache:"no-store"});if(!r.ok)throw new Error("Could not load cloud data");const j=await r.json();return j.data as T[]}
async function put(store:string,value:any){const r=await apiFetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({store,value})});if(!r.ok)throw new Error("Could not save cloud data")}
async function del(store:string,id:string){const r=await apiFetch(`/api/data?store=${encodeURIComponent(store)}&id=${encodeURIComponent(id)}`,{method:"DELETE"});if(!r.ok)throw new Error("Could not delete cloud data")}
const uid=()=>crypto.randomUUID(); const today=()=>new Date().toISOString().slice(0,10);
const money=(n:number)=>`₹${Math.abs(n).toLocaleString("en-IN")}`;
function calculateAmountExpression(input:string):number|null{
  const s=input.replace(/\s+/g,"");
  if(!s)return null;
  const tokens=s.match(/(?:\d+(?:\.\d+)?|[+*\/()-])/g);
  if(!tokens||tokens.join("")!==s)return null;
  let i=0;
  const parseExpression=():number|null=>{
    let value=parseTerm(); if(value===null)return null;
    while(i<tokens.length&&(tokens[i]==="+"||tokens[i]==="-")){
      const op=tokens[i++],rhs=parseTerm(); if(rhs===null)return null;
      value=op==="+"?value+rhs:value-rhs;
    }
    return value;
  };
  const parseTerm=():number|null=>{
    let value=parseFactor(); if(value===null)return null;
    while(i<tokens.length&&(tokens[i]==="*"||tokens[i]==="/")){
      const op=tokens[i++],rhs=parseFactor(); if(rhs===null||op==="/"&&rhs===0)return null;
      value=op==="*"?value*rhs:value/rhs;
    }
    return value;
  };
  const parseFactor=():number|null=>{
    if(tokens[i]==="-" ){i++;const v=parseFactor();return v===null?null:-v}
    if(tokens[i]==="("){i++;const v=parseExpression();if(tokens[i]!==")")return null;i++;return v}
    const n=Number(tokens[i]);if(!Number.isFinite(n))return null;i++;return n;
  };
  const result=parseExpression();
  return result!==null&&i===tokens.length&&Number.isFinite(result)?result:null;
}
const signed=(n:number)=>`${n>=0?"+":"-"}${money(n)}`;

export default function HomePage(){
  const [tab,setTab]=useState("home"),[showAdd,setShowAdd]=useState(false),[editTx,setEditTx]=useState<Transaction|null>(null),[sub,setSub]=useState(""),[data,setData]=useState<any>({transactions:[],accounts:[],clients:[],loans:[],borrowings:[],recurring:[]}),[ready,setReady]=useState(false),[loadError,setLoadError]=useState("");
  const refresh=async()=>{try{const [transactions,accounts,clients,loans,borrowings,recurring]=await Promise.all(STORES.map(s=>all<any>(s)));setData({transactions,accounts,clients,loans,borrowings,recurring});setLoadError("");setReady(true)}catch(error){setLoadError(error instanceof Error?error.message:"Could not load cloud data");setReady(false)}};
  useEffect(()=>{refresh()},[]);
  const tx:Transaction[]=data.transactions;
  const currentMonth=today().slice(0,7);
  const [selectedMonth,setSelectedMonth]=useState(currentMonth);
  const monthOptions=useMemo(()=>{
    const months=new Set<string>();
    for(let i=0;i<12;i++){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);months.add(d.toISOString().slice(0,7))}
    tx.forEach(t=>months.add(t.date.slice(0,7)));
    return [...months].sort().reverse();
  },[tx]);
  const mt=tx.filter(t=>t.date.startsWith(selectedMonth));
  const totals=useMemo(()=>({income:mt.filter(t=>["income","clientPayment"].includes(t.type)).reduce((s,t)=>s+t.amount,0),expense:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)}),[mt]);
  const clientPending=data.clients.reduce((s:number,c:Client)=>s+Math.max(0,c.billed-c.received),0);
  const loanPending=data.loans.reduce((s:number,l:Loan)=>s+Math.max(0,l.amount-l.repaid),0);
  const borrowingPending=data.borrowings.reduce((s:number,b:Borrowing)=>s+Math.max(0,b.amount-b.repaid),0);
  const saveTx=async(t:Transaction)=>{await put("transactions",t);if(t.type==="clientPayment"&&t.clientId){const client=data.clients.find((x:Client)=>x.id===t.clientId);if(client)await put("clients",{...client,received:client.received+t.amount})}if(t.type==="loanRepayment"&&t.loanId){const loan=data.loans.find((x:Loan)=>x.id===t.loanId);if(loan)await put("loans",{...loan,repaid:loan.repaid+t.amount})}await refresh();setShowAdd(false)};
  const updateTx=async(t:Transaction)=>{const old=data.transactions.find((x:Transaction)=>x.id===t.id);if(old?.type==="clientPayment"&&old.clientId){const client=data.clients.find((x:Client)=>x.id===old.clientId);if(client)await put("clients",{...client,received:Math.max(0,client.received-old.amount)})}if(old?.type==="loanRepayment"&&old.loanId){const loan=data.loans.find((x:Loan)=>x.id===old.loanId);if(loan)await put("loans",{...loan,repaid:Math.max(0,loan.repaid-old.amount)})}await put("transactions",t);if(t.type==="clientPayment"&&t.clientId){const client=data.clients.find((x:Client)=>x.id===t.clientId);if(client)await put("clients",{...client,received:client.received+t.amount})}if(t.type==="loanRepayment"&&t.loanId){const loan=data.loans.find((x:Loan)=>x.id===t.loanId);if(loan)await put("loans",{...loan,repaid:loan.repaid+t.amount})}await refresh();setEditTx(null)};
  const page=tab==="home"?<Dashboard {...{totals,clientPending,loanPending,borrowingPending,tx,setTab,setShowAdd,selectedMonth,setSelectedMonth,monthOptions}}/>:
    tab==="transactions"?<Transactions tx={tx} onDelete={async(id)=>{await del("transactions",id);await refresh()}} onEdit={setEditTx}/>:
    tab==="accounts"?<Accounts accounts={data.accounts} tx={tx} refresh={refresh}/>:
    tab==="clients"?<Clients clients={data.clients} tx={tx} refresh={refresh}/>:
    tab==="loans"?<Loans loans={data.loans} tx={tx} refresh={refresh}/>:
    tab==="borrowings"?<Borrowings borrowings={data.borrowings} refresh={refresh}/>:
    tab==="recurring"?<Recurring items={data.recurring} refresh={refresh}/>:
    tab==="analytics"?<Analytics tx={tx}/>:
    tab==="reports"?<Reports tx={tx} accounts={data.accounts}/>:
    tab==="backup"?<Backup data={data} refresh={refresh}/>:
    <More onNavigate={setTab}/>;
  if(loadError)return <main className="app-shell"><div className="auth-shell"><div className="auth-card"><div className="auth-brand"><Wallet size={26}/></div><h1>Could not load your data</h1><p>{loadError}</p><button className="auth-button" onClick={refresh}>Try again</button></div></div></main>;
  if(!ready)return <main className="app-shell"><div className="loading">Loading your finance data…</div></main>;
  return <main className="app-shell">
    <header className="topbar reference-topbar"><button className="ref-menu" onClick={()=>setTab("more")} aria-label="Menu"><Menu size={26}/></button><strong>Cashflow</strong><div className="ref-actions"><button onClick={refresh} aria-label="Refresh">↻</button><button onClick={()=>setTab("accounts")} aria-label="Accounts">₹</button></div></header>
    {page}
    <nav className="bottom-nav reference-nav">
      <Nav icon={<Home/>} label="Home" active={tab==="home"} onClick={()=>setTab("home")}/>
      <Nav icon={<PieChart/>} label="Budget" active={tab==="analytics"} onClick={()=>setTab("analytics")}/>
      <button className="ref-plus" onClick={()=>setShowAdd(true)} aria-label="Add transaction"><Plus size={30}/></button>
      <Nav icon={<Clock3/>} label="History" active={tab==="transactions"} onClick={()=>setTab("transactions")}/>
      <Nav icon={<CheckCircle2/>} label="More" active={tab==="more"} onClick={()=>setTab("more")}/>
    </nav>
    {showAdd&&<AddTransaction {...{data,onClose:()=>setShowAdd(false),onSave:saveTx}}/>}{editTx&&<AddTransaction data={data} initial={editTx} onClose={()=>setEditTx(null)} onSave={updateTx}/>} 
  </main>
}

function CategoryIcon({name}:{name:string}){const n=name.toLowerCase();return n.includes("food")?<UtensilsCrossed size={24}/>:n.includes("shop")?<ShoppingBag size={24}/>:n.includes("fuel")?<Car size={24}/>:n.includes("bill")?<Zap size={24}/>:<Wallet size={24}/>;}
function Dashboard({totals,clientPending,loanPending,borrowingPending,tx,setTab,setShowAdd,selectedMonth}:any){
 const monthTx=(tx as Transaction[]).filter(t=>t.date.startsWith(selectedMonth)).sort((a,b)=>b.date.localeCompare(a.date));
 const expenses=monthTx.filter(t=>t.type==="expense");
 const cats=[...new Set(expenses.map(t=>t.category))].map(name=>({name,total:expenses.filter(t=>t.category===name).reduce((s,t)=>s+t.amount,0)})).sort((a,b)=>b.total-a.total);
 const spentToday=expenses.filter(t=>t.date===today()).reduce((s,t)=>s+t.amount,0);
 const day=new Date().getDate();
 return <section className="content reference-home">
  <div className="ref-greeting"><div><h1>Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}</h1><p>{new Date().toLocaleDateString("en-IN",{weekday:"long",month:"long",day:"numeric"})}</p></div><button onClick={()=>setTab("accounts")}><Wallet size={17}/> My Money⌄</button></div>
  <div className="ref-spend"><div className="ref-spend-head"><span>SPENT THIS MONTH</span><button onClick={()=>setTab("analytics")}>● No budget set</button></div><div className="ref-spend-main"><div><strong>{money(totals.expense)}</strong><p>set a budget to track progress</p></div><div className="ref-ring"><b>0%</b><small>used</small></div></div><div className="ref-track"/><b className="ref-spend-foot">No limits this month</b></div>
  <div className="ref-dots"><i/><i/></div>
  <div className="ref-snapshot"><div className="ref-snap-title"><strong><CalendarDays size={20}/> Daily snapshot</strong><span>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div><div className="ref-snap-grid">{[["Today",money(spentToday),expenses.filter(t=>t.date===today()).length+" txn"],["Avg / day",money(totals.expense/day),"this month"],["Day budget","—","allowance"],["Left today","—","to spend"]].map(([label,value,detail],i)=><div key={label}><span className="ref-snap-icon">{i===0?<Zap/>:i===1?<BarChart3/>:i===2?<Wallet/>:<CheckCircle2/>}</span><b>{value}</b><strong>{label}</strong><small>{detail}</small></div>)}</div></div>
  <div className="ref-section-title"><div><small>WHERE IT WENT</small><h2>Categories</h2></div><button onClick={()=>setTab("analytics")}>See all →</button></div>
  <div className="ref-categories">{cats.length?cats.slice(0,5).map(c=><div className="ref-category" key={c.name}><span><CategoryIcon name={c.name}/></span><small>{c.name}</small><strong>{money(c.total)}</strong><b>{Math.round(c.total/totals.expense*100)}%</b></div>):<p>No expenses this month</p>}</div>
  <div className="ref-section-title"><div><small>LATEST ACTIVITY</small><h2>Transactions</h2></div><button onClick={()=>setTab("transactions")}>See all →</button></div>
  <div className="ref-tx-list">{monthTx.slice(0,5).map(t=><TxRow key={t.id} t={t}/>)}</div>
  <button className="ref-quick" onClick={()=>setShowAdd(true)}><span>⊞</span><div><strong>Add a quick expense</strong><small>Log expenses right from your home screen</small></div><Plus size={22}/></button>
  <div className="ref-finance-links"><button onClick={()=>setTab("clients")}>Client dues {money(clientPending)}</button><button onClick={()=>setTab("loans")}>Money lent {money(loanPending)}</button><button onClick={()=>setTab("borrowings")}>To repay {money(borrowingPending)}</button></div>
 </section>
}

function Stat({title,value,note,cls}:{title:string,value:string,note:string,cls:string}){return <div className="stat-card"><span>{title}</span><strong className={cls}>{value}</strong><small>{note}</small></div>}

function Transactions({tx,onDelete,onEdit}:{tx:Transaction[],onDelete:(id:string)=>void,onEdit:(t:Transaction)=>void}){const [q,setQ]=useState(""),[filter,setFilter]=useState("all"),[cat,setCat]=useState(""),[account,setAccount]=useState("");
 const list=tx.filter(t=>(filter==="all"||t.type===filter)&&(t.title.toLowerCase().includes(q.toLowerCase())||t.category.toLowerCase().includes(q.toLowerCase()))&&(!cat||t.category===cat)&&(!account||t.account===account));
 return <section className="content page"><div className="page-title"><ReceiptText/><div><h2>Transactions</h2><p>Search and filter your money activity.</p></div></div><div className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search transactions"/></div><div className="chips">{["all","income","expense","transfer"].map(x=><button className={filter===x?"chip active":"chip"} onClick={()=>setFilter(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div><div className="filter-row"><select value={cat} onChange={e=>setCat(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select><select value={account} onChange={e=>setAccount(e.target.value)}><option value="">All accounts</option>{[...new Set(tx.map(t=>t.account))].map(x=><option key={x}>{x}</option>)}</select></div><div className="transaction-list">{list.length?list.sort((a,b)=>b.date.localeCompare(a.date)).map(t=><TxRow key={t.id} t={t} onDelete={onDelete} onEdit={onEdit}/>):<div className="empty-state">No matching transactions.</div>}</div></section>}

function Accounts({accounts,tx,refresh}:{accounts:Account[],tx:Transaction[],refresh:()=>void}){const [name,setName]=useState(""),[type,setType]=useState("Bank account"),[opening,setOpening]=useState("");const balances=accounts.map(a=>{const b=tx.filter(t=>t.account===a.name).reduce((s,t)=>{if(["income","clientPayment","loanRepayment"].includes(t.type))return s+t.amount;if(["expense","loanGiven"].includes(t.type))return s-t.amount;return s},a.opening);return {...a,b}});return <section className="content page"><div className="page-title"><Wallet/><div><h2>Accounts</h2><p>Cash, banks, cards, UPI and wallets.</p></div></div><div className="form-card inline-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Account name"/><select value={type} onChange={e=>setType(e.target.value)}>{ACCOUNT_TYPES.map(x=><option key={x}>{x}</option>)}</select><input inputMode="decimal" value={opening} onChange={e=>setOpening(e.target.value)} placeholder="Opening balance"/><button onClick={async()=>{if(!name.trim())return;await put("accounts",{id:uid(),name:name.trim(),type,opening:Number(opening)||0});setName("");setOpening("");refresh()}}>Add account</button></div><div className="cards">{balances.length?balances.map(a=><div className="data-card" key={a.id}><div className="data-icon"><CreditCard size={18}/></div><div><strong>{a.name}</strong><span>{a.type}</span></div><b>{money(a.b)}</b><button onClick={()=>del("accounts",a.id).then(refresh)}><Trash2 size={15}/></button></div>):<div className="empty-card">Add your first account above.</div>}</div></section>}

function Clients({clients,tx,refresh}:{clients:Client[],tx:Transaction[],refresh:()=>void}){const [show,setShow]=useState(false);return <section className="content page"><div className="section-head first"><h2>Client Receivables</h2><button className="small-add" onClick={()=>setShow(true)}><Plus size={15}/> Client</button></div><p>Track billed, received, pending and due dates.</p><div className="cards">{clients.length?clients.map(c=><div className="data-card stack" key={c.id}><div className="data-top"><div><strong>{c.name}</strong><span>{c.project||"Project / invoice"}</span></div><b>{money(Math.max(0,c.billed-c.received))} pending</b></div><div className="mini-grid"><span>Billed<strong>{money(c.billed)}</strong></span><span>Received<strong>{money(c.received)}</strong></span><span>Due<strong>{c.dueDate||"—"}</strong></span></div><button className="link-btn" onClick={()=>setShow(true)}>Add / edit payment</button></div>):<div className="empty-card">No clients yet. Add an invoice/client above.</div>}</div>{show&&<ClientForm onClose={()=>setShow(false)} onSave={async c=>{await put("clients",c);await refresh();setShow(false)}}/>}</section>}

function Loans({loans,tx,refresh}:{loans:Loan[],tx:Transaction[],refresh:()=>void}){const [show,setShow]=useState(false);return <section className="content page"><div className="section-head first"><h2>Kadam Koduthathu</h2><button className="small-add" onClick={()=>setShow(true)}><Plus size={15}/> Kadam</button></div><p>Money you have given and need to receive back.</p><div className="cards">{loans.length?loans.map(l=><div className="data-card stack" key={l.id}><div className="data-top"><div><strong>{l.person}</strong><span>{l.purpose||"Personal loan"}</span></div><b>{money(Math.max(0,l.amount-l.repaid))}</b></div><div className="mini-grid"><span>Given<strong>{money(l.amount)}</strong></span><span>Repaid<strong>{money(l.repaid)}</strong></span><span>Expected<strong>{l.expectedDate||"—"}</strong></span></div><button className="link-btn" onClick={()=>setShow(true)}>Add repayment</button></div>):<div className="empty-card">No loans yet.</div>}</div>{show&&<LoanForm onClose={()=>setShow(false)} onSave={async l=>{await put("loans",l);await refresh();setShow(false)}}/>}</section>}

function Borrowings({borrowings,refresh}:{borrowings:Borrowing[],refresh:()=>void}){const [show,setShow]=useState(false);return <section className="content page"><div className="section-head first"><h2>Kadam Vangiyath</h2><button className="small-add" onClick={()=>setShow(true)}><Plus size={15}/> Add</button></div><p>Money you have taken and need to give back.</p><div className="cards">{borrowings.length?borrowings.map(b=><div className="data-card stack" key={b.id}><div className="data-top"><div><strong>{b.person}</strong><span>{b.purpose||"Personal borrowing"}</span></div><b>{money(Math.max(0,b.amount-b.repaid))}</b></div><div className="mini-grid"><span>Taken<strong>{money(b.amount)}</strong></span><span>Repaid<strong>{money(b.repaid)}</strong></span><span>Expected<strong>{b.expectedDate||"—"}</strong></span></div></div>):<div className="empty-card">No borrowings yet.</div>}</div>{show&&<BorrowingForm onClose={()=>setShow(false)} onSave={async b=>{await put("borrowings",b);await refresh();setShow(false)}}/>}</section>}

function Recurring({items,refresh}:{items:Recurring[],refresh:()=>void}){const [title,setTitle]=useState(""),[amount,setAmount]=useState(""),[nextDate,setNextDate]=useState(today());return <section className="content page"><div className="page-title"><CalendarDays/><div><h2>Recurring Payments</h2><p>Rent, subscriptions, bills and regular payments.</p></div></div><div className="form-card inline-form"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Payment name"/><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount"/><input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/><button onClick={async()=>{if(!title||!amount)return;await put("recurring",{id:uid(),title,amount:Number(amount),category:"Bills",account:"Bank account",nextDate,frequency:"Monthly"});setTitle("");setAmount("");refresh()}}>Add payment</button></div><div className="cards">{items.map(x=><div className="data-card" key={x.id}><div><strong>{x.title}</strong><span>{money(x.amount)} · {x.frequency} · next {x.nextDate}</span></div><button onClick={()=>del("recurring",x.id).then(refresh)}><Trash2 size={15}/></button></div>)}{!items.length&&<div className="empty-card">No recurring payments yet.</div>}</div></section>}

function Analytics({tx}:{tx:Transaction[]}){const expenses=tx.filter(t=>t.type==="expense"),income=tx.filter(t=>["income","clientPayment"].includes(t.type));const totalE=expenses.reduce((s,t)=>s+t.amount,0),totalI=income.reduce((s,t)=>s+t.amount,0);const cats=CATEGORIES.map(c=>({c,n:expenses.filter(t=>t.category===c).reduce((s,t)=>s+t.amount,0)})).filter(x=>x.n).sort((a,b)=>b.n-a.n);return <section className="content page"><div className="page-title"><BarChart3/><div><h2>Analytics</h2><p>Understand your income, spending and cash flow.</p></div></div><div className="stats-grid"><Stat title="Total income" value={money(totalI)} note="All time" cls="positive"/><Stat title="Total spending" value={money(totalE)} note="All time" cls="negative"/></div><div className="chart-card"><h3>Spending by category</h3>{cats.length?cats.map(x=><div className="bar-row" key={x.c}><span>{x.c}</span><div><i style={{width:`${totalE?Math.max(5,x.n/totalE*100):0}%`}}/></div><b>{money(x.n)}</b></div>):<div className="empty-state">Add expenses to see your breakdown.</div>}</div><div className="chart-card"><h3>Cash-flow trend</h3><div className="trend"><div><span>Income</span><b>{money(totalI)}</b></div><div><span>Spending</span><b>{money(totalE)}</b></div><div><span>Net</span><b>{signed(totalI-totalE)}</b></div></div></div></section>}

function Reports({tx,accounts}:{tx:Transaction[],accounts:Account[]}){const download=()=>{const rows=[["Date","Type","Title","Category","Account","Amount","Note"],...tx.map(t=>[t.date,t.type,t.title,t.category,t.account,t.amount,t.note||""])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`cashflow-report-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)};return <section className="content page"><div className="page-title"><FileText/><div><h2>Reports</h2><p>Export your cloud finance data whenever you need it.</p></div></div><div className="report-card"><Download size={22}/><div><strong>Transactions CSV</strong><span>{tx.length} transactions · {accounts.length} accounts</span></div><button onClick={download}>Export</button></div><div className="empty-card">Your finance data is stored in your private Cloudflare KV space. Keep a backup file as an extra safety layer.</div></section>}

function Backup({data,refresh}:{data:any,refresh:()=>Promise<void>}){const inputId="cashflow-backup-input";const downloadBackup=()=>{const payload={app:"Personal Cash Flow Manager",version:1,exportedAt:new Date().toISOString(),data:{transactions:data.transactions,accounts:data.accounts,clients:data.clients,loans:data.loans,borrowings:data.borrowings,recurring:data.recurring}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`cashflow-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};const importBackup=async(file:File)=>{try{const payload=JSON.parse(await file.text());const d=payload?.data;if(!d||!Array.isArray(d.transactions)||!Array.isArray(d.accounts)||!Array.isArray(d.clients)||!Array.isArray(d.loans)||!Array.isArray(d.borrowings)||!Array.isArray(d.recurring))throw new Error("Invalid backup file");for(const store of STORES){const values=d[store]||[];for(const value of values)await put(store,value)}await refresh();alert("Backup restored successfully.")}catch(e){alert("This backup file is not valid.")}};return <section className="content page"><div className="page-title"><FileText/><div><h2>Backup & Restore</h2><p>Protect your finance data stored in the cloud.</p></div></div><div className="report-card"><Download size={22}/><div><strong>Export full backup</strong><span>All transactions, accounts, clients, loans and recurring payments</span></div><button onClick={downloadBackup}>Backup</button></div><div className="report-card"><Upload size={22}/><div><strong>Restore backup</strong><span>Import a previously exported JSON backup</span></div><input id={inputId} type="file" accept="application/json,.json" hidden onChange={e=>{const file=e.target.files?.[0];if(file)importBackup(file);e.currentTarget.value=""}}/><button onClick={()=>document.getElementById(inputId)?.click()}>Restore</button></div><div className="empty-card"><strong>Important:</strong> Keep the downloaded backup file somewhere safe. Your cloud data remains available across devices; keep this file as an additional safety backup.</div></section>}

function More({onNavigate}:{onNavigate:(x:string)=>void}){const items=[["accounts","Accounts",Wallet],["clients","Clients & Receivables",BriefcaseBusiness],["loans","Kadam Koduthathu",HandCoins],["borrowings","Kadam Vangiyath",HandCoins],["recurring","Recurring Payments",CalendarDays],["reports","Reports & Export",FileText],["analytics","Analytics",BarChart3],["backup","Backup & Restore",Download]] as any[];return <section className="content page"><div className="page-title"><Settings/><div><h2>More</h2><p>Manage the different parts of your cash flow.</p></div></div><div className="menu-list">{items.map(([id,label,Icon])=><button key={id} onClick={()=>onNavigate(id)}><Icon size={19}/><span>{label}</span><ChevronRight size={16}/></button>)}</div></section>}

function TxRow({t,onDelete,onEdit}:{t:Transaction,onDelete?:(id:string)=>void,onEdit?:(t:Transaction)=>void}){const positive=["income","clientPayment","loanRepayment"].includes(t.type);return <div className="transaction"><div className={`tx-icon ${positive?"income":"expense"}`}><CategoryIcon name={t.category}/></div><div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account} · {t.date}</span></div><div className="tx-right"><strong className={positive?"positive":"negative"}>{positive?"+":"−"}{money(t.amount)}</strong><div className="tx-actions">{onEdit&&<button className="edit-btn" onClick={()=>onEdit(t)}>Edit</button>}{onDelete&&<button className="delete-btn" onClick={()=>onDelete(t.id)}><Trash2 size={14}/></button>}</div></div></div>}

function Nav({icon,label,active,onClick}:{icon:any,label:string,active:boolean,onClick:()=>void}){return <button className={`nav-item ${active?"active":""}`} onClick={onClick}>{icon}<span>{label}</span></button>}
