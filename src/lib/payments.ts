import { db, collection, addDoc, auth } from '@/firebase';
import { Member, Transaction } from '@/types';

export type PaymentMethod = 'cash' | 'card';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'none';
export type Currency = 'USD' | 'LBP';

const nowIso = () => new Date().toISOString();

// Membership payment status for the current subscription period
export function memberPaymentStatus(m: Member): PaymentStatus {
  if (typeof m.subscriptionPrice !== 'number' || m.subscriptionPrice <= 0) return 'none';
  const paid = m.subscriptionPaid ?? 0;
  if (paid >= m.subscriptionPrice) return 'paid';
  return paid > 0 ? 'partial' : 'unpaid';
}

export function memberBalanceDue(m: Member): number {
  if (typeof m.subscriptionPrice !== 'number') return 0;
  return Math.max(0, round2(m.subscriptionPrice - (m.subscriptionPaid ?? 0)));
}

// Sales recorded before payment tracking existed count as paid on their sale date
export const isSalePaid = (t: Transaction) => t.paid !== false;
export const salePaidAt = (t: Transaction) => (t.paid === false ? null : t.paidAt || t.date);

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const formatMoney = (amount: number, currency: Currency = 'USD') =>
  currency === 'LBP'
    ? `${Math.round(amount).toLocaleString('en-US')} LBP`
    : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Adds a movement to the cash register (caisse). Card payments never go here.
export async function addCashMovement(input: {
  direction: 'in' | 'out';
  amount: number;
  currency: Currency;
  category: string;
  note?: string;
  memberId?: string;
  memberName?: string;
  transactionId?: string;
}) {
  // Firestore rejects undefined values, so drop empty optional fields
  const fields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== ''));
  return addDoc(collection(db, 'cash_movements'), {
    ...fields,
    amount: round2(input.amount),
    date: nowIso(),
    createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'unknown',
    voided: false,
  });
}

// Records a membership payment (initial, renewal or a later instalment).
// Creates the income transaction and, for cash, the matching caisse entry.
export async function recordSubscriptionPayment(input: {
  member: { id: string; name: string };
  amount: number;
  method: PaymentMethod;
  label: string;
  productId: 'subscription' | 'subscription_renewal' | 'subscription_payment';
  months?: number;
}) {
  if (!(input.amount > 0)) return;
  const date = nowIso();
  const ref = await addDoc(collection(db, 'transactions'), {
    productId: input.productId,
    productName: `${input.label} - ${input.member.name}`,
    memberId: input.member.id,
    memberName: input.member.name,
    amount: round2(input.amount),
    type: 'sale',
    quantity: input.months ?? 1,
    date,
    category: 'Subscription',
    paid: true,
    paidAt: date,
    paymentMethod: input.method,
  });
  if (input.method === 'cash') {
    await addCashMovement({
      direction: 'in',
      amount: input.amount,
      currency: 'USD',
      category: 'Membership payment',
      note: input.label,
      memberId: input.member.id,
      memberName: input.member.name,
      transactionId: ref.id,
    });
  }
  return ref.id;
}
