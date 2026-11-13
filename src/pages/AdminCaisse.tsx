import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { ArrowDownLeft, ArrowUpRight, Ban, Plus, Minus, Wallet } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, doc, updateDoc, OperationType, handleFirestoreError } from '@/firebase';
import { CashMovement } from '@/types';
import { addCashMovement, formatMoney, Currency } from '@/lib/payments';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'all';

const IN_CATEGORIES = ['Opening balance', 'Cash added', 'Other income'];
const OUT_CATEGORIES = ['Expense', 'Supplier payment', 'Salary', 'Withdrawal', 'Refund', 'Other'];

function periodStart(period: Period): Date | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === 'today') return d;
  if (period === 'week') { d.setDate(d.getDate() - 6); return d; }
  if (period === 'month') { d.setDate(1); return d; }
  return null;
}

export default function AdminCaisse() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [period, setPeriod] = useState<Period>('today');
  const [modal, setModal] = useState<'in' | 'out' | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [voiding, setVoiding] = useState<CashMovement | null>(null);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    return onSnapshot(query(collection(db, 'cash_movements'), orderBy('date', 'desc')), snap => {
      setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CashMovement[]);
    }, err => handleFirestoreError(err, OperationType.LIST, 'cash_movements'));
  }, []);

  const active = movements.filter(m => !m.voided);

  // Cash in the drawer right now, per currency (all time, voided entries excluded)
  const balance = (cur: Currency) =>
    active.filter(m => m.currency === cur).reduce((s, m) => s + (m.direction === 'in' ? m.amount : -m.amount), 0);

  const inPeriod = useMemo(() => {
    const start = periodStart(period);
    return start ? movements.filter(m => new Date(m.date) >= start) : movements;
  }, [movements, period]);

  const total = (dir: 'in' | 'out', cur: Currency) =>
    inPeriod.filter(m => !m.voided && m.direction === dir && m.currency === cur).reduce((s, m) => s + m.amount, 0);

  const openModal = (dir: 'in' | 'out') => {
    setModal(dir);
    setAmount('');
    setCurrency('USD');
    setCategory(dir === 'in' ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]);
    setNote('');
  };

  const handleSave = async () => {
    const value = Number(amount);
    if (!(value > 0)) { alert('Enter an amount.'); return; }
    if (modal === 'out' && value > balance(currency) &&
        !window.confirm(`This is more than the ${currency} cash in the drawer (${formatMoney(balance(currency), currency)}). Save anyway?`)) return;
    try {
      await addCashMovement({ direction: modal!, amount: value, currency, category, note: note.trim() || undefined });
      setModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cash_movements');
    }
  };

  const handleVoid = async () => {
    if (!voiding || !voidReason.trim()) { alert('Enter a reason.'); return; }
    try {
      await updateDoc(doc(db, 'cash_movements', voiding.id), { voided: true, voidedAt: new Date().toISOString(), voidReason: voidReason.trim() });
      setVoiding(null);
      setVoidReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cash_movements/${voiding.id}`);
    }
  };

  const INPUT = "bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3";
  const LABEL = "text-[10px] text-primary font-black font-headline uppercase tracking-widest";

  return (
    <Layout isAdmin>
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
            Cash <span className="text-primary">Register</span>
          </h1>
          <p className="text-zinc-500 font-headline uppercase tracking-[0.2em] text-sm italic">Caisse · cash only, card payments are not counted here</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openModal('in')} className="bg-primary hover:bg-white text-black font-black px-6 py-3 uppercase tracking-tighter font-headline text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Money In
          </button>
          <button onClick={() => openModal('out')} className="bg-zinc-900 border border-zinc-700 hover:border-red-500 text-white font-black px-6 py-3 uppercase tracking-tighter font-headline text-sm flex items-center gap-2">
            <Minus className="w-4 h-4" /> Money Out
          </button>
        </div>
      </header>

      {/* Drawer balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {(['USD', 'LBP'] as const).map(cur => (
          <div key={cur} className="bg-zinc-900 p-6 border-t-4 border-primary">
            <span className="text-zinc-500 font-headline uppercase font-bold tracking-widest text-[10px] flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Cash in drawer · {cur}
            </span>
            <div className={cn("text-4xl font-black font-headline mt-2", balance(cur) < 0 ? "text-red-400" : "text-white")}>
              {formatMoney(balance(cur), cur)}
            </div>
          </div>
        ))}
      </div>

      {/* Period totals */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([['today', 'Today'], ['week', 'Last 7 Days'], ['month', 'This Month'], ['all', 'All']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={cn("px-4 py-2 font-headline font-black text-[10px] uppercase tracking-widest border-2 whitespace-nowrap",
              period === v ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500")}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(['USD', 'LBP'] as const).flatMap(cur => (['in', 'out'] as const).map(dir => (
          <div key={cur + dir} className="bg-zinc-900 p-4 border-l-4" style={{ borderColor: dir === 'in' ? '#22c55e' : '#ef4444' }}>
            <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest">{dir === 'in' ? 'In' : 'Out'} · {cur}</p>
            <p className={cn("font-headline font-black text-xl mt-1", dir === 'in' ? "text-green-400" : "text-red-400")}>{formatMoney(total(dir, cur), cur)}</p>
          </div>
        )))}
      </div>

      {/* Movements */}
      <div className="bg-zinc-900 border-t-4 border-primary">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="font-headline text-2xl font-black uppercase text-white">Movements</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {inPeriod.map(m => (
            <div key={m.id} className={cn("p-4 flex items-center gap-4", m.voided && "opacity-40")}>
              <div className={cn("w-9 h-9 flex items-center justify-center shrink-0", m.direction === 'in' ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>
                {m.direction === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("font-headline font-bold text-white uppercase text-xs truncate", m.voided && "line-through")}>
                  {m.category}{m.memberName ? ` · ${m.memberName}` : ''}
                </p>
                <p className="text-[10px] text-zinc-500 font-headline truncate">
                  {new Date(m.date).toLocaleString()}{m.note ? ` · ${m.note}` : ''}{m.createdBy ? ` · by ${m.createdBy}` : ''}
                </p>
                {m.voided && <p className="text-[10px] text-red-400 font-headline uppercase">Voided: {m.voidReason}</p>}
              </div>
              <span className={cn("font-mono font-bold whitespace-nowrap", m.direction === 'in' ? "text-green-400" : "text-red-400")}>
                {m.direction === 'in' ? '+' : '−'}{formatMoney(m.amount, m.currency)}
              </span>
              {!m.voided && (
                <button onClick={() => { setVoiding(m); setVoidReason(''); }} title="Void this entry" className="text-zinc-600 hover:text-red-500 p-1">
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {inPeriod.length === 0 && (
            <p className="p-8 text-center text-zinc-600 font-headline uppercase text-xs">No cash movements in this period</p>
          )}
        </div>
      </div>

      {/* Money in / out modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className={cn("bg-zinc-900 border-t-8 p-8 max-w-md w-full", modal === 'in' ? "border-primary" : "border-red-500")}>
            <h3 className="font-headline font-black text-2xl text-white mb-6 uppercase tracking-tighter">{modal === 'in' ? 'Money In' : 'Money Out'}</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2 col-span-2">
                  <label className={LABEL}>Amount</label>
                  <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={INPUT} autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={LABEL}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={INPUT}>
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={LABEL}>Reason</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
                  {(modal === 'in' ? IN_CATEGORIES : OUT_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={LABEL}>Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. cleaning supplies" className={INPUT + " placeholder:text-zinc-700"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setModal(null)} className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700">Cancel</button>
                <button onClick={handleSave} className={cn("font-headline font-black py-4 uppercase text-xs", modal === 'in' ? "bg-primary text-black hover:bg-white" : "bg-red-500 text-white hover:bg-red-400")}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void modal */}
      {voiding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-red-500 p-8 max-w-md w-full">
            <h3 className="font-headline font-black text-2xl text-white mb-1 uppercase tracking-tighter">Void Entry</h3>
            <p className="text-zinc-500 font-headline text-[10px] uppercase tracking-widest mb-6">
              {voiding.category} · {formatMoney(voiding.amount, voiding.currency)} · {new Date(voiding.date).toLocaleString()}
            </p>
            <div className="space-y-5">
              <p className="text-xs text-zinc-400 font-headline">The entry stays in the history (crossed out) but no longer counts in the balance.</p>
              <div className="flex flex-col gap-2">
                <label className={LABEL}>Reason</label>
                <input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="e.g. entered twice" className={INPUT + " placeholder:text-zinc-700"} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setVoiding(null)} className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700">Cancel</button>
                <button onClick={handleVoid} className="bg-red-500 text-white font-headline font-black py-4 uppercase text-xs hover:bg-red-400">Void</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
