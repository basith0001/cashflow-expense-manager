"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness,
  CalendarDays, ChevronRight, CreditCard, Download, FileText, HandCoins, Home, Upload,
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
const CATEGORIES=["Food","Transport","Shopping","Bills","Rent","Subscriptions","Entertainment","Personal","Other"];
const ACCOUNT_TYPES=["Cash","Bank account","Credit card","UPI","Wallet"];

async function apiFetch(input:RequestInfo|URL,init?:RequestInit){
  return fetch(input,init);
}
async function all<T>(store:string):Promise<T[]>{const r=await apiFetch(`/api/data?store=${encodeURIComponent(store)}`,{cache:"no-store"});if(!r.ok)throw new Error("Could not load cloud data");const j=await r.json();return j.data as T[]}
async function put(store:string,value:any){const r=await apiFetch("/api/data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({store,value})});if(!r.ok)throw new Error("Could not save cloud data")}
async function del(store:string,id:string){const r=await apiFetch(`/api/data?store=${encodeURIComponent(store)}&id=${encodeURIComponent(id)}`,{method:"DELETE"});if(!r.ok)throw new Error("Could not delete cloud data")}
const uid=()=>crypto.randomUUID(); const today=()=>new Date().toISOString().slice(0,10);
const money=(n:number)=>`₹${Math.abs(n).toLocaleString("en-IN")}`;
const signed=(n:number)=>`${n>=0?"+":"-"}${money(n)}`;

export default function HomePage(){
  const [tab,setTab]=useState("home"),[showAdd,setShowAdd]=useState(false),[sub,setSub]=useState(""),[data,setData]=useState<any>({transactions:[],accounts:[],clients:[],loans:[],borrowings:[],recurring:[]}),[ready,setReady]=useState(false),[loadError,setLoadError]=useState("");
  const refresh=async()=>{try{const [transactions,accounts,clients,loans,borrowings,recurring]=await Promise.all(STORES.map(s=>all<any>(s)));setData({transactions,accounts,clients,loans,borrowings,recurring});setLoadError("");setReady(true)}catch(error){setLoadError(error instanceof Error?error.message:"Could not load cloud data");setReady(false)}};
  useEffect(()=>{refresh()},[]);
  const tx:Transaction[]=data.transactions;
  const month=today().slice(0,7), mt=tx.filter(t=>t.date.startsWith(month));
  const totals=useMemo(()=>({income:mt.filter(t=>["income","clientPayment"].includes(t.type)).reduce((s,t)=>s+t.amount,0),expense:mt.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)}),[mt]);
  const clientPending=data.clients.reduce((s:number,c:Client)=>s+Math.max(0,c.billed-c.received),0);
  const loanPending=data.loans.reduce((s:number,l:Loan)=>s+Math.max(0,l.amount-l.repaid),0);
  const borrowingPending=data.borrowings.reduce((s:number,b:Borrowing)=>s+Math.max(0,b.amount-b.repaid),0);
  const saveTx=async(t:Transaction)=>{await put("transactions",t);if(t.type==="clientPayment"&&t.clientId){const c=data.clients.find((x:Client)=>x.id===t.clientId);if(c)await put("clients",{...c,received:c.received+t.amount})}if(t.type==="loanRepayment"&&t.loanId){const l=data.loans.find((x:Loan)=>x.id===t.loanId);if(l)await put("loans",{...l,repaid:l.repaid+t.amount})}await refresh();setShowAdd(false)};
  const page=tab==="home"?<Dashboard {...{totals,clientPending,loanPending,borrowingPending,tx,setTab,setShowAdd}}/>:
    tab==="transactions"?<Transactions tx={tx} onDelete={async(id)=>{await del("transactions",id);await refresh()}}/>:
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
  return <main className="app-shell"><header className="topbar"><div><p className="eyebrow">PERSONAL FINANCE</p><h1>{tab==="home"?"Good evening":tab==="clients"?"Clients & Receivables":tab==="loans"?"Kadam Koduthathu":tab==="borrowings"?"Kadam Vangiyath":tab[0].toUpperCase()+tab.slice(1)}</h1></div><button className="icon-btn"><Bell size={19}/></button></header>{page}<button className="fab" onClick={()=>setShowAdd(true)}><Plus size={25}/></button><nav className="bottom-nav"><Nav icon={<Home/>} label="Home" active={tab==="home"} onClick={()=>{setTab("home");setSub("")}}/><Nav icon={<ReceiptText/>} label="Transactions" active={tab==="transactions"} onClick={()=>setTab("transactions")}/><div/><Nav icon={<BarChart3/>} label="Analytics" active={tab==="analytics"} onClick={()=>setTab("analytics")}/><Nav icon={<Settings/>} label="More" active={tab==="more"} onClick={()=>setTab("more")}/></nav>{showAdd&&<AddTransaction {...{data,onClose:()=>setShowAdd(false),onSave:saveTx}}/>}</main>
}function More({onNavigate}:{onNavigate:(x:string)=>void}){const items=[["accounts","Accounts",Wallet],["clients","Clients & Receivables",BriefcaseBusiness],["loans","Kadam Koduthathu",HandCoins],["borrowings","Kadam Vangiyath",HandCoins],["recurring","Recurring Payments",CalendarDays],["reports","Reports & Export",FileText],["analytics","Analytics",BarChart3],["backup","Backup & Restore",Download]] as any[];return <section className="content page"><div className="page-title"><Settings/><div><h2>More</h2><p>Manage the different parts of your cash flow.</p></div></div><div className="menu-list">{items.map(([id,label,Icon])=><button key={id} onClick={()=>onNavigate(id)}><Icon size={19}/><span>{label}</span><ChevronRight size={16}/></button>)}</div></section>}

