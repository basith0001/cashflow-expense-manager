"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness,
  CreditCard, HandCoins, Home, Plus, ReceiptText, Settings, Wallet
} from "lucide-react";

type Transaction = {
  title: string;
  category: string;
  account: string;
  amount: number;
  type: "income" | "expense" | "transfer";
};

const transactions: Transaction[] = [
  { title: "Salary", category: "Salary", account: "HDFC Bank", amount: 80000, type: "income" },
  { title: "Zomato", category: "Food", account: "Google Pay", amount: -450, type: "expense" },
  { title: "Uber", category: "Transport", account: "ICICI Credit Card", amount: -320, type: "expense" },
  { title: "Client payment", category: "Freelance", account: "HDFC Bank", amount: 15000, type: "income" }
];

const money = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

export default function HomePage() {
  const [tab, setTab] = useState("home");
  const [showAdd, setShowAdd] = useState(false);

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === "income").reduce((s,t) => s+t.amount,0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s,t) => s+Math.abs(t.amount),0);
    return { income, expense, net: income-expense };
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>{tab === "home" ? "Good evening" : tab[0].toUpperCase()+tab.slice(1)}</h1>
        </div>
        <button className="icon-btn" aria-label="Notifications"><Bell size={20}/></button>
      </header>

      {tab === "home" && (
        <section className="content">
          <div className="balance-card">
            <div>
              <span className="muted">Current balance</span>
              <strong>₹1,24,560</strong>
            </div>
            <Wallet size={28}/>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><span>Income</span><strong className="positive">₹95,000</strong><small>This month</small></div>
            <div className="stat-card"><span>Spending</span><strong className="negative">₹42,350</strong><small>This month</small></div>
            <div className="stat-card wide"><span>Net cash flow</span><strong>₹52,650</strong><small>+18.4% vs last month</small></div>
          </div>

          <div className="money-row">
            <div className="section-head"><h2>Money to receive</h2><button onClick={() => setTab("receivables")}>View all</button></div>
            <div className="receive-grid">
              <button className="receive-card" onClick={() => setTab("receivables")}><BriefcaseBusiness size={20}/><span>Client receivables</span><strong>₹1,18,000</strong><small>4 clients pending</small></button>
              <button className="receive-card" onClick={() => setTab("loans")}><HandCoins size={20}/><span>Friends' loans</span><strong>₹32,000</strong><small>3 people pending</small></button>
            </div>
          </div>

          <div className="section-head"><h2>Recent transactions</h2><button onClick={() => setTab("transactions")}>View all</button></div>
          <div className="transaction-list">
            {transactions.map((t,i) => (
              <div className="transaction" key={i}>
                <div className={`tx-icon ${t.type}`}><ReceiptText size={18}/></div>
                <div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account}</span></div>
                <strong className={t.amount > 0 ? "positive" : "negative"}>{t.amount > 0 ? "+" : "-"}{money(t.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "transactions" && <SimplePage title="Transactions" icon={<ReceiptText/>} text="Search and filter all income, expenses and transfers here." />}
      {tab === "accounts" && <SimplePage title="Accounts" icon={<Wallet/>} text="Cash, bank accounts, credit cards, UPI and wallets." />}
      {tab === "receivables" && <SimplePage title="Client Receivables" icon={<BriefcaseBusiness/>} text="Track invoices, partial payments, due dates and pending client money." amount="₹1,18,000" />}
      {tab === "loans" && <SimplePage title="Friends' Loans" icon={<HandCoins/>} text="Track money you've lent, repayments and outstanding balances." amount="₹32,000" />}
      {tab === "analytics" && <SimplePage title="Analytics" icon={<BarChart3/>} text="Income vs spending, category breakdowns and cash-flow trends." />}

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add transaction"><Plus size={25}/></button>

      <nav className="bottom-nav">
        <Nav icon={<Home/>} label="Home" active={tab==="home"} onClick={()=>setTab("home")}/>
        <Nav icon={<ReceiptText/>} label="Transactions" active={tab==="transactions"} onClick={()=>setTab("transactions")}/>
        <div className="nav-spacer"/>
        <Nav icon={<BarChart3/>} label="Analytics" active={tab==="analytics"} onClick={()=>setTab("analytics")}/>
        <Nav icon={<Settings/>} label="More" active={false} onClick={()=>setTab("accounts")}/>
      </nav>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <h2>Add transaction</h2>
            <div className="add-options">
              <button><ArrowDownLeft/><span>Income</span></button>
              <button><ArrowUpRight/><span>Expense</span></button>
              <button><ArrowDownLeft/><span>Transfer</span></button>
              <button><BriefcaseBusiness/><span>Client payment</span></button>
              <button><HandCoins/><span>Loan given</span></button>
              <button><HandCoins/><span>Loan repayment</span></button>
            </div>
            <button className="cancel" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Nav({icon,label,active,onClick}:{icon:React.ReactNode,label:string,active:boolean,onClick:()=>void}) {
  return <button className={`nav-item ${active ? "active":""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function SimplePage({title,icon,text,amount}:{title:string,icon:React.ReactNode,text:string,amount?:string}) {
  return <section className="content page"><div className="page-icon">{icon}</div><h2>{title}</h2>{amount && <strong className="page-amount">{amount}</strong>}<p>{text}</p><div className="empty-card">Draft screen — ready for the next build step.</div></section>;
}
