"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Bell, BriefcaseBusiness,
  HandCoins, Home, Plus, ReceiptText, Settings, Wallet, X, Trash2
} from "lucide-react";

type TxType = "income" | "expense" | "transfer";
type Transaction = {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  type: TxType;
  date: string;
  note?: string;
};

const DB_NAME = "cashflow-manager";
const STORE = "transactions";
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Rent", "Subscriptions", "Entertainment", "Personal", "Other"];
const ACCOUNTS = ["Cash", "Bank account", "Credit card", "UPI", "Wallet"];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("date", "date");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readTransactions(): Promise<Transaction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as Transaction[]).sort((a, b) => b.date.localeCompare(a.date)));
    request.onerror = () => reject(request.error);
  });
}

async function saveTransaction(tx: Transaction) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(tx);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function removeTransaction(id: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const money = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;

export default function HomePage() {
  const [tab, setTab] = useState("home");
  const [showAdd, setShowAdd] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setTransactions(await readTransactions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey));

  const totals = useMemo(() => {
    const income = monthTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
    return { income, expense, net: income - expense };
  }, [monthTransactions]);

  const currentBalance = useMemo(
    () => transactions.reduce((s, t) => t.type === "income" ? s + t.amount : t.type === "expense" ? s - Math.abs(t.amount) : s, 0),
    [transactions]
  );

  const add = async (tx: Transaction) => {
    await saveTransaction(tx);
    await refresh();
    setShowAdd(false);
  };

  const deleteTx = async (id: string) => {
    await removeTransaction(id);
    await refresh();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>{tab === "home" ? "Good evening" : tab[0].toUpperCase() + tab.slice(1)}</h1>
        </div>
        <button className="icon-btn" aria-label="Notifications"><Bell size={20}/></button>
      </header>

      {tab === "home" && (
        <section className="content">
          <div className="balance-card">
            <div>
              <span className="muted">Current balance</span>
              <strong>{money(currentBalance)}</strong>
            </div>
            <Wallet size={28}/>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><span>Income</span><strong className="positive">{money(totals.income)}</strong><small>This month</small></div>
            <div className="stat-card"><span>Spending</span><strong className="negative">{money(totals.expense)}</strong><small>This month</small></div>
            <div className="stat-card wide"><span>Net cash flow</span><strong>{totals.net >= 0 ? "+" : "-"}{money(totals.net)}</strong><small>This month</small></div>
          </div>

          <div className="section-head"><h2>Money to receive</h2><button onClick={() => setTab("receivables")}>View all</button></div>
          <div className="receive-grid">
            <button className="receive-card" onClick={() => setTab("receivables")}><BriefcaseBusiness size={20}/><span>Client receivables</span><strong>₹0</strong><small>Add client invoices later</small></button>
            <button className="receive-card" onClick={() => setTab("loans")}><HandCoins size={20}/><span>Friends' loans</span><strong>₹0</strong><small>Add loans later</small></button>
          </div>

          <div className="section-head"><h2>Recent transactions</h2><button onClick={() => setTab("transactions")}>View all</button></div>
          <div className="transaction-list">
            {loading ? <div className="empty-state">Loading your local data…</div> : transactions.length === 0 ? (
              <div className="empty-state">No transactions yet. Tap + to add your first one.</div>
            ) : transactions.slice(0, 8).map(t => <TransactionRow key={t.id} t={t} onDelete={deleteTx}/>)}
          </div>
        </section>
      )}

      {tab === "transactions" && (
        <section className="content page">
          <div className="page-head"><div><div className="page-icon"><ReceiptText/></div><h2>Transactions</h2></div><button className="small-add" onClick={() => setShowAdd(true)}><Plus size={16}/> Add</button></div>
          <p>All your income and expenses are stored locally on this device.</p>
          <div className="transaction-list">
            {transactions.length === 0 ? <div className="empty-state">No transactions yet.</div> : transactions.map(t => <TransactionRow key={t.id} t={t} onDelete={deleteTx}/>)}
          </div>
        </section>
      )}

      {tab === "accounts" && <SimplePage title="Accounts" icon={<Wallet/>} text="Account tracking will be connected to the transaction engine next." />}
      {tab === "receivables" && <SimplePage title="Client Receivables" icon={<BriefcaseBusiness/>} text="Client invoices and payment history are planned for the next build step." />}
      {tab === "loans" && <SimplePage title="Friends' Loans" icon={<HandCoins/>} text="Loan balances and repayments are planned for the next build step." />}
      {tab === "analytics" && <SimplePage title="Analytics" icon={<BarChart3/>} text="Charts and category analysis will use your saved local transactions." />}

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add transaction"><Plus size={25}/></button>

      <nav className="bottom-nav">
        <Nav icon={<Home/>} label="Home" active={tab === "home"} onClick={() => setTab("home")}/>
        <Nav icon={<ReceiptText/>} label="Transactions" active={tab === "transactions"} onClick={() => setTab("transactions")}/>
        <div className="nav-spacer"/>
        <Nav icon={<BarChart3/>} label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")}/>
        <Nav icon={<Settings/>} label="More" active={false} onClick={() => setTab("accounts")}/>
      </nav>

      {showAdd && <AddTransaction onClose={() => setShowAdd(false)} onSave={add}/>}
    </main>
  );
}

function TransactionRow({ t, onDelete }: { t: Transaction; onDelete: (id: string) => void }) {
  return (
    <div className="transaction">
      <div className={`tx-icon ${t.type}`}>{t.type === "income" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</div>
      <div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account} · {t.date}</span></div>
      <div className="tx-right"><strong className={t.amount > 0 ? "positive" : "negative"}>{t.amount > 0 ? "+" : "-"}{money(t.amount)}</strong><button className="delete-btn" onClick={() => onDelete(t.id)} aria-label="Delete transaction"><Trash2 size={14}/></button></div>
    </div>
  );
}

function AddTransaction({ onClose, onSave }: { onClose: () => void; onSave: (tx: Transaction) => Promise<void> }) {
  const [type, setType] = useState<TxType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [account, setAccount] = useState("Bank account");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    await onSave({
      id: crypto.randomUUID(),
      title: title.trim(),
      category: type === "income" ? "Income" : category,
      account,
      amount: type === "expense" ? -value : value,
      type,
      date,
      note: note.trim()
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="sheet form-sheet" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <div className="sheet-top"><div className="sheet-handle"/><button type="button" className="close-btn" onClick={onClose}><X size={19}/></button></div>
        <h2>Add transaction</h2>
        <div className="type-tabs">
          <button type="button" className={type === "expense" ? "selected" : ""} onClick={() => setType("expense")}><ArrowUpRight size={17}/> Expense</button>
          <button type="button" className={type === "income" ? "selected" : ""} onClick={() => setType("income")}><ArrowDownLeft size={17}/> Income</button>
          <button type="button" className={type === "transfer" ? "selected" : ""} onClick={() => setType("transfer")}><ArrowDownLeft size={17}/> Transfer</button>
        </div>
        <label>Amount<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus/></label>
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === "expense" ? "e.g. Groceries" : "e.g. Salary"}/></label>
        {type !== "income" && <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>}
        <label>Account<select value={account} onChange={e => setAccount(e.target.value)}>{ACCOUNTS.map(a => <option key={a}>{a}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label>
        <label>Note <span className="optional">(optional)</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note"/></label>
        <button className="save-btn" disabled={saving}>{saving ? "Saving…" : "Save transaction"}</button>
      </form>
    </div>
  );
}

function Nav({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function SimplePage({ title, icon, text }: { title: string; icon: React.ReactNode; text: string }) {
  return <section className="content page"><div className="page-icon">{icon}</div><h2>{title}</h2><p>{text}</p><div className="empty-card">This module is ready for the next build step.</div></section>;
}
